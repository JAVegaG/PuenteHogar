# Tech Stack

## Language

TypeScript across the full stack.

## Architecture

Modular monolith (MVP), designed to evolve toward microservices. Each domain module is self-contained with its own schema.

Internal module communication via APIs (loose coupling even within the monolith).

Application architecture per module: Hexagonal (ports & adapters).

## Frontend

- Next.js (App Router)
- Tailwind CSS for styling
- Responsive web application, mobile-first design
- No native mobile app — browser-based only
- WCAG 2.1 AA accessibility target (contrast ≥ 4.5:1, touch targets ≥ 44px)

## Backend

- NestJS
- Hexagonal architecture per domain module
- RBAC + resource ownership for access control
- Circuit breaker with exponential backoff for external service integrations
- Input validation/sanitization at API boundary and UI layer

## Database

- PostgreSQL (primary relational DB)
- Prisma as ORM — schema definition, migrations, and type-safe queries
- Separate schema per domain module
- Hybrid persistence: RAW table (JSON/JSONB) for incoming data + curated typed tables for reads
- ETL cron jobs to transform raw → curated
- Redis for distributed cache (cache-aside pattern, TTL-controlled)
- Object storage for files (contracts, payment receipts, property photos)

## External Integrations

- Electronic signature provider (external, Colombian legal compliance)
- Payment gateway (PSE, debit/credit cards)
- Messaging channel (WhatsApp preferred for notifications)

## Security Patterns

- Interceptor/validator for incoming requests (XSS/injection prevention)
- RBAC with resource ownership verification
- TLS 1.2+ in transit
- PII fields encrypted at rest (AES-256-CBC, key from `PII_ENCRYPTION_KEY` env var)
- Idempotency keys on all payment operations
- Audit logging for sensitive actions (no PII in logs — identifiers anonymized via sha256)

## Key Implementation Decisions

### Users module
- `user_type` is a denormalization of the role (`LANDLORD`/`TENANT`) stored directly on `User` for fast lookups without joining `users_roles`
- `document_type_id` is a FK to the `DocumentType` catalog table — never a free string
- `DocumentType` catalog seeds: `CC`, `NIT`, `CE`, `PP`, `TI`
- `NaturalPersonDetail` has `preferred_name?` (no `birth_date`, no `pref_cl_type`)
- `UserRole` has its own `id` PK (not composite key)
- `User.registration_date` replaces `expiration_date`
- `GET /auth/document-types` is a public endpoint for frontend dropdowns

### Cross-schema references
- References between schemas (e.g. `user_id` in `LandlordPortfolio`, `lease_id` in `Contract`) are plain `String` fields — no Prisma `@relation` across schemas
- Cross-schema lookups use multi-step queries: e.g. `Lease → PortfolioUnit → LandlordPortfolio` to resolve the landlord user ID

### Notification ports
- Each module that fires notifications uses a local `INotificationPort` stub in its module
- The real `notifications` module will replace these stubs when wired in `AppModule`
- Notifications are always fire-and-forget (no `await`, no throw on failure)

### Circuit Breaker
- `payment`: failureThreshold=3, timeout=30s
- `signature`: failureThreshold=3, timeout=15s
- `messaging`: failureThreshold=3, timeout=15s
- Instances cached by name in `CircuitBreakerFactory`

### MVP stubs
- `ObjectStorageAdapter` returns a placeholder S3 URL — real S3 SDK integration is post-MVP
- `ESignatureProviderAdapter` returns a mock signing ID — real provider integration is post-MVP
- `PaymentGatewayAdapter` returns `APPROVED` with a mock redirect URL — real PSE integration is post-MVP
- `MessagingChannelAdapter` logs to console — real WhatsApp/email integration is post-MVP

## API Documentation (Swagger / OpenAPI)

The backend **must** expose interactive API documentation via Swagger UI. This is a mandatory requirement, not optional.

- Library: `@nestjs/swagger` (already in `package.json`)
- Available at: `http://localhost:{PORT}/api/docs` when the server is running
- Authentication: JWT Bearer token support via the "Authorize" button in Swagger UI

### Setup in `main.ts`

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Plataforma de Arriendo de Vivienda')
  .setVersion('1.0')
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
  .addTag('auth')
  .addTag('listings')
  // ... other tags
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document, {
  swaggerOptions: { persistAuthorization: true },
});
```

### Required decorators on every controller

Every controller **must** have:
- `@ApiTags('tag-name')` — groups endpoints in the Swagger UI
- `@ApiOperation({ summary: '...' })` on every route method
- `@ApiBearerAuth('JWT')` on protected routes (or at controller level if all routes are protected)
- `@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiForbiddenResponse`, etc. on every route

### DTO documentation

**Every DTO field must have `@ApiProperty()` or `@ApiPropertyOptional()`** — Swagger does not infer types from TypeScript alone. Without these decorators, fields appear as `{}` in the generated schema.

#### Request DTOs (class-validator)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThingDto {
  @ApiProperty({ example: 'My title', description: 'Human-readable title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Extra info', description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['A', 'B'], description: 'Allowed values' })
  @IsIn(['A', 'B'])
  type!: 'A' | 'B';
}
```

