import { Injectable } from '@nestjs/common';
import { INotificationPort } from '../../domain/ports/notification.port';
import { SendNotificationUseCase } from '@modules/notifications';

@Injectable()
export class ListingNotificationAdapter implements INotificationPort {
    constructor(private readonly sendNotification: SendNotificationUseCase) { }

    async notifyLandlordOfInterest(
        landlordUserId: string,
        tenantName: string,
        listingId: string,
    ): Promise<void> {
        await this.sendNotification.execute({
            userId: landlordUserId,
            notificationTypeName: 'NEW_INTEREST',
            eventSource: 'listing.contact_initiated',
            data: { listingId, tenantUserId: tenantName },
        });
    }
}
