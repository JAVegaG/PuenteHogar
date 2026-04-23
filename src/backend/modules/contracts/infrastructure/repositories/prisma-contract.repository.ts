import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma-generated/client';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { ContractEntity, ContractStatus } from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import {
  CreateContractData,
  IContractRepository,
  LandlordContractListItem,
} from '@modules/contracts/domain/ports/contract-repository.port';

@Injectable()
export class PrismaContractRepository implements IContractRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: CreateContractData): Promise<ContractEntity> {
    const contract = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pendingStatus = await tx.contractStatus.findUnique({ where: { name: 'PENDING' } });
      if (!pendingStatus) throw new Error("ContractStatus 'PENDING' not found in database");

      const created = await tx.contract.create({
        data: {
          lease_id: data.leaseId,
          contract_status_id: pendingStatus.id,
          start_date: data.startDate,
          end_date: data.endDate ?? null,
        },
        include: { status: true, files: true },
      });

      await tx.contractParty.create({
        data: { user_id: data.landlordUserId, contract_id: created.id, role_in_contract: 'LANDLORD' },
      });

      await tx.contractParty.create({
        data: { user_id: data.tenantUserId, contract_id: created.id, role_in_contract: 'TENANT' },
      });

      await tx.file.create({
        data: {
          contract_id: created.id,
          file_type_id: data.fileTypeId,
          file_status_id: data.fileStatusId,
          file_url: data.fileUrl,
        },
      });

      await tx.contractsRaw.create({ data: { payload: JSON.parse(JSON.stringify(data)) } });

      return created;
    });

    return this.toEntity(contract);
  }

  async findById(id: string): Promise<ContractEntity | null> {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { status: true, files: true },
    });
    return contract ? this.toEntity(contract) : null;
  }

  async findByLeaseId(leaseId: string): Promise<ContractEntity | null> {
    const contract = await this.prisma.contract.findFirst({
      where: { lease_id: leaseId },
      include: { status: true, files: true },
    });
    return contract ? this.toEntity(contract) : null;
  }

  async updateStatus(
    id: string,
    status: ContractStatus,
    metadata?: { signedAt?: Date; externalSigningId?: string },
  ): Promise<ContractEntity> {
    const contractStatus = await this.prisma.contractStatus.findUnique({ where: { name: status } });
    if (!contractStatus) throw new Error(`ContractStatus '${status}' not found in database`);

    if (metadata) {
      await this.prisma.contractsRaw.create({
        data: { payload: JSON.parse(JSON.stringify({ contractId: id, status, ...metadata })) },
      });
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { contract_status_id: contractStatus.id },
      include: { status: true, files: true },
    });

    const entity = this.toEntity(updated);
    return new ContractEntity(
      entity.id,
      entity.leaseId,
      entity.status,
      entity.startDate,
      entity.endDate,
      entity.fileUrl,
      metadata?.signedAt ?? entity.signedAt,
      metadata?.externalSigningId ?? entity.externalSigningId,
    );
  }

  async findContractParties(contractId: string): Promise<ContractPartyEntity[]> {
    const parties = await this.prisma.contractParty.findMany({ where: { contract_id: contractId } });
    return parties.map((p) => new ContractPartyEntity(p.id, p.user_id, p.contract_id, p.role_in_contract));
  }

  async getLeaseOwnerUserId(leaseId: string): Promise<string | null> {
    const lease = await this.prisma.lease.findFirst({ where: { id: leaseId }, select: { portfolio_unit_id: true } });
    if (!lease) return null;
    const unit = await this.prisma.portfolioUnit.findFirst({ where: { id: lease.portfolio_unit_id }, select: { portfolio_id: true } });
    if (!unit) return null;
    const portfolio = await this.prisma.landlordPortfolio.findFirst({ where: { id: unit.portfolio_id }, select: { user_id: true } });
    return portfolio?.user_id ?? null;
  }

  async getLeaseTenantUserId(leaseId: string): Promise<string | null> {
    const lease = await this.prisma.lease.findFirst({ where: { id: leaseId }, select: { user_id: true } });
    return lease?.user_id ?? null;
  }

  async findContractStatusByName(name: string): Promise<{ id: string } | null> {
    return this.prisma.contractStatus.findUnique({ where: { name } });
  }

  async findFileTypeByName(name: string): Promise<{ id: string } | null> {
    return this.prisma.fileType.findUnique({ where: { name } });
  }

  async findFileStatusByName(name: string): Promise<{ id: string } | null> {
    return this.prisma.fileStatus.findUnique({ where: { name } });
  }

  async findContractsByLandlordId(landlordUserId: string): Promise<LandlordContractListItem[]> {
    // Step 1: Find all portfolios owned by this landlord
    const portfolios = await this.prisma.landlordPortfolio.findMany({
      where: { user_id: landlordUserId },
      select: { id: true },
    });
    if (portfolios.length === 0) return [];

    const portfolioIds = portfolios.map((p) => p.id);

    // Step 2: Find all portfolio units in those portfolios
    const units = await this.prisma.portfolioUnit.findMany({
      where: { portfolio_id: { in: portfolioIds } },
      select: { id: true, name: true },
    });
    if (units.length === 0) return [];

    const unitIds = units.map((u) => u.id);
    const unitNameMap = new Map(units.map((u) => [u.id, u.name]));

    // Step 3: Find all leases for those units
    const leases = await this.prisma.lease.findMany({
      where: { portfolio_unit_id: { in: unitIds } },
      select: { id: true, portfolio_unit_id: true, user_id: true },
    });
    if (leases.length === 0) return [];

    const leaseIds = leases.map((l) => l.id);

    // Step 4: Find all contracts for those leases (include status)
    const contracts = await this.prisma.contract.findMany({
      where: { lease_id: { in: leaseIds } },
      include: { status: true },
    });
    if (contracts.length === 0) return [];

    // Step 5: Resolve tenant names from User → NaturalPersonDetail
    const tenantUserIds = [...new Set(leases.map((l) => l.user_id))];
    const naturalPersonDetails = await this.prisma.naturalPersonDetail.findMany({
      where: { user_id: { in: tenantUserIds } },
      select: { user_id: true, first_name: true, last_name: true },
    });
    const tenantNameMap = new Map(
      naturalPersonDetails.map((np) => [np.user_id, `${np.first_name} ${np.last_name}`]),
    );

    // Build lookup: leaseId → { unitName, tenantUserId }
    const leaseMap = new Map(
      leases.map((l) => [
        l.id,
        {
          unitName: unitNameMap.get(l.portfolio_unit_id) ?? '',
          tenantUserId: l.user_id,
        },
      ]),
    );

    // Step 6: Map contracts to LandlordContractListItem
    return contracts.map((c) => {
      const leaseInfo = leaseMap.get(c.lease_id);
      return {
        id: c.id,
        unitName: leaseInfo?.unitName ?? '',
        tenantName: tenantNameMap.get(leaseInfo?.tenantUserId ?? '') ?? '',
        status: c.status.name,
        startDate: c.start_date,
        endDate: c.end_date,
      };
    });
  }

  private toEntity(contract: {
    id: string;
    lease_id: string;
    start_date: Date;
    end_date: Date | null;
    status: { name: string };
    files: { file_url: string }[];
  }): ContractEntity {
    return new ContractEntity(
      contract.id,
      contract.lease_id,
      contract.status.name as ContractStatus,
      contract.start_date,
      contract.end_date,
      contract.files[0]?.file_url ?? null,
      null,
      null,
    );
  }
}