#### Response DTOs

Response DTOs also need `@ApiProperty()` on every field so Swagger renders the response schema:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ThingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
```

#### Nested DTOs

Use `type: () => NestedDto` (lazy reference) to avoid circular dependency issues:

```typescript
@ApiProperty({ type: () => AddressDto })
address!: AddressDto;

@ApiProperty({ type: [PhotoDto] })
photos!: PhotoDto[];

@ApiPropertyOptional({ type: () => AddressDto, nullable: true })
address!: AddressDto | null;
```

#### Controller response types

Always pass `type:` to `@ApiOkResponse` / `@ApiCreatedResponse` so Swagger generates the full response schema:

```typescript
@ApiOkResponse({ description: 'Thing found', type: ThingResponseDto })
@ApiOkResponse({ description: 'List of things', type: [ThingResponseDto] })
```



The backend uses strict TypeScript. Key rules that affect code style:

```jsonc
{
  "strict": true,
  "strictNullChecks": true,
  "strictPropertyInitialization": true,  // class properties MUST be initialized
  "noImplicitAny": false,                // any is allowed but discouraged
  "module": "NodeNext",                  // use .js extensions in imports if needed
  "isolatedModules": true
}
```

### Implications for DTOs and entities

**`strictPropertyInitialization: true`** means class properties must be initialized at declaration or in the constructor. For DTOs decorated with `class-validator`, use the definite assignment assertion `!`:

```typescript
// ✅ Correct — use ! for class-validator DTOs
export class MyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;  // optional fields use ? (already handles undefined)
}
```

**Response DTOs** that are populated via `dto.field = value` pattern also need `!`:

```typescript
export class MyResponseDto {
  id!: string;
  name!: string;
  createdAt!: Date;
}
```

**Domain entities** use constructor initialization — no `!` needed:

```typescript
export class MyEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}
```

### Path aliases

```
@src/*  → ./src/*
@modules/* → ./modules/*
```

Use these in imports when referencing across the module/src boundary.

## Quality Targets

- LCP ≤ 2.5s on mobile (4G)
- API response ≤ 800ms (p95)
- System availability ≥ 99.5%
- 0 duplicate transactions
- 100% of unauthorized access attempts blocked and logged

## Frontend Conventions

### Typography
- The project uses `font-size: 62.5%` on `<html>` (1rem = 10px), with custom Tailwind tokens defined in `globals.css`
- **NEVER use Tailwind's default text sizes** (`text-sm`, `text-lg`, `text-xl`, etc.) — they resolve to incorrect pixel values with the 62.5% base
- Use the design system tokens instead: `text-h1` (32px), `text-h2` (24px), `text-h3` (20px), `text-body` (16px), `text-caption` (14px), `text-small` (12px)
- Form labels: `text-caption font-medium`
- Section headings in forms: `text-h3 font-semibold`
- Body text: `text-body`

### Desktop Layout for Form Pages
- Form pages and listing pages wrap their `<main>` content in a centered container: `<main className="flex justify-center ..."><div className="w-full max-w-[560px]">...</div></main>`
- This follows the auth pages pattern (`max-w-[448px]`) to prevent forms from stretching across the full viewport on desktop

### Currency (MVP)
- All currency is "COP" (Colombian Peso) for the MVP
- Currency input fields are NOT shown to users — `leaseBaseCurrency: 'COP'` is hardcoded in the request payload
- Money input fields use `formatCOP`/`stripCOP` helpers (same pattern as FilterPanel in property-listings) to display `$1.200.000` format while storing raw digits
- In a future iteration, a backend endpoint will provide available currencies and the frontend will show a dropdown

## Common Commands

```bash
# Frontend (src/frontend)
npm run dev        # Next.js dev server
npm run build      # production build
npm run lint       # lint

# Backend (src/backend)
npm run start:dev  # NestJS dev server (watch mode)
npm run build      # production build
npm run test       # unit tests
npm run test:e2e   # e2e tests
npm run lint       # lint

# DB commands (run from src/backend/)
npm run migration:run      # prisma migrate deploy
npm run migration:generate # prisma migrate dev --name <name>
npm run db:studio          # prisma studio
npm run db:seed            # seed catalog data (roles, document types, statuses)
```
