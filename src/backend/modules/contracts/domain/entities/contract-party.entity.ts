export class ContractPartyEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly contractId: string,
    public readonly roleInContract: string,
  ) {}
}
