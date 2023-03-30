import { Router } from "express";
import { workers, REQUEST_ERRORS, sendRequest, REQUEST_TYPES } from "../master";

export const outlookRouter = Router();

export interface OutlookResponse {
  cookies: string[];
  flowToken: string;
  userAgent: string;
}

outlookRouter.post("/:id/open/outlook", async (req, res) => {
  const { id } = req.params;

  if (workers.get(parseInt(id, 10))?.isReloadingTor) {
    res.status(430).json({ error: REQUEST_ERRORS.WORKER_RELOADING_TOR });
    return;
  }

  if (workers.get(parseInt(id, 10))?.isRestarting) {
    res.status(430).json({ error: REQUEST_ERRORS.WORKER_RESTARTING });
    return;
  }

  const { data, error } = await sendRequest(parseInt(id, 10), REQUEST_TYPES.OUTLOOK, {
    url: req.body.url,
  });

  if (error) {
    if (error === REQUEST_ERRORS.CHROME_USAGE_LIMIT_EXCEEDED) {
      res.status(430).json({ error: error });
      return;
    }

    res.status(500).json({ error: error });
    return
  }

  res.json(data);
});