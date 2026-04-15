import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import { ContractSummaryDto } from '@modules/contracts/application/dtos/contract-summary.dto';
import { CONTRACT_REPOSITORY, toContractSummaryDto } from './upload-contract.use-case';

@Injectable()
export class GetContractSummaryUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY)
    private readonly repository: IContractRepository,
  ) {}

  async execute(contractId: string, userId: string): Promise<ContractSummaryDto> {
    const contract = await this.repository.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contrato no encontrado');
    }

    const parties = await this.repository.findContractParties(contractId);
    const isParty = parties.some((p) => p.userId === userId);
    if (!isParty) {
      throw new ForbiddenException('No tienes acceso a este contrato');
    }

    return toContractSummaryDto(contract, parties);
  }
}
