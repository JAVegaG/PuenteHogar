// Unit tests for GetPaymentUnitsUseCase
// Validates: Requirements 2.3

jest.mock('@src/shared/prisma/prisma.service', () => ({
    PrismaService: jest.fn(),
}));

import { GetPaymentUnitsUseCase } from './get-payment-units.use-case';
import type { IPortfolioCrossModuleQuery } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import type { PrismaService } from '@src/shared/prisma/prisma.service';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockPrisma() {
    return {
        lease: {
            findMany: jest.fn(),
        },
        scheduledPayment: {
            findMany: jest.fn(),
        },
    } as any;
}

function createMockPortfolioQuery(): jest.Mocked<IPortfolioCrossModuleQuery> {
    return {
        hasActiveLeases: jest.fn(),
        hasPortfoliosWithUnits: jest.fn(),
        hasActiveLeasesInPortfolios: jest.fn(),
        getPropertyInfoByLeaseId: jest.fn(),
        getLeaseIdByUnitForTenant: jest.fn(),
        verifyTenantOwnership: jest.fn(),
    };
}

// ─── Test Data ───────────────────────────────────────────────────────────────

const TENANT_USER_ID = 'user-tenant-001';
const LEASE_ID_1 = 'lease-001';
const LEASE_ID_2 = 'lease-002';
const UNIT_ID_1 = 'unit-001';
const UNIT_ID_2 = 'unit-002';

const mockLeases = [
    { id: LEASE_ID_1 },
    { id: LEASE_ID_2 },
];

function createScheduledPayment(id: string, leaseId: string, status: string | null) {
    return {
        id,
        lease_id: leaseId,
        amount: { toNumber: () => 1200000 },
        currency: 'COP',
        due_date: new Date('2025-07-01'),
        deleted_at: null,
        payments: status ? [{
            id: `payment-${id}`,
            logs: [{ status, creation_date: new Date() }],
        }] : [],
    };
}

const mockPropertyInfo1 = {
    unitId: UNIT_ID_1,
    propertyName: 'Apartamento Centro',
    propertyType: 'Apartamento',
    neighborhood: 'Centro',
    leaseStatus: 'Vigente',
};

