'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@modules/users/context/AuthContext';
import { tenantService } from '@/shared/services/tenant';
import type { PaymentHistoryItem, PaymentHistoryFilters } from '@/shared/services/tenant';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDueDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

type FilterStatus = 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE';

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Pendientes', value: 'PENDING' },
    { label: 'Pagados', value: 'PAID' },
    { label: 'Vencidos', value: 'OVERDUE' },
];

const PAGE_LIMIT = 10;

function HistorySkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando historial de pagos...</span>
            {[1, 2, 3].map((i) => (
                <div key={i} className="border border-neutral-200 rounded-card bg-white p-4">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-4 w-24" />
                </div>
            ))}
        </div>
    );
}

export default function PaymentHistoryView() {
    const { unitId } = useParams<{ unitId: string }>();
    const { user, logout } = useAuth();
    const [items, setItems] = useState<PaymentHistoryItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<FilterStatus>('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const totalPages = Math.ceil(total / PAGE_LIMIT);

    const fetchHistory = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const filters: PaymentHistoryFilters = {
                status,
                page,
                limit: PAGE_LIMIT,
            };
            const data = await tenantService.getPaymentHistory(unitId, token, filters);
            setItems(data.items);
            setTotal(data.total);
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
    }, [unitId, user?.accessToken, status, page, logout]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleFilterChange = (newStatus: FilterStatus) => {
        setStatus(newStatus);
        setPage(1);
    };

    const backArrow = (
        <Link
            href="/mis-pagos"
            aria-label="Volver a mis pagos"
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

    return (
        <>
            <Header
                title="Historial de pagos"
                onMenuClick={() => { }}
                leftAction={backArrow}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    {/* Filter tabs */}
                    <nav aria-label="Filtros de estado" className="mb-6">
                        <ul className="flex gap-2 flex-wrap" role="tablist">
                            {FILTER_TABS.map((tab) => (
                                <li key={tab.value} role="presentation">
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={status === tab.value}
                                        onClick={() => handleFilterChange(tab.value)}
                                        className={`min-h-[44px] min-w-[44px] px-4 py-2 rounded-[6px] text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${status === tab.value
                                                ? 'bg-[#1d4ed8] text-white'
                                                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Payment list */}
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <HistorySkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchHistory} />
                        ) : items.length === 0 ? (
                            <div className="text-center py-section-gap">
                                <p className="text-h3 font-medium text-neutral-900">
                                    No hay pagos en esta categoría
                                </p>
                                <p className="text-body text-neutral-600 mt-2">
                                    Intenta con otro filtro.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {items.map((item) => (
                                    <article
                                        key={item.id}
                                        className="border border-neutral-200 rounded-card bg-white p-4"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className="text-h3 font-semibold text-neutral-900">
                                                {item.monthLabel}
                                            </h3>
                                            <StatusBadge status={item.status} variant="paymentStatus" />
                                        </div>
                                        <p className="text-caption text-neutral-500 mb-1">
                                            Vence: {formatDueDate(item.dueDate)}
                                        </p>
                                        <p className="text-body font-semibold text-neutral-900 mb-3">
                                            {formatCOP(item.amount)}
                                        </p>
                                        {item.status === 'PENDING' && (
                                            <Link
                                                href={`/mis-pagos/${unitId}/${item.id}`}
                                                className="text-body font-medium text-[#1d4ed8] hover:underline inline-flex items-center min-h-[44px] min-w-[44px]"
                                            >
                                                Pagar &gt;
                                            </Link>
                                        )}
                                        {item.status === 'PAID' && (
                                            <Link
                                                href={`/mis-pagos/${unitId}/${item.id}`}
                                                className="text-body font-medium text-[#1d4ed8] hover:underline inline-flex items-center min-h-[44px] min-w-[44px]"
                                            >
                                                Ver comprobante
                                            </Link>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Pagination */}
                    {totalPages > 1 && !isLoading && !error && (
                        <nav aria-label="Paginación" className="mt-6 flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                aria-label="Página anterior"
                                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-[6px] text-body font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                ←
                            </button>
                            <span className="text-body text-neutral-700">
                                Página {page} de {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                aria-label="Página siguiente"
                                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-[6px] text-body font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                →
                            </button>
                        </nav>
                    )}
                </div>
            </main>
        </>
    );
}
