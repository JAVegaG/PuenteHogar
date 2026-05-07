/**
 * Bug Condition Exploration Test — Lease Lifecycle Status Never Advances Beyond CONTACT_INITIATED
 *
 * This test encodes the EXPECTED (correct) behavior for the lease lifecycle status sync bug.
 * On UNFIXED code, it will FAIL — confirming the bug exists.
 * After fixes are applied, it will PASS — confirming the bug is resolved.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.4a, 1.9, 1.9a, 1.9b, 1.9c**
 *
 * Bug Conditions Tested:
 * 1. isBugCondition_ContractUpload: UploadContractUseCase does not call TransitionLeaseStateUseCase
 * 2. isBugCondition_ContractSigned: HandleSigningWebhookUseCase does not call TransitionLeaseStateUseCase
 * 3. isUnitStatusBugCondition: GetPortfolioUseCase marks CONTACT_INITIATED leases as "Ocupado"
 * 4. isCancelGateBugCondition: CancelLeaseUseCase rejects CONTACT_INITIATED leases
 * 5. isIncomeReportBugCondition: Income report shows "Vigente" for pre-signing leases
 */

// Mock PrismaService to avoid importing @prisma-generated/client in test environment
jest.mock('@src/shared/prisma/prisma.service', () => ({
    PrismaService: jest.fn().mockImplementation(() => ({})),
}));

