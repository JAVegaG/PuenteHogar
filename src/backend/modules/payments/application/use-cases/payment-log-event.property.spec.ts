// Feature: backend-database-implementation, Property 35: Cada evento de pago genera registro en payment_logs con campos requeridos
// Validates: Requirements 6.6

import * as fc from 'fast-check';
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import type { IPaymentNotificationPort } from '@modules/payments/domain/ports/notification.port';
import { ScheduledPaymentEntity } from '@modules/payments/domain/entities/scheduled-payment.entity';
import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';
import { PaymentWebhookDto } from '@modules/payments/application/dtos/payment-webhook.dto';

// ─── Arbitrary generators ────────────────────────────────────────────────────

function arbitraryPaymentEvent(): fc.Arbitrary<PaymentWebhookDto> {
  return fc.record({
    scheduledPaymentId: fc.uuid(),
    externalTransactionId: fc.uuid(),
    status: fc.constantFrom('APPROVED' as const, 'REJECTED' as const),
    amount: fc.float({ min: 1, max: 50_000_000, noNaN: true, noDefaultInfinity: true }),
    currency: fc.constantFrom('COP', 'USD'),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeScheduledPayment(id: string): ScheduledPaymentEntity {
  return new ScheduledPaymentEntity(id, 'lease-001', 1_000_000, 'COP', new Date(), 'PENDING');
}

function makeMockRepo(scheduledPayment: ScheduledPaymentEntity): jest.Mocked<IPaymentRepository> {
  let createdPaymentId = 0;
  return {
    persistRawEvent: jest.fn().mockResolvedValue(undefined),
    findScheduledPaymentById: jest.fn().mockResolvedValue(scheduledPayment),
    findPaymentByIdempotencyKey: jest.fn().mockResolvedValue(null),
    createPayment: jest.fn().mockImplementation((data) =>
      Promise.resolve(
        new PaymentEntity(
          `payment-${++createdPaymentId}`,
          data.scheduledPaymentId,
          data.amount,
          data.currency,
          data.idempotencyKey,
          new Date(),
        ),
      ),
    ),
    updateScheduledPaymentStatus: jest.fn().mockResolvedValue(undefined),
    logPaymentEvent: jest.fn().mockResolvedValue(undefined),
    getPaymentHistoryForUser: jest.fn(),
    getLeaseUserIds: jest.fn().mockResolvedValue({
      landlordUserId: 'landlord-001',
      tenantUserId: 'tenant-001',
    }),
    findScheduledPaymentsByLeaseId: jest.fn(),
    findPaymentStatusByName: jest.fn(),
  };
}

function makeMockNotification(): jest.Mocked<IPaymentNotificationPort> {
  return {
    notifyPaymentReceived: jest.fn().mockResolvedValue(undefined),
  };
}

function buildUseCase(
  repo: jest.Mocked<IPaymentRepository>,
  notification: jest.Mocked<IPaymentNotificationPort>,
): HandlePaymentWebhookUseCase {
  return new HandlePaymentWebhookUseCase(repo, notification);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property 35: Cada evento de pago genera registro en payment_logs con campos requeridos', () => {

  /**
   * Property 35a: For any payment webhook (APPROVED or REJECTED), the use case
   * always calls logPaymentEvent exactly once — every event generates a log entry.
   *
   * Validates: Req 6.6 — each payment event generates a log record
   */
  it('Property 35 — every webhook event generates exactly one payment log entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          expect(repo.logPaymentEvent).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 35b: For any payment webhook, the log entry contains a valid
   * paymentId (non-empty string) linking the log to the Payment record.
   *
   * Validates: Req 6.6 — log has payment reference
   */
  it('Property 35 — log entry contains a valid paymentId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          const [paymentId] = repo.logPaymentEvent.mock.calls[0];
          expect(typeof paymentId).toBe('string');
          expect(paymentId.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 35c: For any payment webhook, the log entry status matches
   * the webhook outcome — PAID for APPROVED, REJECTED for REJECTED.
   *
   * Validates: Req 6.6 — log records the correct status
   */
  it('Property 35 — log entry status matches webhook outcome (PAID or REJECTED)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          const [, status] = repo.logPaymentEvent.mock.calls[0];
          const expectedStatus = webhookDto.status === 'APPROVED' ? 'PAID' : 'REJECTED';
          expect(status).toBe(expectedStatus);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 35d: For any payment webhook, the log entry includes a platform
   * identifier indicating the source of the event.
   *
   * Validates: Req 6.6 — log includes platform for traceability
   */
  it('Property 35 — log entry includes platform identifier', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          const [, , platform] = repo.logPaymentEvent.mock.calls[0];
          expect(typeof platform).toBe('string');
          expect(platform!.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 35e: For any payment webhook, the log entry data always contains
   * the externalTransactionId for full traceability.
   *
   * Validates: Req 6.6 — log data includes transaction reference
   */
  it('Property 35 — log entry data contains externalTransactionId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          const [, , , data] = repo.logPaymentEvent.mock.calls[0];
          expect(data).toBeDefined();
          expect(data!.externalTransactionId).toBe(webhookDto.externalTransactionId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 35f: For any APPROVED payment webhook, the log entry data
   * includes amount, currency and paidAt timestamp in addition to the
   * externalTransactionId — full metadata for financial traceability.
   *
   * Validates: Req 6.6 — PAID log has complete financial metadata
   */
  it('Property 35 — APPROVED log entry includes amount, currency and paidAt', async () => {
    const approvedEvent = (): fc.Arbitrary<PaymentWebhookDto> =>
      fc.record({
        scheduledPaymentId: fc.uuid(),
        externalTransactionId: fc.uuid(),
        status: fc.constant('APPROVED' as const),
        amount: fc.float({ min: 1, max: 50_000_000, noNaN: true, noDefaultInfinity: true }),
        currency: fc.constantFrom('COP', 'USD'),
      });

    await fc.assert(
      fc.asyncProperty(
        approvedEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          const [, status, , data] = repo.logPaymentEvent.mock.calls[0];
          expect(status).toBe('PAID');
          expect(data).toBeDefined();
          expect(data!.amount).toBe(webhookDto.amount);
          expect(data!.currency).toBe(webhookDto.currency);
          expect(typeof data!.paidAt).toBe('string');
          // paidAt must be a valid ISO date string
          expect(new Date(data!.paidAt as string).toISOString()).toBe(data!.paidAt);
        },
      ),
      { numRuns: 100 },
    );
  });
});
