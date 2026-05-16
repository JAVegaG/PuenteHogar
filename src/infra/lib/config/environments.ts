import { EnvironmentConfig } from './index';

export const stagingConfig: EnvironmentConfig = {
    account: process.env.CDK_DEFAULT_ACCOUNT!,
    region: 'us-east-1',
    environment: 'staging',
    compute: {
        backend: {
            cpu: 0.5,
            memory: 1,
            minInstances: 0,
            maxInstances: 2,
            maxConcurrency: 50,
        },
        frontend: {
            cpu: 0.25,
            memory: 0.5,
            minInstances: 0,
            maxInstances: 2,
            maxConcurrency: 80,
        },
    },
    database: {
        instanceClass: 'db.t3.micro',
        multiAz: false,
        backupRetentionDays: 7,
        allocatedStorage: 20,
    },
    redis: {
        nodeType: 'cache.t3.micro',
        numCacheNodes: 1,
    },
    network: {
        maxAzs: 2,
        natGateways: 1,
    },
};

export const productionConfig: EnvironmentConfig = {
    account: process.env.CDK_DEFAULT_ACCOUNT!,
    region: 'us-east-1',
    environment: 'production',
    compute: {
        backend: {
            cpu: 1,
            memory: 2,
            minInstances: 1,
            maxInstances: 6,
            maxConcurrency: 80,
        },
        frontend: {
            cpu: 0.5,
            memory: 1,
            minInstances: 1,
            maxInstances: 4,
            maxConcurrency: 100,
        },
    },
    database: {
        instanceClass: 'db.t3.medium',
        multiAz: true,
        backupRetentionDays: 30,
        allocatedStorage: 50,
    },
    redis: {
        nodeType: 'cache.t3.small',
        numCacheNodes: 2,
    },
    network: {
        maxAzs: 2,
        natGateways: 1,
    },
};
