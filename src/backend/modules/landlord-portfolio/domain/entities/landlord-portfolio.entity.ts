export class LandlordPortfolioEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly creationDate: Date,
  ) {}
}
