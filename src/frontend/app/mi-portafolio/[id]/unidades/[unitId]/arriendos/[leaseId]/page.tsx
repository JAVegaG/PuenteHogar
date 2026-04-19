'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useAuth } from '@modules/users/context/AuthContext';
import { leaseService } from '@/shared/services/lease';
import { LeaseDetailView } from '@modules/landlord-leases/components/LeaseDetailView';
import type { LeaseDetail } from '@modules/landlord-leases/types';

function LeaseDetailSkeleton() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando detalle del arriendo...</span>
            <Skeleton className="h-6 w-24 mb-[24px]" />
            {/* Inmueble section */}
            <Skeleton className="h-6 w-32 mb-[12px]" />
            <div className="flex flex-col gap-[12px] mb-[24px]">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-56" />
            </div>
            {/* Arrendatario section */}
            <Skeleton className="h-6 w-36 mb-[12px]" />
            <div className="flex flex-col gap-[12px] mb-[24px]">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-28" />
            </div>
            {/* Acuerdo section */}
            <Skeleton className="h-6 w-28 mb-[12px]" />
            <div className="flex flex-col gap-[12px] mb-[24px]">
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
            </div>
            {/* Bottom button */}
            <Skeleton className="h-[44px] w-full" />
        </div>
    );
}

function LeaseDetailContent() {
    const params = useParams();
    const router = useRouter();
    const portfolioId = params.id as string;
    const unitId = params.unitId as string;
    const leaseId = params.leaseId as string;

    const [lease, setLease] = useState<LeaseDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const { user, logout } = useAuth();

    const fetchData = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);
        setNotFound(false);

        try {
            const leaseData = await leaseService.getLeaseDetail(portfolioId, unitId, leaseId, token);
            setLease(leaseData);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            if (message === 'Sesión expirada') {
                logout();
                return;
            }
            if (message.includes('404') || message.toLowerCase().includes('no encontr')) {
                setNotFound(true);
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [portfolioId, unitId, leaseId, user?.accessToken, logout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const leasesListPath = `/mi-portafolio/${portfolioId}/unidades/${unitId}/arriendos`;

    const backButton = (
        <Link
            href={leasesListPath}
            aria-label="Volver a arriendos de la unidad"
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
                title="Detalle del arriendo"
                onMenuClick={() => { }}
                leftAction={backButton}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <LeaseDetailSkeleton />
                        ) : notFound ? (
                            <div className="text-center py-section-gap">
                                <p className="text-body font-medium" style={{ color: '#111827' }}>
                                    Arriendo no encontrado
                                </p>
                                <p className="text-caption mt-[4px]" style={{ color: '#4b5563' }}>
                                    El arriendo que buscas no existe o fue eliminado.
                                </p>
                                <Link
                                    href={leasesListPath}
                                    className="inline-block mt-[16px] text-caption font-medium"
                                    style={{ color: '#1d4ed8' }}
                                >
                                    Volver a arriendos de la unidad
                                </Link>
                            </div>
                        ) : error ? (
                            <ErrorState onRetry={fetchData} />
                        ) : lease ? (
                            <>
                                <div className="mb-[16px]">
                                    <StatusBadge status={lease.status} variant="lease" />
                                </div>
                                <LeaseDetailView
                                    lease={lease}
                                    portfolioId={portfolioId}
                                    unitId={unitId}
                                />
                            </>
                        ) : null}
                    </section>
                </div>
            </main>
        </>
    );
}

export default function LeaseDetailPage() {
    return (
        <LandlordRoute>
            <LeaseDetailContent />
        </LandlordRoute>
    );
}
