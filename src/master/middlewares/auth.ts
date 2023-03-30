import { NextFunction, Request, Response } from "express";
import { logger } from "../../logger";
import jwt from 'jsonwebtoken';
import { config } from "../../config";

export async function auth (req: Request<unknown, unknown, unknown, unknown, Record<string, any>>, res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    return res.status(401).send('No authorization header');
  }
  const decoded = Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString('utf8');
  const [username, password] = decoded.split(':');
  if (username !== 'alex' || password !== '1234') {
    return res.status(401).send('Invalid username or password');
  }
  next();
};