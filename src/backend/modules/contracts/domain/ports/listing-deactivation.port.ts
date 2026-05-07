export const LISTING_DEACTIVATION_PORT = 'LISTING_DEACTIVATION_PORT';

export interface IListingDeactivationPort {
    deactivateByLeaseId(leaseId: string): Promise<void>;
}
