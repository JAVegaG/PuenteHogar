export const PAYMENTS_CROSS_MODULE_QUERY = 'PAYMENTS_CROSS_MODULE_QUERY';

export interface NextPendingPaymentDto {
    id: string;
    amount: number;
    dueDate: Date;
    status: string;
}

export interface IPaymentsCrossModuleQuery {
    hasPendingPayments(userId: string): Promise<boolean>;
    getNextPendingPayment(leaseId: string): Promise<NextPendingPaymentDto | null>;
}
