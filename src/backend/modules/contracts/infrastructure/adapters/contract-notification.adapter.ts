import { Injectable } from '@nestjs/common';
import { INotificationPort } from '../../domain/ports/notification.port';
import { SendNotificationUseCase } from '@modules/notifications';

@Injectable()
export class ContractNotificationAdapter implements INotificationPort {
    constructor(private readonly sendNotification: SendNotificationUseCase) { }

    async notifyContractSigned(
        landlordUserId: string,
        tenantUserId: string,
        contractId: string,
        signedAt: Date,
    ): Promise<void> {
        const data = { contractId, signedAt: signedAt.toISOString() };
        await this.sendNotification.execute({
            userId: landlordUserId,
            notificationTypeName: 'CONTRACT_SIGNED',
            eventSource: 'contract.signed',
            data,
        });
        await this.sendNotification.execute({
            userId: tenantUserId,
            notificationTypeName: 'CONTRACT_SIGNED',
            eventSource: 'contract.signed',
            data,
        });
    }

    async notifySigningFailed(userId: string, contractId: string): Promise<void> {
        await this.sendNotification.execute({
            userId,
            notificationTypeName: 'CONTRACT_SIGNED',
            eventSource: 'contract.signing_failed',
            data: { contractId },
        });
    }

    async notifyContractUploaded(
        tenantUserId: string,
        contractId: string,
        leaseId: string,
    ): Promise<void> {
        if (!tenantUserId) return;
        await this.sendNotification.execute({
            userId: tenantUserId,
            notificationTypeName: 'CONTRACT_UPLOADED',
            eventSource: 'contract.uploaded',
            data: { contractId, leaseId },
        });
    }
}