const mockPropertyInfo2 = {
    unitId: UNIT_ID_2,
    propertyName: 'Casa Norte',
    propertyType: 'Casa',
    neighborhood: 'Norte',
    leaseStatus: 'Vigente',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetPaymentUnitsUseCase', () => {
    let useCase: GetPaymentUnitsUseCase;
    let prisma: ReturnType<typeof createMockPrisma>;
    let portfolioQuery: jest.Mocked<IPortfolioCrossModuleQuery>;

    beforeEach(() => {
        prisma = createMockPrisma();
        portfolioQuery = createMockPortfolioQuery();

        useCase = new GetPaymentUnitsUseCase(
            prisma as unknown as PrismaService,
            portfolioQuery,
        );
    });

    describe('groups payments by unit correctly (one card per distinct unit)', () => {
        it('returns one card per distinct unit when multiple payments exist for same lease', async () => {
            prisma.lease.findMany.mockResolvedValue(mockLeases as any);
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', LEASE_ID_1, null),
                createScheduledPayment('sp-2', LEASE_ID_1, null),
                createScheduledPayment('sp-3', LEASE_ID_1, 'PAID'),
            ] as any);
            portfolioQuery.getPropertyInfoByLeaseId.mockResolvedValue(mockPropertyInfo1);

            const result = await useCase.execute(TENANT_USER_ID);

            expect(result).toHaveLength(1);
            expect(result[0].unitId).toBe(UNIT_ID_1);
            expect(result[0].pendingCount).toBe(2); // sp-1 and sp-2 are PENDING (no log = PENDING)
        });

        it('returns separate cards for different units', async () => {
            prisma.lease.findMany.mockResolvedValue(mockLeases as any);
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', LEASE_ID_1, null),
                createScheduledPayment('sp-2', LEASE_ID_2, null),
            ] as any);
            portfolioQuery.getPropertyInfoByLeaseId
                .mockResolvedValueOnce(mockPropertyInfo1)
                .mockResolvedValueOnce(mockPropertyInfo2);

            const result = await useCase.execute(TENANT_USER_ID);

            expect(result).toHaveLength(2);
            const unitIds = result.map(r => r.unitId);
            expect(unitIds).toContain(UNIT_ID_1);
            expect(unitIds).toContain(UNIT_ID_2);
        });

        it('accumulates pending count when multiple leases map to same unit', async () => {
            prisma.lease.findMany.mockResolvedValue(mockLeases as any);
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', LEASE_ID_1, null),
                createScheduledPayment('sp-2', LEASE_ID_2, null),
            ] as any);
            // Both leases resolve to the same unit
            portfolioQuery.getPropertyInfoByLeaseId.mockResolvedValue(mockPropertyInfo1);

            const result = await useCase.execute(TENANT_USER_ID);

            expect(result).toHaveLength(1);
            expect(result[0].unitId).toBe(UNIT_ID_1);
            expect(result[0].pendingCount).toBe(2);
        });

        it('counts only PENDING payments (not PAID or REJECTED)', async () => {
            prisma.lease.findMany.mockResolvedValue([{ id: LEASE_ID_1 }] as any);
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', LEASE_ID_1, null),      // PENDING (no log)
                createScheduledPayment('sp-2', LEASE_ID_1, 'PENDING'), // PENDING
                createScheduledPayment('sp-3', LEASE_ID_1, 'PAID'),    // PAID
                createScheduledPayment('sp-4', LEASE_ID_1, 'REJECTED'),// REJECTED
            ] as any);
            portfolioQuery.getPropertyInfoByLeaseId.mockResolvedValue(mockPropertyInfo1);

            const result = await useCase.execute(TENANT_USER_ID);

            expect(result).toHaveLength(1);
            expect(result[0].pendingCount).toBe(2); // sp-1 (no log = PENDING) + sp-2
        });
    });

    describe('resolves property name cross-schema via port', () => {
        it('calls getPropertyInfoByLeaseId for each distinct lease', async () => {
            prisma.lease.findMany.mockResolvedValue(mockLeases as any);
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', LEASE_ID_1, null),
                createScheduledPayment('sp-2', LEASE_ID_2, null),
            ] as any);
            portfolioQuery.getPropertyInfoByLeaseId
                .mockResolvedValueOnce(mockPropertyInfo1)
                .mockResolvedValueOnce(mockPropertyInfo2);

            const result = await useCase.execute(TENANT_USER_ID);

            expect(portfolioQuery.getPropertyInfoByLeaseId).toHaveBeenCalledWith(LEASE_ID_1);
            expect(portfolioQuery.getPropertyInfoByLeaseId).toHaveBeenCalledWith(LEASE_ID_2);
            expect(result[0].propertyName).toBeDefined();
            expect(result[1].propertyName).toBeDefined();
        });

        it('populates propertyName, propertyType, neighborhood, and leaseStatus from port', async () => {
            prisma.lease.findMany.mockResolvedValue([{ id: LEASE_ID_1 }] as any);
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', LEASE_ID_1, null),
            ] as any);
            portfolioQuery.getPropertyInfoByLeaseId.mockResolvedValue(mockPropertyInfo1);

            const result = await useCase.execute(TENANT_USER_ID);

            expect(result[0].propertyName).toBe('Apartamento Centro');
            expect(result[0].propertyType).toBe('Apartamento');
            expect(result[0].neighborhood).toBe('Centro');
            expect(result[0].leaseStatus).toBe('Vigente');
        });

        it('skips lease when property info cannot be resolved (port returns null)', async () => {
            prisma.lease.findMany.mockResolvedValue(mockLeases as any);
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', LEASE_ID_1, null),
                createScheduledPayment('sp-2', LEASE_ID_2, null),
            ] as any);
            portfolioQuery.getPropertyInfoByLeaseId
                .mockResolvedValueOnce(mockPropertyInfo1)
                .mockResolvedValueOnce(null); // lease-002 cannot be resolved

            const result = await useCase.execute(TENANT_USER_ID);

            expect(result).toHaveLength(1);
            expect(result[0].unitId).toBe(UNIT_ID_1);
        });
    });

    describe('returns empty array for tenant with no payments', () => {
        it('returns empty array when tenant has no leases', async () => {
            prisma.lease.findMany.mockResolvedValue([]);

            const result = await useCase.execute(TENANT_USER_ID);

            expect(result).toEqual([]);
        });

        it('returns empty array when tenant has leases but no scheduled payments', async () => {
            prisma.lease.findMany.mockResolvedValue(mockLeases as any);
            prisma.scheduledPayment.findMany.mockResolvedValue([]);

            const result = await useCase.execute(TENANT_USER_ID);

            expect(result).toEqual([]);
        });
    });

    describe('excludes soft-deleted leases/payments', () => {
        it('applies deleted_at: null filter when querying leases', async () => {
            prisma.lease.findMany.mockResolvedValue([]);

            await useCase.execute(TENANT_USER_ID);

            expect(prisma.lease.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        user_id: TENANT_USER_ID,
                        deleted_at: null,
                    }),
                }),
            );
        });

        it('applies deleted_at: null filter when querying scheduled payments', async () => {
            prisma.lease.findMany.mockResolvedValue([{ id: LEASE_ID_1 }] as any);
            prisma.scheduledPayment.findMany.mockResolvedValue([]);

            await useCase.execute(TENANT_USER_ID);

            expect(prisma.scheduledPayment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        deleted_at: null,
                    }),
                }),
            );
        });
    });
});
