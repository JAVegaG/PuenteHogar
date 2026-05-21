import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
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
    public readonly bastionInstanceId: string;

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

        // SSM Bastion Instance for DB access via port forwarding
        const bastionSg = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
            vpc,
            description: 'Security group for SSM Bastion instance',
            allowAllOutbound: false,
        });

        bastionSg.addEgressRule(
            dataSg,
            ec2.Port.tcp(5432),
            'Allow outbound to data SG on PostgreSQL port',
        );

        // Allow inbound from bastion SG to data SG on port 5432
        dataSg.addIngressRule(
            bastionSg,
            ec2.Port.tcp(5432),
            'Allow inbound from Bastion SG on PostgreSQL port',
        );

        // IAM Role for SSM Session Manager access
        const bastionRole = new iam.Role(this, 'BastionRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            description: 'IAM role for SSM Bastion instance',
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
            ],
        });

        // SSM Bastion EC2 Instance (t4g.nano, ARM-based, Amazon Linux 2023)
        const bastionInstance = new ec2.Instance(this, 'BastionInstance', {
            vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
            machineImage: ec2.MachineImage.latestAmazonLinux2023({ cpuType: ec2.AmazonLinuxCpuType.ARM_64 }),
            securityGroup: bastionSg,
            role: bastionRole,
        });

        // Export bastion instance ID for developer convenience
        new cdk.CfnOutput(this, 'BastionInstanceId', {
            value: bastionInstance.instanceId,
            description: 'SSM Bastion instance ID for port forwarding to RDS',
            exportName: `${props.environment}-bastion-instance-id`,
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
        this.bastionInstanceId = bastionInstance.instanceId;
    }
}
