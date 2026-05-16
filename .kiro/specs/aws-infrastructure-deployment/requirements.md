# Requirements: AWS Infrastructure Deployment

## 1. Project Setup

1.1. The infrastructure code MUST live in `src/infra/` as a standalone CDK project with its own `package.json`, `tsconfig.json`, and `cdk.json`.

1.2. The IaC tool MUST be AWS CDK with TypeScript to maintain language consistency with the rest of the project.

1.3. The CDK project MUST use modular stacks (NetworkStack, DataStack, ComputeStack, CdnStack, MonitoringStack, CiStack) with explicit cross-stack dependencies.

1.4. The project MUST support two deployment environments: `staging` and `production`, selectable via CDK context (`-c env=staging`).

1.5. The CDK project MUST include a `jest.config.ts` for infrastructure unit tests using `aws-cdk-lib/assertions`.

## 2. Networking (NetworkStack)

2.1. The stack MUST create a VPC with CIDR `10.0.0.0/16` spanning 2 availability zones.

2.2. The VPC MUST have public subnets (for NAT Gateway placement), private subnets (for VPC Connector egress), and isolated subnets (for data stores — no internet access).

2.3. At least one NAT Gateway MUST be provisioned in a public subnet for VPC Connector outbound internet access.

2.4. A VPC Connector security group MUST be created that allows outbound traffic only to the data security group on ports 5432 (PostgreSQL) and 6379 (Redis).

2.5. A data security group MUST be created that allows inbound traffic only from the VPC Connector security group on ports 5432 and 6379.

2.6. VPC Flow Logs MUST be enabled and sent to CloudWatch Logs for network audit.

2.7. An EC2 Instance Connect Endpoint MUST be provisioned in the VPC to allow secure, tunneled access to RDS from developer machines without a bastion host or public IP. Access is controlled via IAM policies (no SSH keys, no open inbound ports).

2.8. A dedicated security group for the EC2 Instance Connect Endpoint MUST be created, allowing outbound to the data security group on port 5432 only. The data security group MUST allow inbound from this EIC security group on port 5432.

## 3. Data Stores (DataStack)

3.1. An RDS PostgreSQL 16 instance MUST be provisioned in isolated subnets with storage encryption enabled (AWS KMS).

3.2. For production, the RDS instance MUST be Multi-AZ with deletion protection enabled. For staging, single-AZ with deletion protection disabled.

3.3. Database credentials MUST be auto-generated and stored in AWS Secrets Manager with automatic rotation configured.

3.4. Automated backups MUST be configured: 30 days retention for production, 7 days for staging.

3.5. An ElastiCache Redis 7 cluster MUST be provisioned in private subnets with encryption at rest and in transit enabled.

3.6. An S3 bucket MUST be created for object storage (contracts, payment receipts, property photos) with:
  - Versioning enabled
  - Server-side encryption (SSE-S3)
  - Public access blocked (bucket policy)
  - CORS configured for the application domain
  - Lifecycle rules for cost optimization (Intelligent-Tiering)

## 4. Compute (ComputeStack — App Runner)

4.1. Two App Runner services MUST be created: one for the NestJS backend and one for the Next.js frontend.

4.2. The backend App Runner service MUST have a VPC Connector attached to reach RDS and Redis in private/isolated subnets.

4.3. The frontend App Runner service MUST NOT have a VPC Connector (it calls the backend via its public URL).

4.4. Auto-scaling MUST be configured per environment:
  - Staging: `minInstances: 0` (scale to zero), `maxInstances: 2`
  - Production: `minInstances: 1` (warm instance), `maxInstances: 6` (backend) / `4` (frontend)

4.5. Health checks MUST be configured: backend at `/api/health`, frontend at `/`.

4.6. Auto-deploy MUST be enabled: pushing a new image to ECR automatically triggers a new App Runner deployment.

4.7. App Runner services MUST use IAM instance roles with least-privilege permissions (Secrets Manager read, S3 read/write, CloudWatch logs).

## 5. Environment Variable Injection

5.1. ALL environment variables MUST be defined in CDK code — zero manual configuration in the AWS Console.

5.2. Non-sensitive environment variables (DB host, Redis host, S3 bucket name, port, NODE_ENV) MUST be injected via App Runner `runtimeEnvironmentVariables` using CDK cross-stack references.

5.3. Sensitive environment variables (JWT_SECRET, PII_ENCRYPTION_KEY, DB password) MUST be injected via App Runner `runtimeEnvironmentSecrets` referencing Secrets Manager ARNs.

5.4. The DATABASE_URL MUST be constructed from RDS construct outputs (endpoint address, port) combined with Secrets Manager credentials.

5.5. The frontend MUST receive the backend service URL as `NEXT_PUBLIC_API_URL`, resolved from the backend App Runner service construct.

5.6. Application secrets (JWT_SECRET, PII_ENCRYPTION_KEY) MUST be auto-generated via Secrets Manager `generateSecretString` during initial deployment.

5.7. Running `cdk deploy` on a fresh AWS account MUST produce a fully configured, working environment with no manual steps beyond AWS credential setup and CDK bootstrap.

