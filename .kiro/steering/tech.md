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

### PII decryption in cross-schema reads
- PII fields (`document_number`, `phone_number`) are stored encrypted (AES-256-CBC) in the `users` schema
- Any module that reads PII cross-schema must inject `IPIIEncryptor` via `@Inject(PII_ENCRYPTOR)` and call `piiEncryptor.decrypt()` before returning data to the frontend
- The `PII_ENCRYPTOR` token and `AES256PIIEncryptor` adapter live in the `users` module — other modules import them as cross-module dependencies
- Modules that need decryption must register `{ provide: PII_ENCRYPTOR, useClass: AES256PIIEncryptor }` in their own module providers and import `ConfigModule` (for the encryption key)
- Example: `GetLeaseDetailUseCase` in `landlord-portfolio` decrypts tenant `document_number` and `phone_number` before returning the lease detail DTO
- Never return encrypted PII ciphertext to the frontend — always decrypt at the use case layer

### Notification ports
- Each module that fires notifications uses a local `INotificationPort` stub in its module
- The real `notifications` module will replace these stubs when wired in `AppModule`
- Notifications are always fire-and-forget (no `await`, no throw on failure)

### Circuit Breaker
- `payment`: failureThreshold=3, timeout=30s
- `signature`: failureThreshold=3, timeout=15s
- `messaging`: failureThreshold=3, timeout=15s
- Instances cached by name in `CircuitBreakerFactory`

### Soft Delete Pattern
- All tables (except RAW tables) have a `deleted_at DateTime?` column
- Active records: `deleted_at = null`
- Soft-deleted records: `deleted_at` contains a UTC timestamp of when the record was deleted
- Soft delete utilities (`src/backend/src/shared/prisma/soft-delete.utils.ts`) provide helpers for repositories:
  - `softDeleteFilter`: constant `{ deleted_at: null }` — spread into `where` clauses on read operations to exclude soft-deleted records
  - `softDeleteData()`: returns `{ deleted_at: new Date() }` — use as `data` payload when converting a delete to an update
  - `withSoftDeleteFilter(where)`: conditionally injects `deleted_at: null` into a where clause if not already present (supports bypass)
- Prisma 6+ does not support the `$use` middleware API, so soft delete is implemented as explicit query helpers rather than transparent middleware
- Bypass: explicitly pass `deleted_at` in the `where` clause (e.g., `where: { deleted_at: { not: null } }`) to include or target soft-deleted records
- RAW tables (`UsersRaw`, `PortfolioRaw`, etc.) do not have `deleted_at` — they use the `processed` flag instead
- **Distinction between `deleted_at` and `is_active`:**
  - `deleted_at` = record deletion lifecycle (the record has been logically removed from the system)
  - `is_active` = catalog item business availability (e.g., a `PropertyType` can be deactivated without being deleted)
  - Catalog tables retain both fields — they serve different purposes

### RAW/ETL Hybrid Persistence Standard
- Each module persists the full incoming payload as a **proper JSON/JSONB object** to its RAW table (e.g., `UsersRaw`, `PortfolioRaw`, `ContractsRaw`)
- **Never use `JSON.stringify(data)`** when writing to RAW tables — pass the object directly to Prisma's `Json` type field
- Each module has a single RAW table that receives the complete payload; the ETL cron materializes (decomposes) that payload into the module's individual curated typed tables
- Example: a single `UsersRaw` record containing user, role, and person detail data is decomposed by the ETL into `User`, `UserRole`, and `NaturalPersonDetail`/`LegalPersonDetail` curated tables
- When reading RAW records, use the `parsePayload<T>()` helper from `@src/shared/etl/parse-payload.ts` for backward compatibility with legacy stringified payloads:
  ```typescript
  function parsePayload<T>(raw: unknown): T {
    if (typeof raw === 'string') {
      return JSON.parse(raw) as T;
    }
    return raw as T;
  }
  ```
- All ETL cron services must use `parsePayload` to handle both formats (proper JSON and legacy stringified JSON) during the transition period

### Cross-Module Communication (Internal API)
- Modules communicate exclusively through **port interfaces** — no direct cross-schema Prisma queries or raw SQL across schema boundaries
- Pattern:
  1. **Define interface + DI token** in the source module's `domain/ports/` directory (e.g., `landlord-portfolio/domain/ports/cross-module-query.port.ts`)
  2. **Implement as a service** in the source module's `infrastructure/` layer using Prisma queries against its own schema only
  3. **Export** the service and DI token from the source module (e.g., `landlord-portfolio.module.ts`)
  4. **Inject** in the consuming module via NestJS DI using the token (e.g., `@Inject(PORTFOLIO_CROSS_MODULE_QUERY)`)
- Cross-module calls are synchronous service method invocations within the monolith (not HTTP calls) — injected via NestJS dependency injection for performance while preserving module boundaries
- Example ports:
  - `IPortfolioCrossModuleQuery` — `hasActiveLeases(userId)`, `hasPortfoliosWithUnits(userId)`, `hasActiveLeasesInPortfolios(userId)`
  - `IContractsCrossModuleQuery` — `hasActiveContractsAsRole(userId, role)`
  - `IPaymentsCrossModuleQuery` — `hasPendingPayments(userId)`
- **Forbidden patterns:**
  - Raw SQL queries that join tables across different PostgreSQL schemas
  - Direct Prisma queries against another module's schema tables
  - Importing another module's repository directly

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

