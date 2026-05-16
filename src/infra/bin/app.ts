#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/stacks/network-stack';
import { DataStack } from '../lib/stacks/data-stack';
import { CiStack } from '../lib/stacks/ci-stack';
import { ComputeStack } from '../lib/stacks/compute-stack';
import { CdnStack } from '../lib/stacks/cdn-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { getConfig } from '../lib/config';

const app = new cdk.App();

const env = app.node.tryGetContext('env') as string | undefined;

if (!env || (env !== 'staging' && env !== 'production')) {
    throw new Error(
        'Environment context is required. Pass -c env=staging or -c env=production.',
    );
}

const config = getConfig(env);

const cdkEnv: cdk.Environment = {
    account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: config.region || process.env.CDK_DEFAULT_REGION,
};

// 1. NetworkStack (no dependencies)
const network = new NetworkStack(app, `${env}-Network`, {
    env: cdkEnv,
    environment: config.environment,
    maxAzs: config.network.maxAzs,
    natGateways: config.network.natGateways,
});

// 2. DataStack (depends on NetworkStack)
const data = new DataStack(app, `${env}-Data`, {
    env: cdkEnv,
    vpc: network.vpc,
    dataSubnets: network.dataSubnets,
    dataSecurityGroup: network.dataSecurityGroup,
    environment: config.environment,
});
data.addDependency(network);

// 3. CiStack (no dependencies — ECR repos)
const ci = new CiStack(app, `${env}-Ci`, {
    env: cdkEnv,
});

// 4. ComputeStack (depends on NetworkStack, DataStack, CiStack)
const compute = new ComputeStack(app, `${env}-Compute`, {
    env: cdkEnv,
    vpc: network.vpc,
    privateSubnets: network.privateSubnets,
    vpcConnectorSecurityGroup: network.vpcConnectorSecurityGroup,
    dbSecret: data.dbSecret,
    redisEndpoint: data.redisEndpoint,
    assetsBucket: data.assetsBucket,
    environment: config.environment,
    backendImageUri: `${ci.backendRepo.repositoryUri}:latest`,
    frontendImageUri: `${ci.frontendRepo.repositoryUri}:latest`,
});
compute.addDependency(network);
compute.addDependency(data);
compute.addDependency(ci);

// 5. CdnStack (depends on ComputeStack)
const cdn = new CdnStack(app, `${env}-Cdn`, {
    env: cdkEnv,
    backendServiceUrl: compute.backendServiceUrl,
    frontendServiceUrl: compute.frontendServiceUrl,
    assetsBucket: data.assetsBucket,
    domainName: config.domainName,
    environment: config.environment,
});
cdn.addDependency(compute);

// 6. MonitoringStack (depends on ComputeStack, DataStack)
const monitoring = new MonitoringStack(app, `${env}-Monitoring`, {
    env: cdkEnv,
    backendServiceArn: compute.backendServiceArn,
    frontendServiceArn: compute.frontendServiceArn,
    dbInstance: data.dbInstance,
    environment: config.environment,
});
monitoring.addDependency(compute);
monitoring.addDependency(data);

app.synth();
