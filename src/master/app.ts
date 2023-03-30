import express from 'express';
import bodyParser from 'body-parser';
import { router } from './routes';
import fileUpload from 'express-fileupload';
import { ValidationError } from 'joi';
import { queues } from './helpers/producer'
import { ExpressAdapter, createBullBoard, BullAdapter, BullMQAdapter } from '@bull-board/express';

export const app = express();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: Object.values(queues).map((queue) => new BullAdapter(queue, { readOnlyMode: true })),
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
// app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));

app.use('/api', router);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(400).json(err);
  }
  console.log(err);
  res.status(500).json({ message: 'internal server error' });
});
