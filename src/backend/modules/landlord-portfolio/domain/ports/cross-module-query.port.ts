export const PORTFOLIO_CROSS_MODULE_QUERY = 'PORTFOLIO_CROSS_MODULE_QUERY';

export interface LeasePropertyInfo {
    unitId: string;
    propertyName: string;
    propertyType: string;
    neighborhood: string;
    leaseStatus: string;
}

export interface IPortfolioCrossModuleQuery {
    hasActiveLeases(userId: string): Promise<boolean>;
    hasPortfoliosWithUnits(userId: string): Promise<boolean>;
    hasActiveLeasesInPortfolios(userId: string): Promise<boolean>;
    getPropertyInfoByLeaseId(leaseId: string): Promise<LeasePropertyInfo | null>;
    /**
     * Verifies that the given user is the tenant on the active lease for the specified unit.
     * Returns the lease ID if ownership is confirmed, null otherwise.
     */
    getLeaseIdByUnitForTenant(unitId: string, userId: string): Promise<string | null>;
    /**
     * Verifies that the given user is the tenant on the specified lease.
     * Returns true if the lease exists and user_id matches, false otherwise.
     */
    verifyTenantOwnership(leaseId: string, userId: string): Promise<boolean>;
}
