'use client';

import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@modules/users/context/AuthContext';
import { useUnreadNotificationCount } from '@shared/hooks/useUnreadNotificationCount';
import { contractService } from '@/shared/services/contract';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { LandlordContractListItem } from '@modules/landlord-contracts/types';

const SideMenu = lazy(() =>
    import('@/shared/components/SideMenu').then((m) => ({ default: m.SideMenu }))
);

function translateRole(role: string): string {
    const map: Record<string, string> = {
        LANDLORD: 'Arrendador',
        TENANT: 'Arrendatario',
    };
    return map[role] || role;
}

function ContractsListSkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando contratos...</span>
            {[1, 2, 3].map((i) => (
                <div key={i} className="border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-36" />
                </div>
            ))}
        </div>
    );
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function ContractsListView() {
    const { user, logout } = useAuth();
    const { unreadCount } = useUnreadNotificationCount();
    const [menuOpen, setMenuOpen] = useState(false);
    const [contracts, setContracts] = useState<LandlordContractListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const sideMenuUser = user
        ? { name: user.displayName, role: translateRole(user.roles[0]), roles: user.roles }
        : null;

    const fetchContracts = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await contractService.getContractsByLandlord(token);
            setContracts(data);
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
    }, [user?.accessToken, logout]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    return (
        <>
            <Header title="Mis contratos" onMenuClick={() => setMenuOpen(true)} unreadNotificationCount={unreadCount} />

            <Suspense fallback={null}>
                {menuOpen && (
                    <SideMenu
                        isOpen={menuOpen}
                        onClose={() => setMenuOpen(false)}
                        user={sideMenuUser}
                        onLogout={user ? logout : undefined}
                        unreadNotificationCount={unreadCount}
                    />
                )}
            </Suspense>

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <ContractsListSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchContracts} />
                        ) : contracts.length === 0 ? (
                            <div className="text-center py-section-gap">
                                <p className="text-h3 font-medium text-neutral-900">
                                    No tienes contratos aún
                                </p>
                                <p className="text-body text-neutral-600 mt-2">
                                    Para crear un contrato, ve a una unidad de tu portafolio, abre un arriendo y selecciona &quot;Generar contrato&quot;.
                                </p>
                                <Link
                                    href="/mi-portafolio"
                                    className="inline-flex items-center justify-center mt-4 min-h-[44px] px-4 text-body font-medium text-primary border border-primary rounded-[6px] hover:bg-primary/5 transition-colors"
                                >
                                    Ir a mi portafolio
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {contracts.map((contract) => (
                                    <Link
                                        key={contract.id}
                                        href={`/mis-contratos/${contract.id}`}
                                        className="block border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-body font-semibold text-neutral-900">
                                                {contract.unitName}
                                            </p>
                                            <StatusBadge status={contract.status} variant="contract" />
                                        </div>
                                        <p className="text-caption text-neutral-600 mt-1">
                                            {contract.tenantName}
                                        </p>
                                        <p className="text-caption text-neutral-500 mt-1">
                                            {formatDate(contract.startDate)}
                                            {contract.endDate ? ` — ${formatDate(contract.endDate)}` : ''}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
