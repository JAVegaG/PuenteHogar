export type ContractStatus = 'PENDING' | 'SIGNATURE_PENDING' | 'SIGNED';

export class ContractEntity {
  constructor(
    public readonly id: string,
    public readonly leaseId: string,
    public readonly status: ContractStatus,
    public readonly startDate: Date,
    public readonly endDate: Date | null,
    public readonly fileUrl: string | null,
    public readonly signedAt: Date | null,
    public readonly externalSigningId: string | null,
  ) {}
}
