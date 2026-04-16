// Feature: backend-database-implementation, Property 25: Contrato PDF almacenado en object storage con referencia en BD (round-trip)
// Validates: Requirements 5.1

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { UploadContractUseCase, CONTRACT_REPOSITORY } from './upload-contract.use-case';
import { GetContractSummaryUseCase } from './get-contract-summary.use-case';
import type { IContractRepository, CreateContractData } from '@modules/contracts/domain/ports/contract-repository.port';
import { ContractEntity, ContractStatus } from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { Logger } from '@nestjs/common';

function uuidv4(): string {
  return crypto.randomUUID();
}

// ─── URL validation helpers ──────────────────────────────────────────────────

function isValidUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function isNotBinaryData(value: string): boolean {
  if (/^<Buffer\s/.test(value)) return false;
  if (/^[A-Za-z0-9+/]{50,}={0,2}$/.test(value)) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0e-\x1f\x7f]/.test(value)) return false;
  return true;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryObjectStorageUrl = fc
  .stringMatching(/^[a-z0-9_-]{5,20}$/)
  .map((name) => `https://storage.example.com/contracts/${uuidv4()}-${name}.pdf`);

const arbitraryValidDate = (min: Date, max: Date) =>
  fc.integer({ min: min.getTime(), max: max.getTime() }).map((ts) => new Date(ts));

const arbitraryUploadContractInput = fc.record({
  leaseId: fc.constant(uuidv4()),
  startDate: arbitraryValidDate(new Date('2024-01-01'), new Date('2027-12-31')),
  hasEndDate: fc.boolean(),
  endDate: arbitraryValidDate(new Date('2025-01-01'), new Date('2028-12-31')),
  fileUrl: arbitraryObjectStorageUrl,
  landlordUserId: fc.constant(uuidv4()),
  tenantUserId: fc.constant(uuidv4()),
}).map((r) => ({
  ...r,
  endDate: r.hasEndDate ? r.endDate : undefined,
}));

// ─── Stubs ───────────────────────────────────────────────────────────────────


/**
 * In-memory repository stub that captures persisted data and supports retrieval.
 * This lets us verify the round-trip: upload → persist URL → retrieve URL.
 */
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
        contractId,
        data.leaseId,
        'PENDING' as ContractStatus,
        data.startDate,
        data.endDate ?? null,
        data.fileUrl,
        null,
        null,
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
    async getLeaseOwnerUserId(): Promise<string | null> {
      return landlordUserId;
    },
    async getLeaseTenantUserId(): Promise<string | null> {
      return tenantUserId;
    },
    async findContractStatusByName(): Promise<{ id: string } | null> {
      return { id: uuidv4() };
    },
    async findFileTypeByName(): Promise<{ id: string } | null> {
      return { id: fileTypeId };
    },
    async findFileStatusByName(): Promise<{ id: string } | null> {
      return { id: fileStatusId };
    },
  };

  return { stub, capturedData, storedContracts, storedParties };
}

function makeAuditLoggerStub(): AuditLoggerService {
  return new AuditLoggerService();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UploadContractUseCase — Property 25: Contrato PDF almacenado en object storage con referencia en BD (round-trip)', () => {
  /**
   * Property 25 — Validates: Requirements 5.1
   *
   * For any valid contract upload with a PDF file URL from object storage:
   *   1. The repository persists the file URL (not binary data)
   *   2. The persisted URL is a valid HTTPS URL
   *   3. Retrieving the contract returns the same file URL (round-trip)
   *   4. The contract is created in PENDING status with correct metadata
   */
  it('Property 25 — contract fileUrl persisted in repository is a valid URL, never binary data', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUploadContractInput,
        async (input) => {
          const { stub, capturedData } = makeRepositoryStub(input.landlordUserId, input.tenantUserId);
          const auditLogger = makeAuditLoggerStub();
          const useCase = new UploadContractUseCase(stub, auditLogger);

          const dto = {
            leaseId: input.leaseId,
            startDate: input.startDate.toISOString(),
            endDate: input.endDate?.toISOString(),
            fileUrl: input.fileUrl,
            mimeType: 'application/pdf',
            fileSizeBytes: 1024,
          };

          const result = await useCase.execute(
            dto as any,
            input.landlordUserId,
            ['LANDLORD'],
          );

          // Repository must have received exactly one create call
          if (capturedData.length !== 1) return false;

          const persisted = capturedData[0];

          // The persisted fileUrl must be a valid URL string
          if (typeof persisted.fileUrl !== 'string') return false;
          if (!isValidUrl(persisted.fileUrl)) return false;
          if (!isNotBinaryData(persisted.fileUrl)) return false;

          // The persisted fileUrl must match the input URL
          if (persisted.fileUrl !== input.fileUrl) return false;

          // The result must contain the same fileUrl
          if (result.fileUrl !== input.fileUrl) return false;

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
          const auditLogger = makeAuditLoggerStub();

          const uploadUseCase = new UploadContractUseCase(stub, auditLogger);
          const getUseCase = new GetContractSummaryUseCase(stub);

          const dto = {
            leaseId: input.leaseId,
            startDate: input.startDate.toISOString(),
            endDate: input.endDate?.toISOString(),
            fileUrl: input.fileUrl,
            mimeType: 'application/pdf',
            fileSizeBytes: 5000,
          };

          const uploadResult = await uploadUseCase.execute(
            dto as any,
            input.landlordUserId,
            ['LANDLORD'],
          );

          // Retrieve the contract as the landlord (who is a party)
          const retrieved = await getUseCase.execute(uploadResult.id, input.landlordUserId);

          // Round-trip: fileUrl must match
          if (retrieved.fileUrl !== input.fileUrl) return false;

          // Status must be PENDING after upload
          if (retrieved.status !== 'PENDING') return false;

          // Lease ID must match
          if (retrieved.leaseId !== input.leaseId) return false;

          // Parties must include landlord and tenant
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

  it('Property 25 — fileUrl in DB is never binary data or base64 blob', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUploadContractInput,
        async (input) => {
          const { stub, storedContracts } = makeRepositoryStub(input.landlordUserId, input.tenantUserId);
          const auditLogger = makeAuditLoggerStub();
          const useCase = new UploadContractUseCase(stub, auditLogger);

          const dto = {
            leaseId: input.leaseId,
            startDate: input.startDate.toISOString(),
            fileUrl: input.fileUrl,
            mimeType: 'application/pdf',
          };

          const result = await useCase.execute(dto as any, input.landlordUserId, ['LANDLORD']);

          // Check the stored entity directly
          const stored = storedContracts.get(result.id);
          if (!stored) return false;

          const url = stored.fileUrl;
          if (url === null) return false;

          // Must not be Buffer representation
          if (url.startsWith('<Buffer')) return false;
          // Must not be raw base64
          if (/^[A-Za-z0-9+/]{50,}={0,2}$/.test(url)) return false;
          // Must not contain non-printable characters
          // eslint-disable-next-line no-control-regex
          if (/[\x00-\x08\x0e-\x1f\x7f]/.test(url)) return false;
          // Must be a valid URL
          if (!isValidUrl(url)) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
