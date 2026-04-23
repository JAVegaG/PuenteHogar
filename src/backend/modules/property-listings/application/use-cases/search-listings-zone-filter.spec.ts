// Feature: backend-database-implementation, Property 19: Filtro por zona retorna solo inmuebles de esa zona
// Validates: Requirements 3.5

import * as fc from 'fast-check';
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
    fileUrl: fc.stringMatching(/^[a-z0-9]{8}$/).map((hex) => `https://storage.example.com/${hex}`),
    isMain: fc.boolean(),
  })
  .map((f) => new PhotoEntity(f.id, f.listingId, f.fileUrl, f.isMain));

const arbitraryPhotos = fc.array(arbitraryPhoto, { minLength: 1, maxLength: 4 });

/** Neighborhood names used in generated listings */
const NEIGHBORHOODS = ['El Peñón', 'Granada', 'San Antonio', 'Ciudad Jardín', 'Laureles'] as const;

/**
 * A listing paired with its neighborhood so the repository stub can filter correctly.
 * ListingEntity itself has no address — the neighborhood lives in the repository layer.
 */
interface ListingWithNeighborhood {
  listing: ListingEntity;
  neighborhood: string;
}

function arbitraryListingWithNeighborhood(): fc.Arbitrary<ListingWithNeighborhood> {
  return fc
    .record({
      id: fc.uuid(),
      portfolioUnitId: fc.uuid(),
      title: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
      description: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
      listingDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
      price: fc.integer({ min: 500000, max: 5000000 }),
      currency: fc.constantFrom('COP', 'USD'),
      isActive: fc.boolean(),
      photos: fc.oneof(fc.constant<PhotoEntity[]>([]), arbitraryPhotos),
      neighborhood: fc.constantFrom(...NEIGHBORHOODS),
    })
    .map((f) => ({
      listing: new ListingEntity(
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
      neighborhood: f.neighborhood,
    }));
}

// ─── Stubs ────────────────────────────────────────────────────────────────────

/**
 * Repository stub that simulates DB-level filtering:
 * - Always filters by isActive=true (PUBLISHED)
 * - When filters.neighborhood is provided, returns only listings from that neighborhood
 */
function makeRepositoryStub(items: ListingWithNeighborhood[]): IListingRepository {
  return {
    async findPublished(filters: ListingFilters) {
      const data = items
        .filter((item) => item.listing.isActive)
        .filter((item) => !filters.neighborhood || item.neighborhood === filters.neighborhood)
        .map((item) => item.listing);
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

/** Cache stub: always misses so the use case always hits the repository */
const cacheMissStub: IListingCache = {
  async getListings() { return null; },
  async setListings() { return; },
  async invalidate() { return; },
  async invalidateByPattern() { return; },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchListingsUseCase — Property 19: Filtro por zona retorna solo inmuebles de esa zona', () => {
  /**
   * Property 19a — Validates: Requirements 3.5
   *
   * For any set of listings with mixed neighborhoods, filtering by a specific
   * neighborhood must return ONLY listings from that neighborhood.
   * No listing from a different neighborhood may appear in the result.
   */
  it('Property 19a — resultado contiene solo inmuebles del barrio solicitado', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryListingWithNeighborhood(), { minLength: 0, maxLength: 20 }),
        fc.constantFrom(...NEIGHBORHOODS),
        async (items: ListingWithNeighborhood[], requestedNeighborhood: string) => {
          const repository = makeRepositoryStub(items);
          const useCase = new SearchListingsUseCase(repository, cacheMissStub);

          const filters = new ListingFiltersDto();
          filters.neighborhood = requestedNeighborhood;

          const result = await useCase.execute(filters);

          // Build a map from listing id → neighborhood for quick lookup
          const neighborhoodById = new Map(items.map((i) => [i.listing.id, i.neighborhood]));

          for (const dto of result.data) {
            const neighborhood = neighborhoodById.get(dto.id);
            if (neighborhood !== requestedNeighborhood) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 19b — Validates: Requirements 3.5
   *
   * No listing from a different neighborhood ever leaks into the filtered result,
   * even when the dataset contains many listings from other neighborhoods.
   */
  it('Property 19b — ningún inmueble de otro barrio aparece en el resultado filtrado', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryListingWithNeighborhood(), { minLength: 1, maxLength: 20 }),
        fc.constantFrom(...NEIGHBORHOODS),
        async (items: ListingWithNeighborhood[], requestedNeighborhood: string) => {
          const repository = makeRepositoryStub(items);
          const useCase = new SearchListingsUseCase(repository, cacheMissStub);

          const filters = new ListingFiltersDto();
          filters.neighborhood = requestedNeighborhood;

          const result = await useCase.execute(filters);
          const resultIds = new Set(result.data.map((r) => r.id));

          // IDs of listings that belong to a DIFFERENT neighborhood and are eligible
          const wrongNeighborhoodIds = items
            .filter((i) => i.neighborhood !== requestedNeighborhood && i.listing.isActive && i.listing.photos.length > 0)
            .map((i) => i.listing.id);

          return wrongNeighborhoodIds.every((id) => !resultIds.has(id));
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 19c — Validates: Requirements 3.5
   *
   * Every eligible listing (PUBLISHED + has photo + matching neighborhood) IS
   * included in the result — the filter must not accidentally drop valid listings.
   */
  it('Property 19c — todo inmueble elegible del barrio solicitado aparece en el resultado', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryListingWithNeighborhood(), { minLength: 1, maxLength: 20 }),
        fc.constantFrom(...NEIGHBORHOODS),
        async (items: ListingWithNeighborhood[], requestedNeighborhood: string) => {
          const repository = makeRepositoryStub(items);
          const useCase = new SearchListingsUseCase(repository, cacheMissStub);

          const filters = new ListingFiltersDto();
          filters.neighborhood = requestedNeighborhood;

          const result = await useCase.execute(filters);
          const resultIds = new Set(result.data.map((r) => r.id));

          // Eligible: PUBLISHED + has photo + correct neighborhood
          const eligibleIds = items
            .filter(
              (i) =>
                i.listing.isActive &&
                i.listing.photos.length > 0 &&
                i.neighborhood === requestedNeighborhood,
            )
            .map((i) => i.listing.id);

          return eligibleIds.every((id) => resultIds.has(id));
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 19d — Validates: Requirements 3.5
   *
   * When no listing matches the requested neighborhood, the result is an empty
   * array — the use case never throws.
   */
  it('Property 19d — resultado vacío cuando ningún inmueble pertenece al barrio solicitado', async () => {
    await fc.assert(
      fc.asyncProperty(
        // All listings belong to 'El Peñón'; we filter by a different neighborhood
        fc.array(
          arbitraryListingWithNeighborhood().map((item) => ({
            ...item,
            neighborhood: 'El Peñón',
          })),
          { minLength: 0, maxLength: 10 },
        ),
        async (items: ListingWithNeighborhood[]) => {
          const repository = makeRepositoryStub(items);
          const useCase = new SearchListingsUseCase(repository, cacheMissStub);

          const filters = new ListingFiltersDto();
          filters.neighborhood = 'Granada'; // different from 'El Peñón'

          const result = await useCase.execute(filters);
          return Array.isArray(result.data) && result.data.length === 0;
        },
      ),
      { numRuns: 50 },
    );
  });
});
