import { QueueEvents } from "bullmq";
import { Topics } from "../broker";
import { ValidationResponse } from "../broker/validation-response";
import { config } from "../config";
import { logger } from "../logger";
import { Job } from "../models/job";
import { jobCanTryAgain } from "../services/job";
import { ResultType } from "../worker/base-validator";
import { produceVerificationRequest } from "./helpers/producer";

const queueOption = {
  connection: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
  }
}

const HTTP_RETRIABLES = [
  ResultType.CRASH,
  ResultType.TIMEOUT,
  ResultType.UNKNOWN,
  ResultType.INVALID_VENDOR,
  ResultType.ANTI_SPAM,
]

async function onCompleted(jobId: string, response: ValidationResponse) {

  let attemptData = {
    validatedRelay: response.validatedRelay,
    validatedWorker: response.validatedWorker,
    validationTime: response.validationTime,
    validationMethod: response.validationMethod,
  }


  switch (response.reason) {
    case ResultType.VALID:
    case ResultType.INVALID:
    case ResultType.CATCH_ALL:
    case ResultType.INBOX_FULL:
    case ResultType.NO_MX_RECORD:
      await Job.completed(jobId, response.valid, response.ip, response.reason, response.customValidationResult, attemptData);
      break;
    case ResultType.BOUNCED:
      logger.info({ message: `Bounced`, response });
      await retryJob(jobId, response, false);
      break;
    default: {
      await Job.failed(jobId, response.reason, response.ip, response.customValidationResult, attemptData);
      if (response.isSMTP) {
        await retryJob(jobId, response, true);
      } else if (HTTP_RETRIABLES.includes(response.reason)) {
        await retryJob(jobId, response, true);
      }
      break;
    }
  }
}

async function retryJob(jobId: string, response: ValidationResponse, checkCanTry: boolean = false) {

  let attemptData = {
    validatedRelay: response.validatedRelay,
    validatedWorker: response.validatedWorker,
    validationTime: response.validationTime,
    validationMethod: response.validationMethod,
  }

  let canTry = true;
  if (checkCanTry) {
    canTry = await jobCanTryAgain(jobId, response.isSMTP);
  }
  if (canTry) {
    logger.trace({ message: `retrying verification in ${config.JOB_RETRY_DELAY}`, response });
    await produceVerificationRequest(jobId, response.email, true, config.JOB_RETRY_DELAY);
  } else {
    await Job.completed(jobId, response.valid, response.ip, response.reason, response.customValidationResult, attemptData);
  }
}

async function onFailed(jobId: string, reason: string) {
  logger.error({ message: `job failed`, jobId, reason });
  await Job.failed(jobId, reason, 'unknown ip', undefined, {});
  const canTry = await jobCanTryAgain(jobId, false);
  const job = await Job.findById(jobId);
  if (canTry && job) {
    await produceVerificationRequest(jobId, job.email, true, config.JOB_RETRY_DELAY);
  }
}

export async function listenJobEvents() {
  const topics = [
    Topics.AolVerificationRequested,
    Topics.CustomVerificationRequested,
    Topics.GmailVerificationRequested,
    Topics.OutlookVerificationRequested,
    Topics.YahooVerificationRequested,
    Topics.SkynetVerificationRequested,
    Topics.MailruVerificationRequested,
  ];
  topics.forEach(topic => {
    const event = new QueueEvents(topic, queueOption);
    event.on('completed', async ({ jobId, returnvalue }) => {
      const response = returnvalue as unknown as ValidationResponse;
      await onCompleted(jobId, response);
    });
    event.on('failed', async ({ jobId, failedReason }) => {
      logger.error({ message: `job failed`, topic, jobId, failedReason });
      await onFailed(jobId, failedReason);
    });
    event.on('stalled', async ({ jobId }) => {
      logger.error({ message: `job stalled`, topic, jobId });


      await onFailed(jobId, 'stalled');
    })
  })
}