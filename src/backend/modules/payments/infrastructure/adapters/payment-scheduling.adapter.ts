import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { IPaymentSchedulingPort } from '@modules/contracts/domain/ports/payment-scheduling.port';

/**
 * Adapter implementing IPaymentSchedulingPort from the contracts module.
 *
 * Creates ScheduledPayment records directly via Prisma when a contract
 * is signed. This is a synchronous in-process call within the monolith,
 * following the cross-module port pattern (contracts → payments).
 *
 * The ETL pipeline (PaymentsEtlService) continues to handle PaymentsRaw
 * records independently — this adapter provides an additional creation
 * path triggered on contract signing.
 */
@Injectable()
export class PaymentSchedulingAdapter implements IPaymentSchedulingPort {
    private readonly logger = new Logger(PaymentSchedulingAdapter.name);

    constructor(private readonly prisma: PrismaService) { }

    async scheduleInitialPayment(
        leaseId: string,
        amount: number,
        currency: string,
        dueDate: Date,
    ): Promise<void> {
        this.logger.log(
            `Creating ScheduledPayment for lease=${leaseId} amount=${amount} currency=${currency} dueDate=${dueDate.toISOString()}`,
        );

        await this.prisma.scheduledPayment.create({
            data: {
                lease_id: leaseId,
                amount,
                currency,
                due_date: dueDate,
            },
        });

        this.logger.log(
            `ScheduledPayment created successfully for lease=${leaseId}`,
        );
    }
}
