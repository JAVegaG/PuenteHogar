# Requirements Document — Platform-Wide Improvements

## Introduction

This document specifies the requirements for a set of cross-cutting improvements to the Colombian urban housing rental platform. The improvements span both the Next.js frontend (UX consistency, navigation, labels, layout) and the NestJS backend (persistence patterns, soft delete, modular architecture enforcement). These changes address usability gaps identified during platform usage and architectural debt that must be resolved to maintain the modular monolith's evolution path toward microservices.

**Out of scope:** New features, new pages, new business flows. This spec focuses exclusively on fixing and standardizing existing behavior.

---

## Glossary

- **App_Frontend**: The Next.js (App Router) application in `src/frontend/` that implements the platform's user interface.
- **Auth_Pages**: The login page (`/auth/login`) and registration page (`/auth/registro`) in the App_Frontend.
- **Header_Component**: The shared `Header` component at `src/frontend/shared/components/Header.tsx` that renders the top navigation bar with either a hamburger menu button (via `onMenuClick`) or a custom left action (via `leftAction`).
- **SideMenu_Component**: The lazy-loaded side navigation menu at `src/frontend/shared/components/SideMenu.tsx`.
- **Income_Page**: The "Mis ingresos" page at `/mis-ingresos` that displays portfolio income summaries for landlords.
- **PortfolioIncomeCard**: The component at `src/frontend/modules/landlord-accounting/components/PortfolioIncomeCard.tsx` that renders a portfolio's income summary card.
- **Income_Detail_Page**: The portfolio income detail page at `/mis-ingresos/portafolio/[id]` that shows individual unit income breakdowns for a specific portfolio.
- **Notification_Preferences_Page**: The page at `/mis-notificaciones/preferencias` that allows users to manage external notification channel preferences.
- **Notification_Type_Translation**: The utility at `src/frontend/modules/notifications/utils/translate-notification-type.ts` that maps backend notification type keys to Spanish display labels.
- **Notifications_Page**: The page at `/mis-notificaciones` that displays the user's in-app notification history.
- **CTA_Element**: A call-to-action interactive element (button or link) that prompts the user to perform a primary action.
- **Primary_Button_Style**: The platform's standard primary CTA style: blue background (`#1d4ed8`), white text, `rounded-[6px]`, `min-h-[44px]`, `min-w-[44px]` touch target.
- **Centered_Container**: The `max-w-[560px]` centered layout wrapper used on form and visual pages to prevent content from stretching full-width on desktop viewports, following the pattern: `<main className="flex justify-center ..."><div className="w-full max-w-[560px]">...</div></main>`.
- **RAW_Table**: A per-module PostgreSQL table (e.g., `UsersRaw`, `PortfolioRaw`, `ContractsRaw`) that stores incoming data as JSON/JSONB for later ETL processing into curated typed tables.
- **ETL_Cron**: A scheduled job that transforms data from RAW_Tables into curated typed tables with validated, typed columns.
- **Hybrid_Persistence_Pattern**: The architectural pattern where each module persists incoming data first to a RAW_Table (JSON/JSONB) and then transforms it via ETL_Cron into curated typed tables for reads.
- **Soft_Delete**: A data deletion strategy where records are marked as deleted (via a `deleted_at` timestamp column) rather than physically removed from the database, preserving data for audits and recovery.
- **Cross_Schema_Query**: A database query that directly accesses tables belonging to another module's PostgreSQL schema, bypassing the module's public API boundary.
- **Internal_API**: A controller endpoint or service method exposed by a module that other modules call to access that module's data, respecting the modular monolith boundary.
- **Backend_Module**: A self-contained NestJS module in `src/backend/modules/` following hexagonal architecture with its own domain, application, and infrastructure layers.
- **Prisma_Schema**: The database schema definition at `src/backend/db/prisma/schema.prisma` that defines all models across the 8 PostgreSQL schemas.

---

## Requirements

### Requirement 1: Auth Pages Navigation — Hamburger Menu Instead of Back Button

**User Story:** As a user navigating the platform, I want the login and registration pages to show the side menu hamburger icon instead of a back button, so that I can access the full navigation menu from these first-level pages just like any other top-level page.

#### Acceptance Criteria

1. WHEN a user accesses the login page at `/auth/login`, THE Header_Component SHALL render the default hamburger menu button (via `onMenuClick`) instead of a custom back-arrow `leftAction`.
2. WHEN a user accesses the registration page at `/auth/registro`, THE Header_Component SHALL render the default hamburger menu button (via `onMenuClick`) instead of a custom back-arrow `leftAction`.
3. WHEN the user taps the hamburger menu button on the Auth_Pages, THE App_Frontend SHALL open the SideMenu_Component with the same behavior as other first-level pages (e.g., `/mi-portafolio`, `/mis-ingresos`).
4. THE Auth_Pages SHALL maintain all existing functionality (form rendering, authentication redirect, loading states) without modification beyond the navigation change.

---

### Requirement 2: Income Page — Show Portfolio Units Even When Income Is Zero

