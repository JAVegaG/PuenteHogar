'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { Toast } from '@/shared/components/Toast';
import { useAuth } from '@modules/users/context/AuthContext';
import { accountingService } from '@/shared/services/accounting';
import type { AggregatedReportResponse } from '@/shared/services/accounting';
import { formatPrice } from '@/shared/utils/formatPrice';
import { SummaryCard } from '@modules/landlord-accounting/components/SummaryCard';
import { PeriodFilter } from '@modules/landlord-accounting/components/PeriodFilter';
import { PropertyDetailTable } from '@modules/landlord-accounting/components/PropertyDetailTable';
import { computePeriod } from '@modules/landlord-accounting/utils';
import type { PeriodOption, PeriodRequest, PropertyDetailRow } from '@modules/landlord-accounting/types';

function SummaryCardSkeleton() {
    return (
        <div className="rounded-[6px] p-[16px]" style={{ border: '1px solid #d1d5db' }}>
            <Skeleton className="h-4 w-24 mb-[4px]" />
            <Skeleton className="h-6 w-32" />
        </div>
    );
}

function ReportSkeleton() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando reporte de portafolio...</span>
            <Skeleton className="h-[44px] w-full mb-[24px]" />
            <div className="grid grid-cols-1 gap-[12px] mb-[24px]">
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
            </div>
            <Skeleton className="h-6 w-48 mb-[16px]" />
            {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[80px] w-full mb-[12px]" />
            ))}
        </div>
    );
}

function PortfolioReportContent() {
    const params = useParams();
    const router = useRouter();
    const portfolioId = params.portfolioId as string;

    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1m');
    const [report, setReport] = useState<AggregatedReportResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const { user, logout } = useAuth();

    const fetchReport = useCallback(
        async (period: PeriodRequest) => {
            const token = user?.accessToken;
            if (!token) return;

            setIsLoading(true);
            setError(null);

            try {
                const data = await accountingService.getAggregatedReport(portfolioId, period, token);
                setReport(data);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Error desconocido';
                if (message === 'Sesión expirada') {
                    logout();
                    return;
                }
                setError(message);
            } finally {
                setIsLoading(false);
            }
        },
        [portfolioId, user?.accessToken, logout],
    );

    useEffect(() => {
        const initialPeriod = computePeriod('1m');
        fetchReport(initialPeriod);
    }, [fetchReport]);

    const handlePeriodChange = (period: PeriodRequest) => {
        const option = (['1m', '3m', '6m', '12m'] as PeriodOption[]).find((key) => {
            const computed = computePeriod(key);
            return computed.year === period.year && computed.month === period.month;
        });
        if (option) setSelectedPeriod(option);
        fetchReport(period);
    };

    const units: PropertyDetailRow[] = report
        ? Array.from({ length: report.numberOfUnits }, (_, i) => ({
            unitId: 'unit-' + i,
            address: report.message || 'Unidad ' + (i + 1),
            neighborhood: '-',
            monthlyIncome: report.numberOfUnits > 0 ? report.totalAmount / report.numberOfUnits : 0,
            paymentStatus: (report.overdueCount > 0 ? 'Pendiente' : 'Al día') as 'Al día' | 'Pendiente',
        }))
        : [];

    const backButton = (
        <Link
            href="/mis-ingresos"
            aria-label="Volver a Mis ingresos"
            className="flex items-center justify-center w-[44px] h-[44px] rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
            </svg>
        </Link>
    );

    const totalAmountFormatted = '$' + formatPrice(report?.totalAmount ?? 0);
    const expectedAmountFormatted = '$' + formatPrice(report?.expectedAmount ?? 0);

    return (
        <>
            <Header
                title="Reporte de portafolio"
                onMenuClick={() => { }}
                leftAction={backButton}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <ReportSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={() => fetchReport(computePeriod(selectedPeriod))} />
                        ) : (
                            <>
                                <div className="mb-[24px]">
                                    <PeriodFilter
                                        selectedPeriod={selectedPeriod}
                                        onPeriodChange={handlePeriodChange}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-[12px] mb-[24px]">
                                    <SummaryCard
                                        label="Ingresos recibidos"
                                        value={totalAmountFormatted}
                                        valueColor="#1d4ed8"
                                    />
                                    <SummaryCard
                                        label="Ingresos esperados"
                                        value={expectedAmountFormatted}
                                    />
                                </div>

                                <section aria-label="Detalle por propiedad">
                                    <h2
                                        className="text-h3 font-semibold mb-[16px]"
                                        style={{ color: '#111827' }}
                                    >
                                        Detalle por propiedad
                                    </h2>
                                    <PropertyDetailTable units={units} />
                                </section>

                                <button
                                    type="button"
                                    onClick={() => setToastVisible(true)}
                                    className="w-full mt-[24px] rounded-[6px] min-h-[44px] px-[16px] py-[12px] text-body font-medium cursor-pointer transition-colors"
                                    style={{
                                        backgroundColor: '#ffffff',
                                        color: '#1d4ed8',
                                        border: '1px solid #1d4ed8',
                                    }}
                                >
                                    Exportar reporte
                                </button>
                            </>
                        )}
                    </section>
                </div>
            </main>

            <Toast
                message="Funcionalidad disponible próximamente"
                isVisible={toastVisible}
                onClose={() => setToastVisible(false)}
            />
        </>
    );
}

export default function PortfolioReportPage() {
    return (
        <LandlordRoute>
            <PortfolioReportContent />
        </LandlordRoute>
    );
}
