'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { useAuth } from '@modules/users/context/AuthContext';
import { leaseService } from '@/shared/services/lease';
import { ContractWizard } from '@modules/landlord-contracts/components/ContractWizard';
import type { LeaseDetail } from '@modules/landlord-leases/types';

function CreateContractSkeleton() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando información del arriendo...</span>
            {/* Property info header skeleton */}
            <Skeleton className="h-5 w-48 mb-[4px]" />
            <Skeleton className="h-4 w-64 mb-[24px]" />
            {/* Wizard progress skeleton */}
            <div className="flex items-center justify-center gap-[16px] mb-[24px]">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-[2px] w-[40px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-[2px] w-[40px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            {/* Form fields skeleton */}
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
                <div>
                    <Skeleton className="h-4 w-40 mb-[8px]" />
                    <Skeleton className="h-[48px] w-full" />
                </div>
                <Skeleton className="h-[44px] w-full mt-[8px]" />
            </div>
        </div>
    );
}

function CreateContractContent() {
    const params = useParams();
    const router = useRouter();
    const portfolioId = params.id as string;
    const unitId = params.unitId as string;
    const leaseId = params.leaseId as string;

    const [lease, setLease] = useState<LeaseDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, logout } = useAuth();

    const fetchLeaseDetail = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const leaseData = await leaseService.getLeaseDetail(portfolioId, unitId, leaseId, token);
            setLease(leaseData);
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
    }, [portfolioId, unitId, leaseId, user?.accessToken, logout]);

    useEffect(() => {
        fetchLeaseDetail();
    }, [fetchLeaseDetail]);

    const leaseDetailPath = `/mi-portafolio/${portfolioId}/unidades/${unitId}/arriendos/${leaseId}`;

    const handleSuccess = (contractId: string) => {
        router.push(`/mis-contratos/${contractId}`);
    };

    const backButton = (
        <Link
            href={leaseDetailPath}
            aria-label="Volver al detalle del arriendo"
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
                leftAction={backButton}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <CreateContractSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchLeaseDetail} />
                        ) : lease ? (
                            <>
                                {/* Property info header */}
                                <div className="mb-[24px]">
                                    <p className="text-body font-semibold" style={{ color: '#111827' }}>
                                        {lease.property.propertyType}
                                    </p>
                                    <p className="text-caption" style={{ color: '#4b5563' }}>
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

export default function CreateContractPage() {
    return (
        <LandlordRoute>
            <CreateContractContent />
        </LandlordRoute>
    );
}
