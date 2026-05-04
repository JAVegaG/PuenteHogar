import { Injectable } from '@nestjs/common';
import { IPaymentNotificationPort } from '../../domain/ports/notification.port';
import { SendNotificationUseCase } from '@modules/notifications';

@Injectable()
export class PaymentNotificationAdapter implements IPaymentNotificationPort {
    constructor(private readonly sendNotification: SendNotificationUseCase) { }

    async notifyPaymentReceived(
        landlordUserId: string,
        amount: number,
        currency: string,
        leaseId: string,
    ): Promise<void> {
        await this.sendNotification.execute({
            userId: landlordUserId,
            notificationTypeName: 'PAYMENT_RECEIVED',
            eventSource: 'payment.received',
            data: { amount, currency, leaseId },
        });
    }
}
