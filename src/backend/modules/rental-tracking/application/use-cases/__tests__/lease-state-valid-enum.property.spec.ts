// Feature: backend-database-implementation, Property 40: Estado actual del Lease siempre es un valor válido del enum
// Validates: Requirements 8.1

import * as fc from 'fast-check';
import type { ITrackingRepository, ActiveLeaseSummary } from '@modules/rental-tracking/domain/ports/tracking-repository.port';
import type { ITrackingNotificationPort } from '@modules/rental-tracking/domain/ports/notification.port';
import type { LeaseState } from '@modules/rental-tracking/domain/entities/lease-status.entity';
import { TransitionLeaseStateUseCase } from '../transition-lease-state.use-case';
import { GetLeaseStatusUseCase } from '../get-lease-status.use-case';
import { GetActiveLeasesSummaryUseCase } from '../get-active-leases-summary.use-case';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_LEASE_STATES: LeaseState[] = [
  'PUBLISHED',
  'CONTACT_INITIATED',
  'CONTRACT_UPLOADED',
  'CONTRACT_SIGNED',
  'PAYMENT_RECEIVED',
];

// ─── Generators ───────────────────────────────────────────────────────────────

/** Generates a random valid LeaseState */
const arbitraryLeaseState = (): fc.Arbitrary<LeaseState> =>
  fc.constantFrom<LeaseState>(...VALID_LEASE_STATES);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockNotificationPort(): jest.Mocked<ITrackingNotificationPort> {
  return {
    notifyLeaseStateChanged: jest.fn().mockResolvedValue(undefined),
  };
}

function makeMockRepo(overrides?: Partial<jest.Mocked<ITrackingRepository>>): jest.Mocked<ITrackingRepository> {
  return {
    getCurrentStatus: jest.fn().mockResolvedValue(null),
    getStatusHistory: jest.fn().mockResolvedValue([]),
    recordTransition: jest.fn(),
    getActiveLeasesForUser: jest.fn().mockResolvedValue([]),
    getLandlordUserId: jest.fn().mockResolvedValue(null),
    getTenantUserId: jest.fn().mockResolvedValue(null),
    findLeaseIdByListingId: jest.fn().mockResolvedValue(null),
    getTenantContactInfo: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Property 40: Estado actual del Lease siempre es un valor válido del enum', () => {

  describe('TransitionLeaseStateUseCase — state recorded is always a valid enum value', () => {
    /**
     * For any valid LeaseState, when TransitionLeaseStateUseCase records a transition,
     * the state passed to the repository is always one of the valid enum values.
     */
    it('Property 40 — recordTransition is called with a valid LeaseState for any arbitrary state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          arbitraryLeaseState(),
          async (landlordId, tenantId, leaseId, newState) => {
            let capturedState: string | undefined;

            const mockRepo = makeMockRepo({
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              recordTransition: jest.fn().mockImplementation((_leaseId: string, state: LeaseState) => {
                capturedState = state;
                return Promise.resolve({
                  id: 'history-1',
                  leaseId: _leaseId,
                  state,
                  recordCreatedAt: new Date(),
                });
              }),
            });
            const notificationPort = makeMockNotificationPort();

            const useCase = new TransitionLeaseStateUseCase(mockRepo, notificationPort);
            await useCase.execute({ leaseId, newState }, landlordId);

            // The state persisted must be a valid enum value
            expect(VALID_LEASE_STATES).toContain(capturedState);
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('GetLeaseStatusUseCase — currentState is always a valid enum value', () => {
    /**
     * For any valid LeaseState stored as the current status, GetLeaseStatusUseCase
     * must return that state unchanged — always a valid enum value.
     */
    it('Property 40 — returned currentState is always a valid LeaseState', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          arbitraryLeaseState(),
          async (landlordId, tenantId, leaseId, currentState) => {
            const mockRepo = makeMockRepo({
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              getCurrentStatus: jest.fn().mockResolvedValue({
                leaseId,
                state: currentState,
                lastChangedAt: new Date(),
              }),
              getStatusHistory: jest.fn().mockResolvedValue([
                {
                  id: 'h-1',
                  leaseId,
                  state: currentState,
                  recordCreatedAt: new Date(),
                },
              ]),
            });

            const useCase = new GetLeaseStatusUseCase(mockRepo);
            const result = await useCase.execute(leaseId, landlordId);

            // The returned currentState must be a valid enum value
            expect(VALID_LEASE_STATES).toContain(result.currentState);
            // History items must also contain valid states
            for (const item of result.history) {
              expect(VALID_LEASE_STATES).toContain(item.state);
            }
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('GetActiveLeasesSummaryUseCase — all summary states are valid enum values', () => {
    /**
     * For any list of active leases with arbitrary valid states, the summary
     * returned must contain only valid LeaseState values.
     */
    it('Property 40 — all currentState values in summary are valid LeaseState', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(
            fc.record({
              leaseId: fc.uuid(),
              propertyName: fc.string({ minLength: 1, maxLength: 50 }),
              currentState: arbitraryLeaseState(),
              lastChangedAt: fc.date(),
            }),
            { minLength: 0, maxLength: 10 },
          ),
          async (userId, summaries) => {
            const mockRepo = makeMockRepo({
              getActiveLeasesForUser: jest.fn().mockResolvedValue(
                summaries.map((s) => ({
                  leaseId: s.leaseId,
                  propertyName: s.propertyName,
                  currentState: s.currentState,
                  lastChangedAt: s.lastChangedAt,
                } satisfies ActiveLeaseSummary)),
              ),
            });

            const useCase = new GetActiveLeasesSummaryUseCase(mockRepo);
            const result = await useCase.execute(userId);

            // Every returned state must be a valid enum value
            for (const dto of result) {
              expect(VALID_LEASE_STATES).toContain(dto.currentState);
            }
            // Count must match input
            expect(result).toHaveLength(summaries.length);
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Exhaustive — every LeaseState value is accepted by the system', () => {
    /**
     * Each of the 5 valid states must be accepted by TransitionLeaseStateUseCase
     * without throwing. This ensures the enum is complete and no valid state is rejected.
     */
    it.each(VALID_LEASE_STATES)(
      'Property 40 — state "%s" is accepted by TransitionLeaseStateUseCase',
      async (state) => {
        const landlordId = '00000000-0000-4000-8000-000000000001';
        const tenantId = '00000000-0000-4000-8000-000000000002';
        const leaseId = '00000000-0000-4000-8000-000000000003';

        const mockRepo = makeMockRepo({
          getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
          getTenantUserId: jest.fn().mockResolvedValue(tenantId),
          recordTransition: jest.fn().mockResolvedValue({
            id: 'h-1',
            leaseId,
            state,
            recordCreatedAt: new Date(),
          }),
        });
        const notificationPort = makeMockNotificationPort();

        const useCase = new TransitionLeaseStateUseCase(mockRepo, notificationPort);
        await expect(
          useCase.execute({ leaseId, newState: state }, landlordId),
        ).resolves.not.toThrow();

        expect(mockRepo.recordTransition).toHaveBeenCalledWith(leaseId, state);
      },
    );
  });
});
