import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface CdnStackProps extends cdk.StackProps {
    readonly backendServiceUrl: string;
    readonly frontendServiceUrl: string;
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
        // 6.3 — CloudFront Origins
        // ─────────────────────────────────────────────────────────────────────

        // Origin 1: Backend App Runner URL
        const backendOrigin = new origins.HttpOrigin(props.backendServiceUrl, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        });

        // Origin 2: Frontend App Runner URL
        const frontendOrigin = new origins.HttpOrigin(props.frontendServiceUrl, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        });

        // Origin 3: S3 bucket with Origin Access Control (OAC)
        // Import the bucket from attributes to avoid cross-stack circular dependency.
        // When CDK manages the bucket policy automatically via OAC, it needs to modify
        // the bucket's stack — but since the bucket is in DataStack and the distribution
        // is in CdnStack, this creates a cycle. Importing by attributes breaks the link.
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
            // Default behavior: frontend (SSR — no cache)
            defaultBehavior: {
                origin: frontendOrigin,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
                compress: true,
            },
            additionalBehaviors: {
                // /api/* → backend origin (no cache, all methods)
                '/api/*': {
                    origin: backendOrigin,
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
            // Enable compression is handled per-behavior via `compress: true`
            comment: `${props.environment} CDN distribution`,
        });

        // ─────────────────────────────────────────────────────────────────────
        // 6.7 — S3 bucket access from CloudFront
        // ─────────────────────────────────────────────────────────────────────
        // With S3BucketOrigin.withOriginAccessControl() on an imported bucket, CDK
        // automatically creates the OAC and adds the necessary bucket policy to allow
        // CloudFront to read from the bucket — all within this stack.

        // Export outputs
        this.distribution = distribution;
        this.wafAcl = wafAcl;

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
