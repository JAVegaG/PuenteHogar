import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { softDeleteFilter } from '@src/shared/prisma/soft-delete.utils';
import type { IPortfolioCrossModuleQuery } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import { PORTFOLIO_CROSS_MODULE_QUERY } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import { PaymentUnitCardDto } from '../dtos/payment-unit-card.dto';

@Injectable()
export class GetPaymentUnitsUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(PORTFOLIO_CROSS_MODULE_QUERY)
        private readonly portfolioQuery: IPortfolioCrossModuleQuery,
    ) { }

    async execute(userId: string): Promise<PaymentUnitCardDto[]> {
        // 1. Find all active leases where user is tenant
        const leases = await this.prisma.lease.findMany({
            where: { user_id: userId, ...softDeleteFilter },
            select: { id: true },
        });

        if (leases.length === 0) return [];

        const leaseIds = leases.map((l: { id: string }) => l.id);

        // 2. Find all scheduled payments for those leases (not soft-deleted)
        const scheduledPayments = await this.prisma.scheduledPayment.findMany({
            where: { lease_id: { in: leaseIds }, ...softDeleteFilter },
            include: {
                payments: {
                    include: { logs: { orderBy: { creation_date: 'desc' }, take: 1 } },
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
        });

        if (scheduledPayments.length === 0) return [];

        // 3. Group scheduled payments by lease_id
        const paymentsByLease = new Map<string, typeof scheduledPayments>();
        for (const sp of scheduledPayments) {
            const existing = paymentsByLease.get(sp.lease_id) ?? [];
            existing.push(sp);
            paymentsByLease.set(sp.lease_id, existing);
        }

        // 4. Resolve property info for each lease and group by unit
        const unitCards = new Map<string, PaymentUnitCardDto>();

        for (const [leaseId, payments] of paymentsByLease.entries()) {
            const propertyInfo = await this.portfolioQuery.getPropertyInfoByLeaseId(leaseId);
            if (!propertyInfo) continue;

            const { unitId, propertyName, propertyType, neighborhood, leaseStatus } = propertyInfo;

            // Count pending payments (status derived from latest log, default PENDING)
            const pendingCount = payments.filter((sp) => {
                const latestLog = sp.payments[0]?.logs[0];
                const status = latestLog?.status ?? 'PENDING';
                return status === 'PENDING';
            }).length;

            if (unitCards.has(unitId)) {
                // Accumulate pending count if same unit appears from multiple leases
                const existing = unitCards.get(unitId)!;
                existing.pendingCount += pendingCount;
            } else {
                const card = new PaymentUnitCardDto();
                card.unitId = unitId;
                card.propertyName = propertyName;
                card.propertyType = propertyType;
                card.neighborhood = neighborhood;
                card.leaseStatus = leaseStatus;
                card.pendingCount = pendingCount;
                unitCards.set(unitId, card);
            }
        }

        return Array.from(unitCards.values());
    }
}
