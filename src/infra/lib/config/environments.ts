import { EnvironmentConfig } from './index';

export const stagingConfig: EnvironmentConfig = {
    account: process.env.CDK_DEFAULT_ACCOUNT!,
    region: 'us-east-1',
    environment: 'staging',
    compute: {
        backend: {
            cpu: 512,
            memory: 1024,
            desiredCount: 1,
            minCapacity: 1,
            maxCapacity: 2,
        },
        frontend: {
            cpu: 256,
            memory: 512,
            desiredCount: 1,
            minCapacity: 1,
            maxCapacity: 2,
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
        natGateways: 0,
    },
};

export const productionConfig: EnvironmentConfig = {
    account: process.env.CDK_DEFAULT_ACCOUNT!,
    region: 'us-east-1',
    environment: 'production',
    compute: {
        backend: {
            cpu: 1024,
            memory: 2048,
            desiredCount: 2,
            minCapacity: 2,
            maxCapacity: 6,
        },
        frontend: {
            cpu: 512,
            memory: 1024,
            desiredCount: 2,
            minCapacity: 2,
            maxCapacity: 4,
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