import { ConflictException } from '@nestjs/common';
import { UploadContractUseCase } from '../upload-contract.use-case';
import { HandleSigningWebhookUseCase } from '../handle-signing-webhook.use-case';
import { GetPortfolioUseCase } from '@modules/landlord-portfolio/application/use-cases/get-portfolio.use-case';
import { CancelLeaseUseCase } from '@modules/landlord-portfolio/application/use-cases/cancel-lease.use-case';
import { ContractEntity } from '@modules/contracts/domain/entities/contract.entity';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import type { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { SigningWebhookDto } from '../../dtos/signing-webhook.dto';

describe('Bug Condition Exploration — Lease Lifecycle Status Never Advances Beyond CONTACT_INITIATED', () => {
    /**
     * Bug Condition 1: isBugCondition_ContractUpload
     *
     * WHEN a contract is uploaded via UploadContractUseCase
     * THEN the lease tracking status should transition to CONTRACT_UPLOADED
     * BUT on unfixed code, it remains CONTACT_INITIATED because the use case
     * never calls TransitionLeaseStateUseCase.
     *
     * **Validates: Requirements 1.1, 2.1**
     */
    describe('Property 1a: Contract Upload → Tracking Status should be CONTRACT_UPLOADED', () => {
        it('should call TransitionLeaseStateUseCase with CONTRACT_UPLOADED after successful upload', async () => {
            // Track whether TransitionLeaseStateUseCase was called
            const transitionCalls: { leaseId: string; newState: string }[] = [];

            const mockRepository: Partial<IContractRepository> = {
                getLeaseOwnerUserId: jest.fn().mockResolvedValue('landlord-1'),
                getLeaseTenantUserId: jest.fn().mockResolvedValue('tenant-1'),
                findFileTypeByName: jest.fn().mockResolvedValue({ id: 'file-type-1' }),
                findFileStatusByName: jest.fn().mockResolvedValue({ id: 'file-status-1' }),
                create: jest.fn().mockResolvedValue(
                    new ContractEntity(
                        'contract-1',
                        'lease-1',
                        'PENDING',
                        new Date('2025-01-01'),
                        new Date('2026-01-01'),
                        'https://storage.example.com/contract.pdf',
                        null,
                        null,
                    ),
                ),
            };

            const mockObjectStorage = {
                uploadFile: jest.fn().mockResolvedValue('https://storage.example.com/contract.pdf'),
            };

            const mockNotificationPort: Partial<INotificationPort> = {
                notifyContractUploaded: jest.fn().mockResolvedValue(undefined),
            };

            const mockAuditLogger = {
                log: jest.fn(),
            } as unknown as AuditLoggerService;

            // Create the use case with TransitionLeaseStateUseCase injected
            const mockTransitionLeaseState = {
                execute: jest.fn().mockImplementation((dto) => {
                    transitionCalls.push({ leaseId: dto.leaseId, newState: dto.newState });
                    return Promise.resolve();
                }),
            };

            const useCase = new UploadContractUseCase(
                mockRepository as IContractRepository,
                mockObjectStorage as any,
                mockNotificationPort as INotificationPort,
                mockAuditLogger,
                mockTransitionLeaseState as any,
            );

            const file = {
                buffer: Buffer.from('fake-pdf-content'),
                originalname: 'contract.pdf',
                size: 1024,
                mimetype: 'application/pdf',
            };

            const dto = { leaseId: 'lease-1', startDate: '2025-01-01', endDate: '2026-01-01' };

            await useCase.execute(file, dto, 'landlord-1', ['LANDLORD']);

            // ASSERTION: After contract upload, TransitionLeaseStateUseCase should have been called
            // with newState = 'CONTRACT_UPLOADED'
            // On UNFIXED code, this will FAIL because the use case never calls the transition
            expect(transitionCalls.length).toBeGreaterThan(0);
            expect(transitionCalls).toContainEqual(
                expect.objectContaining({ leaseId: 'lease-1', newState: 'CONTRACT_UPLOADED' }),
            );
        });
    });

    /**
     * Bug Condition 2: isBugCondition_ContractSigned
     *
     * WHEN a signing webhook with status COMPLETED is received
     * THEN the lease tracking status should transition to CONTRACT_SIGNED
     * BUT on unfixed code, it remains CONTACT_INITIATED because HandleSigningWebhookUseCase
     * never calls TransitionLeaseStateUseCase.
     *
     * **Validates: Requirements 1.3, 2.3**
     */
    describe('Property 1b: Signing Webhook COMPLETED → Tracking Status should be CONTRACT_SIGNED', () => {
        it('should call TransitionLeaseStateUseCase with CONTRACT_SIGNED when webhook status is COMPLETED', async () => {
            const transitionCalls: { leaseId: string; newState: string }[] = [];

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

            const mockRepository: Partial<IContractRepository> = {
                findById: jest.fn().mockResolvedValue(mockContract),
                updateStatus: jest.fn().mockResolvedValue(mockContract),
                findContractParties: jest.fn().mockResolvedValue([
                    { userId: 'landlord-1', roleInContract: 'LANDLORD' },
                    { userId: 'tenant-1', roleInContract: 'TENANT' },
                ]),
                getLeaseMonthlyAmount: jest.fn().mockResolvedValue({ amount: 1200000, currency: 'COP' }),
            };

            const mockNotificationPort: Partial<INotificationPort> = {
                notifyContractSigned: jest.fn().mockResolvedValue(undefined),
            };

            const mockAuditLogger = {
                log: jest.fn(),
            } as unknown as AuditLoggerService;

            const mockPaymentSchedulingPort = {
                scheduleInitialPayment: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new HandleSigningWebhookUseCase(
                mockRepository as IContractRepository,
                mockNotificationPort as INotificationPort,
                mockPaymentSchedulingPort as any,
                mockAuditLogger,
            );

            // Mock TransitionLeaseStateUseCase if it exists on the use case
            const mockTransitionLeaseState = {
                execute: jest.fn().mockImplementation((dto) => {
                    transitionCalls.push({ leaseId: dto.leaseId, newState: dto.newState });
                    return Promise.resolve();
                }),
            };

            if ('transitionLeaseState' in useCase) {
                (useCase as any).transitionLeaseState = mockTransitionLeaseState;
            }

            const dto: SigningWebhookDto = {
                contractId: 'contract-1',
                externalSigningId: 'ext-signing-1',
                status: 'COMPLETED',
                completedAt: '2025-03-01T12:00:00.000Z',
            };

            await useCase.execute(dto);

            // ASSERTION: After COMPLETED webhook, TransitionLeaseStateUseCase should have been called
            // with newState = 'CONTRACT_SIGNED'
            // On UNFIXED code, this will FAIL because the use case never calls the transition
            expect(transitionCalls.length).toBeGreaterThan(0);
            expect(transitionCalls).toContainEqual(
                expect.objectContaining({ leaseId: 'lease-1', newState: 'CONTRACT_SIGNED' }),
            );
        });
    });

    /**
     * Bug Condition 3: isUnitStatusBugCondition
     *
     * WHEN GetPortfolioUseCase processes a unit with a lease in CONTACT_INITIATED
     * (end_date=null, deleted_at=null)
     * THEN unitStatus should be "Disponible" (lease is not yet signed)
     * BUT on unfixed code, it returns "Ocupado" because it only checks end_date=null
     *
     * **Validates: Requirements 1.4, 2.4**
     */
    describe('Property 1c: Unit with CONTACT_INITIATED lease → unitStatus should be "Disponible"', () => {
        it('should return unitStatus "Disponible" for a lease in CONTACT_INITIATED state', async () => {
            // Mock the portfolio repository to return a unit
            const mockPortfolioRepository: Partial<IPortfolioRepository> = {
                findUnitsByUserId: jest.fn().mockResolvedValue([
                    {
                        id: 'unit-1',
                        portfolioId: 'portfolio-1',
                        propertyId: 'property-1',
                        name: 'Apartamento 101',
                        conditions: null,
                        leaseBaseAmount: 1500000,
                        leaseBaseCurrency: 'COP',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ]),
            };

            // Mock PrismaService to simulate a lease in CONTACT_INITIATED state
            const mockPrisma = {
                property: {
                    findUnique: jest.fn().mockResolvedValue({
                        property_type: 'APARTMENT',
                        number_of_rooms: 2,
                        number_of_bathrooms: 1,
                        length: 10,
                        width: 8,
                        address: { address: 'Calle 1 #2-3' },
                    }),
                },
                lease: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'lease-1',
                        portfolio_unit_id: 'unit-1',
                        user_id: 'tenant-1',
                        end_date: null,       // Active lease (no end date)
                        deleted_at: null,     // Not soft-deleted
                    }),
                },
                // LeaseCurrentStatus shows CONTACT_INITIATED
                leaseCurrentStatus: {
                    findUnique: jest.fn().mockResolvedValue({
                        lease_id: 'lease-1',
                        status: { name: 'CONTACT_INITIATED' },
                    }),
                },
                user: {
                    findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
                },
                naturalPersonDetail: {
                    findFirst: jest.fn().mockResolvedValue({
                        first_name: 'Juan',
                        last_name: 'Pérez',
                    }),
                },
                listing: {
                    findFirst: jest.fn().mockResolvedValue(null),
                },
            };

            const useCase = new GetPortfolioUseCase(
                mockPortfolioRepository as any,
                mockPrisma as any,
            );

            const result = await useCase.execute('landlord-1');

            // ASSERTION: Unit with lease in CONTACT_INITIATED should be "Disponible"
            // On UNFIXED code, this will FAIL because GetPortfolioUseCase marks any
            // lease with end_date=null as "Ocupado" regardless of tracking status
            expect(result).toHaveLength(1);
            expect(result[0].unitStatus).toBe('Disponible');
        });
    });

    /**
     * Bug Condition 4: isCancelGateBugCondition
     *
     * WHEN a lease is in CONTACT_INITIATED state with contractStatus=null
     * THEN cancellation should succeed (no signed contract exists)
     * BUT on unfixed code, CancelLeaseUseCase rejects with
     * "Solo se pueden cancelar arriendos en estado Acordado"
     *
     * **Validates: Requirements 1.9, 1.9a, 2.9**
     */
    describe('Property 1d: Cancel lease in CONTACT_INITIATED with no contract → should succeed', () => {
        it('should allow cancellation of a lease in CONTACT_INITIATED state with no signed contract', async () => {
            const mockPrisma = {
                landlordPortfolio: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'portfolio-1',
                        user_id: 'landlord-1',
                    }),
                },
                portfolioUnit: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'unit-1',
                        portfolio_id: 'portfolio-1',
                    }),
                },
                lease: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'lease-1',
                        portfolio_unit_id: 'unit-1',
                        user_id: 'tenant-1',
                        end_date: null,
                        deleted_at: null,
                    }),
                },
                leaseCurrentStatus: {
                    findUnique: jest.fn().mockResolvedValue({
                        lease_id: 'lease-1',
                        status: { name: 'CONTACT_INITIATED' },  // NOT 'Acordado'
                    }),
                },
                contract: {
                    findFirst: jest.fn().mockResolvedValue(null),  // No contract exists
                },
                $transaction: jest.fn().mockImplementation(async (fn) => {
                    return fn({
                        lease: { update: jest.fn().mockResolvedValue({}) },
                        leaseStatus: {
                            findUnique: jest.fn().mockResolvedValue({ id: 'status-finalizado', name: 'Finalizado' }),
                        },
                        leaseStatusHistory: { create: jest.fn().mockResolvedValue({ id: 'history-1' }) },
                        leaseCurrentStatus: { update: jest.fn().mockResolvedValue({}) },
                        contract: { update: jest.fn().mockResolvedValue({}) },
                    });
                }),
            };

            const mockAuditLogger = {
                log: jest.fn(),
            } as unknown as AuditLoggerService;

            const mockNotificationPort = {
                notifyLeaseCancelled: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CancelLeaseUseCase(
                mockPrisma as any,
                mockAuditLogger,
                mockNotificationPort as any,
            );

            // ASSERTION: Cancellation should NOT throw for a lease in CONTACT_INITIATED
            // with no signed contract.
            // On UNFIXED code, this will FAIL with ConflictException:
            // "Solo se pueden cancelar arriendos en estado Acordado"
            await expect(
                useCase.execute('portfolio-1', 'unit-1', 'lease-1', 'landlord-1'),
            ).resolves.not.toThrow();
        });
    });

    /**
     * Bug Condition 5: isIncomeReportBugCondition
     *
     * WHEN a unit has a lease in CONTACT_INITIATED state on the income report
     * THEN the badge should NOT be "Vigente" and income contribution should be 0
     * BUT on unfixed code, the income report derives badge from unitStatus ("Ocupado" → "Vigente")
     * which is overly broad.
     *
     * This test validates the backend side: GetPortfolioUseCase should NOT mark
     * pre-signing leases as "Ocupado" (which the frontend then maps to "Vigente").
     *
     * **Validates: Requirements 1.9b, 1.9c, 2.9a, 2.9c**
     */
    describe('Property 1e: Income report — CONTACT_INITIATED lease should NOT show "Vigente"', () => {
        it('should NOT derive unitStatus "Ocupado" for a CONTACT_INITIATED lease (income report depends on this)', async () => {
            // The income report page derives its badge from unitStatus:
            //   unitStatus === 'Ocupado' → badge = 'Vigente'
            // If GetPortfolioUseCase returns "Ocupado" for a CONTACT_INITIATED lease,
            // the income report will incorrectly show "Vigente" and include rent in totals.

            const mockPortfolioRepository: Partial<IPortfolioRepository> = {
                findUnitsByUserId: jest.fn().mockResolvedValue([
                    {
                        id: 'unit-1',
                        portfolioId: 'portfolio-1',
                        propertyId: 'property-1',
                        name: 'Apartamento 201',
                        conditions: null,
                        leaseBaseAmount: 2000000,
                        leaseBaseCurrency: 'COP',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ]),
            };

            const mockPrisma = {
                property: {
                    findUnique: jest.fn().mockResolvedValue({
                        property_type: 'APARTMENT',
                        number_of_rooms: 3,
                        number_of_bathrooms: 2,
                        length: 12,
                        width: 10,
                        address: { address: 'Carrera 5 #10-20' },
                    }),
                },
                lease: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'lease-2',
                        portfolio_unit_id: 'unit-1',
                        user_id: 'tenant-2',
                        end_date: null,       // Active lease
                        deleted_at: null,     // Not deleted
                    }),
                },
                leaseCurrentStatus: {
                    findUnique: jest.fn().mockResolvedValue({
                        lease_id: 'lease-2',
                        status: { name: 'CONTACT_INITIATED' },  // Pre-signing state
                    }),
                },
                user: {
                    findUnique: jest.fn().mockResolvedValue({ id: 'tenant-2' }),
                },
                naturalPersonDetail: {
                    findFirst: jest.fn().mockResolvedValue({
                        first_name: 'María',
                        last_name: 'García',
                    }),
                },
                listing: {
                    findFirst: jest.fn().mockResolvedValue(null),
                },
            };

            const useCase = new GetPortfolioUseCase(
                mockPortfolioRepository as any,
                mockPrisma as any,
            );

            const result = await useCase.execute('landlord-1');

            // ASSERTION: For a lease in CONTACT_INITIATED, the unit should NOT be "Ocupado"
            // because the income report maps "Ocupado" → "Vigente" badge and includes rent.
            // On UNFIXED code, this will FAIL because GetPortfolioUseCase returns "Ocupado"
            // for any lease with end_date=null, regardless of tracking status.
            expect(result).toHaveLength(1);
            expect(result[0].unitStatus).not.toBe('Ocupado');
            expect(result[0].unitStatus).toBe('Disponible');

            // Income contribution should be 0 (monthlyRent should be null for non-occupied units)
            expect(result[0].monthlyRent).toBeNull();
        });
    });
});
