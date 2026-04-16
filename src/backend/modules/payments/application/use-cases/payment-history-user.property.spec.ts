// Feature: backend-database-implementation, Property 37: Historial de pagos retorna solo pagos del usuario solicitante, ordenados por fecha desc
// Validates: Requirements 6.8

import * as fc from 'fast-check';
import { GetPaymentHistoryUseCase } from './get-payment-history.use-case';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import { ScheduledPaymentEntity } from '@modules/payments/domain/entities/scheduled-payment.entity';
import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';

// ─── Arbitrary generators ────────────────────────────────────────────────────

function arbitraryUserId(): fc.Arbitrary<string> {
  return fc.uuid();
}

function arbitraryScheduledPayment(
  leaseId: string,
  overrides?: { dueDate?: Date },
): fc.Arbitrary<{ scheduledPayment: ScheduledPaymentEntity; payment: PaymentEntity | null }> {
  return fc.record({
    id: fc.uuid(),
    amount: fc.float({ min: 100, max: 50_000_000, noNaN: true, noDefaultInfinity: true }),
    currency: fc.constantFrom('COP', 'USD'),
    status: fc.constantFrom('PENDING', 'PAID', 'PROCESSING', 'REJECTED'),
    hasPayment: fc.boolean(),
  }).map(({ id, amount, currency, status, hasPayment }) => {
    const dueDate = overrides?.dueDate ?? new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const sp = new ScheduledPaymentEntity(id, leaseId, amount, currency, dueDate, status);
    const payment = hasPayment
      ? new PaymentEntity(`pay-${id}`, id, amount, currency, `desc-${id}`, new Date())
      : null;
    return { scheduledPayment: sp, payment };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockRepo(
  userPayments: Map<string, { scheduledPayment: ScheduledPaymentEntity; payment: PaymentEntity | null }[]>,
): jest.Mocked<IPaymentRepository> {
  return {
    persistRawEvent: jest.fn(),
    findScheduledPaymentById: jest.fn(),
    findPaymentByIdempotencyKey: jest.fn(),
    createPayment: jest.fn(),
    updateScheduledPaymentStatus: jest.fn(),
    logPaymentEvent: jest.fn(),
    findScheduledPaymentsByLeaseId: jest.fn(),
    findPaymentStatusByName: jest.fn(),
    getLeaseUserIds: jest.fn(),
    getPaymentHistoryForUser: jest.fn().mockImplementation((userId: string) =>
      Promise.resolve(userPayments.get(userId) ?? []),
    ),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property 37: Historial de pagos retorna solo pagos del usuario solicitante, ordenados por fecha desc', () => {

  /**
   * Property 37a: For any requesting user, the payment history contains
   * only payments belonging to that user — never payments from other users.
   *
   * Validates: Req 6.8 — returns only payments associated with the requesting user's contracts
   */
  it('Property 37 — payment history returns only payments belonging to the requesting user', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryUserId(),
        fc.array(arbitraryScheduledPayment('lease-user-a'), { minLength: 1, maxLength: 5 }),
        fc.array(arbitraryScheduledPayment('lease-user-b'), { minLength: 1, maxLength: 5 }),
        async (userA, userB, paymentsA, paymentsB) => {
          // Ensure distinct users
          fc.pre(userA !== userB);

          const userPayments = new Map<string, typeof paymentsA>();
          userPayments.set(userA, paymentsA);
          userPayments.set(userB, paymentsB);

          const repo = makeMockRepo(userPayments);
          const useCase = new GetPaymentHistoryUseCase(repo);

          const resultA = await useCase.execute(userA);
          const resultB = await useCase.execute(userB);

          // User A sees only their own payments
          expect(resultA).toHaveLength(paymentsA.length);
          const idsA = new Set(paymentsA.map((p) => p.scheduledPayment.id));
          for (const dto of resultA) {
            expect(idsA.has(dto.scheduledPaymentId)).toBe(true);
          }

          // User B sees only their own payments
          expect(resultB).toHaveLength(paymentsB.length);
          const idsB = new Set(paymentsB.map((p) => p.scheduledPayment.id));
          for (const dto of resultB) {
            expect(idsB.has(dto.scheduledPaymentId)).toBe(true);
          }

          // No overlap — user A's results don't contain user B's payment IDs
          for (const dto of resultA) {
            expect(idsB.has(dto.scheduledPaymentId)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 37b: The payment history is always sorted by dueDate descending —
   * each element's dueDate is >= the next element's dueDate.
   *
   * Validates: Req 6.8 — ordered by date descending
   */
  it('Property 37 — payment history is sorted by dueDate descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        fc.array(arbitraryScheduledPayment('lease-001'), { minLength: 2, maxLength: 20 }),
        async (userId, payments) => {
          const userPayments = new Map();
          userPayments.set(userId, payments);

          const repo = makeMockRepo(userPayments);
          const useCase = new GetPaymentHistoryUseCase(repo);

          const result = await useCase.execute(userId);

          // Verify descending order by dueDate
          for (let i = 0; i < result.length - 1; i++) {
            expect(result[i].dueDate.getTime()).toBeGreaterThanOrEqual(
              result[i + 1].dueDate.getTime(),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 37c: A user with no payments receives an empty array.
   *
   * Validates: Req 6.8 — graceful handling of empty history
   */
  it('Property 37 — user with no payments receives empty array', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        async (userId) => {
          const userPayments = new Map();
          // No payments for this user
          const repo = makeMockRepo(userPayments);
          const useCase = new GetPaymentHistoryUseCase(repo);

          const result = await useCase.execute(userId);

          expect(result).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 37d: The repository is always called with the exact userId
   * provided to the use case — no user ID substitution or leakage.
   *
   * Validates: Req 6.8 — only the requesting user's data is queried
   */
  it('Property 37 — repository is queried with the exact requesting userId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        async (userId) => {
          const repo = makeMockRepo(new Map());
          const useCase = new GetPaymentHistoryUseCase(repo);

          await useCase.execute(userId);

          expect(repo.getPaymentHistoryForUser).toHaveBeenCalledTimes(1);
          expect(repo.getPaymentHistoryForUser).toHaveBeenCalledWith(userId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
