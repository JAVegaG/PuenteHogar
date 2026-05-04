'use client';

import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@modules/users/context/AuthContext';
import { useUnreadNotificationCount } from '@shared/hooks/useUnreadNotificationCount';
import { tenantService } from '@/shared/services/tenant';
import type { TenantContractListItem } from '@/shared/services/tenant';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';

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

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function TenantContractsListSkeleton() {
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

export default function TenantContractsListView() {
    const { user, logout } = useAuth();
    const { unreadCount } = useUnreadNotificationCount();
    const [menuOpen, setMenuOpen] = useState(false);
    const [contracts, setContracts] = useState<TenantContractListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const roles = user?.roles ?? [];
    const hasTenantRole = roles.includes('TENANT');

    const sideMenuUser = user
        ? { name: user.displayName, role: translateRole(roles[0]), roles }
        : null;

    const fetchContracts = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await tenantService.getTenantContracts(token);
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
        if (hasTenantRole) {
            fetchContracts();
        } else {
            setIsLoading(false);
        }
    }, [hasTenantRole, fetchContracts]);

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
                    {!hasTenantRole ? (
                        <div className="text-center py-section-gap" role="alert">
                            <p className="text-h3 font-medium text-neutral-900">
                                No tienes permisos para ver esta página
                            </p>
                            <p className="text-body text-neutral-600 mt-2">
                                Esta sección es exclusiva para arrendatarios.
                            </p>
                        </div>
                    ) : (
                        <section aria-live="polite" aria-busy={isLoading}>
                            {isLoading ? (
                                <TenantContractsListSkeleton />
                            ) : error ? (
                                <ErrorState onRetry={fetchContracts} />
                            ) : contracts.length === 0 ? (
                                <div className="text-center py-section-gap">
                                    <p className="text-h3 font-medium text-neutral-900">
                                        No tienes contratos asociados
                                    </p>
                                    <p className="text-body text-neutral-600 mt-2">
                                        Cuando un arrendador genere un contrato para uno de tus arriendos, aparecerá aquí.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {contracts.map((contract) => (
                                        <Link
                                            key={contract.id}
                                            href={`/mis-contratos-arrendatario/${contract.id}`}
                                            className="block border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-h3 font-semibold text-neutral-900">
                                                    {contract.unitName}
                                                </h3>
                                                <StatusBadge status={contract.status} variant="contract" />
                                            </div>
                                            <p className="text-caption mt-1" style={{ color: '#4b5563' }}>
                                                {contract.landlordName}
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
                    )}
                </div>
            </main>
        </>
    );
}
