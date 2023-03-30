import { config } from '../config';
import { logger } from '../logger';
import { app } from "./app";
import { createWorker, workers } from './master';

const TOTAL_CHROME = Number(process.env.TOTAL_CHROME || 8);

async function main(): Promise<void> {

  for (let i = 0; i < TOTAL_CHROME; i++) {

    let workerId = i + 1;

    const worker = createWorker(workerId);

    workers.set(workerId, {
      isRestarting: false,
      isReloadingTor: false,
      client: worker,
      lastTorReload: 0,
    });
  }

  app.listen(config.HEADLESS_PORT, () => {
    logger.info({ message: `Headless chrome started on port ${config.HEADLESS_PORT}` });
  });
}

main();