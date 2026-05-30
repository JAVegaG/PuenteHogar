import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface ComputeStackProps extends cdk.StackProps {
    readonly vpc: ec2.IVpc;
    readonly privateSubnets: ec2.ISubnet[];
    readonly publicSubnets: ec2.ISubnet[];
    readonly ecsServiceSecurityGroup: ec2.ISecurityGroup;
    readonly albSecurityGroup: ec2.ISecurityGroup;
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
    public readonly albDnsName: string;
    public readonly albArn: string;
    public readonly albFullName: string;
    public readonly backendTargetGroupFullName: string;
    public readonly backendServiceArn: string;
    public readonly frontendServiceArn: string;
    public readonly ecsClusterName: string;
    public readonly backendServiceName: string;
    public readonly frontendServiceName: string;

    constructor(scope: Construct, id: string, props: ComputeStackProps) {
        super(scope, id, props);

        const isProduction = props.environment === 'production';

        // ─────────────────────────────────────────────────────────────────────
        // 5.2 — ECS Cluster
        // ─────────────────────────────────────────────────────────────────────
        const cluster = new ecs.Cluster(this, 'EcsCluster', {
            clusterName: `${id}-cluster`.toLowerCase(),
            vpc: props.vpc,
            containerInsightsV2: isProduction ? ecs.ContainerInsights.ENHANCED : ecs.ContainerInsights.DISABLED,
        });

        // ─────────────────────────────────────────────────────────────────────
        // 5.3 — Application Load Balancer
        // ─────────────────────────────────────────────────────────────────────
        const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
            vpc: props.vpc,
            internetFacing: true,
            securityGroup: props.albSecurityGroup,
            vpcSubnets: { subnets: props.publicSubnets },
        });

        // HTTP listener on port 80 (CloudFront connects to ALB via HTTP)
        const httpListener = alb.addListener('HttpListener', {
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            open: false,
        });

        // ─────────────────────────────────────────────────────────────────────
        // 5.4 — Backend Target Group
        // ─────────────────────────────────────────────────────────────────────
        const backendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'BackendTargetGroup', {
            vpc: props.vpc,
            port: 3000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                path: '/api/health',
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
                healthyHttpCodes: '200',
            },
            deregistrationDelay: cdk.Duration.seconds(30),
        });

        // ─────────────────────────────────────────────────────────────────────
        // 5.5 — Frontend Target Group
        // ─────────────────────────────────────────────────────────────────────
        const frontendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'FrontendTargetGroup', {
            vpc: props.vpc,
            port: 3000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                path: '/',
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
                healthyHttpCodes: '200',
            },
            deregistrationDelay: cdk.Duration.seconds(30),
        });

        // ─────────────────────────────────────────────────────────────────────
        // 5.6 — Listener Rules: /api/* → backend, default → frontend
        // ─────────────────────────────────────────────────────────────────────
        httpListener.addAction('DefaultAction', {
            action: elbv2.ListenerAction.forward([frontendTargetGroup]),
        });

        httpListener.addAction('ApiRoute', {
            priority: 10,
            conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
            action: elbv2.ListenerAction.forward([backendTargetGroup]),
        });

        // ─────────────────────────────────────────────────────────────────────
        // 5.7 — Task Execution Role (ECR pull + Secrets Manager read + CloudWatch logs)
        // ─────────────────────────────────────────────────────────────────────
        const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            description: 'ECS task execution role for pulling images and injecting secrets',
        });

        taskExecutionRole.addToPolicy(new iam.PolicyStatement({
            sid: 'EcrPull',
            effect: iam.Effect.ALLOW,
            actions: [
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:GetAuthorizationToken',
            ],
            resources: ['*'],
        }));

        taskExecutionRole.addToPolicy(new iam.PolicyStatement({
            sid: 'SecretsManagerRead',
            effect: iam.Effect.ALLOW,
            actions: ['secretsmanager:GetSecretValue'],
            resources: [
                props.dbSecret.secretArn,
                props.jwtSecret.secretArn,
                props.piiKeySecret.secretArn,
            ],
        }));

        taskExecutionRole.addToPolicy(new iam.PolicyStatement({
            sid: 'CloudWatchLogs',
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));

        // ─────────────────────────────────────────────────────────────────────
        // 5.8 — Backend Task Role (Secrets Manager + S3 + CloudWatch)
        // ─────────────────────────────────────────────────────────────────────
        const backendTaskRole = new iam.Role(this, 'BackendTaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            description: 'Task role for backend ECS service',
        });

        backendTaskRole.addToPolicy(new iam.PolicyStatement({
            sid: 'SecretsManagerRead',
            effect: iam.Effect.ALLOW,
            actions: ['secretsmanager:GetSecretValue'],
            resources: [
                props.dbSecret.secretArn,
                props.jwtSecret.secretArn,
                props.piiKeySecret.secretArn,
            ],
        }));

        backendTaskRole.addToPolicy(new iam.PolicyStatement({
            sid: 'S3ReadWrite',
            effect: iam.Effect.ALLOW,
            actions: [
                's3:PutObject',
                's3:GetObject',
                's3:DeleteObject',
            ],
            resources: [`${props.assetsBucket.bucketArn}/*`],
        }));

        backendTaskRole.addToPolicy(new iam.PolicyStatement({
            sid: 'CloudWatchLogs',
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));

        backendTaskRole.addToPolicy(new iam.PolicyStatement({
            sid: 'SsmReadCdnDomain',
            effect: iam.Effect.ALLOW,
            actions: ['ssm:GetParameter'],
            resources: [
                `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/${props.environment}/cdn/domain`,
            ],
        }));

        // ─────────────────────────────────────────────────────────────────────
        // 5.9 — Frontend Task Role (CloudWatch logs only)
        // ─────────────────────────────────────────────────────────────────────
        const frontendTaskRole = new iam.Role(this, 'FrontendTaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            description: 'Task role for frontend ECS service',
        });

        frontendTaskRole.addToPolicy(new iam.PolicyStatement({
            sid: 'CloudWatchLogs',
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));

        // ─────────────────────────────────────────────────────────────────────
        // 5.10 — Backend Task Definition
        // ─────────────────────────────────────────────────────────────────────
        const backendLogGroup = new logs.LogGroup(this, 'BackendLogGroup', {
            logGroupName: `/ecs/${props.environment}/backend`,
            retention: isProduction ? logs.RetentionDays.THREE_MONTHS : logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const backendTaskDef = new ecs.FargateTaskDefinition(this, 'BackendTaskDef', {
            cpu: isProduction ? 1024 : 512,
            memoryLimitMiB: isProduction ? 2048 : 1024,
            executionRole: taskExecutionRole,
            taskRole: backendTaskRole,
            runtimePlatform: {
                cpuArchitecture: ecs.CpuArchitecture.X86_64,
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
            },
        });

        backendTaskDef.addContainer('BackendContainer', {
            image: ecs.ContainerImage.fromRegistry(props.backendImageUri),
            containerName: 'backend',
            portMappings: [{ containerPort: 3000, protocol: ecs.Protocol.TCP }],
            environment: {
                DB_HOST: props.dbEndpointAddress,
                DB_PORT: props.dbEndpointPort,
                DB_NAME: 'rental_platform',
                DB_USER: 'app_user',
                ...(props.redisEndpoint ? {
                    REDIS_HOST: props.redisEndpoint,
                    REDIS_PORT: '6379',
                    REDIS_URL: `redis://${props.redisEndpoint}:6379`,
                } : {}),
                S3_BUCKET_NAME: props.assetsBucket.bucketName,
                S3_REGION: cdk.Stack.of(this).region,
                OBJECT_STORAGE_BUCKET: props.assetsBucket.bucketName,
                OBJECT_STORAGE_REGION: cdk.Stack.of(this).region,
                CDN_SSM_PARAM: `/${props.environment}/cdn/domain`,
                NODE_ENV: isProduction ? 'production' : 'development',
                PORT: '3000',
            },
            secrets: {
                // Individual secret fields for the app to construct DATABASE_URL at runtime
                DB_PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
                JWT_SECRET: ecs.Secret.fromSecretsManager(props.jwtSecret),
                PII_ENCRYPTION_KEY: ecs.Secret.fromSecretsManager(props.piiKeySecret),
            },
            logging: ecs.LogDrivers.awsLogs({
                logGroup: backendLogGroup,
                streamPrefix: 'backend',
            }),
            essential: true,
        });

        // ─────────────────────────────────────────────────────────────────────
        // 5.11 — Frontend Task Definition
        // ─────────────────────────────────────────────────────────────────────
        const frontendLogGroup = new logs.LogGroup(this, 'FrontendLogGroup', {
            logGroupName: `/ecs/${props.environment}/frontend`,
            retention: isProduction ? logs.RetentionDays.THREE_MONTHS : logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const frontendTaskDef = new ecs.FargateTaskDefinition(this, 'FrontendTaskDef', {
            cpu: isProduction ? 512 : 256,
            memoryLimitMiB: isProduction ? 1024 : 512,
            executionRole: taskExecutionRole,
            taskRole: frontendTaskRole,
            runtimePlatform: {
                cpuArchitecture: ecs.CpuArchitecture.X86_64,
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
            },
        });

        frontendTaskDef.addContainer('FrontendContainer', {
            image: ecs.ContainerImage.fromRegistry(props.frontendImageUri),
            containerName: 'frontend',
            portMappings: [{ containerPort: 3000, protocol: ecs.Protocol.TCP }],
            environment: {
                NODE_ENV: isProduction ? 'production' : 'development',
                PORT: '3000',
            },
            logging: ecs.LogDrivers.awsLogs({
                logGroup: frontendLogGroup,
                streamPrefix: 'frontend',
            }),
            essential: true,
        });

        // ─────────────────────────────────────────────────────────────────────
        // 5.12 — Backend Fargate Service
        // ─────────────────────────────────────────────────────────────────────
        const backendService = new ecs.FargateService(this, 'BackendService', {
            cluster,
            taskDefinition: backendTaskDef,
            desiredCount: isProduction ? 2 : 1,
            securityGroups: [props.ecsServiceSecurityGroup],
            vpcSubnets: { subnets: props.privateSubnets },
            assignPublicIp: false,
            minHealthyPercent: 100,
            maxHealthyPercent: 200,
            serviceName: `${id}-backend-svc`.toLowerCase(),
            circuitBreaker: { rollback: true },
            healthCheckGracePeriod: cdk.Duration.seconds(120),
        });

        backendService.attachToApplicationTargetGroup(backendTargetGroup);

        // ─────────────────────────────────────────────────────────────────────
        // 5.13 — Frontend Fargate Service
        // ─────────────────────────────────────────────────────────────────────
        const frontendService = new ecs.FargateService(this, 'FrontendService', {
            cluster,
            taskDefinition: frontendTaskDef,
            desiredCount: isProduction ? 2 : 1,
            securityGroups: [props.ecsServiceSecurityGroup],
            vpcSubnets: { subnets: props.privateSubnets },
            assignPublicIp: false,
            minHealthyPercent: 100,
            maxHealthyPercent: 200,
            serviceName: `${id}-frontend-svc`.toLowerCase(),
            circuitBreaker: { rollback: true },
        });

        frontendService.attachToApplicationTargetGroup(frontendTargetGroup);

        // ─────────────────────────────────────────────────────────────────────
        // 5.14 — Auto Scaling (target tracking on CPU 70%)
        // ─────────────────────────────────────────────────────────────────────
        const backendScaling = backendService.autoScaleTaskCount({
            minCapacity: isProduction ? 2 : 1,
            maxCapacity: isProduction ? 6 : 2,
        });

        backendScaling.scaleOnCpuUtilization('BackendCpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });

        const frontendScaling = frontendService.autoScaleTaskCount({
            minCapacity: isProduction ? 2 : 1,
            maxCapacity: isProduction ? 4 : 2,
        });

        frontendScaling.scaleOnCpuUtilization('FrontendCpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });

        // ─────────────────────────────────────────────────────────────────────
        // 5.15 — Export outputs
        // ─────────────────────────────────────────────────────────────────────
        this.albDnsName = alb.loadBalancerDnsName;
        this.albArn = alb.loadBalancerArn;
        this.albFullName = alb.loadBalancerFullName;
        this.backendTargetGroupFullName = backendTargetGroup.targetGroupFullName;
        this.backendServiceArn = backendService.serviceArn;
        this.frontendServiceArn = frontendService.serviceArn;
        this.ecsClusterName = cluster.clusterName;
        this.backendServiceName = backendService.serviceName;
        this.frontendServiceName = frontendService.serviceName;

        new cdk.CfnOutput(this, 'AlbDnsName', {
            value: alb.loadBalancerDnsName,
            description: 'ALB DNS name',
        });

        new cdk.CfnOutput(this, 'AlbArn', {
            value: alb.loadBalancerArn,
            description: 'ALB ARN',
        });

        new cdk.CfnOutput(this, 'BackendServiceArn', {
            value: backendService.serviceArn,
            description: 'Backend ECS service ARN',
        });

        new cdk.CfnOutput(this, 'FrontendServiceArn', {
            value: frontendService.serviceArn,
            description: 'Frontend ECS service ARN',
        });
    }
}
