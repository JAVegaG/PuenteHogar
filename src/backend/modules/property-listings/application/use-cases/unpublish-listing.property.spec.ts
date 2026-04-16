// Feature: backend-database-implementation, Property 21: Despublicar inmueble lo remueve del listado público (round-trip)
// Validates: Requirements 3.11

import * as fc from 'fast-check';
import { UnpublishListingUseCase } from './unpublish-listing.use-case';
import { SearchListingsUseCase } from './search-listings.use-case';
import type { IListingRepository, ListingFilters } from '@modules/property-listings/domain/ports/listing-repository.port';
import type { IListingCache } from '@modules/property-listings/domain/ports/listing-cache.port';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import { PhotoEntity } from '@modules/property-listings/domain/entities/photo.entity';
import { ListingFiltersDto } from '@modules/property-listings/application/dtos/listing-filters.dto';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryPhoto = fc
  .record({
    id: fc.uuid(),
    listingId: fc.uuid(),
    fileUrl: fc
      .stringMatching(/^[a-z0-9]{8}$/)
      .map((hex) => `https://storage.example.com/${hex}`),
    isMain: fc.boolean(),
  })
  .map((f) => new PhotoEntity(f.id, f.listingId, f.fileUrl, f.isMain));

const arbitraryPhotos = fc.array(arbitraryPhoto, { minLength: 1, maxLength: 4 });

/**
 * Generates a PUBLISHED listing with at least one photo (eligible for public listing).
 */
function arbitraryPublishedListing(): fc.Arbitrary<ListingEntity> {
  return fc
    .record({
      id: fc.uuid(),
      portfolioUnitId: fc.uuid(),
      title: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
      description: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
      listingDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
      price: fc.integer({ min: 500000, max: 5000000 }),
      currency: fc.constantFrom('COP', 'USD'),
      photos: arbitraryPhotos,
    })
    .map(
      (f) =>
        new ListingEntity(
          f.id,
          f.portfolioUnitId,
          f.title,
          f.description,
          f.listingDate,
          f.price,
          f.currency,
          true, // PUBLISHED
          f.photos,
        ),
    );
}

// ─── Stubs ────────────────────────────────────────────────────────────────────

/**
 * Mutable repository stub that supports unpublish + findPublished round-trip.
 * Tracks listings in an internal map; unpublish sets isActive=false.
 */
function makeMutableRepositoryStub(
  initialListings: ListingEntity[],
  ownerMap: Map<string, string>,
): IListingRepository {
  const store = new Map<string, ListingEntity>();
  for (const l of initialListings) {
    store.set(l.id, l);
  }

  return {
    async findPublished(_filters: ListingFilters): Promise<ListingEntity[]> {
      return [...store.values()].filter((l) => l.isActive);
    },
    async unpublish(id: string): Promise<void> {
      const existing = store.get(id);
      if (existing) {
        store.set(
          id,
          new ListingEntity(
            existing.id,
            existing.portfolioUnitId,
            existing.title,
            existing.description,
            existing.listingDate,
            existing.price,
            existing.currency,
            false, // UNPUBLISHED
            existing.photos,
          ),
        );
      }
    },
    async getOwnerUserId(listingId: string): Promise<string | null> {
      return ownerMap.get(listingId) ?? null;
    },
    async create() {
      throw new Error('not implemented');
    },
    async findById() {
      return null;
    },
    async findDetailById() {
      return null;
    },
    async registerContactEvent() {
      return;
    },
  };
}

