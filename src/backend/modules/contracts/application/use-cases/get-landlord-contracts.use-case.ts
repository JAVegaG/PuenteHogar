import { Inject, Injectable } from '@nestjs/common';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import { LandlordContractListItemDto } from '@modules/contracts/application/dtos/landlord-contract-list-item.dto';
import { CONTRACT_REPOSITORY } from './upload-contract.use-case';

@Injectable()
export class GetLandlordContractsUseCase {
    constructor(
        @Inject(CONTRACT_REPOSITORY)
        private readonly repository: IContractRepository,
    ) { }

    async execute(userId: string): Promise<LandlordContractListItemDto[]> {
        const items = await this.repository.findContractsByLandlordId(userId);

        return items.map((item) => {
            const dto = new LandlordContractListItemDto();
            dto.id = item.id;
            dto.unitName = item.unitName;
            dto.tenantName = item.tenantName;
            dto.status = item.status;
            dto.startDate = item.startDate;
            dto.endDate = item.endDate;
            return dto;
        });
    }
}
