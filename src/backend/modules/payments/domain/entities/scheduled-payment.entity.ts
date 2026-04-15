export class ScheduledPaymentEntity {
  constructor(
    public readonly id: string,
    public readonly leaseId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly dueDate: Date,
    public readonly status: string, // PENDING | PROCESSING | PAID | REJECTED
  ) {}
}
