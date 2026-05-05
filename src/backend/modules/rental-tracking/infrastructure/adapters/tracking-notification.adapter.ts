import { Injectable } from '@nestjs/common';
import type { ITrackingNotificationPort, LeaseStateNotificationMetadata } from '../../domain/ports/notification.port';
import type { LeaseState } from '../../domain/entities/lease-status.entity';
import { SendNotificationUseCase } from '@modules/notifications';
import { PrismaService } from '@src/shared/prisma/prisma.service';

@Injectable()
export class TrackingNotificationAdapter implements ITrackingNotificationPort {
    constructor(
        private readonly sendNotification: SendNotificationUseCase,
        private readonly prisma: PrismaService,
    ) { }

    async notifyLeaseStateChanged(
        landlordUserId: string,
        tenantUserId: string,
        leaseId: string,
        newState: LeaseState,
        metadata?: LeaseStateNotificationMetadata,
    ): Promise<void> {
        switch (newState) {
            case 'CONTACT_INITIATED':
                await this.notifyContactInitiated(landlordUserId, leaseId, metadata);
                break;
            case 'CONTRACT_SIGNED':
                // Handled by contracts module notification adapter
                break;
            case 'PAYMENT_RECEIVED':
                // Handled by payments module notification adapter
                break;
            default:
                break;
        }
    }

    private async notifyContactInitiated(
        landlordUserId: string,
        leaseId: string,
        metadata?: LeaseStateNotificationMetadata,
    ): Promise<void> {
        const propertyTitle = await this.resolvePropertyTitleFromLease(leaseId);

        const data: Record<string, unknown> = {
            leaseId,
            propertyTitle,
        };

        // Include tenant contact info so landlord can follow up
        if (metadata?.tenantContact) {
            data.tenantName = metadata.tenantContact.fullName;
            data.tenantEmail = metadata.tenantContact.email;
            data.tenantPhone = metadata.tenantContact.phoneNumber;
        }

        await this.sendNotification.execute({
            userId: landlordUserId,
            notificationTypeName: 'NEW_INTEREST',
            eventSource: 'tracking.contact_initiated',
            data,
        });
    }

    /**
     * Resolves property title from lease via cross-schema lookup:
     * Lease → portfolio_unit_id → Listing.title (or PortfolioUnit.name as fallback)
     */
    private async resolvePropertyTitleFromLease(leaseId: string): Promise<string | undefined> {
        try {
            const lease = await this.prisma.lease.findUnique({
                where: { id: leaseId },
                select: { portfolio_unit_id: true },
            });
            if (!lease?.portfolio_unit_id) return undefined;

            // Try to get listing title first (more user-friendly)
            const listing = await this.prisma.listing.findFirst({
                where: { portfolio_unit_id: lease.portfolio_unit_id, deleted_at: null },
                select: { title: true },
            });
            if (listing?.title) return listing.title;

            // Fallback to unit name
            const unit = await this.prisma.portfolioUnit.findUnique({
                where: { id: lease.portfolio_unit_id },
                select: { name: true },
            });
            return unit?.name || undefined;
        } catch {
            return undefined;
        }
    }
}
