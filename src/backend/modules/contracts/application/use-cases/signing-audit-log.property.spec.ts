// Feature: backend-database-implementation, Property 30: Eventos de firma registrados en log de auditoría
// Validates: Requirements 5.9

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { InitiateSigningUseCase } from './initiate-signing.use-case';
import { HandleSigningWebhookUseCase } from './handle-signing-webhook.use-case';
import type { IContractRepository, CreateContractData } from '@modules/contracts/domain/ports/contract-repository.port';
import { ContractEntity, ContractStatus } from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import type { IESignatureProvider } from '@modules/contracts/domain/ports/e-signature-provider.port';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import { AuditLoggerService, AuditEntry } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';

function uuidv4(): string {
  return crypto.randomUUID();
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbitraryValidDate = (min: Date, max: Date) =>
  fc.integer({ min: min.getTime(), max: max.getTime() }).map((ts) => new Date(ts));

const arbitrarySigningInput = fc.record({
  contractId: fc.constant(uuidv4()),
  leaseId: fc.constant(uuidv4()),
  landlordUserId: fc.constant(uuidv4()),
  tenantUserId: fc.constant(uuidv4()),
  userId: fc.constant(uuidv4()),
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
  eSignatureProvider: IESignatureProvider;
  notificationPort: INotificationPort;
  circuitBreakerFactory: CircuitBreakerFactory;
  auditLogger: AuditLoggerService;
  auditEntries: AuditEntry[];
  storedContracts: Map<string, ContractEntity>;
}

function makeStubs(input: {
  contractId: string;
  leaseId: string;
  landlordUserId: string;
  tenantUserId: string;
  userId: string;
  startDate: Date;
  fileUrl: string;
  externalSigningId: string;
  simulateCircuitOpen?: boolean;
}): StubResult {
  const storedContracts = new Map<string, ContractEntity>();
  const storedParties = new Map<string, ContractPartyEntity[]>();
  const auditEntries: AuditEntry[] = [];

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

  // The userId who initiates signing must be a party
  storedParties.set(input.contractId, [
    new ContractPartyEntity(uuidv4(), input.userId, input.contractId, 'LANDLORD'),
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
    async updateFileUrl(): Promise<ContractEntity> { throw new Error('Not expected'); },
    async deleteContract(): Promise<void> { throw new Error('Not expected'); },
    async findSigningsByContractId(): Promise<any[]> { return []; },
  };

  const eSignatureProvider: IESignatureProvider = {
    async initiateSigningSession() {
      return { externalId: input.externalSigningId, status: 'INITIATED' as const };
    },
  };

  const notificationPort: INotificationPort = {
    async notifyContractSigned() { },
    async notifySigningFailed() { },
  };

  const auditLogger = new AuditLoggerService();
  const originalLog = auditLogger.log.bind(auditLogger);
  auditLogger.log = (entry: AuditEntry) => {
    auditEntries.push({ ...entry });
    originalLog(entry);
  };

  const circuitBreakerFactory = new CircuitBreakerFactory();

  return {
    repository,
    eSignatureProvider,
    notificationPort,
    circuitBreakerFactory,
    auditLogger,
    auditEntries,
    storedContracts,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property 30: Eventos de firma registrados en log de auditoría', () => {
  /**
   * Property 30 — Validates: Requirements 5.9
   *
   * For any signing event (initiation, confirmation, failure):
   *   1. An audit log entry is created with userId, action, resource, resourceId, and timestamp
   *   2. The action field reflects the event type (SIGNING_INITIATED, CONTRACT_SIGNED, SIGNING_WEBHOOK_FAILED)
   *   3. Metadata includes the externalSigningId when available
   */

  it('Property 30a — initiating signing logs SIGNING_INITIATED with userId, contractId, and externalId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySigningInput,
        async (input) => {
          const stubs = makeStubs({
            contractId: input.contractId,
            leaseId: input.leaseId,
            landlordUserId: input.landlordUserId,
            tenantUserId: input.tenantUserId,
            userId: input.userId,
            startDate: input.startDate,
            fileUrl: input.fileUrl,
            externalSigningId: input.externalSigningId,
          });

          const useCase = new InitiateSigningUseCase(
            stubs.repository as any,
            stubs.eSignatureProvider as any,
            stubs.circuitBreakerFactory,
            stubs.auditLogger,
          );

          await useCase.execute({ contractId: input.contractId } as any, input.userId);

          // Must have at least one audit entry for SIGNING_INITIATED
          const initiatedEntry = stubs.auditEntries.find(
            (e) => e.action === 'SIGNING_INITIATED',
          );
          if (!initiatedEntry) return false;

          // Verify required fields
          if (initiatedEntry.userId !== input.userId) return false;
          if (initiatedEntry.resource !== 'Contract') return false;
          if (initiatedEntry.resourceId !== input.contractId) return false;
          if (!(initiatedEntry.timestamp instanceof Date)) return false;

          // Metadata must include externalId
          const meta = initiatedEntry.metadata as Record<string, unknown> | undefined;
          if (!meta || meta['externalId'] !== input.externalSigningId) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 30b — successful signing webhook logs CONTRACT_SIGNED with contractId and externalSigningId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySigningInput,
        async (input) => {
          const stubs = makeStubs({
            contractId: input.contractId,
            leaseId: input.leaseId,
            landlordUserId: input.userId,
            tenantUserId: input.tenantUserId,
            userId: input.userId,
            startDate: input.startDate,
            fileUrl: input.fileUrl,
            externalSigningId: input.externalSigningId,
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

          const signedEntry = stubs.auditEntries.find(
            (e) => e.action === 'CONTRACT_SIGNED',
          );
          if (!signedEntry) return false;

          if (signedEntry.userId !== 'system') return false;
          if (signedEntry.resource !== 'Contract') return false;
          if (signedEntry.resourceId !== input.contractId) return false;
          if (!(signedEntry.timestamp instanceof Date)) return false;

          const meta = signedEntry.metadata as Record<string, unknown> | undefined;
          if (!meta || meta['externalSigningId'] !== input.externalSigningId) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 30c — failed signing webhook logs SIGNING_WEBHOOK_FAILED with contractId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySigningInput,
        async (input) => {
          const stubs = makeStubs({
            contractId: input.contractId,
            leaseId: input.leaseId,
            landlordUserId: input.userId,
            tenantUserId: input.tenantUserId,
            userId: input.userId,
            startDate: input.startDate,
            fileUrl: input.fileUrl,
            externalSigningId: input.externalSigningId,
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

          const failedEntry = stubs.auditEntries.find(
            (e) => e.action === 'SIGNING_WEBHOOK_FAILED',
          );
          if (!failedEntry) return false;

          if (failedEntry.userId !== 'system') return false;
          if (failedEntry.resource !== 'Contract') return false;
          if (failedEntry.resourceId !== input.contractId) return false;
          if (!(failedEntry.timestamp instanceof Date)) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 30d — circuit breaker fallback logs SIGNING_FAILED with reason circuit_open', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySigningInput,
        async (input) => {
          const stubs = makeStubs({
            contractId: input.contractId,
            leaseId: input.leaseId,
            landlordUserId: input.landlordUserId,
            tenantUserId: input.tenantUserId,
            userId: input.userId,
            startDate: input.startDate,
            fileUrl: input.fileUrl,
            externalSigningId: input.externalSigningId,
          });

          // Force circuit breaker to OPEN state by creating one that's already tripped
          const breaker = stubs.circuitBreakerFactory.create('e-signature', 'signature');
          // Trip the breaker by simulating 3 failures
          for (let i = 0; i < 3; i++) {
            try {
              await breaker.execute(
                async () => { throw new Error('simulated failure'); },
                () => undefined,
              );
            } catch {
              // expected
            }
          }

          const useCase = new InitiateSigningUseCase(
            stubs.repository as any,
            stubs.eSignatureProvider as any,
            stubs.circuitBreakerFactory,
            stubs.auditLogger,
          );

          await useCase.execute({ contractId: input.contractId } as any, input.userId);

          const failedEntry = stubs.auditEntries.find(
            (e) => e.action === 'SIGNING_FAILED',
          );
          if (!failedEntry) return false;

          if (failedEntry.userId !== input.userId) return false;
          if (failedEntry.resource !== 'Contract') return false;
          if (failedEntry.resourceId !== input.contractId) return false;
          if (!(failedEntry.timestamp instanceof Date)) return false;

          const meta = failedEntry.metadata as Record<string, unknown> | undefined;
          if (!meta || meta['reason'] !== 'circuit_open') return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
