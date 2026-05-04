export const PORTFOLIO_NOTIFICATION_PORT = 'PORTFOLIO_NOTIFICATION_PORT';

export interface IPortfolioNotificationPort {
    notifyLeaseCreated(
        tenantUserId: string,
        leaseId: string,
        unitId: string,
    ): Promise<void>;
    notifyLeaseCancelled(
        tenantUserId: string,
        leaseId: string,
    ): Promise<void>;
}
