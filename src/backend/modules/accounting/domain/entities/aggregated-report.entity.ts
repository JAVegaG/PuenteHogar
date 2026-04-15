export class AggregatedReportEntity {
  constructor(
    public readonly id: string,
    public readonly portfolioId: string,
    public readonly asOfDate: Date,
    public readonly windowMonths: number,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly currency: string,
    public readonly numberOfUnits: number,
    public readonly totalAmount: number,
    public readonly avgAmount: number,
    public readonly paymentCount: number,
    public readonly minAmount: number,
    public readonly maxAmount: number,
    public readonly expectedAmount: number,
    public readonly overdueCount: number,
  ) {}
}
