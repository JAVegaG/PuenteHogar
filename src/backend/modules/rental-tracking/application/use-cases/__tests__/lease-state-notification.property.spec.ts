// Feature: backend-database-implementation, Property 42: Transición a CONTRACT_SIGNED o PAYMENT_RECEIVED dispara notificación a ambas partes
// Validates: Requirements 8.5

import * as fc from 'fast-check';
import type { ITrackingRepository } from '@modules/rental-tracking/domain/ports/tracking-repository.port';
import type { ITrackingNotificationPort } from '@modules/rental-tracking/domain/ports/notification.port';
import type { LeaseState } from '@modules/rental-tracking/domain/entities/lease-status.entity';
import { LeaseStatusHistoryEntity } from '@modules/rental-tracking/domain/entities/lease-status.entity';
import { TransitionLeaseStateUseCase } from '../transition-lease-state.use-case';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFY_STATES: LeaseState[] = ['CONTRACT_SIGNED', 'PAYMENT_RECEIVED'];
const NON_NOTIFY_STATES: LeaseState[] = ['PUBLISHED', 'CONTACT_INITIATED', 'CONTRACT_UPLOADED'];

// ─── Generators ───────────────────────────────────────────────────────────────

const arbitraryNotifyState = (): fc.Arbitrary<LeaseState> =>
  fc.constantFrom<LeaseState>(...NOTIFY_STATES);

const arbitraryNonNotifyState = (): fc.Arbitrary<LeaseState> =>
  fc.constantFrom<LeaseState>(...NON_NOTIFY_STATES);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockNotificationPort(): jest.Mocked<ITrackingNotificationPort> {
  return {
    notifyLeaseStateChanged: jest.fn().mockResolvedValue(undefined),
  };
}

function makeMockRepo(landlordId: string, tenantId: string): jest.Mocked<ITrackingRepository> {
  return {
    getCurrentStatus: jest.fn().mockResolvedValue(null),
    getStatusHistory: jest.fn().mockResolvedValue([]),
    recordTransition: jest.fn().mockImplementation((leaseId: string, state: LeaseState) =>
      Promise.resolve(new LeaseStatusHistoryEntity(`h-${Date.now()}`, leaseId, state, new Date())),
    ),
    getActiveLeasesForUser: jest.fn().mockResolvedValue([]),
    getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
    getTenantUserId: jest.fn().mockResolvedValue(tenantId),
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Property 42: Transición a CONTRACT_SIGNED o PAYMENT_RECEIVED dispara notificación a ambas partes', () => {

  describe('notification dispatched for CONTRACT_SIGNED and PAYMENT_RECEIVED', () => {
    it('notifies both landlord and tenant when transitioning to a notify state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          arbitraryNotifyState(),
          async (landlordId, tenantId, leaseId, newState) => {
            const repo = makeMockRepo(landlordId, tenantId);
            const notificationPort = makeMockNotificationPort();
            const useCase = new TransitionLeaseStateUseCase(repo, notificationPort);

            await useCase.execute({ leaseId, newState }, landlordId);

            // Allow fire-and-forget microtask to settle
            await new Promise((r) => setTimeout(r, 0));

            expect(notificationPort.notifyLeaseStateChanged).toHaveBeenCalledTimes(1);
            expect(notificationPort.notifyLeaseStateChanged).toHaveBeenCalledWith(
              landlordId,
              tenantId,
              leaseId,
              newState,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('no notification dispatched for non-notify states', () => {
    it('does NOT notify when transitioning to PUBLISHED, CONTACT_INITIATED, or CONTRACT_UPLOADED', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          arbitraryNonNotifyState(),
          async (landlordId, tenantId, leaseId, newState) => {
            const repo = makeMockRepo(landlordId, tenantId);
            const notificationPort = makeMockNotificationPort();
            const useCase = new TransitionLeaseStateUseCase(repo, notificationPort);

            await useCase.execute({ leaseId, newState }, landlordId);

            await new Promise((r) => setTimeout(r, 0));

            expect(notificationPort.notifyLeaseStateChanged).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('notification includes both party IDs regardless of who triggers the transition', () => {
    it('passes both landlordId and tenantId even when tenant triggers the transition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          arbitraryNotifyState(),
          async (landlordId, tenantId, leaseId, newState) => {
            const repo = makeMockRepo(landlordId, tenantId);
            const notificationPort = makeMockNotificationPort();
            const useCase = new TransitionLeaseStateUseCase(repo, notificationPort);

            // Tenant triggers the transition
            await useCase.execute({ leaseId, newState }, tenantId);

            await new Promise((r) => setTimeout(r, 0));

            expect(notificationPort.notifyLeaseStateChanged).toHaveBeenCalledWith(
              landlordId,
              tenantId,
              leaseId,
              newState,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('notification failure does not propagate to caller', () => {
    it('use case succeeds even when notification port rejects', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          arbitraryNotifyState(),
          async (landlordId, tenantId, leaseId, newState) => {
            const repo = makeMockRepo(landlordId, tenantId);
            const notificationPort = makeMockNotificationPort();
            notificationPort.notifyLeaseStateChanged.mockRejectedValue(new Error('channel down'));

            const useCase = new TransitionLeaseStateUseCase(repo, notificationPort);

            // Should NOT throw despite notification failure (fire-and-forget)
            await expect(
              useCase.execute({ leaseId, newState }, landlordId),
            ).resolves.toBeUndefined();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
