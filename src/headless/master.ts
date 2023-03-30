import { v4 as uuidv4 } from 'uuid';
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import { config } from '../config';
import { logger } from '../logger';

export type ObjectValues<T> = T[keyof T];

export const WORKER_EVENTS = {
  RELOAD_TOR_STARTED: 'RELOAD_TOR_STARTED',
  RELOAD_TOR_FINISHED: 'RELOAD_TOR_FINISHED',
  WORKER_READY: 'WORKER_READY',
} as const;

export const REQUEST_TYPES = {
  RELOAD_TOR: 'RELOAD_TOR',
  RESTART_WORKER: 'RESTART_WORKER',
  OUTLOOK: 'OUTLOOK',
  FETCH: 'FETCH',
  AOL: 'AOL',
  YAHOO: 'YAHOO',
} as const;

export const REQUEST_ERRORS = {
  WORKER_NOT_FOUND: 'WORKER_NOT_FOUND',
  WORKER_RESTARTING: 'WORKER_RESTARTING',
  WORKER_RELOADING_TOR: 'WORKER_RELOADING_TOR',
  CHROME_USAGE_LIMIT_EXCEEDED: 'CHROME_USAGE_LIMIT_EXCEEDED',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
} as const;

const requests = new Map()


export const workers = new Map<number, {
  isRestarting: boolean;
  isReloadingTor: boolean;
  client: ChildProcess;
  lastTorReload: number;
}>();

export function sendRequest(workerId: number, request: ObjectValues<typeof REQUEST_TYPES>, body: any): any {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const worker = workers.get(workerId);

    if (!worker) {
      reject(new Error(REQUEST_ERRORS.WORKER_NOT_FOUND));
      return;
    }

    if (worker.isRestarting) {
      reject(new Error(REQUEST_ERRORS.WORKER_RESTARTING));
      return;
    }

    if (worker.isReloadingTor) {
      reject(new Error(REQUEST_ERRORS.WORKER_RELOADING_TOR));
      return;
    }

    worker.client.send({
      id,
      request,
      body,
    });

    const timer = setTimeout(() => {
      requests.delete(id);
      reject(new Error('Request timeout'));
    }, config.HEADLESS_WORKER_TIMEOUT);

    requests.set(id, {
      resolve,
      reject,
      timer,
    })
  });
}

export function sendRestartRequest(workerId: number) {
  const worker = workers.get(workerId);

  if (!worker) {
    return;
  }

  worker.client.send(
    REQUEST_TYPES.RESTART_WORKER
  );
}

export function sendTorReloadRequest(workerId: number) {
  const worker = workers.get(workerId);

  if (!worker) {
    return;
  }

  const now = Date.now();

  if (now - worker.lastTorReload < config.HEADLESS_TOR_RELOAD_INTERVAL) {
    return;
  }

  worker.client.send(
    REQUEST_TYPES.RELOAD_TOR
  );
}

export function createWorker(workerId: number) {
  const worker = fork(path.join(__dirname, './worker'), {
    env: {
      SOCK_ID: `${workerId}`,
      TOR_CONTROL_SECRET: config.TOR_CONTROL_SECRET,
    }
  });

  worker.on('error', (error) => {
    logger.trace('Worker process error', error);
  })

  worker.on('message', (message: any) => {
    logger.trace('Message from worker', message);

    switch (message) {
      case WORKER_EVENTS.RELOAD_TOR_STARTED:
        workers.get(workerId)!.isReloadingTor = true;
        break;
      case WORKER_EVENTS.RELOAD_TOR_FINISHED:
        workers.get(workerId)!.isReloadingTor = false;
        workers.get(workerId)!.lastTorReload = Date.now();
        break;
      case WORKER_EVENTS.WORKER_READY:
        workers.get(workerId)!.isRestarting = false;
        break;
      default:
        if (typeof message === 'object' && message.id) {
          const request = requests.get(message.id);

          if (!request) {
            return;
          }

          clearTimeout(request.timer);
          request.resolve(message.data);
        }
        break;
    }
  });

  worker.on('exit', (code, ...rest) => {
    logger.trace('Worker process exited with code', code, rest);

    const newWorker = createWorker(workerId);

    workers.set(workerId, {
      isRestarting: true,
      isReloadingTor: false,
      client: newWorker,
      lastTorReload: 0,
    });
  });

  return worker
}