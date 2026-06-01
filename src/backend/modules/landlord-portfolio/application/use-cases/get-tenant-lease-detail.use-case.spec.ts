// Unit tests for GetTenantLeaseDetailUseCase
// Validates: Requirements 2.1

jest.mock('@src/shared/prisma/prisma.service', () => ({
    PrismaService: jest.fn(),
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetTenantLeaseDetailUseCase } from './get-tenant-lease-detail.use-case';
import type { IPaymentsCrossModuleQuery } from '@modules/payments/domain/ports/cross-module-query.port';
import type { PrismaService } from '@src/shared/prisma/prisma.service';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockPrisma() {
    return {
        lease: {
            findFirst: jest.fn(),
        },
        portfolioUnit: {
            findFirst: jest.fn(),
        },
        property: {
            findFirst: jest.fn(),
        },
        leaseCurrentStatus: {
            findUnique: jest.fn(),
        },
    } as unknown as jest.Mocked<PrismaService>;
}

function createMockPaymentsQuery(): jest.Mocked<IPaymentsCrossModuleQuery> {
    return {
        hasPendingPayments: jest.fn(),
        getNextPendingPayment: jest.fn(),
    };
}

// ─── Test Data ───────────────────────────────────────────────────────────────

const TENANT_USER_ID = 'user-tenant-001';
const OTHER_USER_ID = 'user-other-002';
const LEASE_ID = 'lease-001';
const UNIT_ID = 'unit-001';
const PROPERTY_ID = 'property-001';

const mockLease = {
    id: LEASE_ID,
    user_id: TENANT_USER_ID,
    portfolio_unit_id: UNIT_ID,
    deleted_at: null,
};

const mockUnit = {
    id: UNIT_ID,
    property_id: PROPERTY_ID,
    lease_base_amount: 1200000,
    lease_base_currency: 'COP',
    deleted_at: null,
};

const mockProperty = {
    id: PROPERTY_ID,
    property_type: 'Apartamento',
    deleted_at: null,
    address: {
        neighborhood: 'Centro',
        address: 'Calle 5 #10-20',
    },
};

const mockLeaseStatus = {
    lease_id: LEASE_ID,
    status: { name: 'Vigente' },
};

const mockNextPayment = {
    id: 'payment-001',
    amount: 1200000,
    dueDate: new Date('2025-07-01'),
    status: 'PENDING',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetTenantLeaseDetailUseCase', () => {
    let useCase: GetTenantLeaseDetailUseCase;
    let prisma: ReturnType<typeof createMockPrisma>;
    let paymentsQuery: jest.Mocked<IPaymentsCrossModuleQuery>;

    beforeEach(() => {
        prisma = createMockPrisma();
        paymentsQuery = createMockPaymentsQuery();

        useCase = new GetTenantLeaseDetailUseCase(
            prisma as unknown as PrismaService,
            paymentsQuery,
        );
    });

    describe('resolves property info within landlord_portfolio schema correctly', () => {
        it('returns property type, neighborhood, and address from Property + Address', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(mockProperty as any);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(mockLeaseStatus as any);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(mockNextPayment);

            const result = await useCase.execute(LEASE_ID, TENANT_USER_ID);

            expect(result.propertyType).toBe('Apartamento');
            expect(result.neighborhood).toBe('Centro');
            expect(result.address).toBe('Calle 5 #10-20');
            expect(result.monthlyAmount).toBe(1200000);
            expect(result.currency).toBe('COP');
            expect(result.leaseId).toBe(LEASE_ID);
            expect(result.unitId).toBe(UNIT_ID);
            expect(result.leaseStatus).toBe('Vigente');
        });

        it('resolves Lease → PortfolioUnit → Property chain correctly', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(mockProperty as any);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(mockLeaseStatus as any);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(null);

            await useCase.execute(LEASE_ID, TENANT_USER_ID);

            // Verify the chain: lease → unit (by portfolio_unit_id) → property (by property_id)
            expect(prisma.portfolioUnit.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: UNIT_ID }),
                }),
            );
            expect(prisma.property.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: PROPERTY_ID }),
                    include: { address: true },
                }),
            );
        });

        it('returns default leaseStatus "Acordado" when no current status exists', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(mockProperty as any);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(null);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(null);

            const result = await useCase.execute(LEASE_ID, TENANT_USER_ID);

            expect(result.leaseStatus).toBe('Acordado');
        });

        it('returns empty strings for property fields when property is not found', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(null);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(mockLeaseStatus as any);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(null);

            // Property not found should throw NotFoundException for unit, but let's check
            // Actually, looking at the use case code, property not found doesn't throw — it returns empty strings
            const result = await useCase.execute(LEASE_ID, TENANT_USER_ID);

            expect(result.propertyType).toBe('');
            expect(result.neighborhood).toBe('');
            expect(result.address).toBe('');
        });
    });

    describe('returns next pending payment via cross-module port', () => {
        it('returns next pending payment with earliest due date', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(mockProperty as any);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(mockLeaseStatus as any);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(mockNextPayment);

            const result = await useCase.execute(LEASE_ID, TENANT_USER_ID);

            expect(result.nextPayment).not.toBeNull();
            expect(result.nextPayment!.id).toBe('payment-001');
            expect(result.nextPayment!.amount).toBe(1200000);
            expect(result.nextPayment!.dueDate).toEqual(new Date('2025-07-01'));
            expect(result.nextPayment!.status).toBe('PENDING');
        });

        it('calls paymentsQuery.getNextPendingPayment with the lease ID', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(mockProperty as any);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(mockLeaseStatus as any);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(mockNextPayment);

            await useCase.execute(LEASE_ID, TENANT_USER_ID);

            expect(paymentsQuery.getNextPendingPayment).toHaveBeenCalledWith(LEASE_ID);
        });
    });

    describe('returns null next payment when all are PAID', () => {
        it('returns nextPayment as null when no pending payments exist', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(mockProperty as any);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(mockLeaseStatus as any);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(null);

            const result = await useCase.execute(LEASE_ID, TENANT_USER_ID);

            expect(result.nextPayment).toBeNull();
        });
    });

    describe('rejects non-tenant users (403 Forbidden)', () => {
        it('throws ForbiddenException when lease.user_id does not match userId', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);

            await expect(useCase.execute(LEASE_ID, OTHER_USER_ID)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('throws ForbiddenException with correct message', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);

            await expect(useCase.execute(LEASE_ID, OTHER_USER_ID)).rejects.toThrow(
                'No tienes permiso para ver este arriendo',
            );
        });

        it('throws NotFoundException when lease does not exist', async () => {
            prisma.lease.findFirst.mockResolvedValue(null);

            await expect(useCase.execute(LEASE_ID, TENANT_USER_ID)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('throws NotFoundException with correct message when lease not found', async () => {
            prisma.lease.findFirst.mockResolvedValue(null);

            await expect(useCase.execute(LEASE_ID, TENANT_USER_ID)).rejects.toThrow(
                'Arriendo no encontrado',
            );
        });

        it('throws NotFoundException when unit is not found (soft-deleted)', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(null);

            await expect(useCase.execute(LEASE_ID, TENANT_USER_ID)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('handles soft-deleted records correctly (deleted_at = null filter)', () => {
        it('applies softDeleteFilter when querying lease', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(mockProperty as any);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(mockLeaseStatus as any);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(null);

            await useCase.execute(LEASE_ID, TENANT_USER_ID);

            expect(prisma.lease.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: LEASE_ID, deleted_at: null }),
                }),
            );
        });

        it('applies softDeleteFilter when querying portfolioUnit', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(mockProperty as any);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(mockLeaseStatus as any);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(null);

            await useCase.execute(LEASE_ID, TENANT_USER_ID);

            expect(prisma.portfolioUnit.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: UNIT_ID, deleted_at: null }),
                }),
            );
        });

        it('applies softDeleteFilter when querying property', async () => {
            prisma.lease.findFirst.mockResolvedValue(mockLease as any);
            prisma.portfolioUnit.findFirst.mockResolvedValue(mockUnit as any);
            prisma.property.findFirst.mockResolvedValue(mockProperty as any);
            prisma.leaseCurrentStatus.findUnique.mockResolvedValue(mockLeaseStatus as any);
            paymentsQuery.getNextPendingPayment.mockResolvedValue(null);

            await useCase.execute(LEASE_ID, TENANT_USER_ID);

            expect(prisma.property.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: PROPERTY_ID, deleted_at: null }),
                }),
            );
        });
    });
});
