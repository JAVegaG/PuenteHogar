'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@modules/users/context/AuthContext';
import { contractService } from '@/shared/services/contract';
import type { ContractSummary } from '@/shared/services/contract';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';

interface ContractDetailViewProps {
    contractId: string;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function getRoleLabel(role: string): string {
    const lower = role.toLowerCase();
    if (lower === 'landlord') return 'Arrendador';
    if (lower === 'tenant') return 'Arrendatario';
    return role;
}

function ContractDetailSkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando detalle del contrato...</span>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-5 w-44" />
        </div>
    );
}

export default function ContractDetailView({ contractId }: ContractDetailViewProps) {
    const { user, logout } = useAuth();
    const [contract, setContract] = useState<ContractSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [signError, setSignError] = useState<string | null>(null);

    const fetchContract = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await contractService.getContract(contractId, token);
            setContract(data);
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
    }, [contractId, user?.accessToken, logout]);

    useEffect(() => {
        fetchContract();
    }, [fetchContract]);

    const handleSign = async () => {
        const token = user?.accessToken;
        if (!token || !contract) return;

        setIsSigning(true);
        setSignError(null);

        try {
            const updated = await contractService.signContract(contractId, token);
            setContract(updated);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            if (message === 'Sesión expirada') {
                logout();
                return;
            }
            setSignError(message);
        } finally {
            setIsSigning(false);
        }
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
                                {/* Status */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-h2 font-semibold text-neutral-900">
                                        Contrato
                                    </h2>
                                    <StatusBadge status={contract.status} variant="contract" />
                                </div>

                                {/* Dates */}
                                <div className="flex flex-col gap-2">
                                    <p className="text-body text-neutral-700">
                                        <span className="font-medium">Fecha de inicio:</span>{' '}
                                        {formatDate(contract.startDate)}
                                    </p>
                                    {contract.endDate && (
                                        <p className="text-body text-neutral-700">
                                            <span className="font-medium">Fecha de fin:</span>{' '}
                                            {formatDate(contract.endDate)}
                                        </p>
                                    )}
                                </div>

                                {/* PDF Download */}
                                <div>
                                    <a
                                        href={contract.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-body text-primary font-medium underline min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    >
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        Descargar contrato PDF
                                    </a>
                                </div>

                                {/* Parties */}
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-h3 font-semibold text-neutral-900">
                                        Partes del contrato
                                    </h3>
                                    {contract.parties.length > 0 ? (
                                        <ul className="flex flex-col gap-2">
                                            {contract.parties.map((party) => (
                                                <li
                                                    key={party.userId}
                                                    className="flex items-center justify-between border border-neutral-300 rounded-[6px] bg-white p-3"
                                                >
                                                    <span className="text-body text-neutral-700">
                                                        {party.userId}
                                                    </span>
                                                    <span className="text-caption font-medium text-neutral-500">
                                                        {getRoleLabel(party.role)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-caption text-neutral-500">
                                            No hay partes registradas.
                                        </p>
                                    )}
                                </div>

                                {/* Conditional actions based on status */}
                                <div className="flex flex-col gap-3">
                                    {contract.status === 'PENDING' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleSign}
                                                disabled={isSigning}
                                                className="bg-primary text-white rounded-card h-[56px] px-6 min-w-[44px] min-h-[44px] text-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                                            >
                                                {isSigning ? 'Iniciando firma...' : 'Iniciar firma'}
                                            </button>
                                            {signError && (
                                                <p role="alert" className="text-caption text-red-600">
                                                    {signError}
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {contract.status === 'SIGNATURE_PENDING' && (
                                        <div className="border border-blue-200 bg-blue-50 rounded-[6px] p-4">
                                            <p className="text-body text-blue-800">
                                                Esperando firmas de las partes
                                            </p>
                                        </div>
                                    )}

                                    {contract.status === 'SIGNED' && (
                                        <div className="border border-green-200 bg-green-50 rounded-[6px] p-4 flex flex-col gap-1">
                                            <p className="text-body font-medium text-green-800">
                                                Contrato firmado
                                            </p>
                                            {contract.signedAt && (
                                                <p className="text-caption text-green-700">
                                                    Firmado el {formatDate(contract.signedAt)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>
            </main>
        </>
    );
}
