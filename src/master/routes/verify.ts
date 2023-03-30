import { delay } from "bullmq";
import { Request, Router } from "express";
import Joi from "joi";
import { config } from "../../config";
import { logger } from "../../logger";
import { Job, JobDocument, JobProps, JobStatus } from "../../models/job";
import { Request as RequestCollection } from "../../models/request";
import { spamtrap } from "../../services/spamtrap";
import { getMockEmails, randomIntFromInterval } from "../../utils/mock";
import { produceVerificationRequest } from "../helpers/producer";
import { auth } from "../middlewares/auth";
import { validate } from "../middlewares/validator";

export const verifyRouter = Router();

const schema = Joi.object({
  email: Joi.string().email().required(),
})

async function checkJobCompleted(__job: JobDocument) {
  let job = __job;
  while (job.status === JobStatus.REQUESTED || ( job.status === JobStatus.FAILED && job.attemptCount! < config.HTTP_JOB_MAX_TRY)) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const _job = await Job.findById(job.id);
    if (_job) {
      job = _job;
    } else {
      throw new Error('Job not found');
    }
  }
  return job;
}

verifyRouter.get("/verify", auth, validate(schema), async (req: Request<unknown, unknown, unknown, { email: string }>, res) => {
  const email = req.query.email as string;

  try {
    const isSpamTrap = await spamtrap.contains(email);
    if (isSpamTrap) {
      return res.json({
        email,
        valid: false,
        reason: "spamtrap",
      })
    }

    const request = new RequestCollection();
    await request.save();
    let emails = [email];
    logger.info({ message: 'email verify requested', emails });
    const jobs: JobProps[] = emails.map((email) => {
      return {
        email,
        request: request._id,
        status: JobStatus.REQUESTED,
      };
    });
    let [job]: JobDocument[] = await Job.insertMany(jobs);
    await produceVerificationRequest(job.id, job.email, false);
    const resultJob = await Promise.race([checkJobCompleted(job), delay(2 * 60 * 1000)]);
    res.send(resultJob || job);
  } catch (e: any) {
    logger.error(e);
    res.status(500).send(e.stack);
  }
});