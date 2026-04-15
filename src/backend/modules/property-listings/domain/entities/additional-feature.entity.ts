export class AdditionalFeatureEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly value: string | null,
    public readonly order: number | null,
  ) {}
}
