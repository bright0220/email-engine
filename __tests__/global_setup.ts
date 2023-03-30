import { logger } from "../src/logger";

export default async () => {
  logger.info({ message: 'setting up global test environment' });
}