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

const PROPERTY_TYPE_ICONS: Record<string, string> = {
    Apartamento: '🏢',
    Casa: '🏠',
    Estudio: '🏠',
    Local: '🏪',
    Oficina: '🏢',
    Bodega: '🏭',
};

function RentalDetailSkeleton() {
    return (
        <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando detalle del arriendo...</span>
            <div className="border border-neutral-200 rounded-card bg-white p-4">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-4 w-56" />
            </div>
            <div className="border border-neutral-200 rounded-card bg-white p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-6 w-40" />
            </div>
            <div className="border border-neutral-200 rounded-card bg-white p-4">
                <Skeleton className="h-5 w-36 mb-3" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-10 w-full" />
            </div>
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
                    title="Detalle del arriendo"
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
                title="Detalle del arriendo"
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
                                {/* Property info card */}
                                <section aria-label="Información del inmueble">
                                    <div className="border border-neutral-200 rounded-card bg-white p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-h2" aria-hidden="true">
                                                {PROPERTY_TYPE_ICONS[data.propertyType] || '🏠'}
                                            </span>
                                            <div>
                                                <h2 className="text-h3 font-semibold text-neutral-900">
                                                    {data.propertyType}
                                                </h2>
                                                <p className="text-caption text-neutral-600">
                                                    {data.neighborhood}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-body text-neutral-700">
                                            {data.address}
                                        </p>
                                        <div className="mt-3">
                                            <StatusBadge status={data.leaseStatus} variant="tracking" />
                                        </div>
                                    </div>
                                </section>

                                {/* Monthly rent */}
                                <section aria-label="Canon mensual">
                                    <div className="border border-neutral-200 rounded-card bg-white p-4">
                                        <p className="text-caption text-neutral-600 mb-1">
                                            Canon mensual
                                        </p>
                                        <p className="text-h2 font-bold text-neutral-900">
                                            {formatCOP(data.monthlyAmount)}
                                        </p>
                                    </div>
                                </section>

                                {/* Next payment card */}
                                {data.nextPayment && (
                                    <section aria-label="Próximo pago">
                                        <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                            Próximo pago
                                        </h2>
                                        <div className="border border-neutral-200 rounded-card bg-white p-4">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <p className="text-h2 font-bold text-neutral-900">
                                                    {formatCOP(data.nextPayment.amount)}
                                                </p>
                                                <StatusBadge status={data.nextPayment.status} variant="paymentStatus" />
                                            </div>
                                            <p className="text-caption text-neutral-500 mb-4">
                                                Vence: {formatDueDate(data.nextPayment.dueDate)}
                                            </p>
                                            <Link
                                                href={`/mis-pagos/${data.unitId}/${data.nextPayment.id}`}
                                                className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold text-body w-full"
                                            >
                                                Pagar ahora
                                            </Link>
                                        </div>
                                    </section>
                                )}

                                {/* Payment history link */}
                                <div className="text-center">
                                    <Link
                                        href={`/mis-pagos/${data.unitId}`}
                                        className="inline-flex items-center text-primary underline hover:text-primary/80 min-h-[44px] min-w-[44px] text-body font-medium"
                                    >
                                        Ver historial de pagos
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
