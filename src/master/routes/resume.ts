import { Request, Router } from 'express';
import { Job as JobCollection, JobStatus } from '../../models/job';
import { Request as RequestCollection } from '../../models/request';
import { produceVerificationRequest } from '../helpers/producer';
import { auth } from '../middlewares/auth';

export const resumeRouter = Router();

resumeRouter.post('/requests/:requestId/resume', auth, async (req: Request, res) => {
  const { requestId } = req.params;
  const request = await RequestCollection.findById(requestId);
  if (!request) {
    return res.status(404).send('Request not found');
  }
  if (!request.paused) {
    return res.status(400).send('Request was not paused');
  }
  const jobs = await JobCollection.find({ 
    request: requestId,
    status: { $ne: JobStatus.COMPLETED }
  }).select({ _id: 1, email: 1 });
  
  res.json({ success: true });

  for await (const job of jobs) {
    await produceVerificationRequest(job.id, job.email, false);
  }
  request.set({ paused: false });
  await request.save();
});