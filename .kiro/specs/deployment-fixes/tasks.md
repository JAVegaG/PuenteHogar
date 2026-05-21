# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Frontend API Calls Fail to Reach Backend
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the routing bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — frontend API calls without `/api` prefix that should reach the backend but instead hit the frontend target group
  - Test that for any backend endpoint path (auth/login, auth/register, portfolio, listings, contracts, payments, accounting, tracking, notifications), the frontend service constructs a URL with the `/api` prefix AND the NestJS app responds at `/api/{path}` (from Bug Condition in design: `input.type == "FRONTEND_API_CALL" AND NOT input.path.startsWith("/api/")`)
  - Verify: `main.ts` calls `app.setGlobalPrefix('api')` so all controller routes are served under `/api/*`
  - Verify: frontend `NEXT_PUBLIC_API_URL` resolves to `/api` so fetch calls become `/api/auth/login`, `/api/portfolio`, etc.
  - Run test on UNFIXED code — expect FAILURE (NestJS has no global prefix, frontend API_URL is empty)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the routing bug exists)
  - Document counterexamples found (e.g., "fetch('/auth/login') hits frontend 404 instead of backend JSON response")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Controller Routes and Service Patterns Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: NestJS controllers use bare decorators (`@Controller('auth')`, `@Controller('portfolio')`, etc.) — these must NOT change
  - Observe: Frontend services use `${API_URL}/auth/login` pattern with centralized `API_URL` — method signatures must NOT change
  - Observe: ALB routes `/api/*` to backend target group and default to frontend — this must NOT change
  - Observe: Production config in `environments.ts` has `natGateways: 1` and full Redis config — must NOT change
  - Write property-based test: for all controller route definitions, the decorator path remains unchanged (no `/api` prefix in controller code)
  - Write property-based test: for all frontend service files, the fetch pattern `${API_URL}/{path}` remains unchanged (no hardcoded `/api` in service files)
  - Write property-based test: production environment config retains `natGateways: 1` and full Redis/ElastiCache configuration
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.3, 3.4, 3.5, 3.7, 3.8_

- [x] 3. Fix Issue 1 — Replace EIC Endpoint with SSM Bastion for DB Access

  - [x] 3.1 Remove EIC Endpoint from network-stack.ts
    - Delete the `EicEndpointSecurityGroup` security group and its egress rule to data SG on port 5432
    - Delete the `dataSg.addIngressRule(eicSg, ...)` rule allowing inbound from EIC SG
    - Delete the `CfnInstanceConnectEndpoint` resource
    - _Bug_Condition: isBugCondition(input) where input.type == "DB_ACCESS" AND input.method == "EIC_TUNNEL" AND input.port == 5432_
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Add SSM Bastion Instance to network-stack.ts
    - Create a `t4g.nano` EC2 instance in a private subnet with Amazon Linux 2023 AMI (SSM Agent pre-installed)
    - Create a security group for the bastion allowing outbound to `dataSg` on port 5432
    - Add inbound rule on `dataSg` allowing traffic from bastion security group on port 5432
    - Create an IAM instance profile with `AmazonSSMManagedInstanceCore` managed policy
    - No SSH key pair needed — access is exclusively via SSM Session Manager
    - Export the bastion instance ID as a stack output for developer convenience
    - _Expected_Behavior: Developers use `aws ssm start-session --target <instance-id> --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"host":["<rds-endpoint>"],"portNumber":["5432"],"localPortNumber":["5432"]}'`_
    - _Requirements: 2.1_

