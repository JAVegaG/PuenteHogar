import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CiStack extends cdk.Stack {
    public readonly backendRepo: ecr.IRepository;
    public readonly frontendRepo: ecr.IRepository;
    public readonly ciRoleArn: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 4.1 — Two ECR repositories (backend, frontend)
        // 4.2 — Image scanning on push enabled
        const backendRepo = new ecr.Repository(this, 'BackendRepo', {
            repositoryName: `${this.stackName.toLowerCase()}-backend`,
            imageScanOnPush: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const frontendRepo = new ecr.Repository(this, 'FrontendRepo', {
            repositoryName: `${this.stackName.toLowerCase()}-frontend`,
            imageScanOnPush: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // 4.3 — Lifecycle policy to retain last 10 images
        const lifecycleRule: ecr.LifecycleRule = {
            maxImageCount: 10,
            description: 'Retain only the last 10 images',
        };

        backendRepo.addLifecycleRule(lifecycleRule);
        frontendRepo.addLifecycleRule(lifecycleRule);

        // 4.4 — IAM role for GitHub Actions CI/CD with OIDC federation
        const githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
            url: 'https://token.actions.githubusercontent.com',
            clientIds: ['sts.amazonaws.com'],
            thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
        });

        const ciRole = new iam.Role(this, 'GitHubActionsCiRole', {
            roleName: `${this.stackName}-github-actions-ci`,
            assumedBy: new iam.FederatedPrincipal(
                githubOidcProvider.openIdConnectProviderArn,
                {
                    StringEquals: {
                        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                    },
                    StringLike: {
                        'token.actions.githubusercontent.com:sub': 'repo:*',
                    },
                },
                'sts:AssumeRoleWithWebIdentity',
            ),
            description: 'IAM role for GitHub Actions CI/CD pipeline',
        });

        // ECR push permissions scoped to specific repositories
        ciRole.addToPolicy(new iam.PolicyStatement({
            sid: 'EcrPushToRepos',
            effect: iam.Effect.ALLOW,
            actions: [
                'ecr:PutImage',
                'ecr:InitiateLayerUpload',
                'ecr:CompleteLayerUpload',
                'ecr:UploadLayerPart',
                'ecr:BatchCheckLayerAvailability',
            ],
            resources: [
                backendRepo.repositoryArn,
                frontendRepo.repositoryArn,
            ],
        }));

        // ECR GetAuthorizationToken (required for docker login, not resource-scoped)
        ciRole.addToPolicy(new iam.PolicyStatement({
            sid: 'EcrGetAuthToken',
            effect: iam.Effect.ALLOW,
            actions: ['ecr:GetAuthorizationToken'],
            resources: ['*'],
        }));

        // STS AssumeRole for CDK deployment
        ciRole.addToPolicy(new iam.PolicyStatement({
            sid: 'CdkDeployAssumeRole',
            effect: iam.Effect.ALLOW,
            actions: ['sts:AssumeRole'],
            resources: [
                `arn:aws:iam::${this.account}:role/cdk-*`,
            ],
        }));

        // 4.5 — Export repository URIs and CI role ARN as stack outputs
        this.backendRepo = backendRepo;
        this.frontendRepo = frontendRepo;
        this.ciRoleArn = ciRole.roleArn;

        new cdk.CfnOutput(this, 'BackendRepoUri', {
            value: backendRepo.repositoryUri,
            description: 'Backend ECR repository URI',
        });

        new cdk.CfnOutput(this, 'FrontendRepoUri', {
            value: frontendRepo.repositoryUri,
            description: 'Frontend ECR repository URI',
        });

        new cdk.CfnOutput(this, 'CiRoleArn', {
            value: ciRole.roleArn,
            description: 'GitHub Actions CI/CD IAM role ARN',
        });
    }
}
