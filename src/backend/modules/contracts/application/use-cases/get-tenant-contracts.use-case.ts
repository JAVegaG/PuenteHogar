import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import type { IPIIEncryptor } from '@modules/users/domain/ports/pii-encryptor.port';
import { PII_ENCRYPTOR } from '@modules/users/application/use-cases/register-user.use-case';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import { TenantContractListItemDto } from '@modules/contracts/application/dtos/tenant-contract-list-item.dto';
import { CONTRACT_REPOSITORY } from './upload-contract.use-case';

@Injectable()
export class GetTenantContractsUseCase {
    constructor(
        @Inject(CONTRACT_REPOSITORY)
        private readonly repository: IContractRepository,
        @Inject(PII_ENCRYPTOR)
        private readonly piiEncryptor: IPIIEncryptor,
        private readonly prisma: PrismaService,
    ) { }

    async execute(userId: string): Promise<TenantContractListItemDto[]> {
        const rawItems = await this.repository.findContractsByTenantId(userId);

        if (rawItems.length === 0) {
            return [];
        }

        const unitNameMap = await this.resolveUnitNames(rawItems);
        const landlordNameMap = await this.resolveLandlordNames(rawItems);

        return rawItems.map((item) => {
            const dto = new TenantContractListItemDto();
            dto.id = item.id;
            dto.leaseId = item.leaseId;
            dto.status = item.status;
            dto.startDate = item.startDate;
            dto.endDate = item.endDate;
            dto.unitName = unitNameMap.get(item.portfolioUnitId) ?? 'Unidad desconocida';
            dto.landlordName = landlordNameMap.get(item.landlordUserId) ?? 'Arrendador desconocido';
            return dto;
        });
    }

    private async resolveUnitNames(
        rawItems: { portfolioUnitId: string }[],
    ): Promise<Map<string, string>> {
        const uniqueUnitIds = [...new Set(rawItems.map((i) => i.portfolioUnitId))];

        const units = await this.prisma.portfolioUnit.findMany({
            where: { id: { in: uniqueUnitIds } },
            select: { id: true, name: true },
        });

        const map = new Map<string, string>();
        for (const unit of units) {
            map.set(unit.id, unit.name);
        }
        return map;
    }

    private async resolveLandlordNames(
        rawItems: { landlordUserId: string }[],
    ): Promise<Map<string, string>> {
        const uniqueLandlordIds = [...new Set(rawItems.map((i) => i.landlordUserId))];

        const map = new Map<string, string>();

        const naturalPersons = await this.prisma.naturalPersonDetail.findMany({
            where: { user_id: { in: uniqueLandlordIds } },
            select: { user_id: true, first_name: true, last_name: true },
        });

        for (const np of naturalPersons) {
            map.set(np.user_id, `${np.first_name} ${np.last_name}`);
        }

        const resolvedIds = new Set(naturalPersons.map((np) => np.user_id));
        const unresolvedIds = uniqueLandlordIds.filter((id) => !resolvedIds.has(id));

        if (unresolvedIds.length > 0) {
            const legalPersons = await this.prisma.legalPersonDetail.findMany({
                where: { user_id: { in: unresolvedIds } },
                select: { user_id: true, business_name: true },
            });

            for (const lp of legalPersons) {
                map.set(lp.user_id, lp.business_name);
            }
        }

        return map;
    }
}
