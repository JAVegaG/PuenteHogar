// Feature: backend-database-implementation, Property 18: Listado público retorna solo publicaciones PUBLISHED con al menos una foto
// Validates: Requirements 3.1, 3.4, 3.8

import * as fc from 'fast-check';
import { SearchListingsUseCase } from './search-listings.use-case';
import type { IListingRepository, ListingFilters } from '@modules/property-listings/domain/ports/listing-repository.port';
import type { IListingCache } from '@modules/property-listings/domain/ports/listing-cache.port';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import { PhotoEntity } from '@modules/property-listings/domain/entities/photo.entity';
import { ListingFiltersDto } from '@modules/property-listings/application/dtos/listing-filters.dto';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates an arbitrary PhotoEntity.
 */
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

/**
 * Generates a non-empty array of photos (1–4).
 */
const arbitraryPhotos = fc.array(arbitraryPhoto, { minLength: 1, maxLength: 4 });

/**
 * Generates an arbitrary ListingEntity.
 * isActive=true means PUBLISHED; isActive=false means UNPUBLISHED.
 */
function arbitraryListing(isActiveOverride?: boolean): fc.Arbitrary<ListingEntity> {
  return fc.record({
    id: fc.uuid(),
    portfolioUnitId: fc.uuid(),
    title: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
    description: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
    listingDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
    price: fc.integer({ min: 500000, max: 5000000 }),
    currency: fc.constantFrom('COP', 'USD'),
    isActive: isActiveOverride !== undefined ? fc.constant(isActiveOverride) : fc.boolean(),
    photos: fc.oneof(
      fc.constant<PhotoEntity[]>([]),   // no photos
      arbitraryPhotos,                  // with photos
    ),
  }).map(
    (f) =>
      new ListingEntity(
        f.id,
        f.portfolioUnitId,
        f.title,
        f.description,
        f.listingDate,
        f.price,
        f.currency,
        f.isActive,
        f.photos,
      ),
  );
}

// ─── Stubs ────────────────────────────────────────────────────────────────────

/**
 * Repository stub: returns a fixed set of listings from findPublished().
 * findPublished() simulates what the DB returns — only isActive=true rows.
 * The use case is responsible for the photo filter on top.
 */
function makeRepositoryStub(listings: ListingEntity[]): IListingRepository {
  return {
    async findPublished(_filters: ListingFilters): Promise<ListingEntity[]> {
      // DB already filters by isActive=true (PUBLISHED)
      return listings.filter((l) => l.isActive);
    },
    async create() { throw new Error('not implemented'); },
    async findById() { return null; },
    async findDetailById() { return null; },
    async unpublish() { return; },
    async getOwnerUserId() { return null; },
    async registerContactEvent() { return; },
  };
}

/**
 * Cache stub: always misses so the use case always hits the repository.
 * This lets us test the filtering logic directly.
 */
const cacheMissStub: IListingCache = {
  async getListings() { return null; },
  async setListings() { return; },
  async invalidate() { return; },
  async invalidateByPattern() { return; },
};

/**
 * Cache stub: always hits with the provided listings.
 * Used to verify that cached results are also returned as-is.
 */
