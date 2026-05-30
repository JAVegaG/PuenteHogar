import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface CdnStackProps extends cdk.StackProps {
    readonly albDnsName: string;
    readonly assetsBucketArn: string;
    readonly assetsBucketName: string;
    readonly domainName?: string;
    readonly environment: 'staging' | 'production';
}

export class CdnStack extends cdk.Stack {
    public readonly distribution: cloudfront.IDistribution;
    public readonly wafAcl: wafv2.CfnWebACL;

    constructor(scope: Construct, id: string, props: CdnStackProps) {
        super(scope, id, props);

        // ─────────────────────────────────────────────────────────────────────
        // 6.2 — WAF Web ACL with rate limiting and managed rule sets
        // ─────────────────────────────────────────────────────────────────────
        const wafAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
            defaultAction: { allow: {} },
            scope: 'CLOUDFRONT',
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: `${id}-waf-metrics`,
                sampledRequestsEnabled: true,
            },
            name: `${id}-web-acl`,
            rules: [
                // Rule 1: Rate limiting — 2000 requests per 5 minutes per IP
                {
                    name: 'RateLimitPerIP',
                    priority: 1,
                    action: { block: {} },
                    statement: {
                        rateBasedStatement: {
                            limit: 2000,
                            aggregateKeyType: 'IP',
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: `${id}-rate-limit`,
                        sampledRequestsEnabled: true,
                    },
                },
                // Rule 2: AWS Managed Rules — Common Rule Set (includes XSS protection)
                {
                    name: 'AWSManagedRulesCommonRuleSet',
                    priority: 2,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesCommonRuleSet',
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: `${id}-common-rules`,
                        sampledRequestsEnabled: true,
                    },
                },
                // Rule 3: AWS Managed Rules — Known Bad Inputs
                {
                    name: 'AWSManagedRulesKnownBadInputsRuleSet',
                    priority: 3,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesKnownBadInputsRuleSet',
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: `${id}-known-bad-inputs`,
                        sampledRequestsEnabled: true,
                    },
                },
                // Rule 4: AWS Managed Rules — SQL Injection
                {
                    name: 'AWSManagedRulesSQLiRuleSet',
                    priority: 4,
                    overrideAction: { none: {} },
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesSQLiRuleSet',
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: `${id}-sqli-rules`,
                        sampledRequestsEnabled: true,
                    },
                },
            ],
        });

        // ─────────────────────────────────────────────────────────────────────
        // 6.6 — Conditionally create ACM certificate if domainName is provided
        // ─────────────────────────────────────────────────────────────────────
        let certificate: acm.ICertificate | undefined;

        if (props.domainName) {
            certificate = new acm.Certificate(this, 'Certificate', {
                domainName: props.domainName,
                subjectAlternativeNames: [`*.${props.domainName}`],
                validation: acm.CertificateValidation.fromDns(),
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // 6.3 — CloudFront Origins (ALB + S3)
        // ─────────────────────────────────────────────────────────────────────

        // Origin 1: ALB (HTTP only — CloudFront handles TLS termination)
        const albOrigin = new origins.HttpOrigin(props.albDnsName, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            httpPort: 80,
        });

        // Origin 2: S3 bucket with Origin Access Control (OAC)
        const importedBucket = s3.Bucket.fromBucketAttributes(this, 'ImportedAssetsBucket', {
            bucketArn: props.assetsBucketArn,
            bucketName: props.assetsBucketName,
        });
        const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(importedBucket);

        // ─────────────────────────────────────────────────────────────────────
        // 6.4 + 6.5 — CloudFront Distribution with cache behaviors, compression, TLS
        // ─────────────────────────────────────────────────────────────────────

        // Custom cache policy for S3 assets: 1-year max-age
        const assetsCachePolicy = new cloudfront.CachePolicy(this, 'AssetsCachePolicy', {
            cachePolicyName: `${id}-assets-1year`,
            defaultTtl: cdk.Duration.days(365),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(1),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
        });

        const distribution = new cloudfront.Distribution(this, 'Distribution', {
            // Default behavior: frontend (SSR — no cache) via ALB
            defaultBehavior: {
                origin: albOrigin,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
                compress: true,
            },
            additionalBehaviors: {
                // /api/* → ALB origin (no cache, all methods)
                '/api/*': {
                    origin: albOrigin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
                    compress: true,
                },
                // /assets/* → S3 origin (1-year cache)
                '/assets/*': {
                    origin: s3Origin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: assetsCachePolicy,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                    compress: true,
                },
            },
            // 6.5 — TLS 1.2 minimum, HTTP/2
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            httpVersion: cloudfront.HttpVersion.HTTP2,
            // WAF attachment
            webAclId: wafAcl.attrArn,
            // Certificate and domain (conditional)
            ...(certificate && props.domainName
                ? {
                    certificate,
                    domainNames: [props.domainName, `*.${props.domainName}`],
                }
                : {}),
            comment: `${props.environment} CDN distribution`,
        });

        // Export outputs
        this.distribution = distribution;
        this.wafAcl = wafAcl;

        // Store the distribution domain in SSM so the backend can read it at runtime.
        // This avoids a circular dependency (CDN depends on Compute, Compute can't depend on CDN).
        new cdk.aws_ssm.StringParameter(this, 'CdnDomainParam', {
            parameterName: `/${props.environment}/cdn/domain`,
            stringValue: distribution.distributionDomainName,
            description: 'CloudFront distribution domain name for asset URLs',
        });

        new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: distribution.distributionDomainName,
            description: 'CloudFront distribution domain name',
        });

        new cdk.CfnOutput(this, 'DistributionId', {
            value: distribution.distributionId,
            description: 'CloudFront distribution ID',
        });

        new cdk.CfnOutput(this, 'WebAclArn', {
            value: wafAcl.attrArn,
            description: 'WAF Web ACL ARN',
        });
    }
}
