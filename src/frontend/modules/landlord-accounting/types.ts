export interface PeriodRequest {
    year: number;
    month: number;
}

export type PeriodOption = '1m' | '3m' | '6m' | '12m';

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

export interface PortfolioIncomeSummary {
    id: string;
    name: string;
    totalUnits: number;
    activeLeases: number;
    monthlyIncome: number;
}

export interface PropertyDetailRow {
    unitId: string;
    address: string;
    neighborhood: string;
    monthlyIncome: number;
    paymentStatus: 'Al día' | 'Pendiente';
}
