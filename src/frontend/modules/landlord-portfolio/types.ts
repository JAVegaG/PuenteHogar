export interface PortfolioUnit {
  id: string;
  portfolioId: string;
  propertyId: string;
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
