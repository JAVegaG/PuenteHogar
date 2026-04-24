# Implementation Plan: Platform-Wide Improvements

## Overview

This plan implements cross-cutting improvements across three workstreams: frontend UX consistency (Requirements 1–5), backend architecture enforcement (Requirements 6–8), and documentation updates (Requirement 9). All code is TypeScript. Tasks are ordered so that backend foundational changes (soft delete, RAW persistence, cross-module APIs) land first, followed by frontend fixes, and finally documentation updates that codify the new standards.

## Tasks

- [ ] 1. Soft delete — Prisma schema migration and middleware
  - [ ] 1.1 Add `deleted_at DateTime?` column to every Prisma model
    - Add `deleted_at DateTime?` to all models across all 8 schemas in `src/backend/db/prisma/schema.prisma`
    - Exclude RAW tables (`UsersRaw`, `PortfolioRaw`, `PropertyListingsRaw`, `TrackingRaw`, `PaymentsRaw`, `AccountingRaw`, `NotificationsRaw`, `ContractsRaw`) — they use `processed` flag instead
    - Catalog tables (`DocumentType`, `PropertyType`, `Role`, `Permission`, `Department`, `City`, `AdditionalFeature`, `ContractStatus`, `FileType`, `FileStatus`, `SigningStatus`, `PaymentStatus`, `LeaseStatus`, `ListingStatus`, `NotificationType`) retain their existing `is_active` field alongside the new `deleted_at`
    - Generate migration: `npx prisma migrate dev --name add_soft_delete`
    - _Requirements: 7.1, 7.2, 7.6, 7.7_

  - [ ] 1.2 Implement Prisma soft-delete middleware
    - Create `src/backend/src/shared/prisma/soft-delete.middleware.ts`
    - Intercept `findMany`, `findFirst`, `findUnique`, `count` to inject `where: { deleted_at: null }` when `deleted_at` is not explicitly set
    - Intercept `delete` → convert to `update` with `deleted_at: new Date()`
    - Intercept `deleteMany` → convert to `updateMany` with `deleted_at: new Date()`
    - Skip middleware for models without `deleted_at` (RAW tables)
    - Support bypass: when `deleted_at` is explicitly passed (e.g., `deleted_at: undefined` or a sentinel), do not inject the filter
    - Register middleware in `PrismaService` (`src/backend/src/shared/prisma/prisma.service.ts`)
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ]* 1.3 Write property test — Soft delete preserves records (Property 5)
    - **Property 5: Soft delete preserves records**
    - Generate random record objects, simulate soft-delete via middleware, assert record remains in DB with non-null `deleted_at` and all other fields unchanged
    - Use `fast-check` with ≥100 iterations
    - **Validates: Requirements 7.3**

  - [ ]* 1.4 Write property test — Default queries exclude soft-deleted records (Property 6)
    - **Property 6: Default queries exclude soft-deleted records**
    - Generate mixed sets of active and soft-deleted records, run default find through middleware, assert no result has non-null `deleted_at`
    - Use `fast-check` with ≥100 iterations
    - **Validates: Requirements 7.4**

  - [ ]* 1.5 Write property test — Bypass option includes soft-deleted records (Property 7)
    - **Property 7: Bypass option includes soft-deleted records**
    - Generate mixed active/deleted records, run query with explicit bypass, assert all records returned regardless of `deleted_at`
    - Use `fast-check` with ≥100 iterations
    - **Validates: Requirements 7.5**

- [ ] 2. RAW/ETL hybrid persistence fix
  - [ ] 2.1 Fix `JSON.stringify` in users module RAW persistence
    - In `src/backend/modules/users/infrastructure/repositories/prisma-user.repository.ts`, change `payload: JSON.stringify(data)` to `payload: data` in the `create` method's `tx.usersRaw.create()` call
    - _Requirements: 6.2, 6.4_

  - [ ] 2.2 Fix `JSON.stringify` in landlord-portfolio module RAW persistence (if present)
    - Audit `src/backend/modules/landlord-portfolio/infrastructure/repositories/` for `JSON.stringify` on RAW payload
    - Fix to pass the object directly: `payload: data`
    - _Requirements: 6.2, 6.5_

  - [ ] 2.3 Create `parsePayload` ETL helper for backward compatibility
    - Create a shared helper (e.g., `src/backend/src/shared/etl/parse-payload.ts`) that detects `typeof raw === 'string'` and calls `JSON.parse()`, otherwise returns the object as-is
    - Update all ETL cron services to use `parsePayload` when reading from RAW tables
    - _Requirements: 6.7, 6.8_

  - [ ]* 2.4 Write property test — RAW table payload round-trip preserves structure (Property 2)
    - **Property 2: RAW table payload round-trip preserves structure**
    - Generate random valid payload objects, persist to a mock RAW table, read back, assert `typeof payload !== 'string'` and structural equivalence
    - Use `fast-check` with ≥100 iterations
    - **Validates: Requirements 6.2**

  - [ ]* 2.5 Write property test — ETL backward-compatible format handling (Property 4)
    - **Property 4: ETL backward-compatible format handling**
    - Generate random payloads, store as both proper JSON and `JSON.stringify`'d string, run `parsePayload` on both, assert identical output
    - Use `fast-check` with ≥100 iterations
    - **Validates: Requirements 6.8**

  - [ ]* 2.6 Write property test — ETL materialization correctness (Property 3)
    - **Property 3: ETL materialization correctness**
    - Generate random valid RAW payloads, run ETL decomposition logic, verify each curated row's typed fields match the corresponding values in the original JSON payload
    - Use `fast-check` with ≥100 iterations
    - **Validates: Requirements 6.3**

