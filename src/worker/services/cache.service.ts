import { caching, MemoryCache } from 'cache-manager';

class Cache {
  protected _cache: MemoryCache | null = null;

  async initialize () {
    this._cache = await caching('memory', {
      max: 100,
      ttl: 1000,
    })
  }

  get<T>(key: string) {
    return this._cache?.get<T>(key);
  }

  set<T>(key: string, value: T) {
    return this._cache?.set(key, value);
  }

  del (key: string) {
    return this._cache?.del(key);
  }
}

export const cache = new Cache();