export interface PeriodRequest {
    year: number;
    month: number;
}

export interface AggregatedReportResponse {
    portfolioId: string;
    periodStart: string;
    periodEnd: string;
    currency: string;
    numberOfUnits: number;
    totalAmount: number;
    avgAmount: number;
    paymentCount: number;
    minAmount: number;
    maxAmount: number;
    expectedAmount: number;
    overdueCount: number;
    message?: string;
}

export interface IndividualReportResponse {
    portfolioUnitId: string;
    periodStart: string;
    periodEnd: string;
    currency: string;
    totalAmount: number;
    minAmount: number;
    maxAmount: number;
    paymentCount: number;
    expectedAmount: number;
    overdueCount: number;
    message?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const accountingService = {
    async getAggregatedReport(
        portfolioId: string,
        period: PeriodRequest,
        token: string
    ): Promise<AggregatedReportResponse> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/accounting/reports/portfolio/${portfolioId}/aggregated`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ year: period.year, month: period.month }),
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            if (res.status === 401) throw new Error('Sesión expirada');
            if (res.status === 403) throw new Error('No tienes permiso para acceder a reportes contables');
            if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
            throw new Error('Error del servidor. Intenta de nuevo más tarde.');
        }

        return res.json();
    },

    async getIndividualReport(
        portfolioId: string,
        unitId: string,
        period: PeriodRequest,
        token: string
    ): Promise<IndividualReportResponse> {
        let res: Response;
        try {
            res = await fetch(`${API_URL}/accounting/reports/portfolio/${portfolioId}/unit/${unitId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ year: period.year, month: period.month }),
            });
        } catch {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
        }

        if (!res.ok) {
            if (res.status === 401) throw new Error('Sesión expirada');
            if (res.status === 403) throw new Error('No tienes permiso para acceder a reportes contables');
            if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
            throw new Error('Error del servidor. Intenta de nuevo más tarde.');
        }

        return res.json();
    },
};
