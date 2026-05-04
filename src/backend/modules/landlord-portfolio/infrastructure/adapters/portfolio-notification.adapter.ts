import { Injectable } from '@nestjs/common';
import { IPortfolioNotificationPort } from '../../domain/ports/notification.port';
import { SendNotificationUseCase } from '@modules/notifications';

@Injectable()
export class PortfolioNotificationAdapter implements IPortfolioNotificationPort {
    constructor(private readonly sendNotification: SendNotificationUseCase) { }

    async notifyLeaseCreated(
        tenantUserId: string,
        leaseId: string,
        unitId: string,
    ): Promise<void> {
        if (!tenantUserId) return;
        await this.sendNotification.execute({
            userId: tenantUserId,
            notificationTypeName: 'LEASE_CREATED',
            eventSource: 'lease.created',
            data: { leaseId, unitId },
        });
    }

    async notifyLeaseCancelled(
        tenantUserId: string,
        leaseId: string,
    ): Promise<void> {
        if (!tenantUserId) return;
        await this.sendNotification.execute({
            userId: tenantUserId,
            notificationTypeName: 'LEASE_CANCELLED',
            eventSource: 'lease.cancelled',
            data: { leaseId },
        });
    }
}
