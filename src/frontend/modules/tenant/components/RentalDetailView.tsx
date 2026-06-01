'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@modules/users/context/AuthContext';
import { tenantService } from '@/shared/services/tenant';
import type { TenantLeaseDetailResponse } from '@/shared/services/tenant';
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

function CalendarIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 shrink-0" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function DollarIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 shrink-0" aria-hidden="true">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}

function LocationIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 shrink-0" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function PropertyIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1d4ed8]" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function RentalDetailSkeleton() {
    return (
        <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando detalle del arriendo...</span>
            <div className="border border-neutral-200 rounded-card bg-white p-6">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-4 w-56 mb-4" />
                <Skeleton className="h-[1px] w-full mb-4" />
                <Skeleton className="h-5 w-full" />
            </div>
            <div className="border border-neutral-200 rounded-card bg-white p-6">
                <Skeleton className="h-5 w-36 mb-4" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-5 w-32 mb-4" />
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-[48px] w-full rounded-[6px]" />
        </div>
    );
}

export default function RentalDetailView() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [data, setData] = useState<TenantLeaseDetailResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    const fetchData = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);
        setNotFound(false);

        try {
            const result = await tenantService.getTenantLeaseDetail(id, token);
            setData(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            if (message === 'Recurso no encontrado') {
                setNotFound(true);
                return;
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [id, user?.accessToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const backArrow = (
        <Link
            href="/mis-arriendos"
            aria-label="Volver a mis arriendos"
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

    if (notFound) {
        return (
            <>
                <Header
                    title="Mi arriendo"
                    onMenuClick={() => { }}
                    leftAction={backArrow}
                />
                <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                    <div className="w-full max-w-[560px]">
                        <div className="text-center py-section-gap" aria-live="polite">
                            <p className="text-h3 font-medium text-neutral-900">
                                Arriendo no encontrado
                            </p>
                            <p className="text-body text-neutral-600 mt-2">
                                El arriendo que buscas no existe o fue eliminado.
                            </p>
                            <Link
                                href="/mis-arriendos"
                                className="mt-4 inline-flex items-center text-primary underline hover:text-primary/80 min-h-[44px] min-w-[44px]"
                            >
                                Volver a mis arriendos
                            </Link>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header
                title="Mi arriendo"
                onMenuClick={() => { }}
                leftAction={backArrow}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <RentalDetailSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchData} />
                        ) : data ? (
                            <div className="flex flex-col gap-6">
                                {/* Property info card with canon mensual */}
                                <section aria-label="Información del inmueble">
                                    <div className="border border-neutral-200 rounded-card bg-white p-6">
                                        <div className="flex items-start gap-3 mb-1">
                                            <div className="w-[40px] h-[40px] rounded-[8px] bg-blue-50 flex items-center justify-center shrink-0">
                                                <PropertyIcon />
                                            </div>
                                            <div>
                                                <h2 className="text-h2 font-bold text-neutral-900">
                                                    {data.propertyType}
                                                </h2>
                                                <div className="flex items-start gap-1 mt-1">
                                                    <LocationIcon />
                                                    <div>
                                                        {data.neighborhood && (
                                                            <span className="text-caption text-neutral-600 block">
                                                                {data.neighborhood}
                                                            </span>
                                                        )}
                                                        <span className="text-caption text-neutral-600 block">
                                                            {data.address}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Canon mensual row */}
                                        <div className="border-t border-neutral-200 mt-4 pt-4 flex items-center justify-between">
                                            <span className="text-body text-neutral-700">
                                                Canon mensual
                                            </span>
                                            <span className="text-h3 font-bold text-[#1d4ed8]">
                                                {formatCOP(data.monthlyAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {/* Next payment card */}
                                {data.nextPayment ? (
                                    <section aria-label="Próximo pago">
                                        <div className="border border-neutral-200 rounded-card bg-white p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-h3 font-bold text-neutral-900">
                                                    Próximo pago
                                                </h3>
                                                <StatusBadge status={data.nextPayment.status} variant="paymentStatus" />
                                            </div>

                                            <div className="flex items-start gap-3 mb-4">
                                                <CalendarIcon />
                                                <div>
                                                    <p className="text-caption text-neutral-500">
                                                        Fecha de vencimiento
                                                    </p>
                                                    <p className="text-body font-medium text-neutral-900">
                                                        {formatDueDate(data.nextPayment.dueDate)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <DollarIcon />
                                                <div>
                                                    <p className="text-caption text-neutral-500">
                                                        Valor a pagar
                                                    </p>
                                                    <p className="text-body font-medium text-neutral-900">
                                                        {formatCOP(data.nextPayment.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                ) : (
                                    <section aria-label="Pagos al día">
                                        <div className="border border-neutral-200 rounded-card bg-white p-6 text-center">
                                            <p className="text-body font-medium text-neutral-700">
                                                No tienes pagos pendientes
                                            </p>
                                            <p className="text-caption text-neutral-500 mt-1">
                                                Estás al día con tus pagos.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* Pagar ahora button */}
                                {data.nextPayment && (
                                    <Link
                                        href={`/mis-pagos/${data.unitId}/${data.nextPayment.id}`}
                                        className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[48px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold text-body w-full"
                                    >
                                        Pagar ahora
                                    </Link>
                                )}

                                {/* Payment history link */}
                                <div className="flex justify-center">
                                    <Link
                                        href={`/mis-pagos/${data.unitId}`}
                                        className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] text-body font-medium text-neutral-700 hover:text-neutral-900"
                                    >
                                        Ver historial de pagos
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>
            </main>
        </>
    );
}
