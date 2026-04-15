export class SigningEntity {
  constructor(
    public readonly id: string,
    public readonly contractPartyId: string,
    public readonly signingStatusId: string,
    public readonly signingTimestamp: Date | null,
    public readonly documentHash: string | null,
  ) {}
}
