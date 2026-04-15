import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { IAccountingRepository, PeriodFilter } from '@modules/accounting/domain/ports/accounting-repository.port';
import type { IReportCache } from '@modules/accounting/domain/ports/report-cache.port';
import { AggregatedReportResponseDto } from '../dtos/aggregated-report-response.dto';

export const ACCOUNTING_REPOSITORY = 'ACCOUNTING_REPOSITORY';
export const REPORT_CACHE = 'REPORT_CACHE';

const CACHE_TTL_SECONDS = 3600; // 1 hour
const HISTORICAL_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class GetAggregatedReportUseCase {
  constructor(
    @Inject(ACCOUNTING_REPOSITORY)
    private readonly repository: IAccountingRepository,
    @Inject(REPORT_CACHE)
    private readonly cache: IReportCache,
  ) {}

  async execute(
    userId: string,
    roles: string[],
    period: PeriodFilter,
  ): Promise<AggregatedReportResponseDto> {
    if (roles.includes('TENANT')) {
      throw new ForbiddenException('Tenants cannot access accounting reports');
    }

    const portfolioId = await this.repository.getPortfolioIdForUser(userId);
    if (!portfolioId) {
      const dto = new AggregatedReportResponseDto();
      dto.portfolioId = '';
      dto.periodStart = new Date(period.year, period.month - 1, 1);
      dto.periodEnd = new Date(period.year, period.month, 0);
      dto.currency = 'COP';
      dto.numberOfUnits = 0;
      dto.totalAmount = 0;
      dto.avgAmount = 0;
      dto.paymentCount = 0;
      dto.minAmount = 0;
      dto.maxAmount = 0;
      dto.expectedAmount = 0;
      dto.overdueCount = 0;
      dto.message = 'No hay ingresos en este periodo';
      return dto;
    }

    const periodEnd = new Date(period.year, period.month, 0);
    const isHistorical = Date.now() - periodEnd.getTime() > HISTORICAL_THRESHOLD_MS;

    if (isHistorical) {
      const cacheKey = `accounting:aggregated:${portfolioId}:${period.year}-${period.month}`;
      const cached = await this.cache.get<AggregatedReportResponseDto>(cacheKey);
      if (cached) return cached;

      const report = await this.repository.getAggregatedReport(portfolioId, period);
      const dto = this.toDto(portfolioId, period, report);
      await this.cache.set(cacheKey, dto, CACHE_TTL_SECONDS);
      return dto;
    }

    const report = await this.repository.getAggregatedReport(portfolioId, period);
    return this.toDto(portfolioId, period, report);
  }

  private toDto(
    portfolioId: string,
    period: PeriodFilter,
    report: import('@modules/accounting/domain/entities/aggregated-report.entity').AggregatedReportEntity | null,
  ): AggregatedReportResponseDto {
    const dto = new AggregatedReportResponseDto();
    dto.portfolioId = portfolioId;
    dto.periodStart = new Date(period.year, period.month - 1, 1);
    dto.periodEnd = new Date(period.year, period.month, 0);
    dto.currency = report?.currency ?? 'COP';
    dto.numberOfUnits = report?.numberOfUnits ?? 0;
    dto.totalAmount = report?.totalAmount ?? 0;
    dto.avgAmount = report?.avgAmount ?? 0;
    dto.paymentCount = report?.paymentCount ?? 0;
    dto.minAmount = report?.minAmount ?? 0;
    dto.maxAmount = report?.maxAmount ?? 0;
    dto.expectedAmount = report?.expectedAmount ?? 0;
    dto.overdueCount = report?.overdueCount ?? 0;
    if (!report || report.paymentCount === 0) {
      dto.message = 'No hay ingresos en este periodo';
    }
    return dto;
  }
}
