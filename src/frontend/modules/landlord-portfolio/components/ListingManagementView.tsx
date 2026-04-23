'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@modules/users/context/AuthContext';
import { fetchListingByUnit, unpublishListing } from '@/shared/services/api';
import { Header } from '@/shared/components/Header';
import type { ListingResponse } from '@modules/property-listings/types';

interface ListingManagementViewProps {
    portfolioId: string;
    unitId: string;
}

/** Format a number as COP display: 1200000 → "$1.200.000" */
function formatCOP(amount: number): string {
    const digits = String(Math.round(amount));
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
}

function formatSpanishDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function ListingManagementView({ portfolioId, unitId }: ListingManagementViewProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [listing, setListing] = useState<ListingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isUnpublishing, setIsUnpublishing] = useState(false);

    const unitPath = `/mi-portafolio/${portfolioId}/unidades/${unitId}`;

    const fetchListing = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);
        setNotFound(false);

        try {
            const data = await fetchListingByUnit(unitId, token);
            setListing(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            if (message === 'Sesión expirada') {
                logout();
                return;
            }
            if (message === 'NOT_FOUND') {
                setNotFound(true);
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [unitId, user?.accessToken, logout]);

    useEffect(() => {
        fetchListing();
    }, [fetchListing]);

    const handleUnpublish = async () => {
        const token = user?.accessToken;
        if (!token || !listing) return;

        setIsUnpublishing(true);
        try {
            await unpublishListing(listing.id, token);
            router.push(`/mi-portafolio/${portfolioId}/unidades`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            if (message === 'Sesión expirada') {
                logout();
                return;
            }
            setError(message);
            setShowConfirm(false);
        } finally {
            setIsUnpublishing(false);
        }
    };

    const backButton = (
        <Link
            href={unitPath}
            aria-label="Volver a detalle de unidad"
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
                title="Gestionar publicación"
                onMenuClick={() => { }}
                leftAction={backButton}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    {isLoading && (
                        <div className="flex items-center justify-center py-section-gap" aria-busy="true" aria-live="polite">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-primary" role="status">
                                <span className="sr-only">Cargando publicación...</span>
                            </div>
                        </div>
                    )}

                    {!isLoading && notFound && (
                        <div className="text-center py-section-gap" aria-live="polite">
                            <p className="text-h3 font-medium text-neutral-900">
                                No hay publicación activa
                            </p>
                            <p className="text-body text-neutral-600 mt-2">
                                Esta unidad no tiene una publicación activa en este momento.
                            </p>
                            <Link
                                href={`/mi-portafolio/${portfolioId}/unidades/${unitId}/publicar`}
                                className="mt-4 inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-body text-primary underline hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                Publicar en arriendo
                            </Link>
                        </div>
                    )}

                    {!isLoading && error && !notFound && (
                        <div role="alert" className="text-center py-section-gap">
                            <p className="text-h3 font-medium text-neutral-900">No pudimos cargar la información.</p>
                            <p className="text-body text-neutral-600 mt-2">Intenta de nuevo.</p>
                            <button
                                onClick={fetchListing}
                                className="mt-4 bg-primary text-white rounded-card h-[56px] px-6 min-w-[44px] min-h-[44px] text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && !notFound && listing && (
                        <>
                            {/* Photo gallery */}
                            {listing.photos.length > 0 && (
                                <section aria-label="Fotos de la publicación" className="mb-6">
                                    <div className="grid grid-cols-2 gap-2">
                                        {listing.photos.map((photo, index) => (
                                            <div
                                                key={photo.id}
                                                className={`relative overflow-hidden rounded-[8px] ${index === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'}`}
                                            >
                                                <img
                                                    src={photo.fileUrl}
                                                    alt={`Foto ${index + 1} de ${listing.title}`}
                                                    className="w-full h-full object-cover"
                                                    loading={index === 0 ? 'eager' : 'lazy'}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Listing details */}
                            <section aria-label="Detalles de la publicación">
                                <h2 className="text-h2 font-bold text-neutral-900">{listing.title}</h2>

                                <p className="text-h3 font-semibold text-primary mt-2">
                                    {formatCOP(listing.price)}/mes
                                </p>

                                {listing.description && (
                                    <div className="mt-4">
                                        <h3 className="text-h3 font-semibold text-neutral-900">Descripción</h3>
                                        <p className="text-body text-neutral-600 mt-1 whitespace-pre-line">{listing.description}</p>
                                    </div>
                                )}

                                <p className="text-caption text-neutral-500 mt-4">
                                    Publicado el {formatSpanishDate(listing.listingDate)}
                                </p>
                            </section>

                            {/* Action buttons */}
                            <div className="mt-6 flex flex-col gap-3">
                                <Link
                                    href={`/mi-portafolio/${portfolioId}/unidades/${unitId}/publicacion/editar`}
                                    className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] text-body font-medium bg-primary text-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-primary-600 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
                                >
                                    Editar publicación
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(true)}
                                    className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] text-body font-medium border border-red-600 text-red-600 hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition-colors"
                                >
                                    Despublicar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Confirmation dialog */}
            {showConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-title"
                >
                    <div className="bg-white rounded-[12px] p-6 mx-4 w-full max-w-[400px] shadow-lg">
                        <h2 id="confirm-title" className="text-h3 font-semibold text-neutral-900">
                            ¿Estás seguro?
                        </h2>
                        <p className="text-body text-neutral-600 mt-2">
                            La publicación será removida de la sección &quot;Explorar inmuebles&quot; y los arrendatarios ya no podrán verla.
                        </p>
                        <div className="mt-6 flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={handleUnpublish}
                                disabled={isUnpublishing}
                                className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] text-body font-medium bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition-colors disabled:opacity-50"
                            >
                                {isUnpublishing ? 'Despublicando...' : 'Confirmar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                disabled={isUnpublishing}
                                className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] text-body font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
