# Deployment Fixes Bugfix Design

## Overview

After the first AWS ECS Fargate deployment, four issues prevent the staging environment from functioning correctly: (1) EIC Endpoint cannot tunnel to port 5432 for local DB access, (2) DATABASE_URL construction and migrations live in a bash entrypoint script instead of application code, (3) frontend API calls don't reach the backend due to ALB routing mismatch — the ALB routes `/api/*` to backend but NestJS has no global prefix and the frontend omits `/api`, and (4) staging costs ~$75+/month which is excessive for a prototype demo. This design formalizes the bug conditions, root causes, and targeted fixes.

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger each deployment issue — EIC port limitation, entrypoint script logic, missing `/api` prefix in fetch calls, and expensive infrastructure components
- **Property (P)**: The desired behavior — working DB tunnel, application-managed DATABASE_URL and migrations, frontend requests reaching backend via ALB, and near-zero staging cost
- **Preservation**: Existing behaviors that must remain unchanged — production infrastructure, ALB routing rules, controller route definitions, service layer patterns, and health check endpoint
- **PrismaService**: The NestJS service in `src/backend/src/shared/prisma/prisma.service.ts` that manages the database connection
- **ALB Listener Rules**: Path-based routing: `/api/*` → backend target group, default → frontend target group
- **NEXT_PUBLIC_API_URL**: Environment variable used by frontend services to construct API request URLs
- **NAT Gateway**: AWS managed service providing outbound internet access for private subnets (~$32/month)
- **EIC Endpoint**: EC2 Instance Connect Endpoint — only supports ports 22 and 3389

## Bug Details

### Bug Condition

The deployment issues manifest across four distinct conditions that collectively prevent the staging environment from being usable for development and demonstration.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type DeploymentOperation
  OUTPUT: boolean
  
  RETURN (input.type == "DB_ACCESS" AND input.method == "EIC_TUNNEL" AND input.port == 5432)
         OR (input.type == "CONTAINER_START" AND input.databaseUrlSource == "ENTRYPOINT_SCRIPT")
         OR (input.type == "FRONTEND_API_CALL" AND NOT input.path.startsWith("/api/"))
         OR (input.type == "STAGING_COST" AND input.monthlyTotal > 30)