### Desktop Layout for Form Pages (Centered Container Standard)
- All form and visual pages (except `/explorar`) wrap their `<main>` content in a centered container with `max-w-[560px]`:
  ```html
  <main className="flex justify-center px-mobile-margin md:px-desktop-margin ...">
    <div className="w-full max-w-[560px]">...</div>
  </main>
  ```
- This applies to: auth pages (`/auth/login`, `/auth/registro`), `/mi-perfil`, `/mi-portafolio` and sub-pages, `/mis-contratos` and sub-pages, `/mis-contratos-arrendatario` and sub-pages, `/mis-arriendos` and sub-pages, `/mis-ingresos` and sub-pages, `/mis-notificaciones` and sub-pages, `/mis-pagos` and sub-pages
- The `/explorar` page is **exempt** — it uses a full-width grid layout
- All pages use `max-w-[560px]` consistently (not `max-w-[448px]`)

### Currency (MVP)
- All currency is "COP" (Colombian Peso) for the MVP
- Currency input fields are NOT shown to users — `leaseBaseCurrency: 'COP'` is hardcoded in the request payload
- Money input fields use `formatCOP`/`stripCOP` helpers (same pattern as FilterPanel in property-listings) to display `$1.200.000` format while storing raw digits
- In a future iteration, a backend endpoint will provide available currencies and the frontend will show a dropdown

### Back Button Pattern
- Back buttons use `<Link>` from `next/link` (not `<button>` with `router.push()`) for standard link behavior (right-click, open in new tab)
- Back buttons use the `rounded-card` CSS class for border radius
- Back buttons use the left-arrow SVG icon: `<line x1="19" y1="12" x2="5" y2="12" />` + `<polyline points="12 19 5 12 12 5" />` — NOT the chevron (`<polyline points="15 18 9 12 15 6" />`)
- This pattern is established in `mi-portafolio/[id]/unidades/page.tsx` and `mi-portafolio/[id]/agregar-unidad/page.tsx`

### StatusBadge Component
- Shared component at `src/frontend/shared/components/StatusBadge.tsx`
- Accepts `status: string` and `variant: 'lease' | 'unit' | 'payment' | 'listing' | 'contract'`
- Available variants and their color mappings:
  - `lease`: Vigente (green), Acordado (blue), Finalizado (gray)
  - `unit`: Ocupado (amber), Disponible (green), Mantenimiento (red)
  - `payment`: Al día (green), Pendiente (amber)
  - `listing`: Publicada (blue), Sin publicar (gray)
  - `contract`: PENDING → Pendiente (amber), SIGNATURE_PENDING → Firma pendiente (blue), SIGNED → Firmado (green). Uses a `label` field to translate API status keys to Spanish display text.
- Unknown statuses fall back to gray (`#F3F4F6` bg, `#4B5563` text)
- Pages should import the shared `UnitCard` component from `@modules/landlord-portfolio/components/UnitCard.tsx` — do NOT duplicate inline

### ConfirmationDialog Component
- Shared component at `src/frontend/shared/components/ConfirmationDialog.tsx`
- Used for confirming destructive actions (delete portfolio, delete unit)
- Props: `isOpen`, `title`, `message`, `confirmLabel`, `cancelLabel?` (default "Cancelar"), `onConfirm`, `onCancel`, `isLoading?`
- Uses native `<dialog>` element with `role="alertdialog"`, `aria-labelledby`, `aria-describedby`
- Focus trap, Escape key closes via `onCancel`, 44px min touch targets, spinner on confirm when loading

### SideMenu Navigation
- First-level pages (e.g. `/mi-portafolio`, `/mis-contratos`, `/mis-ingresos`, `/auth/login`, `/auth/registro`) use the `SideMenu` component with a hamburger menu button via `Header`'s `onMenuClick`
- **Auth pages (`/auth/login`, `/auth/registro`) are first-level pages** — they use the hamburger menu navigation pattern (NOT a back button). They follow the same `SideMenu` lazy-loading pattern as other first-level pages.
- Sub-level pages (e.g. `/mi-portafolio/[id]/unidades`, `/mis-contratos/[id]`) use a back arrow button via `Header`'s `leftAction`
- The `SideMenu` is lazy-loaded via `React.lazy` + `Suspense` to avoid loading it on every page render
- All `<a>` tags inside `SideMenu` use `<Link>` from `next/link` for client-side navigation

### Primary Button Style (Primary_Button_Style)
- All main CTAs (call-to-action buttons) across the platform use the Primary_Button_Style:
  ```
  bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold
  ```
- Blue background (`#1d4ed8`), white text, `rounded-[6px]` border radius
- Minimum touch target: `44×44px` (`min-h-[44px] min-w-[44px]`) for WCAG 2.1 AA compliance
- Horizontal padding: `px-4`
- Layout: `inline-flex items-center justify-center` for proper content alignment
- Font weight: `font-semibold`
- This applies to primary action buttons (e.g., "Gestionar preferencias", form submit buttons, main navigation CTAs)
- When using `<Link>` from `next/link` as a CTA, apply the same classes to style it as a primary button

### Unit Detail Page Route
- Unit detail page lives at `/mi-portafolio/[id]/unidades/[unitId]` (NOT `/mi-portafolio/[id]`)
- The `[id]` param is the portfolio ID, `[unitId]` is the unit ID
- Back button navigates to `/mi-portafolio/[id]/unidades/`
- `UnitCard` in the units list includes a "Ver detalle de unidad" link pointing to this route

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
