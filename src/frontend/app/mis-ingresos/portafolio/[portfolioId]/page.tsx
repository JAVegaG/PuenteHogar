'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Toast } from '@/shared/components/Toast';
import { useAuth } from '@modules/users/context/AuthContext';
import { accountingService } from '@/shared/services/accounting';
import { portfolioService } from '@/shared/services/portfolio';
import type { AggregatedReportResponse } from '@/shared/services/accounting';
import type { PortfolioUnit } from '@modules/landlord-portfolio/types';
import { formatPrice } from '@/shared/utils/formatPrice';
import { SummaryCard } from '@modules/landlord-accounting/components/SummaryCard';
import { PeriodFilter } from '@modules/landlord-accounting/components/PeriodFilter';
import { computePeriod } from '@modules/landlord-accounting/utils';
import type { PeriodOption, PeriodRequest } from '@modules/landlord-accounting/types';

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

/** Resolves the lease status label for a unit based on its unitStatus */
function getLeaseStatus(unit: PortfolioUnit): string {
    if (unit.unitStatus === 'Ocupado') return 'Vigente';
    if (unit.unitStatus === 'Mantenimiento') return 'Finalizado';
    return 'Acordado';
}

function PortfolioReportContent() {
    const params = useParams();
    const portfolioId = params.portfolioId as string;

    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1m');
    const [report, setReport] = useState<AggregatedReportResponse | null>(null);
    const [units, setUnits] = useState<PortfolioUnit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const { user, logout } = useAuth();

    const fetchData = useCallback(
        async (period: PeriodRequest) => {
            const token = user?.accessToken;
            if (!token) return;

            setIsLoading(true);
            setError(null);

            try {
                const [reportData, unitsData] = await Promise.all([
                    accountingService.getAggregatedReport(portfolioId, period, token),
                    portfolioService.getUnits(portfolioId, token),
                ]);
                setReport(reportData);
                setUnits(unitsData);
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
        fetchData(initialPeriod);
    }, [fetchData]);

    const handlePeriodChange = (period: PeriodRequest) => {
        const option = (['1m', '3m', '6m', '12m'] as PeriodOption[]).find((key) => {
            const computed = computePeriod(key);
            return computed.year === period.year && computed.month === period.month;
        });
        if (option) setSelectedPeriod(option);
        fetchData(period);
    };

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

    const totalAmountFormatted = formatPrice(report?.totalAmount ?? 0);
    const expectedAmountFormatted = formatPrice(report?.expectedAmount ?? 0);

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
                            <ErrorState onRetry={() => fetchData(computePeriod(selectedPeriod))} />
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

                                <section aria-label="Detalle por inmueble">
                                    <h2
                                        className="text-h3 font-semibold mb-[16px]"
                                        style={{ color: '#111827' }}
                                    >
                                        Detalle por inmueble
                                    </h2>

                                    {units.length === 0 ? (
                                        <p className="text-caption py-[16px] text-center" style={{ color: '#4b5563' }}>
                                            No hay inmuebles en este portafolio.
                                        </p>
                                    ) : (
                                        <>
                                            {/* Desktop table */}
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr
                                                            className="text-caption font-medium text-left"
                                                            style={{ color: '#4b5563', borderBottom: '1px solid #d1d5db' }}
                                                        >
                                                            <th className="pb-[8px] pr-[12px] font-medium">Inmueble</th>
                                                            <th className="pb-[8px] pr-[12px] font-medium">Estado arriendo</th>
                                                            <th className="pb-[8px] font-medium text-right">Ingreso</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {units.map((unit) => {
                                                            const income = unit.monthlyRent ?? 0;
                                                            const leaseStatus = getLeaseStatus(unit);
                                                            return (
                                                                <tr
                                                                    key={unit.id}
                                                                    className="text-body"
                                                                    style={{ borderBottom: '1px solid #e5e7eb' }}
                                                                >
                                                                    <td className="py-[12px] pr-[12px]" style={{ color: '#111827' }}>
                                                                        {unit.name}
                                                                    </td>
                                                                    <td className="py-[12px] pr-[12px]">
                                                                        <StatusBadge status={leaseStatus} variant="lease" />
                                                                    </td>
                                                                    <td
                                                                        className="py-[12px] text-body font-semibold text-right"
                                                                        style={{ color: '#111827' }}
                                                                    >
                                                                        ${formatPrice(income)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile stacked cards */}
                                            <div className="flex flex-col gap-[12px] md:hidden">
                                                {units.map((unit) => {
                                                    const income = unit.monthlyRent ?? 0;
                                                    const leaseStatus = getLeaseStatus(unit);
                                                    return (
                                                        <div
                                                            key={unit.id}
                                                            className="rounded-[6px] p-[16px]"
                                                            style={{ border: '1px solid #d1d5db' }}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-body font-semibold" style={{ color: '#111827' }}>
                                                                    {unit.name}
                                                                </p>
                                                                <StatusBadge status={leaseStatus} variant="lease" />
                                                            </div>
                                                            <p
                                                                className="text-body font-semibold mt-[8px]"
                                                                style={{ color: '#111827' }}
                                                            >
                                                                ${formatPrice(income)}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
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
