export const PAYMENT_SCHEDULING_PORT = 'PAYMENT_SCHEDULING_PORT';

export interface IPaymentSchedulingPort {
    scheduleInitialPayment(
        leaseId: string,
        amount: number,
        currency: string,
        dueDate: Date,
    ): Promise<void>;
}
