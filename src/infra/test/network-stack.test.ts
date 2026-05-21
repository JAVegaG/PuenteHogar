import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { NetworkStack } from '../lib/stacks/network-stack';

describe('NetworkStack', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new NetworkStack(app, 'TestNetwork', {
            environment: 'staging',
            maxAzs: 2,
            natGateways: 1,
        });
        template = Template.fromStack(stack);
    });

    test('creates a VPC with CIDR 10.0.0.0/16', () => {
        template.hasResourceProperties('AWS::EC2::VPC', {
            CidrBlock: '10.0.0.0/16',
        });
    });

    test('creates private subnets (PRIVATE_WITH_EGRESS)', () => {
        template.hasResourceProperties('AWS::EC2::Subnet', {
            MapPublicIpOnLaunch: false,
        });
    });

    test('creates at least 6 subnets (2 public + 2 private + 2 isolated across 2 AZs)', () => {
        const subnets = template.findResources('AWS::EC2::Subnet');
        expect(Object.keys(subnets).length).toBeGreaterThanOrEqual(6);
    });

    test('creates a NAT Gateway', () => {
        template.resourceCountIs('AWS::EC2::NatGateway', 1);
    });

    test('creates ECS service security group with outbound to data SG on port 5432', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
            IpProtocol: 'tcp',
            FromPort: 5432,
            ToPort: 5432,
        });
    });

    test('creates ECS service security group with outbound to data SG on port 6379', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
            IpProtocol: 'tcp',
            FromPort: 6379,
            ToPort: 6379,
        });
    });

    test('creates ECS service security group with outbound HTTPS for ECR pulls', () => {
        // CDK puts CIDR-based egress rules inline in the SecurityGroup resource
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
            SecurityGroupEgress: Match.arrayWith([
                Match.objectLike({
                    IpProtocol: 'tcp',
                    FromPort: 443,
                    ToPort: 443,
                    CidrIp: '0.0.0.0/0',
                }),
            ]),
        });
    });

    test('creates ALB security group with inbound HTTP from internet', () => {
        // CDK puts CIDR-based ingress rules inline in the SecurityGroup resource
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
            SecurityGroupIngress: Match.arrayWith([
                Match.objectLike({
                    IpProtocol: 'tcp',
                    FromPort: 80,
                    ToPort: 80,
                    CidrIp: '0.0.0.0/0',
                }),
            ]),
        });
    });

    test('creates ALB security group with inbound HTTPS from internet', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
            SecurityGroupIngress: Match.arrayWith([
                Match.objectLike({
                    IpProtocol: 'tcp',
                    FromPort: 443,
                    ToPort: 443,
                    CidrIp: '0.0.0.0/0',
                }),
            ]),
        });
    });

    test('creates ALB security group with outbound to ECS service SG on port 3000', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
            IpProtocol: 'tcp',
            FromPort: 3000,
            ToPort: 3000,
        });
    });

    test('creates ECS service SG with inbound from ALB on port 3000', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
            IpProtocol: 'tcp',
            FromPort: 3000,
            ToPort: 3000,
        });
    });

    test('creates data security group with inbound from ECS service SG on port 5432', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
            IpProtocol: 'tcp',
            FromPort: 5432,
            ToPort: 5432,
        });
    });

    test('creates data security group with inbound from ECS service SG on port 6379', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
            IpProtocol: 'tcp',
            FromPort: 6379,
            ToPort: 6379,
        });
    });

    test('enables VPC Flow Logs', () => {
        template.hasResourceProperties('AWS::EC2::FlowLog', {
            TrafficType: 'ALL',
        });
    });

    test('creates 4 security groups (ECS service, ALB, Data, Bastion)', () => {
        template.resourceCountIs('AWS::EC2::SecurityGroup', 4);
    });

    test('does not create an EC2 Instance Connect Endpoint', () => {
        template.resourceCountIs('AWS::EC2::InstanceConnectEndpoint', 0);
    });

    test('creates an SSM Bastion EC2 instance with t4g.nano', () => {
        template.hasResourceProperties('AWS::EC2::Instance', {
            InstanceType: 't4g.nano',
        });
    });

    test('creates an IAM role with AmazonSSMManagedInstanceCore policy', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            ManagedPolicyArns: Match.arrayWith([
                Match.objectLike({
                    'Fn::Join': Match.arrayWith([
                        Match.arrayWith([
                            Match.stringLikeRegexp('AmazonSSMManagedInstanceCore'),
                        ]),
                    ]),
                }),
            ]),
        });
    });

    test('creates an IAM instance profile for the bastion', () => {
        template.resourceCountIs('AWS::IAM::InstanceProfile', 1);
    });

    test('creates bastion security group with outbound to data SG on port 5432', () => {
        // Bastion SG has an egress rule to data SG on port 5432
        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
            IpProtocol: 'tcp',
            FromPort: 5432,
            ToPort: 5432,
            Description: 'Allow outbound to data SG on PostgreSQL port',
        });
    });

    test('creates data SG inbound rule from bastion SG on port 5432', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
            IpProtocol: 'tcp',
            FromPort: 5432,
            ToPort: 5432,
            Description: 'Allow inbound from Bastion SG on PostgreSQL port',
        });
    });

    test('exports bastion instance ID as a CfnOutput', () => {
        template.hasOutput('BastionInstanceId', {
            Description: 'SSM Bastion instance ID for port forwarding to RDS',
        });
    });
});
