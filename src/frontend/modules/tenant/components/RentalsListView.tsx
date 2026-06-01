'use client';

import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@modules/users/context/AuthContext';
import { useUnreadNotificationCount } from '@shared/hooks/useUnreadNotificationCount';
import { tenantService } from '@/shared/services/tenant';
import type { ActiveLeaseSummary } from '@/shared/services/tenant';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { translateRole } from '@/shared/utils/statusMaps';

const SideMenu = lazy(() =>
    import('@/shared/components/SideMenu').then((m) => ({ default: m.SideMenu }))
);

function getRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = then - now;
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

    if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, 'day');
    if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, 'hour');
    if (Math.abs(diffMinutes) >= 1) return rtf.format(diffMinutes, 'minute');
    return rtf.format(diffSeconds, 'second');
}

function RentalsListSkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando arriendos...</span>
            {[1, 2, 3].map((i) => (
                <div key={i} className="border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
            ))}
        </div>
    );
}

export default function RentalsListView() {
    const { user, logout } = useAuth();
    const { unreadCount } = useUnreadNotificationCount();
    const [menuOpen, setMenuOpen] = useState(false);
    const [leases, setLeases] = useState<ActiveLeaseSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const roles = user?.roles ?? [];
    const hasTenantRole = roles.includes('TENANT');

    const sideMenuUser = user
        ? { name: user.displayName, role: translateRole(roles[0]), roles }
        : null;

    const fetchLeases = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await tenantService.getActiveLeases(token);
            setLeases(data);
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
            fetchLeases();
        } else {
            setIsLoading(false);
        }
    }, [hasTenantRole, fetchLeases]);

    return (
        <>
            <Header title="Mis arriendos" onMenuClick={() => setMenuOpen(true)} unreadNotificationCount={unreadCount} />

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
                                <RentalsListSkeleton />
                            ) : error ? (
                                <ErrorState onRetry={fetchLeases} />
                            ) : leases.length === 0 ? (
                                <div className="text-center py-section-gap">
                                    <p className="text-h3 font-medium text-neutral-900">
                                        No tienes arriendos activos
                                    </p>
                                    <p className="text-body text-neutral-600 mt-2">
                                        Explora inmuebles disponibles para encontrar tu próximo hogar.
                                    </p>
                                    <Link
                                        href="/explorar"
                                        className="inline-flex items-center justify-center mt-4 min-h-[44px] px-4 text-body font-medium text-primary border border-primary rounded-[6px] hover:bg-primary/5 transition-colors"
                                    >
                                        Explorar inmuebles
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {leases.map((lease) => (
                                        <Link
                                            key={lease.leaseId}
                                            href={`/mis-arriendos/${lease.leaseId}`}
                                            className="block border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-h3 font-semibold text-neutral-900">
                                                    {lease.propertyName}
                                                </h3>
                                                <StatusBadge status={lease.currentState} variant="tracking" />
                                            </div>
                                            <p className="text-caption text-neutral-500 mt-1">
                                                {getRelativeTime(lease.lastChangedAt)}
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
