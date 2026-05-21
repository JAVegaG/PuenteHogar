import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DataStackProps extends cdk.StackProps {
    readonly vpc: ec2.IVpc;
    readonly dataSubnets: ec2.ISubnet[];
    readonly dataSecurityGroup: ec2.ISecurityGroup;
    readonly environment: 'staging' | 'production';
}

export class DataStack extends cdk.Stack {
    public readonly dbInstance: rds.IDatabaseInstance;
    public readonly dbSecret: secretsmanager.ISecret;
    public readonly redisEndpoint: string;
    public readonly assetsBucket: s3.IBucket;
    public readonly jwtSecret: secretsmanager.ISecret;
    public readonly piiKeySecret: secretsmanager.ISecret;

    constructor(scope: Construct, id: string, props: DataStackProps) {
        super(scope, id, props);

        const isProduction = props.environment === 'production';

        // 3.2 — Secrets Manager secret for database credentials (auto-generated password)
        const dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
            description: 'Database credentials for RDS PostgreSQL',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'app_user' }),
                generateStringKey: 'password',
                excludePunctuation: true,
                passwordLength: 32,
            },
        });

        // 3.3 — RDS PostgreSQL 16 instance in isolated subnets
        const subnetGroup = new rds.SubnetGroup(this, 'DbSubnetGroup', {
            description: 'Subnet group for RDS instance in isolated subnets',
            vpc: props.vpc,
            vpcSubnets: {
                subnets: props.dataSubnets,
            },
        });

        const dbInstance = new rds.DatabaseInstance(this, 'Database', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16,
            }),
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T3,
                isProduction ? ec2.InstanceSize.MEDIUM : ec2.InstanceSize.MICRO,
            ),
            vpc: props.vpc,
            subnetGroup,
            securityGroups: [props.dataSecurityGroup],
            credentials: rds.Credentials.fromSecret(dbSecret),
            databaseName: 'rental_platform',
            multiAz: isProduction,
            deletionProtection: isProduction,
            storageEncrypted: true,
            backupRetention: cdk.Duration.days(isProduction ? 30 : 7),
            allocatedStorage: isProduction ? 50 : 20,
            maxAllocatedStorage: isProduction ? 100 : 40,
            removalPolicy: isProduction
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });

        // 3.4 — ElastiCache Redis 7 replication group in isolated subnets
        // Conditionally skip ElastiCache in staging to reduce costs (~$12/month savings)
        let redisEndpointAddress = '';

        if (isProduction) {
            const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
                description: 'Subnet group for ElastiCache Redis in data subnets',
                subnetIds: props.dataSubnets.map(subnet => subnet.subnetId),
                cacheSubnetGroupName: `${id}-redis-subnets`.toLowerCase(),
            });

            const redisReplicationGroup = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
                replicationGroupDescription: 'ElastiCache Redis 7 cluster for application caching',
                engine: 'redis',
                engineVersion: '7.1',
                cacheNodeType: 'cache.t3.small',
                numCacheClusters: 2,
                automaticFailoverEnabled: true,
                cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName,
                securityGroupIds: [props.dataSecurityGroup.securityGroupId],
                atRestEncryptionEnabled: true,
                transitEncryptionEnabled: true,
                port: 6379,
            });

            redisReplicationGroup.addDependency(redisSubnetGroup);
            redisEndpointAddress = redisReplicationGroup.attrPrimaryEndPointAddress;
        }

        // 3.5 — S3 bucket with versioning, SSE-S3, block public access, CORS, lifecycle
        const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: isProduction
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: !isProduction,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.DELETE,
                    ],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    maxAge: 3600,
                },
            ],
            lifecycleRules: [
                {
                    id: 'IntelligentTiering',
                    enabled: true,
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INTELLIGENT_TIERING,
                            transitionAfter: cdk.Duration.days(30),
                        },
                    ],
                },
            ],
        });

        // 3.6 — Secrets Manager secrets for application secrets
        const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
            description: 'JWT signing secret for authentication',
            generateSecretString: {
                excludePunctuation: true,
                passwordLength: 64,
            },
        });

        const piiKeySecret = new secretsmanager.Secret(this, 'PiiEncryptionKey', {
            description: 'AES-256-CBC key for PII field encryption',
            generateSecretString: {
                excludePunctuation: true,
                passwordLength: 32,
            },
        });

        // 3.7 — Export all outputs as stack properties
        this.dbInstance = dbInstance;
        this.dbSecret = dbSecret;
        this.redisEndpoint = redisEndpointAddress;
        this.assetsBucket = assetsBucket;
        this.jwtSecret = jwtSecret;
        this.piiKeySecret = piiKeySecret;
    }
}
