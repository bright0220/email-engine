import { AbstractList, Item } from './abstract-list';
import { config } from '../config'
import { redis } from '../utils/redis';

const prefix = 'blacklist';

interface GreylistItem extends Item {
  ttl: number;
}

export class Greylist extends AbstractList {
  public async add(item: Item, callback?: () => void): Promise<void> {
    const key = prefix + ':' + item.provider + ':' + item.ip;
    await redis.client.set(key, '1');
    await redis.client.expire(key, config.BLACKLIST_TTL);
    return Promise.resolve();
  }

  public async remove(item: Item): Promise<void> {
    await redis.client.del(prefix + ':' + item.provider + ':' + item.ip);    
  }

  public async contains(item: Item): Promise<boolean> {
    const exists = await redis.client.exists(prefix + ':' + item.provider + ':' + item.ip);
    return exists > 0;
  }

  public async findByIP(ip: string): Promise<GreylistItem[]> {
    const keys = await redis.client.keys(prefix + ':*:' + ip);
    const greylistItems = await Promise.all(keys.map(async key => {
      const ttl = await redis.client.ttl(key);
      const parts = key.split(':');
      return {
        provider: parts[1],
        ip: parts[2],
        ttl,
      };
    }));
    return greylistItems;
  }
}

export const greylist = new Greylist();