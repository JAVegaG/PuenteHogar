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

function formatShortDueDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getUTCDate();
    const month = date.toLocaleDateString('es-CO', { month: 'long', timeZone: 'UTC' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} de ${capitalizedMonth}`;
}

function CalendarIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 shrink-0" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function ReceiptIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1d4ed8] shrink-0" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    );
}

type FilterStatus = 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE';

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Pendientes', value: 'PENDING' },
    { label: 'Pagados', value: 'PAID' },
    { label: 'Vencidos', value: 'OVERDUE' },
];

const PAGE_LIMIT = 6;

function HistorySkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando historial de pagos...</span>
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-neutral-200 rounded-card bg-white p-4">
                    <div className="flex items-start gap-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <div className="flex-1">
                            <Skeleton className="h-5 w-32 mb-1" />
                            <Skeleton className="h-4 w-40 mb-3" />
                            <Skeleton className="h-5 w-24" />
                        </div>
                    </div>
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
    const startItem = (page - 1) * PAGE_LIMIT + 1;
    const endItem = Math.min(page * PAGE_LIMIT, total);

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
                                        className={`min-h-[36px] px-4 py-2 rounded-full text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${status === tab.value
                                            ? 'bg-[#1d4ed8] text-white'
                                            : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
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
                                        className="border border-neutral-200 rounded-card bg-white px-4 py-4"
                                    >
                                        {/* Header row: icon + month label + badge */}
                                        <div className="flex items-start gap-3">
                                            <div className="mt-[2px]">
                                                <CalendarIcon />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-body font-bold text-neutral-900">
                                                        {item.monthLabel}
                                                    </h3>
                                                    <StatusBadge status={item.status} variant="paymentStatus" />
                                                </div>
                                                <p className="text-caption text-neutral-500 mt-[2px]">
                                                    Vence: {formatShortDueDate(item.dueDate)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Amount + action row */}
                                        <div className="flex items-center justify-between mt-3 pl-[32px]">
                                            <p className="text-body font-semibold text-neutral-900">
                                                {formatCOP(item.amount)}
                                            </p>
                                            {(item.status === 'PENDING' || item.status === 'OVERDUE') && (
                                                <Link
                                                    href={`/mis-pagos/${unitId}/${item.id}`}
                                                    className="text-caption font-medium text-[#1d4ed8] hover:underline inline-flex items-center gap-1 min-h-[44px] min-w-[44px]"
                                                >
                                                    Pagar
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <polyline points="9 18 15 12 9 6" />
                                                    </svg>
                                                </Link>
                                            )}
                                            {item.status === 'PAID' && (
                                                <Link
                                                    href={`/mis-pagos/${unitId}/${item.id}`}
                                                    className="text-caption font-medium text-[#1d4ed8] hover:underline inline-flex items-center gap-1 min-h-[44px] min-w-[44px]"
                                                >
                                                    <ReceiptIcon />
                                                    Ver comprobante
                                                </Link>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Pagination */}
                    {totalPages > 1 && !isLoading && !error && (
                        <div className="mt-6">
                            {/* Results count */}
                            <p className="text-caption text-neutral-500 mb-3">
                                Mostrando {startItem} a {endItem} de {total} resultados
                            </p>

                            {/* Page controls */}
                            <nav aria-label="Paginación" className="flex items-center justify-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    aria-label="Página anterior"
                                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[6px] text-body text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        onClick={() => setPage(pageNum)}
                                        aria-label={`Página ${pageNum}`}
                                        aria-current={page === pageNum ? 'page' : undefined}
                                        className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[6px] text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${page === pageNum
                                            ? 'bg-[#1d4ed8] text-white'
                                            : 'text-neutral-700 hover:bg-neutral-100'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    aria-label="Página siguiente"
                                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[6px] text-body text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
