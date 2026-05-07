jest.mock("@src/shared/prisma/prisma.service", () => ({ PrismaService: jest.fn() }));
// Feature: backend-database-implementation, Property 25: Contrato PDF almacenado en object storage con referencia en BD (round-trip)
// Validates: Requirements 5.1

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { UploadContractUseCase, CONTRACT_REPOSITORY } from './upload-contract.use-case';
import { GetContractSummaryUseCase } from './get-contract-summary.use-case';
import type { IContractRepository, CreateContractData } from '@modules/contracts/domain/ports/contract-repository.port';
import type { IObjectStorage } from '@modules/contracts/domain/ports/object-storage.port';
import { ContractEntity, ContractStatus } from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import { TransitionLeaseStateUseCase } from '@modules/rental-tracking/application/use-cases/transition-lease-state.use-case';

function uuidv4(): string {
  return crypto.randomUUID();
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryObjectKey = fc
  .stringMatching(/^[a-z0-9_-]{5,20}$/)
  .map((name) => `contracts/${uuidv4()}-${name}.pdf`);

const arbitraryValidDate = (min: Date, max: Date) =>
  fc.integer({ min: min.getTime(), max: max.getTime() }).map((ts) => new Date(ts));

const arbitraryUploadContractInput = fc.record({
  leaseId: fc.constant(uuidv4()),
  startDate: arbitraryValidDate(new Date('2024-01-01'), new Date('2027-12-31')),
  hasEndDate: fc.boolean(),
  endDate: arbitraryValidDate(new Date('2025-01-01'), new Date('2028-12-31')),
  objectKey: arbitraryObjectKey,
  landlordUserId: fc.constant(uuidv4()),
  tenantUserId: fc.constant(uuidv4()),
}).map((r) => ({
  ...r,
  endDate: r.hasEndDate ? r.endDate : undefined,
}));

// ─── Stubs ───────────────────────────────────────────────────────────────────

function makeObjectStorageStub(returnKey: string): IObjectStorage {
  return {
    async uploadFile(): Promise<string> {
      return returnKey;
    },
    async getPresignedUrl(objectKey: string): Promise<string> {
      return `https://presigned.example.com/${objectKey}`;
    },
  };
}

function makeRepositoryStub(landlordUserId: string, tenantUserId: string): {
  stub: IContractRepository;
  capturedData: CreateContractData[];
  storedContracts: Map<string, ContractEntity>;
  storedParties: Map<string, ContractPartyEntity[]>;
} {
  const capturedData: CreateContractData[] = [];
  const storedContracts = new Map<string, ContractEntity>();
  const storedParties = new Map<string, ContractPartyEntity[]>();

  const fileTypeId = uuidv4();
  const fileStatusId = uuidv4();

  const stub: IContractRepository = {
    async create(data: CreateContractData): Promise<ContractEntity> {
      capturedData.push(data);
      const contractId = uuidv4();
      const entity = new ContractEntity(
        contractId, data.leaseId, 'PENDING' as ContractStatus,
        data.startDate, data.endDate ?? null, data.fileUrl, null, null,
      );
      storedContracts.set(contractId, entity);
      storedParties.set(contractId, [
        new ContractPartyEntity(uuidv4(), data.landlordUserId, contractId, 'LANDLORD'),
        new ContractPartyEntity(uuidv4(), data.tenantUserId, contractId, 'TENANT'),
      ]);
      return entity;
    },
    async findById(id: string): Promise<ContractEntity | null> {
      return storedContracts.get(id) ?? null;
    },
    async findByLeaseId(leaseId: string): Promise<ContractEntity | null> {
      for (const c of storedContracts.values()) {
        if (c.leaseId === leaseId) return c;
      }
      return null;
    },
    async updateStatus(id: string, status: ContractStatus, metadata?: { signedAt?: Date; externalSigningId?: string }): Promise<ContractEntity> {
      const existing = storedContracts.get(id);
      if (!existing) throw new Error('Not found');
      const updated = new ContractEntity(existing.id, existing.leaseId, status, existing.startDate, existing.endDate, existing.fileUrl, metadata?.signedAt ?? null, metadata?.externalSigningId ?? null);
      storedContracts.set(id, updated);
      return updated;
    },
    async findContractParties(contractId: string): Promise<ContractPartyEntity[]> {
      return storedParties.get(contractId) ?? [];
    },
    async getLeaseOwnerUserId(): Promise<string | null> { return landlordUserId; },
    async getLeaseTenantUserId(): Promise<string | null> { return tenantUserId; },
    async findContractStatusByName(): Promise<{ id: string } | null> { return { id: uuidv4() }; },
    async findFileTypeByName(): Promise<{ id: string } | null> { return { id: fileTypeId }; },
    async findFileStatusByName(): Promise<{ id: string } | null> { return { id: fileStatusId }; },
    async findContractsByLandlordId(): Promise<any[]> { return []; },
    async findContractsByTenantId(): Promise<any[]> { return []; },
    async updateFileUrl(): Promise<ContractEntity> { throw new Error('Not expected'); },
    async deleteContract(): Promise<void> { throw new Error('Not expected'); },
    async findSigningsByContractId(): Promise<any[]> { return []; },
    async getLeaseMonthlyAmount(): Promise<{ amount: number; currency: string } | null> { return null; },
  };

  return { stub, capturedData, storedContracts, storedParties };
}

function makeAuditLoggerStub(): AuditLoggerService {
  return new AuditLoggerService();
}

function makeNotificationPortStub(): INotificationPort {
  return {
    async notifyContractSigned() { },
    async notifySigningFailed() { },
    async notifyContractUploaded() { },
  };
}

function makeTransitionLeaseStateStub(): TransitionLeaseStateUseCase {
  return { execute: jest.fn().mockResolvedValue(undefined) } as unknown as TransitionLeaseStateUseCase;
}

function makeFileInput(originalname = 'contrato.pdf') {
  return {
    buffer: Buffer.from('fake-pdf-content'),
    originalname,
    size: 1024,
    mimetype: 'application/pdf',
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UploadContractUseCase — Property 25: Contrato PDF almacenado en object storage con referencia en BD (round-trip)', () => {
  it('Property 25 — contract fileUrl persisted in repository is the S3 object key from uploadFile', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUploadContractInput,
        async (input) => {
          const { stub, capturedData } = makeRepositoryStub(input.landlordUserId, input.tenantUserId);
          const objectStorage = makeObjectStorageStub(input.objectKey);
          const auditLogger = makeAuditLoggerStub();
          const useCase = new UploadContractUseCase(stub, objectStorage, makeNotificationPortStub(), auditLogger, makeTransitionLeaseStateStub());

          const file = makeFileInput();
          const dto = {
            leaseId: input.leaseId,
            startDate: input.startDate.toISOString(),
            endDate: input.endDate?.toISOString(),
          };

          const result = await useCase.execute(file, dto as any, input.landlordUserId, ['LANDLORD']);

          if (capturedData.length !== 1) return false;
          const persisted = capturedData[0];

          // The persisted fileUrl must be the S3 object key
          if (persisted.fileUrl !== input.objectKey) return false;
          // The result must contain the same object key
          if (result.fileUrl !== input.objectKey) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 25 — round-trip: uploaded contract can be retrieved with same fileUrl and metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUploadContractInput,
        async (input) => {
          const { stub, storedContracts } = makeRepositoryStub(input.landlordUserId, input.tenantUserId);
          const objectStorage = makeObjectStorageStub(input.objectKey);
          const auditLogger = makeAuditLoggerStub();

          const uploadUseCase = new UploadContractUseCase(stub, objectStorage, makeNotificationPortStub(), auditLogger, makeTransitionLeaseStateStub());
          const getUseCase = new GetContractSummaryUseCase(stub, objectStorage, { naturalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) }, legalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) } } as any);

          const file = makeFileInput();
          const dto = {
            leaseId: input.leaseId,
            startDate: input.startDate.toISOString(),
            endDate: input.endDate?.toISOString(),
          };

          const uploadResult = await uploadUseCase.execute(file, dto as any, input.landlordUserId, ['LANDLORD']);
          const retrieved = await getUseCase.execute(uploadResult.id, input.landlordUserId);

          // Round-trip: fileUrl must be a presigned URL derived from the object key
          if (!retrieved.fileUrl?.includes(input.objectKey)) return false;
          if (retrieved.status !== 'PENDING') return false;
          if (retrieved.leaseId !== input.leaseId) return false;

          const landlordParty = retrieved.parties.find((p) => p.role === 'LANDLORD');
          const tenantParty = retrieved.parties.find((p) => p.role === 'TENANT');
          if (!landlordParty || landlordParty.userId !== input.landlordUserId) return false;
          if (!tenantParty || tenantParty.userId !== input.tenantUserId) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 25 — fileUrl in DB is the S3 object key, not binary data', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUploadContractInput,
        async (input) => {
          const { stub, storedContracts } = makeRepositoryStub(input.landlordUserId, input.tenantUserId);
          const objectStorage = makeObjectStorageStub(input.objectKey);
          const auditLogger = makeAuditLoggerStub();
          const useCase = new UploadContractUseCase(stub, objectStorage, makeNotificationPortStub(), auditLogger, makeTransitionLeaseStateStub());

          const file = makeFileInput();
          const dto = {
            leaseId: input.leaseId,
            startDate: input.startDate.toISOString(),
          };

          const result = await useCase.execute(file, dto as any, input.landlordUserId, ['LANDLORD']);

          const stored = storedContracts.get(result.id);
          if (!stored) return false;

          const url = stored.fileUrl;
          if (url === null) return false;
          // Must not be Buffer representation
          if (url.startsWith('<Buffer')) return false;
          // Must not contain non-printable characters
          // eslint-disable-next-line no-control-regex
          if (/[\x00-\x08\x0e-\x1f\x7f]/.test(url)) return false;
          // Must start with contracts/ prefix
          if (!url.startsWith('contracts/')) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
