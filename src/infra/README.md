# AWS Infrastructure — CDK Project

Infrastructure as Code for the rental platform, using AWS CDK with TypeScript.

## Architecture

The infrastructure uses **ECS Fargate** for compute with an **Application Load Balancer (ALB)** for ingress and path-based routing. CloudFront sits in front for caching, WAF protection, and TLS termination.

| Stack | Purpose |
|-------|---------|
| **NetworkStack** | VPC, subnets, NAT Gateway, security groups (ECS, ALB, Data, EIC), EC2 Instance Connect Endpoint |
| **DataStack** | RDS PostgreSQL 16, ElastiCache Redis 7, S3 bucket, Secrets Manager |
| **CiStack** | ECR repositories, GitHub Actions IAM role |
| **ComputeStack** | ECS Cluster, ALB, Fargate services (backend + frontend), task definitions, IAM roles, auto-scaling |
| **CdnStack** | CloudFront distribution (ALB + S3 origins), WAF Web ACL, ACM certificate |
| **MonitoringStack** | CloudWatch alarms (ALB/ECS metrics), dashboards, log groups, SNS notifications |

### Request Flow

```
User → CloudFront (TLS) → WAF → ALB (HTTP, port 80)
  /api/*    → Backend Target Group → ECS Backend Service (private subnet)
  /assets/* → S3 (via OAC)
  default   → Frontend Target Group → ECS Frontend Service (private subnet)
```

For the full architecture diagram and design rationale, see:
[`.kiro/specs/aws-infrastructure-deployment/design.md`](../../.kiro/specs/aws-infrastructure-deployment/design.md)

## Prerequisites

