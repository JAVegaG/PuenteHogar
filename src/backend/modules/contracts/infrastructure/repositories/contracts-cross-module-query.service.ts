import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma-generated/client';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { IContractsCrossModuleQuery } from '../../domain/ports/cross-module-query.port';

@Injectable()
export class ContractsCrossModuleQueryService implements IContractsCrossModuleQuery {
    constructor(private readonly prisma: PrismaService) { }

    async hasActiveContractsAsRole(userId: string, role: string): Promise<boolean> {
        const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
            Prisma.sql`
        SELECT COUNT(*) as count
        FROM "contracts"."ContractParty" cp
        INNER JOIN "contracts"."Contract" c ON c."id" = cp."contract_id"
        INNER JOIN "contracts"."ContractStatus" cs ON cs."id" = c."contract_status_id"
        WHERE cp."user_id" = ${userId}
          AND cp."role_in_contract" = ${role}
          AND cs."name" IN ('PENDING', 'SIGNATURE_PENDING')
          AND cp."deleted_at" IS NULL
          AND c."deleted_at" IS NULL
          AND cs."deleted_at" IS NULL
      `,
        );
        return Number(result[0].count) > 0;
    }
}
