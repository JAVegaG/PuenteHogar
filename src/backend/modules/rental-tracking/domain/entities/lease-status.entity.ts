export type LeaseState =
  | 'PUBLISHED'
  | 'CONTACT_INITIATED'
  | 'CONTRACT_UPLOADED'
  | 'CONTRACT_SIGNED'
  | 'PAYMENT_RECEIVED';

export class LeaseStatusHistoryEntity {
  constructor(
    public readonly id: string,
    public readonly leaseId: string,
    public readonly state: LeaseState,
    public readonly recordCreatedAt: Date,
  ) {}
}

export class LeaseCurrentStatusEntity {
  constructor(
    public readonly leaseId: string,
    public readonly state: LeaseState,
    public readonly lastChangedAt: Date,
  ) {}
}
