import { AggregatedReportEntity } from '../entities/aggregated-report.entity';
import { IndividualReportEntity } from '../entities/individual-report.entity';

export interface PeriodFilter {
  year: number;
  month: number; // 1-12
}

export interface IAccountingRepository {
  getAggregatedReport(portfolioId: string, period: PeriodFilter): Promise<AggregatedReportEntity | null>;
  getIndividualReport(portfolioUnitId: string, period: PeriodFilter): Promise<IndividualReportEntity | null>;
  getPortfolioIdForUser(userId: string): Promise<string | null>;
}
