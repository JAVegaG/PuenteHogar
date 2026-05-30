# AWS Infrastructure — CDK Project

Infrastructure as Code for the rental platform, using AWS CDK with TypeScript.

## Architecture

The infrastructure uses **ECS Fargate** for compute with an **Application Load Balancer (ALB)** for ingress and path-based routing. CloudFront sits in front for caching, WAF protection, and TLS termination.

### Production Architecture

```mermaid
graph TB
    subgraph Internet
        User[User / Browser]
    end

    subgraph AWS Cloud - Production
        subgraph CDN Layer
            CF[CloudFront Distribution]
            WAF[AWS WAF]
            ACM[ACM Certificate]
        end

        subgraph VPC - us-east-1
            subgraph Public Subnets
                NAT[NAT Gateway]
                ALB[Application Load Balancer<br/>HTTP :80]
            end

            subgraph Private Subnets
                subgraph ECS Cluster
                    BE1[Backend Service<br/>NestJS - 2 tasks<br/>1024 CPU / 2048 MB]
                    FE1[Frontend Service<br/>Next.js - 2 tasks<br/>512 CPU / 1024 MB]
                end
                Bastion[SSM Bastion<br/>t4g.nano]
            end

            subgraph Isolated Subnets
                RDS[(RDS PostgreSQL 16<br/>db.t3.medium<br/>Multi-AZ)]
                Redis[(ElastiCache Redis 7<br/>cache.t3.small<br/>2 nodes + failover)]
            end
        end

        subgraph Storage
            S3[S3 Bucket<br/>Assets / Files]
            ECR[ECR Repositories<br/>Backend + Frontend]
        end

        subgraph Secrets
            SM[Secrets Manager<br/>DB Password, JWT, PII Key]
        end

        subgraph Monitoring
            CW[CloudWatch<br/>Logs + Alarms]
            SNS[SNS Notifications]
        end
    end

    User -->|HTTPS| CF
    CF --> WAF
    CF -->|/api/*, default| ALB
    CF -->|/assets/*| S3
    ALB -->|/api/*| BE1
    ALB -->|default| FE1
    BE1 --> RDS
    BE1 --> Redis
    BE1 --> S3
    BE1 --> SM
    FE1 -->|outbound via NAT| NAT
    BE1 -->|outbound via NAT| NAT
    Bastion -.->|port 5432| RDS
    BE1 --> CW
    FE1 --> CW
    CW --> SNS
```

### Staging Architecture

```mermaid
graph TB
    subgraph Internet
        User[User / Browser]
    end

    subgraph AWS Cloud - Staging
        subgraph CDN Layer
            CF[CloudFront Distribution]
            WAF[AWS WAF]
        end

        subgraph VPC - us-east-1
            subgraph Public Subnets
                ALB[Application Load Balancer<br/>HTTP :80]
            end

            subgraph Private Subnets
                subgraph ECS Cluster
                    BE1[Backend Service<br/>NestJS - 1 task<br/>512 CPU / 1024 MB]
                    FE1[Frontend Service<br/>Next.js - 1 task<br/>256 CPU / 512 MB]
                end
                Bastion[SSM Bastion<br/>t4g.nano]
                subgraph VPC Endpoints
                    VPCE[ECR API, ECR Docker<br/>CloudWatch Logs<br/>Secrets Manager, SSM<br/>S3 Gateway]
                end
            end

            subgraph Isolated Subnets
                RDS[(RDS PostgreSQL 16<br/>db.t3.micro<br/>Single-AZ)]
            end
        end

        subgraph Storage
            S3[S3 Bucket<br/>Assets / Files]
            ECR[ECR Repositories<br/>Backend + Frontend]
        end

        subgraph Secrets
            SM[Secrets Manager<br/>DB Password, JWT, PII Key]
        end
    end

    User -->|HTTPS| CF
    CF --> WAF
    CF -->|/api/*, default| ALB
    CF -->|/assets/*| S3
    ALB -->|/api/*| BE1
    ALB -->|default| FE1
    BE1 --> RDS
    BE1 -.->|no Redis<br/>no-op cache| BE1
    BE1 --> S3
    BE1 --> SM
    FE1 -->|AWS services via| VPCE
    BE1 -->|AWS services via| VPCE
    Bastion -.->|port 5432| RDS
```

### Key Differences: Staging vs Production

| Component | Staging | Production |
|-----------|---------|------------|
| NAT Gateway | ❌ None (VPC Endpoints) | ✅ 1 NAT Gateway |
| ElastiCache Redis | ❌ Disabled (no-op fallback) | ✅ 2-node cluster with failover |
| RDS | Single-AZ, db.t3.micro | Multi-AZ, db.t3.medium |
| ECS Tasks | 1 per service | 2+ per service (auto-scaling) |
| Outbound access | VPC Endpoints only | NAT Gateway (full internet) |
| Estimated cost | ~$15-20/month (RDS only when awake) | ~$150+/month |

