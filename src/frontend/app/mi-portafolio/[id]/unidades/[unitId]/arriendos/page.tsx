'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { useAuth } from '@modules/users/context/AuthContext';
import { leaseService } from '@/shared/services/lease';
import { portfolioService } from '@/shared/services/portfolio';
import { UnitInfoHeader } from '@modules/landlord-leases/components/UnitInfoHeader';
import { LeaseCard } from '@modules/landlord-leases/components/LeaseCard';
import type { LeaseListItem, UnitInfo } from '@modules/landlord-leases/types';
import type { PortfolioUnit } from '@modules/landlord-portfolio/types';

function LeaseCardSkeleton() {
    return (
        <div className="rounded-[6px] p-[16px]" style={{ border: '1px solid #d1d5db' }}>
            <div className="flex items-start justify-between gap-[8px]">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-48 mt-[4px]" />
            <Skeleton className="h-6 w-32 mt-[8px]" />
            <div className="flex gap-[8px] mt-[16px]">
                <Skeleton className="h-[44px] w-[100px]" />
                <Skeleton className="h-[44px] w-[120px]" />
            </div>
        </div>
    );
}

function UnitHeaderSkeleton() {
    return (
        <div>
            <Skeleton className="h-6 w-48 mb-[4px]" />
            <Skeleton className="h-4 w-32 mt-[2px]" />
            <Skeleton className="h-4 w-56 mt-[2px]" />
            <div className="flex gap-[8px] mt-[8px]">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
            </div>
        </div>
    );
}

function LeasesListSkeleton() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando arriendos de la unidad...</span>
            <UnitHeaderSkeleton />
            <Skeleton className="h-[44px] w-full mt-[16px] mb-[24px]" />
            <div className="flex flex-col gap-[16px]">
                {[1, 2, 3].map((i) => (
                    <LeaseCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

function mapPortfolioUnitToUnitInfo(unit: PortfolioUnit): UnitInfo {
    return {
        id: unit.id,
        name: unit.name || 'Unidad sin nombre',
        propertyType: unit.propertyType ?? '',
        address: unit.address ?? '',
        numberOfRooms: unit.numberOfRooms ?? 0,
        numberOfBathrooms: unit.numberOfBathrooms ?? 0,
        area: unit.area ?? null,
    };
}

function UnitLeasesContent() {
    const params = useParams();
    const portfolioId = params.id as string;
    const unitId = params.unitId as string;

    const [unitInfo, setUnitInfo] = useState<UnitInfo | null>(null);
    const [leases, setLeases] = useState<LeaseListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, logout } = useAuth();

    const fetchData = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const [units, leasesData] = await Promise.all([
                portfolioService.getUnits(portfolioId, token),
                leaseService.getUnitLeases(portfolioId, unitId, token),
            ]);

            const matchedUnit = units.find((u: PortfolioUnit) => u.id === unitId);
            if (matchedUnit) {
                setUnitInfo(mapPortfolioUnitToUnitInfo(matchedUnit));
            }

            const sorted = [...leasesData].sort(
                (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
            );
            setLeases(sorted);
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
    }, [portfolioId, unitId, user?.accessToken, logout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const backButton = (
        <Link
            href={`/mi-portafolio/${portfolioId}/unidades`}
            aria-label="Volver a unidades del portafolio"
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
                title="Arriendos de la unidad"
                onMenuClick={() => { }}
                leftAction={backButton}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <LeasesListSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchData} />
                        ) : (
                            <>
                                {unitInfo && (
                                    <div className="mb-[16px]">
                                        <UnitInfoHeader unit={unitInfo} />
                                    </div>
                                )}

                                <Link
                                    href={`/mi-portafolio/${portfolioId}/unidades/${unitId}/arriendos/crear`}
                                    className="flex items-center justify-center w-full min-h-[44px] px-[16px] py-[12px] rounded-[6px] text-body font-medium transition-colors mb-[24px]"
                                    style={{ backgroundColor: '#1d4ed8', color: '#ffffff' }}
                                >
                                    + Crear nuevo arriendo para esta unidad
                                </Link>

                                {leases.length === 0 ? (
                                    <div className="text-center py-section-gap">
                                        <p className="text-body font-medium" style={{ color: '#111827' }}>
                                            Esta unidad no tiene arriendos registrados
                                        </p>
                                        <p className="text-caption mt-[4px]" style={{ color: '#4b5563' }}>
                                            Crea un nuevo arriendo para comenzar a gestionar esta propiedad.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-[16px]">
                                        {leases.map((lease) => (
                                            <LeaseCard
                                                key={lease.id}
                                                lease={lease}
                                                portfolioId={portfolioId}
                                                unitId={unitId}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}

export default function UnitLeasesPage() {
    return (
        <LandlordRoute>
            <UnitLeasesContent />
        </LandlordRoute>
    );
}
