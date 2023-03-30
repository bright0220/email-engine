import { Router } from "express";
import { requestsListRouter } from "./requests";
import { updateRequestNameRouter } from "./update-name";

export const requestsRouter = Router();

requestsRouter.use("/requests", requestsListRouter);
requestsRouter.use("/requests", updateRequestNameRouter);