- [ ] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Eliminate cross-schema direct database queries
  - [ ] 4.1 Create `IPortfolioCrossModuleQuery` port and implementation
    - Create port interface at `src/backend/modules/landlord-portfolio/domain/ports/cross-module-query.port.ts` with methods: `hasActiveLeases(userId: string): Promise<boolean>`, `hasPortfoliosWithUnits(userId: string): Promise<boolean>`, `hasActiveLeasesInPortfolios(userId: string): Promise<boolean>`
    - Create implementation at `src/backend/modules/landlord-portfolio/infrastructure/repositories/portfolio-cross-module-query.service.ts` using Prisma queries against `landlord_portfolio` and `tracking_process` schemas only (no raw SQL cross-schema joins)
    - Define DI token `PORTFOLIO_CROSS_MODULE_QUERY`
    - Export the service and token from `landlord-portfolio.module.ts`
    - _Requirements: 8.1, 8.3, 8.6, 8.7, 8.8_

  - [ ] 4.2 Create `IContractsCrossModuleQuery` port and implementation
    - Create port interface at `src/backend/modules/contracts/domain/ports/cross-module-query.port.ts` with method: `hasActiveContractsAsRole(userId: string, role: string): Promise<boolean>`
    - Create implementation at `src/backend/modules/contracts/infrastructure/repositories/contracts-cross-module-query.service.ts` using Prisma queries against `contracts` schema only
    - Define DI token `CONTRACTS_CROSS_MODULE_QUERY`
    - Export the service and token from `contracts.module.ts`
    - _Requirements: 8.1, 8.4, 8.7, 8.8_

  - [ ] 4.3 Create `IPaymentsCrossModuleQuery` port and implementation
    - Create port interface at `src/backend/modules/payments/domain/ports/cross-module-query.port.ts` with method: `hasPendingPayments(userId: string): Promise<boolean>`
    - Create implementation at `src/backend/modules/payments/infrastructure/repositories/payments-cross-module-query.service.ts` using Prisma queries against `payments` schema only
    - Define DI token `PAYMENTS_CROSS_MODULE_QUERY`
    - Export the service and token from `payments.module.ts` (create if needed)
    - _Requirements: 8.1, 8.5, 8.7, 8.8_

  - [ ] 4.4 Refactor `PrismaUserRepository` to use cross-module ports
    - Remove the 5 raw SQL methods (`hasActiveLeases`, `hasActiveContractsAsRole`, `hasPendingPayments`, `hasPortfoliosWithUnits`, `hasActiveLeasesInPortfolios`) from `src/backend/modules/users/infrastructure/repositories/prisma-user.repository.ts`
    - Inject `IPortfolioCrossModuleQuery`, `IContractsCrossModuleQuery`, `IPaymentsCrossModuleQuery` via constructor DI using the tokens
    - Delegate each method call to the corresponding cross-module port
    - Update `users.module.ts` to import `LandlordPortfolioModule`, `ContractsModule`, `PaymentsModule` and register the cross-module DI tokens
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.8_

  - [ ]* 4.5 Write unit tests for cross-module port implementations
    - Test each port method (`hasActiveLeases`, `hasActiveContractsAsRole`, `hasPendingPayments`, `hasPortfoliosWithUnits`, `hasActiveLeasesInPortfolios`) returns correct boolean for known scenarios
    - Test that `PrismaUserRepository` no longer contains raw SQL cross-schema queries
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 5. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Auth pages navigation — hamburger menu instead of back button
  - [ ] 6.1 Update login page to use hamburger menu
    - In `src/frontend/app/auth/login/page.tsx`: remove the `backButton` JSX variable and the `leftAction={backButton}` prop from all `<Header>` usages
    - Add `SideMenu` lazy import, `useState` for menu open state, and `Suspense`-wrapped `SideMenu` render (same pattern as `/mis-notificaciones/page.tsx`)
    - Pass `onMenuClick={() => setMenuOpen(true)}` to `Header`
    - _Requirements: 1.1, 1.3, 1.4_

  - [ ] 6.2 Update registration page to use hamburger menu
    - In `src/frontend/app/auth/registro/page.tsx`: remove the `backButton` JSX variable and the `leftAction={backButton}` prop from all `<Header>` usages
    - Add `SideMenu` lazy import, `useState` for menu open state, and `Suspense`-wrapped `SideMenu` render
    - Pass `onMenuClick={() => setMenuOpen(true)}` to `Header`
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 7. Income page — show portfolio units even when income is zero
  - [ ] 7.1 Ensure income detail page renders all units regardless of income
    - In `src/frontend/app/mis-ingresos/portafolio/[id]/page.tsx` (or equivalent): ensure all units from the portfolio are rendered even when their income is `$0`
    - Each unit row must show: unit name, lease status (via `StatusBadge`), and income amount (defaulting to `$0` for null/undefined/zero)
    - _Requirements: 2.1, 2.2_

  - [ ] 7.2 Verify `PortfolioIncomeCard` always displays `totalUnits`
    - In `src/frontend/modules/landlord-accounting/components/PortfolioIncomeCard.tsx`: confirm `totalUnits` is always rendered from backend data, independent of income
    - In `src/frontend/app/mis-ingresos/page.tsx`: confirm the portfolio list renders cards with `$0` monthly income and correct unit count when income is zero
    - _Requirements: 2.3, 2.4_

