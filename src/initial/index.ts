import { redis } from "../utils/redis";
import { initializeSpamtraps } from "./initialize-spamtraps";

async function main() {
  await redis.connect();
  await initializeSpamtraps();
}

main();