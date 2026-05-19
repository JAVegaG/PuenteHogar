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
- [x] 2.1 Update `lib/stacks/network-stack.ts` — rename VPC Connector SG to ECS Service SG, add ALB security group, allow ECS SG outbound to internet (for ECR pulls)
- [x] 2.2 Create ECS service security group (outbound to data SG on ports 5432, 6379; outbound to internet via NAT for ECR pulls)
- [x] 2.3 Create data security group (inbound from ECS service SG on ports 5432, 6379 only)
- [x] 2.4 Create ALB security group (inbound 80/443 from 0.0.0.0/0, outbound to ECS service SG on port 3000)
- [x] 2.5 Create EC2 Instance Connect Endpoint in the VPC for secure developer access to RDS
- [x] 2.6 Create EIC Endpoint security group (outbound to data SG on port 5432 only); update data SG to allow inbound from EIC SG
- [x] 2.7 Enable VPC Flow Logs to CloudWatch Logs
- [x] 2.8 Export all outputs (vpc, subnets, security groups including ALB SG) as stack properties for cross-stack references

**Checkpoint**: Run `npx cdk synth` and verify NetworkStack template contains VPC, subnets, NAT Gateway, security groups (ECS, ALB, Data, EIC), and EIC Endpoint resources.

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

## 5. ComputeStack (ECS Fargate)
- [x] 5.1 Rewrite `lib/stacks/compute-stack.ts` to use ECS Fargate instead of App Runner, accepting Network, Data, and Ci stack outputs as props
- [x] 5.2 Create ECS Cluster
- [x] 5.3 Create Application Load Balancer (ALB) in public subnets with HTTP→HTTPS redirect and path-based routing
- [x] 5.4 Create backend target group with health check at `/api/health`
- [x] 5.5 Create frontend target group with health check at `/`
- [x] 5.6 Create ALB listener rules: `/api/*` → backend target group, default → frontend target group
- [x] 5.7 Create IAM task execution role (ECR pull, Secrets Manager read for secret injection, CloudWatch logs)
- [x] 5.8 Create IAM task role for backend (Secrets Manager read on specific ARNs, S3 read/write on assets bucket, CloudWatch logs)
- [x] 5.9 Create IAM task role for frontend (CloudWatch logs only — no S3, no Secrets Manager)
- [x] 5.10 Create backend ECS task definition with: ECR image, environment variables from CDK cross-stack refs, secrets from Secrets Manager ARNs, CPU/memory per environment
- [x] 5.11 Create frontend ECS task definition with: ECR image, environment variables (NEXT_PUBLIC_API_URL from ALB DNS), CPU/memory per environment
- [x] 5.12 Create backend ECS Fargate service in private subnets with ALB target group, desired count per environment
- [x] 5.13 Create frontend ECS Fargate service in private subnets with ALB target group, desired count per environment
- [x] 5.14 Configure ECS Service Auto Scaling (target tracking on CPU utilization 70%) per environment
- [x] 5.15 Export ALB DNS name, ALB ARN, and service ARNs as stack outputs

**Checkpoint**: Run `npx cdk synth` and verify ComputeStack template contains ECS cluster, ALB, Fargate services, task definitions, IAM roles, and auto-scaling configurations.

