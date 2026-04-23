'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@modules/users/context/AuthContext';
import { leaseService } from '@/shared/services/lease';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { ContractWizard } from './ContractWizard';
import type { LeaseDetail } from '@modules/landlord-leases/types';

function CreationSkeleton() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando información del arriendo...</span>
            <Skeleton className="h-5 w-48 mb-[4px]" />
            <Skeleton className="h-4 w-64 mb-[24px]" />
            <div className="flex items-center justify-center gap-[16px] mb-[24px]">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-[2px] w-[40px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-[2px] w-[40px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex flex-col gap-[16px]">
                <div>
                    <Skeleton className="h-4 w-24 mb-[8px]" />
                    <Skeleton className="h-[48px] w-full" />
                </div>
                <div>
                    <Skeleton className="h-4 w-24 mb-[8px]" />
                    <Skeleton className="h-[48px] w-full" />
                </div>
                <div>
                    <Skeleton className="h-4 w-40 mb-[8px]" />
                    <Skeleton className="h-[48px] w-full" />
                </div>
                <Skeleton className="h-[44px] w-full mt-[8px]" />
            </div>
        </div>
    );
}

export default function ContractCreationView() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, logout } = useAuth();

    const leaseId = searchParams.get('leaseId');
    const portfolioId = searchParams.get('portfolioId');
    const unitId = searchParams.get('unitId');

    const [lease, setLease] = useState<LeaseDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const missingParams = !leaseId || !portfolioId || !unitId;

    const fetchLease = useCallback(async () => {
        const token = user?.accessToken;
        if (!token || missingParams) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await leaseService.getLeaseDetail(portfolioId!, unitId!, leaseId!, token);
            setLease(data);
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
    }, [leaseId, portfolioId, unitId, user?.accessToken, logout, missingParams]);

    useEffect(() => {
        if (missingParams) {
            setIsLoading(false);
            return;
        }
        fetchLease();
    }, [fetchLease, missingParams]);

    const handleSuccess = (contractId: string) => {
        router.push(`/mis-contratos/${contractId}`);
    };

    const backArrow = (
        <Link
            href="/mis-contratos"
            aria-label="Volver a mis contratos"
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
                title="Crear contrato"
                onMenuClick={() => { }}
                leftAction={backArrow}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {missingParams ? (
                            <div role="alert" className="text-center py-section-gap">
                                <p className="text-body font-medium text-red-700">
                                    Faltan parámetros para crear el contrato.
                                </p>
                                <p className="text-caption text-neutral-600 mt-2">
                                    Inicia la creación de contrato desde el detalle de un arriendo.
                                </p>
                            </div>
                        ) : isLoading ? (
                            <CreationSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchLease} />
                        ) : lease ? (
                            <>
                                <div className="mb-[24px]">
                                    <p className="text-body font-semibold text-neutral-900">
                                        {lease.property.propertyType}
                                    </p>
                                    <p className="text-caption text-neutral-600">
                                        {lease.property.address}
                                    </p>
                                </div>

                                <ContractWizard
                                    lease={lease}
                                    onSuccess={handleSuccess}
                                />
                            </>
                        ) : null}
                    </section>
                </div>
            </main>
        </>
    );
}
