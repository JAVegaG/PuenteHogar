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
- PII fields encrypted at rest
- Idempotency keys on all payment operations
- Audit logging for sensitive actions

## Quality Targets

- LCP ≤ 2.5s on mobile (4G)
- API response ≤ 800ms (p95)
- System availability ≥ 99.5%
- 0 duplicate transactions
- 100% of unauthorized access attempts blocked and logged

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

# DB
npm run migration:run      # prisma migrate deploy
npm run migration:generate # prisma migrate dev --name <name>
npm run db:studio          # prisma studio (DB browser)
```
