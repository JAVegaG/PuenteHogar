import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { softDeleteFilter } from '@src/shared/prisma/soft-delete.utils';
import type { IPortfolioCrossModuleQuery } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import { PORTFOLIO_CROSS_MODULE_QUERY } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import { PaymentDetailDto, PaymentLineItemDto } from '../dtos/payment-detail.dto';

@Injectable()
export class GetPaymentDetailUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(PORTFOLIO_CROSS_MODULE_QUERY)
        private readonly portfolioQuery: IPortfolioCrossModuleQuery,
    ) { }

    async execute(paymentId: string, userId: string): Promise<PaymentDetailDto> {
        // 1. Query ScheduledPayment by ID with soft delete filter
        const scheduledPayment = await this.prisma.scheduledPayment.findFirst({
            where: { id: paymentId, ...softDeleteFilter },
            include: {
                payments: {
                    where: { ...softDeleteFilter },
                    include: {
                        logs: {
                            where: { ...softDeleteFilter },
                            orderBy: { creation_date: 'desc' },
                            take: 1,
                        },
                    },
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
        });

        if (!scheduledPayment) {
            throw new NotFoundException('Pago programado no encontrado');
        }

        // 2. Verify tenant ownership: ScheduledPayment.lease_id → Lease.user_id = userId
        const isTenant = await this.portfolioQuery.verifyTenantOwnership(
            scheduledPayment.lease_id,
            userId,
        );

        if (!isTenant) {
            throw new ForbiddenException('No tienes permisos para ver el detalle de este pago');
        }

        // 3. Derive status from latest Payment log
        const latestPayment = scheduledPayment.payments[0];
        const latestLog = latestPayment?.logs[0];
        const now = new Date();
        let derivedStatus: string;

        if (latestLog?.status === 'PAID') {
            derivedStatus = 'PAID';
        } else {
            const dueDate = new Date(scheduledPayment.due_date);
            derivedStatus = dueDate < now ? 'OVERDUE' : 'PENDING';
        }

        // 4. Build line items (MVP: single line item with full amount)
        const lineItem = new PaymentLineItemDto();
        lineItem.concept = 'Canon de arrendamiento';
        lineItem.amount = Number(scheduledPayment.amount);

        // 5. Build response DTO
        const dto = new PaymentDetailDto();
        dto.id = scheduledPayment.id;
        dto.status = derivedStatus;
        dto.amount = Number(scheduledPayment.amount);
        dto.currency = scheduledPayment.currency;
        dto.dueDate = scheduledPayment.due_date;
        dto.lineItems = [lineItem];
        dto.isPending = derivedStatus !== 'PAID';

        // 6. Conditional fields for PAID payments
        if (derivedStatus === 'PAID' && latestPayment) {
            dto.datePaid = latestPayment.created_at;
            // Extract payment method from log metadata or default to "PSE"
            const logData = latestLog?.data as Record<string, unknown> | null;
            dto.paymentMethod = (logData?.paymentMethod as string) ?? 'PSE';
            dto.receiptUrl = (logData?.receiptUrl as string) ?? `https://pagos.example.com/recibos/${latestPayment.id}`;
        } else {
            dto.datePaid = null;
            dto.paymentMethod = null;
            dto.receiptUrl = null;
        }

        return dto;
    }
}
