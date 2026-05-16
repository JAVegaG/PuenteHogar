import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ComputeStack } from '../lib/stacks/compute-stack';

function createComputeStack(environment: 'staging' | 'production'): Template {
    const app = new cdk.App();

    // Create a mock VPC stack to provide dependencies
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

    const vpcConnectorSg = new ec2.SecurityGroup(vpcStack, 'VpcConnectorSg', {
        vpc,
        allowAllOutbound: false,
    });

    const dbSecret = new secretsmanager.Secret(vpcStack, 'DbSecret');
    const jwtSecret = new secretsmanager.Secret(vpcStack, 'JwtSecret');
    const piiKeySecret = new secretsmanager.Secret(vpcStack, 'PiiKeySecret');
    const assetsBucket = new s3.Bucket(vpcStack, 'AssetsBucket');

    const stack = new ComputeStack(app, 'TestCompute', {
        vpc,
        privateSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnets,
        vpcConnectorSecurityGroup: vpcConnectorSg,
        dbSecret,
        jwtSecret,
        piiKeySecret,
        dbEndpointAddress: 'test-db.cluster-abc123.us-east-1.rds.amazonaws.com',
        dbEndpointPort: '5432',
        redisEndpoint: 'test-redis.abc123.0001.use1.cache.amazonaws.com',
        assetsBucket,
        environment,
        backendImageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/backend:latest',
        frontendImageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/frontend:latest',
        backendRepoArn: 'arn:aws:ecr:us-east-1:123456789012:repository/backend',
        frontendRepoArn: 'arn:aws:ecr:us-east-1:123456789012:repository/frontend',
    });

    return Template.fromStack(stack);
}

describe('ComputeStack — Staging', () => {
    let template: Template;

    beforeAll(() => {
        template = createComputeStack('staging');
    });

    test('creates two App Runner services (backend and frontend)', () => {
        template.resourceCountIs('AWS::AppRunner::Service', 2);
    });

    test('creates a VPC Connector', () => {
        template.hasResourceProperties('AWS::AppRunner::VpcConnector', {
            Subnets: Match.anyValue(),
            SecurityGroups: Match.anyValue(),
        });
    });

    test('backend service has VPC egress configuration', () => {
        template.hasResourceProperties('AWS::AppRunner::Service', {
            NetworkConfiguration: {
                EgressConfiguration: {
                    EgressType: 'VPC',
                    VpcConnectorArn: Match.anyValue(),
                },
            },
        });
    });

    test('frontend service has DEFAULT egress (no VPC Connector)', () => {
        template.hasResourceProperties('AWS::AppRunner::Service', {
            NetworkConfiguration: {
                EgressConfiguration: {
                    EgressType: 'DEFAULT',
                },
            },
        });
    });

    test('backend service has health check at /api/health', () => {
        template.hasResourceProperties('AWS::AppRunner::Service', {
            HealthCheckConfiguration: {
                Protocol: 'HTTP',
                Path: '/api/health',
            },
        });
    });

    test('frontend service has health check at /', () => {
        template.hasResourceProperties('AWS::AppRunner::Service', {
            HealthCheckConfiguration: {
                Protocol: 'HTTP',
                Path: '/',
            },
        });
    });

    test('creates auto-scaling configurations', () => {
        template.resourceCountIs('AWS::AppRunner::AutoScalingConfiguration', 2);
    });

    test('staging backend auto-scaling has maxSize 2', () => {
        template.hasResourceProperties('AWS::AppRunner::AutoScalingConfiguration', {
            MaxSize: 2,
        });
    });

    test('creates IAM instance role for backend with Secrets Manager read', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: 'secretsmanager:GetSecretValue',
                        Effect: 'Allow',
                    }),
                ]),
            },
        });
    });

    test('creates IAM instance role for backend with S3 read/write', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: Match.arrayWith([
                            's3:PutObject',
                            's3:GetObject',
                            's3:DeleteObject',
                        ]),
                        Effect: 'Allow',
                    }),
                ]),
            },
        });
    });

    test('creates ECR access role with pull permissions', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: Match.arrayWith([
                            'ecr:GetDownloadUrlForLayer',
                            'ecr:BatchGetImage',
                        ]),
                        Effect: 'Allow',
                    }),
                ]),
            },
        });
    });

    test('backend App Runner service uses ECR image source', () => {
        template.hasResourceProperties('AWS::AppRunner::Service', {
            SourceConfiguration: {
                ImageRepository: Match.objectLike({
                    ImageRepositoryType: 'ECR',
                }),
            },
        });
    });

    test('auto-deploy is enabled', () => {
        template.hasResourceProperties('AWS::AppRunner::Service', {
            SourceConfiguration: Match.objectLike({
                AutoDeploymentsEnabled: true,
            }),
        });
    });
});

describe('ComputeStack — Production', () => {
    let template: Template;

    beforeAll(() => {
        template = createComputeStack('production');
    });

    test('production backend auto-scaling has maxSize 6', () => {
        template.hasResourceProperties('AWS::AppRunner::AutoScalingConfiguration', {
            MaxSize: 6,
        });
    });

    test('production frontend auto-scaling has maxSize 4', () => {
        template.hasResourceProperties('AWS::AppRunner::AutoScalingConfiguration', {
            MaxSize: 4,
        });
    });

    test('production backend maxConcurrency is 80', () => {
        template.hasResourceProperties('AWS::AppRunner::AutoScalingConfiguration', {
            MaxConcurrency: 80,
        });
    });
});
