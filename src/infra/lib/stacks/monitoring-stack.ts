import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
    readonly backendServiceArn: string;
    readonly frontendServiceArn: string;
    readonly dbInstance: rds.IDatabaseInstance;
    readonly environment: 'staging' | 'production';
}

export class MonitoringStack extends cdk.Stack {
    public readonly alarmTopic: sns.ITopic;

    constructor(scope: Construct, id: string, props: MonitoringStackProps) {
        super(scope, id, props);

        const isProduction = props.environment === 'production';

        // Extract App Runner service name from ARN for metric dimensions
        // ARN format: arn:aws:apprunner:<region>:<account>:service/<service-name>/<service-id>
        const backendServiceName = cdk.Fn.select(
            0,
            cdk.Fn.split('/', cdk.Fn.select(5, cdk.Fn.split(':', props.backendServiceArn))),
        );

        // ─────────────────────────────────────────────────────────────────────────
        // 7.2 — SNS Topic for alarm notifications
        // ─────────────────────────────────────────────────────────────────────────

        const alarmTopic = new sns.Topic(this, 'AlarmNotificationTopic', {
            topicName: `${id}-alarm-notifications`,
            displayName: `${props.environment} Infrastructure Alarms`,
        });

        // Email subscription via CfnParameter (user provides email at deploy time)
        const alarmEmail = new cdk.CfnParameter(this, 'AlarmEmail', {
            type: 'String',
            description: 'Email address to receive alarm notifications. Leave empty to skip subscription.',
            default: '',
        });

        // Conditionally add email subscription if parameter is provided
        const hasEmail = new cdk.CfnCondition(this, 'HasAlarmEmail', {
            expression: cdk.Fn.conditionNot(
                cdk.Fn.conditionEquals(alarmEmail.valueAsString, ''),
            ),
        });

        const emailSubscription = new sns.CfnSubscription(this, 'AlarmEmailSubscription', {
            topicArn: alarmTopic.topicArn,
            protocol: 'email',
            endpoint: alarmEmail.valueAsString,
        });
        emailSubscription.cfnOptions.condition = hasEmail;

        this.alarmTopic = alarmTopic;

        // ─────────────────────────────────────────────────────────────────────────
        // 7.3 — CloudWatch Alarms
        // ─────────────────────────────────────────────────────────────────────────

        // Alarm 1: API latency > 800ms (p95) — App Runner metrics
        const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
            alarmName: `${id}-api-latency-p95`,
            alarmDescription: 'API response latency (p95) exceeds 800ms threshold',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/AppRunner',
                metricName: 'RequestLatency',
                dimensionsMap: {
                    ServiceName: backendServiceName,
                },
                statistic: 'p95',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 800, // milliseconds
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        apiLatencyAlarm.addAlarmAction(new AlarmSnsAction(alarmTopic));

        // Alarm 2: 5xx error rate > 1% — App Runner metrics
        const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
            alarmName: `${id}-5xx-error-rate`,
            alarmDescription: '5xx error rate exceeds 1% threshold',
            metric: new cloudwatch.MathExpression({
                expression: '(errors / requests) * 100',
                usingMetrics: {
                    errors: new cloudwatch.Metric({
                        namespace: 'AWS/AppRunner',
                        metricName: '5xxStatusResponses',
                        dimensionsMap: {
                            ServiceName: backendServiceName,
                        },
                        statistic: 'Sum',
                        period: cdk.Duration.minutes(5),
                    }),
                    requests: new cloudwatch.Metric({
                        namespace: 'AWS/AppRunner',
                        metricName: 'RequestCount',
                        dimensionsMap: {
                            ServiceName: backendServiceName,
                        },
                        statistic: 'Sum',
                        period: cdk.Duration.minutes(5),
                    }),
                },
                period: cdk.Duration.minutes(5),
            }),
            threshold: 1, // percent
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        errorRateAlarm.addAlarmAction(new AlarmSnsAction(alarmTopic));

        // Alarm 3: RDS CPU utilization > 80%
        const rdsCpuAlarm = new cloudwatch.Alarm(this, 'RdsCpuAlarm', {
            alarmName: `${id}-rds-cpu-utilization`,
            alarmDescription: 'RDS CPU utilization exceeds 80% threshold',
            metric: props.dbInstance.metricCPUUtilization({
                period: cdk.Duration.minutes(5),
                statistic: 'Average',
            }),
            threshold: 80, // percent
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.MISSING,
        });
        rdsCpuAlarm.addAlarmAction(new AlarmSnsAction(alarmTopic));

        // Alarm 4: RDS free storage < 20% (using FreeStorageSpace metric)
        const rdsFreeStorageAlarm = new cloudwatch.Alarm(this, 'RdsFreeStorageAlarm', {
            alarmName: `${id}-rds-free-storage`,
            alarmDescription: 'RDS free storage space is below 20% of allocated storage',
            metric: props.dbInstance.metricFreeStorageSpace({
                period: cdk.Duration.minutes(5),
                statistic: 'Average',
            }),
            // 20% of allocated storage (20 GB staging, 50 GB production) in bytes
            threshold: isProduction
                ? 50 * 1024 * 1024 * 1024 * 0.2  // 10 GB (20% of 50 GB)
                : 20 * 1024 * 1024 * 1024 * 0.2, //  4 GB (20% of 20 GB)
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.MISSING,
        });
        rdsFreeStorageAlarm.addAlarmAction(new AlarmSnsAction(alarmTopic));

        // ─────────────────────────────────────────────────────────────────────────
        // 7.4 — CloudWatch Log Groups with retention policies
        // ─────────────────────────────────────────────────────────────────────────

        const logRetentionDays = isProduction
            ? logs.RetentionDays.THREE_MONTHS  // 90 days
            : logs.RetentionDays.ONE_MONTH;    // 30 days

        new logs.LogGroup(this, 'BackendLogGroup', {
            logGroupName: `/apprunner/${props.environment}/backend`,
            retention: logRetentionDays,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        new logs.LogGroup(this, 'FrontendLogGroup', {
            logGroupName: `/apprunner/${props.environment}/frontend`,
            retention: logRetentionDays,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // ─────────────────────────────────────────────────────────────────────────
        // 7.5 — CloudWatch Dashboard
        // ─────────────────────────────────────────────────────────────────────────

        const dashboard = new cloudwatch.Dashboard(this, 'MonitoringDashboard', {
            dashboardName: `${id}-dashboard`,
        });

        // Row 1: Request Count
        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'Request Count',
                width: 12,
                left: [
                    new cloudwatch.Metric({
                        namespace: 'AWS/AppRunner',
                        metricName: 'RequestCount',
                        dimensionsMap: { ServiceName: backendServiceName },
                        statistic: 'Sum',
                        period: cdk.Duration.minutes(1),
                        label: 'Backend Requests',
                    }),
                ],
            }),
            new cloudwatch.GraphWidget({
                title: 'Error Rates',
                width: 12,
                left: [
                    new cloudwatch.Metric({
                        namespace: 'AWS/AppRunner',
                        metricName: '4xxStatusResponses',
                        dimensionsMap: { ServiceName: backendServiceName },
                        statistic: 'Sum',
                        period: cdk.Duration.minutes(1),
                        label: '4xx Errors',
                    }),
                    new cloudwatch.Metric({
                        namespace: 'AWS/AppRunner',
                        metricName: '5xxStatusResponses',
                        dimensionsMap: { ServiceName: backendServiceName },
                        statistic: 'Sum',
                        period: cdk.Duration.minutes(1),
                        label: '5xx Errors',
                    }),
                ],
            }),
        );

        // Row 2: Latency Percentiles
        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'Latency Percentiles',
                width: 12,
                left: [
                    new cloudwatch.Metric({
                        namespace: 'AWS/AppRunner',
                        metricName: 'RequestLatency',
                        dimensionsMap: { ServiceName: backendServiceName },
                        statistic: 'p50',
                        period: cdk.Duration.minutes(1),
                        label: 'p50',
                    }),
                    new cloudwatch.Metric({
                        namespace: 'AWS/AppRunner',
                        metricName: 'RequestLatency',
                        dimensionsMap: { ServiceName: backendServiceName },
                        statistic: 'p95',
                        period: cdk.Duration.minutes(1),
                        label: 'p95',
                    }),
                    new cloudwatch.Metric({
                        namespace: 'AWS/AppRunner',
                        metricName: 'RequestLatency',
                        dimensionsMap: { ServiceName: backendServiceName },
                        statistic: 'p99',
                        period: cdk.Duration.minutes(1),
                        label: 'p99',
                    }),
                ],
            }),
            new cloudwatch.GraphWidget({
                title: 'DB CPU Utilization',
                width: 12,
                left: [
                    props.dbInstance.metricCPUUtilization({
                        period: cdk.Duration.minutes(1),
                        statistic: 'Average',
                        label: 'CPU %',
                    }),
                ],
            }),
        );

        // Row 3: DB Connections
        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'DB Connections',
                width: 12,
                left: [
                    props.dbInstance.metricDatabaseConnections({
                        period: cdk.Duration.minutes(1),
                        statistic: 'Average',
                        label: 'Active Connections',
                    }),
                ],
            }),
            new cloudwatch.GraphWidget({
                title: 'DB Free Storage Space',
                width: 12,
                left: [
                    props.dbInstance.metricFreeStorageSpace({
                        period: cdk.Duration.minutes(5),
                        statistic: 'Average',
                        label: 'Free Storage (bytes)',
                    }),
                ],
            }),
        );

        // ─────────────────────────────────────────────────────────────────────────
        // Stack Outputs
        // ─────────────────────────────────────────────────────────────────────────

        new cdk.CfnOutput(this, 'AlarmTopicArn', {
            value: alarmTopic.topicArn,
            description: 'SNS topic ARN for alarm notifications',
        });

        new cdk.CfnOutput(this, 'DashboardUrl', {
            value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${id}-dashboard`,
            description: 'CloudWatch dashboard URL',
        });
    }
}

/**
 * Simple alarm action that publishes to an SNS topic.
 * Implements the IAlarmAction interface required by CloudWatch alarms.
 */
class AlarmSnsAction implements cloudwatch.IAlarmAction {
    constructor(private readonly topic: sns.ITopic) { }

    bind(_scope: Construct, _alarm: cloudwatch.IAlarm): cloudwatch.AlarmActionConfig {
        return {
            alarmActionArn: this.topic.topicArn,
        };
    }
}
