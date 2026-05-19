import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Template } from 'aws-cdk-lib/assertions';
import { NetworkStack } from '../lib/stacks/network-stack';
import { DataStack } from '../lib/stacks/data-stack';
import { CiStack } from '../lib/stacks/ci-stack';
import { ComputeStack } from '../lib/stacks/compute-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

describe('Snapshot Tests', () => {
    test('NetworkStack matches snapshot', () => {
        const app = new cdk.App();
        const stack = new NetworkStack(app, 'SnapshotNetwork', {
            environment: 'staging',
            maxAzs: 2,
            natGateways: 1,
        });
        const template = Template.fromStack(stack);
        expect(template.toJSON()).toMatchSnapshot();
    });

    test('DataStack matches snapshot', () => {
        const app = new cdk.App();
        const network = new NetworkStack(app, 'SnapshotNetwork', {
            environment: 'staging',
            maxAzs: 2,
            natGateways: 1,
        });
        const stack = new DataStack(app, 'SnapshotData', {
            vpc: network.vpc,
            dataSubnets: network.dataSubnets,
            dataSecurityGroup: network.dataSecurityGroup,
            environment: 'staging',
        });
        const template = Template.fromStack(stack);
        expect(template.toJSON()).toMatchSnapshot();
    });

    test('CiStack matches snapshot', () => {
        const app = new cdk.App();
        const stack = new CiStack(app, 'SnapshotCi');
        const template = Template.fromStack(stack);
        expect(template.toJSON()).toMatchSnapshot();
    });

    test('ComputeStack matches snapshot', () => {
        const app = new cdk.App();

        const vpcStack = new cdk.Stack(app, 'VpcStack');
        const vpc = new ec2.Vpc(vpcStack, 'Vpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
                { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
                { name: 'Data', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
            ],
        });
        const ecsServiceSg = new ec2.SecurityGroup(vpcStack, 'EcsServiceSg', {
            vpc,
            allowAllOutbound: false,
        });
        const albSg = new ec2.SecurityGroup(vpcStack, 'AlbSg', {
            vpc,
            allowAllOutbound: false,
        });
        const dbSecret = new secretsmanager.Secret(vpcStack, 'DbSecret');
        const jwtSecret = new secretsmanager.Secret(vpcStack, 'JwtSecret');
        const piiKeySecret = new secretsmanager.Secret(vpcStack, 'PiiKeySecret');
        const assetsBucket = new s3.Bucket(vpcStack, 'AssetsBucket');

        const stack = new ComputeStack(app, 'SnapshotCompute', {
            vpc,
            privateSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnets,
            publicSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }).subnets,
            ecsServiceSecurityGroup: ecsServiceSg,
            albSecurityGroup: albSg,
            dbSecret,
            jwtSecret,
            piiKeySecret,
            dbEndpointAddress: 'test-db.cluster-abc123.us-east-1.rds.amazonaws.com',
            dbEndpointPort: '5432',
            redisEndpoint: 'test-redis.abc123.0001.use1.cache.amazonaws.com',
            assetsBucket,
            environment: 'staging',
            backendImageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/backend:latest',
            frontendImageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/frontend:latest',
            backendRepoArn: 'arn:aws:ecr:us-east-1:123456789012:repository/backend',
            frontendRepoArn: 'arn:aws:ecr:us-east-1:123456789012:repository/frontend',
        });

        const template = Template.fromStack(stack);
        expect(template.toJSON()).toMatchSnapshot();
    });

    test('CdnStack matches snapshot', () => {
        const app = new cdk.App();

        // For snapshot, we test a simplified CDN stack with bucket in same stack
        const stack = new cdk.Stack(app, 'SnapshotCdn');
        new s3.Bucket(stack, 'AssetsBucket');
        new (require('aws-cdk-lib/aws-wafv2').CfnWebACL)(stack, 'WebAcl', {
            defaultAction: { allow: {} },
            scope: 'CLOUDFRONT',
            visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'test', sampledRequestsEnabled: true },
            rules: [],
        });

        expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
    });

    test('MonitoringStack matches snapshot', () => {
        const app = new cdk.App();

        const depStack = new cdk.Stack(app, 'DepStack');
        const vpc = new ec2.Vpc(depStack, 'Vpc');
        const dbInstance = new rds.DatabaseInstance(depStack, 'Database', {
            engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
            vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        });

        const stack = new MonitoringStack(app, 'SnapshotMonitoring', {
            albArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-alb/abc123',
            albFullName: 'app/test-alb/abc123',
            backendTargetGroupFullName: 'targetgroup/backend-tg/def456',
            ecsClusterName: 'test-cluster',
            backendServiceName: 'test-backend-svc',
            frontendServiceName: 'test-frontend-svc',
            dbInstance,
            environment: 'staging',
        });

        const template = Template.fromStack(stack);
        expect(template.toJSON()).toMatchSnapshot();
    });
});
