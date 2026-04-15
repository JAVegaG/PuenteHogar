import { PortfolioUnitEntity } from '../entities/portfolio-unit.entity';

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

export interface IPortfolioRepository {
  findOrCreatePortfolio(userId: string): Promise<{ id: string }>;
  createUnit(data: CreatePortfolioUnitData): Promise<PortfolioUnitEntity>;
  findUnitsByUserId(userId: string): Promise<PortfolioUnitEntity[]>;
  findUnitById(unitId: string): Promise<PortfolioUnitEntity | null>;
  updateUnit(unitId: string, data: UpdatePortfolioUnitData): Promise<PortfolioUnitEntity>;
  getPortfolioOwnerUserId(unitId: string): Promise<string | null>;
}
