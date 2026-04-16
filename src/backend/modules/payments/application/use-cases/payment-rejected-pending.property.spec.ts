// Feature: backend-database-implementation, Property 34: Pago rechazado mantiene estado PENDING
// Validates: Requirement 6.4: "IF la Pasarela_Pagos rechaza la transacción, THEN THE Payment_Service SHALL mantener el estado del Scheduled_Payment como PENDING y retornar al usuario un mensaje claro indicando que el pago fue rechazado."

import * as fc from 'fast-check';
import { NotFoundException } from '@nestjs/common';
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import type { IPaymentNotificationPort } from '@modules/payments/domain/ports/notification.port';
import { ScheduledPaymentEntity } from '@modules/payments/domain/entities/scheduled-payment.entity';
import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';
import { PaymentWebhookDto } from '@modules/payments/application/dtos/payment-webhook.dto';

// ─── Arbitrary generators ────────────────────────────────────────────────────

function arbitraryRejectedPaymentEvent(): fc.Arbitrary<PaymentWebhookDto> {
  return fc.record({
    scheduledPaymentId: fc.uuid(),
    externalTransactionId: fc.uuid(),
    status: fc.constant('REJECTED' as const),
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

describe('Property 34: Pago rechazado mantiene estado PENDING', () => {

  /**
   * Property 34a: For any REJECTED payment webhook, the use case does NOT
   * update the ScheduledPayment status — it remains PENDING for retry.
   *
   * Validates: Req 6.4 — rejected payment keeps ScheduledPayment as PENDING
   */
  it('Property 34 — REJECTED webhook does NOT update ScheduledPayment status (remains PENDING)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryRejectedPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          // ScheduledPayment status must NOT be updated
          expect(repo.updateScheduledPaymentStatus).not.toHaveBeenCalled();

          // The scheduled payment should still be in PENDING state
          expect(scheduledPayment.status).toBe('PENDING');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 34b: For any REJECTED payment webhook, the use case creates
   * a Payment record with the external transaction ID and rejection metadata.
   *
   * Validates: Req 6.4 — rejection is recorded for audit trail
   */
  it('Property 34 — REJECTED webhook creates Payment record with rejection metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryRejectedPaymentEvent(),
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
   * Property 34c: For any REJECTED payment webhook, the use case logs
   * a REJECTED event with the external transaction ID for traceability.
   *
   * Validates: Req 6.4 — rejection reason is recorded in audit log
   */
  it('Property 34 — REJECTED webhook logs REJECTED event with transaction ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryRejectedPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          // A log event must be created with REJECTED status
          expect(repo.logPaymentEvent).toHaveBeenCalledTimes(1);
          const [paymentId, status, platform, data] = repo.logPaymentEvent.mock.calls[0];

          expect(typeof paymentId).toBe('string');
          expect(paymentId.length).toBeGreaterThan(0);
          expect(status).toBe('REJECTED');
          expect(platform).toBe('gateway');

          // Metadata must contain the external transaction ID for traceability
          expect(data).toBeDefined();
          expect(data!.externalTransactionId).toBe(webhookDto.externalTransactionId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 34d: For any REJECTED webhook, the use case does NOT send
   * a payment received notification (fire-and-forget is not invoked).
   *
   * Validates: Req 6.4 — no success notification on rejection
   */
  it('Property 34 — REJECTED webhook does NOT trigger payment received notification', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryRejectedPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          // No payment received notification should be sent
          expect(notification.notifyPaymentReceived).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 34e: For any REJECTED webhook referencing a non-existent
   * ScheduledPayment, the use case throws NotFoundException.
   *
   * Validates: Req 6.4 — only existing scheduled payments can be rejected
   */
  it('Property 34 — REJECTED webhook for non-existent ScheduledPayment throws NotFoundException', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryRejectedPaymentEvent(),
        async (webhookDto) => {
          const repo = makeMockRepo(makeScheduledPayment('dummy'));
          repo.findScheduledPaymentById.mockResolvedValue(null);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await expect(useCase.execute(webhookDto)).rejects.toThrow(NotFoundException);

          // No payment creation or event logging should occur
          expect(repo.createPayment).not.toHaveBeenCalled();
          expect(repo.logPaymentEvent).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 34f: For any REJECTED webhook, the ScheduledPayment remains
   * available for retry — subsequent payment attempts can be initiated
   * for the same scheduled payment ID.
   *
   * Validates: Req 6.4 — rejected payment allows retry without state change
   */
  it('Property 34 — REJECTED webhook allows retry: ScheduledPayment remains queryable and PENDING', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryRejectedPaymentEvent(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId);
          const repo = makeMockRepo(scheduledPayment);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          // Execute rejection webhook
          await useCase.execute(webhookDto);

          // Verify the scheduled payment can still be found
          const foundPayment = await repo.findScheduledPaymentById(webhookDto.scheduledPaymentId);
          expect(foundPayment).not.toBeNull();
          expect(foundPayment!.status).toBe('PENDING');

          // Verify no status update was called (so it remains PENDING)
          expect(repo.updateScheduledPaymentStatus).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
