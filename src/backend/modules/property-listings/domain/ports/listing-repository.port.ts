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
  department?: string;
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
  additionalFeatures?: Record<string, string>;
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

export interface UpdateListingData {
  title?: string;
  description?: string;
  price?: number;
  newPhotoUrls?: string[];
  removePhotoIds?: string[];
}

export interface IListingRepository {
  create(data: CreateListingData): Promise<ListingEntity>;
  findPublished(filters: ListingFilters): Promise<PaginatedListings>;
  findById(id: string): Promise<ListingEntity | null>;
  findDetailById(id: string): Promise<ListingDetail | null>;
  findActiveByPortfolioUnitId(portfolioUnitId: string): Promise<ListingEntity | null>;
  update(id: string, data: UpdateListingData): Promise<ListingEntity>;
  unpublish(id: string): Promise<void>;
  invalidateAllListingCacheKeys?(): Promise<void>;
  getOwnerUserId(listingId: string): Promise<string | null>;
  getOwnerUserIdByUnit(portfolioUnitId: string): Promise<string | null>;
  registerContactEvent(listingId: string, tenantUserId: string): Promise<void>;
}
