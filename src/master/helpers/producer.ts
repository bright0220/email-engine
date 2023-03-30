import { AolVerificationRequestedEvent, CustomVerificationRequestedEvent, GmailVerificationRequestedEvent, MailruVerificationRequestedEvent, MailVerificationRequestedEvent, OutlookVerificationRequestedEvent, SkynetVerificationRequestedEvent, Topics, YahooVerificationRequestedEvent } from "../../broker";
import { JobsOptions, Queue } from "bullmq";
import { config } from "../../config";
import { isHotmail, isMsn, isOutlook, isSkynet, isYahoo } from "./domain";
import { Job as JobCollection } from "../../models/job";
import { RequestDocument } from "../../models/request";

interface VerificationProducers {
  [key: string]: Queue<MailVerificationRequestedEvent['data'], void, string>;
}

const queueOption = {
  connection: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
  }
}

const customVerificationQueue = new Queue<CustomVerificationRequestedEvent['data'], void, CustomVerificationRequestedEvent['topic']>(Topics.CustomVerificationRequested, queueOption);
const mailruQueue = new Queue<MailruVerificationRequestedEvent['data'], void, MailruVerificationRequestedEvent['topic']>(Topics.MailruVerificationRequested, queueOption);
const outlookQueue = new Queue<OutlookVerificationRequestedEvent['data'], void, OutlookVerificationRequestedEvent['topic']>(Topics.OutlookVerificationRequested, queueOption);
const yahooQueue = new Queue<YahooVerificationRequestedEvent['data'], void, YahooVerificationRequestedEvent['topic']>(Topics.YahooVerificationRequested, queueOption);
const skynetQueue = new Queue<SkynetVerificationRequestedEvent['data'], void, SkynetVerificationRequestedEvent['topic']>(Topics.SkynetVerificationRequested, queueOption);

export const queues: VerificationProducers = {
  'aol.com': new Queue<AolVerificationRequestedEvent['data'], void, AolVerificationRequestedEvent['topic']>(Topics.AolVerificationRequested, queueOption),
  'gmail.com': new Queue<GmailVerificationRequestedEvent['data'], void, GmailVerificationRequestedEvent['topic']>(Topics.GmailVerificationRequested, queueOption),

  // yahoo
  'yahoo.com': yahooQueue,
  'ymail.com': yahooQueue,
  // outlook
  'outlook.com': outlookQueue,
  'hotmail.com': outlookQueue,
  'hotmail.co.uk': outlookQueue,
  'hotmail.fr': outlookQueue,
  'live.com': outlookQueue,
  'msn.com': outlookQueue,
  'windowslive.com': outlookQueue,
  // mairu
  'mail.ru': mailruQueue,
  'inbox.ru': mailruQueue,
  'list.ru': mailruQueue,
  'bk.ru': mailruQueue,
  'internet.ru': mailruQueue,
}

interface Workers {
  [key: string]: {
    workers: string[];
    count: number;
  };
}

export async function getTotalWorkers() {
  const totalWorkers = await Promise.all(Object.values(queues).map(queue => queue.getWorkers()));
  const workers: Workers = {};
  totalWorkers.forEach((workerList) => {
    workerList.forEach((worker) => {
      workers[worker.name] = workers[worker.name] || { workers: [], count: 0 };
      workers[worker.name].workers.push(worker.addr);
    });
  });
  Object.values(workers).forEach((worker) => {
    worker.count = worker.workers.length;
  });
  return workers;
}

export async function drainQueues() {
  await customVerificationQueue.drain();
  await Promise.all(Object.values(queues).map(queue => queue.drain()));
}

export function getQueueByDomain(domain: string) {
  const queue = queues[domain];
  if (queue) {
    return queue;
  }

  if (isYahoo(domain)) {
    return yahooQueue;
  }

  if (isSkynet(domain)) {
    return skynetQueue;
  }

  if (isHotmail(domain)) {
    return outlookQueue;
  }

  if (isOutlook(domain)) {
    return outlookQueue;
  }

  if (isMsn(domain)) {
    return outlookQueue;
  }

  return customVerificationQueue;
}

export function getQueue(_email: string) {
  const email = _email.replace("\\r", '').replace("\\r", '').replace("\\r", '').replace("\\r", '').trim();
  const domain = email.split('@')[1].trim().toLowerCase();
  const queue = getQueueByDomain(domain);
  return { queue, domain };
}

export async function produceVerificationRequest(id: string, email: string, checkPaused: boolean, delayInMilliseconds?: number) {
  if (checkPaused) {
    const job = await JobCollection.findById(id).populate('request', { paused: 1 });
    if ((job?.request as RequestDocument).paused) {
      return;
    }
  }
  const { queue, domain } = getQueue(email);
  const jobOption: JobsOptions = { jobId: id, removeOnComplete: true, removeOnFail: true };
  if (delayInMilliseconds) {
    jobOption.delay = delayInMilliseconds;
  }
  return queue.add(queue.name, { id, email, domain }, jobOption);
}