export class PortfolioUnitEntity {
  constructor(
    public readonly id: string,
    public readonly portfolioId: string,
    public readonly propertyId: string,
    public readonly name: string,
    public readonly conditions: string | null,
    public readonly leaseBaseAmount: number,
    public readonly leaseBaseCurrency: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) { }
}
