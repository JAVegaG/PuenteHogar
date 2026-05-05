// Feature: backend-database-implementation, Property 20: Detalle de inmueble contiene todos los campos requeridos
// Validates: Requirements 3.6, 3.7

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { GetListingDetailUseCase } from './get-listing-detail.use-case';
import type { IListingRepository, ListingDetail } from '@modules/property-listings/domain/ports/listing-repository.port';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import { PhotoEntity } from '@modules/property-listings/domain/entities/photo.entity';
import { ListingDetailResponseDto } from '@modules/property-listings/application/dtos/listing-detail-response.dto';

function uuidv4(): string {
  return crypto.randomUUID();
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryPhoto = fc.record({
  id: fc.constant(uuidv4()),
  fileUrl: fc.webUrl(),
  isMain: fc.boolean(),
});

const arbitraryAddress = fc.record({
  state: fc.stringMatching(/^[A-Za-z ]{3,20}$/),
  city: fc.stringMatching(/^[A-Za-z ]{3,20}$/),
  neighborhood: fc.stringMatching(/^[A-Za-z ]{3,20}$/),
  address: fc.stringMatching(/^[A-Za-z0-9 #-]{5,40}$/),
});

const arbitraryListingDetail = fc.record({
  id: fc.constant(uuidv4()),
  portfolioUnitId: fc.constant(uuidv4()),
  title: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
  description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  listingDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  price: fc.integer({ min: 100000, max: 10000000 }),
  currency: fc.constantFrom('COP', 'USD'),
  photos: fc.array(arbitraryPhoto, { minLength: 1, maxLength: 5 }),
  numberOfRooms: fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
  numberOfBathrooms: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
  propertyType: fc.option(fc.constantFrom('APARTMENT', 'HOUSE', 'STUDIO', 'ROOM'), { nil: null }),
  address: fc.option(arbitraryAddress, { nil: null }),
  landlordUserId: fc.option(fc.constant(uuidv4()), { nil: null }),
});

// ─── Stubs ────────────────────────────────────────────────────────────────────

function makeRepositoryStub(detail: ListingDetail | null): IListingRepository {
  return {
    async create() { throw new Error('not implemented'); },
    async findPublished() { return { data: [], total: 0 }; },
    async findById() { return null; },
    async findDetailById(): Promise<ListingDetail | null> { return detail; },
    async findActiveByPortfolioUnitId() { return null; },
    async update() { return null as unknown as ListingEntity; },
    async unpublish() { return; },
    async getOwnerUserId() { return null; },
    async getOwnerUserIdByUnit() { return null; },
    async registerContactEvent() { return; },
  };
}


function buildListingDetail(data: {
  id: string;
  portfolioUnitId: string;
  title: string;
  description: string | null;
  listingDate: Date;
  price: number;
  currency: string;
  photos: { id: string; fileUrl: string; isMain: boolean }[];
  numberOfRooms: number | null;
  numberOfBathrooms: number | null;
  propertyType: string | null;
  address: { state: string; city: string; neighborhood: string; address: string } | null;
  landlordUserId: string | null;
}): ListingDetail {
  const photoEntities = data.photos.map(
    (p) => new PhotoEntity(p.id, data.id, p.fileUrl, p.isMain),
  );
  const listing = new ListingEntity(
    data.id,
    data.portfolioUnitId,
    data.title,
    data.description,
    data.listingDate,
    data.price,
    data.currency,
    true,
    photoEntities,
  );
  return {
    listing,
    numberOfRooms: data.numberOfRooms,
    numberOfBathrooms: data.numberOfBathrooms,
    propertyType: data.propertyType,
    area: null,
    address: data.address,
    landlordUserId: data.landlordUserId,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GetListingDetailUseCase — Property 20: Detalle de inmueble contiene todos los campos requeridos', () => {
  /**
   * Property 20 — Validates: Requirements 3.6, 3.7
   *
   * For any valid listing detail returned by the repository,
   * the response DTO must contain ALL required fields:
   *   - photos (array with at least one element)
   *   - listingDate (publication date)
   *   - price (canon)
   *   - numberOfRooms
   *   - numberOfBathrooms
   *   - address (contact/location info)
   *   - landlordUserId (landlord contact reference)
   *   - title, description, currency, isActive
   */
  it('Property 20 — detail response contains all required fields from the listing', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryListingDetail, async (data) => {
        const detail = buildListingDetail(data);
        const repository = makeRepositoryStub(detail);
        const useCase = new GetListingDetailUseCase(repository);

        const result = await useCase.execute(data.id);

        // Core identity fields
        if (result.id !== data.id) return false;
        if (result.portfolioUnitId !== data.portfolioUnitId) return false;
        if (result.title !== data.title) return false;
        if (result.description !== data.description) return false;
        if (result.currency !== data.currency) return false;
        if (result.isActive !== true) return false;

        // Req 3.7: listingDate (publication date) must be present
        if (!(result.listingDate instanceof Date)) return false;
        const expectedTime = data.listingDate.getTime();
        const actualTime = result.listingDate.getTime();
        if (Number.isNaN(expectedTime) && Number.isNaN(actualTime)) {
          // Both NaN — considered equal
        } else if (actualTime !== expectedTime) {
          return false;
        }

        // Req 3.6: price (canon) must match
        if (result.price !== data.price) return false;

        // Req 3.6: photos must be present and match count
        if (!Array.isArray(result.photos)) return false;
        if (result.photos.length !== data.photos.length) return false;
        for (let i = 0; i < data.photos.length; i++) {
          if (result.photos[i].id !== data.photos[i].id) return false;
          if (result.photos[i].fileUrl !== data.photos[i].fileUrl) return false;
          if (result.photos[i].isMain !== data.photos[i].isMain) return false;
        }

        // Req 3.6: numberOfRooms and numberOfBathrooms
        if (result.numberOfRooms !== data.numberOfRooms) return false;
        if (result.numberOfBathrooms !== data.numberOfBathrooms) return false;

        // Property type
        if (result.propertyType !== data.propertyType) return false;

        // Req 3.6: address (location info)
        if (data.address === null) {
          if (result.address !== null) return false;
        } else {
          if (result.address === null) return false;
          if (result.address.state !== data.address.state) return false;
          if (result.address.city !== data.address.city) return false;
          if (result.address.neighborhood !== data.address.neighborhood) return false;
          if (result.address.address !== data.address.address) return false;
        }

        // Req 3.6: landlord contact data
        if (result.landlordUserId !== data.landlordUserId) return false;

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 20 — response DTO has correct types for all fields', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryListingDetail, async (data) => {
        const detail = buildListingDetail(data);
        const repository = makeRepositoryStub(detail);
        const useCase = new GetListingDetailUseCase(repository);

        const result = await useCase.execute(data.id);

        // Verify the result is an instance of the DTO
        if (!(result instanceof ListingDetailResponseDto)) return false;

        // Type checks for required fields
        if (typeof result.id !== 'string') return false;
        if (typeof result.portfolioUnitId !== 'string') return false;
        if (typeof result.title !== 'string') return false;
        if (typeof result.price !== 'number') return false;
        if (typeof result.currency !== 'string') return false;
        if (typeof result.isActive !== 'boolean') return false;
        if (!(result.listingDate instanceof Date)) return false;
        if (!Array.isArray(result.photos)) return false;

        // Nullable fields must be correct type or null
        if (result.description !== null && typeof result.description !== 'string') return false;
        if (result.numberOfRooms !== null && typeof result.numberOfRooms !== 'number') return false;
        if (result.numberOfBathrooms !== null && typeof result.numberOfBathrooms !== 'number') return false;
        if (result.propertyType !== null && typeof result.propertyType !== 'string') return false;
        if (result.landlordUserId !== null && typeof result.landlordUserId !== 'string') return false;

        // Photo sub-objects type checks
        for (const photo of result.photos) {
          if (typeof photo.id !== 'string') return false;
          if (typeof photo.fileUrl !== 'string') return false;
          if (typeof photo.isMain !== 'boolean') return false;
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 20 — inactive listing throws NotFoundException', async () => {
    // An inactive listing should not be returned — use case throws 404
    const photoEntities = [new PhotoEntity(uuidv4(), uuidv4(), 'https://example.com/photo.jpg', true)];
    const inactiveListing = new ListingEntity(
      uuidv4(), uuidv4(), 'Test', null, new Date(), 500000, 'COP', false, photoEntities,
    );
    const detail: ListingDetail = {
      listing: inactiveListing,
      numberOfRooms: 2,
      numberOfBathrooms: 1,
      propertyType: 'APARTMENT',
      area: null,
      address: { state: 'Valle', city: 'Cali', neighborhood: 'Centro', address: 'Calle 1 #2-3' },
      landlordUserId: uuidv4(),
    };
    const repository = makeRepositoryStub(detail);
    const useCase = new GetListingDetailUseCase(repository);

    await expect(useCase.execute(inactiveListing.id)).rejects.toThrow(NotFoundException);
  });

  it('Property 20 — non-existent listing throws NotFoundException', async () => {
    const repository = makeRepositoryStub(null);
    const useCase = new GetListingDetailUseCase(repository);

    await expect(useCase.execute(uuidv4())).rejects.toThrow(NotFoundException);
  });
});
