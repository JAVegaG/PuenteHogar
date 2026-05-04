// Feature: backend-database-implementation, Property 29: Contrato SIGNED dispara notificación a ambas partes
// Validates: Requirements 5.8

import * as fc from 'fast-check';
import * as crypto from 'crypto';
import { HandleSigningWebhookUseCase } from './handle-signing-webhook.use-case';
import type {
  IContractRepository,
  CreateContractData,
} from '@modules/contracts/domain/ports/contract-repository.port';
import {
  ContractEntity,
  ContractStatus,
} from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';

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

interface NotificationCall {
  landlordUserId: string;
  tenantUserId: string;
  contractId: string;
  signedAt: Date;
}

interface StubResult {
  repository: IContractRepository;
  notificationPort: INotificationPort;
  auditLogger: AuditLoggerService;
  notificationCalls: NotificationCall[];
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
  const notificationCalls: NotificationCall[] = [];

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
    async notifyContractUploaded() { },
  };

  const auditLogger = new AuditLoggerService();

  return { repository, notificationPort, auditLogger, notificationCalls };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('HandleSigningWebhookUseCase — Property 29: Contrato SIGNED dispara notificación a ambas partes', () => {
  /**
   * Property 29 — Validates: Requirements 5.8
   *
   * For any valid signing webhook with status COMPLETED where both landlord
   * and tenant parties exist, the notification port must be called exactly
   * once with both party user IDs, the contract ID, and the signing timestamp.
   */
  it('Property 29 — COMPLETED webhook triggers notification to both landlord and tenant', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySignedContractInput, async (input) => {
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

        // Notification must be called exactly once
        if (stubs.notificationCalls.length !== 1) return false;

        const call = stubs.notificationCalls[0];

        // Must include the landlord user ID
        if (call.landlordUserId !== input.landlordUserId) return false;

        // Must include the tenant user ID
        if (call.tenantUserId !== input.tenantUserId) return false;

        // Must reference the correct contract
        if (call.contractId !== input.contractId) return false;

        // signedAt must match the completedAt from the webhook
        const expectedSignedAt = new Date(input.completedAt);
        if (call.signedAt.getTime() !== expectedSignedAt.getTime()) return false;

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 29 — FAILED webhook does NOT trigger notification to any party', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySignedContractInput, async (input) => {
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

        // No notification should be sent on failure
        return stubs.notificationCalls.length === 0;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 29 — notification is fire-and-forget (rejection does not throw)', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySignedContractInput, async (input) => {
        const stubs = makeStubs({
          contractId: input.contractId,
          leaseId: input.leaseId,
          landlordUserId: input.landlordUserId,
          tenantUserId: input.tenantUserId,
          startDate: input.startDate,
          fileUrl: input.fileUrl,
        });

        // Override notification port to reject
        stubs.notificationPort.notifyContractSigned = async () => {
          throw new Error('Messaging channel unavailable');
        };

        const useCase = new HandleSigningWebhookUseCase(
          stubs.repository as any,
          stubs.notificationPort as any,
          stubs.auditLogger,
        );

        // Must not throw even when notification fails
        try {
          await useCase.execute({
            contractId: input.contractId,
            externalSigningId: input.externalSigningId,
            status: 'COMPLETED',
            completedAt: input.completedAt,
          } as any);
          return true;
        } catch {
          return false;
        }
      }),
      { numRuns: 100 },
    );
  });
});
