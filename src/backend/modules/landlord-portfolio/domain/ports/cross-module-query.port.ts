export const PORTFOLIO_CROSS_MODULE_QUERY = 'PORTFOLIO_CROSS_MODULE_QUERY';

export interface IPortfolioCrossModuleQuery {
    hasActiveLeases(userId: string): Promise<boolean>;
    hasPortfoliosWithUnits(userId: string): Promise<boolean>;
    hasActiveLeasesInPortfolios(userId: string): Promise<boolean>;
}
