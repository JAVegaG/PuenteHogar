export class IndividualReportEntity {
  constructor(
    public readonly id: string,
    public readonly portfolioUnitId: string,
    public readonly asOfDate: Date,
    public readonly windowMonths: number,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly currency: string,
    public readonly totalAmount: number,
    public readonly minAmount: number,
    public readonly maxAmount: number,
    public readonly paymentCount: number,
    public readonly expectedAmount: number,
    public readonly overdueCount: number,
  ) {}
}
