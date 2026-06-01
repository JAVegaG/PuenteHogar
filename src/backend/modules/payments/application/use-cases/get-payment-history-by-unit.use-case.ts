import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { softDeleteFilter } from '@src/shared/prisma/soft-delete.utils';
import type { IPortfolioCrossModuleQuery } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import { PORTFOLIO_CROSS_MODULE_QUERY } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import { PaymentHistoryItemDto, PaginatedPaymentHistoryDto } from '../dtos/payment-history-item.dto';

const SPANISH_MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function generateMonthLabel(date: Date): string {
    const month = SPANISH_MONTHS[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${month} ${year}`;
}

@Injectable()
export class GetPaymentHistoryByUnitUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(PORTFOLIO_CROSS_MODULE_QUERY)
        private readonly portfolioQuery: IPortfolioCrossModuleQuery,
    ) { }

    async execute(
        unitId: string,
        userId: string,
        status: 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE',
        page: number,
        limit: number,
    ): Promise<PaginatedPaymentHistoryDto> {
        // 1. Verify the user is the tenant on the lease for this unit
        const leaseId = await this.portfolioQuery.getLeaseIdByUnitForTenant(unitId, userId);
        if (!leaseId) {
            throw new ForbiddenException('No tienes permisos para ver el historial de pagos de esta unidad');
        }

        // 2. Query all scheduled payments for this lease (non-deleted)
        const allPayments = await this.prisma.scheduledPayment.findMany({
            where: { lease_id: leaseId, ...softDeleteFilter },
            include: {
                payments: {
                    include: { logs: { orderBy: { creation_date: 'desc' }, take: 1 } },
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
            orderBy: { due_date: 'desc' },
        });

        // 3. Derive status for each payment and filter
        const now = new Date();
        const enriched = allPayments.map((sp) => {
            const latestLog = sp.payments[0]?.logs[0];
            let derivedStatus: string;

            if (latestLog?.status === 'PAID') {
                derivedStatus = 'PAID';
            } else {
                // PENDING or no payment record
                const dueDate = new Date(sp.due_date);
                if (dueDate < now) {
                    derivedStatus = 'OVERDUE';
                } else {
                    derivedStatus = 'PENDING';
                }
            }

            return { sp, derivedStatus };
        });

        // 4. Apply status filter
        const filtered = status === 'ALL'
            ? enriched
            : enriched.filter((item) => item.derivedStatus === status);

        // 5. Paginate
        const total = filtered.length;
        const offset = (page - 1) * limit;
        const paginated = filtered.slice(offset, offset + limit);

        // 6. Map to DTOs
        const items: PaymentHistoryItemDto[] = paginated.map(({ sp, derivedStatus }) => {
            const dto = new PaymentHistoryItemDto();
            dto.id = sp.id;
            dto.monthLabel = generateMonthLabel(new Date(sp.due_date));
            dto.dueDate = sp.due_date;
            dto.amount = Number(sp.amount);
            dto.currency = sp.currency;
            dto.status = derivedStatus;
            return dto;
        });

        const result = new PaginatedPaymentHistoryDto();
        result.items = items;
        result.total = total;
        result.page = page;
        result.limit = limit;

        return result;
    }
}
