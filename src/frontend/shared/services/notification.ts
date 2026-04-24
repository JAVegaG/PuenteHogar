export interface InAppNotification {
    id: string;
    notificationType: string;
    title: string;
    message: string;
    read: boolean;
    eventSource: string;
    data: Record<string, unknown>;
    createdAt: string;
}

export interface NotificationCount {
    unreadCount: number;
}

export interface NotificationPreferenceGroup {
    notificationTypeName: string;
    channels: {
        channel: 'EMAIL' | 'WHATSAPP';
        isActive: boolean;
    }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function handleNotificationError(status: number): never {
    if (status === 401) throw new Error('Sesión expirada');
    if (status === 403) throw new Error('No tienes permiso para realizar esta acción');
    if (status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    throw new Error('Error del servidor. Intenta de nuevo más tarde.');
}

export const notificationService = {
    async getNotifications(token: string): Promise<InAppNotification[]> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/notifications`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleNotificationError(res.status);
        }

        return res.json();
    },

    async getNotificationCount(token: string): Promise<NotificationCount> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/notifications/count`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleNotificationError(res.status);
        }

        return res.json();
    },

    async markAsRead(notificationId: string, token: string): Promise<InAppNotification> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleNotificationError(res.status);
        }

        return res.json();
    },

    async markAllAsRead(token: string): Promise<{ updatedCount: number }> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/notifications/read-all`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleNotificationError(res.status);
        }

        return res.json();
    },

    async getPreferences(token: string): Promise<NotificationPreferenceGroup[]> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/notifications/preferences`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleNotificationError(res.status);
        }

        return res.json();
    },

    async updatePreference(
        data: { notificationTypeName: string; channel: string; isActive: boolean },
        token: string
    ): Promise<void> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/notifications/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleNotificationError(res.status);
        }
    },
};
