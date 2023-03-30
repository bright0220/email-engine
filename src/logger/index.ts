import pino from 'pino';

const logger = pino({
  formatters: {
    level(label) {
      return { level: label };
    }
  }
});

// logger.level = 'trace';

export {
  logger
}