## 6. CDN and Security (CdnStack)

6.1. A CloudFront distribution MUST be created with three origins:
  - Backend App Runner service URL (for `/api/*` paths)
  - Frontend App Runner service URL (default behavior)
  - S3 bucket (for `/assets/*` paths)

6.2. Cache behaviors MUST be configured:
  - `/api/*`: no caching (pass-through to backend)
  - `/assets/*`: 1-year cache with S3 origin
  - Default (`/*`): short cache or no cache (frontend SSR)

6.3. A WAF Web ACL MUST be attached to the CloudFront distribution with:
  - Rate limiting (2000 requests per 5 minutes per IP)
  - AWS Managed Rules: Common Rule Set
  - AWS Managed Rules: Known Bad Inputs
  - SQL injection protection
  - XSS protection

6.4. TLS 1.2 MUST be the minimum protocol version on CloudFront.

6.5. Compression (gzip and Brotli) MUST be enabled on CloudFront for performance.

6.6. If a custom domain is provided, an ACM certificate MUST be provisioned and attached to the distribution.

## 7. Container Images (CiStack)

7.1. Two ECR repositories MUST be created: one for the backend image and one for the frontend image.

7.2. ECR image scanning MUST be enabled for vulnerability detection on push.

7.3. A lifecycle policy MUST be configured to retain only the last 10 images (cost optimization).

7.4. An IAM role MUST be created for CI/CD (GitHub Actions) with permissions to push images to ECR and trigger CDK deployments.

## 8. IAM and Security Groups (Least Privilege)

8.1. Every IAM role MUST follow the principle of least privilege — only the permissions required for the specific service/task.

8.2. The App Runner instance role (backend) MUST have permissions limited to:
  - `secretsmanager:GetSecretValue` on specific secret ARNs only (DB, JWT, PII key)
  - `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the assets bucket only
  - `logs:CreateLogStream`, `logs:PutLogEvents` for CloudWatch logging

8.3. The App Runner instance role (frontend) MUST have permissions limited to:
  - `logs:CreateLogStream`, `logs:PutLogEvents` for CloudWatch logging
  - No S3, no Secrets Manager, no database access

8.4. The App Runner ECR access role MUST have permissions limited to:
  - `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:GetAuthorizationToken` on the specific ECR repositories only

8.5. The CI/CD role (GitHub Actions) MUST have permissions limited to:
  - `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:CompleteLayerUpload` on specific repos
  - `sts:AssumeRole` for CDK deployment role
  - `cloudformation:*` scoped to the application stacks only

8.6. The EC2 Instance Connect Endpoint access MUST be controlled via IAM policy — only authorized developers can open tunnels to the database.

8.7. All security groups MUST deny all traffic by default (AWS default) and explicitly allow only required ports from required sources. No `0.0.0.0/0` inbound rules on any security group.

8.8. The S3 bucket MUST have a bucket policy that denies all public access and allows access only from the backend App Runner instance role and CloudFront Origin Access Control (OAC).

## 9. Monitoring (MonitoringStack)

9.1. CloudWatch alarms MUST be configured for:
  - API response latency > 800ms (p95) — aligned with project quality target
  - Error rate (5xx) > 1%
  - RDS CPU utilization > 80%
  - RDS free storage < 20%

9.2. An SNS topic MUST be created for alarm notifications (email subscription).

9.3. CloudWatch log groups MUST be created with retention policies: 30 days for staging, 90 days for production.

9.4. A CloudWatch dashboard MUST be created showing key metrics: request count, latency percentiles, error rates, DB connections, Redis hit rate.

## 10. Dockerfiles

10.1. A multi-stage Dockerfile MUST be created for the NestJS backend (`src/infra/docker/backend.Dockerfile`) that:
  - Uses a Node.js 20 Alpine base image
  - Installs production dependencies only
  - Runs Prisma generate
  - Exposes port 3000
  - Runs the compiled NestJS application

10.2. A multi-stage Dockerfile MUST be created for the Next.js frontend (`src/infra/docker/frontend.Dockerfile`) that:
  - Uses a Node.js 20 Alpine base image
  - Builds the Next.js application
  - Uses Next.js standalone output for minimal image size
  - Exposes port 3000

## 11. Testing

11.1. CDK assertion tests MUST verify: VPC CIDR, subnet isolation, RDS encryption enabled, Multi-AZ for production, App Runner VPC Connector attachment, security group rules.

11.2. Snapshot tests MUST be included to detect unintended infrastructure changes.

11.3. All tests MUST pass before deployment (enforced in CI pipeline).

## 12. Documentation and Developer Experience

12.1. A README.md MUST be created in `src/infra/` with:
  - Prerequisites (AWS CLI, CDK CLI, Docker)
  - Bootstrap instructions (`cdk bootstrap`)
  - Deploy commands for staging and production
  - How to add new environment variables
  - How to connect to the database via EC2 Instance Connect Endpoint
  - Architecture diagram reference

12.2. The `.env.example` at the project root MUST be updated to document which env vars are managed by CDK in deployed environments vs. set locally for development.
