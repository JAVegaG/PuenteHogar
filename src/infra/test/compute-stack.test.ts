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

    const stack = new ComputeStack(app, 'TestCompute', {
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

    test('creates an ECS cluster', () => {
        template.resourceCountIs('AWS::ECS::Cluster', 1);
    });

    test('creates an Application Load Balancer', () => {
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
            Scheme: 'internet-facing',
            Type: 'application',
        });
    });

    test('creates an HTTP listener on port 80', () => {
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
            Port: 80,
            Protocol: 'HTTP',
        });
    });

    test('creates backend target group with health check at /api/health', () => {
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
            Port: 3000,
            Protocol: 'HTTP',
            TargetType: 'ip',
            HealthCheckPath: '/api/health',
        });
    });

    test('creates frontend target group with health check at /', () => {
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
            Port: 3000,
            Protocol: 'HTTP',
            TargetType: 'ip',
            HealthCheckPath: '/',
        });
    });

    test('creates two target groups', () => {
        template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 2);
    });

    test('creates listener rule for /api/* path', () => {
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
            Conditions: Match.arrayWith([
                Match.objectLike({
                    Field: 'path-pattern',
                    PathPatternConfig: {
                        Values: ['/api/*'],
                    },
                }),
            ]),
        });
    });

    test('creates two ECS Fargate services', () => {
        template.resourceCountIs('AWS::ECS::Service', 2);
    });

    test('backend Fargate service has desiredCount 1 in staging', () => {
        template.hasResourceProperties('AWS::ECS::Service', {
            DesiredCount: 1,
            LaunchType: 'FARGATE',
        });
    });

    test('creates two Fargate task definitions', () => {
        template.resourceCountIs('AWS::ECS::TaskDefinition', 2);
    });

    test('backend task definition has correct CPU/memory for staging', () => {
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
            Cpu: '512',
            Memory: '1024',
            RequiresCompatibilities: ['FARGATE'],
        });
    });

    test('frontend task definition has correct CPU/memory for staging', () => {
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
            Cpu: '256',
            Memory: '512',
            RequiresCompatibilities: ['FARGATE'],
        });
    });

    test('creates task execution role with ECR pull permissions', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: Match.arrayWith([
                            'ecr:GetDownloadUrlForLayer',
                            'ecr:BatchGetImage',
                            'ecr:GetAuthorizationToken',
                        ]),
                        Effect: 'Allow',
                    }),
                ]),
            },
        });
    });

    test('creates backend task role with Secrets Manager read', () => {
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

    test('creates backend task role with S3 read/write', () => {
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

    test('configures auto-scaling for services', () => {
        template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MinCapacity: 1,
            MaxCapacity: 2,
        });
    });

    test('configures target tracking scaling policy on CPU', () => {
        template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            TargetTrackingScalingPolicyConfiguration: Match.objectLike({
                TargetValue: 70,
                PredefinedMetricSpecification: {
                    PredefinedMetricType: 'ECSServiceAverageCPUUtilization',
                },
            }),
        });
    });
});

describe('ComputeStack — Production', () => {
    let template: Template;

    beforeAll(() => {
        template = createComputeStack('production');
    });

    test('production backend task definition has 1024 CPU and 2048 memory', () => {
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
            Cpu: '1024',
            Memory: '2048',
            RequiresCompatibilities: ['FARGATE'],
        });
    });

    test('production frontend task definition has 512 CPU and 1024 memory', () => {
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
            Cpu: '512',
            Memory: '1024',
            RequiresCompatibilities: ['FARGATE'],
        });
    });

    test('production backend auto-scaling has maxCapacity 6', () => {
        template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MinCapacity: 2,
            MaxCapacity: 6,
        });
    });

    test('production frontend auto-scaling has maxCapacity 4', () => {
        template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MinCapacity: 2,
            MaxCapacity: 4,
        });
    });

    test('production services have desiredCount 2', () => {
        template.hasResourceProperties('AWS::ECS::Service', {
            DesiredCount: 2,
            LaunchType: 'FARGATE',
        });
    });
});
