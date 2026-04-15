export class LeaseEntity {
  constructor(
    public readonly id: string,
    public readonly portfolioUnitId: string,
    public readonly userId: string,
    public readonly startDate: Date,
    public readonly endDate: Date | null,
    public readonly encBlob: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
