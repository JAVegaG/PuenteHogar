'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import { useAuth } from '@modules/users/context/AuthContext';
import { notificationService } from '@shared/services/notification';
import type { NotificationPreferenceGroup } from '@shared/services/notification';
import { Header } from '@shared/components/Header';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import PreferencesView from '@modules/notifications/components/PreferencesView';

function PreferencesSkeleton() {
    return (
        <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Cargando preferencias">
            {/* Info banner skeleton */}
            <Skeleton className="h-12 w-full" />

            {/* Preference sections skeleton */}
            {[1, 2, 3].map((i) => (
                <div key={i} className="border border-neutral-300 rounded-[6px] bg-white p-4">
                    <Skeleton className="h-5 w-40 mb-4" />
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between min-h-[44px]">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-[28px] w-[52px] rounded-full" />
                        </div>
                        <div className="flex items-center justify-between min-h-[44px]">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-[28px] w-[52px] rounded-full" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PreferencesPageContent() {
    const { user, logout } = useAuth();
    const [preferences, setPreferences] = useState<NotificationPreferenceGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchPreferences = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;
        setIsLoading(true);
        setError(false);
        try {
            const data = await notificationService.getPreferences(token);
            setPreferences(data);
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
        fetchPreferences();
    }, [fetchPreferences]);

    const handleToggle = useCallback(async (notificationTypeName: string, channel: string, isActive: boolean) => {
        const token = user?.accessToken;
        if (!token) return;
        await notificationService.updatePreference({ notificationTypeName, channel, isActive }, token);
    }, [user?.accessToken]);

    const backArrow = (
        <Link
            href="/mis-notificaciones"
            aria-label="Volver a mis notificaciones"
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
                title="Preferencias de notificación"
                onMenuClick={() => { }}
                leftAction={backArrow}
            />

            <main className="px-mobile-margin md:px-desktop-margin py-section-gap">
                {isLoading && <PreferencesSkeleton />}

                {!isLoading && error && <ErrorState onRetry={fetchPreferences} />}

                {!isLoading && !error && (
                    <PreferencesView
                        preferences={preferences}
                        onToggle={handleToggle}
                    />
                )}
            </main>
        </>
    );
}

export default function PreferencesPage() {
    return (
        <ProtectedRoute>
            <PreferencesPageContent />
        </ProtectedRoute>
    );
}
