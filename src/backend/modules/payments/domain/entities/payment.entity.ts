export class PaymentEntity {
  constructor(
    public readonly id: string,
    public readonly scheduledPaymentId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly paymentDesc: string | null,
    public readonly createdAt: Date,
  ) {}
}
