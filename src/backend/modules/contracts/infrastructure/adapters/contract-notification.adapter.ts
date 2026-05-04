import { Injectable } from '@nestjs/common';
import { INotificationPort } from '../../domain/ports/notification.port';
import { SendNotificationUseCase } from '@modules/notifications';
import { PrismaService } from '@src/shared/prisma/prisma.service';

@Injectable()
export class ContractNotificationAdapter implements INotificationPort {
    constructor(
        private readonly sendNotification: SendNotificationUseCase,
        private readonly prisma: PrismaService,
    ) { }

    async notifyContractSigned(
        landlordUserId: string,
        tenantUserId: string,
        contractId: string,
        signedAt: Date,
    ): Promise<void> {
        const { propertyName, unitName } = await this.resolveNamesFromContract(contractId);
        const landlordData = { contractId, signedAt: signedAt.toISOString(), propertyName };
        const tenantData = { contractId, signedAt: signedAt.toISOString(), unitName };
        await this.sendNotification.execute({
            userId: landlordUserId,
            notificationTypeName: 'CONTRACT_SIGNED',
            eventSource: 'contract.signed',
            data: landlordData,
        });
        await this.sendNotification.execute({
            userId: tenantUserId,
            notificationTypeName: 'CONTRACT_SIGNED',
            eventSource: 'contract.signed',
            data: tenantData,
        });
    }

    async notifySigningFailed(userId: string, contractId: string): Promise<void> {
        const { propertyName } = await this.resolveNamesFromContract(contractId);
        await this.sendNotification.execute({
            userId,
            notificationTypeName: 'CONTRACT_SIGNED',
            eventSource: 'contract.signing_failed',
            data: { contractId, propertyName },
        });
    }

    async notifyContractUploaded(
        tenantUserId: string,
        contractId: string,
        leaseId: string,
    ): Promise<void> {
        if (!tenantUserId) return;
        const unitName = await this.resolveUnitNameFromLease(leaseId);
        await this.sendNotification.execute({
            userId: tenantUserId,
            notificationTypeName: 'CONTRACT_UPLOADED',
            eventSource: 'contract.uploaded',
            data: { contractId, leaseId, unitName },
        });
    }

    /**
     * Resolves both portfolio name (for landlord) and unit name (for tenant) from a contract.
     * Contract → lease_id → Lease → portfolio_unit_id → PortfolioUnit + LandlordPortfolio
     */
    private async resolveNamesFromContract(contractId: string): Promise<{ propertyName?: string; unitName?: string }> {
        try {
            const contract = await this.prisma.contract.findUnique({
                where: { id: contractId },
                select: { lease_id: true },
            });
            if (!contract?.lease_id) return {};
            return this.resolveNamesFromLease(contract.lease_id);
        } catch {
            return {};
        }
    }

    /**
     * Resolves both portfolio name and unit name from a lease.
     * Lease → portfolio_unit_id → PortfolioUnit.name + LandlordPortfolio.name
     */
    private async resolveNamesFromLease(leaseId: string): Promise<{ propertyName?: string; unitName?: string }> {
        try {
            const lease = await this.prisma.lease.findUnique({
                where: { id: leaseId },
                select: { portfolio_unit_id: true },
            });
            if (!lease?.portfolio_unit_id) return {};

            const unit = await this.prisma.portfolioUnit.findUnique({
                where: { id: lease.portfolio_unit_id },
                select: { portfolio_id: true, name: true },
            });
            if (!unit?.portfolio_id) return {};

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
     * Resolves only the unit name from a lease (for tenant-facing notifications).
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
