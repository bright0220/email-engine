import { config } from "../config";
import { Job } from "../models/job";
import { redis } from "../utils/redis";

export async function jobCanTryAgain(jobId: string, isSMTP: boolean): Promise<boolean> {
  // const key = `job:${jobId}:tries`
  // const triedCount = await redis.client.incr(key);
  // await redis.client.expire(key, 60 * 5);
  const maxTries = isSMTP ? config.SMTP_JOB_MAX_TRY : config.HTTP_JOB_MAX_TRY;
  // return triedCount < maxTries;
  const job = await Job.findById(jobId).select({ attemptCount: 1 });
  if (!job) {
    return false;
  }
  const attemptCount = job.attemptCount || 0;
  return attemptCount < maxTries;
}