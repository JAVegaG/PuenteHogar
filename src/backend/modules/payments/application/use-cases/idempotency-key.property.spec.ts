// Feature: backend-database-implementation, Property 32: Idempotency Key única por transacción de pago previene duplicados
// Validates: Requirements 6.1, 6.2

import * as fc from 'fast-check';
import { InitiatePaymentUseCase } from './initiate-payment.use-case';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import type { IPaymentGateway } from '@modules/payments/domain/ports/payment-gateway.port';
import { ScheduledPaymentEntity } from '@modules/payments/domain/entities/scheduled-payment.entity';
import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeScheduledPayment(
  id: string,
  amount: number,
  currency: string,
): ScheduledPaymentEntity {
  return new ScheduledPaymentEntity(id, 'lease-id', amount, currency, new Date(), 'PENDING');
}

function makePaymentEntity(
  scheduledPaymentId: string,
  idempotencyKey: string,
): PaymentEntity {
  return new PaymentEntity(
    'payment-' + idempotencyKey.slice(0, 8),
    scheduledPaymentId,
    500_000,
    'COP',
    null,
    new Date(),
  );
}

function makeCircuitBreakerFactory(): CircuitBreakerFactory {
  return {
    create: jest.fn().mockReturnValue({
      getState: jest.fn().mockReturnValue('CLOSED'),
      execute: jest.fn().mockImplementation(async (fn: () => Promise<void>) => {
        await fn();
      }),
    }),
  } as unknown as CircuitBreakerFactory;
}

function makeMockRepo(
  scheduledPayment: ScheduledPaymentEntity,
): jest.Mocked<IPaymentRepository> {
  return {
    persistRawEvent: jest.fn().mockResolvedValue(undefined),
    findScheduledPaymentById: jest.fn().mockResolvedValue(scheduledPayment),
    findPaymentByIdempotencyKey: jest.fn().mockResolvedValue(null),
    createPayment: jest.fn().mockImplementation((data) =>
      Promise.resolve(makePaymentEntity(data.scheduledPaymentId, data.idempotencyKey)),
    ),
    updateScheduledPaymentStatus: jest.fn().mockResolvedValue(undefined),
    logPaymentEvent: jest.fn().mockResolvedValue(undefined),
    getPaymentHistoryForUser: jest.fn(),
    getLeaseUserIds: jest.fn(),
    findScheduledPaymentsByLeaseId: jest.fn(),
    findPaymentStatusByName: jest.fn(),
  };
}

