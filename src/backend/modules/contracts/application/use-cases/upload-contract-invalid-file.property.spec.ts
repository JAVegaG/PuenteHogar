// Feature: backend-database-implementation, Property 26: Archivo inválido (no PDF o > 10MB) es rechazado con 422
// Validates: Requirements 5.2

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { UnprocessableEntityException } from '@nestjs/common';
import { UploadContractUseCase } from './upload-contract.use-case';
import type { IContractRepository, CreateContractData } from '@modules/contracts/domain/ports/contract-repository.port';
import type { IObjectStorage } from '@modules/contracts/domain/ports/object-storage.port';
import { ContractEntity, ContractStatus } from '@modules/contracts/domain/entities/contract.entity';
import type { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';

function uuidv4(): string {
  return crypto.randomUUID();
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const landlordUserId = uuidv4();
const tenantUserId = uuidv4();
const leaseId = uuidv4();

/** MIME types that are NOT application/pdf */
const arbitraryNonPdfMimeType = fc.oneof(
  fc.constant('image/png'),
  fc.constant('image/jpeg'),
  fc.constant('application/msword'),
  fc.constant('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  fc.constant('text/plain'),
  fc.constant('application/zip'),
  fc.constant('text/html'),
  fc.constant('application/octet-stream'),
);

/** File sizes strictly greater than 10 MB */
const arbitraryOversizedFileBytes = fc.integer({
  min: MAX_FILE_SIZE_BYTES + 1,
  max: MAX_FILE_SIZE_BYTES * 5,
});

/** Valid file size (1 byte to 10 MB) */
const arbitraryValidFileSize = fc.integer({ min: 1, max: MAX_FILE_SIZE_BYTES });

// ─── Stubs ───────────────────────────────────────────────────────────────────

function makeObjectStorageStub(): IObjectStorage {
  return {
    async uploadFile(_buf: Buffer, filename: string): Promise<string> {
      return `contracts/${uuidv4()}-${filename}`;
    },
    async getPresignedUrl(objectKey: string): Promise<string> {
      return `https://presigned.example.com/${objectKey}`;
    },
  };
}

function makeRepositoryStub(): { stub: IContractRepository; createCallCount: number[] } {
  const createCallCount = [0];
  const fileTypeId = uuidv4();
  const fileStatusId = uuidv4();

  const stub: IContractRepository = {
    async create(data: CreateContractData): Promise<ContractEntity> {
      createCallCount[0]++;
      return new ContractEntity(
        uuidv4(), data.leaseId, 'PENDING' as ContractStatus,
        data.startDate, data.endDate ?? null, data.fileUrl, null, null,
      );
    },
    async findById(): Promise<ContractEntity | null> { return null; },
    async findByLeaseId(): Promise<ContractEntity | null> { return null; },
    async updateStatus(id: string, status: ContractStatus): Promise<ContractEntity> {
      throw new Error('Not expected');
    },
    async findContractParties(): Promise<ContractPartyEntity[]> { return []; },
    async getLeaseOwnerUserId(): Promise<string | null> { return landlordUserId; },
    async getLeaseTenantUserId(): Promise<string | null> { return tenantUserId; },
    async findContractStatusByName(): Promise<{ id: string } | null> { return { id: uuidv4() }; },
    async findFileTypeByName(): Promise<{ id: string } | null> { return { id: fileTypeId }; },
    async findFileStatusByName(): Promise<{ id: string } | null> { return { id: fileStatusId }; },
    async findContractsByLandlordId(): Promise<any[]> { return []; },
    async updateFileUrl(): Promise<ContractEntity> { throw new Error('Not expected'); },
    async deleteContract(): Promise<void> { throw new Error('Not expected'); },
    async findSigningsByContractId(): Promise<any[]> { return []; },
  };

  return { stub, createCallCount };
}

function makeAuditLoggerStub(): AuditLoggerService {
  return new AuditLoggerService();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UploadContractUseCase — Property 26: Archivo inválido (no PDF o > 10MB) es rechazado con 422', () => {
  it('Property 26a — non-PDF MIME type is rejected with 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryNonPdfMimeType,
        arbitraryValidFileSize,
        async (mimeType, fileSizeBytes) => {
          const { stub, createCallCount } = makeRepositoryStub();
          const objectStorage = makeObjectStorageStub();
          const useCase = new UploadContractUseCase(stub, objectStorage, makeAuditLoggerStub());

          const file = {
            buffer: Buffer.from('fake-content'),
            originalname: 'contrato.pdf',
            size: fileSizeBytes,
            mimetype: mimeType,
          };
          const dto = { leaseId, startDate: '2025-06-01' };

          try {
            await useCase.execute(file, dto as any, landlordUserId, ['LANDLORD']);
            return false; // Should have thrown
          } catch (err) {
            if (!(err instanceof UnprocessableEntityException)) return false;
            if (createCallCount[0] !== 0) return false;
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 26b — file exceeding 10 MB is rejected with 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryOversizedFileBytes,
        async (fileSizeBytes) => {
          const { stub, createCallCount } = makeRepositoryStub();
          const objectStorage = makeObjectStorageStub();
          const useCase = new UploadContractUseCase(stub, objectStorage, makeAuditLoggerStub());

          const file = {
            buffer: Buffer.from('fake-content'),
            originalname: 'contrato.pdf',
            size: fileSizeBytes,
            mimetype: 'application/pdf',
          };
          const dto = { leaseId, startDate: '2025-06-01' };

          try {
            await useCase.execute(file, dto as any, landlordUserId, ['LANDLORD']);
            return false; // Should have thrown
          } catch (err) {
            if (!(err instanceof UnprocessableEntityException)) return false;
            if (createCallCount[0] !== 0) return false;
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 26c — non-PDF AND oversized file is rejected with 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryNonPdfMimeType,
        arbitraryOversizedFileBytes,
        async (mimeType, fileSizeBytes) => {
          const { stub, createCallCount } = makeRepositoryStub();
          const objectStorage = makeObjectStorageStub();
          const useCase = new UploadContractUseCase(stub, objectStorage, makeAuditLoggerStub());

          const file = {
            buffer: Buffer.from('fake-content'),
            originalname: 'contrato.pdf',
            size: fileSizeBytes,
            mimetype: mimeType,
          };
          const dto = { leaseId, startDate: '2025-06-01' };

          try {
            await useCase.execute(file, dto as any, landlordUserId, ['LANDLORD']);
            return false;
          } catch (err) {
            if (!(err instanceof UnprocessableEntityException)) return false;
            if (createCallCount[0] !== 0) return false;
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 26d — PDF at exactly 10 MB boundary is accepted', async () => {
    const { stub } = makeRepositoryStub();
    const objectStorage = makeObjectStorageStub();
    const useCase = new UploadContractUseCase(stub, objectStorage, makeAuditLoggerStub());

    const file = {
      buffer: Buffer.from('fake-content'),
      originalname: 'contrato.pdf',
      size: MAX_FILE_SIZE_BYTES, // exactly 10 MB
      mimetype: 'application/pdf',
    };
    const dto = { leaseId, startDate: '2025-06-01' };

    const result = await useCase.execute(file, dto as any, landlordUserId, ['LANDLORD']);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
});
