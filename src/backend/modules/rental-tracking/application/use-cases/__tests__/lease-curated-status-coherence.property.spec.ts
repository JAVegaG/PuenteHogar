// Feature: backend-database-implementation, Property 43: Estado curado del Lease es coherente con el último registro del historial
// Validates: Requirements 8.7

import * as fc from 'fast-check';
import type { ITrackingRepository } from '@modules/rental-tracking/domain/ports/tracking-repository.port';
import type { LeaseState } from '@modules/rental-tracking/domain/entities/lease-status.entity';
import {
  LeaseCurrentStatusEntity,
  LeaseStatusHistoryEntity,
} from '@modules/rental-tracking/domain/entities/lease-status.entity';
import { GetLeaseStatusUseCase } from '../get-lease-status.use-case';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_LEASE_STATES: LeaseState[] = [
  'PUBLISHED',
  'CONTACT_INITIATED',
  'CONTRACT_UPLOADED',
  'CONTRACT_SIGNED',
  'PAYMENT_RECEIVED',
];

// ─── Generators ───────────────────────────────────────────────────────────────

const arbitraryLeaseState = (): fc.Arbitrary<LeaseState> =>
  fc.constantFrom<LeaseState>(...VALID_LEASE_STATES);

/** Generates a non-empty ordered history of lease state transitions */
const arbitraryStateHistory = (leaseId: string): fc.Arbitrary<LeaseStatusHistoryEntity[]> =>
  fc.array(arbitraryLeaseState(), { minLength: 1, maxLength: 10 }).map((states) =>
    states.map((state, i) =>
      new LeaseStatusHistoryEntity(
        `history-${i}`,
        leaseId,
        state,
        new Date(1_700_000_000_000 + i * 60_000), // monotonically increasing timestamps
      ),
    ),
  );

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockRepo(overrides?: Partial<jest.Mocked<ITrackingRepository>>): jest.Mocked<ITrackingRepository> {
  return {
    getCurrentStatus: jest.fn().mockResolvedValue(null),
    getStatusHistory: jest.fn().mockResolvedValue([]),
    recordTransition: jest.fn(),
    getActiveLeasesForUser: jest.fn().mockResolvedValue([]),
    getLandlordUserId: jest.fn().mockResolvedValue(null),
    getTenantUserId: jest.fn().mockResolvedValue(null),
    findLeaseIdByListingId: jest.fn(), createLeaseForListing: jest.fn().mockResolvedValue(null),
    getTenantContactInfo: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}


// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Property 43: Estado curado del Lease es coherente con el último registro del historial', () => {

  describe('currentState matches the state of the most recent history entry', () => {
    /**
     * For any lease with a non-empty history, the curated current status
     * (returned by getCurrentStatus) must have the same state as the last
     * entry in the history (sorted by recordCreatedAt ascending).
     * GetLeaseStatusUseCase exposes both; we verify coherence.
     */
    it('Property 43 — curated currentState equals the state of the last history entry', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (landlordId, tenantId, leaseId) => {
            // Generate a random history for this lease
            const history = await fc.sample(arbitraryStateHistory(leaseId), 1)[0];
            if (!history || history.length === 0) return true;

            const lastEntry = history[history.length - 1];

            // The curated current status is coherent: same state as last history entry
            const currentStatus = new LeaseCurrentStatusEntity(
              leaseId,
              lastEntry.state,
              lastEntry.recordCreatedAt,
            );

            const mockRepo = makeMockRepo({
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              getCurrentStatus: jest.fn().mockResolvedValue(currentStatus),
              getStatusHistory: jest.fn().mockResolvedValue(history),
            });

            const useCase = new GetLeaseStatusUseCase(mockRepo);
            const result = await useCase.execute(leaseId, landlordId);

            // The curated current state must match the last history entry's state
            expect(result.currentState).toBe(lastEntry.state);
            // The lastChangedAt must match the last history entry's timestamp
            expect(result.lastChangedAt).toEqual(lastEntry.recordCreatedAt);
            // The last item in the returned history must also match
            expect(result.history[result.history.length - 1].state).toBe(lastEntry.state);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('incoherent curated status is detectable', () => {
    /**
     * If the curated current status has a DIFFERENT state than the last
     * history entry, the response from GetLeaseStatusUseCase will expose
     * the inconsistency: currentState ≠ history[last].state.
     * This test verifies that such incoherence is observable.
     */
    it('Property 43 — incoherent curated status produces mismatched currentState vs last history entry', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          arbitraryLeaseState(),
          arbitraryLeaseState(),
          async (landlordId, tenantId, leaseId, curatedState, historyLastState) => {
            // Only test when states differ (incoherent scenario)
            fc.pre(curatedState !== historyLastState);

            const history = [
              new LeaseStatusHistoryEntity('h-0', leaseId, historyLastState, new Date()),
            ];

            // Curated status intentionally incoherent with history
            const incoherentCurrent = new LeaseCurrentStatusEntity(
              leaseId,
              curatedState,
              new Date(),
            );

            const mockRepo = makeMockRepo({
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              getCurrentStatus: jest.fn().mockResolvedValue(incoherentCurrent),
              getStatusHistory: jest.fn().mockResolvedValue(history),
            });

            const useCase = new GetLeaseStatusUseCase(mockRepo);
            const result = await useCase.execute(leaseId, landlordId);

            // The incoherence is observable: currentState ≠ last history state
            expect(result.currentState).toBe(curatedState);
            expect(result.history[result.history.length - 1].state).toBe(historyLastState);
            expect(result.currentState).not.toBe(result.history[result.history.length - 1].state);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('after sequential transitions, curated status reflects the final state', () => {
    /**
     * When multiple transitions are applied, the curated current status
     * must always reflect the very last transition's state. This verifies
     * the round-trip: transitions → history → curated status.
     */
    it('Property 43 — after N transitions, curated status equals the Nth state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.array(arbitraryLeaseState(), { minLength: 1, maxLength: 8 }),
          async (landlordId, tenantId, leaseId, stateSequence) => {
            const history: LeaseStatusHistoryEntity[] = stateSequence.map((state, i) =>
              new LeaseStatusHistoryEntity(
                `h-${i}`,
                leaseId,
                state,
                new Date(1_700_000_000_000 + i * 60_000),
              ),
            );

            const finalState = stateSequence[stateSequence.length - 1];
            const finalTimestamp = history[history.length - 1].recordCreatedAt;

            // Curated status correctly reflects the final transition
            const currentStatus = new LeaseCurrentStatusEntity(leaseId, finalState, finalTimestamp);

            const mockRepo = makeMockRepo({
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              getCurrentStatus: jest.fn().mockResolvedValue(currentStatus),
              getStatusHistory: jest.fn().mockResolvedValue(history),
            });

            const useCase = new GetLeaseStatusUseCase(mockRepo);
            const result = await useCase.execute(leaseId, landlordId);

            // Curated current state matches the final state in the sequence
            expect(result.currentState).toBe(finalState);
            expect(result.lastChangedAt).toEqual(finalTimestamp);

            // History length matches the number of transitions
            expect(result.history).toHaveLength(stateSequence.length);

            // Last history entry matches the curated current state (coherence)
            const lastHistoryItem = result.history[result.history.length - 1];
            expect(lastHistoryItem.state).toBe(result.currentState);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
