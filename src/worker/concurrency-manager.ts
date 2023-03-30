import { config } from '../config';
import { redis } from '../utils/redis'

export class ConcurrencyManager {
  private _concurrencyMap: {
    [key: string]: {
      concurrency: number,
      expireAt: number,
    },
  }
  private _queueMap: { [key: string]: Array<string> }

  constructor() {
    this._concurrencyMap = {}
    this._queueMap = {}
  }

  public async getConcurrency(domain: string): Promise<number> {
    const concurrency = await redis.client.get(`smtp-concurrency:${domain}`)

    if (concurrency) {
      return parseInt(concurrency, 10)
    }

    const defaultConcurrency = await redis.client.get('smtp-concurrency:default')

    if (defaultConcurrency) {
      return parseInt(defaultConcurrency, 10)
    }

    return config.CONCURRENCY.SMTP
  }

  public async refreshConcurrency(domain: string): Promise<void> {

    if (this._concurrencyMap[domain] && this._concurrencyMap[domain].expireAt > Date.now()) {
      return
    }

    const concurrency = await this.getConcurrency(domain)

    this._concurrencyMap[domain] = {
      concurrency,
      expireAt: Date.now() + config.CONCURRENCY.TTL,
    }
  }

  public getQueueLength(domain: string): number {
    if (!this._queueMap[domain]) {
      this._queueMap[domain] = []
      return 0
    }

    return this._queueMap[domain].length
  }

  public async enqueue(domain: string, jobId: string): Promise<void> {
    if (!this._queueMap[domain]) {
      this._queueMap[domain] = []
    }

    await this.refreshConcurrency(domain);

    const { concurrency } = this._concurrencyMap[domain]
    const queueLength = this.getQueueLength(domain)

    if (queueLength >= concurrency) {
      throw new Error('Concurrency limit reached')
    }

    this._queueMap[domain].push(jobId)
  }

  public dequeue(domain: string, jobId: string): void {
    if (!this._queueMap[domain]) {
      return
    }

    this._queueMap[domain] = this._queueMap[domain].filter((id) => id !== jobId)
  }
}