import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
    readonly albArn: string;
    readonly albFullName: string;
    readonly backendTargetGroupFullName: string;
    readonly ecsClusterName: string;
    readonly backendServiceName: string;
    readonly frontendServiceName: string;
    readonly dbInstance: rds.IDatabaseInstance;
    readonly environment: 'staging' | 'production';
}

export class MonitoringStack extends cdk.Stack {
    public readonly alarmTopic: sns.ITopic;

    constructor(scope: Construct, id: string, props: MonitoringStackProps) {
        super(scope, id, props);

        const isProduction = props.environment === 'production';

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
        // 7.3 — CloudWatch Alarms (ALB/ECS metrics)
        // ─────────────────────────────────────────────────────────────────────────

        // Alarm 1: ALB Target Response Time (p95) > 800ms
        const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
            alarmName: `${id}-api-latency-p95`,
            alarmDescription: 'ALB target response time (p95) exceeds 800ms threshold',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApplicationELB',
                metricName: 'TargetResponseTime',
                dimensionsMap: {
                    LoadBalancer: props.albFullName,
                    TargetGroup: props.backendTargetGroupFullName,
                },
                statistic: 'p95',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 0.8, // seconds (ALB reports in seconds)
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        apiLatencyAlarm.addAlarmAction(new AlarmSnsAction(alarmTopic));

        // Alarm 2: 5xx error rate > 1%
        const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
            alarmName: `${id}-5xx-error-rate`,
            alarmDescription: '5xx error rate exceeds 1% threshold',
            metric: new cloudwatch.MathExpression({
                expression: '(errors / requests) * 100',
                usingMetrics: {
                    errors: new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'HTTPCode_Target_5XX_Count',
                        dimensionsMap: {
                            LoadBalancer: props.albFullName,
                            TargetGroup: props.backendTargetGroupFullName,
                        },
                        statistic: 'Sum',
                        period: cdk.Duration.minutes(5),
                    }),
                    requests: new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'RequestCount',
                        dimensionsMap: {
                            LoadBalancer: props.albFullName,
                            TargetGroup: props.backendTargetGroupFullName,
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
            logGroupName: `/ecs/${props.environment}/monitoring/backend`,
            retention: logRetentionDays,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        new logs.LogGroup(this, 'FrontendLogGroup', {
            logGroupName: `/ecs/${props.environment}/monitoring/frontend`,
            retention: logRetentionDays,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // ─────────────────────────────────────────────────────────────────────────
        // 7.5 — CloudWatch Dashboard
        // ─────────────────────────────────────────────────────────────────────────

        const dashboard = new cloudwatch.Dashboard(this, 'MonitoringDashboard', {
            dashboardName: `${id}-dashboard`,
        });

        // Row 1: ALB Request Count + HTTP Error Codes
        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'ALB Request Count',
                width: 12,
                left: [
                    new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'RequestCount',
                        dimensionsMap: { LoadBalancer: props.albFullName },
                        statistic: 'Sum',
                        period: cdk.Duration.minutes(1),
                        label: 'Total Requests',
                    }),
                ],
            }),
            new cloudwatch.GraphWidget({
                title: 'HTTP Error Codes',
                width: 12,
                left: [
                    new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'HTTPCode_Target_4XX_Count',
                        dimensionsMap: { LoadBalancer: props.albFullName },
                        statistic: 'Sum',
                        period: cdk.Duration.minutes(1),
                        label: '4xx Errors',
                    }),
                    new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'HTTPCode_Target_5XX_Count',
                        dimensionsMap: { LoadBalancer: props.albFullName },
                        statistic: 'Sum',
                        period: cdk.Duration.minutes(1),
                        label: '5xx Errors',
                    }),
                ],
            }),
        );

        // Row 2: Target Response Time + ECS CPU Utilization
        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'Target Response Time',
                width: 12,
                left: [
                    new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'TargetResponseTime',
                        dimensionsMap: { LoadBalancer: props.albFullName },
                        statistic: 'p50',
                        period: cdk.Duration.minutes(1),
                        label: 'p50',
                    }),
                    new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'TargetResponseTime',
                        dimensionsMap: { LoadBalancer: props.albFullName },
                        statistic: 'p95',
                        period: cdk.Duration.minutes(1),
                        label: 'p95',
                    }),
                    new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'TargetResponseTime',
                        dimensionsMap: { LoadBalancer: props.albFullName },
                        statistic: 'p99',
                        period: cdk.Duration.minutes(1),
                        label: 'p99',
                    }),
                ],
            }),
            new cloudwatch.GraphWidget({
                title: 'ECS CPU Utilization',
                width: 12,
                left: [
                    new cloudwatch.Metric({
                        namespace: 'AWS/ECS',
                        metricName: 'CPUUtilization',
                        dimensionsMap: {
                            ClusterName: props.ecsClusterName,
                            ServiceName: props.backendServiceName,
                        },
                        statistic: 'Average',
                        period: cdk.Duration.minutes(1),
                        label: 'Backend CPU %',
                    }),
                    new cloudwatch.Metric({
                        namespace: 'AWS/ECS',
                        metricName: 'CPUUtilization',
                        dimensionsMap: {
                            ClusterName: props.ecsClusterName,
                            ServiceName: props.frontendServiceName,
                        },
                        statistic: 'Average',
                        period: cdk.Duration.minutes(1),
                        label: 'Frontend CPU %',
                    }),
                ],
            }),
        );

        // Row 3: ECS Memory Utilization + DB Connections
        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'ECS Memory Utilization',
                width: 12,
                left: [
                    new cloudwatch.Metric({
                        namespace: 'AWS/ECS',
                        metricName: 'MemoryUtilization',
                        dimensionsMap: {
                            ClusterName: props.ecsClusterName,
                            ServiceName: props.backendServiceName,
                        },
                        statistic: 'Average',
                        period: cdk.Duration.minutes(1),
                        label: 'Backend Memory %',
                    }),
                    new cloudwatch.Metric({
                        namespace: 'AWS/ECS',
                        metricName: 'MemoryUtilization',
                        dimensionsMap: {
                            ClusterName: props.ecsClusterName,
                            ServiceName: props.frontendServiceName,
                        },
                        statistic: 'Average',
                        period: cdk.Duration.minutes(1),
                        label: 'Frontend Memory %',
                    }),
                ],
            }),
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
 */
class AlarmSnsAction implements cloudwatch.IAlarmAction {
    constructor(private readonly topic: sns.ITopic) { }

    bind(_scope: Construct, _alarm: cloudwatch.IAlarm): cloudwatch.AlarmActionConfig {
        return {
            alarmActionArn: this.topic.topicArn,
        };
    }
}
