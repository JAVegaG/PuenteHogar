// Feature: backend-database-implementation, Property 39: Reportes históricos servidos desde caché Redis con TTL 1 hora
// Validates: Requirements 7.4

import * as fc from 'fast-check';
import { GetAggregatedReportUseCase } from './get-aggregated-report.use-case';
import type { IAccountingRepository, PeriodFilter } from '@modules/accounting/domain/ports/accounting-repository.port';
import type { IReportCache } from '@modules/accounting/domain/ports/report-cache.port';
import { AggregatedReportEntity } from '@modules/accounting/domain/entities/aggregated-report.entity';
import { AggregatedReportResponseDto } from '../dtos/aggregated-report-response.dto';

// ─── Constants (must match use case) ─────────────────────────────────────────

const CACHE_TTL_SECONDS = 3600; // 1 hour

// ─── Arbitrary generators ────────────────────────────────────────────────────

/**
 * Generates a historical period — one whose last day is more than 24h in the past.
 * We pick months that ended at least 2 months ago to be safely historical.
 */
function arbitraryHistoricalPeriod(): fc.Arbitrary<PeriodFilter> {
  const now = new Date();
  // Go back at least 2 months to guarantee the period end is > 24h ago
  const safeMonth = now.getMonth() - 1; // 0-indexed, so -1 means 2 months back from current
  const safeYear = safeMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
  const adjustedMonth = safeMonth < 0 ? safeMonth + 12 : safeMonth;

  return fc.record({
    year: fc.integer({ min: 2020, max: safeYear }),
    month: fc.integer({ min: 1, max: 12 }),
  }).filter((p) => {
    // Ensure the period end is more than 24h in the past
    const periodEnd = new Date(p.year, p.month, 0);
    return Date.now() - periodEnd.getTime() > 24 * 60 * 60 * 1000;
  });
}

/**
 * Generates a current/recent period — one whose last day is within 24h or in the future.
 */
function arbitraryRecentPeriod(): fc.Arbitrary<PeriodFilter> {
  const now = new Date();
  return fc.constant({
    year: now.getFullYear(),
    month: now.getMonth() + 1, // current month (1-indexed)
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

describe('Property 39: Reportes históricos servidos desde caché Redis con TTL 1 hora', () => {

  /**
   * Property 39a: For any historical period with a cache hit,
   * the use case returns the cached value without querying the repository.
   *
   * Validates: Req 7.4 — historical reports served from cache
   */
  it('Property 39a — historical period with cache hit returns cached data without DB query', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryHistoricalPeriod(),
        fc.uuid(),
        async (period, userId) => {
          const portfolioId = 'portfolio-001';
          const cachedDto = new AggregatedReportResponseDto();
          cachedDto.portfolioId = portfolioId;
          cachedDto.periodStart = new Date(period.year, period.month - 1, 1);
          cachedDto.periodEnd = new Date(period.year, period.month, 0);
          cachedDto.currency = 'COP';
          cachedDto.numberOfUnits = 5;
          cachedDto.totalAmount = 10_000_000;
          cachedDto.avgAmount = 2_000_000;
          cachedDto.paymentCount = 5;
          cachedDto.minAmount = 1_500_000;
          cachedDto.maxAmount = 2_500_000;
          cachedDto.expectedAmount = 10_000_000;
          cachedDto.overdueCount = 0;

          const cache = makeMockCache();
          cache.get.mockResolvedValue(cachedDto);

          const repo = makeMockRepo();
          const useCase = buildUseCase(repo, cache);

          const result = await useCase.execute(userId, ['LANDLORD'], period);

          // Must return the cached DTO
          expect(result).toBe(cachedDto);
          // Must have checked cache
          const expectedKey = `accounting:aggregated:${portfolioId}:${period.year}-${period.month}`;
          expect(cache.get).toHaveBeenCalledWith(expectedKey);
          // Must NOT query the repository
          expect(repo.getAggregatedReport).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 39b: For any historical period with a cache miss,
   * the use case queries the repository, stores the result in cache
   * with TTL = 3600s (1 hour), and returns the report.
   *
   * Validates: Req 7.4 — cache populated with TTL 1 hour on miss
   */
  it('Property 39b — historical period with cache miss queries DB and populates cache with TTL 1h', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryHistoricalPeriod(),
        fc.uuid(),
        async (period, userId) => {
          const portfolioId = 'portfolio-001';
          const reportArb = arbitraryAggregatedReport(portfolioId, period);
          const report = fc.sample(reportArb, 1)[0];

          const repo = makeMockRepo({
            getAggregatedReport: jest.fn().mockResolvedValue(report),
          });
          const cache = makeMockCache();
          // cache miss
          cache.get.mockResolvedValue(null);

          const useCase = buildUseCase(repo, cache);
          const result = await useCase.execute(userId, ['LANDLORD'], period);

          // Must have queried the repository
          expect(repo.getAggregatedReport).toHaveBeenCalledWith(portfolioId, period);

          // Must have stored in cache with TTL = 3600
          const expectedKey = `accounting:aggregated:${portfolioId}:${period.year}-${period.month}`;
          expect(cache.set).toHaveBeenCalledTimes(1);
          expect(cache.set).toHaveBeenCalledWith(expectedKey, expect.any(Object), CACHE_TTL_SECONDS);

          // The TTL argument must be exactly 3600 (1 hour)
          const actualTtl = cache.set.mock.calls[0][2];
          expect(actualTtl).toBe(3600);

          // Result must reflect the report data
          expect(result.totalAmount).toBe(report.totalAmount);
          expect(result.paymentCount).toBe(report.paymentCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 39c: For any recent/current period (within 24h),
   * the use case does NOT check or populate the cache — it always
   * queries the repository directly.
   *
   * Validates: Req 7.4 — only historical reports (> 24h) use cache
   */
  it('Property 39c — recent period bypasses cache entirely', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryRecentPeriod(),
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

          await useCase.execute(userId, ['LANDLORD'], period);

          // Cache must NOT be consulted for recent periods
          expect(cache.get).not.toHaveBeenCalled();
          expect(cache.set).not.toHaveBeenCalled();
          // Repository must be queried directly
          expect(repo.getAggregatedReport).toHaveBeenCalledWith(portfolioId, period);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 39d: For any historical period, the cache key includes
   * the portfolioId, year, and month — ensuring per-portfolio, per-period isolation.
   *
   * Validates: Req 7.4 — cache keyed by portfolio and period
   */
  it('Property 39d — cache key includes portfolioId, year, and month', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryHistoricalPeriod(),
        fc.uuid(),
        async (period, userId) => {
          const portfolioId = 'portfolio-001';

          const cache = makeMockCache();
          cache.get.mockResolvedValue(null);

          const repo = makeMockRepo({
            getAggregatedReport: jest.fn().mockResolvedValue(null),
          });
          const useCase = buildUseCase(repo, cache);

          await useCase.execute(userId, ['LANDLORD'], period);

          const expectedKey = `accounting:aggregated:${portfolioId}:${period.year}-${period.month}`;
          expect(cache.get).toHaveBeenCalledWith(expectedKey);
        },
      ),
      { numRuns: 100 },
    );
  });
});
