import { Request, Router } from "express";
import { getTotalWorkers } from '../helpers/producer';

export const workersRouter = Router();

workersRouter.get("/workers", async (req: Request, res) => {
  res.json(await getTotalWorkers());
});