- [x] 4. Fix Issue 2 — Move DATABASE_URL Construction and Migrations to NestJS Application Code

  - [x] 4.1 Update PrismaService to construct DATABASE_URL from env vars
    - In `src/backend/src/shared/prisma/prisma.service.ts`, build the connection string from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` environment variables inside the constructor
    - Fall back to `process.env.DATABASE_URL` if it is already set (for local development)
    - Use proper URL encoding for the password component
    - Use NestJS `Logger` for logging the constructed connection (without exposing the password)
    - _Bug_Condition: isBugCondition(input) where input.type == "CONTAINER_START" AND input.databaseUrlSource == "ENTRYPOINT_SCRIPT"_
    - _Expected_Behavior: PrismaService constructs DATABASE_URL internally from individual env vars_
    - _Requirements: 1.2, 2.2, 3.1_

  - [x] 4.2 Run Prisma migrations programmatically in onModuleInit
    - In `PrismaService.onModuleInit()`, run `prisma migrate deploy` programmatically using `execSync('npx prisma migrate deploy --schema=./db/prisma/schema.prisma')` before calling `$connect()`
    - Wrap in try/catch with NestJS Logger for proper error reporting
    - Log migration success/failure with structured output
    - _Expected_Behavior: Migrations run within NestJS lifecycle with proper error handling and logging_
    - _Preservation: Migrations continue to run before serving requests (idempotent)_
    - _Requirements: 2.2, 3.2_

  - [x] 4.3 Remove entrypoint script from backend Dockerfile
    - Delete the `RUN printf ... > /app/entrypoint.sh` block from `src/infra/docker/backend.Dockerfile`
    - Remove `ENTRYPOINT ["/app/entrypoint.sh"]`
    - Change `CMD ["node", "dist/src/main.js"]` to be the sole startup command (no ENTRYPOINT)
    - _Requirements: 2.2_

- [x] 5. Fix Issue 3 — Add Global `/api` Prefix to NestJS and Set NEXT_PUBLIC_API_URL

  - [x] 5.1 Add `app.setGlobalPrefix('api')` in main.ts
    - Add `app.setGlobalPrefix('api')` after `const app = await NestFactory.create<NestExpressApplication>(AppModule)`
    - Adjust Swagger setup path from `'api/docs'` to `'docs'` so it resolves to `/api/docs` with the prefix (avoiding `/api/api/docs`)
    - Update the Swagger log message accordingly
    - _Bug_Condition: isBugCondition(input) where input.type == "FRONTEND_API_CALL" AND NOT input.path.startsWith("/api/")_
    - _Expected_Behavior: All NestJS routes are served under /api/* matching ALB routing rules_
    - _Preservation: Controller decorators remain unchanged (@Controller('auth'), @Controller('portfolio'), etc.)_
    - _Requirements: 2.3, 3.3, 3.7, 3.8_

  - [x] 5.2 Add health endpoint
    - Create a `HealthController` at `src/backend/src/shared/health/health.controller.ts` with `@Controller('health')` returning `{ status: 'ok' }` on GET
    - Register it in `AppModule`
    - With the global prefix, this becomes `GET /api/health` matching the ALB health check path
    - _Expected_Behavior: ALB health check at /api/health returns HTTP 200_
    - _Requirements: 3.8_

  - [x] 5.3 Set `NEXT_PUBLIC_API_URL=/api` in frontend Dockerfile
    - Add `ENV NEXT_PUBLIC_API_URL=/api` in the build stage of `src/infra/docker/frontend.Dockerfile` BEFORE the `RUN npm run build` step
    - This ensures Next.js inlines `/api` as the API URL at build time
    - No changes needed to frontend service files — they already use `${API_URL}/auth/login` pattern
    - _Expected_Behavior: Frontend fetch calls become /api/auth/login, /api/portfolio, etc._
    - _Preservation: Frontend service layer pattern (authService, portfolioService, centralized API_URL) remains unchanged_
    - _Requirements: 2.3, 3.4_

- [x] 6. Fix Issue 4 — Cost Optimization for Staging

  - [x] 6.1 Set natGateways to 0 for staging in environments.ts
    - Change `natGateways: 1` to `natGateways: 0` in `stagingConfig.network` in `src/infra/lib/config/environments.ts`
    - Production config remains unchanged at `natGateways: 1`
    - _Bug_Condition: isBugCondition(input) where input.type == "STAGING_COST" AND input.monthlyTotal > 30_
    - _Preservation: Production environment continues to use full infrastructure_
    - _Requirements: 2.4, 3.5_

  - [x] 6.2 Add VPC Endpoints to network-stack.ts for staging
    - When `props.natGateways === 0`, create Interface VPC Endpoints for: ECR API, ECR Docker, CloudWatch Logs, Secrets Manager, SSM, and a Gateway Endpoint for S3
    - Create a security group for VPC endpoints allowing inbound HTTPS (443) from the ECS service security group
    - Add outbound rule on ECS service security group to VPC endpoint security group on port 443
    - This gives private subnets access to AWS services without a NAT Gateway
    - _Expected_Behavior: ECS tasks in private subnets can pull images and access AWS services via VPC endpoints_
    - _Preservation: ECS Fargate services continue to have outbound access for ECR image pulls_
    - _Requirements: 2.4, 3.6_

  - [x] 6.3 Conditionally skip ElastiCache in staging (data-stack.ts)
    - When `props.environment === 'staging'`, skip the `CfnSubnetGroup` and `CfnReplicationGroup` creation for ElastiCache
    - Set `this.redisEndpoint` to empty string `''` when ElastiCache is skipped
    - Production continues to create the full ElastiCache replication group
    - _Preservation: Production environment retains full ElastiCache infrastructure_
    - _Requirements: 2.4, 3.5_

  - [x] 6.4 Add graceful Redis fallback in backend
    - In the Redis service (or create `src/backend/src/shared/redis/redis.service.ts` if not existing), add a check: when `REDIS_URL` is empty or undefined, fall back to a no-op cache (methods return null/undefined, set operations are no-ops)
    - Log a warning at startup when running without Redis
    - This allows the backend to function in staging without ElastiCache
    - _Expected_Behavior: Backend operates without Redis in staging using no-op cache fallback_
    - _Requirements: 2.4_

- [x] 7. Verify fixes and run all tests

  - [x] 7.1 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Frontend API Calls Reach Backend
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (global prefix present, NEXT_PUBLIC_API_URL set)
    - When this test passes, it confirms the routing bug is fixed
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.3_

  - [x] 7.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Controller Routes and Service Patterns Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm controller decorators unchanged, frontend service patterns unchanged, production config unchanged

  - [x] 7.3 Run CDK synth for staging and production
    - `npx cdk synth` for staging — verify no NAT Gateway, no ElastiCache, VPC endpoints present, SSM bastion present
    - `npx cdk synth` for production — verify full infrastructure unchanged (NAT Gateway, ElastiCache, ALB, all resources)
    - _Requirements: 3.5, 3.6_

  - [x] 7.4 Run unit tests for PrismaService DATABASE_URL construction
    - Test: when `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` are set, DATABASE_URL is correctly constructed
    - Test: when `DATABASE_URL` is already set, it is used as-is (fallback behavior)
    - Test: password with special characters is properly URL-encoded
    - _Requirements: 2.2, 3.1_

  - [x] 7.5 Docker build verification
    - Build backend Docker image — verify no `entrypoint.sh`, CMD is `node dist/src/main.js`
    - Build frontend Docker image — verify `NEXT_PUBLIC_API_URL=/api` is set before build step
    - _Requirements: 2.2, 2.3_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` in `src/backend/` — verify no TypeScript errors
  - Run `npm run test` in `src/backend/` — verify all unit tests pass
  - Run `npm run build` in `src/frontend/` — verify no build errors
  - Run `npx cdk synth` in `src/infra/` — verify both staging and production stacks synthesize without errors

- [~] 9. Manual QA and post-implementation review
  - Deploy or run the feature locally and test all deployment-related flows end-to-end
  - Verify SSM port forwarding to RDS works: `aws ssm start-session --target <bastion-id> --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"host":["<rds-endpoint>"],"portNumber":["5432"],"localPortNumber":["5432"]}'`
  - Verify backend starts without entrypoint script and runs migrations via PrismaService
  - Verify frontend API calls reach backend (e.g., `/api/auth/login` returns JSON, not HTML)
  - Verify `/api/health` returns `{ status: 'ok' }` with HTTP 200
  - Verify Swagger docs accessible at `/api/docs`
  - Verify staging CDK diff shows no NAT Gateway, no ElastiCache, VPC endpoints added
  - Verify production CDK diff shows no changes (infrastructure preserved)
  - Document any issues found as new requirements in a "Post-Implementation Findings" section in requirements.md
  - Add corresponding design notes and implementation tasks for each finding
  - Re-run build and tests after fixes
