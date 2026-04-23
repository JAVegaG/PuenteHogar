// Feature: backend-database-implementation, Property 23: Evento de contacto registra inmueble, arrendatario y timestamp
// Validates: Requirements 4.1

import * as fc from 'fast-check';
import { RegisterContactEventUseCase } from './register-contact-event.use-case';
import type { IListingRepository } from '@modules/property-listings/domain/ports/listing-repository.port';
import type { INotificationPort } from '@modules/property-listings/domain/ports/notification.port';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import { ContactEventDto } from '@modules/property-listings/application/dtos/contact-event.dto';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryContactEvent = fc.record({
  listingId: fc.uuid(),
  tenantUserId: fc.uuid(),
  ownerUserId: fc.uuid(),
});

// ─── Stubs ────────────────────────────────────────────────────────────────────

interface ContactRecord {
  listingId: string;
  tenantUserId: string;
  timestamp: Date;
}

function makeRepositoryStub(ownerUserId: string): {
  stub: IListingRepository;
  contactRecords: ContactRecord[];
} {
  const contactRecords: ContactRecord[] = [];

  const stub: IListingRepository = {
    async findById(id: string): Promise<ListingEntity | null> {
      return new ListingEntity(
        id,
        'portfolio-unit-1',
        'Test Listing',
        null,
        new Date(),
        1000000,
        'COP',
        true,
        [],
      );
    },
    async registerContactEvent(listingId: string, tenantUserId: string): Promise<void> {
      contactRecords.push({
        listingId,
        tenantUserId,
        timestamp: new Date(),
      });
    },
    async getOwnerUserId(): Promise<string | null> {
      return ownerUserId;
    },
    async create() { throw new Error('not implemented'); },
    async findPublished() { return { data: [], total: 0 }; },
    async findDetailById() { return null; },
    async findActiveByPortfolioUnitId() { return null; },
    async update() { return null as unknown as ListingEntity; },
    async unpublish() { return; },
    async getOwnerUserIdByUnit() { return null; },
  };

  return { stub, contactRecords };
}

function makeNotificationStub(): {
  stub: INotificationPort;
  notifications: { landlordUserId: string; tenantUserId: string; listingId: string }[];
} {
  const notifications: { landlordUserId: string; tenantUserId: string; listingId: string }[] = [];

  const stub: INotificationPort = {
    async notifyLandlordOfInterest(landlordUserId, tenantUserId, listingId) {
      notifications.push({ landlordUserId, tenantUserId, listingId });
    },
  };

  return { stub, notifications };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Property 23: Evento de contacto registra inmueble, arrendatario y timestamp', () => {
  it('should record listingId, tenantUserId and a timestamp for every contact event', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryContactEvent, async ({ listingId, tenantUserId, ownerUserId }) => {
        const { stub: repo, contactRecords } = makeRepositoryStub(ownerUserId);
        const { stub: notif } = makeNotificationStub();

        const useCase = new RegisterContactEventUseCase(repo, notif);

        const dto = new ContactEventDto();
        dto.listingId = listingId;

        const before = new Date();
        await useCase.execute(dto, tenantUserId);
        const after = new Date();

        // Exactly one contact event was recorded
        expect(contactRecords).toHaveLength(1);

        const record = contactRecords[0];

        // The recorded listingId matches the input
        expect(record.listingId).toBe(listingId);

        // The recorded tenantUserId matches the input
        expect(record.tenantUserId).toBe(tenantUserId);

        // A timestamp was captured within the execution window
        expect(record.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(record.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve distinct identifiers across different contact events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryContactEvent, { minLength: 2, maxLength: 10 }),
        async (events) => {
          const { stub: repo, contactRecords } = makeRepositoryStub('owner-1');
          const { stub: notif } = makeNotificationStub();

          const useCase = new RegisterContactEventUseCase(repo, notif);

          for (const { listingId, tenantUserId } of events) {
            const dto = new ContactEventDto();
            dto.listingId = listingId;
            await useCase.execute(dto, tenantUserId);
          }

          // Every event was recorded
          expect(contactRecords).toHaveLength(events.length);

          // Each record matches its corresponding input
          for (let i = 0; i < events.length; i++) {
            expect(contactRecords[i].listingId).toBe(events[i].listingId);
            expect(contactRecords[i].tenantUserId).toBe(events[i].tenantUserId);
          }

          // Timestamps are monotonically non-decreasing
          for (let i = 1; i < contactRecords.length; i++) {
            expect(contactRecords[i].timestamp.getTime())
              .toBeGreaterThanOrEqual(contactRecords[i - 1].timestamp.getTime());
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
