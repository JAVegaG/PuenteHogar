import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { softDeleteFilter } from '@src/shared/prisma/soft-delete.utils';
import type { IPaymentsCrossModuleQuery } from '@modules/payments/domain/ports/cross-module-query.port';
import { PAYMENTS_CROSS_MODULE_QUERY } from '@modules/payments/domain/ports/cross-module-query.port';
import { TenantLeaseDetailDto, NextPaymentDto } from '../dtos/tenant-lease-detail.dto';

@Injectable()
export class GetTenantLeaseDetailUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(PAYMENTS_CROSS_MODULE_QUERY)
        private readonly paymentsQuery: IPaymentsCrossModuleQuery,
    ) { }

    async execute(leaseId: string, userId: string): Promise<TenantLeaseDetailDto> {
        // 1. Find the lease and verify tenant ownership
        const lease = await this.prisma.lease.findFirst({
            where: { id: leaseId, ...softDeleteFilter },
        });

        if (!lease) {
            throw new NotFoundException('Arriendo no encontrado');
        }

        if (lease.user_id !== userId) {
            throw new ForbiddenException('No tienes permiso para ver este arriendo');
        }

        // 2. Resolve PortfolioUnit within landlord_portfolio schema
        const unit = await this.prisma.portfolioUnit.findFirst({
            where: { id: lease.portfolio_unit_id, ...softDeleteFilter },
        });

        if (!unit) {
            throw new NotFoundException('Unidad no encontrada');
        }

        // 3. Resolve Property + Address within property_listings schema (cross-schema by property_id)
        const property = await this.prisma.property.findFirst({
            where: { id: unit.property_id, ...softDeleteFilter },
            include: { address: true },
        });

        // 4. Resolve lease status from tracking_process schema
        const leaseStatus = await this.resolveLeaseStatus(leaseId);

        // 5. Cross-schema call to payments module for next pending payment
        const nextPendingPayment = await this.paymentsQuery.getNextPendingPayment(leaseId);

        // 6. Build response DTO
        const dto = new TenantLeaseDetailDto();
        dto.leaseId = lease.id;
        dto.unitId = unit.id;
        dto.propertyType = property?.property_type ?? '';
        dto.neighborhood = property?.address?.neighborhood ?? '';
        dto.address = property?.address?.address ?? '';
        dto.monthlyAmount = Number(unit.lease_base_amount);
        dto.currency = unit.lease_base_currency;
        dto.leaseStatus = leaseStatus;

        if (nextPendingPayment) {
            const payment = new NextPaymentDto();
            payment.id = nextPendingPayment.id;
            payment.amount = nextPendingPayment.amount;
            payment.dueDate = nextPendingPayment.dueDate;
            payment.status = nextPendingPayment.status;
            dto.nextPayment = payment;
        } else {
            dto.nextPayment = null;
        }

        return dto;
    }

    private async resolveLeaseStatus(leaseId: string): Promise<string> {
        const currentStatus = await this.prisma.leaseCurrentStatus.findUnique({
            where: { lease_id: leaseId },
            include: { status: true },
        });
        return currentStatus?.status?.name ?? 'Acordado';
    }
}
