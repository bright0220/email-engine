import { Request, Router } from "express";
import { isValidObjectId, Types } from "mongoose";
import { Job } from "../../../models/job";
import { auth } from "../../middlewares/auth";

export const getJobRouter = Router();

getJobRouter.get("/:jobId", auth, async (req: Request, res) => {
  const jobId = new Types.ObjectId(req.params.jobId);
  if (!isValidObjectId(jobId)) {
    return res.status(400).send('invalid request id');
  }
  const job = await Job.findById(jobId);
  if (!job) {
    return res.status(404).send('job not found');
  }
  res.json(job);
});