// Feature: backend-database-implementation, Property 28: Firma exitosa actualiza estado del contrato a SIGNED con metadatos
// Validates: Requirements 5.6

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { HandleSigningWebhookUseCase } from './handle-signing-webhook.use-case';
import type { IContractRepository, CreateContractData } from '@modules/contracts/domain/ports/contract-repository.port';
import { ContractEntity, ContractStatus } from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';

function uuidv4(): string {
  return crypto.randomUUID();
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryValidDate = (min: Date, max: Date) =>
  fc.integer({ min: min.getTime(), max: max.getTime() }).map((ts) => new Date(ts));

const arbitrarySigningWebhookInput = fc.record({
  contractId: fc.constant(uuidv4()),
  leaseId: fc.constant(uuidv4()),
  landlordUserId: fc.constant(uuidv4()),
  tenantUserId: fc.constant(uuidv4()),
  externalSigningId: fc.stringMatching(/^sig_[a-z0-9]{8,20}$/),
  completedAt: arbitraryValidDate(new Date('2025-01-01'), new Date('2027-12-31')).map(
    (d) => d.toISOString(),
  ),
  startDate: arbitraryValidDate(new Date('2024-01-01'), new Date('2026-12-31')),
  fileUrl: fc
    .stringMatching(/^[a-z0-9_-]{5,15}$/)
    .map((name) => `https://storage.example.com/contracts/${name}.pdf`),
});

// ─── Stubs ───────────────────────────────────────────────────────────────────

interface StubResult {
  repository: IContractRepository;
  notificationPort: INotificationPort;
  auditLogger: AuditLoggerService;
  storedContracts: Map<string, ContractEntity>;
  notificationCalls: Array<{
    landlordUserId: string;
    tenantUserId: string;
    contractId: string;
    signedAt: Date;
  }>;
  auditEntries: Array<Record<string, unknown>>;
}

function makeStubs(input: {
  contractId: string;
  leaseId: string;
  landlordUserId: string;
  tenantUserId: string;
  startDate: Date;
  fileUrl: string;
}): StubResult {
  const storedContracts = new Map<string, ContractEntity>();
  const storedParties = new Map<string, ContractPartyEntity[]>();
  const notificationCalls: StubResult['notificationCalls'] = [];
  const auditEntries: Array<Record<string, unknown>> = [];

  // Seed the contract in SIGNATURE_PENDING state (pre-condition for webhook)
  const initialContract = new ContractEntity(
    input.contractId,
    input.leaseId,
    'SIGNATURE_PENDING' as ContractStatus,
    input.startDate,
    null,
    input.fileUrl,
    null,
    null,
  );
  storedContracts.set(input.contractId, initialContract);
  storedParties.set(input.contractId, [
    new ContractPartyEntity(uuidv4(), input.landlordUserId, input.contractId, 'LANDLORD'),
    new ContractPartyEntity(uuidv4(), input.tenantUserId, input.contractId, 'TENANT'),
  ]);

  const repository: IContractRepository = {
    async create(data: CreateContractData): Promise<ContractEntity> {
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
    async updateFileUrl(): Promise<ContractEntity> { throw new Error('Not expected'); },
    async deleteContract(): Promise<void> { throw new Error('Not expected'); },
    async findSigningsByContractId(): Promise<any[]> { return []; },
  };

  const notificationPort: INotificationPort = {
    async notifyContractSigned(landlordUserId, tenantUserId, contractId, signedAt) {
      notificationCalls.push({ landlordUserId, tenantUserId, contractId, signedAt });
    },
    async notifySigningFailed() { },
  };

  const auditLogger = new AuditLoggerService();
  // Spy on the log method to capture entries
  const originalLog = auditLogger.log.bind(auditLogger);
  auditLogger.log = (entry: any) => {
    auditEntries.push({ ...entry });
    originalLog(entry);
  };

  return { repository, notificationPort, auditLogger, storedContracts, notificationCalls, auditEntries };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('HandleSigningWebhookUseCase — Property 28: Firma exitosa actualiza estado a SIGNED con metadatos', () => {
  /**
   * Property 28 — Validates: Requirements 5.6
   *
   * For any valid signing webhook with status COMPLETED:
   *   1. The contract status is updated to SIGNED
   *   2. The signedAt timestamp is recorded
   *   3. The externalSigningId from the provider is persisted
   */
  it('Property 28 — successful signing updates contract status to SIGNED with signedAt and externalSigningId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySigningWebhookInput,
        async (input) => {
          const stubs = makeStubs({
            contractId: input.contractId,
            leaseId: input.leaseId,
            landlordUserId: input.landlordUserId,
            tenantUserId: input.tenantUserId,
            startDate: input.startDate,
            fileUrl: input.fileUrl,
          });

          const useCase = new HandleSigningWebhookUseCase(
            stubs.repository as any,
            stubs.notificationPort as any,
            stubs.auditLogger,
          );

          await useCase.execute({
            contractId: input.contractId,
            externalSigningId: input.externalSigningId,
            status: 'COMPLETED',
            completedAt: input.completedAt,
          } as any);

          const updated = stubs.storedContracts.get(input.contractId);
          if (!updated) return false;

          // Status must be SIGNED
          if (updated.status !== 'SIGNED') return false;

          // signedAt must be set and match the completedAt from the webhook
          if (!updated.signedAt) return false;
          const expectedSignedAt = new Date(input.completedAt);
          if (updated.signedAt.getTime() !== expectedSignedAt.getTime()) return false;

          // externalSigningId must be persisted
          if (updated.externalSigningId !== input.externalSigningId) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 28 — SIGNED contract preserves original metadata (leaseId, startDate, fileUrl)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySigningWebhookInput,
        async (input) => {
          const stubs = makeStubs({
            contractId: input.contractId,
            leaseId: input.leaseId,
            landlordUserId: input.landlordUserId,
            tenantUserId: input.tenantUserId,
            startDate: input.startDate,
            fileUrl: input.fileUrl,
          });

          const useCase = new HandleSigningWebhookUseCase(
            stubs.repository as any,
            stubs.notificationPort as any,
            stubs.auditLogger,
          );

          await useCase.execute({
            contractId: input.contractId,
            externalSigningId: input.externalSigningId,
            status: 'COMPLETED',
            completedAt: input.completedAt,
          } as any);

          const updated = stubs.storedContracts.get(input.contractId);
          if (!updated) return false;

          // Original fields must be preserved after signing
          if (updated.leaseId !== input.leaseId) return false;
          if (updated.startDate.getTime() !== input.startDate.getTime()) return false;
          if (updated.fileUrl !== input.fileUrl) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 28 — FAILED webhook keeps contract in SIGNATURE_PENDING, no signedAt', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySigningWebhookInput,
        async (input) => {
          const stubs = makeStubs({
            contractId: input.contractId,
            leaseId: input.leaseId,
            landlordUserId: input.landlordUserId,
            tenantUserId: input.tenantUserId,
            startDate: input.startDate,
            fileUrl: input.fileUrl,
          });

          const useCase = new HandleSigningWebhookUseCase(
            stubs.repository as any,
            stubs.notificationPort as any,
            stubs.auditLogger,
          );

          await useCase.execute({
            contractId: input.contractId,
            externalSigningId: input.externalSigningId,
            status: 'FAILED',
          } as any);

          const updated = stubs.storedContracts.get(input.contractId);
          if (!updated) return false;

          // Status must remain SIGNATURE_PENDING
          if (updated.status !== 'SIGNATURE_PENDING') return false;

          // signedAt must NOT be set
          if (updated.signedAt !== null) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
