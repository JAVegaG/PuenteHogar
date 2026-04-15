import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@src/shared/redis/redis.service';
import { ListingEntity } from '../../domain/entities/listing.entity';
import { PhotoEntity } from '../../domain/entities/photo.entity';
import { IListingCache } from '../../domain/ports/listing-cache.port';

@Injectable()
export class RedisListingCacheAdapter implements IListingCache {
  private readonly logger = new Logger(RedisListingCacheAdapter.name);

  constructor(private readonly redisService: RedisService) {}

  async getListings(key: string): Promise<ListingEntity[] | null> {
    try {
      const raw = await this.redisService.get(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown[];
      return parsed.map((item) => this.deserialize(item as Record<string, unknown>));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cache GET failed for key "${key}": ${message}`);
      return null;
    }
  }

  async setListings(
    key: string,
    listings: ListingEntity[],
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redisService.set(key, JSON.stringify(listings), ttlSeconds);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cache SET failed for key "${key}": ${message}`);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cache DEL failed for key "${key}": ${message}`);
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      await this.redisService.delByPattern(pattern);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cache DEL pattern failed for "${pattern}": ${message}`);
    }
  }

  private deserialize(item: Record<string, unknown>): ListingEntity {
    const photos = ((item['photos'] as unknown[]) ?? []).map((p) => {
      const photo = p as Record<string, unknown>;
      return new PhotoEntity(
        photo['id'] as string,
        photo['listingId'] as string,
        photo['fileUrl'] as string,
        photo['isMain'] as boolean,
      );
    });

    return new ListingEntity(
      item['id'] as string,
      item['portfolioUnitId'] as string,
      item['title'] as string,
      (item['description'] as string | null) ?? null,
      new Date(item['listingDate'] as string),
      item['price'] as number,
      item['currency'] as string,
      item['isActive'] as boolean,
      photos,
    );
  }
}
