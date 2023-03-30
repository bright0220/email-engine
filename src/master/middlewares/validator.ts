import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { logger } from "../../logger";

export function validate (schema: Joi.Schema) {
  return (req: Request<unknown, unknown, unknown, unknown, Record<string, any>>, res: Response, next: NextFunction) => {
    const data = req.method === 'GET' ? req.query : req.body;
    const { error } = schema.validate(data);
    if (error) {
      logger.info({ message: 'Validation error', error });
      next(error);
    } else {
      next();
    }
  };
}