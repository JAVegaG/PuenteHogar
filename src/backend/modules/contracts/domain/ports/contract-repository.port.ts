import type { ContractEntity, ContractStatus } from '../entities/contract.entity';
import type { ContractPartyEntity } from '../entities/contract-party.entity';

export interface CreateContractData {
  leaseId: string;
  startDate: Date;
  endDate?: Date;
  fileUrl: string;
  fileTypeId: string;
  fileStatusId: string;
  landlordUserId: string;
  tenantUserId: string;
}

export interface IContractRepository {
  create(data: CreateContractData): Promise<ContractEntity>;
  findById(id: string): Promise<ContractEntity | null>;
  findByLeaseId(leaseId: string): Promise<ContractEntity | null>;
  updateStatus(
    id: string,
    status: ContractStatus,
    metadata?: { signedAt?: Date; externalSigningId?: string },
  ): Promise<ContractEntity>;
  findContractParties(contractId: string): Promise<ContractPartyEntity[]>;
  getLeaseOwnerUserId(leaseId: string): Promise<string | null>;
  getLeaseTenantUserId(leaseId: string): Promise<string | null>;
  findContractStatusByName(name: string): Promise<{ id: string } | null>;
  findFileTypeByName(name: string): Promise<{ id: string } | null>;
  findFileStatusByName(name: string): Promise<{ id: string } | null>;
}
