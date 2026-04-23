// Feature: backend-database-implementation, Property 22: Caché Redis sirve listado con TTL 5 minutos
// Validates: Requirements 3.9

import * as fc from 'fast-check';
import { SearchListingsUseCase } from './search-listings.use-case';
import type { IListingRepository, ListingFilters } from '@modules/property-listings/domain/ports/listing-repository.port';
import type { IListingCache } from '@modules/property-listings/domain/ports/listing-cache.port';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import { PhotoEntity } from '@modules/property-listings/domain/entities/photo.entity';
import { ListingFiltersDto } from '@modules/property-listings/application/dtos/listing-filters.dto';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPECTED_TTL_SECONDS = 300; // 5 minutes

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryPhoto = fc.record({
  id: fc.uuid(),
  listingId: fc.uuid(),
  fileUrl: fc.stringMatching(/^[a-z0-9]{8}$/).map(
    (hex) => `https://storage.example.com/${hex}`,
  ),
  isMain: fc.boolean(),
}).map(
  (f) => new PhotoEntity(f.id, f.listingId, f.fileUrl, f.isMain),
);

const arbitraryPhotos = fc.array(arbitraryPhoto, { minLength: 1, maxLength: 4 });

/**
 * Generates a PUBLISHED listing with at least one photo (eligible for caching).
 */
const arbitraryEligibleListing = fc.record({
  id: fc.uuid(),
  portfolioUnitId: fc.uuid(),
  title: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
  description: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
  listingDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
  price: fc.integer({ min: 500000, max: 5000000 }),
  currency: fc.constantFrom('COP', 'USD'),
  photos: arbitraryPhotos,
}).map(
  (f) =>
    new ListingEntity(
      f.id, f.portfolioUnitId, f.title, f.description,
      f.listingDate, f.price, f.currency, true, f.photos,
    ),
);

const arbitraryFilters = fc.record({
  city: fc.option(fc.stringMatching(/^[A-Za-z]{3,15}$/), { nil: undefined }),
  neighborhood: fc.option(fc.stringMatching(/^[A-Za-z ]{3,20}$/), { nil: undefined }),
  search: fc.option(fc.stringMatching(/^[A-Za-z0-9 ]{3,15}$/), { nil: undefined }),
}).map((f) => {
  const dto = new ListingFiltersDto();
  if (f.city !== undefined) dto.city = f.city;
  if (f.neighborhood !== undefined) dto.neighborhood = f.neighborhood;
  if (f.search !== undefined) dto.search = f.search;
  return dto;
});

// ─── Spy-based cache stub ─────────────────────────────────────────────────────

interface CacheSetCall {
  key: string;
  listings: ListingEntity[];
  ttlSeconds: number;
}

interface CacheGetCall {
  key: string;
}

function makeSpyCache() {
  const setCalls: CacheSetCall[] = [];
  const getCalls: CacheGetCall[] = [];

  const cache: IListingCache = {
    async getListings(key: string) {
      getCalls.push({ key });
      return null; // always miss
    },
    async setListings(key: string, listings: ListingEntity[], ttlSeconds: number) {
      setCalls.push({ key, listings, ttlSeconds });
    },
    async invalidate() { return; },
    async invalidateByPattern() { return; },
  };

  return { cache, setCalls, getCalls };
}

function makeHitSpyCache(stored: Map<string, ListingEntity[]>) {
  const getCalls: CacheGetCall[] = [];
  const setCalls: CacheSetCall[] = [];

  const cache: IListingCache = {
    async getListings(key: string) {
      getCalls.push({ key });
      return stored.get(key) ?? null;
    },
    async setListings(key: string, listings: ListingEntity[], ttlSeconds: number) {
      setCalls.push({ key, listings, ttlSeconds });
    },
    async invalidate() { return; },
    async invalidateByPattern() { return; },
  };

  return { cache, getCalls, setCalls };
}

// ─── Repository stub ──────────────────────────────────────────────────────────

