import { LandlordContractListItem } from '@modules/landlord-contracts/types';

export interface UploadContractRequest {
    leaseId: string;
    startDate: string;
    endDate?: string;
    fileUrl: string;
    fileSizeBytes?: number;
    mimeType?: string;
}

export interface ContractParty {
    userId: string;
    role: string;
}

export interface ContractSummary {
    id: string;
    leaseId: string;
    status: 'PENDING' | 'SIGNATURE_PENDING' | 'SIGNED';
    startDate: string;
    endDate: string | null;
    fileUrl: string;
    signedAt: string | null;
    externalSigningId: string | null;
    parties: ContractParty[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function handleContractError(status: number): never {
    if (status === 401) throw new Error('Sesión expirada');
    if (status === 403) throw new Error('No tienes permiso para realizar esta acción');
    if (status === 404) throw new Error('Contrato no encontrado');
    if (status === 422) throw new Error('Solo se permiten archivos PDF de máximo 10 MB');
    if (status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    throw new Error('Error del servidor. Intenta de nuevo más tarde.');
}

export const contractService = {
    async createContract(
        data: UploadContractRequest,
        token: string
    ): Promise<ContractSummary> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/contracts`, {
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
            handleContractError(res.status);
        }

        return res.json();
    },

    async getContract(
        contractId: string,
        token: string
    ): Promise<ContractSummary> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/contracts/${contractId}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleContractError(res.status);
        }

        return res.json();
    },

    async signContract(
        contractId: string,
        token: string
    ): Promise<ContractSummary> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/contracts/${contractId}/sign`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            handleContractError(res.status);
        }

        return res.json();
    },

    async getContractsByLandlord(
        token: string
    ): Promise<LandlordContractListItem[]> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/contracts/landlord`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor.');
        }

        if (!res.ok) {
            handleContractError(res.status);
        }

        return res.json();
    },
};