- [ ] 8. Notification type translations and CTA button style
  - [ ] 8.1 Add missing notification type translations and fallback formatter
    - In `src/frontend/modules/notifications/utils/translate-notification-type.ts`:
      - Add `PAYMENT_DUE: 'Pago pendiente'` to the translation map
      - Update the fallback to replace underscores with spaces and title-case each word (e.g., `SOME_NEW_TYPE` → `"Some new type"`)
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [ ]* 8.2 Write property test — Unknown notification type fallback formatting (Property 1)
    - **Property 1: Unknown notification type fallback formatting**
    - Generate random strings with underscores not present in the translation map, verify the fallback produces underscore-replaced, title-cased output
    - Use `fast-check` with ≥100 iterations
    - **Validates: Requirements 3.5**

  - [ ] 8.3 Restyle "Gestionar preferencias" CTA as primary button
    - In `src/frontend/modules/notifications/components/NotificationsListView.tsx`: update both CTA instances (empty state and populated list) from text-link style to primary button style: `bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold`
    - Keep the `<Link>` component from `next/link` for client-side navigation to `/mis-notificaciones/preferencias`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 9. Desktop container consistency — `max-w-[560px]` centered layout
  - [ ] 9.1 Update auth pages container from `max-w-[448px]` to `max-w-[560px]`
    - In `src/frontend/app/auth/login/page.tsx`: change `max-w-[448px]` to `max-w-[560px]` and ensure the `<main>` uses the standard centered container pattern (`flex justify-center px-mobile-margin md:px-desktop-margin`)
    - In `src/frontend/app/auth/registro/page.tsx`: same change
    - _Requirements: 5.2, 5.5_

  - [ ] 9.2 Add centered container to notification pages
    - In `src/frontend/app/mis-notificaciones/page.tsx`: wrap `<main>` content in `<div className="w-full max-w-[560px]">` inside a `<main className="flex justify-center px-mobile-margin md:px-desktop-margin ...">`
    - In `src/frontend/app/mis-notificaciones/preferencias/page.tsx`: same pattern
    - _Requirements: 5.1, 5.3, 5.5_

  - [ ] 9.3 Audit and fix remaining pages for centered container
    - Audit all form/visual pages listed in Requirement 5.3: `/mi-perfil`, `/mi-portafolio` and sub-pages, `/mis-contratos` and sub-pages, `/mis-contratos-arrendatario` and sub-pages, `/mis-arriendos` and sub-pages, `/mis-pagos` and sub-pages
    - Add the `max-w-[560px]` centered container wrapper where missing
    - Verify `/explorar` remains exempt (full-width layout)
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

- [ ] 10. Checkpoint — Ensure all frontend and backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Documentation and steering file updates
  - [ ] 11.1 Update steering files with new backend standards
    - In `.kiro/steering/tech.md`: document the soft delete pattern (`deleted_at` column on all tables, distinction from `is_active`), the RAW/ETL hybrid persistence standard (proper JSON/JSONB, no `JSON.stringify`), and the internal API pattern for cross-module communication (port interfaces in `domain/ports/`, NestJS DI injection, no raw SQL cross-schema queries)
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 11.2 Update steering files with new frontend standards
    - In `.kiro/steering/tech.md` and/or `.kiro/steering/structure.md`: document the `max-w-[560px]` centered container standard for all form/visual pages (except `/explorar`), that auth pages are first-level pages using hamburger menu navigation, and the Primary_Button_Style standard for all main CTAs (`bg-[#1d4ed8]`, white text, `rounded-[6px]`, `min-h-[44px]`, `min-w-[44px]`)
    - _Requirements: 9.4, 9.5, 9.6_

  - [ ] 11.3 Update SRS and architectural design documents
    - Review and update `documentation/DOCUMENTO DE ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE.md` and `documentation/Diseño Arquitectónico y Funcional.md` where applicable to reflect the soft delete strategy, RAW/ETL materialization flow, and internal API cross-module communication pattern
    - Ensure consistency with steering file updates and implemented code changes
    - _Requirements: 9.7, 9.8_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each workstream
- Property tests validate the 7 correctness properties defined in the design using `fast-check`
- Unit tests validate specific examples and edge cases
- Backend tasks (1–5) are ordered before frontend tasks (6–9) because soft delete and cross-module APIs are foundational changes
- Documentation tasks (11) come last to reflect the final implemented state
