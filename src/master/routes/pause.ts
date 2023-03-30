import { Job } from 'bullmq';
import { Request, Router } from 'express';
import { Job as JobCollection, JobStatus } from '../../models/job';
import { Request as RequestCollection } from '../../models/request';
import { getQueue } from '../helpers/producer';
import { auth } from '../middlewares/auth';

async function pauseJob(jobId: string, email: string) {
  console.log('Pausing job', jobId);
  const { queue } = getQueue(email);
  const removed = await queue.remove(jobId);
  if (removed === 1){
    console.log('Job removed from queue', jobId);
  } else {
    console.log('Job not removed from queue', jobId);
  }
}

export const pauseRouter = Router();

pauseRouter.post('/requests/:requestId/pause', auth, async (req: Request, res) => {
  const { requestId } = req.params;
  const request = await RequestCollection.findById(requestId);
  if (!request) {
    return res.status(404).send('Request not found');
  }
  if (request.paused) {
    return res.status(400).send('Request already paused');
  }
  const jobs = await JobCollection.find({ 
    request: requestId,
    status: { $ne: JobStatus.COMPLETED }
  }).select({ _id: 1, email: 1 });
  console.log('Pausing jobs', jobs.map(({ id }) => id));
  await Promise.all(jobs.map(({ id, email }) => pauseJob(id, email)));
  request.set({ paused: true });
  await request.save();
  res.json({ success: true });
});