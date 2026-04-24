'use client';

import { useState } from 'react';
import { translateNotificationType } from '../utils/translate-notification-type';
import type { NotificationPreferenceGroup } from '@/shared/services/notification';

interface PreferencesViewProps {
    preferences: NotificationPreferenceGroup[];
    onToggle: (notificationTypeName: string, channel: string, isActive: boolean) => Promise<void>;
}

export default function PreferencesView({ preferences, onToggle }: PreferencesViewProps) {
    const [localPreferences, setLocalPreferences] = useState<NotificationPreferenceGroup[]>(preferences);
    const [error, setError] = useState<string | null>(null);

    async function handleToggle(notificationTypeName: string, channel: string, currentIsActive: boolean) {
        const newIsActive = !currentIsActive;

        // Optimistic update
        setLocalPreferences((prev) =>
            prev.map((group) => {
                if (group.notificationTypeName !== notificationTypeName) return group;
                return {
                    ...group,
                    channels: group.channels.map((ch) => {
                        if (ch.channel !== channel) return ch;
                        return { ...ch, isActive: newIsActive };
                    }),
                };
            })
        );
        setError(null);

        try {
            await onToggle(notificationTypeName, channel, newIsActive);
        } catch {
            // Revert on failure
            setLocalPreferences((prev) =>
                prev.map((group) => {
                    if (group.notificationTypeName !== notificationTypeName) return group;
                    return {
                        ...group,
                        channels: group.channels.map((ch) => {
                            if (ch.channel !== channel) return ch;
                            return { ...ch, isActive: currentIsActive };
                        }),
                    };
                })
            );
            setError('No se pudo actualizar la preferencia. Intenta de nuevo.');
        }
    }

    const channelLabel: Record<string, string> = {
        EMAIL: 'Correo electrónico',
        WHATSAPP: 'WhatsApp',
    };

    return (
        <div className="flex flex-col gap-6">
            <div
                className="rounded-[6px] px-4 py-3 text-body"
                style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}
                role="status"
            >
                Las notificaciones en la aplicación están siempre activas
            </div>

            {error && (
                <div
                    className="rounded-[6px] px-4 py-3 text-body"
                    style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
                    role="alert"
                >
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-6">
                {localPreferences.map((group) => (
                    <section
                        key={group.notificationTypeName}
                        className="border border-neutral-300 rounded-[6px] bg-white p-4"
                    >
                        <h3 className="text-h3 font-semibold text-neutral-900 mb-4">
                            {translateNotificationType(group.notificationTypeName)}
                        </h3>

                        <div className="flex flex-col gap-3">
                            {group.channels.map((ch) => (
                                <div
                                    key={ch.channel}
                                    className="flex items-center justify-between min-h-[44px]"
                                >
                                    <span className="text-body text-neutral-700">
                                        {channelLabel[ch.channel] ?? ch.channel}
                                    </span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={ch.isActive}
                                        aria-label={`${channelLabel[ch.channel] ?? ch.channel} para ${translateNotificationType(group.notificationTypeName)}`}
                                        onClick={() => handleToggle(group.notificationTypeName, ch.channel, ch.isActive)}
                                        className={`relative inline-flex min-h-[44px] min-w-[52px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                                    >
                                        <span
                                            className={`relative inline-flex h-[28px] w-[52px] items-center rounded-full transition-colors ${ch.isActive ? 'bg-primary' : 'bg-neutral-300'}`}
                                        >
                                            <span
                                                className={`inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform ${ch.isActive ? 'translate-x-[26px]' : 'translate-x-[3px]'
                                                    }`}
                                            />
                                        </span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
