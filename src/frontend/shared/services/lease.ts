export interface LeaseListItem {
    id: string;
    tenantName: string;
    startDate: string;
    endDate: string | null;
    monthlyAmount: number;
    status: 'Vigente' | 'Acordado' | 'Finalizado';
    contractId: string | null;
    contractStatus: 'PENDING' | 'SIGNATURE_PENDING' | 'SIGNED' | null;
}

export interface LeaseDetail {
    id: string;
    portfolioUnitId: string;
    userId: string;
    startDate: string;
    endDate: string | null;
    status: 'Vigente' | 'Acordado' | 'Finalizado';
    monthlyAmount: number;
    contractId: string | null;
    contractStatus: string | null;
    tenant: {
        fullName: string;
        documentTypeCode: string;
        documentNumber: string;
        email: string;
        phoneNumber: string;
    };
    property: {
        propertyType: string;
        numberOfRooms: number;
        numberOfBathrooms: number;
        area: number | null;
        address: string;
    };
}

export interface CreateLeaseRequest {
    tenantEmail: string;
    startDate: string;
    endDate?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function handleLeaseError(status: number): never {
    if (status === 401) throw new Error('Sesión expirada');
    if (status === 403) throw new Error('No tienes permiso para realizar esta acción');
    if (status === 404) throw new Error('No se encontró un arrendatario con ese correo electrónico');
    if (status === 409) throw new Error('Esta unidad ya tiene un arriendo activo');
    if (status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    throw new Error('Error del servidor. Intenta de nuevo más tarde.');
}

export const leaseService = {
    async getUnitLeases(
        portfolioId: string,
        unitId: string,
        token: string
    ): Promise<LeaseListItem[]> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/portfolio/${portfolioId}/units/${unitId}/leases`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleLeaseError(res.status);
        }

        return res.json();
    },

    async getLeaseDetail(
        portfolioId: string,
        unitId: string,
        leaseId: string,
        token: string
    ): Promise<LeaseDetail> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/portfolio/${portfolioId}/units/${unitId}/leases/${leaseId}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleLeaseError(res.status);
        }

        return res.json();
    },

    async createLease(
        portfolioId: string,
        unitId: string,
        data: CreateLeaseRequest,
        token: string
    ): Promise<LeaseListItem> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/portfolio/${portfolioId}/units/${unitId}/leases`, {
                method: 'POST',
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
            handleLeaseError(res.status);
        }

        return res.json();
    },

    async cancelLease(
        portfolioId: string,
        unitId: string,
        leaseId: string,
        token: string
    ): Promise<void> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/portfolio/${portfolioId}/units/${unitId}/leases/${leaseId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            if (res.status === 401) throw new Error('Sesión expirada');
            if (res.status === 403) throw new Error('No tienes permiso para cancelar este arriendo');
            if (res.status === 409) {
                const body = await res.json().catch(() => null);
                const message = body?.message || 'No se puede cancelar un arriendo con contrato firmado';
                throw new Error(message);
            }
            if (res.status === 404) throw new Error('Arriendo no encontrado');
            throw new Error('Error del servidor. Intenta de nuevo más tarde.');
        }
    },
};
