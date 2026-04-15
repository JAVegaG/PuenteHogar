export class SigningLogEntity {
  constructor(
    public readonly id: string,
    public readonly signingId: string,
    public readonly signingStatusId: string,
    public readonly platform: string | null,
    public readonly data: Record<string, unknown> | null,
    public readonly creationDate: Date,
  ) {}
}
