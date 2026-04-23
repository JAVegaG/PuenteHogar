// Feature: backend-database-implementation, Property 17: Fotos almacenadas en object storage — BD contiene solo URLs
// Validates: Requirements 3.3

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { CreateListingUseCase, UploadedFile } from './create-listing.use-case';

function uuidv4(): string {
  return crypto.randomUUID();
}
import type { IListingRepository, CreateListingData } from '@modules/property-listings/domain/ports/listing-repository.port';
import type { IObjectStorage } from '@modules/property-listings/domain/ports/object-storage.port';
import type { IListingCache } from '@modules/property-listings/domain/ports/listing-cache.port';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import { PhotoEntity } from '@modules/property-listings/domain/entities/photo.entity';
import { CreateListingDto } from '@modules/property-listings/application/dtos/create-listing.dto';

// ─── URL validation helper ────────────────────────────────────────────────────

function isValidUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function isNotBinaryData(value: string): boolean {
  // Reject Buffer-like patterns (e.g. "<Buffer ...>")
  if (/^<Buffer\s/.test(value)) return false;
  // Reject base64 blobs (long strings of base64 chars without URL prefix)
  if (/^[A-Za-z0-9+/]{50,}={0,2}$/.test(value)) return false;
  // Reject raw binary (non-printable characters)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0e-\x1f\x7f]/.test(value)) return false;
  return true;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates simulated photo file inputs (as Buffer + metadata).
 * Represents what a client would upload — raw binary file data.
 */
const arbitraryPhotoFile = fc.record({
  buffer: fc
    .uint8Array({ minLength: 10, maxLength: 1024 })
    .map((arr) => Buffer.from(arr)),
  originalname: fc
    .stringMatching(/^[a-z0-9_-]{3,12}$/)
    .map((name) => `${name}.jpg`),
  mimetype: fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
});

/**
 * Generates a non-empty array of photo files (1–5 photos).
 */
const arbitraryPhotoFiles = fc.array(arbitraryPhotoFile, { minLength: 1, maxLength: 5 });

/**
 * Generates a valid CreateListingDto (without photoUrls — files are passed separately).
 */
const arbitraryCreateListingDto = fc.record({
  portfolioUnitId: fc.constant(uuidv4()),
  title: fc.stringMatching(/^[A-Za-z0-9 ]{5,30}$/),
  price: fc.integer({ min: 100000, max: 10000000 }),
  currency: fc.constantFrom('COP', 'USD'),
  description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
}).map((fields) => {
  const dto = new CreateListingDto();
  dto.portfolioUnitId = fields.portfolioUnitId;
  dto.title = fields.title;
  dto.price = fields.price;
  dto.currency = fields.currency;
  if (fields.description !== undefined) {
    dto.description = fields.description;
  }
  return dto;
});

// ─── Stubs ────────────────────────────────────────────────────────────────────

/**
 * Stub for IObjectStorage: returns a deterministic HTTPS URL per file.
 * Captures what was passed to uploadPhoto for assertion.
 */
function makeObjectStorageStub(): {
  stub: IObjectStorage;
  uploadedBuffers: Buffer[];
  returnedUrls: string[];
} {
  const uploadedBuffers: Buffer[] = [];
  const returnedUrls: string[] = [];

  const stub: IObjectStorage = {
    async uploadPhoto(fileBuffer: Buffer, filename: string, _mimeType: string): Promise<string> {
      uploadedBuffers.push(fileBuffer);
      const url = `https://storage.example.com/${uuidv4()}-${filename}`;
      returnedUrls.push(url);
      return url;
    },
  };

  return { stub, uploadedBuffers, returnedUrls };
}

/**
 * Stub for IListingRepository: captures what gets persisted.
 */
function makeRepositoryStub(): {
  stub: IListingRepository;
  capturedData: CreateListingData[];
} {
  const capturedData: CreateListingData[] = [];

  const stub: IListingRepository = {
    async create(data: CreateListingData): Promise<ListingEntity> {
      capturedData.push(data);
      // Build a ListingEntity with PhotoEntities using the URLs from data
      const photos = data.photoUrls.map(
        (url, i) => new PhotoEntity(uuidv4(), uuidv4(), url, i === 0),
      );
      return new ListingEntity(
        uuidv4(),
        data.portfolioUnitId,
        data.title,
        data.description ?? null,
        new Date(),
        data.price,
        data.currency,
        true,
        photos,
      );
    },
    async findPublished() { return { data: [], total: 0 }; },
    async findById() { return null; },
    async findDetailById() { return null; },
    async findActiveByPortfolioUnitId() { return null; },
    async update() { return null as unknown as ListingEntity; },
    async unpublish() { return; },
    async getOwnerUserId() { return null; },
    async getOwnerUserIdByUnit() { return null; },
    async registerContactEvent() { return; },
  };

  return { stub, capturedData };
}

/**
 * Stub for IListingCache: no-op.
 */
const cacheStub: IListingCache = {
  async getListings() { return null; },
  async setListings() { return; },
  async invalidate() { return; },
  async invalidateByPattern() { return; },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CreateListingUseCase — Property 17: Fotos almacenadas en object storage — BD contiene solo URLs', () => {
  /**
   * Property 17 — Validates: Requirements 3.3
   *
   * For any set of photo file inputs (simulated as binary Buffers),
   * when CreateListingUseCase processes them:
   *   1. IObjectStorage.uploadPhoto() is called with the raw buffer
   *   2. The repository receives ONLY URL strings in photoUrls — never binary data
   *   3. Every URL stored starts with "http" (valid URL format)
   *   4. No stored value is a Buffer representation, base64 blob, or raw binary
   */
  it('Property 17 — photoUrls persisted in repository are valid URL strings, never binary data', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPhotoFiles,
        arbitraryCreateListingDto,
        async (files: UploadedFile[], dto: CreateListingDto) => {
          const { stub: objectStorage, returnedUrls } = makeObjectStorageStub();
          const { stub: repository, capturedData } = makeRepositoryStub();

          const useCase = new CreateListingUseCase(repository, cacheStub, objectStorage);

          await useCase.execute(dto, uuidv4(), ['LANDLORD'], files);

          // Must have captured exactly one create() call
          if (capturedData.length !== 1) return false;

          const persistedUrls = capturedData[0].photoUrls;

          // Must have persisted the same number of URLs as files uploaded
          if (persistedUrls.length !== files.length) return false;

          // Every persisted URL must be a valid URL string
          for (const url of persistedUrls) {
            if (typeof url !== 'string') return false;
            if (!isValidUrl(url)) return false;
            if (!isNotBinaryData(url)) return false;
          }

          // The persisted URLs must match what the object storage stub returned
          for (let i = 0; i < returnedUrls.length; i++) {
            if (persistedUrls[i] !== returnedUrls[i]) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 17 — no photo URL in repository contains Buffer representation or base64 blob', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPhotoFiles,
        arbitraryCreateListingDto,
        async (files: UploadedFile[], dto: CreateListingDto) => {
          const { stub: objectStorage } = makeObjectStorageStub();
          const { stub: repository, capturedData } = makeRepositoryStub();

          const useCase = new CreateListingUseCase(repository, cacheStub, objectStorage);

          await useCase.execute(dto, uuidv4(), ['LANDLORD'], files);

          const persistedUrls = capturedData[0]?.photoUrls ?? [];

          return persistedUrls.every((url) => {
            // Must not look like Buffer.toString() output
            if (url.startsWith('<Buffer')) return false;
            // Must not be a raw base64 string (no URL prefix)
            if (/^[A-Za-z0-9+/]{50,}={0,2}$/.test(url)) return false;
            // Must not contain binary/non-printable characters
            // eslint-disable-next-line no-control-regex
            if (/[\x00-\x08\x0e-\x1f\x7f]/.test(url)) return false;
            return true;
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 17 — object storage uploadPhoto receives the original Buffer, not a URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPhotoFiles,
        arbitraryCreateListingDto,
        async (files: UploadedFile[], dto: CreateListingDto) => {
          const { stub: objectStorage, uploadedBuffers } = makeObjectStorageStub();
          const { stub: repository } = makeRepositoryStub();

          const useCase = new CreateListingUseCase(repository, cacheStub, objectStorage);

          await useCase.execute(dto, uuidv4(), ['LANDLORD'], files);

          // uploadPhoto must have been called once per file
          if (uploadedBuffers.length !== files.length) return false;

          // Each call must have received the original Buffer (binary data)
          for (let i = 0; i < files.length; i++) {
            const received = uploadedBuffers[i];
            const original = files[i].buffer;
            if (!Buffer.isBuffer(received)) return false;
            if (!received.equals(original)) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
