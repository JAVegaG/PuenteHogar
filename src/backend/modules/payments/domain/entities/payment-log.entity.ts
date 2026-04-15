export class PaymentLogEntity {
  constructor(
    public readonly id: string,
    public readonly paymentId: string,
    public readonly status: string,
    public readonly platform: string | null,
    public readonly data: Record<string, unknown> | null,
    public readonly creationDate: Date,
  ) {}
}
