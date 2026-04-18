export interface PortfolioUnit {
  id: string;
  portfolioId: string;
  propertyId: string;
  name: string;
  conditions: string | null;
  leaseBaseAmount: number;
  leaseBaseCurrency: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface CreatePortfolioUnitRequest {
  propertyId: string;
  leaseBaseAmount: number;
  leaseBaseCurrency: string;
  conditions?: string;
}

export interface UpdatePortfolioUnitRequest {
  conditions?: string;
  leaseBaseAmount?: number;
  leaseBaseCurrency?: string;
}

export interface UnitFormData {
  propertyId: string;
  leaseBaseAmount: string; // string for form input
  leaseBaseCurrency: string;
  conditions: string;
}

export interface PortfolioSummary {
  id: string;
  name: string;
  description: string | null;
  propertyType: string | null;
  creationDate: string;
  totalUnits: number;
  activeLeases: number;
  occupancyPercentage: number;
}

export interface PaginatedPortfolios {
  data: PortfolioSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  globalTotalUnits: number;
  globalActiveLeases: number;
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
}

export interface CreateUnitRequest {
  name: string;
  address: string;
  propertyType: string;
  length?: number;
  width?: number;
  numberOfRooms?: number;
  numberOfBathrooms?: number;
  description?: string;
  leaseBaseAmount: number;
  leaseBaseCurrency?: string;
}

export interface EnrichedUnitFormData {
  name: string;
  address: string;
  propertyType: string;
  length: string;          // string for form input
  width: string;           // string for form input
  numberOfRooms: string;
  numberOfBathrooms: string;
  description: string;
  leaseBaseAmount: string; // string for form input
  leaseBaseCurrency: string;
}

export interface PropertyType {
  id: string;
  code: string;
  description: string;
}

export interface EnrichedUnitResponse {
  id: string;
  portfolioId: string;
  name: string;
  propertyType: string;
  address: string;
  area: number | null;
  numberOfRooms: number;
  numberOfBathrooms: number;
  description: string | null;
  leaseBaseAmount: number;
  leaseBaseCurrency: string;
  createdAt: string;
  updatedAt: string;
}
