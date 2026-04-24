'use client';

import { useState } from 'react';
import Link from 'next/link';
import { translateNotificationType } from '../utils/translate-notification-type';
import type { InAppNotification } from '@/shared/services/notification';

interface NotificationsListViewProps {
    notifications: InAppNotification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
}

function formatRelativeDate(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'hace un momento';
    if (diffMinutes < 60) return `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays < 30) return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;

    return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function NotificationsListView({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
}: NotificationsListViewProps) {
    const [readIds, setReadIds] = useState<Set<string>>(new Set());

    const hasUnread = notifications.some(
        (n) => !n.read && !readIds.has(n.id)
    );

    function handleCardClick(notification: InAppNotification) {
        const isUnread = !notification.read && !readIds.has(notification.id);
        if (isUnread) {
            setReadIds((prev) => new Set(prev).add(notification.id));
            onMarkAsRead(notification.id);
        }
    }

    function handleMarkAllAsRead() {
        const newReadIds = new Set(readIds);
        notifications.forEach((n) => {
            if (!n.read) newReadIds.add(n.id);
        });
        setReadIds(newReadIds);
        onMarkAllAsRead();
    }

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col gap-6">
                <div className="text-center py-section-gap" role="status" aria-live="polite">
                    <p className="text-h3 font-medium text-neutral-900">
                        No tienes notificaciones aún
                    </p>
                </div>
                <div className="text-center">
                    <Link
                        href="/mis-notificaciones/preferencias"
                        className="inline-flex items-center justify-center min-h-[44px] px-4 text-body font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px]"
                    >
                        Gestionar preferencias
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {hasUnread && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="min-h-[44px] min-w-[44px] px-4 text-body font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px]"
                    >
                        Marcar todas como leídas
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-4" role="list">
                {notifications.map((notification) => {
                    const isUnread = !notification.read && !readIds.has(notification.id);

                    return (
                        <div
                            key={notification.id}
                            role="listitem"
                            tabIndex={0}
                            onClick={() => handleCardClick(notification)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleCardClick(notification);
                                }
                            }}
                            className={`border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4 min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors ${isUnread ? 'border-l-4 border-l-primary' : ''
                                }`}
                        >
                            <p className="text-small text-primary font-medium">
                                {translateNotificationType(notification.notificationType)}
                            </p>
                            <p className={`text-body text-neutral-900 mt-1 ${isUnread ? 'font-bold' : 'font-normal'}`}>
                                {notification.title}
                            </p>
                            <p className="text-caption text-neutral-600 mt-1">
                                {notification.message}
                            </p>
                            <p className="text-small text-neutral-600 mt-2">
                                {formatRelativeDate(notification.createdAt)}
                            </p>
                        </div>
                    );
                })}
            </div>

            <div className="text-center">
                <Link
                    href="/mis-notificaciones/preferencias"
                    className="inline-flex items-center justify-center min-h-[44px] px-4 text-body font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px]"
                >
                    Gestionar preferencias
                </Link>
            </div>
        </div>
    );
}
