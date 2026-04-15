# Project Structure

The system is a modular monolith. Each business domain is a self-contained module with its own application logic, ports/adapters, and database schema.

## Business Domains

- `users` — registration, authentication, roles (landlord / tenant), document type catalog
- `property-listings` — public offer, search, filtering, photos, contact events
- `landlord-portfolio` — landlord's property management, portfolio units, leases
- `contracts` — contract upload, e-signature integration, document storage
- `payments` — payment gateway integration, payment scheduling, receipts
- `accounting` — financial reports, income summaries
- `rental-tracking` — rental lifecycle state machine, status visibility
- `notifications` — event-driven notifications (WhatsApp, email, in-app)

## Folder Structure

```
src/
  frontend/                         # Next.js app (planned)
    app/                            # App Router pages and layouts
    modules/
      users/
      property-listings/
      landlord-portfolio/
      contracts/
      payments/
      accounting/
      rental-tracking/
      notifications/
    shared/
    styles/

  backend/                          # NestJS app
    db/
      prisma/
        schema.prisma               # Prisma schema — 8 PostgreSQL schemas
        migrations/
      seeds/                        # dev/test seed data (roles, document types, statuses)
    modules/
      users/
        domain/                     # entities, value objects, port interfaces
        application/                # use cases, DTOs
        infrastructure/             # Prisma repos, external adapters
        users.module.ts
        users.controller.ts
      property-listings/
      landlord-portfolio/
      contracts/
      payments/
      accounting/
      rental-tracking/
      notifications/
    src/
      app.module.ts
      main.ts
      config/
        configuration.ts            # typed env config factory
      shared/
        audit/                      # AuditLoggerService
        circuit-breaker/            # CircuitBreaker + CircuitBreakerFactory
        decorators/                 # @Roles(), @Public()
        guards/                     # JwtAuthGuard, RBACGuard
        interceptors/               # ValidationInterceptor (XSS/SQL sanitization)
        prisma/                     # PrismaService (@Global)
        redis/                      # RedisService (@Global, cache-aside)

documentation/                      # SRS, architectural design PDFs/MDs
.kiro/
  specs/
    backend-database-implementation/ # requirements.md, design.md, tasks.md
  steering/                         # tech.md, structure.md, product.md
```

## Module Internal Structure (hexagonal)

```
modules/{name}/
  domain/
    entities/          # plain TypeScript classes (no Prisma dependency)
    ports/             # interfaces: IRepository, IExternalAdapter, etc.
  application/
    dtos/              # class-validator decorated DTOs
    use-cases/         # one file per use case, injection tokens defined here
  infrastructure/
    repositories/      # PrismaXxxRepository implements IXxxRepository
    adapters/          # external service adapters (stubs for MVP)
  {name}.module.ts
  {name}.controller.ts
```

## Conventions

- Hexagonal architecture per module: domain → application → infrastructure
- Modules communicate only through defined API interfaces, never direct DB joins across schemas
- Cross-schema references are plain `String` fields — no Prisma `@relation` across schemas
- Cross-schema lookups use multi-step queries (e.g. `Lease → PortfolioUnit → LandlordPortfolio`)
- RAW tables store incoming JSON/JSONB; curated tables are read-optimized typed columns
- ETL cron jobs handle raw → curated transformation
- All external service calls go through adapters with circuit breaker logic
- RBAC enforced at the application layer; resource ownership checked per request
- Input validation at both UI and API boundary
- Notification ports are stubbed per-module; real `notifications` module wires them in `AppModule`
- All notifications are fire-and-forget (no `await`, no throw on failure)

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
| AD-15 | `user_type` denormalization for fast role lookups |
| AD-16 | `DocumentType` catalog table — no free-string document types |
