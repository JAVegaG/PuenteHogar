import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Template } from 'aws-cdk-lib/assertions';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

function createMonitoringStack(environment: 'staging' | 'production'): Template {
    const app = new cdk.App();

    // Create a mock stack with an RDS instance for the dependency
    const depStack = new cdk.Stack(app, 'DepStack');
    const vpc = new ec2.Vpc(depStack, 'Vpc');
    const dbInstance = new rds.DatabaseInstance(depStack, 'Database', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
        vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    });

    const stack = new MonitoringStack(app, 'TestMonitoring', {
        albArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-alb/abc123',
        albFullName: 'app/test-alb/abc123',
        backendTargetGroupFullName: 'targetgroup/backend-tg/def456',
        ecsClusterName: 'test-cluster',
        backendServiceName: 'test-backend-svc',
        frontendServiceName: 'test-frontend-svc',
        dbInstance,
        environment,
    });

    return Template.fromStack(stack);
}

describe('MonitoringStack — Staging', () => {
    let template: Template;

    beforeAll(() => {
        template = createMonitoringStack('staging');
    });

    test('creates an SNS topic for alarm notifications', () => {
        template.resourceCountIs('AWS::SNS::Topic', 1);
    });

    test('creates API latency alarm with 0.8s threshold (ALB reports in seconds)', () => {
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
            Threshold: 0.8,
            ComparisonOperator: 'GreaterThanThreshold',
        });
    });

    test('creates 5xx error rate alarm with 1% threshold', () => {
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
            Threshold: 1,
            ComparisonOperator: 'GreaterThanThreshold',
        });
    });

    test('creates RDS CPU utilization alarm with 80% threshold', () => {
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
            Threshold: 80,
            ComparisonOperator: 'GreaterThanThreshold',
        });
    });

    test('creates RDS free storage alarm with LessThanThreshold comparison', () => {
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
            ComparisonOperator: 'LessThanThreshold',
        });
    });

    test('creates at least 4 CloudWatch alarms', () => {
        const alarms = template.findResources('AWS::CloudWatch::Alarm');
        expect(Object.keys(alarms).length).toBeGreaterThanOrEqual(4);
    });

    test('all alarms have alarm actions pointing to SNS topic', () => {
        const alarms = template.findResources('AWS::CloudWatch::Alarm');
        for (const [, alarm] of Object.entries(alarms)) {
            const props = (alarm as any).Properties;
            expect(props.AlarmActions).toBeDefined();
            expect(props.AlarmActions.length).toBeGreaterThan(0);
        }
    });

    test('creates CloudWatch log groups', () => {
        const logGroups = template.findResources('AWS::Logs::LogGroup');
        expect(Object.keys(logGroups).length).toBeGreaterThanOrEqual(2);
    });

    test('staging log groups have 30-day retention', () => {
        template.hasResourceProperties('AWS::Logs::LogGroup', {
            RetentionInDays: 30,
        });
    });

    test('creates a CloudWatch dashboard', () => {
        template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    });
});

describe('MonitoringStack — Production', () => {
    let template: Template;

    beforeAll(() => {
        template = createMonitoringStack('production');
    });

    test('production log groups have 90-day retention', () => {
        template.hasResourceProperties('AWS::Logs::LogGroup', {
            RetentionInDays: 90,
        });
    });
});
