'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import UnitDetailView from '@modules/landlord-portfolio/components/UnitDetailView';
import { useAuth } from '@modules/users/context/AuthContext';
import { portfolioService } from '@/shared/services/portfolio';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import type { PortfolioUnit } from '@modules/landlord-portfolio/types';

function UnitDetailContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const portfolioId = params.id as string;
    const unitId = params.unitId as string;
    const { user, logout } = useAuth();
    const [unit, setUnit] = useState<PortfolioUnit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (searchParams.get('cancelado') === '1') {
            setSuccessMessage('El arriendo fue cancelado exitosamente.');
        }
    }, [searchParams]);

    const fetchUnit = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);
        setNotFound(false);

        try {
            const units = await portfolioService.getUnits(portfolioId, token);
            const found = units.find((u) => u.id === unitId);
            if (!found) {
                setNotFound(true);
            } else {
                setUnit(found);
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
        fetchUnit();
    }, [fetchUnit]);

    const backArrow = (
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
                title="Detalle de unidad"
                onMenuClick={() => { }}
                leftAction={backArrow}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    {successMessage && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="mb-[16px] p-3 rounded-[6px] text-caption"
                            style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
                        >
                            {successMessage}
                        </div>
                    )}

                    {isLoading && (
                        <div aria-busy="true" aria-live="polite">
                            <section aria-label="Cargando detalle de unidad">
                                <div className="flex items-baseline gap-2">
                                    <Skeleton className="h-8 w-48" />
                                    <Skeleton className="h-6 w-12" />
                                </div>
                                <div className="mt-6">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-5 w-full mt-2" />
                                </div>
                                <div className="mt-6">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-5 w-56 mt-2" />
                                    <Skeleton className="h-5 w-56 mt-1" />
                                </div>
                                <Skeleton className="h-[48px] w-full mt-6 rounded-[10px]" />
                            </section>
                        </div>
                    )}

                    {!isLoading && notFound && (
                        <div className="text-center py-section-gap" aria-live="polite">
                            <p className="text-body font-medium text-neutral-900">
                                Unidad de portafolio no encontrada
                            </p>
                            <Link
                                href={`/mi-portafolio/${portfolioId}/unidades`}
                                className="mt-4 inline-flex items-center text-primary underline hover:text-primary/80 min-h-[44px] min-w-[44px]"
                            >
                                Volver a unidades del portafolio
                            </Link>
                        </div>
                    )}

                    {!isLoading && error && !notFound && (
                        <ErrorState onRetry={fetchUnit} />
                    )}

                    {!isLoading && !error && !notFound && unit && user?.accessToken && (
                        <UnitDetailView unit={unit} token={user.accessToken} />
                    )}
                </div>
            </main>
        </>
    );
}

export default function UnitDetailPage() {
    return (
        <LandlordRoute>
            <UnitDetailContent />
        </LandlordRoute>
    );
}
