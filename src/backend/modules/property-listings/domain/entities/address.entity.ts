export class AddressEntity {
  constructor(
    public readonly id: string,
    public readonly propertyId: string,
    public readonly state: string,
    public readonly city: string,
    public readonly neighborhood: string,
    public readonly address: string,
    public readonly latitude: number | null,
    public readonly longitude: number | null,
  ) {}
}
