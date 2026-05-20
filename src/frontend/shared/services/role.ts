export interface RemovableRole {
    roleName: string;
    removable: boolean;
    reasons: string[];
}

export interface RoleChangeResponse {
    accessToken: string;
    roles: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function handleRoleError(status: number): never {
    if (status === 401) throw new Error('Sesión expirada');
    if (status === 403) throw new Error('No tienes permiso para realizar esta acción');
    if (status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    throw new Error('Error del servidor. Intenta de nuevo más tarde.');
}

export const roleService = {
    async addRole(roleName: string, token: string): Promise<RoleChangeResponse> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/auth/roles/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ roleName }),
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleRoleError(res.status);
        }

        return res.json();
    },

    async removeRole(roleName: string, token: string): Promise<RoleChangeResponse> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/auth/roles/${roleName}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleRoleError(res.status);
        }

        return res.json();
    },

    async getRemovableRoles(token: string): Promise<RemovableRole[]> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/auth/roles/removable`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleRoleError(res.status);
        }

        return res.json();
    },
};
