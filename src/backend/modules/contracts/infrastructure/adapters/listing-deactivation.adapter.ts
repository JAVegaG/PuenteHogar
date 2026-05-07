import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import type { IListingDeactivationPort } from '../../domain/ports/listing-deactivation.port';

@Injectable()
export class ListingDeactivationAdapter implements IListingDeactivationPort {
    constructor(private readonly prisma: PrismaService) { }

    async deactivateByLeaseId(leaseId: string): Promise<void> {
        // Resolve lease → portfolio_unit_id
        const lease = await this.prisma.lease.findFirst({
            where: { id: leaseId, deleted_at: null },
            select: { portfolio_unit_id: true },
        });

        if (!lease?.portfolio_unit_id) return;

        // Find the active listing for this unit and deactivate it
        const listing = await this.prisma.listing.findFirst({
            where: {
                portfolio_unit_id: lease.portfolio_unit_id,
                is_active: true,
                deleted_at: null,
            },
            select: { id: true },
        });

        if (!listing) return;

        await this.prisma.listing.update({
            where: { id: listing.id },
            data: { is_active: false },
        });
    }
}
