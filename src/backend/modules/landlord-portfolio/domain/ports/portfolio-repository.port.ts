import { EnrichedPortfolioUnitEntity } from '../entities/enriched-portfolio-unit.entity';
import { LandlordPortfolioEntity } from '../entities/landlord-portfolio.entity';
import { PortfolioUnitEntity } from '../entities/portfolio-unit.entity';

export interface PortfolioWithStats {
  id: string;
  name: string;
  description: string | null;
  creationDate: Date;
  totalUnits: number;
  activeLeases: number;
  occupancyPercentage: number;
}

export interface CreatePortfolioData {
  userId: string;
  name: string;
  description?: string;
}

export interface CreateEnrichedUnitData {
  portfolioId: string;
  name: string;
  propertyType: string;
  address: string;
  length?: number;
  width?: number;
  numberOfRooms: number;
  numberOfBathrooms: number;
  description?: string;
  leaseBaseAmount: number;
  leaseBaseCurrency: string;
  departmentName: string;
  cityName: string;
  departmentCode: string;
  cityCode: string;
}

export interface CreatePortfolioUnitData {
  portfolioId: string;
  propertyId: string;
  conditions?: string;
  leaseBaseAmount: number;
  leaseBaseCurrency: string;
}

export interface UpdatePortfolioUnitData {
  conditions?: string;
  leaseBaseAmount?: number;
  leaseBaseCurrency?: string;
  rawPayload?: Record<string, unknown>;
}

export interface UpdatePortfolioData {
  name?: string;
  description?: string;
}

export interface IPortfolioRepository {
  findOrCreatePortfolio(userId: string): Promise<{ id: string }>;
  createUnit(data: CreatePortfolioUnitData): Promise<PortfolioUnitEntity>;
  findUnitsByUserId(userId: string): Promise<PortfolioUnitEntity[]>;
  findUnitById(unitId: string): Promise<PortfolioUnitEntity | null>;
  updateUnit(unitId: string, data: UpdatePortfolioUnitData): Promise<PortfolioUnitEntity>;
  getPortfolioOwnerUserId(unitId: string): Promise<string | null>;
  findPortfoliosByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ portfolios: PortfolioWithStats[]; total: number }>;
  getGlobalStats(userId: string): Promise<{ totalUnits: number; activeLeases: number }>;
  createPortfolio(data: CreatePortfolioData): Promise<LandlordPortfolioEntity>;
  findPortfolioById(portfolioId: string): Promise<LandlordPortfolioEntity | null>;
  createEnrichedUnit(data: CreateEnrichedUnitData): Promise<EnrichedPortfolioUnitEntity>;
  findPropertyTypeByCode(code: string): Promise<{ id: string; code: string } | null>;
  findAllPropertyTypes(): Promise<{ id: string; code: string; description: string }[]>;

  // Geographic catalog
  findAllDepartments(): Promise<{ id: string; code: string; name: string }[]>;
  findCitiesByDepartmentCode(departmentCode: string): Promise<{ id: string; code: string; departmentCode: string; name: string }[]>;
  findDepartmentByCode(code: string): Promise<{ id: string; code: string; name: string } | null>;
  findCityByCode(code: string): Promise<{ id: string; code: string; departmentCode: string; name: string } | null>;

  // Portfolio CRUD
  updatePortfolio(portfolioId: string, data: UpdatePortfolioData): Promise<LandlordPortfolioEntity>;
  deletePortfolio(portfolioId: string): Promise<void>;
  deleteUnit(unitId: string): Promise<void>;
  countUnitsByPortfolioId(portfolioId: string): Promise<number>;
  hasActiveLeases(unitId: string): Promise<boolean>;
}
