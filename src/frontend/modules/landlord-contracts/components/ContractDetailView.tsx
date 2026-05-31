'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@modules/users/context/AuthContext';
import { contractService } from '@/shared/services/contract';
import type { ContractSummary } from '@/shared/services/contract';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog';

interface ContractDetailViewProps {
    contractId: string;
}

export function formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CO', {
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
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [contract, setContract] = useState<ContractSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [signError, setSignError] = useState<string | null>(null);
    const [isReplacing, setIsReplacing] = useState(false);
    const [replaceError, setReplaceError] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const canReplace = contract?.status === 'PENDING';
    const tenantHasSigned = contract?.signingDetails?.some(
        (s) => s.role === 'TENANT' && s.hasSigned
    ) ?? false;
    const canDelete = contract?.status === 'PENDING' ||
        (contract?.status === 'SIGNATURE_PENDING' && !tenantHasSigned);

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
            await contractService.signContract(contractId, token);
            // Re-fetch the contract to get the updated state (SIGNATURE_PENDING)
            await fetchContract();
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

    const handleReplaceFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !contract) return;

        const token = user?.accessToken;
        if (!token) { logout(); return; }

        setIsReplacing(true);
        setReplaceError(null);

        try {
            const updated = await contractService.replaceContractFile(contract.id, file, token);
            setContract(updated);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al reemplazar el archivo';
            if (message === 'Sesión expirada') { logout(); return; }
            setReplaceError(message);
        } finally {
            setIsReplacing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteConfirm = async () => {
        const token = user?.accessToken;
        if (!token || !contract) return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            await contractService.deleteContract(contract.id, token);
            router.push('/mis-contratos');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al eliminar el contrato';
            if (message === 'Sesión expirada') { logout(); return; }
            setDeleteError(message);
            setIsDeleteDialogOpen(false);
        } finally {
            setIsDeleting(false);
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
                                {/* Page heading with status */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-h2 font-semibold text-neutral-900">
                                        Contrato
                                    </h2>
                                    <StatusBadge status={contract.status} variant="contract" />
                                </div>

                                {/* Card: Términos */}
                                <div className="border border-neutral-200 rounded-card bg-white p-4">
                                    <h3 className="text-h3 font-semibold text-neutral-900 mb-3">
                                        Términos
                                    </h3>
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
                                        <p className="text-body text-neutral-700">
                                            <span className="font-medium">Estado:</span>{' '}
                                            <StatusBadge status={contract.status} variant="contract" />
                                        </p>
                                    </div>

                                    {/* Conditional status messages */}
                                    {contract.status === 'SIGNATURE_PENDING' && (
                                        <div className="border border-blue-200 bg-blue-50 rounded-[6px] p-4 mt-3">
                                            <p className="text-body text-blue-800">
                                                Esperando firmas de las partes
                                            </p>
                                        </div>
                                    )}

                                    {contract.status === 'SIGNED' && (
                                        <div className="border border-green-200 bg-green-50 rounded-[6px] p-4 mt-3 flex flex-col gap-1">
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

                                {/* Card: Partes */}
                                <div className="border border-neutral-200 rounded-card bg-white p-4">
                                    <h3 className="text-h3 font-semibold text-neutral-900 mb-3">
                                        Partes
                                    </h3>
                                    {(contract.parties?.length ?? 0) > 0 ? (
                                        <ul className="flex flex-col gap-2">
                                            {(contract.parties ?? []).map((party) => (
                                                <li
                                                    key={party.userId}
                                                    className="flex items-center justify-between border border-neutral-300 rounded-[6px] bg-white p-3"
                                                >
                                                    <span className="text-body text-neutral-700">
                                                        {party.name || party.userId}
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

                                {/* Card: Documento */}
                                <div className="border border-neutral-200 rounded-card bg-white p-4">
                                    <h3 className="text-h3 font-semibold text-neutral-900 mb-3">
                                        Documento
                                    </h3>

                                    {/* PDF Download */}
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

                                    {/* File Actions */}
                                    <div className="flex flex-col gap-3 mt-3">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            className="hidden"
                                            onChange={handleReplaceFile}
                                        />

                                        {canReplace && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isReplacing}
                                                className="inline-flex items-center justify-center gap-2 border border-neutral-300 bg-white text-body text-neutral-900 font-medium rounded-card min-h-[44px] min-w-[44px] px-6 hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {isReplacing ? (
                                                    <>
                                                        <svg
                                                            className="animate-spin h-[18px] w-[18px]"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            aria-hidden="true"
                                                        >
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        Reemplazando...
                                                    </>
                                                ) : (
                                                    <>
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
                                                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                                        </svg>
                                                        Reemplazar documento
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {replaceError && (
                                            <p role="alert" className="text-caption text-red-600">
                                                {replaceError}
                                            </p>
                                        )}

                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setIsDeleteDialogOpen(true)}
                                                className="inline-flex items-center justify-center gap-2 border border-red-300 bg-white text-body text-red-600 font-medium rounded-card min-h-[44px] min-w-[44px] px-6 hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition-colors"
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
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    <line x1="10" y1="11" x2="10" y2="17" />
                                                    <line x1="14" y1="11" x2="14" y2="17" />
                                                </svg>
                                                Eliminar contrato
                                            </button>
                                        )}

                                        {deleteError && (
                                            <p role="alert" className="text-caption text-red-600">
                                                {deleteError}
                                            </p>
                                        )}
                                    </div>

                                    {/* Sign action */}
                                    {contract.status === 'PENDING' && (
                                        <div className="flex flex-col gap-3 mt-3">
                                            <button
                                                type="button"
                                                onClick={handleSign}
                                                disabled={isSigning}
                                                className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                                            >
                                                {isSigning ? 'Iniciando firma...' : 'Iniciar firma'}
                                            </button>
                                            {signError && (
                                                <p role="alert" className="text-caption text-red-600">
                                                    {signError}
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

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                title="Eliminar contrato"
                message="¿Estás seguro de que deseas eliminar este contrato? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setIsDeleteDialogOpen(false)}
                isLoading={isDeleting}
            />
        </>
    );
}