const cacheMissStub: IListingCache = {
  async getListings() { return null; },
  async setListings() { return; },
  async invalidate() { return; },
  async invalidateByPattern() { return; },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UnpublishListingUseCase — Property 21: Despublicar inmueble lo remueve del listado público (round-trip)', () => {
  /**
   * Property 21a — Validates: Requirements 3.11
   *
   * For any published listing with photos, after the owner unpublishes it,
   * SearchListingsUseCase must NOT include it in the results.
   */
  it('Property 21a — unpublished listing no longer appears in search results', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPublishedListing(),
        fc.array(arbitraryPublishedListing(), { minLength: 0, maxLength: 5 }),
        fc.uuid(),
        async (target: ListingEntity, others: ListingEntity[], ownerId: string) => {
          const allListings = [target, ...others];
          const ownerMap = new Map<string, string>();
          ownerMap.set(target.id, ownerId);

          const repository = makeMutableRepositoryStub(allListings, ownerMap);
          const unpublishUseCase = new UnpublishListingUseCase(repository, cacheMissStub);
          const searchUseCase = new SearchListingsUseCase(repository, cacheMissStub);

          // Before: target should be in results
          const before = await searchUseCase.execute(new ListingFiltersDto());
          const beforeIds = new Set(before.map((r) => r.id));
          if (!beforeIds.has(target.id)) return false;

          // Unpublish
          await unpublishUseCase.execute(target.id, ownerId);

          // After: target must NOT be in results
          const after = await searchUseCase.execute(new ListingFiltersDto());
          const afterIds = new Set(after.map((r) => r.id));
          return !afterIds.has(target.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 21b — Validates: Requirements 3.11
   *
   * Unpublishing one listing does NOT affect other published listings.
   * All other listings that were visible before remain visible after.
   */
  it('Property 21b — other published listings remain visible after unpublishing one', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPublishedListing(),
        fc.array(arbitraryPublishedListing(), { minLength: 1, maxLength: 5 }),
        fc.uuid(),
        async (target: ListingEntity, others: ListingEntity[], ownerId: string) => {
          const allListings = [target, ...others];
          const ownerMap = new Map<string, string>();
          ownerMap.set(target.id, ownerId);

          const repository = makeMutableRepositoryStub(allListings, ownerMap);
          const unpublishUseCase = new UnpublishListingUseCase(repository, cacheMissStub);
          const searchUseCase = new SearchListingsUseCase(repository, cacheMissStub);

          // Unpublish target
          await unpublishUseCase.execute(target.id, ownerId);

          // All others must still be in results
          const after = await searchUseCase.execute(new ListingFiltersDto());
          const afterIds = new Set(after.map((r) => r.id));

          const otherIds = others.map((l) => l.id);
          return otherIds.every((id) => afterIds.has(id));
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 21c — Validates: Requirements 3.11
   *
   * After unpublishing, the total count of search results decreases by exactly one
   * (the unpublished listing).
   */
  it('Property 21c — search result count decreases by exactly one after unpublish', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPublishedListing(),
        fc.array(arbitraryPublishedListing(), { minLength: 0, maxLength: 5 }),
        fc.uuid(),
        async (target: ListingEntity, others: ListingEntity[], ownerId: string) => {
          const allListings = [target, ...others];
          const ownerMap = new Map<string, string>();
          ownerMap.set(target.id, ownerId);

          const repository = makeMutableRepositoryStub(allListings, ownerMap);
          const unpublishUseCase = new UnpublishListingUseCase(repository, cacheMissStub);
          const searchUseCase = new SearchListingsUseCase(repository, cacheMissStub);

          const before = await searchUseCase.execute(new ListingFiltersDto());
          const countBefore = before.length;

          await unpublishUseCase.execute(target.id, ownerId);

          const after = await searchUseCase.execute(new ListingFiltersDto());
          const countAfter = after.length;

          return countAfter === countBefore - 1;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 21d — Validates: Requirements 3.11, 3.12
   *
   * A non-owner attempting to unpublish receives a ForbiddenException,
   * and the listing remains in search results (no side effect).
   */
  it('Property 21d — non-owner cannot unpublish; listing stays visible', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPublishedListing(),
        fc.uuid(),
        fc.uuid(),
        async (target: ListingEntity, ownerId: string, attackerId: string) => {
          // Ensure attacker is different from owner
          if (attackerId === ownerId) return true; // skip trivial case

          const ownerMap = new Map<string, string>();
          ownerMap.set(target.id, ownerId);

          const repository = makeMutableRepositoryStub([target], ownerMap);
          const unpublishUseCase = new UnpublishListingUseCase(repository, cacheMissStub);
          const searchUseCase = new SearchListingsUseCase(repository, cacheMissStub);

          // Attempt unpublish as non-owner — should throw
          let threw = false;
          try {
            await unpublishUseCase.execute(target.id, attackerId);
          } catch {
            threw = true;
          }
          if (!threw) return false;

          // Listing must still be visible
          const after = await searchUseCase.execute(new ListingFiltersDto());
          return after.some((r) => r.id === target.id);
        },
      ),
      { numRuns: 100 },
    );
  });
});
