import { Request, Router } from 'express';
import { Job } from '../../models/job';
import { produceVerificationRequest } from '../helpers/producer';
import { auth } from '../middlewares/auth';

export const retryRouter = Router();

retryRouter.get('/retry/:requestid', auth, async (req: Request, res) => {
  const jobList = await Job.find({ request: req.params.requestid, status: {$in: ['FAILED', 'REQUESTED']} });
  for await (const job of jobList) {
    await produceVerificationRequest(job.id, job.email, true);
  }
  res.send({
    message: 'retrying',
  });
});
