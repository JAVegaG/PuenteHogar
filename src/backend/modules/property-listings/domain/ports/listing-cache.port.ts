import { ListingEntity } from '../entities/listing.entity';

export interface IListingCache {
  getListings(key: string): Promise<ListingEntity[] | null>;
  setListings(key: string, listings: ListingEntity[], ttlSeconds: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidateByPattern(pattern: string): Promise<void>;
}
