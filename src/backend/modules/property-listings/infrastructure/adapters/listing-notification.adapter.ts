import { Injectable } from '@nestjs/common';
import { INotificationPort } from '../../domain/ports/notification.port';
import { SendNotificationUseCase } from '@modules/notifications';
import { PrismaService } from '@src/shared/prisma/prisma.service';

@Injectable()
export class ListingNotificationAdapter implements INotificationPort {
    constructor(
        private readonly sendNotification: SendNotificationUseCase,
        private readonly prisma: PrismaService,
    ) { }

    async notifyLandlordOfInterest(
        landlordUserId: string,
        tenantName: string,
        listingId: string,
    ): Promise<void> {
        const propertyTitle = await this.resolveListingTitle(listingId);
        await this.sendNotification.execute({
            userId: landlordUserId,
            notificationTypeName: 'NEW_INTEREST',
            eventSource: 'listing.contact_initiated',
            data: { listingId, tenantUserId: tenantName, propertyTitle },
        });
    }

    /**
     * Resolves the listing title from the Listing table.
     */
    private async resolveListingTitle(listingId: string): Promise<string | undefined> {
        try {
            const listing = await this.prisma.listing.findUnique({
                where: { id: listingId },
                select: { title: true },
            });
            return listing?.title || undefined;
        } catch {
            return undefined;
        }
    }
}
