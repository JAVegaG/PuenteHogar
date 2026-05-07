/**
 * Preservation Property Tests — Signed Leases Remain Occupied, Non-Cancellable, and Income-Contributing
 *
 * These tests capture EXISTING correct behavior on UNFIXED code.
 * They must PASS on the current codebase — they verify behavior that should NOT change after the fix.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7, 3.9, 3.10, 3.11**
 *
 * Preservation Properties Tested:
 * 1. Failed webhooks (status ≠ COMPLETED) → contract stays SIGNATURE_PENDING, no tracking change
 * 2. Signed leases (CONTRACT_SIGNED/PAYMENT_RECEIVED) → unit shows "Ocupado"
 * 3. Signed contracts (contractStatus='SIGNED') → cancellation rejected
 * 4. No active lease → unit shows "Disponible"
 * 5. Signed leases on income report → badge "Vigente", rent included in totals
 */

jest.mock('@src/shared/prisma/prisma.service', () => ({
    PrismaService: jest.fn().mockImplementation(() => ({})),
}));

import * as fc from 'fast-check';
import { ConflictException } from '@nestjs/common';
import { HandleSigningWebhookUseCase } from '../handle-signing-webhook.use-case';
import { GetPortfolioUseCase } from '@modules/landlord-portfolio/application/use-cases/get-portfolio.use-case';
import { CancelLeaseUseCase } from '@modules/landlord-portfolio/application/use-cases/cancel-lease.use-case';
import { ContractEntity } from '@modules/contracts/domain/entities/contract.entity';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import type { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { SigningWebhookDto } from '../../dtos/signing-webhook.dto';

describe('Preservation Property Tests — Signed Leases Remain Occupied, Non-Cancellable, and Income-Contributing', () => {
    /**
     * Property 2a: Preservation — Failed Webhooks Don't Change Tracking Status
     *
     * FOR ALL webhook events with status ≠ COMPLETED:
     *   contract stays at SIGNATURE_PENDING, tracking status unchanged
     *
     * **Validates: Requirements 3.1**
     */
    describe('Property 2a: For all webhook events with status ≠ COMPLETED: contract stays at SIGNATURE_PENDING, tracking status unchanged', () => {
        it('should keep contract at SIGNATURE_PENDING and NOT modify tracking status for non-COMPLETED webhooks', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate random non-COMPLETED webhook statuses
                    fc.constantFrom('FAILED'),
                    fc.uuid(),
                    fc.uuid(),
                    async (webhookStatus, contractId, externalSigningId) => {
                        const statusUpdates: { contractId: string; newStatus: string }[] = [];

                        const mockContract = new ContractEntity(
                            contractId,
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
                            updateStatus: jest.fn().mockImplementation(async (id, status) => {
                                statusUpdates.push({ contractId: id, newStatus: status });
                                return mockContract;
                            }),
                            findContractParties: jest.fn().mockResolvedValue([
                                { userId: 'landlord-1', roleInContract: 'LANDLORD' },
                            ]),
                        };

                        const mockNotificationPort: Partial<INotificationPort> = {
                            notifySigningFailed: jest.fn().mockResolvedValue(undefined),
                        };

                        const mockAuditLogger = {
                            log: jest.fn(),
                        } as unknown as AuditLoggerService;

                        const mockPaymentSchedulingPort = {
                            scheduleInitialPayment: jest.fn().mockResolvedValue(undefined),
                        };

                        const mockListingDeactivationPort = {
                            deactivateByLeaseId: jest.fn().mockResolvedValue(undefined),
                        };

                        const mockTransitionLeaseState = {
                            execute: jest.fn().mockResolvedValue(undefined),
                        };

                        const useCase = new HandleSigningWebhookUseCase(
                            mockRepository as IContractRepository,
                            mockNotificationPort as INotificationPort,
                            mockPaymentSchedulingPort as any,
                            mockListingDeactivationPort as any,
                            mockAuditLogger,
                            mockTransitionLeaseState as any,
                        );

                        const dto: SigningWebhookDto = {
                            contractId,
                            externalSigningId,
                            status: webhookStatus as 'COMPLETED' | 'FAILED',
                        };

                        await useCase.execute(dto);

                        // PRESERVATION: Contract status should be updated to SIGNATURE_PENDING (kept as-is)
                        expect(statusUpdates.length).toBe(1);
                        expect(statusUpdates[0].newStatus).toBe('SIGNATURE_PENDING');

                        // PRESERVATION: No tracking status transition should have been called
                        // Failed webhooks don't touch tracking
                        expect(mockTransitionLeaseState.execute).not.toHaveBeenCalled();
                    },
                ),
                { numRuns: 10 },
            );
        });
    });

    /**
     * Property 2b: Preservation — Signed Leases (CONTRACT_SIGNED/PAYMENT_RECEIVED) → unitStatus = "Ocupado"
     *
     * FOR ALL leases with trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED}
     * and end_date=null and deleted_at=null: unitStatus = "Ocupado"
     *
     * **Validates: Requirements 3.2**
     */
    describe('Property 2b: For all leases with trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED}: unitStatus = "Ocupado"', () => {
        it('should return unitStatus "Ocupado" for units with signed leases', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate signed tracking statuses
                    fc.constantFrom('CONTRACT_SIGNED', 'PAYMENT_RECEIVED'),
                    fc.uuid(),
                    fc.uuid(),
                    fc.nat({ max: 5000000 }).map((n) => n + 500000), // rent between 500k and 5.5M
                    async (trackingStatus, unitId, leaseId, rentAmount) => {
                        const mockPortfolioRepository: Partial<IPortfolioRepository> = {
                            findUnitsByUserId: jest.fn().mockResolvedValue([
                                {
                                    id: unitId,
                                    portfolioId: 'portfolio-1',
                                    propertyId: 'property-1',
                                    name: 'Apartamento Test',
                                    conditions: null,
                                    leaseBaseAmount: rentAmount,
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
                                    number_of_rooms: 2,
                                    number_of_bathrooms: 1,
                                    length: 10,
                                    width: 8,
                                    address: { address: 'Calle Test #1-2' },
                                }),
                            },
                            lease: {
                                findFirst: jest.fn().mockResolvedValue({
                                    id: leaseId,
                                    portfolio_unit_id: unitId,
                                    user_id: 'tenant-1',
                                    end_date: null,       // Active lease
                                    deleted_at: null,     // Not soft-deleted
                                }),
                            },
                            leaseCurrentStatus: {
                                findUnique: jest.fn().mockResolvedValue({
                                    lease_id: leaseId,
                                    status: { name: trackingStatus },
                                }),
                            },
                            user: {
                                findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
                            },
                            naturalPersonDetail: {
                                findFirst: jest.fn().mockResolvedValue({
                                    first_name: 'Test',
                                    last_name: 'Tenant',
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

                        // PRESERVATION: Units with signed leases must show "Ocupado"
                        expect(result).toHaveLength(1);
                        expect(result[0].unitStatus).toBe('Ocupado');
                        expect(result[0].monthlyRent).toBe(rentAmount);
                    },
                ),
                { numRuns: 20 },
            );
        });
    });

    /**
     * Property 2c: Preservation — Signed Contracts (contractStatus='SIGNED') → Cancellation Rejected
     *
     * FOR ALL leases with contractStatus = 'SIGNED':
     *   canCancel = false and cancellation is rejected
     *
     * **Validates: Requirements 3.10**
     */
    describe('Property 2c: For all leases with contractStatus = "SIGNED": cancellation is rejected', () => {
        it('should reject cancellation for leases with a signed contract', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate various tracking statuses that might exist with a signed contract
                    fc.constantFrom('Acordado', 'CONTRACT_SIGNED', 'PAYMENT_RECEIVED'),
                    fc.uuid(),
                    fc.uuid(),
                    fc.uuid(),
                    async (trackingStatus, portfolioId, unitId, leaseId) => {
                        const mockPrisma = {
                            landlordPortfolio: {
                                findUnique: jest.fn().mockResolvedValue({
                                    id: portfolioId,
                                    user_id: 'landlord-1',
                                }),
                            },
                            portfolioUnit: {
                                findUnique: jest.fn().mockResolvedValue({
                                    id: unitId,
                                    portfolio_id: portfolioId,
                                }),
                            },
                            lease: {
                                findUnique: jest.fn().mockResolvedValue({
                                    id: leaseId,
                                    portfolio_unit_id: unitId,
                                    user_id: 'tenant-1',
                                    end_date: null,
                                    deleted_at: null,
                                }),
                            },
                            leaseCurrentStatus: {
                                findUnique: jest.fn().mockResolvedValue({
                                    lease_id: leaseId,
                                    status: { name: trackingStatus },
                                }),
                            },
                            contract: {
                                findFirst: jest.fn().mockResolvedValue({
                                    id: 'contract-1',
                                    lease_id: leaseId,
                                    status: { name: 'SIGNED' },  // Signed contract exists
                                }),
                            },
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

                        // PRESERVATION: Cancellation must be rejected for signed contracts
                        // The current code rejects at step 4 (status !== 'Acordado') for non-Acordado statuses
                        // OR at step 5 (contractStatus === 'SIGNED') for Acordado status
                        // Either way, the lease with a signed contract cannot be cancelled
                        await expect(
                            useCase.execute(portfolioId, unitId, leaseId, 'landlord-1'),
                        ).rejects.toThrow(ConflictException);
                    },
                ),
                { numRuns: 15 },
            );
        });
    });

    /**
     * Property 2d: Preservation — No Active Lease → unitStatus = "Disponible"
     *
     * FOR ALL units with no active lease (end_date set or deleted_at set):
     *   unitStatus = "Disponible"
     *
     * **Validates: Requirements 3.3**
     */
    describe('Property 2d: For all units with no active lease: unitStatus = "Disponible"', () => {
        it('should return unitStatus "Disponible" when no active lease exists', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.uuid(),
                    fc.nat({ max: 5000000 }).map((n) => n + 500000),
                    async (unitId, rentAmount) => {
                        const mockPortfolioRepository: Partial<IPortfolioRepository> = {
                            findUnitsByUserId: jest.fn().mockResolvedValue([
                                {
                                    id: unitId,
                                    portfolioId: 'portfolio-1',
                                    propertyId: 'property-1',
                                    name: 'Apartamento Vacío',
                                    conditions: null,
                                    leaseBaseAmount: rentAmount,
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
                                    number_of_rooms: 2,
                                    number_of_bathrooms: 1,
                                    length: 10,
                                    width: 8,
                                    address: { address: 'Calle Vacía #0-0' },
                                }),
                            },
                            lease: {
                                // No active lease found (returns null)
                                findFirst: jest.fn().mockResolvedValue(null),
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

                        // PRESERVATION: Units with no active lease must show "Disponible"
                        expect(result).toHaveLength(1);
                        expect(result[0].unitStatus).toBe('Disponible');
                        expect(result[0].tenantName).toBeNull();
                        expect(result[0].monthlyRent).toBeNull();
                    },
                ),
                { numRuns: 15 },
            );
        });
    });

    /**
     * Property 2e: Preservation — Signed Leases on Income Report → badge "Vigente", rent included
     *
     * FOR ALL leases with trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED} on income report:
     *   badge = "Vigente" and rent included in totals
     *
     * The income report derives its badge from unitStatus:
     *   unitStatus === 'Ocupado' → badge = 'Vigente'
     * So if GetPortfolioUseCase returns "Ocupado" for signed leases, the income report
     * will correctly show "Vigente" and include rent.
     *
     * This test validates the backend side: signed leases produce unitStatus="Ocupado"
     * which the frontend maps to badge="Vigente" and includes in income totals.
     *
     * **Validates: Requirements 3.11**
     */
    describe('Property 2e: For all signed leases on income report: badge = "Vigente" and rent included in totals', () => {
        it('should return unitStatus "Ocupado" with monthlyRent for signed leases (income report derives "Vigente" from this)', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate signed tracking statuses
                    fc.constantFrom('CONTRACT_SIGNED', 'PAYMENT_RECEIVED'),
                    fc.uuid(),
                    fc.uuid(),
                    fc.nat({ max: 10000000 }).map((n) => n + 500000), // rent 500k-10.5M
                    async (trackingStatus, unitId, leaseId, rentAmount) => {
                        const mockPortfolioRepository: Partial<IPortfolioRepository> = {
                            findUnitsByUserId: jest.fn().mockResolvedValue([
                                {
                                    id: unitId,
                                    portfolioId: 'portfolio-1',
                                    propertyId: 'property-1',
                                    name: 'Apartamento Arrendado',
                                    conditions: null,
                                    leaseBaseAmount: rentAmount,
                                    leaseBaseCurrency: 'COP',
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                },
                            ]),
                        };

                        const mockPrisma = {
                            property: {
                                findUnique: jest.fn().mockResolvedValue({
                                    property_type: 'HOUSE',
                                    number_of_rooms: 3,
                                    number_of_bathrooms: 2,
                                    length: 15,
                                    width: 10,
                                    address: { address: 'Carrera 10 #5-20' },
                                }),
                            },
                            lease: {
                                findFirst: jest.fn().mockResolvedValue({
                                    id: leaseId,
                                    portfolio_unit_id: unitId,
                                    user_id: 'tenant-1',
                                    end_date: null,       // Active lease
                                    deleted_at: null,     // Not soft-deleted
                                }),
                            },
                            leaseCurrentStatus: {
                                findUnique: jest.fn().mockResolvedValue({
                                    lease_id: leaseId,
                                    status: { name: trackingStatus },
                                }),
                            },
                            user: {
                                findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
                            },
                            naturalPersonDetail: {
                                findFirst: jest.fn().mockResolvedValue({
                                    first_name: 'Carlos',
                                    last_name: 'Rodríguez',
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

                        // PRESERVATION: Signed leases must produce unitStatus="Ocupado"
                        // The income report frontend maps this to badge="Vigente" and includes rent
                        expect(result).toHaveLength(1);
                        expect(result[0].unitStatus).toBe('Ocupado');

                        // PRESERVATION: monthlyRent must be included (income report uses this for totals)
                        expect(result[0].monthlyRent).toBe(rentAmount);
                        expect(result[0].monthlyRent).toBeGreaterThan(0);

                        // Simulate income report derivation (frontend logic):
                        // getLeaseStatus(unitStatus) → unitStatus === 'Ocupado' ? 'Vigente' : other
                        const incomeReportBadge = result[0].unitStatus === 'Ocupado' ? 'Vigente' : 'Disponible';
                        expect(incomeReportBadge).toBe('Vigente');

                        // Income contribution: rent is included in totals when unitStatus is "Ocupado"
                        const contributesToIncome = result[0].unitStatus === 'Ocupado' && result[0].monthlyRent !== null;
                        expect(contributesToIncome).toBe(true);
                    },
                ),
                { numRuns: 20 },
            );
        });
    });
});
