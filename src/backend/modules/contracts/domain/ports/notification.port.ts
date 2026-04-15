export interface INotificationPort {
  notifyContractSigned(
    landlordUserId: string,
    tenantUserId: string,
    contractId: string,
    signedAt: Date,
  ): Promise<void>;
  notifySigningFailed(userId: string, contractId: string): Promise<void>;
}
