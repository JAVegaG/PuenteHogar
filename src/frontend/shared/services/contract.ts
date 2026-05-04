import { LandlordContractListItem } from '@modules/landlord-contracts/types';

export interface UploadContractRequest {
    file: File;
    leaseId: string;
    startDate: string;
    endDate?: string;
}

export interface ContractParty {
    userId: string;
    role: string;
    name: string | null;
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
    parties?: ContractParty[];
    signingDetails?: Array<{ role: string; hasSigned: boolean }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
        const body = await res.json();
        return body.message || fallback;
    } catch {
        return fallback;
    }
}

async function handleContractError(res: Response): Promise<never> {
    const status = res.status;
    if (status === 401) throw new Error('Sesión expirada');
    if (status === 403) throw new Error('No tienes permiso para realizar esta acción');
    if (status === 404) throw new Error('Contrato no encontrado');
    if (status === 409) {
        const message = await extractErrorMessage(res, 'Conflicto: el contrato no puede ser modificado en su estado actual');
        throw new Error(message);
    }
    if (status === 422) {
        const message = await extractErrorMessage(res, 'Solo se permiten archivos PDF de máximo 10 MB');
        throw new Error(message);
    }
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
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('leaseId', data.leaseId);
            formData.append('startDate', data.startDate);
            if (data.endDate) {
                formData.append('endDate', data.endDate);
            }

            res = await fetch(`${API_URL}/contracts`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            await handleContractError(res);
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
            await handleContractError(res);
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
            await handleContractError(res);
        }

        return res.json();
    },

    async replaceContractFile(
        contractId: string,
        file: File,
        token: string
    ): Promise<ContractSummary> {
        let res: Response;
        try {
            const formData = new FormData();
            formData.append('file', file);

            res = await fetch(`${API_URL}/contracts/${contractId}/file`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            await handleContractError(res);
        }

        return res.json();
    },

    async deleteContract(
        contractId: string,
        token: string
    ): Promise<void> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/contracts/${contractId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            await handleContractError(res);
        }
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
            await handleContractError(res);
        }

        return res.json();
    },
};
