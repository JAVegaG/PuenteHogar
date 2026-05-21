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
    public readonly publicSubnets: ec2.ISubnet[];
    public readonly privateSubnets: ec2.ISubnet[];
    public readonly dataSubnets: ec2.ISubnet[];
    public readonly ecsServiceSecurityGroup: ec2.ISecurityGroup;
    public readonly albSecurityGroup: ec2.ISecurityGroup;
    public readonly dataSecurityGroup: ec2.ISecurityGroup;

    // Override availabilityZones to avoid AWS API calls during synthesis
    get availabilityZones(): string[] {
        const region = this.region;
        return [`${region}a`, `${region}b`];
    }

    constructor(scope: Construct, id: string, props: NetworkStackProps) {
        super(scope, id, props);

        // VPC with CIDR 10.0.0.0/16, 2 AZs, public + private + isolated subnets, NAT Gateway
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

        // Data security group (inbound rules added below)
        const dataSg = new ec2.SecurityGroup(this, 'DataSecurityGroup', {
            vpc,
            description: 'Security group for data stores (RDS, Redis)',
            allowAllOutbound: false,
        });

        // ECS Service security group (outbound to data SG on ports 5432, 6379; outbound to internet for ECR pulls)
        const ecsServiceSg = new ec2.SecurityGroup(this, 'EcsServiceSecurityGroup', {
            vpc,
            description: 'Security group for ECS Fargate services',
            allowAllOutbound: false,
        });

        ecsServiceSg.addEgressRule(
            dataSg,
            ec2.Port.tcp(5432),
            'Allow outbound to data SG on PostgreSQL port',
        );
        ecsServiceSg.addEgressRule(
            dataSg,
            ec2.Port.tcp(6379),
            'Allow outbound to data SG on Redis port',
        );
        // Outbound to internet on port 443 for ECR image pulls via NAT Gateway
        ecsServiceSg.addEgressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            'Allow outbound HTTPS for ECR image pulls via NAT',
        );

        // Data SG inbound from ECS Service SG on ports 5432, 6379
        dataSg.addIngressRule(
            ecsServiceSg,
            ec2.Port.tcp(5432),
            'Allow inbound from ECS Service SG on PostgreSQL port',
        );
        dataSg.addIngressRule(
            ecsServiceSg,
            ec2.Port.tcp(6379),
            'Allow inbound from ECS Service SG on Redis port',
        );

        // ALB security group (inbound 80/443 from internet, outbound to ECS service SG on port 3000)
        const albSg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
            vpc,
            description: 'Security group for Application Load Balancer',
            allowAllOutbound: false,
        });

        albSg.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80),
            'Allow inbound HTTP from internet',
        );
        albSg.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            'Allow inbound HTTPS from internet',
        );
        albSg.addEgressRule(
            ecsServiceSg,
            ec2.Port.tcp(3000),
            'Allow outbound to ECS service SG on application port',
        );

        // ECS Service SG inbound from ALB SG on port 3000
        ecsServiceSg.addIngressRule(
            albSg,
            ec2.Port.tcp(3000),
            'Allow inbound from ALB on application port',
        );

        // VPC Flow Logs to CloudWatch Logs
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

        // Export all outputs as stack properties for cross-stack references
        this.vpc = vpc;
        this.publicSubnets = vpc.selectSubnets({
            subnetType: ec2.SubnetType.PUBLIC,
        }).subnets;
        this.privateSubnets = vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }).subnets;
        this.dataSubnets = vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }).subnets;
        this.ecsServiceSecurityGroup = ecsServiceSg;
        this.albSecurityGroup = albSg;
        this.dataSecurityGroup = dataSg;
    }
}
