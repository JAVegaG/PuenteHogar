# Project Structure

The system is a modular monolith. Each business domain is a self-contained module with its own application logic, ports/adapters, and database schema.

## Business Domains

- `users` — registration, authentication, roles (landlord / tenant)
- `property-listings` — public offer, search, filtering, photos
- `landlord-portfolio` — landlord's property management
- `contracts` — contract upload, e-signature integration, document storage
- `payments` — payment gateway integration, payment scheduling, receipts
- `accounting` — financial reports, income summaries
- `rental-tracking` — rental lifecycle state machine, status visibility
- `notifications` — event-driven notifications (WhatsApp, email, in-app)

## Folder Structure

The project is split into `src/frontend` (Next.js) and `src/backend` (NestJS). Both sides mirror the same domain structure — modules that have UI and API concerns live in both trees under the same name.

```
src/
  frontend/                         # Next.js app
    app/                            # App Router pages and layouts
    modules/
      users/
        components/                 # React components for this domain
        hooks/                      # domain-specific hooks
        services/                   # API client calls
      property-listings/
      landlord-portfolio/
      contracts/
      payments/
      accounting/
      rental-tracking/
      notifications/
    shared/                         # shared UI components, utils, types
    styles/                         # global Tailwind config / base styles

  backend/                          # NestJS app
    modules/
      users/
        domain/                     # entities, value objects, domain services
        application/                # use cases / input ports
        infrastructure/             # adapters: DB, external APIs, messaging
        users.module.ts
      property-listings/
      landlord-portfolio/
      contracts/
      payments/
      accounting/
      rental-tracking/
      notifications/
    shared/                         # guards, interceptors, pipes, decorators
    config/                         # env config, DB, Redis setup

db/
  prisma/
    schema.prisma                   # Prisma schema (models, enums, relations)
    migrations/                     # auto-generated migration files
  seeds/                            # dev/test seed data

documentation/                      # architecture and requirements PDFs/MDs
```

## Conventions

- Hexagonal architecture per module: domain → application → infrastructure
- Modules communicate only through defined API interfaces, never direct DB joins across schemas
- RAW tables store incoming JSON/JSONB; curated tables are read-optimized typed columns
- ETL cron jobs handle raw → curated transformation
- All external service calls go through adapters with circuit breaker logic
- RBAC enforced at the application layer; resource ownership checked per request
- Input validation at both UI and API boundary

## Key Design Decisions

| ID | Decision |
|----|----------|
| AD-01 | Modular monolith as base architecture |
| AD-03 | Responsive web app, mobile-first |
| AD-04 | Hexagonal architecture per module |
| AD-05 | Inter-module communication via APIs |
| AD-06 | JavaScript/TypeScript full stack |
| AD-07 | Circuit breaker for external integrations |
| AD-08 | Input sanitization at UI and API boundary |
| AD-09 | RBAC + resource ownership |
| AD-10 | Separate DB schema per module |
| AD-11 | Cache for low-frequency-update data |
| AD-12 | Redis distributed cache (cache-aside) |
| AD-13 | Hybrid persistence: RAW JSON + curated typed tables |
| AD-14 | PostgreSQL as primary DB |
