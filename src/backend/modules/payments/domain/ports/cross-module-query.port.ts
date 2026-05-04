export const PAYMENTS_CROSS_MODULE_QUERY = 'PAYMENTS_CROSS_MODULE_QUERY';

export interface IPaymentsCrossModuleQuery {
    hasPendingPayments(userId: string): Promise<boolean>;
}
