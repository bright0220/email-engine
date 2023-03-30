import express from 'express';
import bodyParser from 'body-parser';
import { router } from './routes';
import morgan from 'morgan';
import { ValidationError } from 'joi';

export const app = express();

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', router);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(400).json(err);
  }
  res.status(500).json({ message: 'internal server error' });
});
