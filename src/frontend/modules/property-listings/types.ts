export interface Photo {
  id: string;
  fileUrl: string;
  isMain: boolean;
}

export interface Listing {
  id: string;
  portfolioUnitId: string;
  title: string;
  description: string | null;
  listingDate: string; // ISO date string
  price: number;
  currency: string;
  isActive: boolean;
  photos: Photo[];
  numberOfRooms: number | null;
  numberOfBathrooms: number | null;
  propertyType: string | null;
  neighborhood: string | null;
}

export interface ListingAddress {
  state: string;
  city: string;
  neighborhood: string;
  address: string;
}

export interface ListingDetail extends Listing {
  address: ListingAddress | null;
  landlordUserId: string | null;
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
  publishedWithin?: '24h' | '7d' | '30d' | '90d' | 'any';
  sortBy?: 'date' | 'price';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedListings {
  data: Listing[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListingResponse {
  id: string;
  portfolioUnitId: string;
  title: string;
  description: string | null;
  listingDate: string;
  price: number;
  currency: string;
  isActive: boolean;
  photos: { id: string; fileUrl: string; isMain: boolean }[];
}
