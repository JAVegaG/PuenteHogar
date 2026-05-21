# Bugfix Requirements Document

## Introduction

After the first AWS ECS Fargate deployment of the rental platform, four issues were discovered that prevent the staging environment from functioning correctly. These issues span developer tooling (DB access), application configuration (DATABASE_URL construction and migrations), frontend-backend routing (API calls not reaching the backend), and cost optimization (staging costs too high for a prototype showcase). This document captures the defective behavior, expected corrections, and behaviors that must remain unchanged.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a developer attempts to connect to the RDS PostgreSQL instance using `aws ec2-instance-connect open-tunnel --remote-port 5432` THEN the system fails with error "The specified RemotePort is not valid. Specify either 22 or 3389" because EC2 Instance Connect Endpoint only supports ports 22 and 3389

1.2 WHEN the backend container starts THEN a bash entrypoint script (`entrypoint.sh`) constructs the `DATABASE_URL` environment variable from individual DB env vars and runs `prisma migrate deploy` before the NestJS application boots, keeping this logic outside the application code

1.3 WHEN the frontend makes an API call (e.g., `fetch('/auth/login')`) in production THEN the request hits the frontend service itself because the ALB only routes `/api/*` to the backend target group, and the frontend fetch calls use paths without the `/api` prefix

1.4 WHEN the staging environment is running THEN the monthly cost is approximately $75+ (NAT Gateway ~$32, RDS ~$15, ElastiCache ~$12, ALB ~$16), which is excessive for a prototype demonstration

### Expected Behavior (Correct)

2.1 WHEN a developer needs to connect to the RDS PostgreSQL instance from their local machine (DBeaver, psql) THEN the system SHALL provide a working tunnel mechanism that supports port 5432, replacing the EIC Endpoint approach with an SSM-based bastion or alternative tunneling solution

2.2 WHEN the backend container starts THEN the NestJS application SHALL construct the `DATABASE_URL` internally from individual env vars (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) in the PrismaService, and SHALL run Prisma migrations programmatically during application bootstrap — eliminating the bash entrypoint script entirely

2.3 WHEN the frontend makes an API call to the backend THEN the request SHALL reach the backend service by prefixing all fetch URLs with `/api` (e.g., `fetch('/api/auth/login')`), matching the ALB path-based routing rule that forwards `/api/*` to the backend target group

2.4 WHEN the staging environment is deployed for prototype demonstration THEN the monthly cost SHALL be reduced to near-zero by eliminating or replacing expensive components (NAT Gateway, ElastiCache, and potentially simplifying the network topology)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the backend application connects to PostgreSQL in production THEN the system SHALL CONTINUE TO use the same RDS instance with the same credentials and database name

3.2 WHEN the backend application starts THEN the system SHALL CONTINUE TO run pending Prisma migrations before serving requests (idempotent, safe to run multiple times)

3.3 WHEN the backend receives requests at its NestJS controllers THEN the system SHALL CONTINUE TO handle routes at their existing paths (`/auth/login`, `/portfolio`, `/listings`, etc.) without requiring a global `/api` prefix in the NestJS route definitions

3.4 WHEN the frontend makes API calls THEN the system SHALL CONTINUE TO use the same service layer pattern (`authService`, `portfolioService`, etc.) with a centralized API URL configuration

3.5 WHEN the production environment is deployed THEN the system SHALL CONTINUE TO use the full infrastructure (NAT Gateway, RDS, ElastiCache, ALB) with no cost-cutting compromises that affect reliability or security

3.6 WHEN ECS Fargate services run in private subnets THEN the system SHALL CONTINUE TO have outbound internet access for ECR image pulls (via NAT Gateway or VPC endpoints)

3.7 WHEN the ALB receives requests THEN the system SHALL CONTINUE TO route `/api/*` to the backend target group and all other paths to the frontend target group

3.8 WHEN the backend health check is performed THEN the system SHALL CONTINUE TO respond at `/api/health` with HTTP 200


## Post-Implementation Findings

Issues discovered during manual QA deployment testing (Task 9):

### Finding 4.1 — Docker images built on ARM don't run on ECS Fargate

**Observed**: WHEN Docker images are built on an Apple Silicon (ARM/M-series) Mac without specifying a target platform AND pushed to ECR THEN ECS Fargate tasks fail with `CannotPullContainerError: image Manifest does not contain descriptor matching platform 'linux/amd64'` because Fargate runs on x86_64 instances.

**Root Cause**: Docker defaults to the host architecture (`linux/arm64` on Apple Silicon). ECS Fargate requires `linux/amd64` images.

**Fix**: All Docker build commands MUST include `--platform linux/amd64` when building on ARM machines for ECS deployment.

### Finding 4.2 — Prisma 7 no longer supports `url` in schema.prisma

