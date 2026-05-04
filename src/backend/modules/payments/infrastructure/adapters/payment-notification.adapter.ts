import { Injectable } from '@nestjs/common';
import { IPaymentNotificationPort } from '../../domain/ports/notification.port';
import { SendNotificationUseCase } from '@modules/notifications';
import { PrismaService } from '@src/shared/prisma/prisma.service';

@Injectable()
export class PaymentNotificationAdapter implements IPaymentNotificationPort {
    constructor(
        private readonly sendNotification: SendNotificationUseCase,
        private readonly prisma: PrismaService,
    ) { }

    async notifyPaymentReceived(
        landlordUserId: string,
        amount: number,
        currency: string,
        leaseId: string,
    ): Promise<void> {
        const propertyName = await this.resolvePropertyNameFromLease(leaseId);
        await this.sendNotification.execute({
            userId: landlordUserId,
            notificationTypeName: 'PAYMENT_RECEIVED',
            eventSource: 'payment.received',
            data: { amount, currency, leaseId, propertyName },
        });
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

            return unit.name || portfolio?.name || undefined;
        } catch {
            return undefined;
        }
    }
}
