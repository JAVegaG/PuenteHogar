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
        const propertyName = await this.resolvePropertyNameFromContract(contractId);
        const data = { contractId, signedAt: signedAt.toISOString(), propertyName };
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
        const propertyName = await this.resolvePropertyNameFromContract(contractId);
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
        const propertyName = await this.resolvePropertyNameFromLease(leaseId);
        await this.sendNotification.execute({
            userId: tenantUserId,
            notificationTypeName: 'CONTRACT_UPLOADED',
            eventSource: 'contract.uploaded',
            data: { contractId, leaseId, propertyName },
        });
    }

    /**
     * Resolves property name from a contract by following:
     * Contract → lease_id → Lease → portfolio_unit_id → PortfolioUnit → portfolio_id → LandlordPortfolio.name
     */
    private async resolvePropertyNameFromContract(contractId: string): Promise<string | undefined> {
        try {
            const contract = await this.prisma.contract.findUnique({
                where: { id: contractId },
                select: { lease_id: true },
            });
            if (!contract?.lease_id) return undefined;
            return this.resolvePropertyNameFromLease(contract.lease_id);
        } catch {
            return undefined;
        }
    }

    /**
     * Resolves property name from a lease by following:
     * Lease → portfolio_unit_id → PortfolioUnit → portfolio_id → LandlordPortfolio.name
     */
    private async resolvePropertyNameFromLease(leaseId: string): Promise<string | undefined> {
        try {
            const lease = await this.prisma.lease.findUnique({
                where: { id: leaseId },
                select: { portfolio_unit_id: true },
            });
            if (!lease?.portfolio_unit_id) return undefined;

            const unit = await this.prisma.portfolioUnit.findUnique({
                where: { id: lease.portfolio_unit_id },
                select: { portfolio_id: true, name: true },
            });
            if (!unit?.portfolio_id) return undefined;

            const portfolio = await this.prisma.landlordPortfolio.findUnique({
                where: { id: unit.portfolio_id },
                select: { name: true },
            });
            if (!portfolio?.name) return undefined;

            // Use unit name if available, otherwise portfolio name
            return unit.name || portfolio.name;
        } catch {
            return undefined;
        }
    }
}