**User Story:** As a landlord, I want to see all units in a portfolio even when their income is $0 for the current period, so that I understand which units belong to the portfolio without being confused by an empty list.

#### Acceptance Criteria

1. WHEN a landlord navigates to the Income_Detail_Page for a portfolio that has units but no income for the current reporting period, THE Income_Detail_Page SHALL display all portfolio units with their names and a `$0` income amount.
2. THE Income_Detail_Page SHALL display each unit's name, lease status, and income amount regardless of whether the income amount is zero or positive.
3. WHEN a portfolio has zero total income for the current period, THE Income_Page SHALL still display the portfolio in the PortfolioIncomeCard with `$0` as the monthly income value and the correct unit count.
4. THE PortfolioIncomeCard SHALL always display the `totalUnits` count retrieved from the backend, independent of whether those units have income for the current period.

---

### Requirement 3: Notification Preferences — Human-Readable Spanish Labels for All Notification Types

**User Story:** As a user managing my notification preferences, I want all notification type labels to be displayed in human-readable Spanish, so that I can understand what each notification type means without seeing raw technical keys.

#### Acceptance Criteria

1. THE Notification_Type_Translation SHALL provide a Spanish label for every notification type defined in the `NotificationType` catalog table in the backend.
2. WHEN a new notification type is added to the backend catalog, THE Notification_Type_Translation SHALL be updated to include a corresponding Spanish label.
3. THE Notification_Preferences_Page SHALL display each notification type section heading using the translated Spanish label from the Notification_Type_Translation utility.
4. THE Notifications_Page SHALL display each notification card's type label using the translated Spanish label from the Notification_Type_Translation utility.
5. WHEN the Notification_Type_Translation encounters a notification type key not present in its translation map, THE Notification_Type_Translation SHALL display the original key as a fallback, formatted with underscores replaced by spaces and title-cased (e.g., `PAYMENT_DUE` becomes "Payment due").
6. THE Notification_Type_Translation SHALL include translations for at minimum the following types: `CONTRACT_SIGNED` → "Contrato firmado", `PAYMENT_RECEIVED` → "Pago recibido", `CONTACT_INITIATED` → "Contacto iniciado", `CONTRACT_UPLOADED` → "Contrato cargado", `PAYMENT_DUE` → "Pago pendiente".

---

### Requirement 4: Notification Page CTA — Button Style Consistency

**User Story:** As a user viewing my notifications, I want the "Gestionar preferencias" call-to-action to appear as a primary button instead of a text link, so that the visual hierarchy is consistent with other primary actions across the platform.

#### Acceptance Criteria

1. THE Notifications_Page SHALL render the "Gestionar preferencias" CTA as a button element styled with the Primary_Button_Style (blue background `#1d4ed8`, white text, `rounded-[6px]`, minimum touch target `44×44px`).
2. THE Notifications_Page SHALL render the "Gestionar preferencias" CTA using a `<Link>` component from `next/link` that navigates to `/mis-notificaciones/preferencias`, styled as a primary button rather than a text link.
3. THE "Gestionar preferencias" CTA SHALL maintain the same navigation behavior (client-side navigation to `/mis-notificaciones/preferencias`) as the current implementation.
4. THE "Gestionar preferencias" CTA SHALL appear in both the empty-state view and the populated notifications list view with the same Primary_Button_Style.

---

### Requirement 5: Desktop Container Consistency Across All Form and Visual Pages

**User Story:** As a user accessing the platform from a desktop browser, I want all form and visual pages to use a centered container layout, so that content does not stretch uncomfortably across the full viewport width.

#### Acceptance Criteria

1. THE App_Frontend SHALL wrap the `<main>` content of all form pages and visual pages (except the `/explorar` page) inside a Centered_Container with `max-w-[560px]`.
2. THE Auth_Pages (`/auth/login` and `/auth/registro`) SHALL use the Centered_Container pattern, updating from the current `max-w-[448px]` to `max-w-[560px]` for consistency with other pages.
3. THE following pages SHALL use the Centered_Container pattern: `/mi-perfil`, `/mi-portafolio` and its sub-pages, `/mis-contratos` and its sub-pages, `/mis-contratos-arrendatario` and its sub-pages, `/mis-arriendos` and its sub-pages, `/mis-ingresos` and its sub-pages, `/mis-notificaciones` and its sub-pages, `/mis-pagos` and its sub-pages.
4. THE `/explorar` page SHALL remain exempt from the Centered_Container pattern and retain its current full-width layout.
5. THE Centered_Container SHALL use the existing CSS pattern: `<main className="flex justify-center px-mobile-margin md:px-desktop-margin ..."><div className="w-full max-w-[560px]">...</div></main>`.

---

### Requirement 6: RAW/ETL Hybrid Persistence Pattern Enforcement Across All Modules

**User Story:** As a backend developer, I want all modules to follow the hybrid persistence pattern (RAW JSON table + curated typed tables + ETL cron) consistently, so that data ingestion is uniform and ETL processing does not fail due to inconsistent data formats.

#### Acceptance Criteria