function makeCacheHitStub(cached: ListingEntity[]): IListingCache {
  return {
    async getListings() { return cached; },
    async setListings() { return; },
    async invalidate() { return; },
    async invalidateByPattern() { return; },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchListingsUseCase — Property 18: Listado público retorna solo PUBLISHED con al menos una foto', () => {
  /**
   * Property 18a — Validates: Requirements 3.1, 3.4
   *
   * For any array of listings (mix of active/inactive, with/without photos),
   * SearchListingsUseCase must return ONLY listings where:
   *   - isActive === true  (PUBLISHED)
   *   - photos.length > 0  (at least one photo)
   */
  it('Property 18a — result contains only isActive=true listings with at least one photo (cache miss)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryListing(), { minLength: 0, maxLength: 20 }),
        async (listings: ListingEntity[]) => {
          const repository = makeRepositoryStub(listings);
          const useCase = new SearchListingsUseCase(repository, cacheMissStub);

          const result = await useCase.execute(new ListingFiltersDto());

          for (const dto of result) {
            // Must be PUBLISHED
            if (!dto.isActive) return false;
            // Must have at least one photo
            if (dto.photos.length === 0) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 18b — Validates: Requirements 3.4, 3.8
   *
   * No UNPUBLISHED listing (isActive=false) ever appears in the result,
   * regardless of whether it has photos.
   */
  it('Property 18b — no UNPUBLISHED listing appears in the result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryListing(), { minLength: 1, maxLength: 20 }),
        async (listings: ListingEntity[]) => {
          const repository = makeRepositoryStub(listings);
          const useCase = new SearchListingsUseCase(repository, cacheMissStub);

          const result = await useCase.execute(new ListingFiltersDto());
          const resultIds = new Set(result.map((r) => r.id));

          const unpublishedIds = listings
            .filter((l) => !l.isActive)
            .map((l) => l.id);

          return unpublishedIds.every((id) => !resultIds.has(id));
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 18c — Validates: Requirements 3.4, 3.8
   *
   * No listing without photos ever appears in the result,
   * regardless of its isActive status.
   */
  it('Property 18c — no listing without photos appears in the result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryListing(), { minLength: 1, maxLength: 20 }),
        async (listings: ListingEntity[]) => {
          const repository = makeRepositoryStub(listings);
          const useCase = new SearchListingsUseCase(repository, cacheMissStub);

          const result = await useCase.execute(new ListingFiltersDto());
          const resultIds = new Set(result.map((r) => r.id));

          const noPhotoIds = listings
            .filter((l) => l.photos.length === 0)
            .map((l) => l.id);

          return noPhotoIds.every((id) => !resultIds.has(id));
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 18d — Validates: Requirements 3.1, 3.8
   *
   * Every eligible listing (isActive=true AND photos.length > 0) IS included
   * in the result — no eligible listing is accidentally filtered out.
   */
  it('Property 18d — every eligible listing (PUBLISHED + has photo) is included in the result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryListing(), { minLength: 1, maxLength: 20 }),
        async (listings: ListingEntity[]) => {
          const repository = makeRepositoryStub(listings);
          const useCase = new SearchListingsUseCase(repository, cacheMissStub);

          const result = await useCase.execute(new ListingFiltersDto());
          const resultIds = new Set(result.map((r) => r.id));

          const eligibleIds = listings
            .filter((l) => l.isActive && l.photos.length > 0)
            .map((l) => l.id);

          return eligibleIds.every((id) => resultIds.has(id));
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 18e — Validates: Requirements 3.8
   *
   * When the repository returns an empty list (no published listings),
   * the use case returns an empty array — never throws.
   */
  it('Property 18e — empty repository returns empty array without throwing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant([] as ListingEntity[]),
        async (listings: ListingEntity[]) => {
          const repository = makeRepositoryStub(listings);
          const useCase = new SearchListingsUseCase(repository, cacheMissStub);

          const result = await useCase.execute(new ListingFiltersDto());
          return Array.isArray(result) && result.length === 0;
        },
      ),
      { numRuns: 10 },
    );
  });

  /**
   * Property 18f — Validates: Requirements 3.8 (cache path)
   *
   * When the cache returns a set of listings (cache hit), the use case
   * returns them mapped to DTOs — the same isActive and photo constraints
   * must hold (cache should only contain eligible listings).
   */
  it('Property 18f — cache hit: returned listings are mapped to DTOs correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Only generate eligible listings for the cache (PUBLISHED + has photos)
        fc.array(
          fc.record({
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
                f.id,
                f.portfolioUnitId,
                f.title,
                f.description,
                f.listingDate,
                f.price,
                'COP',
                true, // always PUBLISHED in cache
                f.photos,
              ),
          ),
          { minLength: 0, maxLength: 10 },
        ),
        async (cachedListings: ListingEntity[]) => {
          const cacheHit = makeCacheHitStub(cachedListings);
          // Repository stub that would return nothing — should not be called on cache hit
          const repository = makeRepositoryStub([]);
          const useCase = new SearchListingsUseCase(repository, cacheHit);

          const result = await useCase.execute(new ListingFiltersDto());

          // Result count must match cached listings count
          if (result.length !== cachedListings.length) return false;

          // Each result must have the correct id and isActive
          for (let i = 0; i < result.length; i++) {
            if (result[i].id !== cachedListings[i].id) return false;
            if (!result[i].isActive) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
