import { Injectable } from '@nestjs/common';
import { RedisService } from '@src/shared/redis/redis.service';
import type { IReportCache } from '../../domain/ports/report-cache.port';

@Injectable()
export class RedisReportCache implements IReportCache {
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), ttlSeconds);
  }
}
