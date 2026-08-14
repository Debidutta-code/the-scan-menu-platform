import { logger } from './logger';

export interface CacheOptions {
  ttlSeconds?: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, { value: any; expiresAt: number }>;

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache. Returns null if missing or expired.
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL. Default TTL: 60 seconds.
   */
  public set<T>(key: string, value: T, options?: CacheOptions): void {
    const ttlSeconds = options?.ttlSeconds || 60;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete specific cache key.
   */
  public del(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or pattern.
   */
  public invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    logger.info(`[CacheService] Invalidated ${keysToDelete.length} cache keys matching pattern: ${pattern}`);
  }

  /**
   * Clear entire cache.
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache stats.
   */
  public getStats(): { size: number } {
    return { size: this.cache.size };
  }
}

export const cacheService = CacheService.getInstance();
export default cacheService;
