'use client';

import { useState } from 'react';
import Link from 'next/link';
import { translateNotificationType } from '../utils/translate-notification-type';
import type { InAppNotification } from '@/shared/services/notification';

interface NotificationsListViewProps {
    notifications: InAppNotification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onDelete?: (id: string) => Promise<void>;
    onDeleteRead?: () => Promise<void>;
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

function TrashIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    );
}

/**
 * Parses **bold** markers in notification messages and renders them as
 * <strong> elements with a distinct color so dynamic names (property, unit)
 * stand out visually from the surrounding text.
 */
function renderMessageWithBold(message: string): React.ReactNode {
    const parts = message.split(/\*\*(.+?)\*\*/g);
    if (parts.length === 1) return message;

    return parts.map((part, i) =>
        i % 2 === 1 ? (
            <strong key={i} className="font-semibold text-neutral-900">{part}</strong>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}

export default function NotificationsListView({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onDeleteRead,
}: NotificationsListViewProps) {
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeletingRead, setIsDeletingRead] = useState(false);

    const visibleNotifications = notifications.filter((n) => !removedIds.has(n.id));

    const hasUnread = visibleNotifications.some(
        (n) => !n.read && !readIds.has(n.id)
    );

    const hasRead = visibleNotifications.some(
        (n) => n.read || readIds.has(n.id)
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
        visibleNotifications.forEach((n) => {
            if (!n.read) newReadIds.add(n.id);
        });
        setReadIds(newReadIds);
        onMarkAllAsRead();
    }

    async function handleDelete(e: React.MouseEvent | React.KeyboardEvent, notificationId: string) {
        e.stopPropagation();
        if (!onDelete) return;

        setDeleteError(null);
        setRemovedIds((prev) => new Set(prev).add(notificationId));

        try {
            await onDelete(notificationId);
        } catch {
            setRemovedIds((prev) => {
                const next = new Set(prev);
                next.delete(notificationId);
                return next;
            });
            setDeleteError('No se pudo eliminar la notificación. Intenta de nuevo.');
        }
    }

    async function handleDeleteRead() {
        if (!onDeleteRead) return;
        setDeleteError(null);
        setIsDeletingRead(true);

        // Optimistically remove read notifications
        const readNotificationIds = visibleNotifications
            .filter((n) => n.read || readIds.has(n.id))
            .map((n) => n.id);
        setRemovedIds((prev) => {
            const next = new Set(prev);
            readNotificationIds.forEach((id) => next.add(id));
            return next;
        });

        try {
            await onDeleteRead();
        } catch {
            // Restore on failure
            setRemovedIds((prev) => {
                const next = new Set(prev);
                readNotificationIds.forEach((id) => next.delete(id));
                return next;
            });
            setDeleteError('No se pudieron eliminar las notificaciones leídas. Intenta de nuevo.');
        } finally {
            setIsDeletingRead(false);
        }
    }

    if (visibleNotifications.length === 0) {
        return (
            <div className="flex flex-col items-center gap-6 py-section-gap" role="status" aria-live="polite">
                <p className="text-h3 font-medium text-neutral-900">
                    No tienes notificaciones aún
                </p>
                <Link
                    href="/mis-notificaciones/preferencias"
                    className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    Gestionar preferencias
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <Link
                    href="/mis-notificaciones/preferencias"
                    className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    Gestionar preferencias
                </Link>
                {hasUnread && (
                    <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="min-h-[44px] min-w-[44px] px-2 text-body font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px]"
                    >
                        Marcar todas como leídas
                    </button>
                )}
                {hasRead && onDeleteRead && (
                    <button
                        type="button"
                        onClick={handleDeleteRead}
                        disabled={isDeletingRead}
                        className="min-h-[44px] min-w-[44px] px-2 text-body font-medium text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px] disabled:opacity-50"
                    >
                        Eliminar leídas
                    </button>
                )}
            </div>

            {deleteError && (
                <div role="alert" className="text-caption text-red-600 bg-red-50 border border-red-200 rounded-[6px] p-3">
                    {deleteError}
                </div>
            )}

            <div className="flex flex-col gap-4" role="list">
                {visibleNotifications.map((notification) => {
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
                            className={`relative border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4 pr-14 min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors ${isUnread ? 'border-l-4 border-l-primary' : ''
                                }`}
                        >
                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={(e) => handleDelete(e, notification.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleDelete(e, notification.id);
                                        }
                                    }}
                                    aria-label={`Eliminar notificación: ${notification.title}`}
                                    className="absolute top-2 right-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px] transition-colors"
                                >
                                    <TrashIcon />
                                </button>
                            )}
                            <p className="text-small text-primary font-medium">
                                {translateNotificationType(notification.notificationType)}
                            </p>
                            <p className={`text-body text-neutral-900 mt-1 ${isUnread ? 'font-bold' : 'font-normal'}`}>
                                {notification.title}
                            </p>
                            <p className="text-caption text-neutral-600 mt-1">
                                {renderMessageWithBold(notification.message)}
                            </p>
                            {notification.notificationType === 'NEW_INTEREST' &&
                                (notification.data?.tenantEmail || notification.data?.tenantPhone) && (
                                    <div className="flex flex-col gap-1 mt-2 text-caption text-neutral-600">
                                        {notification.data.tenantEmail && (
                                            <a
                                                href={`mailto:${String(notification.data.tenantEmail)}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                </svg>
                                                {String(notification.data.tenantEmail)}
                                            </a>
                                        )}
                                        {notification.data.tenantPhone && (
                                            <a
                                                href={`tel:${String(notification.data.tenantPhone)}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                                </svg>
                                                {String(notification.data.tenantPhone)}
                                            </a>
                                        )}
                                    </div>
                                )}
                            <p className="text-small text-neutral-600 mt-2">
                                {formatRelativeDate(notification.createdAt)}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
