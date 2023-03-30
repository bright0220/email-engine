import { redis } from '../utils/redis';

const prefix = 'catchall';

export class Catchall {
  public async add(domain: string): Promise<void> {
    await redis.client.sAdd(prefix, domain);
  }

  public async remove(domain: string): Promise<void> {
    await redis.client.sRem(prefix, domain);
  }

  public async contains(domain: string): Promise<boolean> {
    return redis.client.sIsMember(prefix, domain);
  }
}

export const catchall = new Catchall();