| Stack | Purpose |
|-------|---------|
| **NetworkStack** | VPC, subnets, NAT Gateway (production only), VPC Endpoints (staging only), security groups (ECS, ALB, Data, Bastion), SSM Bastion instance for DB access |
| **DataStack** | RDS PostgreSQL 16, ElastiCache Redis 7 (production only), S3 bucket, Secrets Manager |
| **CiStack** | ECR repositories, GitHub Actions IAM role |
| **ComputeStack** | ECS Cluster, ALB, Fargate services (backend + frontend), task definitions, IAM roles, auto-scaling |
| **CdnStack** | CloudFront distribution (ALB + S3 origins), WAF Web ACL, ACM certificate, SSM parameter for CDN domain |
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

This runs `cdk deploy --all -c env=staging --require-approval never` — deploys all stacks with staging configuration (single task per service, single-AZ DB, smaller task definitions). No manual approval is required.

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

# Cost-saving: tear down expensive stacks while keeping Data + Ci
npm run staging:sleep    # destroys Monitoring, Cdn, Compute, Network

# Bring staging back up after sleep
npm run staging:wake     # deploys Network, Compute, Cdn, Monitoring

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
    // Full secret value:
    MY_NEW_SECRET: ecs.Secret.fromSecretsManager(props.myNewSecret),
    // Or extract a specific JSON field from a structured secret:
    MY_FIELD: ecs.Secret.fromSecretsManager(props.myNewSecret, 'fieldName'),
},
```

4. Ensure the task execution role has `secretsmanager:GetSecretValue` on the secret ARN (already handled if you add it to the existing policy statement).

### How It Works

- **Non-sensitive vars** (`environment`): Resolved at deploy time from CDK cross-stack references (DB host, Redis endpoint, S3 bucket name, etc.)
- **Sensitive vars** (`secrets`): Reference Secrets Manager ARNs — ECS resolves them at container start, values never appear in CloudFormation templates. Secrets can reference a full secret value or a specific JSON field within a structured secret (e.g., `DB_PASSWORD` extracts only the `password` field from the DB secret).

### CDN Domain Discovery (SSM Parameter)

The `CDN_DOMAIN` environment variable tells the backend which CloudFront domain to use when building public asset URLs. However, there's a circular dependency: the CDN stack depends on the Compute stack (it needs the ALB DNS name), so the Compute stack cannot reference the CDN stack's distribution domain at deploy time.

Two mechanisms solve this:

1. **Static config** (current): `cdnDomain` is hardcoded in `lib/config/environments.ts` for staging (where the distribution domain is known). The Compute stack injects it as `CDN_DOMAIN` at deploy time.
2. **SSM parameter** (runtime fallback): The CDN stack writes the distribution domain to `/{environment}/cdn/domain` in SSM Parameter Store. This allows the backend (or CI pipelines) to discover the CDN domain at runtime without a deploy-time circular dependency.

If `CDN_DOMAIN` is not set in the container environment (e.g., production first deploy before the domain is known), the backend falls back to direct S3 URLs for assets.

### Current Backend Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `DB_HOST` | DataStack (RDS endpoint) | PostgreSQL host address |
| `DB_PORT` | DataStack (RDS port) | PostgreSQL port |
| `DB_NAME` | Hardcoded | Database name (`rental_platform`) |
| `DB_USER` | Hardcoded | Database user (`app_user`) |
| `REDIS_HOST` | DataStack (ElastiCache endpoint) | Redis host address (production only — omitted in staging) |
| `REDIS_PORT` | Hardcoded | Redis port (`6379`) (production only — omitted in staging) |
| `REDIS_URL` | Computed | Full Redis connection URL (production only — omitted in staging, triggers no-op cache fallback) |
| `S3_BUCKET_NAME` | DataStack (S3 bucket) | Assets bucket name |
| `S3_REGION` | Stack region | AWS region for S3 operations |
| `OBJECT_STORAGE_BUCKET` | DataStack (S3 bucket) | Bucket name used by the ObjectStorage adapter |
| `OBJECT_STORAGE_REGION` | Stack region | AWS region for the ObjectStorage adapter |
| `CDN_DOMAIN` | Config (`cdnDomain`) | CloudFront distribution domain for asset URLs (conditional — omitted if not configured) |
| `NODE_ENV` | Environment config | `production` or `development` |
| `PORT` | Hardcoded | Application port (`3000`) |
| `DB_PASSWORD` | Secrets Manager (JSON field) | Extracted `password` field from DB secret |
| `JWT_SECRET` | Secrets Manager | JWT signing key |
| `PII_ENCRYPTION_KEY` | Secrets Manager | AES-256 key for PII encryption |

The backend's `PrismaService` constructs `DATABASE_URL` at runtime from the individual `DB_*` components (with URL-encoded password and `?sslmode=require` for TLS connections to RDS). If `DATABASE_URL` is already set in the environment (e.g., local development), it is used as-is.

### Automatic Migrations on Startup

The backend runs `prisma migrate deploy` programmatically inside `PrismaService.onModuleInit()` before connecting to the database. This is idempotent — already-applied migrations are skipped, so it's safe to run on every container start (including rolling deployments with multiple tasks).

The production Docker image includes the Prisma schema, migrations directory, `prisma.config.ts`, compiled seed scripts (`dist/db/seeds/`), and the Colombian geo-catalog CSV (`db/seeds/states_citys_colombia.seed.csv`) — all required by the `prisma migrate deploy` CLI and catalog seeding at startup.

If migrations fail (e.g., connectivity issue during startup), the error is logged via NestJS Logger and the application continues starting. This prevents a single migration failure from blocking all deployments when the schema is already up to date.

## Database Access via SSM Bastion (Port Forwarding)

The RDS instance is in isolated subnets with no public IP. To connect from your local machine, use the SSM Bastion instance to open a port-forwarding session:

### 1. Get the Bastion Instance ID

The bastion instance ID is exported as a CDK stack output (`{env}-bastion-instance-id`). You can also find it in the AWS Console under EC2 → Instances (look for the `BastionInstance` tag).

### 2. Open a port-forwarding session to RDS

```bash
aws ssm start-session \
    --target BASTION_INSTANCE_ID \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters '{"host":["RDS_ENDPOINT"],"portNumber":["5432"],"localPortNumber":["5432"]}'
