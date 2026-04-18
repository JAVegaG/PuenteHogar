export class LandlordPortfolioEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly creationDate: Date,
  ) {}
}
