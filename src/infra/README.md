# AWS Infrastructure — CDK Project

Infrastructure as Code for the rental platform, using AWS CDK with TypeScript.

## Architecture

The infrastructure is organized into modular CDK stacks:

| Stack | Purpose |
|-------|---------|
| **NetworkStack** | VPC, subnets, NAT Gateway, security groups, EC2 Instance Connect Endpoint |
| **DataStack** | RDS PostgreSQL 16, ElastiCache Redis 7, S3 bucket, Secrets Manager |
| **CiStack** | ECR repositories, GitHub Actions IAM role |
| **ComputeStack** | App Runner services (backend + frontend), VPC Connector, IAM roles |
| **CdnStack** | CloudFront distribution, WAF Web ACL, ACM certificate |
| **MonitoringStack** | CloudWatch alarms, dashboards, log groups, SNS notifications |

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

This runs `cdk deploy --all -c env=staging` — deploys all stacks with staging configuration (scale-to-zero, single-AZ DB, smaller instances).

### Production

```bash
npm run deploy:production
```

This runs `cdk deploy --all -c env=production --require-approval broadening` — deploys all stacks with production configuration (warm instances, Multi-AZ DB, WAF enabled). Requires manual approval for IAM/security changes.

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
2. Add the variable to the `runtimeEnvironmentVariables` array of the appropriate App Runner service:

```typescript
runtimeEnvironmentVariables: [
    // ... existing vars
    { name: 'MY_NEW_VAR', value: 'my-value' },
],
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

2. Pass the secret ARN to `ComputeStack` via props.
3. Add it to the `runtimeEnvironmentSecrets` array in `compute-stack.ts`:

```typescript
runtimeEnvironmentSecrets: [
    // ... existing secrets
    { name: 'MY_NEW_SECRET', value: myNewSecret.secretArn },
],
```

4. Grant the backend instance role read access:

```typescript
myNewSecret.grantRead(backendInstanceRole);
```

### How It Works

- **Non-sensitive vars** (`runtimeEnvironmentVariables`): Resolved at deploy time from CDK cross-stack references (DB host, Redis endpoint, S3 bucket name, etc.)
- **Sensitive vars** (`runtimeEnvironmentSecrets`): Reference Secrets Manager ARNs — App Runner resolves them at runtime, values never appear in CloudFormation templates.

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
| Backend min instances | 0 (scale to zero) | 1 (warm) |
| Backend max instances | 2 | 6 |
| Frontend min instances | 0 | 1 |
| Frontend max instances | 2 | 4 |
| RDS instance | db.t3.micro | db.t3.medium |
| RDS Multi-AZ | No | Yes |
| RDS backup retention | 7 days | 30 days |
| Redis node type | cache.t3.micro | cache.t3.small |
| Log retention | 30 days | 90 days |

## Troubleshooting

### `cdk synth` fails with "Cannot find module"

Run `npm install` and `npm run build` first.

### Stack deployment fails with "Resource limit exceeded"

Check your AWS account service quotas. App Runner, VPC, and NAT Gateway have default limits that may need increasing.

### App Runner service stuck in "Operation in progress"

App Runner deployments can take 5-10 minutes. If stuck longer, check the service events in the AWS Console or CloudWatch logs.
