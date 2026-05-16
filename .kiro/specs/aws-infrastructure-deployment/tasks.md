# Tasks: AWS Infrastructure Deployment

## 1. CDK Project Initialization
- [x] 1.1 Create `src/infra/` directory with `package.json` including dependencies: `aws-cdk-lib`, `constructs`, `typescript`, `ts-node`, `jest`, `ts-jest`, `@types/jest`
- [x] 1.2 Create `tsconfig.json` with strict TypeScript configuration matching the project's style
- [x] 1.3 Create `cdk.json` with app entry point (`bin/app.ts`) and context defaults
- [x] 1.4 Create `jest.config.ts` for CDK assertion tests
- [x] 1.5 Create `bin/app.ts` entry point that instantiates all stacks based on environment context (`-c env=staging|production`)
- [x] 1.6 Create `lib/config/environments.ts` with staging and production `EnvironmentConfig` objects
- [x] 1.7 Create `lib/config/index.ts` with `getConfig(env)` function that returns the appropriate config

**Checkpoint**: Run `npx cdk synth` — should produce empty CloudFormation templates without errors.

## 2. NetworkStack
- [x] 2.1 Create `lib/stacks/network-stack.ts` with VPC (CIDR `10.0.0.0/16`, 2 AZs, private + isolated subnets, NAT Gateway)
- [x] 2.2 Create VPC Connector security group (outbound to data SG on ports 5432, 6379 only)
- [x] 2.3 Create data security group (inbound from VPC Connector SG on ports 5432, 6379 only)
- [x] 2.4 Create EC2 Instance Connect Endpoint in the VPC for secure developer access to RDS
- [x] 2.5 Create EIC Endpoint security group (outbound to data SG on port 5432 only); update data SG to allow inbound from EIC SG
- [x] 2.6 Enable VPC Flow Logs to CloudWatch Logs
- [x] 2.7 Export all outputs (vpc, subnets, security groups) as stack properties for cross-stack references

**Checkpoint**: Run `npx cdk synth` and verify NetworkStack template contains VPC, subnets, NAT Gateway, security groups, and EIC Endpoint resources.

## 3. DataStack
- [x] 3.1 Create `lib/stacks/data-stack.ts` accepting NetworkStack outputs as props
- [x] 3.2 Create Secrets Manager secret for database credentials (auto-generated password)
- [x] 3.3 Create RDS PostgreSQL 16 instance in isolated subnets with: encryption enabled, data security group, backup retention per environment, Multi-AZ for production
- [x] 3.4 Create ElastiCache Redis 7 replication group in private subnets with encryption at rest and in transit
- [x] 3.5 Create S3 bucket with: versioning, SSE-S3 encryption, block public access, CORS configuration, Intelligent-Tiering lifecycle rule
- [x] 3.6 Create Secrets Manager secrets for application secrets (JWT_SECRET, PII_ENCRYPTION_KEY) with auto-generated values
- [x] 3.7 Export all outputs (dbInstance, dbSecret, redisEndpoint, assetsBucket, application secrets) as stack properties

**Checkpoint**: Run `npx cdk synth` and verify DataStack template contains RDS, ElastiCache, S3, and Secrets Manager resources with correct encryption settings.

## 4. CiStack (ECR Repositories)
- [x] 4.1 Create `lib/stacks/ci-stack.ts` with two ECR repositories (backend, frontend)
- [x] 4.2 Enable image scanning on push for both repositories
- [x] 4.3 Configure lifecycle policy to retain last 10 images
- [x] 4.4 Create IAM role for GitHub Actions CI/CD with scoped permissions (ECR push, CDK deploy)
- [x] 4.5 Export repository URIs and CI role ARN as stack outputs

**Checkpoint**: Run `npx cdk synth` and verify CiStack template contains ECR repositories with scanning and lifecycle policies.

## 5. ComputeStack (App Runner)
- [x] 5.1 Create `lib/stacks/compute-stack.ts` accepting Network, Data, and Ci stack outputs as props
- [x] 5.2 Create VPC Connector pointing to private subnets with VPC Connector security group
- [x] 5.3 Create IAM instance role for backend (Secrets Manager read on specific ARNs, S3 read/write on assets bucket, CloudWatch logs)
- [x] 5.4 Create IAM instance role for frontend (CloudWatch logs only — no S3, no Secrets Manager)
- [x] 5.5 Create IAM ECR access role (pull permissions on specific repos only)
- [x] 5.6 Create App Runner auto-scaling configuration per environment (minInstances, maxInstances, maxConcurrency)
- [x] 5.7 Create backend App Runner service with: ECR image source, VPC Connector, instance role, environment variables from CDK cross-stack refs, secrets from Secrets Manager ARNs, health check at `/api/health`, auto-deploy enabled
- [x] 5.8 Create frontend App Runner service with: ECR image source, no VPC Connector, instance role, environment variables (NEXT_PUBLIC_API_URL from backend service URL), health check at `/`, auto-deploy enabled
- [x] 5.9 Export service URLs and ARNs as stack outputs

**Checkpoint**: Run `npx cdk synth` and verify ComputeStack template contains App Runner services, VPC Connector, IAM roles with correct policy statements, and auto-scaling configurations.

