import { Request, Router } from "express";
import Joi from 'joi';
import { validate } from "../../master/middlewares/validator";
import { REQUEST_ERRORS, REQUEST_TYPES, sendRequest, workers } from "../master";

export const fetchRouter = Router();

const schema = Joi.object({
  url: Joi.string().required(),
  method: Joi.string().required(),
  headers: Joi.object().required(),
  body: Joi.string().optional(),
});

fetchRouter.post("/:id/fetch", validate(schema), async (req: Request, res) => {
  const { id } = req.params;

  if (workers.get(parseInt(id, 10))?.isReloadingTor) {
    res.status(430).json({ error: REQUEST_ERRORS.WORKER_RELOADING_TOR });
    return;
  }

  if (workers.get(parseInt(id, 10))?.isRestarting) {
    res.status(430).json({ error: REQUEST_ERRORS.WORKER_RESTARTING });
    return;
  }

  const { data, error } = await sendRequest(parseInt(id, 10), REQUEST_TYPES.FETCH, req.body);

  if (error) {
    if (error === REQUEST_ERRORS.CHROME_USAGE_LIMIT_EXCEEDED) {
      res.status(430).json({ error: error });
      return;
    }

    res.status(500).json({ error: error });
    return
  }

  const { status, cookie, body, contentType } = data;

  if (cookie) {
    res.header('set-cookie', cookie);
  }

  if (contentType) {
    contentType.includes('application/json')
      ? res.status(status).json(body)
      : res.status(status).send(body);

    return;
  }

  res.status(status).send(body);
});