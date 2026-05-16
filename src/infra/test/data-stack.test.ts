import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { NetworkStack } from '../lib/stacks/network-stack';
import { DataStack } from '../lib/stacks/data-stack';

function createDataStack(environment: 'staging' | 'production'): Template {
    const app = new cdk.App();
    const network = new NetworkStack(app, 'TestNetwork', {
        environment,
        maxAzs: 2,
        natGateways: 1,
    });
    const data = new DataStack(app, 'TestData', {
        vpc: network.vpc,
        dataSubnets: network.dataSubnets,
        dataSecurityGroup: network.dataSecurityGroup,
        environment,
    });
    return Template.fromStack(data);
}

describe('DataStack — Staging', () => {
    let template: Template;

    beforeAll(() => {
        template = createDataStack('staging');
    });

    test('creates an RDS PostgreSQL instance with encryption enabled', () => {
        template.hasResourceProperties('AWS::RDS::DBInstance', {
            Engine: 'postgres',
            StorageEncrypted: true,
        });
    });

    test('staging RDS is single-AZ', () => {
        template.hasResourceProperties('AWS::RDS::DBInstance', {
            MultiAZ: false,
        });
    });

    test('staging RDS has 7-day backup retention', () => {
        template.hasResourceProperties('AWS::RDS::DBInstance', {
            BackupRetentionPeriod: 7,
        });
    });

    test('staging RDS has deletion protection disabled', () => {
        template.hasResourceProperties('AWS::RDS::DBInstance', {
            DeletionProtection: false,
        });
    });

    test('creates S3 bucket with SSE-S3 encryption', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            BucketEncryption: {
                ServerSideEncryptionConfiguration: [
                    {
                        ServerSideEncryptionByDefault: {
                            SSEAlgorithm: 'AES256',
                        },
                    },
                ],
            },
        });
    });

    test('creates S3 bucket with public access blocked', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true,
            },
        });
    });

    test('creates S3 bucket with versioning enabled', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            VersioningConfiguration: {
                Status: 'Enabled',
            },
        });
    });

    test('creates Secrets Manager secret for database credentials', () => {
        template.hasResourceProperties('AWS::SecretsManager::Secret', {
            GenerateSecretString: Match.objectLike({
                GenerateStringKey: 'password',
            }),
        });
    });

    test('creates ElastiCache Redis replication group with encryption at rest', () => {
        template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
            AtRestEncryptionEnabled: true,
        });
    });

    test('creates ElastiCache Redis replication group with encryption in transit', () => {
        template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
            TransitEncryptionEnabled: true,
        });
    });
});

describe('DataStack — Production', () => {
    let template: Template;

    beforeAll(() => {
        template = createDataStack('production');
    });

    test('production RDS is Multi-AZ', () => {
        template.hasResourceProperties('AWS::RDS::DBInstance', {
            MultiAZ: true,
        });
    });

    test('production RDS has 30-day backup retention', () => {
        template.hasResourceProperties('AWS::RDS::DBInstance', {
            BackupRetentionPeriod: 30,
        });
    });

    test('production RDS has deletion protection enabled', () => {
        template.hasResourceProperties('AWS::RDS::DBInstance', {
            DeletionProtection: true,
        });
    });

    test('production RDS uses db.t3.medium instance class', () => {
        template.hasResourceProperties('AWS::RDS::DBInstance', {
            DBInstanceClass: 'db.t3.medium',
        });
    });
});