```

Replace:
- `BASTION_INSTANCE_ID` — The EC2 instance ID of the bastion (from stack outputs or AWS Console)
- `RDS_ENDPOINT` — The RDS endpoint hostname (from stack outputs or `aws rds describe-db-instances`)

### 3. Connect via psql

With the session open, connect to `localhost:5432`:

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

Your IAM user/role must have `ssm:StartSession` permission scoped to the bastion instance. No SSH keys or open inbound ports are needed — access is exclusively via SSM Session Manager.

### Using with Prisma Studio

```bash
# Terminal 1: Open the port-forwarding session
aws ssm start-session \
    --target BASTION_INSTANCE_ID \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters '{"host":["RDS_ENDPOINT"],"portNumber":["5432"],"localPortNumber":["5432"]}'

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
| NAT Gateways | 0 (uses VPC Endpoints) | 1 |
| VPC Endpoints | ECR, CloudWatch Logs, Secrets Manager, SSM, S3 | None (uses NAT) |
| ElastiCache Redis | Disabled (no-op cache fallback) | cache.t3.small, 2 nodes, failover |
| Backend CPU/Memory | 512 / 1024 MB | 1024 / 2048 MB |
| Backend desired/min/max | 1 / 1 / 2 | 2 / 2 / 6 |
| Frontend CPU/Memory | 256 / 512 MB | 512 / 1024 MB |
| Frontend desired/min/max | 1 / 1 / 2 | 2 / 2 / 4 |
| Auto-scaling target | CPU 70% | CPU 70% |
| RDS instance | db.t3.micro | db.t3.medium |
| RDS Multi-AZ | No | Yes |
| RDS backup retention | 7 days | 30 days |
| Log retention | 30 days | 90 days |
| Container Insights | Disabled | Enhanced |

## Troubleshooting

### `cdk synth` fails with "Cannot find module"

Run `npm install` and `npm run build` first.

### Frontend API routing

The frontend uses `NEXT_PUBLIC_API_URL=/api` (set at Docker build time in the frontend Dockerfile). All frontend service files use `${API_URL}/auth/login`, `${API_URL}/portfolio`, etc. — the `/api` prefix is injected via this environment variable. The ALB's path-based routing forwards `/api/*` requests to the backend target group, so the frontend calls `/api/...` and the infrastructure handles routing transparently.

For local development, `src/frontend/.env.local` sets `NEXT_PUBLIC_API_URL` to point at the local backend (e.g., `http://192.168.0.100:3000/api`).

### Backend Docker build fails with "Cannot resolve environment variable: DATABASE_URL"

The backend Dockerfile sets a dummy `DATABASE_URL` during build for Prisma client generation only. At runtime, `PrismaService` constructs the real connection string from individual `DB_*` environment variables. If you see this error, ensure you're using the latest Dockerfile from `src/infra/docker/backend.Dockerfile`.

### Migrations fail with "Cannot find prisma.config.ts"

The `prisma migrate deploy` CLI requires `prisma.config.ts` to resolve the datasource URL. This file is copied into the production image alongside the schema and migrations. If you see this error after a Dockerfile change, ensure the production stage includes:

```dockerfile
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
```

### Seed/catalog data missing at startup

The backend seeds catalog tables (departments, cities, property types, etc.) on startup. The production image includes the compiled seed script and the Colombian geo-catalog CSV. If catalog data is missing after deployment, ensure the Dockerfile production stage includes:

```dockerfile
COPY --from=build /app/dist/db/seeds ./dist/db/seeds
COPY --from=build /app/db/seeds/states_citys_colombia.seed.csv ./db/seeds/states_citys_colombia.seed.csv
```

### Migrations fail on container startup

`PrismaService.onModuleInit()` runs `prisma migrate deploy` before connecting. If you see migration errors in the logs:
1. Check that the RDS instance is reachable from the ECS task's subnet (security group rules)
2. Verify the `DB_PASSWORD` secret is correctly populated in Secrets Manager
3. Check CloudWatch logs at `/ecs/{env}/backend` for the specific Prisma error
4. Migrations are idempotent — if the schema is already current, the failure is harmless

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
