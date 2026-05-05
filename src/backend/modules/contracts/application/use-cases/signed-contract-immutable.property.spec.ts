jest.mock("@src/shared/prisma/prisma.service", () => ({ PrismaService: jest.fn() }));
// Feature: backend-database-implementation, Property 31: Contrato SIGNED es inmutable — no permite modificaciones
// Validates: Requirements 5.10

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { InitiateSigningUseCase } from './initiate-signing.use-case';
import { GetContractSummaryUseCase } from './get-contract-summary.use-case';
import type {
  IContractRepository,
  CreateContractData,
} from '@modules/contracts/domain/ports/contract-repository.port';
import {
  ContractEntity,
  ContractStatus,
} from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import type { IObjectStorage } from '@modules/contracts/domain/ports/object-storage.port';
import type { IESignatureProvider } from '@modules/contracts/domain/ports/e-signature-provider.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';

function uuidv4(): string {
  return crypto.randomUUID();
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryValidDate = (min: Date, max: Date) =>
  fc.integer({ min: min.getTime(), max: max.getTime() }).map((ts) => new Date(ts));

const arbitrarySignedContractInput = fc.record({
  contractId: fc.constant(uuidv4()),
  leaseId: fc.constant(uuidv4()),
  landlordUserId: fc.constant(uuidv4()),
  tenantUserId: fc.constant(uuidv4()),
  startDate: arbitraryValidDate(new Date('2024-01-01'), new Date('2027-12-31')),
  signedAt: arbitraryValidDate(new Date('2025-01-01'), new Date('2027-12-31')),
  externalSigningId: fc.stringMatching(/^sig_[a-z0-9]{8,20}$/),
  fileUrl: fc
    .stringMatching(/^[a-z0-9_-]{5,15}$/)
    .map((name) => `https://storage.example.com/contracts/${name}.pdf`),
});

// ─── Stubs ───────────────────────────────────────────────────────────────────

interface StubResult {
  repository: IContractRepository;
  eSignatureProvider: IESignatureProvider;
  circuitBreakerFactory: CircuitBreakerFactory;
  auditLogger: AuditLoggerService;
  storedContracts: Map<string, ContractEntity>;
  statusUpdateCalls: Array<{ id: string; status: ContractStatus }>;
}

function makeStubs(input: {
  contractId: string;
  leaseId: string;
  landlordUserId: string;
  tenantUserId: string;
  startDate: Date;
  signedAt: Date;
  externalSigningId: string;
  fileUrl: string;
}): StubResult {
  const storedContracts = new Map<string, ContractEntity>();
  const storedParties = new Map<string, ContractPartyEntity[]>();
  const statusUpdateCalls: StubResult['statusUpdateCalls'] = [];

  // Seed the contract in SIGNED state (the pre-condition)
  const signedContract = new ContractEntity(
    input.contractId,
    input.leaseId,
    'SIGNED' as ContractStatus,
    input.startDate,
    null,
    input.fileUrl,
    input.signedAt,
    input.externalSigningId,
  );
  storedContracts.set(input.contractId, signedContract);
  storedParties.set(input.contractId, [
    new ContractPartyEntity(uuidv4(), input.landlordUserId, input.contractId, 'LANDLORD'),
    new ContractPartyEntity(uuidv4(), input.tenantUserId, input.contractId, 'TENANT'),
  ]);

  const repository: IContractRepository = {
    async create(_data: CreateContractData): Promise<ContractEntity> {
      throw new Error('Not expected in this test');
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
    async updateStatus(
      id: string,
      status: ContractStatus,
      metadata?: { signedAt?: Date; externalSigningId?: string },
    ): Promise<ContractEntity> {
      statusUpdateCalls.push({ id, status });
      const existing = storedContracts.get(id);
      if (!existing) throw new Error('Not found');
      const updated = new ContractEntity(
        existing.id,
        existing.leaseId,
        status,
        existing.startDate,
        existing.endDate,
        existing.fileUrl,
        metadata?.signedAt ?? existing.signedAt,
        metadata?.externalSigningId ?? existing.externalSigningId,
      );
      storedContracts.set(id, updated);
      return updated;
    },
    async findContractParties(contractId: string): Promise<ContractPartyEntity[]> {
      return storedParties.get(contractId) ?? [];
    },
    async getLeaseOwnerUserId(): Promise<string | null> {
      return input.landlordUserId;
    },
    async getLeaseTenantUserId(): Promise<string | null> {
      return input.tenantUserId;
    },
    async findContractStatusByName(): Promise<{ id: string } | null> {
      return { id: uuidv4() };
    },
    async findFileTypeByName(): Promise<{ id: string } | null> {
      return { id: uuidv4() };
    },
    async findFileStatusByName(): Promise<{ id: string } | null> {
      return { id: uuidv4() };
    },
    async findContractsByLandlordId(): Promise<any[]> {
      return [];
    },
    async findContractsByTenantId(): Promise<any[]> {
      return [];
    },
    async updateFileUrl(): Promise<ContractEntity> {
      throw new Error('Not expected');
    },
    async deleteContract(): Promise<void> {
      throw new Error('Not expected');
    },
    async findSigningsByContractId(): Promise<any[]> {
      return [];
    },
    async getLeaseMonthlyAmount(): Promise<{ amount: number; currency: string } | null> { return null; },
  };

  const eSignatureProvider: IESignatureProvider = {
    async initiateSigningSession() {
      return { externalId: 'sig_should_not_reach', status: 'INITIATED' as const };
    },
  };

  const circuitBreakerFactory = new CircuitBreakerFactory();
  const auditLogger = new AuditLoggerService();

  return {
    repository,
    eSignatureProvider,
    circuitBreakerFactory,
    auditLogger,
    storedContracts,
    statusUpdateCalls,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property 31: Contrato SIGNED es inmutable — no permite modificaciones', () => {
  /**
   * Property 31 — Validates: Requirements 5.10
   *
   * For any contract in SIGNED state:
   *   1. Attempting to initiate a new signing session throws BadRequestException
   *   2. The contract status remains SIGNED (no updateStatus calls)
   *   3. Consultation (GetContractSummary) still works and returns correct data
   */
  it('Property 31 — InitiateSigningUseCase rejects signing on a SIGNED contract with BadRequestException', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySignedContractInput,
        async (input) => {
          const stubs = makeStubs(input);

          const useCase = new InitiateSigningUseCase(
            stubs.repository as any,
            stubs.eSignatureProvider as any,
            stubs.circuitBreakerFactory,
            stubs.auditLogger,
          );

          let threwBadRequest = false;
          try {
            await useCase.execute(
              { contractId: input.contractId } as any,
              input.landlordUserId,
            );
          } catch (err) {
            if (err instanceof BadRequestException) {
              threwBadRequest = true;
            }
          }

          // Must reject with BadRequestException
          if (!threwBadRequest) return false;

          // No status update calls should have been made
          if (stubs.statusUpdateCalls.length !== 0) return false;

          // Contract must still be SIGNED
          const contract = stubs.storedContracts.get(input.contractId);
          if (!contract || contract.status !== 'SIGNED') return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 31 — SIGNED contract remains queryable via GetContractSummaryUseCase', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySignedContractInput,
        async (input) => {
          const stubs = makeStubs(input);

          const objectStorage: IObjectStorage = {
            async uploadFile(): Promise<string> { throw new Error('Not expected'); },
            async getPresignedUrl(objectKey: string): Promise<string> {
              return `https://presigned.example.com/${objectKey}`;
            },
          };
          const getUseCase = new GetContractSummaryUseCase(stubs.repository as any, objectStorage, { naturalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) }, legalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) } } as any);

          // Landlord can query
          const summaryLandlord = await getUseCase.execute(
            input.contractId,
            input.landlordUserId,
          );

          if (summaryLandlord.status !== 'SIGNED') return false;
          if (!summaryLandlord.fileUrl?.includes(input.fileUrl)) return false;
          if (summaryLandlord.leaseId !== input.leaseId) return false;

          // Tenant can also query
          const summaryTenant = await getUseCase.execute(
            input.contractId,
            input.tenantUserId,
          );

          if (summaryTenant.status !== 'SIGNED') return false;
          if (summaryTenant.id !== summaryLandlord.id) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 31 — SIGNED contract metadata (signedAt, externalSigningId) is preserved after failed modification attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySignedContractInput,
        async (input) => {
          const stubs = makeStubs(input);

          const initiateUseCase = new InitiateSigningUseCase(
            stubs.repository as any,
            stubs.eSignatureProvider as any,
            stubs.circuitBreakerFactory,
            stubs.auditLogger,
          );

          // Attempt to modify (should fail)
          try {
            await initiateUseCase.execute(
              { contractId: input.contractId } as any,
              input.landlordUserId,
            );
          } catch {
            // Expected
          }

          // Verify all original metadata is preserved
          const contract = stubs.storedContracts.get(input.contractId);
          if (!contract) return false;

          if (contract.status !== 'SIGNED') return false;
          if (!contract.signedAt) return false;
          if (contract.signedAt.getTime() !== input.signedAt.getTime()) return false;
          if (contract.externalSigningId !== input.externalSigningId) return false;
          if (contract.fileUrl !== input.fileUrl) return false;
          if (contract.leaseId !== input.leaseId) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
