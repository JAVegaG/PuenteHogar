import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { IAccountingRepository, PeriodFilter } from '@modules/accounting/domain/ports/accounting-repository.port';
import type { IReportCache } from '@modules/accounting/domain/ports/report-cache.port';
import { IndividualReportResponseDto } from '../dtos/individual-report-response.dto';
import { ACCOUNTING_REPOSITORY, REPORT_CACHE } from './get-aggregated-report.use-case';

const CACHE_TTL_SECONDS = 3600;
const HISTORICAL_THRESHOLD_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GetIndividualReportUseCase {
  constructor(
    @Inject(ACCOUNTING_REPOSITORY)
    private readonly repository: IAccountingRepository,
    @Inject(REPORT_CACHE)
    private readonly cache: IReportCache,
  ) {}

  async execute(
    portfolioUnitId: string,
    roles: string[],
    period: PeriodFilter,
  ): Promise<IndividualReportResponseDto> {
    if (roles.includes('TENANT')) {
      throw new ForbiddenException('Tenants cannot access accounting reports');
    }

    const periodEnd = new Date(period.year, period.month, 0);
    const isHistorical = Date.now() - periodEnd.getTime() > HISTORICAL_THRESHOLD_MS;

    if (isHistorical) {
      const cacheKey = `accounting:individual:${portfolioUnitId}:${period.year}-${period.month}`;
      const cached = await this.cache.get<IndividualReportResponseDto>(cacheKey);
      if (cached) return cached;

      const report = await this.repository.getIndividualReport(portfolioUnitId, period);
      const dto = this.toDto(portfolioUnitId, period, report);
      await this.cache.set(cacheKey, dto, CACHE_TTL_SECONDS);
      return dto;
    }

    const report = await this.repository.getIndividualReport(portfolioUnitId, period);
    return this.toDto(portfolioUnitId, period, report);
  }

  private toDto(
    portfolioUnitId: string,
    period: PeriodFilter,
    report: import('@modules/accounting/domain/entities/individual-report.entity').IndividualReportEntity | null,
  ): IndividualReportResponseDto {
    const dto = new IndividualReportResponseDto();
    dto.portfolioUnitId = portfolioUnitId;
    dto.periodStart = new Date(period.year, period.month - 1, 1);
    dto.periodEnd = new Date(period.year, period.month, 0);
    dto.currency = report?.currency ?? 'COP';
    dto.totalAmount = report?.totalAmount ?? 0;
    dto.minAmount = report?.minAmount ?? 0;
    dto.maxAmount = report?.maxAmount ?? 0;
    dto.paymentCount = report?.paymentCount ?? 0;
    dto.expectedAmount = report?.expectedAmount ?? 0;
    dto.overdueCount = report?.overdueCount ?? 0;
    if (!report || report.paymentCount === 0) {
      dto.message = 'No hay ingresos en este periodo';
    }
    return dto;
  }
}
