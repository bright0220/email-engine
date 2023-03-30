import { Router } from "express";
import { logger } from "../../logger";
import { sendTorReloadRequest } from "../master";

export const torRouter = Router();

torRouter.post("/:id/tor/renew", async (req, res) => {
  const { id } = req.params;

  sendTorReloadRequest(parseInt(id, 10))
  res.send({ success: true });
});