function makeRepositoryStub(listings: ListingEntity[]): IListingRepository {
  return {
    async findPublished(_filters: ListingFilters) {
      const data = listings.filter((l) => l.isActive);
      return { data, total: data.length };
    },
    async create() { throw new Error('not implemented'); },
    async findById() { return null; },
    async findDetailById() { return null; },
    async findActiveByPortfolioUnitId() { return null; },
    async update() { return null as unknown as ListingEntity; },
    async unpublish() { return; },
    async getOwnerUserId() { return null; },
    async getOwnerUserIdByUnit() { return null; },
    async registerContactEvent() { return; },
  };
}

function makeSpyRepository(listings: ListingEntity[]) {
  let callCount = 0;
  const repo: IListingRepository = {
    async findPublished(_filters: ListingFilters) {
      callCount++;
      const data = listings.filter((l) => l.isActive);
      return { data, total: data.length };
    },
    async create() { throw new Error('not implemented'); },
    async findById() { return null; },
    async findDetailById() { return null; },
    async findActiveByPortfolioUnitId() { return null; },
    async update() { return null as unknown as ListingEntity; },
    async unpublish() { return; },
    async getOwnerUserId() { return null; },
    async getOwnerUserIdByUnit() { return null; },
    async registerContactEvent() { return; },
  };
  return { repo, getCallCount: () => callCount };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchListingsUseCase — Property 22: Caché Redis sirve listado con TTL 5 minutos', () => {
  /**
   * Property 22a — Validates: Requirements 3.9
   *
   * On a cache miss, the use case stores the result in cache with TTL = 300s (5 min).
   * For any set of eligible listings and any filter combination, the TTL passed
   * to setListings must always be exactly 300 seconds.
   */
  it('Property 22a — cache miss triggers setListings with TTL = 300 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryEligibleListing, { minLength: 1, maxLength: 10 }),
        arbitraryFilters,
        async (listings, filters) => {
          const { cache, setCalls } = makeSpyCache();
          const repository = makeRepositoryStub(listings);
          const useCase = new SearchListingsUseCase(repository, cache);

          await useCase.execute(filters);

          // setListings must have been called exactly once
          if (setCalls.length !== 1) return false;
          // TTL must be exactly 300 seconds (5 minutes)
          return setCalls[0].ttlSeconds === EXPECTED_TTL_SECONDS;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 22b — Validates: Requirements 3.9
   *
   * The cache key is deterministic: same filters always produce the same key.
   * Different filters produce different keys.
   */
  it('Property 22b — same filters produce the same cache key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryEligibleListing, { minLength: 1, maxLength: 5 }),
        arbitraryFilters,
        async (listings, filters) => {
          const spy1 = makeSpyCache();
          const spy2 = makeSpyCache();
          const repo1 = makeRepositoryStub(listings);
          const repo2 = makeRepositoryStub(listings);

          const uc1 = new SearchListingsUseCase(repo1, spy1.cache);
          const uc2 = new SearchListingsUseCase(repo2, spy2.cache);

          await uc1.execute(filters);
          await uc2.execute(filters);

          if (spy1.setCalls.length !== 1 || spy2.setCalls.length !== 1) return false;
          return spy1.setCalls[0].key === spy2.setCalls[0].key;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 22c — Validates: Requirements 3.9
   *
   * On a cache hit, the repository is NOT called — the use case returns
   * the cached listings directly without querying the database.
   */
  it('Property 22c — cache hit skips repository call', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryEligibleListing, { minLength: 1, maxLength: 10 }),
        arbitraryFilters,
        async (listings, filters) => {
          // First: populate the cache key by doing a cache-miss call
          const { cache: missCache, setCalls } = makeSpyCache();
          const repo1 = makeRepositoryStub(listings);
          const uc1 = new SearchListingsUseCase(repo1, missCache);
          await uc1.execute(filters);

          if (setCalls.length !== 1) return false;
          const cacheKey = setCalls[0].key;
          const cachedListings = setCalls[0].listings;

          // Second: simulate cache hit with the stored data
          const stored = new Map<string, ListingEntity[]>();
          stored.set(cacheKey, cachedListings);
          const { cache: hitCache, setCalls: hitSetCalls } = makeHitSpyCache(stored);
          const { repo: spyRepo, getCallCount } = makeSpyRepository(listings);
          const uc2 = new SearchListingsUseCase(spyRepo, hitCache);

          await uc2.execute(filters);

          // Repository must NOT have been called
          if (getCallCount() !== 0) return false;
          // setListings must NOT have been called (no need to re-cache)
          return hitSetCalls.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 22d — Validates: Requirements 3.9
   *
   * The listings stored in cache on a miss are exactly the eligible listings
   * (PUBLISHED + has photos). The cached data preserves all fields including
   * nested photos.
   */
  it('Property 22d — cached listings match the eligible result set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryEligibleListing, { minLength: 0, maxLength: 10 }),
        async (listings) => {
          const { cache, setCalls } = makeSpyCache();
          const repository = makeRepositoryStub(listings);
          const useCase = new SearchListingsUseCase(repository, cache);

          const result = await useCase.execute(new ListingFiltersDto());

          if (setCalls.length !== 1) return false;
          const cachedListings = setCalls[0].listings;

          // Cached count must match result count
          if (cachedListings.length !== result.data.length) return false;

          // Each cached listing must match the corresponding result by id
          for (let i = 0; i < cachedListings.length; i++) {
            if (cachedListings[i].id !== result.data[i].id) return false;
            if (cachedListings[i].photos.length !== result.data[i].photos.length) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 22e — Validates: Requirements 3.9
   *
   * Cache hit returns the same DTOs as a cache miss for the same input.
   * This verifies the serialization/deserialization round-trip through the cache
   * preserves the data correctly.
   */
  it('Property 22e — cache hit returns same data as cache miss (round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryEligibleListing, { minLength: 1, maxLength: 10 }),
        arbitraryFilters,
        async (listings, filters) => {
          // Cache miss path: get result + capture what was cached
          const { cache: missCache, setCalls } = makeSpyCache();
          const repo1 = makeRepositoryStub(listings);
          const uc1 = new SearchListingsUseCase(repo1, missCache);
          const missResult = await uc1.execute(filters);

          if (setCalls.length !== 1) return false;
          const cacheKey = setCalls[0].key;
          const cachedListings = setCalls[0].listings;

          // Cache hit path: return the cached listings
          const stored = new Map<string, ListingEntity[]>();
          stored.set(cacheKey, cachedListings);
          const { cache: hitCache } = makeHitSpyCache(stored);
          const repo2 = makeRepositoryStub([]);
          const uc2 = new SearchListingsUseCase(repo2, hitCache);
          const hitResult = await uc2.execute(filters);

          // Both results must have the same length
          if (missResult.data.length !== hitResult.data.length) return false;

          // Each DTO must match by id, title, price, and photo count
          for (let i = 0; i < missResult.data.length; i++) {
            if (missResult.data[i].id !== hitResult.data[i].id) return false;
            if (missResult.data[i].title !== hitResult.data[i].title) return false;
            if (missResult.data[i].price !== hitResult.data[i].price) return false;
            if (missResult.data[i].photos.length !== hitResult.data[i].photos.length) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 22f — Validates: Requirements 3.9
   *
   * The cache key includes the filter parameters, so different filters
   * produce different cache entries. This ensures filtered and unfiltered
   * results are not mixed.
   */
  it('Property 22f — different filters produce different cache keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryEligibleListing, { minLength: 1, maxLength: 5 }),
        async (listings) => {
          const filtersA = new ListingFiltersDto();
          filtersA.city = 'Cali';

          const filtersB = new ListingFiltersDto();
          filtersB.city = 'Bogota';

          const spyA = makeSpyCache();
          const spyB = makeSpyCache();
          const repoA = makeRepositoryStub(listings);
          const repoB = makeRepositoryStub(listings);

          const ucA = new SearchListingsUseCase(repoA, spyA.cache);
          const ucB = new SearchListingsUseCase(repoB, spyB.cache);

          await ucA.execute(filtersA);
          await ucB.execute(filtersB);

          if (spyA.setCalls.length !== 1 || spyB.setCalls.length !== 1) return false;
          return spyA.setCalls[0].key !== spyB.setCalls[0].key;
        },
      ),
      { numRuns: 100 },
    );
  });
});
