'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { useAuth } from '@modules/users/context/AuthContext';
import { portfolioService } from '@/shared/services/portfolio';
import { UnitInfoHeader } from '@modules/landlord-leases/components/UnitInfoHeader';
import { PublishForm } from '@modules/landlord-publish/components/PublishForm';
import type { UnitInfo } from '@modules/landlord-leases/types';
import type { PortfolioUnit } from '@modules/landlord-portfolio/types';

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

function PublishSkeleton() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando información de la unidad...</span>
            <Skeleton className="h-6 w-48 mb-[4px]" />
            <Skeleton className="h-4 w-32 mt-[2px]" />
            <Skeleton className="h-4 w-56 mt-[2px]" />
            <div className="flex gap-[8px] mt-[8px]">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
            </div>
            <div className="mt-[24px] flex flex-col gap-[24px]">
                <Skeleton className="h-[100px] w-full" />
                <div>
                    <Skeleton className="h-4 w-48 mb-[8px]" />
                    <Skeleton className="h-[48px] w-full" />
                </div>
                <div>
                    <Skeleton className="h-4 w-32 mb-[8px]" />
                    <Skeleton className="h-[96px] w-full" />
                </div>
                <div>
                    <Skeleton className="h-4 w-56 mb-[8px]" />
                    <Skeleton className="h-[48px] w-full" />
                </div>
                <Skeleton className="h-[56px] w-full" />
            </div>
        </div>
    );
}

function PublishContent() {
    const params = useParams();
    const router = useRouter();
    const portfolioId = params.id as string;
    const unitId = params.unitId as string;

    const [unitInfo, setUnitInfo] = useState<UnitInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, logout } = useAuth();

    const fetchUnitInfo = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const units = await portfolioService.getUnits(portfolioId, token);
            const matchedUnit = units.find((u: PortfolioUnit) => u.id === unitId);
            if (matchedUnit) {
                setUnitInfo(mapPortfolioUnitToUnitInfo(matchedUnit));
            }
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
        fetchUnitInfo();
    }, [fetchUnitInfo]);

    const unitsPath = `/mi-portafolio/${portfolioId}/unidades`;

    const handleSuccess = () => {
        router.push(unitsPath);
    };

    const backButton = (
        <Link
            href={unitsPath}
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
                title="Publicar en arriendo"
                onMenuClick={() => { }}
                leftAction={backButton}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <PublishSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchUnitInfo} />
                        ) : (
                            <>
                                {unitInfo && (
                                    <div className="mb-[24px]">
                                        <UnitInfoHeader unit={unitInfo} />
                                    </div>
                                )}

                                {/* Info notice box */}
                                <div
                                    className="mb-[24px] rounded-[6px] border border-[#1d4ed8] bg-[#DBEAFE] p-[16px]"
                                >
                                    <p className="text-body font-semibold text-[#111827] mb-[4px]">
                                        Publicación en Explorar
                                    </p>
                                    <p className="text-caption text-[#4b5563]">
                                        Esta unidad aparecerá en la sección &quot;Explorar inmuebles&quot; donde los arrendatarios pueden buscar propiedades disponibles. Debes agregar al menos 3 fotos de calidad.
                                    </p>
                                </div>

                                <PublishForm
                                    unit={unitInfo ?? { id: unitId, name: '', propertyType: '', address: '', numberOfRooms: 0, numberOfBathrooms: 0, area: null }}
                                    onSuccess={handleSuccess}
                                />
                            </>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}

export default function PublishListingPage() {
    return (
        <LandlordRoute>
            <PublishContent />
        </LandlordRoute>
    );
}
