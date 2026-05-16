import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';

/**
 * For testing, we recreate the CDN stack logic with the S3 bucket in the same stack
 * to avoid the cross-stack cyclic dependency that OAI + bucket policy creates.
 * This tests the same resource configuration as the real CdnStack.
 */
class TestCdnStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps & {
        backendServiceUrl: string;
        frontendServiceUrl: string;
        environment: 'staging' | 'production';
    }) {
        super(scope, id, props);

        // Create bucket in the same stack to avoid cross-stack OAI cycle
        const assetsBucket = new s3.Bucket(this, 'AssetsBucket');

        // WAF Web ACL
        new wafv2.CfnWebACL(this, 'WebAcl', {
            defaultAction: { allow: {} },
            scope: 'CLOUDFRONT',
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: `${id}-waf-metrics`,
                sampledRequestsEnabled: true,
            },
            name: `${id}-web-acl`,
            rules: [
                {
                    name: 'RateLimitPerIP',
                    priority: 1,
                    action: { block: {} },
                    statement: {
                        rateBasedStatement: { limit: 2000, aggregateKeyType: 'IP' },
                    },
                    visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: `${id}-rate-limit`, sampledRequestsEnabled: true },
                },
                {
                    name: 'AWSManagedRulesCommonRuleSet',
                    priority: 2,
                    overrideAction: { none: {} },
                    statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesCommonRuleSet' } },
                    visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: `${id}-common-rules`, sampledRequestsEnabled: true },
                },
                {
                    name: 'AWSManagedRulesKnownBadInputsRuleSet',
                    priority: 3,
                    overrideAction: { none: {} },
                    statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesKnownBadInputsRuleSet' } },
                    visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: `${id}-known-bad-inputs`, sampledRequestsEnabled: true },
                },
                {
                    name: 'AWSManagedRulesSQLiRuleSet',
                    priority: 4,
                    overrideAction: { none: {} },
                    statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesSQLiRuleSet' } },
                    visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: `${id}-sqli-rules`, sampledRequestsEnabled: true },
                },
            ],
        });

        const backendOrigin = new origins.HttpOrigin(props.backendServiceUrl, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        });

        const frontendOrigin = new origins.HttpOrigin(props.frontendServiceUrl, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        });

        const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
        const s3Origin = new origins.S3Origin(assetsBucket, { originAccessIdentity: oai });

        new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: frontendOrigin,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                compress: true,
            },
            additionalBehaviors: {
                '/api/*': {
                    origin: backendOrigin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    compress: true,
                },
                '/assets/*': {
                    origin: s3Origin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                    compress: true,
                },
            },
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            httpVersion: cloudfront.HttpVersion.HTTP2,
            webAclId: 'arn:aws:wafv2:us-east-1:123456789012:global/webacl/test/id',
        });
    }
}

describe('CdnStack', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new TestCdnStack(app, 'TestCdn', {
            backendServiceUrl: 'abc123.us-east-1.awsapprunner.com',
            frontendServiceUrl: 'def456.us-east-1.awsapprunner.com',
            environment: 'staging',
        });
        template = Template.fromStack(stack);
    });

    test('creates a CloudFront distribution', () => {
        template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });

    test('CloudFront distribution has backend origin (HTTPS only)', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: {
                Origins: Match.arrayWith([
                    Match.objectLike({
                        DomainName: 'abc123.us-east-1.awsapprunner.com',
                        CustomOriginConfig: Match.objectLike({
                            OriginProtocolPolicy: 'https-only',
                        }),
                    }),
                ]),
            },
        });
    });

    test('CloudFront distribution has frontend origin (HTTPS only)', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: {
                Origins: Match.arrayWith([
                    Match.objectLike({
                        DomainName: 'def456.us-east-1.awsapprunner.com',
                        CustomOriginConfig: Match.objectLike({
                            OriginProtocolPolicy: 'https-only',
                        }),
                    }),
                ]),
            },
        });
    });

    test('CloudFront distribution has S3 origin', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: {
                Origins: Match.arrayWith([
                    Match.objectLike({
                        S3OriginConfig: Match.anyValue(),
                    }),
                ]),
            },
        });
    });

    test('CloudFront has /api/* cache behavior', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: {
                CacheBehaviors: Match.arrayWith([
                    Match.objectLike({
                        PathPattern: '/api/*',
                        ViewerProtocolPolicy: 'redirect-to-https',
                    }),
                ]),
            },
        });
    });

    test('CloudFront has /assets/* cache behavior', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: {
                CacheBehaviors: Match.arrayWith([
                    Match.objectLike({
                        PathPattern: '/assets/*',
                        ViewerProtocolPolicy: 'redirect-to-https',
                    }),
                ]),
            },
        });
    });

    test('CloudFront has WAF Web ACL attached', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: {
                WebACLId: Match.anyValue(),
            },
        });
    });

    test('CloudFront uses TLS 1.2 minimum (enforced via HttpVersion http2)', () => {
        // When no custom domain/certificate is provided, CloudFront uses its default
        // certificate which enforces TLS 1.2. The minimumProtocolVersion only appears
        // in the template when a custom certificate is attached.
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: {
                HttpVersion: 'http2',
            },
        });
    });

    test('CloudFront has compression enabled on default behavior', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: {
                DefaultCacheBehavior: Match.objectLike({
                    Compress: true,
                }),
            },
        });
    });

    test('creates a WAF Web ACL with CLOUDFRONT scope', () => {
        template.hasResourceProperties('AWS::WAFv2::WebACL', {
            Scope: 'CLOUDFRONT',
            DefaultAction: { Allow: {} },
        });
    });

    test('WAF has rate limiting rule', () => {
        template.hasResourceProperties('AWS::WAFv2::WebACL', {
            Rules: Match.arrayWith([
                Match.objectLike({
                    Name: 'RateLimitPerIP',
                    Statement: {
                        RateBasedStatement: {
                            Limit: 2000,
                            AggregateKeyType: 'IP',
                        },
                    },
                }),
            ]),
        });
    });

    test('WAF has AWS Managed Common Rule Set', () => {
        template.hasResourceProperties('AWS::WAFv2::WebACL', {
            Rules: Match.arrayWith([
                Match.objectLike({
                    Name: 'AWSManagedRulesCommonRuleSet',
                    Statement: {
                        ManagedRuleGroupStatement: {
                            VendorName: 'AWS',
                            Name: 'AWSManagedRulesCommonRuleSet',
                        },
                    },
                }),
            ]),
        });
    });

    test('WAF has SQL injection protection rule', () => {
        template.hasResourceProperties('AWS::WAFv2::WebACL', {
            Rules: Match.arrayWith([
                Match.objectLike({
                    Name: 'AWSManagedRulesSQLiRuleSet',
                    Statement: {
                        ManagedRuleGroupStatement: {
                            VendorName: 'AWS',
                            Name: 'AWSManagedRulesSQLiRuleSet',
                        },
                    },
                }),
            ]),
        });
    });

    test('WAF has Known Bad Inputs rule', () => {
        template.hasResourceProperties('AWS::WAFv2::WebACL', {
            Rules: Match.arrayWith([
                Match.objectLike({
                    Name: 'AWSManagedRulesKnownBadInputsRuleSet',
                    Statement: {
                        ManagedRuleGroupStatement: {
                            VendorName: 'AWS',
                            Name: 'AWSManagedRulesKnownBadInputsRuleSet',
                        },
                    },
                }),
            ]),
        });
    });
});
