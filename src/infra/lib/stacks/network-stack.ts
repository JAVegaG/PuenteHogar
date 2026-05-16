import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface NetworkStackProps extends cdk.StackProps {
    readonly environment: 'staging' | 'production';
    readonly maxAzs: number;
    readonly natGateways: number;
}

export class NetworkStack extends cdk.Stack {
    public readonly vpc: ec2.IVpc;
    public readonly privateSubnets: ec2.ISubnet[];
    public readonly dataSubnets: ec2.ISubnet[];
    public readonly vpcConnectorSecurityGroup: ec2.ISecurityGroup;
    public readonly dataSecurityGroup: ec2.ISecurityGroup;

    constructor(scope: Construct, id: string, props: NetworkStackProps) {
        super(scope, id, props);

        // 2.1 — VPC with CIDR 10.0.0.0/16, 2 AZs, public + private + isolated subnets, NAT Gateway
        const vpc = new ec2.Vpc(this, 'Vpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            maxAzs: props.maxAzs,
            natGateways: props.natGateways,
            subnetConfiguration: [
                {
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 24,
                },
                {
                    name: 'Data',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 24,
                },
            ],
        });

        // 2.3 — Data security group (inbound rules added below)
        const dataSg = new ec2.SecurityGroup(this, 'DataSecurityGroup', {
            vpc,
            description: 'Security group for data stores (RDS, Redis)',
            allowAllOutbound: false,
        });

        // 2.2 — VPC Connector security group (outbound to data SG on ports 5432, 6379 only)
        const vpcConnectorSg = new ec2.SecurityGroup(this, 'VpcConnectorSecurityGroup', {
            vpc,
            description: 'Security group for App Runner VPC Connector',
            allowAllOutbound: false,
        });

        vpcConnectorSg.addEgressRule(
            dataSg,
            ec2.Port.tcp(5432),
            'Allow outbound to data SG on PostgreSQL port',
        );
        vpcConnectorSg.addEgressRule(
            dataSg,
            ec2.Port.tcp(6379),
            'Allow outbound to data SG on Redis port',
        );

        // 2.3 — Data SG inbound from VPC Connector SG on ports 5432, 6379
        dataSg.addIngressRule(
            vpcConnectorSg,
            ec2.Port.tcp(5432),
            'Allow inbound from VPC Connector SG on PostgreSQL port',
        );
        dataSg.addIngressRule(
            vpcConnectorSg,
            ec2.Port.tcp(6379),
            'Allow inbound from VPC Connector SG on Redis port',
        );

        // 2.5 — EIC Endpoint security group (outbound to data SG on port 5432 only)
        const eicSg = new ec2.SecurityGroup(this, 'EicEndpointSecurityGroup', {
            vpc,
            description: 'Security group for EC2 Instance Connect Endpoint',
            allowAllOutbound: false,
        });

        eicSg.addEgressRule(
            dataSg,
            ec2.Port.tcp(5432),
            'Allow outbound to data SG on PostgreSQL port',
        );

        // 2.5 — Data SG also allows inbound from EIC SG on port 5432
        dataSg.addIngressRule(
            eicSg,
            ec2.Port.tcp(5432),
            'Allow inbound from EIC Endpoint SG on PostgreSQL port',
        );

        // 2.4 — EC2 Instance Connect Endpoint in the VPC for secure developer access to RDS
        new ec2.CfnInstanceConnectEndpoint(this, 'EicEndpoint', {
            subnetId: vpc.selectSubnets({
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            }).subnetIds[0],
            securityGroupIds: [eicSg.securityGroupId],
            preserveClientIp: false,
        });

        // 2.6 — VPC Flow Logs to CloudWatch Logs
        vpc.addFlowLog('FlowLog', {
            destination: ec2.FlowLogDestination.toCloudWatchLogs(
                new logs.LogGroup(this, 'VpcFlowLogGroup', {
                    retention: props.environment === 'production'
                        ? logs.RetentionDays.THREE_MONTHS
                        : logs.RetentionDays.ONE_MONTH,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                }),
            ),
            trafficType: ec2.FlowLogTrafficType.ALL,
        });

        // 2.7 — Export all outputs as stack properties for cross-stack references
        this.vpc = vpc;
        this.privateSubnets = vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }).subnets;
        this.dataSubnets = vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }).subnets;
        this.vpcConnectorSecurityGroup = vpcConnectorSg;
        this.dataSecurityGroup = dataSg;
    }
}
