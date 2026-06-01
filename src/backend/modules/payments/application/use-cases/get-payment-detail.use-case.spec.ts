// Unit tests for GetPaymentDetailUseCase
// Validates: Requirements 2.5, 2.6

jest.mock('@src/shared/prisma/prisma.service', () => ({
    PrismaService: jest.fn(),
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetPaymentDetailUseCase } from './get-payment-detail.use-case';
import type { IPortfolioCrossModuleQuery } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import type { PrismaService } from '@src/shared/prisma/prisma.service';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockPrisma() {
    return {
        scheduledPayment: {
            findFirst: jest.fn(),
        },
    } as unknown as jest.Mocked<PrismaService>;
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
const PAYMENT_ID = 'sp-001';
const LEASE_ID = 'lease-001';

function createPendingScheduledPayment() {
    return {
        id: PAYMENT_ID,
        lease_id: LEASE_ID,
        amount: 1200000,
        currency: 'COP',
        due_date: new Date('2099-07-01'),
        deleted_at: null,
        payments: [],
    };
}

function createPaidScheduledPayment() {
    return {
        id: PAYMENT_ID,
        lease_id: LEASE_ID,
        amount: 1200000,
        currency: 'COP',
        due_date: new Date('2025-06-01'),
        deleted_at: null,
        payments: [
            {
                id: 'payment-001',
                created_at: new Date('2025-06-01T10:30:00Z'),
                logs: [
                    {
                        status: 'PAID',
                        creation_date: new Date('2025-06-01T10:30:00Z'),
                        data: { paymentMethod: 'Tarjeta débito', receiptUrl: 'https://pagos.example.com/recibo/123' },
                    },
                ],
            },
        ],
    };
}

function createPaidScheduledPaymentNoMetadata() {
    return {
        id: PAYMENT_ID,
        lease_id: LEASE_ID,
        amount: 1200000,
        currency: 'COP',
        due_date: new Date('2025-05-01'),
        deleted_at: null,
        payments: [
            {
                id: 'payment-002',
                created_at: new Date('2025-05-02T14:00:00Z'),
                logs: [
                    {
                        status: 'PAID',
                        creation_date: new Date('2025-05-02T14:00:00Z'),
                        data: null,
                    },
                ],
            },
        ],
    };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetPaymentDetailUseCase', () => {
    let useCase: GetPaymentDetailUseCase;
    let prisma: ReturnType<typeof createMockPrisma>;
    let portfolioQuery: jest.Mocked<IPortfolioCrossModuleQuery>;

    beforeEach(() => {
        prisma = createMockPrisma();
        portfolioQuery = createMockPortfolioQuery();

        useCase = new GetPaymentDetailUseCase(
            prisma as unknown as PrismaService,
            portfolioQuery,
        );
    });

    describe('returns line items for pending payments', () => {
        it('returns isPending: true and line items for a pending payment', async () => {
            prisma.scheduledPayment.findFirst.mockResolvedValue(createPendingScheduledPayment() as any);
            portfolioQuery.verifyTenantOwnership.mockResolvedValue(true);

            const result = await useCase.execute(PAYMENT_ID, TENANT_USER_ID);

            expect(result.isPending).toBe(true);
            expect(result.status).toBe('PENDING');
            expect(result.lineItems).toHaveLength(1);
            expect(result.lineItems[0].concept).toBe('Canon de arrendamiento');
            expect(result.lineItems[0].amount).toBe(1200000);
            expect(result.amount).toBe(1200000);
            expect(result.currency).toBe('COP');
        });

        it('does NOT include datePaid, paymentMethod, or receiptUrl for pending payments', async () => {
            prisma.scheduledPayment.findFirst.mockResolvedValue(createPendingScheduledPayment() as any);
            portfolioQuery.verifyTenantOwnership.mockResolvedValue(true);

            const result = await useCase.execute(PAYMENT_ID, TENANT_USER_ID);

            expect(result.datePaid).toBeNull();
            expect(result.paymentMethod).toBeNull();
            expect(result.receiptUrl).toBeNull();
        });
    });

    describe('returns receipt data for paid payments', () => {
        it('returns isPending: false and receipt data for a paid payment', async () => {
            prisma.scheduledPayment.findFirst.mockResolvedValue(createPaidScheduledPayment() as any);
            portfolioQuery.verifyTenantOwnership.mockResolvedValue(true);

            const result = await useCase.execute(PAYMENT_ID, TENANT_USER_ID);

            expect(result.isPending).toBe(false);
            expect(result.status).toBe('PAID');
            expect(result.datePaid).toEqual(new Date('2025-06-01T10:30:00Z'));
            expect(result.paymentMethod).toBe('Tarjeta débito');
            expect(result.receiptUrl).toBe('https://pagos.example.com/recibo/123');
        });

        it('returns line items for paid payments as well', async () => {
            prisma.scheduledPayment.findFirst.mockResolvedValue(createPaidScheduledPayment() as any);
            portfolioQuery.verifyTenantOwnership.mockResolvedValue(true);

            const result = await useCase.execute(PAYMENT_ID, TENANT_USER_ID);

            expect(result.lineItems).toHaveLength(1);
            expect(result.lineItems[0].concept).toBe('Canon de arrendamiento');
            expect(result.lineItems[0].amount).toBe(1200000);
        });

        it('defaults paymentMethod to PSE when log metadata is null', async () => {
            prisma.scheduledPayment.findFirst.mockResolvedValue(createPaidScheduledPaymentNoMetadata() as any);
            portfolioQuery.verifyTenantOwnership.mockResolvedValue(true);

            const result = await useCase.execute(PAYMENT_ID, TENANT_USER_ID);

            expect(result.paymentMethod).toBe('PSE');
            expect(result.receiptUrl).toContain('https://pagos.example.com/recibos/');
        });
    });

    describe('does NOT include checkout fields for paid payments', () => {
        it('paid payments have isPending: false (frontend uses this to hide checkout UI)', async () => {
            prisma.scheduledPayment.findFirst.mockResolvedValue(createPaidScheduledPayment() as any);
            portfolioQuery.verifyTenantOwnership.mockResolvedValue(true);

            const result = await useCase.execute(PAYMENT_ID, TENANT_USER_ID);

            // isPending: false signals the frontend to show receipt-only view
            // and NOT show payment method selection or "Continuar con pago" button
            expect(result.isPending).toBe(false);
            expect(result.status).toBe('PAID');
        });
    });

    describe('rejects non-tenant users (403)', () => {
        it('throws ForbiddenException when user is not the tenant on the lease', async () => {
            prisma.scheduledPayment.findFirst.mockResolvedValue(createPendingScheduledPayment() as any);
            portfolioQuery.verifyTenantOwnership.mockResolvedValue(false);

            await expect(
                useCase.execute(PAYMENT_ID, OTHER_USER_ID),
            ).rejects.toThrow(ForbiddenException);

            expect(portfolioQuery.verifyTenantOwnership).toHaveBeenCalledWith(LEASE_ID, OTHER_USER_ID);
        });
    });

    describe('handles not-found payments', () => {
        it('throws NotFoundException when payment does not exist', async () => {
            prisma.scheduledPayment.findFirst.mockResolvedValue(null);

            await expect(
                useCase.execute('non-existent-id', TENANT_USER_ID),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('soft delete filtering', () => {
        it('applies deleted_at: null filter when querying scheduled payment', async () => {
            prisma.scheduledPayment.findFirst.mockResolvedValue(null);

            await expect(useCase.execute(PAYMENT_ID, TENANT_USER_ID)).rejects.toThrow();

            expect(prisma.scheduledPayment.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        id: PAYMENT_ID,
                        deleted_at: null,
                    }),
                }),
            );
        });
    });
});
