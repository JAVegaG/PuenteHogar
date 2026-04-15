import type {
  LeaseCurrentStatusEntity,
  LeaseState,
  LeaseStatusHistoryEntity,
} from '../entities/lease-status.entity';

export interface ITrackingRepository {
  /** Returns the current state of a lease, or null if not found */
  getCurrentStatus(leaseId: string): Promise<LeaseCurrentStatusEntity | null>;

  /** Returns the full state transition history for a lease */
  getStatusHistory(leaseId: string): Promise<LeaseStatusHistoryEntity[]>;

  /** Records a state transition and updates the current status atomically */
  recordTransition(leaseId: string, newState: LeaseState): Promise<LeaseStatusHistoryEntity>;

  /** Returns all active leases for a user (as landlord or tenant) with property name and last change */
  getActiveLeasesForUser(userId: string): Promise<ActiveLeaseSummary[]>;

  /** Resolves the landlord user_id for a given lease via multi-step cross-schema query */
  getLandlordUserId(leaseId: string): Promise<string | null>;

  /** Resolves the tenant user_id for a given lease */
  getTenantUserId(leaseId: string): Promise<string | null>;
}

export interface ActiveLeaseSummary {
  leaseId: string;
  propertyName: string;
  currentState: LeaseState;
  lastChangedAt: Date;
}
