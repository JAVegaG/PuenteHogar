import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { IObjectStorage } from '@modules/contracts/domain/ports/object-storage.port';
import { ContractSummaryDto } from '@modules/contracts/application/dtos/contract-summary.dto';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { CONTRACT_REPOSITORY, CONTRACT_OBJECT_STORAGE, toContractSummaryDto } from './upload-contract.use-case';

@Injectable()
export class GetContractSummaryUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY)
    private readonly repository: IContractRepository,
    @Inject(CONTRACT_OBJECT_STORAGE)
    private readonly objectStorage: IObjectStorage,
    private readonly prisma: PrismaService,
  ) { }

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

    const dto = toContractSummaryDto(contract, parties);

    // Resolve party names cross-schema
    for (const party of dto.parties) {
      party.name = await this.resolveUserName(party.userId);
    }

    if (contract.fileUrl) {
      dto.fileUrl = await this.objectStorage.getPresignedUrl(contract.fileUrl);
    }

    const signings = await this.repository.findSigningsByContractId(contractId);
    dto.signingDetails = signings.map((s) => ({
      role: s.role,
      hasSigned: s.signingStatusName === 'COMPLETED',
    }));

    return dto;
  }

  private async resolveUserName(userId: string): Promise<string | null> {
    const natural = await this.prisma.naturalPersonDetail.findUnique({
      where: { user_id: userId },
    });
    if (natural) {
      return `${natural.first_name} ${natural.last_name}`;
    }

    const legal = await this.prisma.legalPersonDetail.findUnique({
      where: { user_id: userId },
    });
    if (legal) {
      return legal.business_name;
    }

    return null;
  }
}