## 6. CdnStack (CloudFront + WAF)
- [x] 6.1 Update `lib/stacks/cdn-stack.ts` to use ALB as origin instead of App Runner URLs
- [x] 6.2 Create WAF Web ACL with: rate limiting (2000 req/5min/IP), AWS Common Rule Set, Known Bad Inputs, SQLi protection, XSS protection
- [x] 6.3 Create CloudFront distribution with two origins: ALB (for API and frontend), S3 bucket (OAC for /assets/*)
- [x] 6.4 Configure cache behaviors: `/api/*` → ALB (no cache), `/assets/*` → S3 (1-year cache), default → ALB (no cache, frontend SSR)
- [x] 6.5 Enable compression (gzip + Brotli), set minimum TLS 1.2, enable HTTP/2
- [x] 6.6 Conditionally create ACM certificate and attach to distribution if `domainName` is provided in config
- [x] 6.7 Update S3 bucket policy to allow access only from CloudFront OAC and backend task role

**Checkpoint**: Run `npx cdk synth` and verify CdnStack template contains CloudFront distribution, WAF ACL, and correct cache behaviors.

## 7. MonitoringStack
- [x] 7.1 Update `lib/stacks/monitoring-stack.ts` to use ECS/ALB metrics instead of App Runner metrics
- [x] 7.2 Create SNS topic for alarm notifications with email subscription parameter
- [x] 7.3 Create CloudWatch alarms: ALB target response time > 800ms (p95), 5xx error rate > 1%, RDS CPU > 80%, RDS free storage < 20%
- [x] 7.4 Create CloudWatch log groups with retention: 30 days (staging), 90 days (production)
- [x] 7.5 Create CloudWatch dashboard with key metrics: ALB request count, target response time percentiles, HTTP error rates, ECS CPU/memory utilization, DB connections

**Checkpoint**: Run `npx cdk synth` and verify MonitoringStack template contains alarms, SNS topic, log groups, and dashboard.

## 8. Dockerfiles
- [x] 8.1 Create `src/infra/docker/backend.Dockerfile` — multi-stage build: install deps → build → production image (Node 20 Alpine, Prisma generate, port 3000)
- [x] 8.2 Create `src/infra/docker/frontend.Dockerfile` — multi-stage build: install deps → build → standalone output (Node 20 Alpine, port 3000)
- [x] 8.3 Create `.dockerignore` files to exclude `node_modules`, `.git`, test files from build context
- [x] 8.4 Verify both Dockerfiles build successfully locally: `docker build -f src/infra/docker/backend.Dockerfile ./src/backend` and `docker build -f src/infra/docker/frontend.Dockerfile ./src/frontend`

**Checkpoint**: Both Docker images build successfully and containers start without errors locally.

## 9. CDK Tests
- [x] 9.1 Create `test/network-stack.test.ts` — verify VPC CIDR, subnet count, security group rules, EIC Endpoint
- [x] 9.2 Update `test/data-stack.test.ts` — verify RDS encryption, Multi-AZ (production), backup retention, S3 encryption and public access block
- [x] 9.3 Rewrite `test/compute-stack.test.ts` — verify ECS cluster, ALB, Fargate services, task definitions, IAM role policies (least privilege), auto-scaling config
- [x] 9.4 Update `test/cdn-stack.test.ts` — verify CloudFront origins (ALB + S3), cache behaviors, WAF attachment, TLS minimum version
- [x] 9.5 Update `test/monitoring-stack.test.ts` — verify alarms exist with correct thresholds (using ALB/ECS metrics)
- [x] 9.6 Update snapshot tests for all stacks to detect unintended changes
- [x] 9.7 Run full test suite: `npm test` — all tests must pass

**Checkpoint**: All CDK tests pass (`npm test` exits with code 0).

## 10. Documentation
- [x] 10.1 Update `src/infra/README.md` to reflect ECS Fargate architecture (replace all App Runner references)
- [x] 10.2 Update project root `.env.example` to document which env vars are CDK-managed in deployed environments vs. locally configured
- [x] 10.3 Add `src/infra/` scripts to package.json: `synth`, `deploy:staging`, `deploy:production`, `test`, `diff`

**Checkpoint**: README is complete and all documented commands work correctly.

## 11. Final Validation
- [x] 11.1 Run `npx cdk synth --all -c env=staging` — verify all stacks synthesize without errors
- [x] 11.2 Run `npx cdk synth --all -c env=production` — verify production config differences (Multi-AZ, desiredCount: 2, larger task definitions)
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
