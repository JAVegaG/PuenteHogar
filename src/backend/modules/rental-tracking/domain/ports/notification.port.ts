import type { LeaseState } from '../entities/lease-status.entity';

export interface TenantContactInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface LeaseStateNotificationMetadata {
  tenantContact?: TenantContactInfo;
}

export interface ITrackingNotificationPort {
  notifyLeaseStateChanged(
    landlordUserId: string,
    tenantUserId: string,
    leaseId: string,
    newState: LeaseState,
    metadata?: LeaseStateNotificationMetadata,
  ): Promise<void>;
}
