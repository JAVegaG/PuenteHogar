import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { AggregatedReportEntity } from '../../domain/entities/aggregated-report.entity';
import { IndividualReportEntity } from '../../domain/entities/individual-report.entity';
import type { IAccountingRepository, PeriodFilter } from '../../domain/ports/accounting-repository.port';

@Injectable()
export class PrismaAccountingRepository implements IAccountingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAggregatedReport(
    portfolioId: string,
    period: PeriodFilter,
  ): Promise<AggregatedReportEntity | null> {
    const periodStart = new Date(period.year, period.month - 1, 1);
    const periodEnd = new Date(period.year, period.month, 0, 23, 59, 59, 999);

    const record = await this.prisma.aggregatedPaymentReport.findFirst({
      where: {
        portfolio_id: portfolioId,
        period_start: { gte: periodStart },
        period_end: { lte: periodEnd },
      },
      orderBy: { created_at: 'desc' },
    });

    if (record) {
      return new AggregatedReportEntity(
        record.id,
        record.portfolio_id,
        record.as_of_date,
        record.window_months,
        record.period_start,
        record.period_end,
        record.currency,
        record.number_of_units,
        record.total_amount.toNumber(),
        record.avg_amount.toNumber(),
        record.payment_count,
        record.min_amount.toNumber(),
        record.max_amount.toNumber(),
        record.expected_amount.toNumber(),
        record.overdue_count,
      );
    }

    // Compute on-the-fly from PAID payments in the payments schema
    return this.computeAggregatedReport(portfolioId, period, periodStart, periodEnd);
  }

  async getIndividualReport(
    portfolioUnitId: string,
    period: PeriodFilter,
  ): Promise<IndividualReportEntity | null> {
    const periodStart = new Date(period.year, period.month - 1, 1);
    const periodEnd = new Date(period.year, period.month, 0, 23, 59, 59, 999);

    const record = await this.prisma.individualPaymentReport.findFirst({
      where: {
        portfolio_unit_id: portfolioUnitId,
        period_start: { gte: periodStart },
        period_end: { lte: periodEnd },
      },
      orderBy: { created_at: 'desc' },
    });

    if (record) {
      return new IndividualReportEntity(
        record.id,
        record.portfolio_unit_id,
        record.as_of_date,
        record.window_months,
        record.period_start,
        record.period_end,
        record.currency,
        record.total_amount.toNumber(),
        record.min_amount.toNumber(),
        record.max_amount.toNumber(),
        record.payment_count,
        record.expected_amount.toNumber(),
        record.overdue_count,
      );
    }

    // Compute on-the-fly from PAID payments
    return this.computeIndividualReport(portfolioUnitId, period, periodStart, periodEnd);
  }

  async getPortfolioIdForUser(userId: string): Promise<string | null> {
    const portfolio = await this.prisma.landlordPortfolio.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });
    return portfolio?.id ?? null;
  }

  // ─── On-the-fly computation from payments schema ───────────────────────────

  private async computeAggregatedReport(
    portfolioId: string,
    period: PeriodFilter,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<AggregatedReportEntity | null> {
    // Resolve portfolio units
    const units = await this.prisma.portfolioUnit.findMany({
      where: { portfolio_id: portfolioId },
      select: { id: true },
    });

    if (units.length === 0) return null;

    const unitIds = units.map((u: { id: string }) => u.id);

    // Find leases for these units
    const leases = await this.prisma.lease.findMany({
      where: { portfolio_unit_id: { in: unitIds } },
      select: { id: true },
    });

    if (leases.length === 0) return null;

    const leaseIds = leases.map((l: { id: string }) => l.id);

    // Find scheduled payments in period
    const scheduledPayments = await this.prisma.scheduledPayment.findMany({
      where: {
        lease_id: { in: leaseIds },
        due_date: { gte: periodStart, lte: periodEnd },
      },
      include: {
        payments: {
          include: { logs: { orderBy: { creation_date: 'desc' }, take: 1 } },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    const paidPayments = scheduledPayments.filter((sp: typeof scheduledPayments[number]) => {
      const latestLog = sp.payments[0]?.logs[0];
      return latestLog?.status === 'PAID';
    });

    if (paidPayments.length === 0) return null;

    const amounts = paidPayments.map((sp: typeof paidPayments[number]) =>
      sp.payments[0].amount.toNumber(),
    );
    const total = amounts.reduce((a: number, b: number) => a + b, 0);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const avg = total / amounts.length;

    return new AggregatedReportEntity(
      'computed',
      portfolioId,
      new Date(),
      1,
      periodStart,
      periodEnd,
      'COP',
      unitIds.length,
      total,
      avg,
      paidPayments.length,
      min,
      max,
      total,
      scheduledPayments.length - paidPayments.length,
    );
  }

  private async computeIndividualReport(
    portfolioUnitId: string,
    period: PeriodFilter,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<IndividualReportEntity | null> {
    const leases = await this.prisma.lease.findMany({
      where: { portfolio_unit_id: portfolioUnitId },
      select: { id: true },
    });

    if (leases.length === 0) return null;

    const leaseIds = leases.map((l: { id: string }) => l.id);

    const scheduledPayments = await this.prisma.scheduledPayment.findMany({
      where: {
        lease_id: { in: leaseIds },
        due_date: { gte: periodStart, lte: periodEnd },
      },
      include: {
        payments: {
          include: { logs: { orderBy: { creation_date: 'desc' }, take: 1 } },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    const paidPayments = scheduledPayments.filter((sp: typeof scheduledPayments[number]) => {
      const latestLog = sp.payments[0]?.logs[0];
      return latestLog?.status === 'PAID';
    });

    if (paidPayments.length === 0) return null;

    const amounts = paidPayments.map((sp: typeof paidPayments[number]) =>
      sp.payments[0].amount.toNumber(),
    );
    const total = amounts.reduce((a: number, b: number) => a + b, 0);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);

    return new IndividualReportEntity(
      'computed',
      portfolioUnitId,
      new Date(),
      1,
      periodStart,
      periodEnd,
      'COP',
      total,
      min,
      max,
      paidPayments.length,
      total,
      scheduledPayments.length - paidPayments.length,
    );
  }
}
