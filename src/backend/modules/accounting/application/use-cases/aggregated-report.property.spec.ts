// Feature: backend-database-implementation, Property 38: Reporte contable agrega correctamente pagos PAID del periodo
// Validates: Requirements 7.1, 7.2

import * as fc from 'fast-check';
import { ForbiddenException } from '@nestjs/common';
import { GetAggregatedReportUseCase } from './get-aggregated-report.use-case';
import type { IAccountingRepository, PeriodFilter } from '@modules/accounting/domain/ports/accounting-repository.port';
import type { IReportCache } from '@modules/accounting/domain/ports/report-cache.port';
import { AggregatedReportEntity } from '@modules/accounting/domain/entities/aggregated-report.entity';

// ─── Arbitrary generators ────────────────────────────────────────────────────

function arbitraryPeriod(): fc.Arbitrary<PeriodFilter> {
  return fc.record({
    year: fc.integer({ min: 2020, max: 2100 }),
    month: fc.integer({ min: 1, max: 12 }),
  });
}

function arbitraryPositiveAmount(): fc.Arbitrary<number> {
  return fc.float({ min: Math.fround(0.01), max: Math.fround(50_000_000), noNaN: true, noDefaultInfinity: true });
}

function arbitraryAggregatedReport(portfolioId: string, period: PeriodFilter): fc.Arbitrary<AggregatedReportEntity> {
  return fc.record({
    numberOfUnits: fc.integer({ min: 1, max: 100 }),
    totalAmount: arbitraryPositiveAmount(),
    avgAmount: arbitraryPositiveAmount(),
    paymentCount: fc.integer({ min: 1, max: 500 }),
    minAmount: arbitraryPositiveAmount(),
    maxAmount: arbitraryPositiveAmount(),
    expectedAmount: arbitraryPositiveAmount(),
    overdueCount: fc.integer({ min: 0, max: 100 }),
    currency: fc.constantFrom('COP', 'USD'),
  }).map((r) => new AggregatedReportEntity(
    'report-id',
    portfolioId,
    new Date(),
    1,
    new Date(period.year, period.month - 1, 1),
    new Date(period.year, period.month, 0),
    r.currency,
    r.numberOfUnits,
    r.totalAmount,
    r.avgAmount,
    r.paymentCount,
    r.minAmount,
    r.maxAmount,
    r.expectedAmount,
    r.overdueCount,
  ));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockRepo(overrides?: Partial<jest.Mocked<IAccountingRepository>>): jest.Mocked<IAccountingRepository> {
  return {
    getAggregatedReport: jest.fn().mockResolvedValue(null),
    getIndividualReport: jest.fn().mockResolvedValue(null),
    getPortfolioIdForUser: jest.fn().mockResolvedValue('portfolio-001'),
    ...overrides,
  };
}

function makeMockCache(): jest.Mocked<IReportCache> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };
}

