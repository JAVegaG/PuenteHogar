import { Injectable } from '@nestjs/common';
import { IPortfolioNotificationPort } from '../../domain/ports/notification.port';
import { SendNotificationUseCase } from '@modules/notifications';
import { PrismaService } from '@src/shared/prisma/prisma.service';

@Injectable()
export class PortfolioNotificationAdapter implements IPortfolioNotificationPort {
    constructor(
        private readonly sendNotification: SendNotificationUseCase,
        private readonly prisma: PrismaService,
    ) { }

    async notifyLeaseCreated(
        tenantUserId: string,
        leaseId: string,
        unitId: string,
    ): Promise<void> {
        if (!tenantUserId) return;
        const { propertyName, unitName } = await this.resolveUnitContext(unitId);
        await this.sendNotification.execute({
            userId: tenantUserId,
            notificationTypeName: 'LEASE_CREATED',
            eventSource: 'lease.created',
            data: { leaseId, unitId, propertyName, unitName },
        });
    }

    async notifyLeaseCancelled(
        tenantUserId: string,
        leaseId: string,
    ): Promise<void> {
        if (!tenantUserId) return;
        const unitName = await this.resolveUnitNameFromLease(leaseId);
        await this.sendNotification.execute({
            userId: tenantUserId,
            notificationTypeName: 'LEASE_CANCELLED',
            eventSource: 'lease.cancelled',
            data: { leaseId, unitName },
        });
    }

    /**
     * Resolves unit name and property (portfolio) name from a portfolio unit ID.
     * PortfolioUnit → portfolio_id → LandlordPortfolio.name
     */
    private async resolveUnitContext(unitId: string): Promise<{ propertyName?: string; unitName?: string }> {
        try {
            const unit = await this.prisma.portfolioUnit.findUnique({
                where: { id: unitId },
                select: { name: true, portfolio_id: true },
            });
            if (!unit) return {};

            const portfolio = await this.prisma.landlordPortfolio.findUnique({
                where: { id: unit.portfolio_id },
                select: { name: true },
            });

            return {
                propertyName: portfolio?.name || undefined,
                unitName: unit.name || undefined,
            };
        } catch {
            return {};
        }
    }

    /**
     * Resolves unit name from a lease by following:
     * Lease → portfolio_unit_id → PortfolioUnit.name
     */
    private async resolveUnitNameFromLease(leaseId: string): Promise<string | undefined> {
        try {
            const lease = await this.prisma.lease.findUnique({
                where: { id: leaseId },
                select: { portfolio_unit_id: true },
            });
            if (!lease?.portfolio_unit_id) return undefined;

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
