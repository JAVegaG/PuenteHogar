// Feature: backend-database-implementation, Property 24: Evento de contacto dispara notificación al arrendador
// Validates: Requirements 4.2

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

interface NotificationRecord {
  landlordUserId: string;
  tenantUserId: string;
  listingId: string;
}

function makeRepositoryStub(ownerUserId: string | null): IListingRepository {
  return {
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
    async registerContactEvent(): Promise<void> {},
    async getOwnerUserId(): Promise<string | null> {
      return ownerUserId;
    },
    async create() { throw new Error('not implemented'); },
    async findPublished() { return { data: [], total: 0 }; },
    async findDetailById() { return null; },
    async unpublish() { return; },
  };
}

function makeNotificationStub(): {
  stub: INotificationPort;
  notifications: NotificationRecord[];
} {
  const notifications: NotificationRecord[] = [];

  const stub: INotificationPort = {
    async notifyLandlordOfInterest(landlordUserId, tenantUserId, listingId) {
      notifications.push({ landlordUserId, tenantUserId, listingId });
    },
  };

  return { stub, notifications };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Property 24: Evento de contacto dispara notificación al arrendador', () => {
  it('should notify the landlord with correct landlordUserId, tenantUserId and listingId', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryContactEvent, async ({ listingId, tenantUserId, ownerUserId }) => {
        const repo = makeRepositoryStub(ownerUserId);
        const { stub: notif, notifications } = makeNotificationStub();

        const useCase = new RegisterContactEventUseCase(repo, notif);

        const dto = new ContactEventDto();
        dto.listingId = listingId;

        await useCase.execute(dto, tenantUserId);

        // Allow fire-and-forget promise to settle
        await new Promise((r) => setTimeout(r, 10));

        // Exactly one notification was dispatched
        expect(notifications).toHaveLength(1);

        const record = notifications[0];

        // Notification targets the landlord (owner) of the listing
        expect(record.landlordUserId).toBe(ownerUserId);

        // Notification includes the tenant who initiated contact
        expect(record.tenantUserId).toBe(tenantUserId);

        // Notification references the correct listing
        expect(record.listingId).toBe(listingId);
      }),
      { numRuns: 100 },
    );
  });

  it('should not dispatch notification when listing has no owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        async (listingId, tenantUserId) => {
          const repo = makeRepositoryStub(null);
          const { stub: notif, notifications } = makeNotificationStub();

          const useCase = new RegisterContactEventUseCase(repo, notif);

          const dto = new ContactEventDto();
          dto.listingId = listingId;

          await useCase.execute(dto, tenantUserId);

          await new Promise((r) => setTimeout(r, 10));

          // No notification when owner cannot be resolved
          expect(notifications).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not block the response if notification fails', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryContactEvent, async ({ listingId, tenantUserId, ownerUserId }) => {
        const repo = makeRepositoryStub(ownerUserId);

        const failingNotif: INotificationPort = {
          async notifyLandlordOfInterest() {
            throw new Error('Messaging channel unavailable');
          },
        };

        const useCase = new RegisterContactEventUseCase(repo, failingNotif);

        const dto = new ContactEventDto();
        dto.listingId = listingId;

        // The use case should complete successfully even if notification fails
        const result = await useCase.execute(dto, tenantUserId);

        // Allow fire-and-forget rejection to be caught
        await new Promise((r) => setTimeout(r, 10));

        expect(result).toEqual({ message: 'Solicitud de contacto registrada' });
      }),
      { numRuns: 100 },
    );
  });
});
