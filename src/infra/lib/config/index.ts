import { stagingConfig, productionConfig } from './environments';

export interface EnvironmentConfig {
    readonly account: string;
    readonly region: string;
    readonly environment: 'staging' | 'production';
    readonly domainName?: string;

    readonly compute: {
        readonly backend: {
            readonly cpu: number;
            readonly memory: number;
            readonly desiredCount: number;
            readonly minCapacity: number;
            readonly maxCapacity: number;
        };
        readonly frontend: {
            readonly cpu: number;
            readonly memory: number;
            readonly desiredCount: number;
            readonly minCapacity: number;
            readonly maxCapacity: number;
        };
    };

    readonly database: {
        readonly instanceClass: string;
        readonly multiAz: boolean;
        readonly backupRetentionDays: number;
        readonly allocatedStorage: number;
    };

    readonly redis: {
        readonly nodeType: string;
        readonly numCacheNodes: number;
    };

    readonly network: {
        readonly maxAzs: number;
        readonly natGateways: number;
    };
}

export function getConfig(env: string): EnvironmentConfig {
    switch (env) {
        case 'staging':
            return stagingConfig;
        case 'production':
            return productionConfig;
        default:
            throw new Error(
                `Unknown environment: "${env}". Must be "staging" or "production". ` +
                'Pass -c env=staging or -c env=production to cdk commands.',
            );
    }
}
