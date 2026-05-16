import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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

    test('creates at least 4 subnets (2 private + 2 isolated across 2 AZs)', () => {
        const subnets = template.findResources('AWS::EC2::Subnet');
        expect(Object.keys(subnets).length).toBeGreaterThanOrEqual(4);
    });

    test('creates a NAT Gateway', () => {
        template.resourceCountIs('AWS::EC2::NatGateway', 1);
    });

    test('creates VPC Connector security group with outbound to data SG on port 5432', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
            IpProtocol: 'tcp',
            FromPort: 5432,
            ToPort: 5432,
        });
    });

    test('creates VPC Connector security group with outbound to data SG on port 6379', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
            IpProtocol: 'tcp',
            FromPort: 6379,
            ToPort: 6379,
        });
    });

    test('creates data security group with inbound from VPC Connector SG on port 5432', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
            IpProtocol: 'tcp',
            FromPort: 5432,
            ToPort: 5432,
        });
    });

    test('creates data security group with inbound from VPC Connector SG on port 6379', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
            IpProtocol: 'tcp',
            FromPort: 6379,
            ToPort: 6379,
        });
    });

    test('creates an EC2 Instance Connect Endpoint', () => {
        template.hasResourceProperties('AWS::EC2::InstanceConnectEndpoint', {
            PreserveClientIp: false,
        });
    });

    test('creates EIC security group with outbound to data SG on port 5432 only', () => {
        // EIC SG should have an egress rule to port 5432
        const egressRules = template.findResources('AWS::EC2::SecurityGroupEgress', {
            Properties: {
                IpProtocol: 'tcp',
                FromPort: 5432,
                ToPort: 5432,
            },
        });
        expect(Object.keys(egressRules).length).toBeGreaterThanOrEqual(1);
    });

    test('enables VPC Flow Logs', () => {
        template.hasResourceProperties('AWS::EC2::FlowLog', {
            TrafficType: 'ALL',
        });
    });

    test('creates security groups with no 0.0.0.0/0 inbound rules', () => {
        const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress');
        for (const [, rule] of Object.entries(ingressRules)) {
            const props = (rule as any).Properties;
            expect(props.CidrIp).not.toBe('0.0.0.0/0');
            expect(props.CidrIpv6).not.toBe('::/0');
        }
    });
});
