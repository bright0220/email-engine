import { Router } from "express";
import { REQUEST_ERRORS, REQUEST_TYPES, sendRequest, workers } from "../master";

export const yahooRouter = Router();

export interface YahooResponse {
  cookies: string[];
  inputs: {
    [key: string]: string
  };
  userAgent: string;
}

yahooRouter.post("/:id/open/yahoo/", async (req, res) => {
  const { id } = req.params

  if (workers.get(parseInt(id, 10))?.isReloadingTor) {
    res.status(430).json({ error: REQUEST_ERRORS.WORKER_RELOADING_TOR });
    return;
  }

  if (workers.get(parseInt(id, 10))?.isRestarting) {
    res.status(430).json({ error: REQUEST_ERRORS.WORKER_RESTARTING });
    return;
  }

  const { data, error } = await sendRequest(parseInt(id, 10), REQUEST_TYPES.YAHOO, {
    url: req.body.url,
  });

  if (error) {
    if (error === REQUEST_ERRORS.CHROME_USAGE_LIMIT_EXCEEDED) {
      res.status(430).json({ error: error });
      return;
    }

    res.status(500).json({ error: error });
    return;
  }

  res.json(data);
});