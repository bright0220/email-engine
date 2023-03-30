import mongoose from "mongoose";
import { config } from "../config";
import { logger } from "../logger";
import { redis } from "../utils/redis";
import { workers } from "./queue";

const ip = process.env.IP!;

async function main(): Promise<void> {
  await redis.connect();
  await mongoose.connect(config.MONGODB_URI);
  await workers.listen();
  logger.info({ message: `Worker started....`, ip });
}

main();