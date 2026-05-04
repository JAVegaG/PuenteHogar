'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@modules/users/context/AuthContext';
import { notificationService } from '@shared/services/notification';

export function useUnreadNotificationCount(refreshKey?: number): { unreadCount: number | undefined } {
    const { user, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState<number | undefined>(undefined);

    useEffect(() => {
        const token = user?.accessToken;
        if (!token) {
            setUnreadCount(undefined);
            return;
        }

        let cancelled = false;

        async function fetchCount() {
            try {
                const data = await notificationService.getNotificationCount(token!);
                if (!cancelled) {
                    setUnreadCount(data.unreadCount);
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : '';
                if (message.includes('Sesión expirada')) {
                    logout();
                    return;
                }
                if (!cancelled) {
                    setUnreadCount(undefined);
                }
            }
        }

        fetchCount();

        return () => {
            cancelled = true;
        };
    }, [user?.accessToken, logout, refreshKey]);

    return { unreadCount };
}
