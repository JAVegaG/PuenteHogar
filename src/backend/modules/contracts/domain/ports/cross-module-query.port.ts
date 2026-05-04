export const CONTRACTS_CROSS_MODULE_QUERY = 'CONTRACTS_CROSS_MODULE_QUERY';

export interface IContractsCrossModuleQuery {
    hasActiveContractsAsRole(userId: string, role: string): Promise<boolean>;
}
