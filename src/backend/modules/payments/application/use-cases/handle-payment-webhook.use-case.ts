import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IPaymentNotificationPort } from '@modules/payments/domain/ports/notification.port';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import { PaymentWebhookDto } from '@modules/payments/application/dtos/payment-webhook.dto';
import {
  PAYMENT_NOTIFICATION_PORT,
  PAYMENT_REPOSITORY,
} from './initiate-payment.use-case';

@Injectable()
export class HandlePaymentWebhookUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: IPaymentRepository,
    @Inject(PAYMENT_NOTIFICATION_PORT)
    private readonly notificationPort: IPaymentNotificationPort,
  ) {}

  async execute(dto: PaymentWebhookDto): Promise<void> {
    const scheduledPayment = await this.repository.findScheduledPaymentById(
      dto.scheduledPaymentId,
    );
    if (!scheduledPayment) {
      throw new NotFoundException('Pago programado no encontrado');
    }

    if (dto.status === 'APPROVED') {
      // Update to PAID with tx_id, amount and date (Req 6.3)
      await this.repository.updateScheduledPaymentStatus(scheduledPayment.id, 'PAID');

      const payment = await this.repository.createPayment({
        scheduledPaymentId: scheduledPayment.id,
        amount: dto.amount,
        currency: dto.currency,
        paymentDesc: dto.externalTransactionId,
        idempotencyKey: dto.externalTransactionId,
      });

      // Log event with full metadata (Req 6.6)
      await this.repository.logPaymentEvent(payment.id, 'PAID', 'gateway', {
        externalTransactionId: dto.externalTransactionId,
        amount: dto.amount,
        currency: dto.currency,
        paidAt: new Date().toISOString(),
      });

      // Notify landlord — fire-and-forget (Req 6.7)
      const { landlordUserId } = await this.repository.getLeaseUserIds(
        scheduledPayment.leaseId,
      );

      if (landlordUserId) {
        this.notificationPort
          .notifyPaymentReceived(
            landlordUserId,
            dto.amount,
            dto.currency,
            scheduledPayment.leaseId,
          )
          .catch(() => undefined);
      }
    } else {
      // REJECTED — keep ScheduledPayment as PENDING (Req 6.4)
      // Do NOT change the scheduled payment status — it remains PENDING for retry

      const payment = await this.repository.createPayment({
        scheduledPaymentId: scheduledPayment.id,
        amount: dto.amount,
        currency: dto.currency,
        paymentDesc: dto.externalTransactionId,
        idempotencyKey: dto.externalTransactionId,
      });

      // Log the rejection event (Req 6.6)
      await this.repository.logPaymentEvent(payment.id, 'REJECTED', 'gateway', {
        externalTransactionId: dto.externalTransactionId,
      });
    }
  }
}