**Observed**: WHEN the Docker image is built THEN `prisma generate` fails with `Error code: P1012 — The datasource property 'url' is no longer supported in schema files. Move connection URLs for Migrate to prisma.config.ts`.

**Root Cause**: Prisma 7.x removed support for `url = env("DATABASE_URL")` in the `datasource` block of `schema.prisma`. The connection URL must be configured exclusively in `prisma.config.ts` (which already had it). Additionally, `prisma.config.ts` was not being copied to the production Docker stage, so `prisma migrate deploy` at runtime couldn't find the config.

**Fix**:
1. Removed `url = env("DATABASE_URL")` from `src/backend/db/prisma/schema.prisma`
2. Added `COPY --from=build /app/prisma.config.ts ./prisma.config.ts` to the production stage of `src/infra/docker/backend.Dockerfile`

### Finding 4.3 — execSync env isolation prevented DATABASE_URL from reaching Prisma CLI

**Observed**: WHEN PrismaService runs `prisma migrate deploy` via `execSync` with a restricted `env` object THEN the Prisma CLI fails because it needs additional environment variables beyond `PATH`, `DATABASE_URL`, and `NODE_ENV` (e.g., `HOME` for Prisma engine resolution on Alpine Linux).

**Root Cause**: Passing `env: { PATH, DATABASE_URL, NODE_ENV }` to `execSync` replaces the entire child process environment. The Prisma CLI needs the full environment to locate its engines and resolve `prisma.config.ts`.

**Fix**: Removed the explicit `env` option from `execSync` so it inherits the parent's `process.env` directly (the default behavior). `DATABASE_URL` is already set in `process.env` by the constructor before `onModuleInit` runs.

### Finding 4.4 — REDIS_URL set to empty host in staging causes connection to localhost

**Observed**: WHEN the backend starts in staging THEN the RedisService repeatedly logs `Redis unavailable: connect ECONNREFUSED 127.0.0.1:6379` because the ECS task definition sets `REDIS_URL: redis://:6379` (empty `redisEndpoint` from data-stack).

**Root Cause**: The compute stack unconditionally set `REDIS_URL: redis://${props.redisEndpoint}:6379`. In staging, `redisEndpoint` is `''` (ElastiCache is skipped), resulting in `redis://:6379` which ioredis interprets as `localhost:6379`.

**Fix**: Made Redis env vars (`REDIS_HOST`, `REDIS_PORT`, `REDIS_URL`) conditional in `src/infra/lib/stacks/compute-stack.ts` — only set when `props.redisEndpoint` is non-empty. In staging, the `RedisService` sees no `REDIS_URL` and enters no-op fallback mode cleanly.

### Finding 4.5 — RDS requires SSL but DATABASE_URL lacked sslmode parameter

**Observed**: WHEN the backend connects to RDS THEN queries fail with `no pg_hba.conf entry for host "10.0.3.17", user "app_user", database "rental_platform", no encryption` (PostgreSQL error code 28000).

**Root Cause**: RDS PostgreSQL instances enforce SSL connections by default (`rds.force_ssl=1`). The constructed `DATABASE_URL` did not include any SSL parameter, so `@prisma/adapter-pg` connected without encryption. Using `sslmode=require` also failed because RDS uses Amazon's self-signed CA certificate which Node.js doesn't trust.

**Fix**: Added `?sslmode=no-verify` to the constructed `DATABASE_URL` in `PrismaService.buildConnectionString()`. This enables SSL encryption but skips certificate validation (acceptable for RDS where the network path is already within the VPC).

### Finding 4.6 — ECS service doesn't auto-deploy on image tag update

**Observed**: WHEN a new Docker image is pushed to ECR with the same `latest` tag THEN the running ECS service continues using the old image until explicitly told to redeploy.

**Root Cause**: ECS caches the image digest from the task definition. Pushing a new image with the same tag doesn't trigger a new deployment — the service must be explicitly updated.

**Fix**: After pushing a new image, run `aws ecs update-service --cluster staging-compute-cluster --service <service-name> --force-new-deployment --region us-east-1` to force ECS to pull the latest image.

### Finding 4.7 — Swagger UI asset paths broken behind ALB with global prefix

**Observed**: WHEN accessing `/api/docs` via the ALB THEN the Swagger HTML loads but CSS/JS assets fail to load because they resolve to incorrect paths (double `docs` in path or HTTPS upgrade by browser).

**Root Cause**: Using `SwaggerModule.setup('api/docs', ...)` caused NestJS Swagger to generate relative asset URLs like `./docs/swagger-ui.css` which resolved to `/api/docs/docs/swagger-ui.css` (incorrect). The module didn't know the full mount path structure.

**Fix**: Changed to `SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true })`. This tells NestJS Swagger that the path is `docs` under the global prefix `api`, so it correctly generates asset URLs relative to `/api/docs`.
