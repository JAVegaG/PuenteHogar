'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@modules/users/context/AuthContext';
import { contractService } from '@/shared/services/contract';
import type { ContractSummary } from '@/shared/services/contract';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';

const ROLE_LABELS: Record<string, string> = {
    LANDLORD: 'Arrendador',
    TENANT: 'Arrendatario',
};

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function ContractDetailSkeleton() {
    return (
        <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando detalle del contrato...</span>
            <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-4 w-40" />
            </div>
            <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                <Skeleton className="h-5 w-28 mb-3" />
                <Skeleton className="h-4 w-44 mb-2" />
                <Skeleton className="h-4 w-44" />
            </div>
            <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                <Skeleton className="h-5 w-36 mb-3" />
                <Skeleton className="h-10 w-40" />
            </div>
        </div>
    );
}

export default function TenantContractDetailView() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [contract, setContract] = useState<ContractSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [forbidden, setForbidden] = useState(false);

    const fetchContract = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);
        setForbidden(false);

        try {
            const data = await contractService.getContract(id, token);
            setContract(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            if (message === 'No tienes permiso para realizar esta acción') {
                setForbidden(true);
                return;
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [id, user?.accessToken]);

    useEffect(() => {
        fetchContract();
    }, [fetchContract]);

    const backArrow = (
        <Link
            href="/mis-contratos-arrendatario"
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

    if (forbidden) {
        return (
            <>
                <Header
                    title="Detalle del contrato"
                    onMenuClick={() => { }}
                    leftAction={backArrow}
                />
                <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                    <div className="w-full max-w-[560px]">
                        <div className="text-center py-section-gap" role="alert">
                            <p className="text-h3 font-medium text-neutral-900">
                                No tienes permiso para ver este contrato
                            </p>
                            <p className="text-body text-neutral-600 mt-2">
                                No estás autorizado para acceder a este recurso.
                            </p>
                            <Link
                                href="/mis-contratos-arrendatario"
                                className="mt-4 inline-flex items-center text-primary underline hover:text-primary/80 min-h-[44px] min-w-[44px]"
                            >
                                Volver a mis contratos
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
                title="Detalle del contrato"
                onMenuClick={() => { }}
                leftAction={backArrow}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <ContractDetailSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchContract} />
                        ) : contract ? (
                            <div className="flex flex-col gap-6">
                                {/* Status and dates */}
                                <section aria-label="Estado del contrato">
                                    <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                        Estado
                                    </h2>
                                    <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                                        <StatusBadge status={contract.status} variant="contract" />
                                        <p className="text-body text-neutral-700 mt-3">
                                            {formatDate(contract.startDate)}
                                            {contract.endDate ? ` — ${formatDate(contract.endDate)}` : ''}
                                        </p>
                                        {contract.status === 'SIGNATURE_PENDING' && (
                                            <p className="text-body text-blue-700 mt-3" role="status">
                                                El contrato está en proceso de firma
                                            </p>
                                        )}
                                        {contract.status === 'SIGNED' && (
                                            <p className="text-body text-green-700 mt-3" role="status">
                                                El contrato ha sido firmado por todas las partes
                                            </p>
                                        )}
                                    </div>
                                </section>

                                {/* Parties */}
                                {contract.parties && contract.parties.length > 0 && (
                                    <section aria-label="Partes del contrato">
                                        <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                            Partes
                                        </h2>
                                        <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                                            <ul className="flex flex-col gap-3">
                                                {contract.parties.map((party) => (
                                                    <li key={party.userId} className="flex items-center gap-2">
                                                        <span className="text-caption font-medium" style={{ color: '#4b5563' }}>
                                                            {ROLE_LABELS[party.role] ?? party.role}
                                                        </span>
                                                        <span className="text-body text-neutral-900">
                                                            {party.userId}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </section>
                                )}

                                {/* Document link */}
                                {contract.fileUrl && (
                                    <section aria-label="Documento del contrato">
                                        <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                            Documento
                                        </h2>
                                        <div className="border border-neutral-300 rounded-[6px] bg-white p-4">
                                            <a
                                                href={contract.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-primary underline hover:text-primary/80 text-body min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            >
                                                Ver documento
                                            </a>
                                        </div>
                                    </section>
                                )}
                            </div>
                        ) : null}
                    </section>
                </div>
            </main>
        </>
    );
}
