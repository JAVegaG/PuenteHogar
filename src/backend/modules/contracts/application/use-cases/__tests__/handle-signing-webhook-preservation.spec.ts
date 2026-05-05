/**
 * Preservation Property Tests — HandleSigningWebhookUseCase
 *
 * These tests verify CURRENT behavior that must remain unchanged after fixes:
 * - COMPLETED webhooks: notifications are sent and audit is logged
 * - Non-COMPLETED webhooks: no scheduleInitialPayment call is made
 *
 * They must PASS on UNFIXED code — confirming the baseline behavior to preserve.
 *
 * **Validates: Requirements 3.7, 3.8, 3.9**
 */
import * as fc from 'fast-check';
import { HandleSigningWebhookUseCase } from '../handle-signing-webhook.use-case';
import { ContractEntity } from '@modules/contracts/domain/entities/contract.entity';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import type { IPaymentSchedulingPort } from '@modules/contracts/domain/ports/payment-scheduling.port';
import type { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { SigningWebhookDto } from '../dtos/signing-webhook.dto';

describe('Preservation Property Tests — HandleSigningWebhookUseCase', () => {
    // ─── Shared test setup ───
    function createMocks() {
        const mockContract = new ContractEntity(
            'contract-1',
            'lease-1',
            'SIGNATURE_PENDING',
            new Date('2025-03-01'),
            new Date('2026-03-01'),
            'https://example.com/contract.pdf',
            null,
            null,
        );

        const mockRepository: jest.Mocked<Partial<IContractRepository>> = {
            findById: jest.fn().mockResolvedValue(mockContract),
            updateStatus: jest.fn().mockResolvedValue(mockContract),
            findContractParties: jest.fn().mockResolvedValue([
                { userId: 'landlord-1', roleInContract: 'LANDLORD' },
                { userId: 'tenant-1', roleInContract: 'TENANT' },
            ]),
            getLeaseMonthlyAmount: jest.fn().mockResolvedValue({ amount: 1200000, currency: 'COP' }),
        };

        const mockNotificationPort: jest.Mocked<Partial<INotificationPort>> = {
            notifyContractSigned: jest.fn().mockResolvedValue(undefined),
            notifySigningFailed: jest.fn().mockResolvedValue(undefined),
        };

        const mockPaymentSchedulingPort = {
            scheduleInitialPayment: jest.fn().mockResolvedValue(undefined),
        };

        const mockAuditLogger = {
            log: jest.fn(),
        } as unknown as jest.Mocked<AuditLoggerService>;

        return { mockContract, mockRepository, mockNotificationPort, mockPaymentSchedulingPort, mockAuditLogger };
    }

    // ─── Property: For all COMPLETED webhooks, notifications are sent and audit is logged ───
    describe('Property: COMPLETED webhooks send notifications and log audit', () => {
        it('should send notifyContractSigned to landlord and tenant for COMPLETED webhook', async () => {
            /**
             * **Validates: Requirements 3.7**
             *
             * Observation: On unfixed code, HandleSigningWebhookUseCase sends
             * notifyContractSigned(landlordUserId, tenantUserId, contractId, signedAt)
             * as fire-and-forget when status is COMPLETED.
             */
            const { mockRepository, mockNotificationPort, mockPaymentSchedulingPort, mockAuditLogger } = createMocks();

            const useCase = new HandleSigningWebhookUseCase(
                mockRepository as unknown as IContractRepository,
                mockNotificationPort as unknown as INotificationPort,
                mockPaymentSchedulingPort as unknown as IPaymentSchedulingPort,
                mockAuditLogger,
            );

            const dto: SigningWebhookDto = {
                contractId: 'contract-1',
                externalSigningId: 'ext-signing-1',
                status: 'COMPLETED',
                completedAt: '2025-03-01T12:00:00.000Z',
            };

            await useCase.execute(dto);

            // Notifications sent
            expect(mockNotificationPort.notifyContractSigned).toHaveBeenCalledWith(
                'landlord-1',
                'tenant-1',
                'contract-1',
                expect.any(Date),
            );
        });

        it('should log CONTRACT_SIGNED audit entry for COMPLETED webhook', async () => {
            /**
             * **Validates: Requirements 3.7**
             *
             * Observation: On unfixed code, HandleSigningWebhookUseCase logs an audit
             * entry with action 'CONTRACT_SIGNED' when status is COMPLETED.
             */
            const { mockRepository, mockNotificationPort, mockPaymentSchedulingPort, mockAuditLogger } = createMocks();

            const useCase = new HandleSigningWebhookUseCase(
                mockRepository as unknown as IContractRepository,
                mockNotificationPort as unknown as INotificationPort,
                mockPaymentSchedulingPort as unknown as IPaymentSchedulingPort,
                mockAuditLogger,
            );

            const dto: SigningWebhookDto = {
                contractId: 'contract-1',
                externalSigningId: 'ext-signing-1',
                status: 'COMPLETED',
                completedAt: '2025-03-01T12:00:00.000Z',
            };

            await useCase.execute(dto);

            // Audit logged
            expect(mockAuditLogger.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'system',
                    action: 'CONTRACT_SIGNED',
                    resource: 'Contract',
                    resourceId: 'contract-1',
                    metadata: { externalSigningId: 'ext-signing-1' },
                }),
            );
        });

        it('property: for all COMPLETED webhooks with various externalSigningIds, notifications and audit are always triggered', async () => {
            /**
             * **Validates: Requirements 3.7**
             */
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        externalSigningId: fc.string({ minLength: 1, maxLength: 50 }),
                        completedAt: fc.date({
                            min: new Date('2024-01-01'),
                            max: new Date('2027-12-31'),
                        }),
                    }),
                    async ({ externalSigningId, completedAt }) => {
                        const { mockRepository, mockNotificationPort, mockPaymentSchedulingPort, mockAuditLogger } = createMocks();

                        const useCase = new HandleSigningWebhookUseCase(
                            mockRepository as unknown as IContractRepository,
                            mockNotificationPort as unknown as INotificationPort,
                            mockPaymentSchedulingPort as unknown as IPaymentSchedulingPort,
                            mockAuditLogger,
                        );

                        const dto: SigningWebhookDto = {
                            contractId: 'contract-1',
                            externalSigningId,
                            status: 'COMPLETED',
                            completedAt: completedAt.toISOString(),
                        };

                        await useCase.execute(dto);

                        // Notifications always sent for COMPLETED
                        expect(mockNotificationPort.notifyContractSigned).toHaveBeenCalledTimes(1);
                        expect(mockNotificationPort.notifyContractSigned).toHaveBeenCalledWith(
                            'landlord-1',
                            'tenant-1',
                            'contract-1',
                            expect.any(Date),
                        );

                        // Audit always logged for COMPLETED
                        expect(mockAuditLogger.log).toHaveBeenCalledWith(
                            expect.objectContaining({
                                action: 'CONTRACT_SIGNED',
                                resourceId: 'contract-1',
                                metadata: { externalSigningId },
                            }),
                        );
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    // ─── Property: For all non-COMPLETED (FAILED) webhooks, no scheduleInitialPayment call ───
    describe('Property: FAILED webhooks do NOT create scheduled payments', () => {
        it('should NOT call any payment scheduling for FAILED webhook', async () => {
            /**
             * **Validates: Requirements 3.8**
             *
             * Observation: On unfixed code, HandleSigningWebhookUseCase does NOT have
             * any payment scheduling port. For FAILED webhooks, it keeps status as
             * SIGNATURE_PENDING and notifies the landlord of failure.
             * After the fix adds payment scheduling, FAILED webhooks must still NOT
             * trigger any payment creation.
             */
            const { mockRepository, mockNotificationPort, mockPaymentSchedulingPort, mockAuditLogger } = createMocks();

            const useCase = new HandleSigningWebhookUseCase(
                mockRepository as unknown as IContractRepository,
                mockNotificationPort as unknown as INotificationPort,
                mockPaymentSchedulingPort as unknown as IPaymentSchedulingPort,
                mockAuditLogger,
            );

            const dto: SigningWebhookDto = {
                contractId: 'contract-1',
                externalSigningId: 'ext-signing-1',
                status: 'FAILED',
            };

            await useCase.execute(dto);

            // Status should be updated to SIGNATURE_PENDING (retry)
            expect(mockRepository.updateStatus).toHaveBeenCalledWith(
                'contract-1',
                'SIGNATURE_PENDING',
            );

            // Audit logged as SIGNING_WEBHOOK_FAILED
            expect(mockAuditLogger.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'SIGNING_WEBHOOK_FAILED',
                    resourceId: 'contract-1',
                }),
            );

            // Landlord notified of failure
            expect(mockNotificationPort.notifySigningFailed).toHaveBeenCalledWith(
                'landlord-1',
                'contract-1',
            );

            // No contract signed notification
            expect(mockNotificationPort.notifyContractSigned).not.toHaveBeenCalled();

            // No payment scheduling for FAILED webhooks
            expect(mockPaymentSchedulingPort.scheduleInitialPayment).not.toHaveBeenCalled();
        });

        it('property: for all FAILED webhooks with various signing IDs, no payment scheduling occurs and correct failure handling happens', async () => {
            /**
             * **Validates: Requirements 3.8**
             *
             * On unfixed code, there is no payment scheduling port at all.
             * This test verifies the FAILED path behavior is preserved:
             * - Status stays SIGNATURE_PENDING
             * - Audit logs SIGNING_WEBHOOK_FAILED
             * - Landlord is notified of failure
             * - No notifyContractSigned is called
             */
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 50 }), // externalSigningId
                    async (externalSigningId) => {
                        const { mockRepository, mockNotificationPort, mockPaymentSchedulingPort, mockAuditLogger } = createMocks();

                        const useCase = new HandleSigningWebhookUseCase(
                            mockRepository as unknown as IContractRepository,
                            mockNotificationPort as unknown as INotificationPort,
                            mockPaymentSchedulingPort as unknown as IPaymentSchedulingPort,
                            mockAuditLogger,
                        );

                        const dto: SigningWebhookDto = {
                            contractId: 'contract-1',
                            externalSigningId,
                            status: 'FAILED',
                        };

                        await useCase.execute(dto);

                        // FAILED path: status stays SIGNATURE_PENDING
                        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
                            'contract-1',
                            'SIGNATURE_PENDING',
                        );

                        // FAILED path: audit logs failure
                        expect(mockAuditLogger.log).toHaveBeenCalledWith(
                            expect.objectContaining({
                                action: 'SIGNING_WEBHOOK_FAILED',
                                metadata: { externalSigningId },
                            }),
                        );

                        // FAILED path: landlord notified
                        expect(mockNotificationPort.notifySigningFailed).toHaveBeenCalledWith(
                            'landlord-1',
                            'contract-1',
                        );

                        // FAILED path: no contract signed notification
                        expect(mockNotificationPort.notifyContractSigned).not.toHaveBeenCalled();
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    // ─── Property: Contract status update happens correctly for COMPLETED ───
    describe('Property: COMPLETED webhooks update contract status to SIGNED', () => {
        it('property: for all COMPLETED webhooks, contract status is updated to SIGNED with signedAt and externalSigningId', async () => {
            /**
             * **Validates: Requirements 3.7**
             */
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        externalSigningId: fc.string({ minLength: 1, maxLength: 50 }),
                        completedAt: fc.date({
                            min: new Date('2024-01-01'),
                            max: new Date('2027-12-31'),
                        }),
                    }),
                    async ({ externalSigningId, completedAt }) => {
                        const { mockRepository, mockNotificationPort, mockPaymentSchedulingPort, mockAuditLogger } = createMocks();

                        const useCase = new HandleSigningWebhookUseCase(
                            mockRepository as unknown as IContractRepository,
                            mockNotificationPort as unknown as INotificationPort,
                            mockPaymentSchedulingPort as unknown as IPaymentSchedulingPort,
                            mockAuditLogger,
                        );

                        const dto: SigningWebhookDto = {
                            contractId: 'contract-1',
                            externalSigningId,
                            status: 'COMPLETED',
                            completedAt: completedAt.toISOString(),
                        };

                        await useCase.execute(dto);

                        // Status updated to SIGNED
                        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
                            'contract-1',
                            'SIGNED',
                            expect.objectContaining({
                                signedAt: expect.any(Date),
                                externalSigningId,
                            }),
                        );
                    },
                ),
                { numRuns: 20 },
            );
        });
    });
});
