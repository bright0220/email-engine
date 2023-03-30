import { EventEmitter } from 'node:events'
import { config } from '../../config';
import { logger } from '../../logger';
import { Job } from '../../models/job';
import { ResultType } from '../../worker/base-validator';

function getEventName (jobId: string) {
  return `job:${jobId}:completed`;
}

class WorkEvent extends EventEmitter {
  protected timers: { [key: string]: NodeJS.Timeout } = {};
  /**
   * it will emit job completed after config.MAX_JOB_LIFE_TIME and clean up the event listener
   * @param jobId string
   */
  startWork (jobId: string, timeoutCallback:() => Promise<void>): void {
    logger.trace({ message: `start work`, id: jobId });
    this.timers[jobId] = setTimeout(async () => {
      this.emitJobCompleted(jobId);
      delete this.timers[jobId];
      await timeoutCallback();
    }, config.MAX_JOB_LIFE_TIME.DEFAULT);
    
  }
  waitUntil (jobId: string): Promise<void> {
    logger.trace({ message: `starting to wait until job completed`, id: jobId });
    const eventName = getEventName(jobId);
    return new Promise((resolve, reject) => {
      this.on(eventName, () => {
        if (this.timers[jobId]) {
          clearTimeout(this.timers[jobId]);
          delete this.timers[jobId];
        }
        resolve();
        // clear event listener
        this.removeAllListeners(eventName);
      });
    });
  }

  emitJobCompleted (jobId: string): void {
    logger.trace({ message: `job completed`, id: jobId });
    this.emit(getEventName(jobId));
  }
}

export const workEvent = new WorkEvent();