- **AWS CLI v2** — [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **AWS CDK CLI** — `npm install -g aws-cdk`
- **Node.js 20+** — Required for CDK and TypeScript compilation
- **Docker** — Required for building container images
- **AWS credentials** configured (`aws configure` or environment variables)

Verify your setup:

```bash
aws --version        # AWS CLI v2.x
cdk --version        # 2.x
node --version       # v20.x+
docker --version     # Docker 24.x+
```

## Bootstrap

Before deploying for the first time in a new AWS account/region, bootstrap the CDK toolkit:

```bash
cdk bootstrap aws://ACCOUNT_ID/REGION
```

Example:

```bash
cdk bootstrap aws://123456789012/us-east-1
```

This creates the CDKToolkit CloudFormation stack with an S3 bucket for assets and IAM roles for deployment.

## Deploy Commands

### Staging

```bash
npm run deploy:staging
```

This runs `cdk deploy --all -c env=staging` — deploys all stacks with staging configuration (single task per service, single-AZ DB, smaller task definitions).

### Production

```bash
npm run deploy:production
```

This runs `cdk deploy --all -c env=production --require-approval broadening` — deploys all stacks with production configuration (2+ tasks per service, Multi-AZ DB, larger task definitions, container insights). Requires manual approval for IAM/security changes.

## Common Commands

```bash
# Synthesize CloudFormation templates (validate without deploying)
npm run synth

# Synthesize for a specific environment
npm run synth:staging
npm run synth:production

# Show what would change (diff against deployed stacks)
npm run diff
npm run diff:staging
npm run diff:production

# Deploy
npm run deploy:staging
npm run deploy:production

# Destroy staging environment (production has deletion protection)
npm run destroy:staging

# Run CDK tests
npm test

# Build TypeScript
npm run build
```

## Environment Variable Management

All environment variables are defined in CDK code — **zero manual configuration in the AWS Console**.

### Adding a New Non-Sensitive Variable

1. Edit `lib/stacks/compute-stack.ts`
2. Add the variable to the `environment` map of the appropriate container definition:

```typescript
environment: {
    // ... existing vars
    MY_NEW_VAR: 'my-value',
},
```

3. If the value comes from another stack (e.g., a resource endpoint), pass it through stack props.

### Adding a New Secret (Sensitive Variable)

1. Create the secret in `lib/stacks/data-stack.ts`:

```typescript
const myNewSecret = new secretsmanager.Secret(this, 'MyNewSecret', {
    description: 'Description of the secret',
    generateSecretString: { excludePunctuation: true, passwordLength: 32 },
});
```

2. Pass the secret to `ComputeStack` via props.
3. Add it to the `secrets` map in the container definition:

```typescript
secrets: {
    // ... existing secrets
    MY_NEW_SECRET: ecs.Secret.fromSecretsManager(props.myNewSecret),
},
```

4. Ensure the task execution role has `secretsmanager:GetSecretValue` on the secret ARN (already handled if you add it to the existing policy statement).

### How It Works

- **Non-sensitive vars** (`environment`): Resolved at deploy time from CDK cross-stack references (DB host, Redis endpoint, S3 bucket name, etc.)
- **Sensitive vars** (`secrets`): Reference Secrets Manager ARNs — ECS resolves them at container start, values never appear in CloudFormation templates.

## Database Access via EC2 Instance Connect Endpoint

The RDS instance is in isolated subnets with no public IP. To connect from your local machine, use the EC2 Instance Connect Endpoint (EIC) to open a secure tunnel:

### 1. Open a tunnel to RDS

```bash
aws ec2-instance-connect open-tunnel \
    --instance-connect-endpoint-id ENDPOINT_ID \
    --private-ip-address RDS_PRIVATE_IP \
    --local-port 5432 \
    --remote-port 5432
```

Replace:
- `ENDPOINT_ID` — The EIC Endpoint ID (find it in the AWS Console under VPC → Endpoints, or from the CDK stack outputs)
- `RDS_PRIVATE_IP` — The private IP of the RDS instance (from stack outputs or `aws rds describe-db-instances`)

### 2. Connect via psql

With the tunnel open, connect to `localhost:5432`:

```bash
psql -h localhost -p 5432 -U app_user -d rental_platform
```

The password is stored in Secrets Manager. Retrieve it with:

```bash
aws secretsmanager get-secret-value \
    --secret-id STACK_PREFIX-DbSecret \
    --query 'SecretString' \
    --output text | jq -r '.password'
```

### IAM Permissions Required

Your IAM user/role must have the `ec2-instance-connect:OpenTunnel` permission scoped to the EIC Endpoint. This is controlled via IAM policy — no SSH keys or open inbound ports are needed.

### Using with Prisma Studio

```bash
# Terminal 1: Open the tunnel
aws ec2-instance-connect open-tunnel \
    --instance-connect-endpoint-id ENDPOINT_ID \
    --private-ip-address RDS_PRIVATE_IP \
    --local-port 5432 \
    --remote-port 5432

# Terminal 2: Run Prisma Studio pointing to localhost
DATABASE_URL="postgresql://app_user:PASSWORD@localhost:5432/rental_platform" \
    npx prisma studio
```

## Project Structure

```
src/infra/
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   ├── config/
│   │   ├── environments.ts # Staging & production configs
│   │   └── index.ts        # getConfig() helper
│   └── stacks/
│       ├── network-stack.ts
│       ├── data-stack.ts
│       ├── ci-stack.ts
│       ├── compute-stack.ts
│       ├── cdn-stack.ts
│       └── monitoring-stack.ts
├── docker/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── test/                   # CDK assertion + snapshot tests
├── cdk.json
├── jest.config.ts
├── package.json
└── tsconfig.json
```

## Environments

| Setting | Staging | Production |
|---------|---------|------------|
| Backend CPU/Memory | 512 / 1024 MB | 1024 / 2048 MB |
| Backend desired/min/max | 1 / 1 / 2 | 2 / 2 / 6 |
| Frontend CPU/Memory | 256 / 512 MB | 512 / 1024 MB |
| Frontend desired/min/max | 1 / 1 / 2 | 2 / 2 / 4 |
| Auto-scaling target | CPU 70% | CPU 70% |
| RDS instance | db.t3.micro | db.t3.medium |
| RDS Multi-AZ | No | Yes |
| RDS backup retention | 7 days | 30 days |
| Redis node type | cache.t3.micro | cache.t3.small |
| Log retention | 30 days | 90 days |
| Container Insights | Disabled | Enhanced |

## Troubleshooting

### `cdk synth` fails with "Cannot find module"

Run `npm install` and `npm run build` first.

### Backend Docker build fails with "Cannot resolve environment variable: DATABASE_URL"

The backend Dockerfile sets a dummy `DATABASE_URL` during build for Prisma client generation. If you see this error, ensure you're using the latest Dockerfile from `src/infra/docker/backend.Dockerfile`.

### Stack deployment fails with "Resource limit exceeded"

Check your AWS account service quotas. ECS, VPC, and NAT Gateway have default limits that may need increasing.

### ECS service stuck in "deployment in progress"

ECS rolling deployments wait for new tasks to pass health checks. If stuck:
1. Check CloudWatch logs for the service (`/ecs/{env}/backend` or `/ecs/{env}/frontend`)
2. Verify the health check endpoint is responding (backend: `/api/health`, frontend: `/`)
3. Check the ALB target group health in the AWS Console
4. The circuit breaker will automatically roll back after repeated failures

### Force a new deployment

To force ECS to pull the latest image and redeploy:

```bash
aws ecs update-service \
    --cluster CLUSTER_NAME \
    --service SERVICE_NAME \
    --force-new-deployment
```
