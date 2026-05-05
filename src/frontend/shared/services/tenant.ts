export interface ActiveLeaseSummary {
    leaseId: string;
    propertyName: string;
    currentState: string;
    lastChangedAt: string;
}

export interface LeaseStatusHistoryItem {
    id: string;
    state: string;
    recordedAt: string;
}

export interface LeaseStatusResponse {
    leaseId: string;
    currentState: string;
    lastChangedAt: string;
    history: LeaseStatusHistoryItem[];
}

export interface PaymentResponse {
    id: string;
    scheduledPaymentId: string;
    amount: number;
    currency: string;
    status: string;
    dueDate: string;
    paymentDesc: string | null;
    createdAt: string | null;
}

export interface InitiatePaymentRequest {
    scheduledPaymentId: string;
}

export interface InitiatePaymentResponse {
    redirectUrl: string;
    status: string;
}

export interface TenantContractListItem {
    id: string;
    leaseId: string;
    status: 'PENDING' | 'SIGNATURE_PENDING' | 'SIGNED';
    startDate: string;
    endDate: string | null;
    unitName: string;
    landlordName: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function handleTenantError(status: number): never {
    if (status === 401) throw new Error('Sesión expirada');
    if (status === 403) throw new Error('No tienes permiso para realizar esta acción');
    if (status === 404) throw new Error('Recurso no encontrado');
    if (status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    throw new Error('Error del servidor. Intenta de nuevo más tarde.');
}

export const tenantService = {
    async getActiveLeases(token: string): Promise<ActiveLeaseSummary[]> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/tracking/leases/active`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleTenantError(res.status);
        }

        return res.json();
    },

    async getLeaseStatus(leaseId: string, token: string): Promise<LeaseStatusResponse> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/tracking/leases/${leaseId}/status`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleTenantError(res.status);
        }

        return res.json();
    },

    async getPaymentHistory(token: string): Promise<PaymentResponse[]> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/payments/history`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleTenantError(res.status);
        }

        return res.json();
    },

    async initiatePayment(data: InitiatePaymentRequest, token: string): Promise<InitiatePaymentResponse> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/payments/initiate`, {
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
            handleTenantError(res.status);
        }

        return res.json();
    },

    async transitionLeaseState(listingId: string, newState: string, token: string): Promise<void> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/tracking/leases/transition`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ listingId, newState }),
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleTenantError(res.status);
        }
    },

    async getTenantContracts(token: string): Promise<TenantContractListItem[]> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/contracts/tenant`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleTenantError(res.status);
        }

        return res.json();
    },
};
