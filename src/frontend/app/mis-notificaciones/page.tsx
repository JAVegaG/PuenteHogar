'use client';

import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import { useAuth } from '@modules/users/context/AuthContext';
import { notificationService } from '@shared/services/notification';
import type { InAppNotification } from '@shared/services/notification';
import { Header } from '@shared/components/Header';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import NotificationsListView from '@modules/notifications/components/NotificationsListView';

const SideMenu = lazy(() =>
    import('@shared/components/SideMenu').then((m) => ({ default: m.SideMenu }))
);

function translateRole(role: string): string {
    const map: Record<string, string> = {
        LANDLORD: 'Arrendador',
        TENANT: 'Arrendatario',
    };
    return map[role] || role;
}

function NotificationsListSkeleton() {
    return (
        <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Cargando notificaciones">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-neutral-300 rounded-[6px] bg-white p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-20" />
                </div>
            ))}
        </div>
    );
}

function NotificationsPageContent() {
    const { user, logout } = useAuth();
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState<number | undefined>(undefined);

    const fetchNotifications = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;
        setIsLoading(true);
        setError(false);
        try {
            const [data, countData] = await Promise.all([
                notificationService.getNotifications(token),
                notificationService.getNotificationCount(token),
            ]);
            setNotifications(data);
            setUnreadCount(countData.unreadCount);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '';
            if (message.includes('Sesión expirada')) {
                logout();
                return;
            }
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [user?.accessToken, logout]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleMarkAsRead = useCallback(async (id: string) => {
        const token = user?.accessToken;
        if (!token) return;
        try {
            await notificationService.markAsRead(id, token);
            setUnreadCount((prev) => (prev != null && prev > 0 ? prev - 1 : 0));
        } catch {
            // Silently fail — visual state already updated optimistically in NotificationsListView
        }
    }, [user?.accessToken]);

    const handleMarkAllAsRead = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;
        try {
            await notificationService.markAllAsRead(token);
            setUnreadCount(0);
        } catch {
            // Silently fail — visual state already updated optimistically in NotificationsListView
        }
    }, [user?.accessToken]);

    const sideMenuUser = user
        ? { name: user.displayName, role: translateRole(user.roles[0]), roles: user.roles }
        : null;

    return (
        <>
            <Header
                title="Mis notificaciones"
                onMenuClick={() => setIsSideMenuOpen(true)}
            />

            <Suspense fallback={null}>
                {isSideMenuOpen && (
                    <SideMenu
                        isOpen={isSideMenuOpen}
                        onClose={() => setIsSideMenuOpen(false)}
                        user={sideMenuUser}
                        onLogout={logout}
                        unreadNotificationCount={unreadCount}
                    />
                )}
            </Suspense>

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    {isLoading && <NotificationsListSkeleton />}

                    {!isLoading && error && <ErrorState onRetry={fetchNotifications} />}

                    {!isLoading && !error && (
                        <NotificationsListView
                            notifications={notifications}
                            onMarkAsRead={handleMarkAsRead}
                            onMarkAllAsRead={handleMarkAllAsRead}
                        />
                    )}
                </div>
            </main>
        </>
    );
}

export default function NotificationsPage() {
    return (
        <ProtectedRoute>
            <NotificationsPageContent />
        </ProtectedRoute>
    );
}
