jest.mock("@src/shared/prisma/prisma.service", () => ({ PrismaService: jest.fn() }));
// Feature: backend-database-implementation, Property 27: Resumen de contrato contiene campos clave y URL del documento
// Validates: Requirements 5.4

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetContractSummaryUseCase } from './get-contract-summary.use-case';
import type { IContractRepository, CreateContractData, SigningInfo } from '@modules/contracts/domain/ports/contract-repository.port';
import type { IObjectStorage } from '@modules/contracts/domain/ports/object-storage.port';
import { ContractEntity, ContractStatus } from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';

function uuidv4(): string {
  return crypto.randomUUID();
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryContractStatus: fc.Arbitrary<ContractStatus> = fc.oneof(
  fc.constant('PENDING' as ContractStatus),
  fc.constant('SIGNATURE_PENDING' as ContractStatus),
  fc.constant('SIGNED' as ContractStatus),
);

const arbitraryValidDate = (min: Date, max: Date) =>
  fc.integer({ min: min.getTime(), max: max.getTime() }).map((ts) => new Date(ts));

const arbitraryObjectStorageUrl = fc
  .stringMatching(/^[a-z0-9_-]{5,20}$/)
  .map((name) => `https://storage.example.com/contracts/${uuidv4()}-${name}.pdf`);

const arbitraryContractInput = fc.record({
  contractId: fc.constant(uuidv4()).map(() => uuidv4()),
  leaseId: fc.constant(uuidv4()).map(() => uuidv4()),
  status: arbitraryContractStatus,
  startDate: arbitraryValidDate(new Date('2024-01-01'), new Date('2027-12-31')),
  hasEndDate: fc.boolean(),
  endDate: arbitraryValidDate(new Date('2025-01-01'), new Date('2028-12-31')),
  fileUrl: arbitraryObjectStorageUrl,
  isSigned: fc.boolean(),
  signedAt: arbitraryValidDate(new Date('2024-06-01'), new Date('2027-12-31')),
  externalSigningId: fc.constant(uuidv4()).map(() => `sig-${uuidv4()}`),
  landlordUserId: fc.constant(uuidv4()).map(() => uuidv4()),
  tenantUserId: fc.constant(uuidv4()).map(() => uuidv4()),
});


// ─── Stubs ───────────────────────────────────────────────────────────────────

const PRESIGNED_URL_PREFIX = 'https://presigned.example.com/';

function makeObjectStorageStub(): IObjectStorage {
  return {
    async uploadFile(): Promise<string> { throw new Error('Not expected'); },
    async getPresignedUrl(objectKey: string): Promise<string> {
      return `${PRESIGNED_URL_PREFIX}${objectKey}?token=abc`;
    },
  };
}

function makeRepositoryStub(input: {
  contractId: string;
  leaseId: string;
  status: ContractStatus;
  startDate: Date;
  endDate: Date | null;
  fileUrl: string;
  signedAt: Date | null;
  externalSigningId: string | null;
  landlordUserId: string;
  tenantUserId: string;
}): IContractRepository {
  const entity = new ContractEntity(
    input.contractId,
    input.leaseId,
    input.status,
    input.startDate,
    input.endDate,
    input.fileUrl,
    input.signedAt,
    input.externalSigningId,
  );

  const parties = [
    new ContractPartyEntity(uuidv4(), input.landlordUserId, input.contractId, 'LANDLORD'),
    new ContractPartyEntity(uuidv4(), input.tenantUserId, input.contractId, 'TENANT'),
  ];

  return {
    async findById(id: string): Promise<ContractEntity | null> {
      return id === input.contractId ? entity : null;
    },
    async findContractParties(contractId: string): Promise<ContractPartyEntity[]> {
      return contractId === input.contractId ? parties : [];
    },
    async findSigningsByContractId(contractId: string): Promise<SigningInfo[]> {
      if (contractId !== input.contractId) return [];
      return parties.map((p) => ({
        contractPartyId: p.id,
        role: p.roleInContract,
        signingStatusName: 'PENDING',
      }));
    },
    // Unused methods for this test
    async create(): Promise<ContractEntity> { throw new Error('Not expected'); },
    async findByLeaseId(): Promise<ContractEntity | null> { return null; },
    async updateStatus(): Promise<ContractEntity> { throw new Error('Not expected'); },
    async getLeaseOwnerUserId(): Promise<string | null> { return null; },
    async getLeaseTenantUserId(): Promise<string | null> { return null; },
    async findContractStatusByName(): Promise<{ id: string } | null> { return null; },
    async findFileTypeByName(): Promise<{ id: string } | null> { return null; },
    async findFileStatusByName(): Promise<{ id: string } | null> { return null; },
    async findContractsByLandlordId(): Promise<any[]> { return []; },
    async findContractsByTenantId(): Promise<any[]> { return []; },
    async updateFileUrl(): Promise<ContractEntity> { throw new Error('Not expected'); },
    async deleteContract(): Promise<void> { throw new Error('Not expected'); },
    async getLeaseMonthlyAmount(): Promise<{ amount: number; currency: string } | null> { return null; },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetContractSummaryUseCase — Property 27: Resumen de contrato contiene campos clave y URL del documento', () => {
  /**
   * Property 27 — Validates: Requirements 5.4
   *
   * For any valid contract with parties, the summary returned by
   * GetContractSummaryUseCase must contain all key fields:
   *   - id, leaseId, status, startDate, endDate
   *   - fileUrl (URL del documento completo)
   *   - signedAt, externalSigningId (signing metadata)
   *   - parties (with userId and role for each party)
   *
   * All field values must match the underlying contract entity.
   */
  it('Property 27a — summary contains all key fields matching the contract entity', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryContractInput,
        async (raw) => {
          const input = {
            contractId: raw.contractId,
            leaseId: raw.leaseId,
            status: raw.status,
            startDate: raw.startDate,
            endDate: raw.hasEndDate ? raw.endDate : null,
            fileUrl: raw.fileUrl,
            signedAt: raw.isSigned ? raw.signedAt : null,
            externalSigningId: raw.isSigned ? raw.externalSigningId : null,
            landlordUserId: raw.landlordUserId,
            tenantUserId: raw.tenantUserId,
          };

          const repo = makeRepositoryStub(input);
          const objectStorage = makeObjectStorageStub();
          const useCase = new GetContractSummaryUseCase(repo, objectStorage, { naturalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) }, legalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) } } as any);

          // Execute as the landlord (a valid party)
          const summary = await useCase.execute(input.contractId, input.landlordUserId);

          // All key fields must be present and match
          if (summary.id !== input.contractId) return false;
          if (summary.leaseId !== input.leaseId) return false;
          if (summary.status !== input.status) return false;
          if (summary.startDate.getTime() !== input.startDate.getTime()) return false;

          // endDate
          if (input.endDate === null) {
            if (summary.endDate !== null) return false;
          } else {
            if (summary.endDate === null) return false;
            if (summary.endDate.getTime() !== input.endDate.getTime()) return false;
          }

          // fileUrl — must be a presigned URL (not the raw object key)
          if (!summary.fileUrl?.startsWith(PRESIGNED_URL_PREFIX)) return false;

          // Signing metadata
          if (input.signedAt === null) {
            if (summary.signedAt !== null) return false;
          } else {
            if (summary.signedAt === null) return false;
            if (summary.signedAt.getTime() !== input.signedAt.getTime()) return false;
          }
          if (summary.externalSigningId !== input.externalSigningId) return false;

          // Parties must include both landlord and tenant
          if (summary.parties.length !== 2) return false;
          const landlord = summary.parties.find((p) => p.role === 'LANDLORD');
          const tenant = summary.parties.find((p) => p.role === 'TENANT');
          if (!landlord || landlord.userId !== input.landlordUserId) return false;
          if (!tenant || tenant.userId !== input.tenantUserId) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * The fileUrl in the summary must always be a valid URL string pointing
   * to the document in object storage — never null for a contract that has
   * a file uploaded, and never binary data.
   */
  it('Property 27b — fileUrl is a valid URL string, never binary data', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryContractInput,
        async (raw) => {
          const input = {
            contractId: raw.contractId,
            leaseId: raw.leaseId,
            status: raw.status,
            startDate: raw.startDate,
            endDate: raw.hasEndDate ? raw.endDate : null,
            fileUrl: raw.fileUrl,
            signedAt: raw.isSigned ? raw.signedAt : null,
            externalSigningId: raw.isSigned ? raw.externalSigningId : null,
            landlordUserId: raw.landlordUserId,
            tenantUserId: raw.tenantUserId,
          };

          const repo = makeRepositoryStub(input);
          const objectStorage = makeObjectStorageStub();
          const useCase = new GetContractSummaryUseCase(repo, objectStorage, { naturalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) }, legalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) } } as any);

          const summary = await useCase.execute(input.contractId, input.landlordUserId);

          // fileUrl must be a string
          if (typeof summary.fileUrl !== 'string') return false;
          // Must be a presigned URL (starts with the presigned prefix)
          if (!summary.fileUrl.startsWith(PRESIGNED_URL_PREFIX)) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Both landlord and tenant (contract parties) must be able to retrieve
   * the same summary with identical field values.
   */
  it('Property 27c — both parties retrieve identical summary', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryContractInput,
        async (raw) => {
          const input = {
            contractId: raw.contractId,
            leaseId: raw.leaseId,
            status: raw.status,
            startDate: raw.startDate,
            endDate: raw.hasEndDate ? raw.endDate : null,
            fileUrl: raw.fileUrl,
            signedAt: raw.isSigned ? raw.signedAt : null,
            externalSigningId: raw.isSigned ? raw.externalSigningId : null,
            landlordUserId: raw.landlordUserId,
            tenantUserId: raw.tenantUserId,
          };

          const repo = makeRepositoryStub(input);
          const objectStorage = makeObjectStorageStub();
          const useCase = new GetContractSummaryUseCase(repo, objectStorage, { naturalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) }, legalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) } } as any);

          const landlordView = await useCase.execute(input.contractId, input.landlordUserId);
          const tenantView = await useCase.execute(input.contractId, input.tenantUserId);

          // Both views must have identical key fields
          if (landlordView.id !== tenantView.id) return false;
          if (landlordView.leaseId !== tenantView.leaseId) return false;
          if (landlordView.status !== tenantView.status) return false;
          if (landlordView.fileUrl !== tenantView.fileUrl) return false;
          if (landlordView.startDate.getTime() !== tenantView.startDate.getTime()) return false;
          if (landlordView.parties.length !== tenantView.parties.length) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * A user who is NOT a party to the contract must receive a 403 error.
   */
  it('Property 27d — non-party user receives 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryContractInput,
        async (raw) => {
          const input = {
            contractId: raw.contractId,
            leaseId: raw.leaseId,
            status: raw.status,
            startDate: raw.startDate,
            endDate: null,
            fileUrl: raw.fileUrl,
            signedAt: null,
            externalSigningId: null,
            landlordUserId: raw.landlordUserId,
            tenantUserId: raw.tenantUserId,
          };

          const repo = makeRepositoryStub(input);
          const objectStorage = makeObjectStorageStub();
          const useCase = new GetContractSummaryUseCase(repo, objectStorage, { naturalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) }, legalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) } } as any);

          const outsiderUserId = uuidv4();

          try {
            await useCase.execute(input.contractId, outsiderUserId);
            return false; // Should have thrown
          } catch (err) {
            return err instanceof ForbiddenException;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
