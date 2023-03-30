import { config } from '../../config';
import * as workerList from './workers'

export const workers = {
  listen: () => {
    return Promise.all(Object.values(workerList).map(async (Worker) => {
      const worker = new Worker(process.env.IP!, { host: config.REDIS_HOST, port: config.REDIS_PORT });
      await worker.listen();
    }));
  }
}