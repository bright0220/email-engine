import { Request, Response, Router } from "express";
import Joi from "joi";
import { Types } from "mongoose";
import { Request as RequestCollection } from "../../../models/request";
import { auth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validator";

export const updateRequestNameRouter = Router();

const schema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
})

updateRequestNameRouter.put("/:id/name", auth, validate(schema), async (req: Request<{id: string}, unknown, { name: string }>, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const requestId = new Types.ObjectId(id);
  const request = await RequestCollection.findById(requestId);
  if (!request) {
    return res.status(404).send('request not found');
  }
  request.set({ name });
  await request.save();
  res.json({ success: true });
});