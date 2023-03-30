import { logger } from "../src/logger";

export default async () => {
  logger.info({ message: 'tearing down global test environment' });
}