function buildUseCase(
  repo: jest.Mocked<IAccountingRepository>,
  cache: jest.Mocked<IReportCache>,
): GetAggregatedReportUseCase {
  return new GetAggregatedReportUseCase(repo, cache);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property 38: Reporte contable agrega correctamente pagos PAID del periodo', () => {

  /**
   * Property 38a: For any valid period and landlord with PAID payments,
   * the aggregated report totalAmount, paymentCount, avgAmount, minAmount,
   * maxAmount and currency match the data returned by the repository.
   *
   * Validates: Req 7.1 — aggregated income report for a specific month
   * Validates: Req 7.2 — calculated from PAID payments in curated table
   */
  it('Property 38a — aggregated report reflects repository data for PAID payments', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPeriod(),
        fc.uuid(),
        async (period, userId) => {
          const portfolioId = 'portfolio-001';
          const reportArb = arbitraryAggregatedReport(portfolioId, period);
          const report = fc.sample(reportArb, 1)[0];

          const repo = makeMockRepo({
            getAggregatedReport: jest.fn().mockResolvedValue(report),
          });
          const cache = makeMockCache();
          const useCase = buildUseCase(repo, cache);

          const result = await useCase.execute(userId, ['LANDLORD'], period);

          // The DTO must reflect the entity values
          expect(result.portfolioId).toBe(portfolioId);
          expect(result.totalAmount).toBe(report.totalAmount);
          expect(result.paymentCount).toBe(report.paymentCount);
          expect(result.avgAmount).toBe(report.avgAmount);
          expect(result.minAmount).toBe(report.minAmount);
          expect(result.maxAmount).toBe(report.maxAmount);
          expect(result.currency).toBe(report.currency);
          expect(result.numberOfUnits).toBe(report.numberOfUnits);
          expect(result.overdueCount).toBe(report.overdueCount);
          expect(result.expectedAmount).toBe(report.expectedAmount);
          // No zero-payment message when payments exist
          expect(result.message).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 38b: For any period where the repository returns null (no PAID
   * payments), the report has zero totals and an informative message.
   *
   * Validates: Req 7.1 — returns total zero with message when no payments
   * Validates: Req 7.2 — calculated from PAID payments (none exist)
   */
  it('Property 38b — no PAID payments returns zero totals with informative message', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPeriod(),
        fc.uuid(),
        async (period, userId) => {
          const repo = makeMockRepo({
            getAggregatedReport: jest.fn().mockResolvedValue(null),
          });
          const cache = makeMockCache();
          const useCase = buildUseCase(repo, cache);

          const result = await useCase.execute(userId, ['LANDLORD'], period);

          expect(result.totalAmount).toBe(0);
          expect(result.paymentCount).toBe(0);
          expect(result.avgAmount).toBe(0);
          expect(result.minAmount).toBe(0);
          expect(result.maxAmount).toBe(0);
          expect(result.numberOfUnits).toBe(0);
          expect(result.message).toBe('No hay ingresos en este periodo');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 38c: For any period and any user with TENANT role,
   * the use case rejects with ForbiddenException.
   *
   * Validates: Req 7.1 — only landlords can access accounting reports
   */
  it('Property 38c — TENANT role is rejected with ForbiddenException', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPeriod(),
        fc.uuid(),
        async (period, userId) => {
          const repo = makeMockRepo();
          const cache = makeMockCache();
          const useCase = buildUseCase(repo, cache);

          await expect(
            useCase.execute(userId, ['TENANT'], period),
          ).rejects.toThrow(ForbiddenException);

          // Repository should never be called for tenants
          expect(repo.getAggregatedReport).not.toHaveBeenCalled();
          expect(repo.getPortfolioIdForUser).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 38d: For any period, the report period boundaries are correctly
   * computed — periodStart is the first day of the month, periodEnd is the last.
   *
   * Validates: Req 7.1 — report for a specific month
   */
  it('Property 38d — period boundaries are first and last day of the requested month', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPeriod(),
        fc.uuid(),
        async (period, userId) => {
          const repo = makeMockRepo({
            getAggregatedReport: jest.fn().mockResolvedValue(null),
          });
          const cache = makeMockCache();
          const useCase = buildUseCase(repo, cache);

          const result = await useCase.execute(userId, ['LANDLORD'], period);

          const expectedStart = new Date(period.year, period.month - 1, 1);
          const expectedEnd = new Date(period.year, period.month, 0);

          expect(result.periodStart.getTime()).toBe(expectedStart.getTime());
          expect(result.periodEnd.getTime()).toBe(expectedEnd.getTime());
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 38e: For any landlord without a portfolio, the report returns
   * zero totals with an informative message.
   *
   * Validates: Req 7.1 — no portfolio means no income
   */
  it('Property 38e — landlord without portfolio returns zero totals', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPeriod(),
        fc.uuid(),
        async (period, userId) => {
          const repo = makeMockRepo({
            getPortfolioIdForUser: jest.fn().mockResolvedValue(null),
          });
          const cache = makeMockCache();
          const useCase = buildUseCase(repo, cache);

          const result = await useCase.execute(userId, ['LANDLORD'], period);

          expect(result.totalAmount).toBe(0);
          expect(result.paymentCount).toBe(0);
          expect(result.message).toBe('No hay ingresos en este periodo');
          // Should not attempt to fetch report without portfolio
          expect(repo.getAggregatedReport).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
