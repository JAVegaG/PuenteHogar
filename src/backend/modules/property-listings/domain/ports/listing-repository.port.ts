import { ListingEntity } from '../entities/listing.entity';

export interface CreateListingData {
  portfolioUnitId: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  photoUrls: string[];
}

export interface ListingFilters {
  city?: string;
  neighborhood?: string;
  search?: string;
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
  rooms?: number;
  bathrooms?: number;
  areaMin?: number;
  areaMax?: number;
  publishedWithin?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

export interface ListingDetail {
  listing: ListingEntity;
  numberOfRooms: number | null;
  numberOfBathrooms: number | null;
  propertyType: string | null;
  address: {
    state: string;
    city: string;
    neighborhood: string;
    address: string;
  } | null;
  landlordUserId: string | null;
}

export interface PaginatedListings {
  data: ListingEntity[];
  total: number;
}

export interface IListingRepository {
  create(data: CreateListingData): Promise<ListingEntity>;
  findPublished(filters: ListingFilters): Promise<PaginatedListings>;
  findById(id: string): Promise<ListingEntity | null>;
  findDetailById(id: string): Promise<ListingDetail | null>;
  unpublish(id: string): Promise<void>;
  invalidateAllListingCacheKeys?(): Promise<void>;
  getOwnerUserId(listingId: string): Promise<string | null>;
  registerContactEvent(listingId: string, tenantUserId: string): Promise<void>;
}
