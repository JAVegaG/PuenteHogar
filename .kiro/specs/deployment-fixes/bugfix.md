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

### Finding 4.2 — Prisma schema missing datasource URL for CLI commands

**Observed**: WHEN the backend container starts and PrismaService runs `prisma migrate deploy` THEN the command fails with `Error: The datasource.url property is required in your Prisma config file when using prisma migrate deploy` even though `DATABASE_URL` is set in the environment.

**Root Cause**: The `datasource db` block in `schema.prisma` did not include `url = env("DATABASE_URL")`. The Prisma CLI reads the schema file directly and requires an explicit `url` property — it does not auto-detect `DATABASE_URL` from the environment without it.

**Fix**: Added `url = env("DATABASE_URL")` to the `datasource db` block in `src/backend/db/prisma/schema.prisma`. This allows the Prisma CLI to resolve the connection string from the environment variable that PrismaService constructs and sets.
