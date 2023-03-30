import moment from "moment";
import { FilterQuery } from "mongoose";
import { logger } from "../logger";
import { Job as JobCollection, JobDocument, JobStatus } from "../models/job";
import { Request, RequestDocument } from "../models/request";
import { getQueue, produceVerificationRequest } from "./helpers/producer";

export async function startZookeeper() {
  logger.info({ message: "Starting zookeeper" });
  await keepzoo();
  setInterval(keepzoo, 10 * 60 * 1000);
}

async function keepzoo() {
  logger.info({ message: "Checking zookeeper" });
  const query: FilterQuery<RequestDocument> = {
    $and: [
      {
        paused: { $ne: true },
      },
      { createdAt: { $lt: moment().subtract(1, "hour").toDate() } },
      { totalCount: { $gt: 0 } },
      {
        $expr: {
          $lt: ['$completedCount', '$totalCount'],
        }
      },
    ],
  };
  const requests = await Request.find(query);
  console.log(`Found ${requests.length} requests`, requests.map(({ id }) => id));
  const jobs = await JobCollection.find({ 
    request: { $in: requests.map(({ id }) => id) },
    status: { $ne: JobStatus.COMPLETED }
  }).select({ _id: 1, email: 1 });
  await pauseJobs(jobs);
  await resumeJobs(jobs);
}

async function resumeJobs(jobs: JobDocument[]) {
  for await (const job of jobs) {
    await produceVerificationRequest(job.id, job.email, false);
  }
  console.log(`Resumed ${jobs.length} jobs`)
}

async function pauseJobs(jobs: JobDocument[]) {
  // console.log('Pausing jobs', jobs.map(({ id }) => id));
  await Promise.all(jobs.map(({ id, email }) => pauseJob(id, email)));
  console.log(`Paused ${jobs.length} jobs`)
}

async function pauseJob(jobId: string, email: string) {
  // console.log('Pausing job', jobId);
  const { queue } = getQueue(email);
  const removed = await queue.remove(jobId);
  // if (removed === 1){
  //   console.log('Job removed from queue', jobId);
  // } else {
  //   console.log('Job not removed from queue', jobId);
  // }
}