import { Job, Worker } from 'bullmq';
import { Event } from '../../broker';
import { logger } from '../../logger';
import { ValidationResponse } from '../../broker/validation-response';
import { ResultType } from '../base-validator';
import { config } from '../../config';

const timeout = (promise: Promise<ValidationResponse>, ms: number): Promise<ValidationResponse> => {
  // Create a promise that rejects in <ms> milliseconds
  const timeout: Promise<ValidationResponse> = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Timed out in ' + ms + 'ms.'));
    }, ms);
  });

  return Promise.race([promise, timeout]);
};

export abstract class BaseWorker<T extends Event> {
  protected abstract readonly topic: T['topic'];
  protected abstract concurrency: number;
  protected abstract maxJobLifeTime: number;
  protected abstract validationMethod: string;
  protected abstract onTimeout: () => Promise<void>
  protected abstract onWork: (data: T['data'], job: Job<T['data'], ValidationResponse, T['topic']>) => Promise<ValidationResponse>;
  private worker: Worker<T['data'], ValidationResponse, T['topic']> | undefined;

  constructor(protected ip: string, protected connectionOption: { host: string; port: number }) {}

  async listen() {
    this.worker = new Worker<T['data'], ValidationResponse, T['topic']>(
      this.topic,
      async (job) => {
        logger.trace({ message: `job received`, topic: this.topic, id: job.id });
        
        const startTimestamp = Date.now();
        
        try {
          const result = await timeout(this.onWork(job.data, job), this.maxJobLifeTime);

          const endTimestamp = Date.now();

          logger.trace({ message: `job completed`, topic: this.topic, id: job.id });
          return {
            ...result,
            ip: this.ip,
            validatedRelay: config.RELAY_ID,
            validatedWorker: config.TOR_ID,
            validationTime: endTimestamp - startTimestamp,
            validationMethod: this.validationMethod,
          }
        } catch (e: any) {

          await this.onTimeout()

          logger.error({ message: `job crashed`, errorMessage: e.message, topic: this.topic, id: job.id });

          const endTimestamp = Date.now();

          return {
            ...job.data,
            ip: this.ip,
            valid: false,
            validatedRelay: config.RELAY_ID,
            validatedWorker: config.TOR_ID,
            validationTime: endTimestamp - startTimestamp,
            validationMethod: this.validationMethod,
            reason: ResultType.TIMEOUT,
            isSMTP: false,
          };
        }
      },
      {
        connection: this.connectionOption,
        concurrency: this.concurrency,
      }
    );
    await this.worker.waitUntilReady();
  }

  async close() {
    await this.worker?.close();
  }
}
