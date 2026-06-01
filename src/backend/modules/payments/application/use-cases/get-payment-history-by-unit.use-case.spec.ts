// Unit tests for GetPaymentHistoryByUnitUseCase
// Validates: Requirements 2.4

jest.mock('@src/shared/prisma/prisma.service', () => ({
    PrismaService: jest.fn(),
}));

import { ForbiddenException } from '@nestjs/common';
import { GetPaymentHistoryByUnitUseCase } from './get-payment-history-by-unit.use-case';
import type { IPortfolioCrossModuleQuery } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import type { PrismaService } from '@src/shared/prisma/prisma.service';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockPrisma() {
    return {
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
const OTHER_USER_ID = 'user-other-002';
const UNIT_ID = 'unit-001';
const LEASE_ID = 'lease-001';

function createScheduledPayment(
    id: string,
    dueDate: string,
    logStatus: string | null,
) {
    return {
        id,
        lease_id: LEASE_ID,
        amount: { toNumber: () => 1200000 },
        currency: 'COP',
        due_date: new Date(dueDate),
        deleted_at: null,
        payments: logStatus
            ? [{ id: `payment-${id}`, logs: [{ status: logStatus, creation_date: new Date() }] }]
            : [],
    };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetPaymentHistoryByUnitUseCase', () => {
    let useCase: GetPaymentHistoryByUnitUseCase;
    let prisma: ReturnType<typeof createMockPrisma>;
    let portfolioQuery: jest.Mocked<IPortfolioCrossModuleQuery>;

    beforeEach(() => {
        prisma = createMockPrisma();
        portfolioQuery = createMockPortfolioQuery();

        useCase = new GetPaymentHistoryByUnitUseCase(
            prisma as unknown as PrismaService,
            portfolioQuery,
        );
    });

    describe('rejects non-tenant users (403)', () => {
        it('throws ForbiddenException when user is not the tenant on the unit lease', async () => {
            portfolioQuery.getLeaseIdByUnitForTenant.mockResolvedValue(null);

            await expect(
                useCase.execute(UNIT_ID, OTHER_USER_ID, 'ALL', 1, 10),
            ).rejects.toThrow(ForbiddenException);

            expect(portfolioQuery.getLeaseIdByUnitForTenant).toHaveBeenCalledWith(UNIT_ID, OTHER_USER_ID);
        });
    });

    describe('filters by status', () => {
        const futureDate = '2099-07-01';
        const pastDate = '2020-01-01';

        beforeEach(() => {
            portfolioQuery.getLeaseIdByUnitForTenant.mockResolvedValue(LEASE_ID);
        });

        it('returns ALL payments when status is ALL', async () => {
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', futureDate, null),      // PENDING
                createScheduledPayment('sp-2', futureDate, 'PAID'),    // PAID
                createScheduledPayment('sp-3', pastDate, null),        // OVERDUE
            ] as any);

            const result = await useCase.execute(UNIT_ID, TENANT_USER_ID, 'ALL', 1, 10);

            expect(result.items).toHaveLength(3);
            expect(result.total).toBe(3);
        });

        it('returns only PENDING payments when status is PENDING', async () => {
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', futureDate, null),      // PENDING (no log, future)
                createScheduledPayment('sp-2', futureDate, 'PAID'),    // PAID
                createScheduledPayment('sp-3', pastDate, null),        // OVERDUE (past due)
                createScheduledPayment('sp-4', futureDate, 'PENDING'), // PENDING (log says PENDING, future)
            ] as any);

            const result = await useCase.execute(UNIT_ID, TENANT_USER_ID, 'PENDING', 1, 10);

            expect(result.items).toHaveLength(2);
            expect(result.items.every(i => i.status === 'PENDING')).toBe(true);
        });

        it('returns only PAID payments when status is PAID', async () => {
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', futureDate, null),      // PENDING
                createScheduledPayment('sp-2', pastDate, 'PAID'),      // PAID
                createScheduledPayment('sp-3', futureDate, 'PAID'),    // PAID
            ] as any);

            const result = await useCase.execute(UNIT_ID, TENANT_USER_ID, 'PAID', 1, 10);

            expect(result.items).toHaveLength(2);
            expect(result.items.every(i => i.status === 'PAID')).toBe(true);
        });

        it('returns only OVERDUE payments when status is OVERDUE', async () => {
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', futureDate, null),      // PENDING (future)
                createScheduledPayment('sp-2', pastDate, null),        // OVERDUE (past, no PAID log)
                createScheduledPayment('sp-3', pastDate, 'PAID'),      // PAID (past but paid)
                createScheduledPayment('sp-4', pastDate, 'PENDING'),   // OVERDUE (past, log says PENDING)
            ] as any);

            const result = await useCase.execute(UNIT_ID, TENANT_USER_ID, 'OVERDUE', 1, 10);

            expect(result.items).toHaveLength(2);
            expect(result.items.every(i => i.status === 'OVERDUE')).toBe(true);
        });
    });

    describe('pagination', () => {
        beforeEach(() => {
            portfolioQuery.getLeaseIdByUnitForTenant.mockResolvedValue(LEASE_ID);
        });

        it('returns correct page and limit in response', async () => {
            const payments = Array.from({ length: 15 }, (_, i) =>
                createScheduledPayment(`sp-${i}`, '2099-07-01', null),
            );
            prisma.scheduledPayment.findMany.mockResolvedValue(payments as any);

            const result = await useCase.execute(UNIT_ID, TENANT_USER_ID, 'ALL', 1, 10);

            expect(result.items).toHaveLength(10);
            expect(result.total).toBe(15);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });

        it('returns second page correctly', async () => {
            const payments = Array.from({ length: 15 }, (_, i) =>
                createScheduledPayment(`sp-${i}`, '2099-07-01', null),
            );
            prisma.scheduledPayment.findMany.mockResolvedValue(payments as any);

            const result = await useCase.execute(UNIT_ID, TENANT_USER_ID, 'ALL', 2, 10);

            expect(result.items).toHaveLength(5);
            expect(result.total).toBe(15);
            expect(result.page).toBe(2);
            expect(result.limit).toBe(10);
        });

        it('returns empty items when page exceeds total', async () => {
            const payments = Array.from({ length: 5 }, (_, i) =>
                createScheduledPayment(`sp-${i}`, '2099-07-01', null),
            );
            prisma.scheduledPayment.findMany.mockResolvedValue(payments as any);

            const result = await useCase.execute(UNIT_ID, TENANT_USER_ID, 'ALL', 3, 10);

            expect(result.items).toHaveLength(0);
            expect(result.total).toBe(5);
            expect(result.page).toBe(3);
        });

        it('total count reflects filtered results, not all payments', async () => {
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', '2099-07-01', null),    // PENDING
                createScheduledPayment('sp-2', '2099-07-01', 'PAID'),  // PAID
                createScheduledPayment('sp-3', '2099-07-01', null),    // PENDING
            ] as any);

            const result = await useCase.execute(UNIT_ID, TENANT_USER_ID, 'PENDING', 1, 10);

            expect(result.total).toBe(2);
            expect(result.items).toHaveLength(2);
        });
    });

    describe('monthLabel generation', () => {
        beforeEach(() => {
            portfolioQuery.getLeaseIdByUnitForTenant.mockResolvedValue(LEASE_ID);
        });

        it('generates Spanish month labels from due_date', async () => {
            prisma.scheduledPayment.findMany.mockResolvedValue([
                createScheduledPayment('sp-1', '2025-07-01', null),
                createScheduledPayment('sp-2', '2025-01-15', 'PAID'),
                createScheduledPayment('sp-3', '2025-12-31', null),
            ] as any);

            const result = await useCase.execute(UNIT_ID, TENANT_USER_ID, 'ALL', 1, 10);

            const labels = result.items.map(i => i.monthLabel);
            expect(labels).toContain('Julio 2025');
            expect(labels).toContain('Enero 2025');
            expect(labels).toContain('Diciembre 2025');
        });
    });

    describe('soft delete filtering', () => {
        beforeEach(() => {
            portfolioQuery.getLeaseIdByUnitForTenant.mockResolvedValue(LEASE_ID);
        });

        it('applies deleted_at: null filter when querying scheduled payments', async () => {
            prisma.scheduledPayment.findMany.mockResolvedValue([]);

            await useCase.execute(UNIT_ID, TENANT_USER_ID, 'ALL', 1, 10);

            expect(prisma.scheduledPayment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        lease_id: LEASE_ID,
                        deleted_at: null,
                    }),
                }),
            );
        });
    });
});
