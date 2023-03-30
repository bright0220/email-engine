import { createClient, RedisClientType } from 'redis';
import {config} from '../config';
import { logger } from '../logger';

class Redis {
  protected _client: RedisClientType;
  constructor(url: string) {
    this._client = createClient({ url });
  }

  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this._client.on('connect', () => {
        logger.trace({ 
          message: 'Redis client connected',
          REDIS_URL: config.REDIS_URL,
        });
        resolve();
      });
      this._client.on('error', (err) => {
        logger.error(err);
        reject(err);
      });
      await this._client.connect();
    });
  }
  get client(): RedisClientType {
    return this._client;
  }
}

export const redis = new Redis(config.REDIS_URL);