1. THE Backend_Module for each domain (users, property-listings, landlord-portfolio, contracts, payments, accounting, notifications) SHALL persist incoming write data to its respective RAW_Table before or alongside writing to curated typed tables.
2. WHEN a Backend_Module persists data to a RAW_Table, THE Backend_Module SHALL store the `payload` field as a proper JSON/JSONB object (using Prisma's `Json` type), not as a stringified JSON string.
3. THE `users` module SHALL update its `UsersRaw` persistence to pass the payload as a JSON object instead of calling `JSON.stringify(data)` on the payload value.
4. THE `landlord-portfolio` module SHALL update its `PortfolioRaw` persistence to pass the payload as a JSON object instead of calling `JSON.stringify(data)` on the payload value.
5. THE `contracts` module, `payments` module, and `notifications` module SHALL maintain their current correct pattern of storing proper JSON objects in their respective RAW_Tables.
6. WHEN an ETL_Cron processes records from a RAW_Table, THE ETL_Cron SHALL be able to read the `payload` field directly as a JSON object without needing to parse a stringified JSON string.
7. IF a RAW_Table contains legacy records with stringified JSON payloads, THEN THE ETL_Cron SHALL handle both formats (stringified string and proper JSON object) gracefully during a transition period.

---

### Requirement 7: Soft Delete for All Database Tables

**User Story:** As a platform operator, I want all database tables to support soft delete via a `deleted_at` timestamp column, so that records are never physically removed and can be recovered or audited when needed.

#### Acceptance Criteria

1. THE Prisma_Schema SHALL add a `deleted_at` column of type `DateTime?` (nullable) with a default value of `null` to every model in all 8 PostgreSQL schemas (users, property_listings, landlord_portfolio, tracking_process, payments, accounting, notifications, contracts).
2. THE `deleted_at` column SHALL be `null` for active records and contain a UTC timestamp for soft-deleted records.
3. WHEN a Backend_Module performs a delete operation, THE Backend_Module SHALL set the `deleted_at` column to the current UTC timestamp instead of physically removing the record from the database.
4. WHEN a Backend_Module performs a read or list operation, THE Backend_Module SHALL filter out records where `deleted_at` is not `null`, returning only active records by default.
5. WHEN a Backend_Module needs to include soft-deleted records (e.g., for audit or recovery purposes), THE Backend_Module SHALL provide an explicit option to bypass the soft-delete filter.
6. THE database migration for adding `deleted_at` columns SHALL be backward-compatible, setting `deleted_at` to `null` for all existing records.
7. THE catalog tables (DocumentType, PropertyType, Department, City, AdditionalFeature, ContractStatus, FileType, FileStatus, SigningStatus, PaymentStatus, LeaseStatus, ListingStatus, NotificationType, Role, Permission) SHALL retain their existing `is_active` boolean field in addition to the new `deleted_at` column, since `is_active` serves a different business purpose (catalog item availability) than soft delete (record deletion).

---

### Requirement 8: Eliminate Cross-Schema Direct Database Queries

**User Story:** As a backend architect, I want all inter-module data access to go through internal APIs (controller endpoints or service methods) instead of direct cross-schema database queries, so that the modular monolith maintains proper boundaries and can evolve toward microservices.

#### Acceptance Criteria

1. THE Backend_Module for each domain SHALL access data from other modules exclusively through Internal_APIs (exported service methods or HTTP controller endpoints), not through direct Prisma queries against another module's schema tables.
2. THE `users` module SHALL expose Internal_API methods for checking active resources across schemas: `hasActiveLeases(userId)`, `hasActiveContractsAsRole(userId, role)`, `hasPendingPayments(userId)`, `hasPortfoliosWithUnits(userId)`, and `hasActiveLeasesInPortfolios(userId)` — replacing the current raw SQL Cross_Schema_Queries in `PrismaUserRepository`.
3. WHEN the `users` module needs to verify if a user has active leases, THE `users` module SHALL call an Internal_API exposed by the `landlord-portfolio` module instead of executing a raw SQL query against the `landlord_portfolio.lease` table.
4. WHEN the `users` module needs to verify if a user has active contracts, THE `users` module SHALL call an Internal_API exposed by the `contracts` module instead of executing a raw SQL query against the `contracts.contract_party` and `contracts.contract` tables.
5. WHEN the `users` module needs to verify if a user has pending payments, THE `users` module SHALL call an Internal_API exposed by the `payments` module instead of executing a raw SQL query against the `payments.scheduled_payment` and `payments.payment` tables.
6. WHEN the `users` module needs to verify if a user has portfolios with units, THE `users` module SHALL call an Internal_API exposed by the `landlord-portfolio` module instead of executing a raw SQL query against the `landlord_portfolio` tables.
7. EACH Backend_Module that exposes Internal_APIs for cross-module consumption SHALL define the API contract as a port interface in its `domain/ports/` directory, following the hexagonal architecture pattern.
8. THE cross-module Internal_API calls SHALL be synchronous service method invocations within the monolith (not HTTP calls), injected via NestJS dependency injection, to maintain performance while preserving module boundaries.
