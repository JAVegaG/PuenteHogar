export class EnrichedPortfolioUnitEntity {
  constructor(
    public readonly id: string,
    public readonly portfolioId: string,
    public readonly name: string,
    public readonly propertyType: string,
    public readonly address: string,
    public readonly area: number | null,
    public readonly numberOfRooms: number,
    public readonly numberOfBathrooms: number,
    public readonly description: string | null,
    public readonly leaseBaseAmount: number,
    public readonly leaseBaseCurrency: string,
    public readonly departmentCode: string,
    public readonly cityCode: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) { }
}
