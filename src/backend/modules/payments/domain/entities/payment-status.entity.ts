export class PaymentStatusEntity {
  constructor(
    public readonly id: string,
    public readonly name: string, // PENDING | PROCESSING | PAID | REJECTED
    public readonly description: string | null,
  ) {}
}
