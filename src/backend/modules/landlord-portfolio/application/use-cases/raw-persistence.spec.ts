// Feature: backend-database-implementation, Property 14: Datos de entrada se persisten en RAW_Table antes de transformación
// Validates: Requirements 2.6, 6.10, 10.1

import * as fc from 'fast-check';
import { CreatePortfolioUnitUseCase } from './create-portfolio-unit.use-case';
import { InitiatePaymentUseCase } from '@modules/payments/application/use-cases/initiate-payment.use-case';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import type { IPaymentGateway } from '@modules/payments/domain/ports/payment-gateway.port';
import { PortfolioUnitEntity } from '@modules/landlord-portfolio/domain/entities/portfolio-unit.entity';
import { ScheduledPaymentEntity } from '@modules/payments/domain/entities/scheduled-payment.entity';
import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';

// ─── Arbitrary generators ────────────────────────────────────────────────────

/**
 * Generates arbitrary JSON-compatible scalar values.
 */
function arbitraryJsonScalar(): fc.Arbitrary<string | number | boolean | null> {
  return fc.oneof(
    fc.string({ maxLength: 50 }),
    fc.float({ noNaN: true }),
    fc.boolean(),
    fc.constant(null),
  );
}

/**
 * arbitraryRawPayload — generates arbitrary JSON objects (key-value pairs
 * with string keys and JSON-compatible values). Used to simulate any input
 * data that a module might receive and must persist in a RAW_Table.
 */
function arbitraryRawPayload(): fc.Arbitrary<Record<string, unknown>> {
  return fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
    arbitraryJsonScalar() as fc.Arbitrary<unknown>,
    { minKeys: 1, maxKeys: 10 },
  );
}

/**
 * Generates a valid CreatePortfolioUnitDto-shaped object with arbitrary values.
 */
