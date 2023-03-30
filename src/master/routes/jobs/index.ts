import { Router } from "express";
import { getJobAttemptsRouter } from "./attempts";
import { getJobRouter } from "./get";

export const jobsRouter = Router();

jobsRouter.use("/jobs", getJobRouter);
jobsRouter.use("/jobs", getJobAttemptsRouter);