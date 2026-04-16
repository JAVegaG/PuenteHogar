// Feature: backend-database-implementation, Property 33: Pago confirmado actualiza estado a PAID con metadatos completos
// Validates: Requirements 6.3

import * as fc from 'fast-check';
import { NotFoundException } from '@nestjs/common';
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
    status: fc.constant('APPROVED' as const),
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

describe('Property 33: Pago confirmado actualiza estado a PAID con metadatos completos', () => {

  /**
   * Property 33a: For any APPROVED payment webhook, the use case updates
   * the ScheduledPayment status to PAID.
   *
   * Validates: Req 6.3 — confirmed payment updates ScheduledPayment to PAID
   */
  it('Property 33 — APPROVED webhook updates ScheduledPayment status to PAID', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          // ScheduledPayment must be updated to PAID
          expect(repo.updateScheduledPaymentStatus).toHaveBeenCalledTimes(1);
          expect(repo.updateScheduledPaymentStatus).toHaveBeenCalledWith(
            webhookDto.scheduledPaymentId,
            'PAID',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 33b: For any APPROVED payment webhook, the use case creates
   * a Payment record with the external transaction ID, amount and currency.
   *
   * Validates: Req 6.3 — registers external transaction ID, amount and payment date
   */
  it('Property 33 — APPROVED webhook creates Payment record with tx_id, amount and currency', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          // A Payment record must be created with the webhook metadata
          expect(repo.createPayment).toHaveBeenCalledTimes(1);
          const createCall = repo.createPayment.mock.calls[0][0];
          expect(createCall.scheduledPaymentId).toBe(webhookDto.scheduledPaymentId);
          expect(createCall.amount).toBe(webhookDto.amount);
          expect(createCall.currency).toBe(webhookDto.currency);
          // externalTransactionId stored as paymentDesc / idempotencyKey
          expect(createCall.paymentDesc).toBe(webhookDto.externalTransactionId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 33c: For any APPROVED payment webhook, the use case logs
   * a PAID event with full metadata (externalTransactionId, amount, currency, paidAt).
   *
   * Validates: Req 6.3 — payment date and transaction metadata are recorded
   */
  it('Property 33 — APPROVED webhook logs PAID event with complete metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          // A log event must be created with PAID status and full metadata
          expect(repo.logPaymentEvent).toHaveBeenCalledTimes(1);
          const [paymentId, status, platform, data] = repo.logPaymentEvent.mock.calls[0];

          expect(typeof paymentId).toBe('string');
          expect(paymentId.length).toBeGreaterThan(0);
          expect(status).toBe('PAID');
          expect(platform).toBe('gateway');

          // Metadata must contain all required fields
          expect(data).toBeDefined();
          expect(data!.externalTransactionId).toBe(webhookDto.externalTransactionId);
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

  /**
   * Property 33d: For any APPROVED webhook referencing a non-existent
   * ScheduledPayment, the use case throws NotFoundException.
   *
   * Validates: Req 6.3 — only existing scheduled payments can be confirmed
   */
  it('Property 33 — APPROVED webhook for non-existent ScheduledPayment throws NotFoundException', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPaymentEvent(),
        async (webhookDto) => {
          const repo = makeMockRepo(makeScheduledPayment('dummy'));
          repo.findScheduledPaymentById.mockResolvedValue(null);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await expect(useCase.execute(webhookDto)).rejects.toThrow(NotFoundException);

          // No status update or payment creation should occur
          expect(repo.updateScheduledPaymentStatus).not.toHaveBeenCalled();
          expect(repo.createPayment).not.toHaveBeenCalled();
          expect(repo.logPaymentEvent).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
