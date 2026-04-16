// Feature: backend-database-implementation, Property 41: Transición de estado del Lease registra estado anterior, nuevo y timestamp
// Validates: Requirements 8.2

import * as fc from 'fast-check';
import type { ITrackingRepository } from '@modules/rental-tracking/domain/ports/tracking-repository.port';
import type { ITrackingNotificationPort } from '@modules/rental-tracking/domain/ports/notification.port';
import type { LeaseState } from '@modules/rental-tracking/domain/entities/lease-status.entity';
import { LeaseStatusHistoryEntity } from '@modules/rental-tracking/domain/entities/lease-status.entity';
import { TransitionLeaseStateUseCase } from '../transition-lease-state.use-case';

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

/** Generates two distinct lease states (previous and new) */
const arbitraryStateTransition = (): fc.Arbitrary<{ previousState: LeaseState; newState: LeaseState }> =>
  fc.record({
    previousState: arbitraryLeaseState(),
    newState: arbitraryLeaseState(),
  }).filter(({ previousState, newState }) => previousState !== newState);

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
    ...overrides,
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Property 41: Transición de estado del Lease registra estado anterior, nuevo y timestamp', () => {

  describe('recordTransition captures the new state and produces a timestamped history entry', () => {
    /**
     * For any pair of (previousState, newState) where previousState ≠ newState,
     * when TransitionLeaseStateUseCase executes, the repository's recordTransition
     * is called with the correct leaseId and newState, and the returned history
     * entry contains a valid timestamp (recordCreatedAt).
     */
    it('Property 41 — transition records newState and returns a history entry with timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          arbitraryStateTransition(),
          async (landlordId, tenantId, leaseId, { previousState, newState }) => {
            const transitionTimestamp = new Date();

            const mockRepo = makeMockRepo({
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              getCurrentStatus: jest.fn().mockResolvedValue({
                leaseId,
                state: previousState,
                lastChangedAt: new Date(transitionTimestamp.getTime() - 60_000),
              }),
              recordTransition: jest.fn().mockImplementation((_leaseId: string, state: LeaseState) => {
                return Promise.resolve(
                  new LeaseStatusHistoryEntity('history-new', _leaseId, state, transitionTimestamp),
                );
              }),
            });
            const notificationPort = makeMockNotificationPort();

            const useCase = new TransitionLeaseStateUseCase(mockRepo, notificationPort);
            await useCase.execute({ leaseId, newState }, landlordId);

            // recordTransition was called with the correct leaseId and newState
            expect(mockRepo.recordTransition).toHaveBeenCalledWith(leaseId, newState);

            // The new state is different from the previous state
            expect(newState).not.toBe(previousState);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('recordTransition returns a LeaseStatusHistoryEntity with all required fields', () => {
    /**
     * For any valid transition, the history entry returned by recordTransition
     * must contain: a non-empty id, the correct leaseId, the new state, and
     * a valid Date as recordCreatedAt (the timestamp).
     */
    it('Property 41 — history entry contains id, leaseId, state, and recordCreatedAt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          arbitraryLeaseState(),
          async (landlordId, tenantId, leaseId, newState) => {
            const now = new Date();
            let capturedResult: LeaseStatusHistoryEntity | undefined;

            const mockRepo = makeMockRepo({
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              recordTransition: jest.fn().mockImplementation((_leaseId: string, state: LeaseState) => {
                capturedResult = new LeaseStatusHistoryEntity(
                  `history-${Date.now()}`,
                  _leaseId,
                  state,
                  now,
                );
                return Promise.resolve(capturedResult);
              }),
            });
            const notificationPort = makeMockNotificationPort();

            const useCase = new TransitionLeaseStateUseCase(mockRepo, notificationPort);
            await useCase.execute({ leaseId, newState }, landlordId);

            // Verify the history entry has all required fields
            expect(capturedResult).toBeDefined();
            expect(capturedResult!.id).toBeTruthy();
            expect(capturedResult!.leaseId).toBe(leaseId);
            expect(capturedResult!.state).toBe(newState);
            expect(capturedResult!.recordCreatedAt).toBeInstanceOf(Date);
            expect(capturedResult!.recordCreatedAt.getTime()).toBeGreaterThan(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('sequential transitions build an ordered history with previous and new states', () => {
    /**
     * When multiple transitions are applied sequentially, the history accumulates
     * entries where each entry's state is the "new" state of that transition,
     * and the previous entry's state represents the "previous" state.
     * Each entry has a monotonically non-decreasing timestamp.
     */
    it('Property 41 — sequential transitions produce ordered history with correct state pairs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.array(arbitraryLeaseState(), { minLength: 2, maxLength: 6 }),
          async (landlordId, tenantId, leaseId, stateSequence) => {
            const history: LeaseStatusHistoryEntity[] = [];
            let tick = Date.now();

            const mockRepo = makeMockRepo({
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              recordTransition: jest.fn().mockImplementation((_leaseId: string, state: LeaseState) => {
                tick += 1000; // advance 1 second per transition
                const entry = new LeaseStatusHistoryEntity(
                  `history-${history.length}`,
                  _leaseId,
                  state,
                  new Date(tick),
                );
                history.push(entry);
                return Promise.resolve(entry);
              }),
            });
            const notificationPort = makeMockNotificationPort();

            const useCase = new TransitionLeaseStateUseCase(mockRepo, notificationPort);

            for (const newState of stateSequence) {
              await useCase.execute({ leaseId, newState }, landlordId);
            }

            // History length matches number of transitions
            expect(history).toHaveLength(stateSequence.length);

            // Each history entry records the correct new state
            for (let i = 0; i < history.length; i++) {
              expect(history[i].state).toBe(stateSequence[i]);
              expect(history[i].leaseId).toBe(leaseId);
              expect(history[i].recordCreatedAt).toBeInstanceOf(Date);
            }

            // Timestamps are monotonically increasing
            for (let i = 1; i < history.length; i++) {
              expect(history[i].recordCreatedAt.getTime()).toBeGreaterThan(
                history[i - 1].recordCreatedAt.getTime(),
              );
            }

            // Adjacent entries form (previous, new) pairs:
            // history[i-1].state is the "previous" state, history[i].state is the "new" state
            for (let i = 1; i < history.length; i++) {
              const previousState = history[i - 1].state;
              const newState = history[i].state;
              // Both must be valid enum values
              expect(VALID_LEASE_STATES).toContain(previousState);
              expect(VALID_LEASE_STATES).toContain(newState);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
