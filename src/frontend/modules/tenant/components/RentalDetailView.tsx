'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@modules/users/context/AuthContext';
import { tenantService } from '@/shared/services/tenant';
import type { LeaseStatusResponse } from '@/shared/services/tenant';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';

const LIFECYCLE_STEPS = [
    'PUBLISHED',
    'CONTACT_INITIATED',
    'CONTRACT_UPLOADED',
    'CONTRACT_SIGNED',
    'PAYMENT_RECEIVED',
] as const;

const STATE_LABELS: Record<string, string> = {
    PUBLISHED: 'Publicado',
    CONTACT_INITIATED: 'Contacto iniciado',
    CONTRACT_UPLOADED: 'Contrato cargado',
    CONTRACT_SIGNED: 'Contrato firmado',
    PAYMENT_RECEIVED: 'Pago recibido',
};

export interface TimelineStep {
    state: string;
    label: string;
    classification: 'completed' | 'current' | 'pending';
}

export function classifyTimelineSteps(currentState: string): TimelineStep[] {
    const currentIndex = LIFECYCLE_STEPS.indexOf(currentState as typeof LIFECYCLE_STEPS[number]);

    return LIFECYCLE_STEPS.map((state, index) => {
        let classification: 'completed' | 'current' | 'pending';
        if (currentIndex < 0) {
            classification = 'pending';
        } else if (index < currentIndex) {
            classification = 'completed';
        } else if (index === currentIndex) {
            classification = 'current';
        } else {
            classification = 'pending';
        }

        return {
            state,
            label: STATE_LABELS[state] ?? state,
            classification,
        };
    });
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function RentalDetailSkeleton() {
    return (
        <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando detalle del arriendo...</span>
            <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                <Skeleton className="h-5 w-40 mb-4" />
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 mb-3">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                ))}
            </div>
            <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                <Skeleton className="h-5 w-24 mb-4" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="mb-3">
                        <Skeleton className="h-4 w-36 mb-1" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function RentalDetailView() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [data, setData] = useState<LeaseStatusResponse | null>(null);
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
            const result = await tenantService.getLeaseStatus(id, token);
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

    const steps = data ? classifyTimelineSteps(data.currentState) : [];
    const sortedHistory = data
        ? [...data.history].sort(
            (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
        )
        : [];

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
                                {/* Current state section */}
                                <section aria-label="Estado actual">
                                    <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                        Estado actual
                                    </h2>
                                    <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={data.currentState} variant="tracking" />
                                        </div>
                                        <p className="text-caption text-neutral-500 mt-2">
                                            Último cambio: {formatDate(data.lastChangedAt)}
                                        </p>
                                    </div>
                                </section>

                                {/* Progress timeline section */}
                                <section aria-label="Progreso del arriendo">
                                    <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                        Progreso del arriendo
                                    </h2>
                                    <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                                        <ol className="relative flex flex-col gap-0">
                                            {steps.map((step, index) => {
                                                const isLast = index === steps.length - 1;
                                                const dotColor =
                                                    step.classification === 'pending'
                                                        ? '#d1d5db'
                                                        : '#1d4ed8';
                                                const lineColor =
                                                    step.classification === 'completed'
                                                        ? '#1d4ed8'
                                                        : '#d1d5db';

                                                return (
                                                    <li
                                                        key={step.state}
                                                        className="relative flex items-start gap-3 pb-6 last:pb-0"
                                                        aria-label={`${step.label}: ${step.classification === 'completed' ? 'completado' : step.classification === 'current' ? 'actual' : 'pendiente'}`}
                                                        aria-current={step.classification === 'current' ? 'step' : undefined}
                                                    >
                                                        {/* Vertical line */}
                                                        {!isLast && (
                                                            <div
                                                                className="absolute left-[11px] top-[24px] w-[2px] h-[calc(100%-12px)]"
                                                                style={{ backgroundColor: lineColor }}
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        {/* Dot */}
                                                        <div
                                                            className="relative z-10 flex-shrink-0 w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center"
                                                            style={{
                                                                borderColor: dotColor,
                                                                backgroundColor:
                                                                    step.classification !== 'pending'
                                                                        ? dotColor
                                                                        : 'white',
                                                            }}
                                                            aria-hidden="true"
                                                        >
                                                            {step.classification !== 'pending' && (
                                                                <svg
                                                                    width="12"
                                                                    height="12"
                                                                    viewBox="0 0 12 12"
                                                                    fill="none"
                                                                    aria-hidden="true"
                                                                >
                                                                    <path
                                                                        d="M2 6L5 9L10 3"
                                                                        stroke="white"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        {/* Label */}
                                                        <span
                                                            className={`text-body ${step.classification === 'current'
                                                                    ? 'font-semibold text-[#1d4ed8]'
                                                                    : step.classification === 'completed'
                                                                        ? 'font-medium text-neutral-900'
                                                                        : 'text-neutral-400'
                                                                }`}
                                                        >
                                                            {step.label}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    </div>
                                </section>

                                {/* History section */}
                                <section aria-label="Historial de estados">
                                    <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                        Historial
                                    </h2>
                                    <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                                        {sortedHistory.length === 0 ? (
                                            <p className="text-body text-neutral-500">
                                                No hay historial disponible.
                                            </p>
                                        ) : (
                                            <ul className="flex flex-col gap-4">
                                                {sortedHistory.map((entry) => (
                                                    <li key={entry.id}>
                                                        <p className="text-body font-medium text-neutral-900">
                                                            {STATE_LABELS[entry.state] ?? entry.state}
                                                        </p>
                                                        <p className="text-caption text-neutral-500">
                                                            {formatDate(entry.recordedAt)}
                                                        </p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </section>
                            </div>
                        ) : null}
                    </section>
                </div>
            </main>
        </>
    );
}
