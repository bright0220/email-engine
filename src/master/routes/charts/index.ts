import { Router } from "express";
import { dailyJobsRouter } from "./daily-jobs";
import { monthlyJobsRouter } from "./monthly-jobs";

export const chartsRouter = Router();

chartsRouter.use("/charts", dailyJobsRouter);
chartsRouter.use("/charts", monthlyJobsRouter);