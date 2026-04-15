export interface IPaymentNotificationPort {
  notifyPaymentReceived(
    landlordUserId: string,
    amount: number,
    currency: string,
    leaseId: string,
  ): Promise<void>;
}
