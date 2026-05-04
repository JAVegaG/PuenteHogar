import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma-generated/client';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { IPaymentsCrossModuleQuery } from '../../domain/ports/cross-module-query.port';

@Injectable()
export class PaymentsCrossModuleQueryService implements IPaymentsCrossModuleQuery {
    constructor(private readonly prisma: PrismaService) { }

    async hasPendingPayments(userId: string): Promise<boolean> {
        const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
            Prisma.sql`
        SELECT COUNT(*) as count
        FROM "payments"."ScheduledPayment" sp
        INNER JOIN "landlord_portfolio"."Lease" l ON l."id" = sp."lease_id"
        WHERE l."user_id" = ${userId}
          AND NOT EXISTS (
            SELECT 1 FROM "payments"."Payment" p
            WHERE p."scheduled_payment_id" = sp."id"
              AND p."deleted_at" IS NULL
          )
          AND sp."deleted_at" IS NULL
          AND l."deleted_at" IS NULL
      `,
        );
        return Number(result[0].count) > 0;
    }
}
