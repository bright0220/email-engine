import os from 'os';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const [redisHost, redisPort] = REDIS_URL.replace('redis://', '').split(':');

const TOTAL_IP = 8;

export const config = {
  RELAY_ID: process.env.RELAY_ID || '0',
  TOR_ID: process.env.TOR_ID || '0',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/test',
  REDIS_URL,
  REDIS_HOST: redisHost,
  REDIS_PORT: parseInt(redisPort, 10),
  KAFKA_HOST: process.env.KAFKA_HOST || 'localhost:9092',
  KAFKA_MAX_PARTITION_IN_TOPIC: 10,
  KAFKA_REPLICATION_FACTOR: 1,
  GREYLIST_TTL: Number(process.env.GREYLIST_TTL || 60), // 1 minutes for simulation test
  BLACKLIST_TTL: Number(process.env.BLACKLIST_TTL || 5 * 60), // 1 minutes for simulation test
  HTTP_JOB_MAX_TRY: Number(process.env.JOB_MAX_TRY || 16),
  SMTP_JOB_MAX_TRY: Number(process.env.JOB_MAX_TRY || 12),
  TOTAL_IP,
  CONCURRENCY: {
    SMTP: 8,
    HTTP: 8,
    GMAIL: 20,
    OUTLOOK: 8,
    SKYNET: 5,
    TTL: 1000 * 60 * 5, // 5 minutes
  },
  JOB_RETRY_DELAY: 1000 * 5,
  HEADLESS_WORKER_TIMEOUT: 1000 * 60, // 3 minutes
  HEADLESS_TOR_RELOAD_INTERVAL: 1000 * 60, // 1 minutes
  // MAX_JOB_LIFE_TIME: 1000 * 60 * 2, // after this time, job will automatically complete, then next job will be processed
  MAX_JOB_LIFE_TIME: {
    DEFAULT: 1000 * 30,
    GMAIL: 1000 * 10,
    OUTLOOK: 1000 * 60,
  }, // after this time, job will automatically complete, then next job will be processed
  MAX_BROWSER_USAGE: 50 * 10,
  SOCKS_PROXY_SERVER: process.env.SOCKS_PROXY_SERVER || 'socks5://10.255.255.250:1080',
  HTTPS_PROXY_SERVER: process.env.HTTPS_PROXY_SERVER || 'https://',
  CATCHALL_VALIDATION_COUNT: 1,
  HEADLESS_PORT: process.env.HEADLESS_PORT || 3102,
  HEADLESS_HOST: process.env.HEADLESS_HOST || `http://${os.hostname()}:${process.env.HEADLESS_PORT || 3102}`,
  SHARED_USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
  TOR_CONTROL_SECRET: process.env.TOR_CONTROL_SECRET || '',
  JWT_AUTH_SECRET: process.env.JWT_AUTH_SECRET || 'secret',
};