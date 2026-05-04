export interface INotificationPort {
  notifyContractSigned(
    landlordUserId: string,
    tenantUserId: string,
    contractId: string,
    signedAt: Date,
  ): Promise<void>;
  notifySigningFailed(userId: string, contractId: string): Promise<void>;
  notifyContractUploaded(
    tenantUserId: string,
    contractId: string,
    leaseId: string,
  ): Promise<void>;
}
