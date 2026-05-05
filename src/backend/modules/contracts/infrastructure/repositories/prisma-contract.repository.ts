import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma-generated/client';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { ContractEntity, ContractStatus } from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import {
  CreateContractData,
  IContractRepository,
  LandlordContractListItem,
  SigningInfo,
  TenantContractRawItem,
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
      where: { portfolio_unit_id: { in: unitIds }, deleted_at: null },
      select: { id: true, portfolio_unit_id: true, user_id: true },
    });
    if (leases.length === 0) return [];

    const leaseIds = leases.map((l) => l.id);

    // Step 4: Find all contracts for those leases (include status)
    const contracts = await this.prisma.contract.findMany({
      where: { lease_id: { in: leaseIds }, deleted_at: null },
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

  async findContractsByTenantId(tenantUserId: string): Promise<TenantContractRawItem[]> {
    // Step 1: Find all ContractParty where user_id = tenantUserId and role_in_contract = 'TENANT'
    const tenantParties = await this.prisma.contractParty.findMany({
      where: { user_id: tenantUserId, role_in_contract: 'TENANT' },
      select: { contract_id: true },
    });
    if (tenantParties.length === 0) return [];

    const contractIds = tenantParties.map((p) => p.contract_id);

    // Step 2: Find all Contracts by those IDs, include status, order by created_at DESC
    const contracts = await this.prisma.contract.findMany({
      where: { id: { in: contractIds }, deleted_at: null },
      include: { status: true },
      orderBy: { created_at: 'desc' },
    });
    if (contracts.length === 0) return [];

    // Step 3: For each contract, resolve Lease to get portfolio_unit_id and find the LANDLORD party
    const leaseIds = [...new Set(contracts.map((c) => c.lease_id))];
    const leases = await this.prisma.lease.findMany({
      where: { id: { in: leaseIds } },
      select: { id: true, portfolio_unit_id: true },
    });
    const leaseMap = new Map(leases.map((l) => [l.id, l.portfolio_unit_id]));

    // Find landlord parties for these contracts
    const landlordParties = await this.prisma.contractParty.findMany({
      where: { contract_id: { in: contractIds }, role_in_contract: 'LANDLORD' },
      select: { contract_id: true, user_id: true },
    });
    const landlordMap = new Map(landlordParties.map((p) => [p.contract_id, p.user_id]));

    return contracts.map((c) => ({
      id: c.id,
      leaseId: c.lease_id,
      status: c.status.name,
      startDate: c.start_date,
      endDate: c.end_date,
      portfolioUnitId: leaseMap.get(c.lease_id) ?? '',
      landlordUserId: landlordMap.get(c.id) ?? '',
      createdAt: c.created_at,
    }));
  }

  async deleteContract(contractId: string): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Find all contract parties
      const parties = await tx.contractParty.findMany({
        where: { contract_id: contractId },
        select: { id: true },
      });
      const partyIds = parties.map((p) => p.id);

      // 2. Find all signings for those parties
      const signings = await tx.signing.findMany({
        where: { contract_party_id: { in: partyIds } },
        select: { id: true },
      });
      const signingIds = signings.map((s) => s.id);

      // 3. Delete SigningLog records
      if (signingIds.length > 0) {
        await tx.signingLog.deleteMany({
          where: { signing_id: { in: signingIds } },
        });
      }

      // 4. Delete Signing records
      if (partyIds.length > 0) {
        await tx.signing.deleteMany({
          where: { contract_party_id: { in: partyIds } },
        });
      }

      // 5. Delete File records
      await tx.file.deleteMany({
        where: { contract_id: contractId },
      });

      // 6. Delete ContractParty records
      await tx.contractParty.deleteMany({
        where: { contract_id: contractId },
      });

      // 7. Delete the Contract record
      await tx.contract.delete({
        where: { id: contractId },
      });
    });
  }

  async getLeaseMonthlyAmount(leaseId: string): Promise<{ amount: number; currency: string } | null> {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId },
      select: { portfolio_unit_id: true },
    });
    if (!lease) return null;

    const unit = await this.prisma.portfolioUnit.findFirst({
      where: { id: lease.portfolio_unit_id },
      select: { lease_base_amount: true, lease_base_currency: true },
    });
    if (!unit) return null;

    return {
      amount: Number(unit.lease_base_amount),
      currency: unit.lease_base_currency ?? 'COP',
    };
  }

  async findSigningsByContractId(contractId: string): Promise<SigningInfo[]> {
    const parties = await this.prisma.contractParty.findMany({
      where: { contract_id: contractId },
      include: {
        signings: {
          include: { signing_status: true },
        },
      },
    });

    return parties.map((party) => ({
      contractPartyId: party.id,
      role: party.role_in_contract,
      signingStatusName: party.signings[0]?.signing_status.name ?? 'PENDING',
    }));
  }

  async updateFileUrl(contractId: string, newFileUrl: string): Promise<ContractEntity> {
    const file = await this.prisma.file.findFirst({
      where: { contract_id: contractId },
    });
    if (!file) throw new Error(`No file found for contract ${contractId}`);

    await this.prisma.file.update({
      where: { id: file.id },
      data: { file_url: newFileUrl },
    });

    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { status: true, files: true },
    });
    if (!contract) throw new Error(`Contract ${contractId} not found`);

    return this.toEntity(contract);
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