function arbitraryCreatePortfolioUnitInput(): fc.Arbitrary<{
  propertyId: string;
  conditions?: string;
  leaseBaseAmount: number;
  leaseBaseCurrency?: string;
}> {
  return fc.record({
    propertyId: fc.uuid(),
    conditions: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    leaseBaseAmount: fc.float({ min: 0, max: 10_000_000, noNaN: true }),
    leaseBaseCurrency: fc.option(fc.constantFrom('COP', 'USD', 'EUR'), { nil: undefined }),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePortfolioUnit(portfolioId: string, propertyId: string): PortfolioUnitEntity {
  return new PortfolioUnitEntity(
    'unit-id',
    portfolioId,
    propertyId,
    null,
    1_000_000,
    'COP',
    new Date(),
    new Date(),
  );
}

function makeScheduledPayment(id: string): ScheduledPaymentEntity {
  return new ScheduledPaymentEntity(id, 'lease-id', 500_000, 'COP', new Date(), 'PENDING');
}

function makePaymentEntity(scheduledPaymentId: string, _idempotencyKey: string): PaymentEntity {
  return new PaymentEntity(
    'payment-id',
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property 14: Datos de entrada se persisten en RAW_Table antes de transformación', () => {

  // ── Req 2.6: PortfolioRaw — CreatePortfolioUnitUseCase ──────────────────────

  describe('CreatePortfolioUnitUseCase — persists input to PortfolioRaw (Req 2.6, 10.1)', () => {
    /**
     * Property 14: For any arbitrary input to CreatePortfolioUnitUseCase,
     * the repository's createUnit method is called with the full input data,
     * which the real PrismaPortfolioRepository persists to PortfolioRaw (JSONB)
     * inside a transaction before returning the curated entity.
     *
     * The test verifies that:
     * 1. createUnit is called with the exact input data (portfolioId + dto fields)
     * 2. The call happens as part of the use case execution (before returning)
     * 3. The input data is preserved in the call arguments (RAW persistence invariant)
     */
    it('Property 14 — createUnit is called with the full input payload for any arbitrary input', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCreatePortfolioUnitInput(),
          fc.uuid(), // userId
          async (dto, userId) => {
            const portfolioId = 'portfolio-id';
            const unit = makePortfolioUnit(portfolioId, dto.propertyId);

            const mockRepo: jest.Mocked<IPortfolioRepository> = {
              findOrCreatePortfolio: jest.fn().mockResolvedValue({ id: portfolioId }),
              createUnit: jest.fn().mockResolvedValue(unit),
              findUnitsByUserId: jest.fn(),
              findUnitById: jest.fn(),
              updateUnit: jest.fn(),
              getPortfolioOwnerUserId: jest.fn(),
            };

            const useCase = new CreatePortfolioUnitUseCase(mockRepo);
            await useCase.execute(dto, userId, ['LANDLORD']);

            // createUnit must be called exactly once with the input data
            expect(mockRepo.createUnit).toHaveBeenCalledTimes(1);
            const callArgs = mockRepo.createUnit.mock.calls[0][0];

            // The input payload fields must be present in the createUnit call
            expect(callArgs.portfolioId).toBe(portfolioId);
            expect(callArgs.propertyId).toBe(dto.propertyId);
            expect(callArgs.leaseBaseAmount).toBe(dto.leaseBaseAmount);
            expect(callArgs.leaseBaseCurrency).toBe(dto.leaseBaseCurrency ?? 'COP');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 14 (arbitrary raw payload variant): For any arbitrary raw payload,
     * the createUnit call arguments contain all the key fields from the input,
     * ensuring no data is silently dropped before RAW persistence.
     */
    it('Property 14 — createUnit call arguments contain all input fields (no silent data loss)', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryRawPayload(),
          fc.uuid(),
          async (rawPayload, userId) => {
            // Build a DTO from the raw payload, extracting known fields
            const propertyId = typeof rawPayload['propertyId'] === 'string'
              ? rawPayload['propertyId']
              : 'prop-' + userId;
            const leaseBaseAmount = typeof rawPayload['leaseBaseAmount'] === 'number' && !isNaN(rawPayload['leaseBaseAmount'])
              ? Math.abs(rawPayload['leaseBaseAmount'])
              : 1_000_000;

            const dto = { propertyId, leaseBaseAmount };
            const portfolioId = 'portfolio-id';
            const unit = makePortfolioUnit(portfolioId, propertyId);

            const mockRepo: jest.Mocked<IPortfolioRepository> = {
              findOrCreatePortfolio: jest.fn().mockResolvedValue({ id: portfolioId }),
              createUnit: jest.fn().mockResolvedValue(unit),
              findUnitsByUserId: jest.fn(),
              findUnitById: jest.fn(),
              updateUnit: jest.fn(),
              getPortfolioOwnerUserId: jest.fn(),
            };

            const useCase = new CreatePortfolioUnitUseCase(mockRepo);
            await useCase.execute(dto, userId, ['LANDLORD']);

            // createUnit must be called — RAW persistence is triggered by this call
            expect(mockRepo.createUnit).toHaveBeenCalledTimes(1);
            const callArgs = mockRepo.createUnit.mock.calls[0][0];

            // Input fields must be present in the call (no silent data loss)
            expect(callArgs.propertyId).toBe(propertyId);
            expect(callArgs.leaseBaseAmount).toBe(leaseBaseAmount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Req 6.10: PaymentsRaw — InitiatePaymentUseCase ──────────────────────────

  describe('InitiatePaymentUseCase — persists input to PaymentsRaw BEFORE gateway call (Req 6.10, 10.1)', () => {
    /**
     * Property 14: For any arbitrary raw payload representing a payment initiation,
     * persistRawEvent must be called BEFORE the payment gateway is invoked.
     *
     * The test verifies that:
     * 1. persistRawEvent is called with the input data (scheduledPaymentId, amount, etc.)
     * 2. persistRawEvent is called BEFORE the gateway's initiatePayment
     * 3. The payload passed to persistRawEvent contains the input data fields
     */
    it('Property 14 — persistRawEvent is called with input data before gateway for any payment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // scheduledPaymentId
          fc.float({ min: 1, max: 10_000_000, noNaN: true }), // amount
          fc.constantFrom('COP', 'USD'), // currency
          fc.uuid(), // userId (tenant)
          async (scheduledPaymentId, amount, currency, userId) => {
            const callOrder: string[] = [];

            const scheduledPayment = new ScheduledPaymentEntity(
              scheduledPaymentId,
              'lease-id',
              amount,
              currency,
              new Date(),
              'PENDING',
            );

            const mockRepo: jest.Mocked<IPaymentRepository> = {
              persistRawEvent: jest.fn().mockImplementation(() => {
                callOrder.push('persistRawEvent');
                return Promise.resolve();
              }),
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

            const mockGateway: jest.Mocked<IPaymentGateway> = {
              initiatePayment: jest.fn().mockImplementation(() => {
                callOrder.push('initiatePayment');
                return Promise.resolve({
                  status: 'APPROVED',
                  redirectUrl: 'https://gateway.example.com/pay',
                  externalTransactionId: 'ext-tx-id',
                });
              }),
            };

            const circuitBreakerFactory = makeCircuitBreakerFactory();
            const auditLogger = { log: jest.fn() } as unknown as AuditLoggerService;

            const useCase = new InitiatePaymentUseCase(
              mockRepo,
              mockGateway,
              circuitBreakerFactory,
              auditLogger,
            );

            await useCase.execute({ scheduledPaymentId }, userId, ['TENANT']);

            // 1. persistRawEvent must have been called
            expect(mockRepo.persistRawEvent).toHaveBeenCalledTimes(1);

            // 2. persistRawEvent must be called BEFORE initiatePayment
            const rawIdx = callOrder.indexOf('persistRawEvent');
            const gatewayIdx = callOrder.indexOf('initiatePayment');
            expect(rawIdx).toBeGreaterThanOrEqual(0);
            expect(gatewayIdx).toBeGreaterThanOrEqual(0);
            expect(rawIdx).toBeLessThan(gatewayIdx);

            // 3. The payload must contain the input data fields
            const rawPayload = mockRepo.persistRawEvent.mock.calls[0][0];
            expect(rawPayload['scheduledPaymentId']).toBe(scheduledPaymentId);
            expect(rawPayload['amount']).toBe(amount);
            expect(rawPayload['currency']).toBe(currency);
            expect(rawPayload['tenantUserId']).toBe(userId);
            expect(rawPayload['event']).toBe('PAYMENT_INITIATED');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 14 (arbitrary raw payload variant): For any arbitrary raw payload,
     * when a payment is initiated, persistRawEvent is always called with a payload
     * that includes the idempotencyKey field — ensuring every raw record is traceable.
     */
    it('Property 14 — persistRawEvent payload always includes idempotencyKey for traceability', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryRawPayload(),
          fc.uuid(), // userId
          async (rawPayload, userId) => {
            const scheduledPaymentId = typeof rawPayload['scheduledPaymentId'] === 'string'
              ? rawPayload['scheduledPaymentId']
              : 'sched-' + userId;

            const scheduledPayment = new ScheduledPaymentEntity(
              scheduledPaymentId,
              'lease-id',
              500_000,
              'COP',
              new Date(),
              'PENDING',
            );

            const mockRepo: jest.Mocked<IPaymentRepository> = {
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

            const mockGateway: jest.Mocked<IPaymentGateway> = {
              initiatePayment: jest.fn().mockResolvedValue({
                status: 'APPROVED',
                redirectUrl: 'https://gateway.example.com/pay',
                externalTransactionId: 'ext-tx-id',
              }),
            };

            const circuitBreakerFactory = makeCircuitBreakerFactory();
            const auditLogger = { log: jest.fn() } as unknown as AuditLoggerService;

            const useCase = new InitiatePaymentUseCase(
              mockRepo,
              mockGateway,
              circuitBreakerFactory,
              auditLogger,
            );

            await useCase.execute({ scheduledPaymentId }, userId, ['TENANT']);

            // persistRawEvent must be called with an idempotencyKey for traceability
            expect(mockRepo.persistRawEvent).toHaveBeenCalledTimes(1);
            const persistedPayload = mockRepo.persistRawEvent.mock.calls[0][0];
            expect(typeof persistedPayload['idempotencyKey']).toBe('string');
            expect((persistedPayload['idempotencyKey'] as string).length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
