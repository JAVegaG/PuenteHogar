import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma-generated/client';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { IPortfolioCrossModuleQuery } from '../../domain/ports/cross-module-query.port';

@Injectable()
export class PortfolioCrossModuleQueryService implements IPortfolioCrossModuleQuery {
    constructor(private readonly prisma: PrismaService) { }

    async hasActiveLeases(userId: string): Promise<boolean> {
        const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
            Prisma.sql`
        SELECT COUNT(*) as count
        FROM "landlord_portfolio"."Lease" l
        INNER JOIN "tracking_process"."LeaseCurrentStatus" lcs ON lcs."lease_id" = l."id"
        INNER JOIN "tracking_process"."LeaseStatus" ls ON ls."id" = lcs."lease_status_id"
        WHERE l."user_id" = ${userId}
          AND ls."name" IN ('Vigente', 'Acordado')
          AND l."deleted_at" IS NULL
          AND lcs."deleted_at" IS NULL
          AND ls."deleted_at" IS NULL
      `,
        );
        return Number(result[0].count) > 0;
    }

    async hasPortfoliosWithUnits(userId: string): Promise<boolean> {
        const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
            Prisma.sql`
        SELECT COUNT(*) as count
        FROM "landlord_portfolio"."LandlordPortfolio" lp
        INNER JOIN "landlord_portfolio"."PortfolioUnit" pu ON pu."portfolio_id" = lp."id"
        WHERE lp."user_id" = ${userId}
          AND lp."deleted_at" IS NULL
          AND pu."deleted_at" IS NULL
      `,
        );
        return Number(result[0].count) > 0;
    }

    async hasActiveLeasesInPortfolios(userId: string): Promise<boolean> {
        const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
            Prisma.sql`
        SELECT COUNT(*) as count
        FROM "landlord_portfolio"."LandlordPortfolio" lp
        INNER JOIN "landlord_portfolio"."PortfolioUnit" pu ON pu."portfolio_id" = lp."id"
        INNER JOIN "landlord_portfolio"."Lease" l ON l."portfolio_unit_id" = pu."id"
        INNER JOIN "tracking_process"."LeaseCurrentStatus" lcs ON lcs."lease_id" = l."id"
        INNER JOIN "tracking_process"."LeaseStatus" ls ON ls."id" = lcs."lease_status_id"
        WHERE lp."user_id" = ${userId}
          AND ls."name" IN ('Vigente', 'Acordado')
          AND lp."deleted_at" IS NULL
          AND pu."deleted_at" IS NULL
          AND l."deleted_at" IS NULL
          AND lcs."deleted_at" IS NULL
          AND ls."deleted_at" IS NULL
      `,
        );
        return Number(result[0].count) > 0;
    }
}
