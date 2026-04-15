import type { LeaseState } from '../entities/lease-status.entity';

export interface ITrackingNotificationPort {
  notifyLeaseStateChanged(
    landlordUserId: string,
    tenantUserId: string,
    leaseId: string,
    newState: LeaseState,
  ): Promise<void>;
}
