import { redis } from '../utils/redis';

export class Spamtrap {
  constructor(protected prefix: string) {}
  
  public async add(email: string): Promise<void> {
    await redis.client.sAdd(this.prefix, email);
  }

  public async remove(email: string): Promise<void> {
    await redis.client.sRem(this.prefix, email);
  }

  public async contains(email: string): Promise<boolean> {
    return redis.client.sIsMember(this.prefix, email);
  }
}

export const spamtrap = new Spamtrap('spamtrap');
export const riskySpamtrap = new Spamtrap('risklyspamtrap');