import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma-generated/client';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { IPortfolioCrossModuleQuery, LeasePropertyInfo } from '../../domain/ports/cross-module-query.port';

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

    async getPropertyInfoByLeaseId(leaseId: string): Promise<LeasePropertyInfo | null> {
        // Resolve: Lease → PortfolioUnit → Property + Address, and lease status from tracking
        const lease = await this.prisma.lease.findFirst({
            where: { id: leaseId, deleted_at: null },
        });

        if (!lease) return null;

        const unit = await this.prisma.portfolioUnit.findFirst({
            where: { id: lease.portfolio_unit_id, deleted_at: null },
        });

        if (!unit) return null;

        const property = await this.prisma.property.findFirst({
            where: { id: unit.property_id, deleted_at: null },
            include: { address: true },
        });

        // Resolve lease status from tracking_process schema
        const currentStatus = await this.prisma.leaseCurrentStatus.findUnique({
            where: { lease_id: leaseId },
            include: { status: true },
        });
        const leaseStatus = currentStatus?.status?.name ?? 'Acordado';

        const propertyType = property?.property_type ?? '';
        const neighborhood = property?.address?.neighborhood ?? '';
        const propertyName = `${propertyType} ${neighborhood}`.trim();

        return {
            unitId: unit.id,
            propertyName,
            propertyType,
            neighborhood,
            leaseStatus,
        };
    }
}
