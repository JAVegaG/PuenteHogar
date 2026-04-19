'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { Toast } from '@/shared/components/Toast';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useAuth } from '@modules/users/context/AuthContext';
import { accountingService } from '@/shared/services/accounting';
import type { IndividualReportResponse } from '@/shared/services/accounting';
import { formatPrice } from '@/shared/utils/formatPrice';
import { SummaryCard } from '@modules/landlord-accounting/components/SummaryCard';
import { PeriodFilter } from '@modules/landlord-accounting/components/PeriodFilter';
import { computePeriod } from '@modules/landlord-accounting/utils';
import type { PeriodOption, PeriodRequest } from '@modules/landlord-accounting/types';

interface LeaseHistoryItem {
    id: string;
    tenantName: string;
    status: 'Vigente' | 'Acordado' | 'Finalizado';
    startDate: string;
    endDate: string | null;
    monthlyAmount: number;
}

function formatDateDDMMYYYY(isoDate: string): string {
    const d = new Date(isoDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

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
            <span className="sr-only">Cargando reporte de inmueble...</span>
            <Skeleton className="h-[44px] w-full mb-[24px]" />
            <div className="grid grid-cols-1 gap-[12px] mb-[24px]">
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
            </div>
            <Skeleton className="h-6 w-48 mb-[16px]" />
            {[1, 2].map((i) => (
                <Skeleton key={i} className="h-[120px] w-full mb-[12px]" />
            ))}
        </div>
    );
}

function LeaseHistoryPlaceholder({
    lease,
    onViewPayments,
}: {
    lease: LeaseHistoryItem;
    onViewPayments: () => void;
}) {
    const periodText = lease.endDate
        ? `${formatDateDDMMYYYY(lease.startDate)} - ${formatDateDDMMYYYY(lease.endDate)}`
        : `${formatDateDDMMYYYY(lease.startDate)} - Vigente`;

    return (
        <div
            className="rounded-[6px] p-[16px] mb-[12px]"
            style={{ border: '1px solid #d1d5db' }}
        >
            <div className="flex items-start justify-between mb-[8px]">
                <p className="text-body font-semibold" style={{ color: '#111827' }}>
                    {lease.tenantName}
                </p>
                <StatusBadge status={lease.status} variant="lease" />
            </div>
            <p className="text-caption mb-[4px]" style={{ color: '#4b5563' }}>
                {periodText}
            </p>
            <p className="text-body font-semibold mb-[12px]" style={{ color: '#1d4ed8' }}>
                ${formatPrice(lease.monthlyAmount)}
            </p>
            <button
                type="button"
                onClick={onViewPayments}
                className="text-caption font-medium cursor-pointer min-h-[44px] min-w-[44px] px-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[4px]"
                style={{ color: '#1d4ed8' }}
            >
                Ver pagos
            </button>
        </div>
    );
}

function EmptyLeaseHistory() {
    return (
        <div className="text-center py-[24px]">
            <p className="text-body" style={{ color: '#4b5563' }}>
                No se encontraron arriendos para este inmueble en el periodo seleccionado.
            </p>
        </div>
    );
}

function UnitReportContent() {
    const params = useParams();
    const router = useRouter();
    const portfolioId = params.portfolioId as string;
    const unitId = params.unitId as string;

    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1m');
    const [report, setReport] = useState<IndividualReportResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const { user, logout } = useAuth();

    const fetchReport = useCallback(
        async (period: PeriodRequest) => {
            const token = user?.accessToken;
            if (!token) return;

            setIsLoading(true);
            setError(null);

            try {
                const data = await accountingService.getIndividualReport(portfolioId, unitId, period, token);
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
        [portfolioId, unitId, user?.accessToken, logout],
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

    const showToast = (message: string) => {
        setToastMessage(message);
        setToastVisible(true);
    };

    // Placeholder lease history derived from report data
    // Will be replaced with real LeaseCard components when LeaseService data is available
    const leaseHistory: LeaseHistoryItem[] = report && report.paymentCount > 0
        ? [
            {
                id: 'placeholder-1',
                tenantName: 'Arrendatario',
                status: 'Vigente',
                startDate: report.periodStart,
                endDate: null,
                monthlyAmount: report.totalAmount,
            },
        ]
        : [];

    const backButton = (
        <Link
            href={`/mis-ingresos/portafolio/${portfolioId}`}
            aria-label="Volver a Reporte de portafolio"
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
                title="Reporte de inmueble"
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

                                <section aria-label="Historial de arriendos">
                                    <h2
                                        className="text-h3 font-semibold mb-[16px]"
                                        style={{ color: '#111827' }}
                                    >
                                        Historial de arriendos
                                    </h2>
                                    {leaseHistory.length === 0 ? (
                                        <EmptyLeaseHistory />
                                    ) : (
                                        leaseHistory.map((lease) => (
                                            <LeaseHistoryPlaceholder
                                                key={lease.id}
                                                lease={lease}
                                                onViewPayments={() =>
                                                    showToast('Funcionalidad disponible próximamente')
                                                }
                                            />
                                        ))
                                    )}
                                </section>

                                <button
                                    type="button"
                                    onClick={() => showToast('Funcionalidad disponible próximamente')}
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
                message={toastMessage}
                isVisible={toastVisible}
                onClose={() => setToastVisible(false)}
            />
        </>
    );
}

export default function UnitReportPage() {
    return (
        <LandlordRoute>
            <UnitReportContent />
        </LandlordRoute>
    );
}