## 6. CdnStack (CloudFront + WAF)
- [x] 6.1 Create `lib/stacks/cdn-stack.ts` accepting Compute and Data stack outputs as props
- [x] 6.2 Create WAF Web ACL with: rate limiting (2000 req/5min/IP), AWS Common Rule Set, Known Bad Inputs, SQLi protection, XSS protection
- [x] 6.3 Create CloudFront distribution with three origins: backend App Runner URL, frontend App Runner URL, S3 bucket (OAI)
- [x] 6.4 Configure cache behaviors: `/api/*` → backend (no cache), `/assets/*` → S3 (1-year cache), default → frontend
- [x] 6.5 Enable compression (gzip + Brotli), set minimum TLS 1.2, enable HTTP/2
- [x] 6.6 Conditionally create ACM certificate and attach to distribution if `domainName` is provided in config
- [x] 6.7 Update S3 bucket policy to allow access only from CloudFront OAI and backend instance role

**Checkpoint**: Run `npx cdk synth` and verify CdnStack template contains CloudFront distribution, WAF ACL, and correct cache behaviors.

## 7. MonitoringStack
- [x] 7.1 Create `lib/stacks/monitoring-stack.ts` accepting Compute and Data stack outputs as props
- [x] 7.2 Create SNS topic for alarm notifications with email subscription parameter
- [x] 7.3 Create CloudWatch alarms: API latency > 800ms (p95), 5xx error rate > 1%, RDS CPU > 80%, RDS free storage < 20%
- [x] 7.4 Create CloudWatch log groups with retention: 30 days (staging), 90 days (production)
- [x] 7.5 Create CloudWatch dashboard with key metrics: request count, latency percentiles, error rates, DB connections

**Checkpoint**: Run `npx cdk synth` and verify MonitoringStack template contains alarms, SNS topic, log groups, and dashboard.

## 8. Dockerfiles
- [x] 8.1 Create `src/infra/docker/backend.Dockerfile` — multi-stage build: install deps → build → production image (Node 20 Alpine, Prisma generate, port 3000)
- [x] 8.2 Create `src/infra/docker/frontend.Dockerfile` — multi-stage build: install deps → build → standalone output (Node 20 Alpine, port 3000)
- [x] 8.3 Create `.dockerignore` files to exclude `node_modules`, `.git`, test files from build context
- [x] 8.4 Verify both Dockerfiles build successfully locally: `docker build -f src/infra/docker/backend.Dockerfile ./src/backend` and `docker build -f src/infra/docker/frontend.Dockerfile ./src/frontend`

**Checkpoint**: Both Docker images build successfully and containers start without errors locally.

## 9. CDK Tests
- [x] 9.1 Create `test/network-stack.test.ts` — verify VPC CIDR, subnet count, security group rules, EIC Endpoint
- [x] 9.2 Create `test/data-stack.test.ts` — verify RDS encryption, Multi-AZ (production), backup retention, S3 encryption and public access block
- [x] 9.3 Create `test/compute-stack.test.ts` — verify App Runner services, VPC Connector attachment, IAM role policies (least privilege), auto-scaling config
- [x] 9.4 Create `test/cdn-stack.test.ts` — verify CloudFront origins, cache behaviors, WAF attachment, TLS minimum version
- [x] 9.5 Create `test/monitoring-stack.test.ts` — verify alarms exist with correct thresholds
- [x] 9.6 Add snapshot tests for all stacks to detect unintended changes
- [x] 9.7 Run full test suite: `npm test` — all tests must pass

**Checkpoint**: All CDK tests pass (`npm test` exits with code 0).

## 10. Documentation
- [x] 10.1 Create `src/infra/README.md` with: prerequisites, bootstrap instructions, deploy commands, env var management guide, database access via EIC Endpoint, architecture diagram reference
- [x] 10.2 Update project root `.env.example` to document which env vars are CDK-managed in deployed environments vs. locally configured
- [x] 10.3 Add `src/infra/` scripts to package.json: `synth`, `deploy:staging`, `deploy:production`, `test`, `diff`

**Checkpoint**: README is complete and all documented commands work correctly.

## 11. Final Validation
- [x] 11.1 Run `npx cdk synth --all -c env=staging` — verify all stacks synthesize without errors
- [x] 11.2 Run `npx cdk synth --all -c env=production` — verify production config differences (Multi-AZ, minInstances: 1, larger instances)
- [x] 11.3 Run `npm test` — all CDK assertion and snapshot tests pass
- [x] 11.4 Run `npx cdk diff -c env=staging` — review the full changeset that would be deployed (this will fail without AWS credentials, which is expected — just verify the synth works)
- [x] 11.5 Verify no hardcoded secrets, account IDs, or sensitive values in any CDK code (all from env vars or Secrets Manager)

**Checkpoint**: Full CDK project synthesizes, tests pass, and is ready for first deployment.

## 12. Manual QA and post-implementation review
- [x] Deploy to staging environment (`cdk deploy --all -c env=staging`) and verify:
  - All stacks deploy successfully without errors
  - App Runner services start and pass health checks
  - Backend can connect to RDS and Redis via VPC Connector
  - Frontend can reach backend API
  - CloudFront distribution serves traffic correctly
  - S3 uploads work from backend
  - EC2 Instance Connect Endpoint allows database tunnel from developer machine
  - WAF blocks rate-limited requests
  - CloudWatch alarms and dashboard are populated
- [x] Document any issues found as new requirements in a "Post-Implementation Findings" section
- [x] Add corresponding design notes and implementation tasks for each finding
- [x] Re-run tests after fixes
