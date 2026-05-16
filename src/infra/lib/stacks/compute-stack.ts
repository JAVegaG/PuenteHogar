import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import { Construct } from 'constructs';

export interface ComputeStackProps extends cdk.StackProps {
    readonly vpc: ec2.IVpc;
    readonly privateSubnets: ec2.ISubnet[];
    readonly vpcConnectorSecurityGroup: ec2.ISecurityGroup;
    readonly dbSecret: secretsmanager.ISecret;
    readonly jwtSecret: secretsmanager.ISecret;
    readonly piiKeySecret: secretsmanager.ISecret;
    readonly dbEndpointAddress: string;
    readonly dbEndpointPort: string;
    readonly redisEndpoint: string;
    readonly assetsBucket: s3.IBucket;
    readonly environment: 'staging' | 'production';
    readonly backendImageUri: string;
    readonly frontendImageUri: string;
    readonly backendRepoArn: string;
    readonly frontendRepoArn: string;
}

export class ComputeStack extends cdk.Stack {
    public readonly backendServiceUrl: string;
    public readonly frontendServiceUrl: string;
    public readonly backendServiceArn: string;
    public readonly frontendServiceArn: string;

    constructor(scope: Construct, id: string, props: ComputeStackProps) {
        super(scope, id, props);

        const isProduction = props.environment === 'production';

        // 5.2 — VPC Connector pointing to private subnets with VPC Connector security group
        const vpcConnector = new apprunner.CfnVpcConnector(this, 'VpcConnector', {
            subnets: props.privateSubnets.map(s => s.subnetId),
            securityGroups: [props.vpcConnectorSecurityGroup.securityGroupId],
            vpcConnectorName: `${id}-connector`.toLowerCase(),
        });

        // 5.3 — IAM instance role for backend
        const backendInstanceRole = new iam.Role(this, 'BackendInstanceRole', {
            assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
            description: 'Instance role for backend App Runner service',
        });

        // Secrets Manager read on specific secret ARNs
        backendInstanceRole.addToPolicy(new iam.PolicyStatement({
            sid: 'SecretsManagerRead',
            effect: iam.Effect.ALLOW,
            actions: ['secretsmanager:GetSecretValue'],
            resources: [
                props.dbSecret.secretArn,
                props.jwtSecret.secretArn,
                props.piiKeySecret.secretArn,
            ],
        }));

        // S3 read/write on assets bucket
        backendInstanceRole.addToPolicy(new iam.PolicyStatement({
            sid: 'S3ReadWrite',
            effect: iam.Effect.ALLOW,
            actions: [
                's3:PutObject',
                's3:GetObject',
                's3:DeleteObject',
            ],
            resources: [
                `${props.assetsBucket.bucketArn}/*`,
            ],
        }));

        // CloudWatch logs
        backendInstanceRole.addToPolicy(new iam.PolicyStatement({
            sid: 'CloudWatchLogs',
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));

        // 5.4 — IAM instance role for frontend (CloudWatch logs only)
        const frontendInstanceRole = new iam.Role(this, 'FrontendInstanceRole', {
            assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
            description: 'Instance role for frontend App Runner service',
        });

        frontendInstanceRole.addToPolicy(new iam.PolicyStatement({
            sid: 'CloudWatchLogs',
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));

        // 5.5 — IAM ECR access role (pull permissions on specific repos)
        const ecrAccessRole = new iam.Role(this, 'EcrAccessRole', {
            assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
            description: 'ECR access role for App Runner to pull images',
        });

        ecrAccessRole.addToPolicy(new iam.PolicyStatement({
            sid: 'EcrPullFromRepos',
            effect: iam.Effect.ALLOW,
            actions: [
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
            ],
            resources: [
                props.backendRepoArn,
                props.frontendRepoArn,
            ],
        }));

        ecrAccessRole.addToPolicy(new iam.PolicyStatement({
            sid: 'EcrGetAuthToken',
            effect: iam.Effect.ALLOW,
            actions: ['ecr:GetAuthorizationToken'],
            resources: ['*'],
        }));

        // 5.6 — App Runner auto-scaling configuration per environment
        const backendAutoScaling = new apprunner.CfnAutoScalingConfiguration(
            this,
            'BackendAutoScaling',
            {
                autoScalingConfigurationName: `${id}-backend-scaling`.toLowerCase(),
                minSize: isProduction ? 1 : 1, // App Runner minimum is 1
                maxSize: isProduction ? 6 : 2,
                maxConcurrency: isProduction ? 80 : 50,
            },
        );

        const frontendAutoScaling = new apprunner.CfnAutoScalingConfiguration(
            this,
            'FrontendAutoScaling',
            {
                autoScalingConfigurationName: `${id}-frontend-scaling`.toLowerCase(),
                minSize: isProduction ? 1 : 1, // App Runner minimum is 1
                maxSize: isProduction ? 4 : 2,
                maxConcurrency: isProduction ? 100 : 80,
            },
        );

        // 5.7 — Backend App Runner service
        const backendService = new apprunner.CfnService(this, 'BackendService', {
            serviceName: `${id}-backend`.toLowerCase(),
            sourceConfiguration: {
                imageRepository: {
                    imageIdentifier: props.backendImageUri,
                    imageRepositoryType: 'ECR',
                    imageConfiguration: {
                        port: '3000',
                        runtimeEnvironmentVariables: [
                            { name: 'DB_HOST', value: props.dbEndpointAddress },
                            { name: 'DB_PORT', value: props.dbEndpointPort },
                            { name: 'DB_NAME', value: 'rental_platform' },
                            { name: 'REDIS_HOST', value: props.redisEndpoint },
                            { name: 'REDIS_PORT', value: '6379' },
                            { name: 'S3_BUCKET_NAME', value: props.assetsBucket.bucketName },
                            { name: 'S3_REGION', value: cdk.Stack.of(this).region },
                            { name: 'NODE_ENV', value: isProduction ? 'production' : 'development' },
                            { name: 'PORT', value: '3000' },
                        ],
                        runtimeEnvironmentSecrets: [
                            { name: 'DB_SECRET', value: props.dbSecret.secretArn },
                            { name: 'JWT_SECRET', value: props.jwtSecret.secretArn },
                            { name: 'PII_ENCRYPTION_KEY', value: props.piiKeySecret.secretArn },
                        ],
                    },
                },
                autoDeploymentsEnabled: true,
                authenticationConfiguration: {
                    accessRoleArn: ecrAccessRole.roleArn,
                },
            },
            instanceConfiguration: {
                instanceRoleArn: backendInstanceRole.roleArn,
                cpu: String((isProduction ? 1 : 0.5) * 1024),
                memory: String((isProduction ? 2 : 1) * 1024),
            },
            autoScalingConfigurationArn: backendAutoScaling.attrAutoScalingConfigurationArn,
            healthCheckConfiguration: {
                protocol: 'HTTP',
                path: '/api/health',
                interval: 10,
                timeout: 5,
                healthyThreshold: 1,
                unhealthyThreshold: 3,
            },
            networkConfiguration: {
                egressConfiguration: {
                    egressType: 'VPC',
                    vpcConnectorArn: vpcConnector.attrVpcConnectorArn,
                },
            },
        });

        backendService.addDependency(vpcConnector);

        // 5.8 — Frontend App Runner service
        const frontendService = new apprunner.CfnService(this, 'FrontendService', {
            serviceName: `${id}-frontend`.toLowerCase(),
            sourceConfiguration: {
                imageRepository: {
                    imageIdentifier: props.frontendImageUri,
                    imageRepositoryType: 'ECR',
                    imageConfiguration: {
                        port: '3000',
                        runtimeEnvironmentVariables: [
                            {
                                name: 'NEXT_PUBLIC_API_URL',
                                value: cdk.Fn.join('', [
                                    'https://',
                                    backendService.attrServiceUrl,
                                ]),
                            },
                            { name: 'NODE_ENV', value: isProduction ? 'production' : 'development' },
                            { name: 'PORT', value: '3000' },
                        ],
                    },
                },
                autoDeploymentsEnabled: true,
                authenticationConfiguration: {
                    accessRoleArn: ecrAccessRole.roleArn,
                },
            },
            instanceConfiguration: {
                instanceRoleArn: frontendInstanceRole.roleArn,
                cpu: String((isProduction ? 0.5 : 0.25) * 1024),
                memory: String((isProduction ? 1 : 0.5) * 1024),
            },
            autoScalingConfigurationArn: frontendAutoScaling.attrAutoScalingConfigurationArn,
            healthCheckConfiguration: {
                protocol: 'HTTP',
                path: '/',
                interval: 10,
                timeout: 5,
                healthyThreshold: 1,
                unhealthyThreshold: 3,
            },
            networkConfiguration: {
                egressConfiguration: {
                    egressType: 'DEFAULT',
                },
            },
        });

        // 5.9 — Export service URLs and ARNs as stack outputs
        this.backendServiceUrl = backendService.attrServiceUrl;
        this.frontendServiceUrl = frontendService.attrServiceUrl;
        this.backendServiceArn = backendService.attrServiceArn;
        this.frontendServiceArn = frontendService.attrServiceArn;

        new cdk.CfnOutput(this, 'BackendServiceUrl', {
            value: backendService.attrServiceUrl,
            description: 'Backend App Runner service URL',
        });

        new cdk.CfnOutput(this, 'FrontendServiceUrl', {
            value: frontendService.attrServiceUrl,
            description: 'Frontend App Runner service URL',
        });

        new cdk.CfnOutput(this, 'BackendServiceArn', {
            value: backendService.attrServiceArn,
            description: 'Backend App Runner service ARN',
        });

        new cdk.CfnOutput(this, 'FrontendServiceArn', {
            value: frontendService.attrServiceArn,
            description: 'Frontend App Runner service ARN',
        });
    }
}