END FUNCTION
```

### Examples

- **DB Access**: Developer runs `aws ec2-instance-connect open-tunnel --remote-port 5432` → fails with "The specified RemotePort is not valid. Specify either 22 or 3389"
- **Container Start**: Backend container boots → bash entrypoint constructs `DATABASE_URL` and runs `npx prisma migrate deploy` outside NestJS lifecycle → no error handling, no logging integration, race conditions possible
- **Frontend API Call**: User clicks login → `fetch('/auth/login')` → request hits frontend Next.js server (ALB default route) → 404 or unexpected HTML response instead of JSON
- **Staging Cost**: Monthly bill arrives at ~$75 (NAT Gateway $32 + RDS $15 + ElastiCache $12 + ALB $16) → excessive for a prototype that runs intermittently

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Production environment continues to use full infrastructure (NAT Gateway, RDS, ElastiCache, ALB) with no cost-cutting
- ALB continues to route `/api/*` to backend target group and all other paths to frontend target group
- NestJS controller decorators remain unchanged (`@Controller('auth')`, `@Controller('portfolio')`, etc.)
- Frontend service layer pattern (`authService`, `portfolioService`, etc.) with centralized `API_URL` configuration remains intact
- Backend connects to the same RDS instance with same credentials and database name
- Prisma migrations continue to run before serving requests (idempotent)
- ECS Fargate services continue to run in private subnets with outbound internet access

**Scope:**
All operations that do NOT involve the four bug conditions should be completely unaffected by these fixes. This includes:
- Production deployments and infrastructure
- Backend controller route handling logic
- Frontend component rendering and state management
- Database schema and data integrity
- Authentication and authorization flows

## Hypothesized Root Cause

Based on the bug analysis, the root causes are:

1. **EIC Port Limitation (Issue 1)**: EC2 Instance Connect Endpoint is architecturally limited to ports 22 (SSH) and 3389 (RDP). It was never designed for arbitrary TCP port forwarding. The infrastructure code (`network-stack.ts`) creates an EIC endpoint with a security group allowing outbound to port 5432, but the EIC service itself rejects the tunnel request at the API level.

2. **Entrypoint Script Anti-Pattern (Issue 2)**: The `backend.Dockerfile` creates a shell entrypoint script that constructs `DATABASE_URL` from env vars and runs `prisma migrate deploy`. This logic belongs in the NestJS application for proper error handling, logging, and lifecycle management. The `PrismaService` already reads `process.env.DATABASE_URL` — but it relies on the entrypoint having set it first.

3. **Missing Global API Prefix (Issue 3)**: The NestJS `main.ts` does NOT call `app.setGlobalPrefix('api')`. Controllers use bare routes (`@Controller('auth')`, `@Controller('portfolio')`). The ALB health check is configured for `/api/health` but no such endpoint exists. The frontend calls `${API_URL}/auth/login` where `API_URL` is empty in production (same-origin). The ALB only forwards `/api/*` to backend — so `/auth/login` hits the frontend target group. The fix requires adding a global `/api` prefix to NestJS so all routes become `/api/auth/login`, `/api/portfolio`, etc.

4. **Over-Provisioned Staging (Issue 4)**: The staging environment mirrors production topology with a NAT Gateway (~$32/month), ElastiCache Redis (~$12/month), and full VPC networking. For a prototype demo that runs intermittently, these components are unnecessary. VPC endpoints can replace NAT Gateway for AWS service access, and in-memory caching (or no caching) can replace ElastiCache in staging.

## Correctness Properties

Property 1: Bug Condition - Frontend API Calls Reach Backend

_For any_ frontend API call where the path targets a backend endpoint (auth, portfolio, listings, contracts, payments, accounting, tracking, notifications), the request SHALL be routed through the ALB to the backend target group by using the `/api` prefix, and the backend SHALL respond with the correct JSON payload.

**Validates: Requirements 2.3**

Property 2: Preservation - Controller Routes and Service Patterns Unchanged

_For any_ request that reaches the backend NestJS application, the controller route handling SHALL produce the same result as before the fix — the global prefix is transparent to controller logic, and the frontend service layer pattern (centralized `API_URL`, same method signatures) SHALL remain unchanged.

**Validates: Requirements 3.3, 3.4, 3.7, 3.8**

## Fix Implementation

### Changes Required

**Issue 1 — DB Access: Replace EIC with SSM Bastion**

**File**: `src/infra/lib/stacks/network-stack.ts`

**Specific Changes**:
1. **Remove EIC Endpoint**: Delete the `CfnInstanceConnectEndpoint` resource and its security group (`EicEndpointSecurityGroup`)
2. **Add SSM Bastion Instance**: Create a minimal `t3.nano` or `t4g.nano` EC2 instance in a private subnet with SSM Agent (Amazon Linux 2023 has it pre-installed), no SSH key pair needed
3. **Security Group**: The bastion's security group allows outbound to the data security group on port 5432; the data security group allows inbound from the bastion's security group on port 5432
4. **IAM Role**: Instance profile with `AmazonSSMManagedInstanceCore` policy for SSM Session Manager access
5. **Usage**: Developers use `aws ssm start-session --target <instance-id> --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"host":["<rds-endpoint>"],"portNumber":["5432"],"localPortNumber":["5432"]}'`

**Issue 2 — DATABASE_URL in Application Code**

**File**: `src/backend/src/shared/prisma/prisma.service.ts`

**Specific Changes**:
1. **Construct DATABASE_URL in PrismaService**: Build the connection string from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` env vars inside the constructor, falling back to `DATABASE_URL` if already set
2. **Run migrations programmatically**: In `onModuleInit()`, call `prisma migrate deploy` programmatically (via `execSync` or Prisma's migrate engine) before `$connect()`, with proper NestJS Logger integration

**File**: `src/infra/docker/backend.Dockerfile`

**Specific Changes**:
3. **Remove entrypoint script**: Delete the `RUN printf ... > /app/entrypoint.sh` block
4. **Change ENTRYPOINT/CMD**: Replace `ENTRYPOINT ["/app/entrypoint.sh"]` + `CMD ["node", "dist/src/main.js"]` with just `CMD ["node", "dist/src/main.js"]`

**Issue 3 — Add Global API Prefix to NestJS**

**File**: `src/backend/src/main.ts`

**Specific Changes**:
1. **Add global prefix**: Add `app.setGlobalPrefix('api')` after app creation
2. **Add health endpoint**: Create a simple health controller at `GET /health` (which becomes `/api/health` with the prefix) returning `{ status: 'ok' }`
3. **Swagger path adjustment**: The Swagger setup at `'api/docs'` will become `/api/api/docs` with the prefix — exclude it from the prefix or adjust the path to `'docs'` so it resolves to `/api/docs`

**File**: Frontend service files (all files in `src/frontend/shared/services/`)

**Specific Changes**:
4. **No changes needed if `NEXT_PUBLIC_API_URL` is set correctly**: In production, set `NEXT_PUBLIC_API_URL=''` (empty, same-origin) and the frontend calls `/auth/login`. But wait — the ALB only routes `/api/*` to backend. So the frontend MUST prefix with `/api`. Two options:
   - Option A: Set `NEXT_PUBLIC_API_URL='/api'` at build time → all calls become `/api/auth/login` → ALB routes to backend → NestJS (with global prefix `api`) handles at `/api/auth/login` ✓
   - Option B: Keep `NEXT_PUBLIC_API_URL=''` and add `/api` to each service file path
   - **Chosen: Option A** — set `NEXT_PUBLIC_API_URL=/api` in the frontend Docker build or ECS environment. This requires zero changes to service files.

**File**: `src/infra/docker/frontend.Dockerfile`

**Specific Changes**:
5. **Set build-time env var**: Add `ENV NEXT_PUBLIC_API_URL=/api` before the `npm run build` step so Next.js inlines it at build time

**Issue 4 — Cost Optimization for Staging**

**File**: `src/infra/lib/config/environments.ts`

**Specific Changes**:
1. **Set natGateways to 0**: Change `natGateways: 1` to `natGateways: 0` for staging

**File**: `src/infra/lib/stacks/network-stack.ts`

**Specific Changes**:
2. **Add VPC Endpoints**: When `natGateways === 0`, add Interface VPC Endpoints for ECR API, ECR Docker, S3 (Gateway), Secrets Manager, CloudWatch Logs, and SSM (for the bastion). This gives private subnets access to AWS services without a NAT Gateway.
3. **Adjust ECS security group**: Add outbound rule to VPC endpoint security group on port 443

**File**: `src/infra/lib/stacks/data-stack.ts`

**Specific Changes**:
4. **Conditionally remove ElastiCache**: When environment is staging, skip the ElastiCache replication group creation entirely
5. **Provide empty/dummy Redis endpoint**: Return a placeholder or empty string for `redisEndpoint` in staging

**File**: `src/backend/src/shared/redis/redis.service.ts` (or equivalent)

**Specific Changes**:
6. **Graceful Redis fallback**: When `REDIS_URL` is empty or connection fails, fall back to in-memory cache or no-op cache for staging

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Verify each bug condition exists in the current codebase by examining configuration and attempting operations.

**Test Cases**:
1. **EIC Tunnel Test**: Attempt `aws ec2-instance-connect open-tunnel --remote-port 5432` → confirm failure (will fail on unfixed code)
2. **Entrypoint Script Test**: Inspect Docker image entrypoint → confirm DATABASE_URL is constructed in shell, not application (will fail on unfixed code)
3. **Frontend Routing Test**: Deploy frontend and backend, make a fetch to `/auth/login` from browser → confirm it hits frontend, not backend (will fail on unfixed code)
4. **Cost Audit Test**: Run `aws ce get-cost-and-usage` for staging → confirm monthly cost exceeds $30 (will fail on unfixed code)

**Expected Counterexamples**:
- EIC rejects port 5432 with explicit error message
- Frontend receives HTML (Next.js 404 page) instead of JSON when calling `/auth/login`
- `docker inspect` shows entrypoint.sh as the container entrypoint

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedSystem(input)
  ASSERT expectedBehavior(result)
END FOR
```

Specifically:
- SSM port forwarding to RDS on port 5432 succeeds
- PrismaService constructs DATABASE_URL internally and runs migrations on boot
- Frontend fetch to `/api/auth/login` reaches backend and returns JSON
- Staging monthly cost estimate < $30 (no NAT Gateway, no ElastiCache)

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalSystem(input) = fixedSystem(input)
END FOR
```

**Testing Approach**: Integration testing and CDK snapshot testing to verify:
- Production config unchanged (NAT Gateway, ElastiCache, full infrastructure)
- ALB routing rules unchanged (`/api/*` → backend, default → frontend)
- Controller routes respond correctly with the new global prefix
- Frontend service methods return same data shapes

**Test Cases**:
1. **Production Config Preservation**: CDK synth for production → verify NAT Gateway, ElastiCache, and all resources present
2. **ALB Routing Preservation**: Verify listener rules still route `/api/*` to backend and default to frontend
3. **Controller Response Preservation**: Hit `/api/auth/login`, `/api/portfolio`, `/api/listings` → verify same response format
4. **Health Check Preservation**: Hit `/api/health` → verify HTTP 200 response

### Unit Tests

- Test PrismaService DATABASE_URL construction from individual env vars
- Test PrismaService fallback to existing DATABASE_URL if already set
- Test health endpoint returns `{ status: 'ok' }`
- Test Redis service graceful fallback when REDIS_URL is empty

### Property-Based Tests

- Generate random combinations of DB env vars (host, port, name, user, password) and verify DATABASE_URL is correctly constructed with proper URL encoding
- Generate random API paths and verify the global prefix routing matches ALB expectations

### Integration Tests

- CDK synth staging → verify no NAT Gateway, no ElastiCache, VPC endpoints present
- CDK synth production → verify full infrastructure unchanged
- Docker build backend → verify no entrypoint.sh, CMD is `node dist/src/main.js`
- Frontend build with `NEXT_PUBLIC_API_URL=/api` → verify API calls use `/api` prefix


## Post-Implementation Design Additions

### Finding 4.1 — Multi-Architecture Docker Builds

**Problem**: Local development machines (Apple Silicon) produce ARM images that are incompatible with ECS Fargate (x86_64).

**Design Note**: All CI/CD pipelines and manual Docker build commands must specify `--platform linux/amd64`. This should be documented in the project README and enforced in any future GitHub Actions workflow. Alternatively, multi-arch builds via `docker buildx` can produce manifests supporting both architectures.

**Affected Files**: No code changes — operational procedure for `docker build` commands.

### Finding 4.2 — Prisma 7 Config Migration

**Problem**: Prisma 7.x removed `url` from `datasource` in `schema.prisma`. The URL must live in `prisma.config.ts`. Additionally, the Prisma CLI at runtime needs `prisma.config.ts` present in the working directory.

**Design Note**: The `datasource db` block in `schema.prisma` only declares `provider` and `schemas`. The connection URL is resolved via `prisma.config.ts` which reads `env("DATABASE_URL")`. The Docker production stage must copy `prisma.config.ts` alongside the schema and migrations.

**Affected Files**:
- `src/backend/db/prisma/schema.prisma` — removed `url = env("DATABASE_URL")`
- `src/infra/docker/backend.Dockerfile` — added `COPY --from=build /app/prisma.config.ts ./prisma.config.ts`

### Finding 4.3 — execSync Environment Inheritance

**Problem**: Passing a restricted `env` object to `execSync` replaces the entire child process environment. Prisma CLI needs `HOME`, `PATH`, and potentially other vars to locate its engines.

**Design Note**: When spawning `prisma migrate deploy`, do not pass an explicit `env` option. Let `execSync` inherit `process.env` directly (the default). The `PrismaService` constructor sets `process.env.DATABASE_URL` before `onModuleInit` runs, so it's available to the child process.

**Affected File**: `src/backend/src/shared/prisma/prisma.service.ts` — removed `env` option from `execSync` call.

### Finding 4.4 — Conditional Redis Environment Variables

**Problem**: Setting `REDIS_URL: redis://${emptyString}:6379` results in `redis://:6379` which ioredis resolves to `localhost:6379`, causing repeated connection failures in staging.

**Design Note**: Redis-related environment variables (`REDIS_HOST`, `REDIS_PORT`, `REDIS_URL`) must only be injected into the ECS task definition when `redisEndpoint` is non-empty. This ensures the `RedisService` enters its no-op fallback path cleanly when ElastiCache is not provisioned.

**Affected File**: `src/infra/lib/stacks/compute-stack.ts` — wrapped Redis env vars in a conditional spread.
