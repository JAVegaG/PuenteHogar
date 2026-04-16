// Feature: backend-database-implementation, Property 36: Pago confirmado dispara notificación al arrendador
// Validates: Requirements 6.7

import * as fc from 'fast-check';
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import type { IPaymentNotificationPort } from '@modules/payments/domain/ports/notification.port';
import { ScheduledPaymentEntity } from '@modules/payments/domain/entities/scheduled-payment.entity';
import { PaymentEntity } from '@modules/payments/domain/entities/payment.entity';
import { PaymentWebhookDto } from '@modules/payments/application/dtos/payment-webhook.dto';

// ─── Arbitrary generators ────────────────────────────────────────────────────

function arbitraryApprovedWebhook(): fc.Arbitrary<PaymentWebhookDto> {
  return fc.record({
    scheduledPaymentId: fc.uuid(),
    externalTransactionId: fc.uuid(),
    status: fc.constant('APPROVED' as const),
    amount: fc.float({ min: 1, max: 50_000_000, noNaN: true, noDefaultInfinity: true }),
    currency: fc.constantFrom('COP', 'USD'),
  });
}

function arbitraryRejectedWebhook(): fc.Arbitrary<PaymentWebhookDto> {
  return fc.record({
    scheduledPaymentId: fc.uuid(),
    externalTransactionId: fc.uuid(),
    status: fc.constant('REJECTED' as const),
    amount: fc.float({ min: 1, max: 50_000_000, noNaN: true, noDefaultInfinity: true }),
    currency: fc.constantFrom('COP', 'USD'),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeScheduledPayment(id: string, leaseId: string): ScheduledPaymentEntity {
  return new ScheduledPaymentEntity(id, leaseId, 1_000_000, 'COP', new Date(), 'PENDING');
}

function makeMockRepo(
  scheduledPayment: ScheduledPaymentEntity,
  landlordUserId: string | null,
): jest.Mocked<IPaymentRepository> {
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
      landlordUserId,
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

describe('Property 36: Pago confirmado dispara notificación al arrendador', () => {

  /**
   * Property 36a: For any APPROVED payment webhook, the use case notifies
   * the landlord with the correct amount, currency and leaseId.
   *
   * Validates: Req 6.7 — confirmed payment triggers notification to landlord
   */
  it('Property 36 — APPROVED webhook notifies landlord with amount, currency and leaseId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryApprovedWebhook(),
        fc.uuid(),
        fc.uuid(),
        async (webhookDto, leaseId, landlordId) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId, leaseId);
          const repo = makeMockRepo(scheduledPayment, landlordId);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          // Must resolve landlord from the lease
          expect(repo.getLeaseUserIds).toHaveBeenCalledWith(leaseId);

          // Must notify the landlord with correct parameters
          expect(notification.notifyPaymentReceived).toHaveBeenCalledTimes(1);
          expect(notification.notifyPaymentReceived).toHaveBeenCalledWith(
            landlordId,
            webhookDto.amount,
            webhookDto.currency,
            leaseId,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 36b: For any APPROVED webhook where landlordUserId is null,
   * the notification is NOT sent (no crash, graceful skip).
   *
   * Validates: Req 6.7 — notification only sent when landlord is resolvable
   */
  it('Property 36 — APPROVED webhook with null landlordUserId skips notification', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryApprovedWebhook(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId, 'lease-x');
          const repo = makeMockRepo(scheduledPayment, null);
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          // Notification must NOT be called when landlord is null
          expect(notification.notifyPaymentReceived).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 36c: For any REJECTED payment webhook, the use case does NOT
   * notify the landlord — notifications are only for confirmed payments.
   *
   * Validates: Req 6.7 — only confirmed (APPROVED) payments trigger notification
   */
  it('Property 36 — REJECTED webhook does NOT notify landlord', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryRejectedWebhook(),
        async (webhookDto) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId, 'lease-y');
          const repo = makeMockRepo(scheduledPayment, 'landlord-001');
          const notification = makeMockNotification();
          const useCase = buildUseCase(repo, notification);

          await useCase.execute(webhookDto);

          // No notification for rejected payments
          expect(notification.notifyPaymentReceived).not.toHaveBeenCalled();
          // getLeaseUserIds should not even be called for rejected payments
          expect(repo.getLeaseUserIds).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 36d: For any APPROVED webhook, if the notification port throws,
   * the use case still completes without error (fire-and-forget).
   *
   * Validates: Req 6.7 — notification failure does not block payment flow
   */
  it('Property 36 — notification failure does not propagate to caller', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryApprovedWebhook(),
        fc.uuid(),
        async (webhookDto, landlordId) => {
          const scheduledPayment = makeScheduledPayment(webhookDto.scheduledPaymentId, 'lease-z');
          const repo = makeMockRepo(scheduledPayment, landlordId);
          const notification = makeMockNotification();
          notification.notifyPaymentReceived.mockRejectedValue(new Error('Channel unavailable'));
          const useCase = buildUseCase(repo, notification);

          // Must not throw even though notification fails
          await expect(useCase.execute(webhookDto)).resolves.toBeUndefined();

          // Payment processing still completed
          expect(repo.updateScheduledPaymentStatus).toHaveBeenCalledWith(
            webhookDto.scheduledPaymentId,
            'PAID',
          );
          expect(repo.createPayment).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