function makeMockGateway(): jest.Mocked<IPaymentGateway> {
  return {
    initiatePayment: jest.fn().mockResolvedValue({
      status: 'APPROVED',
      redirectUrl: 'https://gateway.example.com/pay',
      externalTransactionId: 'ext-tx-id',
    }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property 32: Idempotency Key única por transacción de pago previene duplicados', () => {

  /**
   * Property 32a: For any valid payment initiation, the use case generates
   * a unique idempotency key and passes it to the payment gateway.
   * Multiple invocations for the same scheduled payment produce distinct keys.
   *
   * Validates: Req 6.1 — each payment initiation generates a unique Idempotency_Key
   */
  it('Property 32 — each payment initiation generates a unique idempotency key passed to the gateway', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // scheduledPaymentId
        fc.float({ min: 1, max: 10_000_000, noNaN: true }), // amount
        fc.constantFrom('COP', 'USD'), // currency
        fc.uuid(), // userId
        async (scheduledPaymentId, amount, currency, userId) => {
          const scheduledPayment = makeScheduledPayment(scheduledPaymentId, amount, currency);
          const collectedKeys: string[] = [];

          // Execute the use case twice for the same scheduled payment
          for (let i = 0; i < 2; i++) {
            const mockRepo = makeMockRepo(scheduledPayment);
            const mockGateway = makeMockGateway();
            const circuitBreakerFactory = makeCircuitBreakerFactory();
            const auditLogger = { log: jest.fn() } as unknown as AuditLoggerService;

            const useCase = new InitiatePaymentUseCase(
              mockRepo,
              mockGateway,
              circuitBreakerFactory,
              auditLogger,
            );

            const result = await useCase.execute(
              { scheduledPaymentId },
              userId,
              ['TENANT'],
            );

            // The result must contain an idempotency key
            expect(typeof result.idempotencyKey).toBe('string');
            expect(result.idempotencyKey.length).toBeGreaterThan(0);

            // The gateway must have received the idempotency key
            expect(mockGateway.initiatePayment).toHaveBeenCalledTimes(1);
            const gatewayCall = mockGateway.initiatePayment.mock.calls[0][0];
            expect(gatewayCall.idempotencyKey).toBe(result.idempotencyKey);

            collectedKeys.push(result.idempotencyKey);
          }

          // The two keys must be distinct (uniqueness property)
          expect(collectedKeys[0]).not.toBe(collectedKeys[1]);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 32b: If a payment with the given idempotency key already exists
   * in the repository, the use case returns early without invoking the gateway
   * or creating a duplicate payment record.
   *
   * Validates: Req 6.2 — Idempotency_Key prevents duplicate transactions
   */
  it('Property 32 — existing idempotency key prevents duplicate gateway call and payment creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // scheduledPaymentId
        fc.float({ min: 1, max: 10_000_000, noNaN: true }), // amount
        fc.constantFrom('COP', 'USD'), // currency
        fc.uuid(), // userId
        async (scheduledPaymentId, amount, currency, userId) => {
          const scheduledPayment = makeScheduledPayment(scheduledPaymentId, amount, currency);
          const mockRepo = makeMockRepo(scheduledPayment);
          const mockGateway = makeMockGateway();
          const circuitBreakerFactory = makeCircuitBreakerFactory();
          const auditLogger = { log: jest.fn() } as unknown as AuditLoggerService;

          // First call — normal flow, captures the generated idempotency key
          const useCase = new InitiatePaymentUseCase(
            mockRepo,
            mockGateway,
            circuitBreakerFactory,
            auditLogger,
          );

          const firstResult = await useCase.execute(
            { scheduledPaymentId },
            userId,
            ['TENANT'],
          );

          const generatedKey = firstResult.idempotencyKey;

          // Now simulate that the key already exists in the repository
          const existingPayment = makePaymentEntity(scheduledPaymentId, generatedKey);
          const mockRepo2 = makeMockRepo(scheduledPayment);
          mockRepo2.findPaymentByIdempotencyKey.mockResolvedValue(existingPayment);

          const mockGateway2 = makeMockGateway();
          const circuitBreakerFactory2 = makeCircuitBreakerFactory();
          const auditLogger2 = { log: jest.fn() } as unknown as AuditLoggerService;

          const useCase2 = new InitiatePaymentUseCase(
            mockRepo2,
            mockGateway2,
            circuitBreakerFactory2,
            auditLogger2,
          );

          // The use case generates a NEW key internally (randomUUID), so
          // findPaymentByIdempotencyKey will be called with that new key.
          // To properly test the idempotency guard, we need to make the
          // repository return an existing payment for ANY key lookup.
          mockRepo2.findPaymentByIdempotencyKey.mockResolvedValue(existingPayment);

          const secondResult = await useCase2.execute(
            { scheduledPaymentId },
            userId,
            ['TENANT'],
          );

          // The use case should return early with "already processed" message
          expect(secondResult.message).toBe('Pago ya procesado');

          // The gateway must NOT have been called (no duplicate transaction)
          expect(mockGateway2.initiatePayment).not.toHaveBeenCalled();

          // No new payment record should be created
          expect(mockRepo2.createPayment).not.toHaveBeenCalled();

          // No raw event should be persisted for the duplicate
          expect(mockRepo2.persistRawEvent).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 32c: The idempotency key generated by the use case is always
   * included in the raw event persisted to PaymentsRaw, ensuring traceability
   * between the raw record and the gateway request.
   *
   * Validates: Req 6.1, 6.2 — idempotency key links raw event to gateway call
   */
  it('Property 32 — idempotency key is consistent across raw event, gateway call, and payment record', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // scheduledPaymentId
        fc.float({ min: 1, max: 10_000_000, noNaN: true }), // amount
        fc.constantFrom('COP', 'USD'), // currency
        fc.uuid(), // userId
        async (scheduledPaymentId, amount, currency, userId) => {
          const scheduledPayment = makeScheduledPayment(scheduledPaymentId, amount, currency);
          const mockRepo = makeMockRepo(scheduledPayment);
          const mockGateway = makeMockGateway();
          const circuitBreakerFactory = makeCircuitBreakerFactory();
          const auditLogger = { log: jest.fn() } as unknown as AuditLoggerService;

          const useCase = new InitiatePaymentUseCase(
            mockRepo,
            mockGateway,
            circuitBreakerFactory,
            auditLogger,
          );

          const result = await useCase.execute(
            { scheduledPaymentId },
            userId,
            ['TENANT'],
          );

          const key = result.idempotencyKey;

          // 1. Raw event must contain the same idempotency key
          expect(mockRepo.persistRawEvent).toHaveBeenCalledTimes(1);
          const rawPayload = mockRepo.persistRawEvent.mock.calls[0][0];
          expect(rawPayload['idempotencyKey']).toBe(key);

          // 2. Gateway must receive the same idempotency key
          expect(mockGateway.initiatePayment).toHaveBeenCalledTimes(1);
          const gatewayRequest = mockGateway.initiatePayment.mock.calls[0][0];
          expect(gatewayRequest.idempotencyKey).toBe(key);

          // 3. Payment record must be created with the same idempotency key
          expect(mockRepo.createPayment).toHaveBeenCalledTimes(1);
          const createPaymentData = mockRepo.createPayment.mock.calls[0][0];
          expect(createPaymentData.idempotencyKey).toBe(key);
        },
      ),
      { numRuns: 100 },
    );
  });
});
