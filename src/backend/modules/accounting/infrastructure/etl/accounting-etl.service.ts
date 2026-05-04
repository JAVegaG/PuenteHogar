import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { parsePayload } from '@src/shared/etl/parse-payload';

interface AggregatedReportPayload {
  portfolioId: string;
  asOfDate: string;
  windowMonths: number;
  periodStart: string;
  periodEnd: string;
  currency?: string;
  numberOfUnits: number;
  totalAmount: number;
  avgAmount: number;
  paymentCount: number;
  minAmount: number;
  maxAmount: number;
  lastPaymentAt?: string;
  firstPaymentAt?: string;
  expectedAmount: number;
  overdueCount: number;
}

interface IndividualReportPayload {
  portfolioUnitId: string;
  asOfDate: string;
  windowMonths: number;
  periodStart: string;
  periodEnd: string;
  currency?: string;
  totalAmount: number;
  minAmount: number;
  maxAmount: number;
  paymentCount: number;
  lastPaymentAt?: string;
  firstPaymentAt?: string;
  expectedAmount: number;
  overdueCount: number;
}

interface AccountingRawPayload {
  type: 'aggregated' | 'individual';
  aggregated?: AggregatedReportPayload;
  individual?: IndividualReportPayload;
}

@Injectable()
export class AccountingEtlService {
  private readonly logger = new Logger(AccountingEtlService.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async processAccountingRaw(): Promise<void> {
    const records = await this.prisma.accountingRaw.findMany({
      where: { processed: false },
      take: 100,
    });

    if (records.length === 0) return;

    this.logger.log(`ETL accounting: processing ${records.length} raw records`);

    for (const record of records) {
      try {
        const payload = parsePayload<AccountingRawPayload>(record.payload);
        this.validatePayload(payload);

        await this.prisma.$transaction(async (tx) => {
          if (payload.type === 'aggregated' && payload.aggregated) {
            const r = payload.aggregated;
            await tx.aggregatedPaymentReport.create({
              data: {
                portfolio_id: r.portfolioId,
                as_of_date: new Date(r.asOfDate),
                window_months: r.windowMonths,
                period_start: new Date(r.periodStart),
                period_end: new Date(r.periodEnd),
                currency: r.currency ?? 'COP',
                number_of_units: r.numberOfUnits,
                total_amount: r.totalAmount,
                avg_amount: r.avgAmount,
                payment_count: r.paymentCount,
                min_amount: r.minAmount,
                max_amount: r.maxAmount,
                last_payment_at: r.lastPaymentAt ? new Date(r.lastPaymentAt) : undefined,
                first_payment_at: r.firstPaymentAt ? new Date(r.firstPaymentAt) : undefined,
                expected_amount: r.expectedAmount,
                overdue_count: r.overdueCount,
              },
            });
          } else if (payload.type === 'individual' && payload.individual) {
            const r = payload.individual;
            await tx.individualPaymentReport.create({
              data: {
                portfolio_unit_id: r.portfolioUnitId,
                as_of_date: new Date(r.asOfDate),
                window_months: r.windowMonths,
                period_start: new Date(r.periodStart),
                period_end: new Date(r.periodEnd),
                currency: r.currency ?? 'COP',
                total_amount: r.totalAmount,
                min_amount: r.minAmount,
                max_amount: r.maxAmount,
                payment_count: r.paymentCount,
                last_payment_at: r.lastPaymentAt ? new Date(r.lastPaymentAt) : undefined,
                first_payment_at: r.firstPaymentAt ? new Date(r.firstPaymentAt) : undefined,
                expected_amount: r.expectedAmount,
                overdue_count: r.overdueCount,
              },
            });
          }

          await tx.accountingRaw.update({
            where: { id: record.id },
            data: { processed: true },
          });
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`ETL accounting: error on record ${record.id}: ${reason}`);
        await this.prisma.accountingRaw.update({
          where: { id: record.id },
          data: { processed: true },
        });
      }
    }

    this.logger.log(`ETL accounting: finished processing batch`);
  }

  private validatePayload(payload: AccountingRawPayload): void {
    if (!payload.type) throw new Error('Missing field: type');
    if (payload.type === 'aggregated' && !payload.aggregated) throw new Error('Missing field: aggregated');
    if (payload.type === 'individual' && !payload.individual) throw new Error('Missing field: individual');
  }
}
