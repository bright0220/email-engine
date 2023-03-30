import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../logger';
import { redis } from '../utils/redis';
import { app } from "./app";
import { listenJobEvents } from "./event-listener";
import { startZookeeper } from './zookeeper';

async function main(): Promise<void> {
  await redis.connect();
  await mongoose.connect(config.MONGODB_URI);
  await listenJobEvents();
  app.listen(3000, () => {
    logger.info({ message: "Master started on port 3000" });
  });
  startZookeeper();
}

main();