# Implementation Plan: Tenant Flows Frontend

## Overview

This plan implements the tenant-facing frontend experience and its supporting backend endpoint. Ordered by dependency: backend repository method → DTO → use case → controller route → frontend service → shared component modifications → new pages → existing page modification. All code is TypeScript. No database migrations are needed.

## Tasks

- [x] 1. Add `findContractsByTenantId` to `IContractRepository` and `PrismaContractRepository`
  - [x] 1.1 Add `findContractsByTenantId` to `IContractRepository` port and `TenantContractRawItem` interface
    - Add to `src/backend/modules/contracts/domain/ports/contract-repository.port.ts`:
    - `findContractsByTenantId(tenantUserId: string): Promise<TenantContractRawItem[]>`
    - Define `TenantContractRawItem` interface: `{ id: string; leaseId: string; status: string; startDate: Date; endDate: Date | null; portfolioUnitId: string; landlordUserId: string; createdAt: Date }`
    - _Requirements: 2.1, 2.2_

  - [x] 1.2 Implement `findContractsByTenantId` in `PrismaContractRepository`
    - In `src/backend/modules/contracts/infrastructure/repositories/prisma-contract.repository.ts`
    - Step 1: Find all `ContractParty` where `user_id = tenantUserId` and `role_in_contract = 'TENANT'`, select `contract_id`
    - Step 2: Find all `Contract` by those IDs, include `status`, order by `created_at` DESC
    - Step 3: For each contract, resolve `Lease` by `contract.lease_id` to get `portfolio_unit_id` and find the `ContractParty` with `role_in_contract = 'LANDLORD'` to get `landlordUserId`
    - Return `TenantContractRawItem[]` — the use case handles cross-schema name resolution and PII decryption
    - _Requirements: 2.1, 2.6_

- [x] 2. Create `TenantContractListItemDto` and `GetTenantContractsUseCase`
  - [x] 2.1 Create `TenantContractListItemDto` response DTO
    - Create `src/backend/modules/contracts/application/dtos/tenant-contract-list-item.dto.ts`
    - Fields: `id!: string`, `leaseId!: string`, `status!: string` (`@ApiProperty({ example: 'PENDING' })`), `startDate!: Date`, `endDate!: Date | null` (`@ApiPropertyOptional({ nullable: true })`), `unitName!: string`, `landlordName!: string`
    - Use `@ApiProperty()` on all required fields per Swagger convention
    - _Requirements: 2.2_

  - [x] 2.2 Create `GetTenantContractsUseCase`
    - Create `src/backend/modules/contracts/application/use-cases/get-tenant-contracts.use-case.ts`
    - Inject `IContractRepository` via `@Inject(CONTRACT_REPOSITORY)` and `IPIIEncryptor` via `@Inject(PII_ENCRYPTOR)`
    - Import `PII_ENCRYPTOR` from `@modules/users/application/use-cases/register-user.use-case`
    - `execute(userId: string): Promise<TenantContractListItemDto[]>`
    - Call `repository.findContractsByTenantId(userId)` to get raw items
    - Resolve unit names: collect unique `portfolioUnitId` values → query `prisma.portfolioUnit.findMany` → build `unitNameMap`
    - Resolve landlord names: collect unique `landlordUserId` values → query `prisma.naturalPersonDetail.findMany` and `prisma.legalPersonDetail.findMany` → decrypt PII fields with `piiEncryptor.decrypt()` → build `landlordNameMap` (natural person: `first_name + last_name`, legal person: `business_name`)
    - Map raw items to `TenantContractListItemDto[]`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Add `GET /contracts/tenant` route and wire use case in module
  - [x] 3.1 Add `GET /contracts/tenant` route to `ContractsController`
    - Add the route **before** the existing `GET /contracts/:id` route (and before `GET /contracts/landlord` or after it — just before `:id`) to avoid NestJS treating `tenant` as an `:id` parameter
    - `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth('JWT')`, `@ApiOperation({ summary: 'Listar contratos del arrendatario' })`, `@ApiOkResponse({ type: [TenantContractListItemDto] })`
    - Calls `getTenantContractsUseCase.execute(req.user.id)`
    - Inject `GetTenantContractsUseCase` in controller constructor
    - _Requirements: 2.1_

  - [x] 3.2 Register `GetTenantContractsUseCase` and PII dependencies in `ContractsModule`
    - Add `GetTenantContractsUseCase` to providers
    - Add `{ provide: PII_ENCRYPTOR, useClass: AES256PIIEncryptor }` to providers (import from `@modules/users`)
    - Add `PrismaService` injection for cross-schema lookups in the use case (already available)
    - _Requirements: 2.1_

- [x] 4. Checkpoint — Backend complete
  - Ensure all tests pass (`npm run test` from `src/backend/`), ask the user if questions arise.

- [x] 5. Create `tenantService` frontend service
  - Create `src/frontend/shared/services/tenant.ts`
  - Define TypeScript interfaces: `ActiveLeaseSummary`, `LeaseStatusResponse`, `LeaseStatusHistoryItem`, `PaymentResponse`, `InitiatePaymentRequest`, `InitiatePaymentResponse`, `TenantContractListItem` — as specified in the design document
  - Implement `tenantService` object with functions:
    - `getActiveLeases(token: string): Promise<ActiveLeaseSummary[]>` — `GET ${API_URL}/tracking/leases/active`
    - `getLeaseStatus(leaseId: string, token: string): Promise<LeaseStatusResponse>` — `GET ${API_URL}/tracking/leases/${leaseId}/status`
    - `getPaymentHistory(token: string): Promise<PaymentResponse[]>` — `GET ${API_URL}/payments/history`
    - `initiatePayment(data: InitiatePaymentRequest, token: string): Promise<InitiatePaymentResponse>` — `POST ${API_URL}/payments/initiate`
    - `transitionLeaseState(leaseId: string, newState: string, token: string): Promise<void>` — `POST ${API_URL}/tracking/leases/transition`
    - `getTenantContracts(token: string): Promise<TenantContractListItem[]>` — `GET ${API_URL}/contracts/tenant`
  - Error handling: 401 → "Sesión expirada", 403 → "No tienes permiso para realizar esta acción", 404 → "Recurso no encontrado", 5xx → "Error del servidor. Intenta de nuevo más tarde.", network error → "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo."
  - All requests include `Authorization: Bearer <token>` header, use native `fetch`
  - Follow the same pattern as `contractService` in `src/frontend/shared/services/contract.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 6. Extend `StatusBadge` with `tracking` and `paymentStatus` variants
  - In `src/frontend/shared/components/StatusBadge.tsx`
  - Add `trackingColors` mapping using `ContractColorMapping` pattern (with `label` field): PUBLISHED → "Publicado" (`#F3F4F6` bg, `#4B5563` text), CONTACT_INITIATED → "Contacto iniciado" (`#DBEAFE` bg, `#1E40AF` text), CONTRACT_UPLOADED → "Contrato cargado" (`#FEF3C7` bg, `#92400E` text), CONTRACT_SIGNED → "Contrato firmado" (`#DCFCE7` bg, `#166534` text), PAYMENT_RECEIVED → "Pago recibido" (`#D1FAE5` bg, `#065F46` text)
  - Add `paymentStatusColors` mapping using `ContractColorMapping` pattern: PENDING → "Pendiente" (`#FEF3C7` bg, `#92400E` text), PROCESSING → "Procesando" (`#DBEAFE` bg, `#1E40AF` text), PAID → "Pagado" (`#DCFCE7` bg, `#166534` text), REJECTED → "Rechazado" (`#FEE2E2` bg, `#991B1B` text)
  - Register both in `variantMap`
  - Extend `StatusBadgeProps.variant` type to include `'tracking' | 'paymentStatus'`
  - Existing variants must remain unchanged
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 7. Modify `SideMenu` for role-based navigation
  - In `src/frontend/shared/components/SideMenu.tsx`
  - Update `SideMenuProps` to accept `user?: { name: string; role: string; roles?: string[] } | null`
  - Define `TENANT_LINKS` and `LANDLORD_LINKS` arrays as specified in the design
  - Replace hardcoded `NAV_LINKS` with a `buildNavLinks(roles: string[])` function that:
    - Returns `TENANT_LINKS` for TENANT-only users
    - Returns `LANDLORD_LINKS` for LANDLORD-only users
    - Returns the merged union for dual-role users: shared links (Explorar, Mi perfil) appear once; contract links disambiguated as "Mis contratos (arrendador)" and "Mis contratos (arrendatario)"
  - When `roles` is absent, fall back to current `NAV_LINKS` behavior (backward compatibility)
  - Anonymous users continue to see only "Explorar inmuebles" + login/register
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8. Checkpoint — Shared components complete
  - Ensure frontend builds (`npm run build` from `src/frontend/`) and lint passes (`npm run lint` from `src/frontend/`), ask the user if questions arise.

- [x] 9. Create Rentals List Page (`/mis-arriendos`)
  - [x] 9.1 Create the Next.js page file
    - Create `src/frontend/app/mis-arriendos/page.tsx`
    - Server component that renders the `RentalsListView` client component wrapped in `ProtectedRoute`
    - _Requirements: 3.1, 3.9_

  - [x] 9.2 Create `RentalsListView` client component
    - Create `src/frontend/modules/tenant/components/RentalsListView.tsx`
    - `'use client'` component, uses `useAuth` for token and roles
    - TENANT role check: if user lacks TENANT role, show permission message
    - On mount: fetch leases via `tenantService.getActiveLeases(token)`
    - Display each lease as a card: property name (H3), `StatusBadge` variant `tracking`, relative date using `Intl.RelativeTimeFormat` with locale `es`
    - Card is a `<Link>` to `/mis-arriendos/[leaseId]`
    - Loading state: `Skeleton` placeholders with `aria-busy="true"`, `aria-live="polite"`
    - Empty state: message + link to `/explorar`
    - Error state: `ErrorState` with retry; 401 → `logout()`
    - Header with hamburger → SideMenu (lazy-loaded), pass `roles` to SideMenu
    - Centered layout: `<main className="flex justify-center ..."><div className="w-full max-w-[560px]">...</div></main>`
    - 44px min touch targets on cards
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 11.1, 11.2, 11.4, 11.6_

- [x] 10. Create Rental Detail Page (`/mis-arriendos/[id]`)
  - [x] 10.1 Create the Next.js page file
    - Create `src/frontend/app/mis-arriendos/[id]/page.tsx`
    - Server component that renders the `RentalDetailView` client component wrapped in `ProtectedRoute`
    - Extract `id` from route params
    - _Requirements: 4.1_

  - [x] 10.2 Create `RentalDetailView` client component
    - Create `src/frontend/modules/tenant/components/RentalDetailView.tsx`
    - `'use client'` component, uses `useAuth` for token
    - On mount: fetch `tenantService.getLeaseStatus(id, token)`
    - Sections:
      1. Current state: `StatusBadge` variant `tracking` + last changed date
      2. Progress timeline: vertical stepper with 5 lifecycle states (PUBLISHED → CONTACT_INITIATED → CONTRACT_UPLOADED → CONTRACT_SIGNED → PAYMENT_RECEIVED), completed states in primary blue (`#1d4ed8`), pending in gray (`#d1d5db`), current highlighted with `aria-current="step"`, `aria-label` on each step
      3. History: chronological list of state transitions (most recent first), state name in Spanish + formatted date
    - Extract `classifyTimelineSteps(currentState)` as a pure exported function for testability — returns array of `{ state, label, classification: 'completed' | 'current' | 'pending' }`
    - Header with back arrow → `/mis-arriendos` (left-arrow SVG, `rounded-card` class, `<Link>`)
    - Loading state: `Skeleton`; 404: not found message + link to `/mis-arriendos`; error: `ErrorState` with retry
    - Centered layout
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 11.1, 11.4, 11.7_

- [x] 11. Create Tenant Contracts List Page (`/mis-contratos-arrendatario`)
  - [x] 11.1 Create the Next.js page file
    - Create `src/frontend/app/mis-contratos-arrendatario/page.tsx`
    - Server component that renders the `TenantContractsListView` client component wrapped in `ProtectedRoute`
    - _Requirements: 5.1, 5.8_

  - [x] 11.2 Create `TenantContractsListView` client component
    - Create `src/frontend/modules/tenant/components/TenantContractsListView.tsx`
    - `'use client'` component, uses `useAuth` for token and roles
    - TENANT role check
    - On mount: fetch `tenantService.getTenantContracts(token)`
    - Display each contract as a card: unit name (H3), landlord name (caption, `#4b5563`), `StatusBadge` variant `contract`, date range formatted in Spanish
    - Card is a `<Link>` to `/mis-contratos-arrendatario/[id]`
    - Loading: `Skeleton`; empty: message; error: `ErrorState` with retry; 401 → `logout()`
    - Header with hamburger → SideMenu (lazy-loaded), pass `roles`
    - Centered layout, 44px touch targets
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 11.1, 11.2, 11.6_

- [x] 12. Create Tenant Contract Detail Page (`/mis-contratos-arrendatario/[id]`)
  - [x] 12.1 Create the Next.js page file
    - Create `src/frontend/app/mis-contratos-arrendatario/[id]/page.tsx`
    - Server component that renders the `TenantContractDetailView` client component wrapped in `ProtectedRoute`
    - Extract `id` from route params
    - _Requirements: 6.1_

  - [x] 12.2 Create `TenantContractDetailView` client component
    - Create `src/frontend/modules/tenant/components/TenantContractDetailView.tsx`
    - `'use client'` component, uses `useAuth` for token
    - On mount: fetch `contractService.getContract(id, token)` (reuses existing service)
    - Display: `StatusBadge` variant `contract`, date range, parties list with roles in Spanish (Arrendador/Arrendatario), "Ver documento" link (`<a href={fileUrl} target="_blank" rel="noopener noreferrer">`)
    - Conditional messages: SIGNATURE_PENDING → "El contrato está en proceso de firma", SIGNED → "El contrato ha sido firmado por todas las partes"
    - Header with back arrow → `/mis-contratos-arrendatario` (left-arrow SVG, `rounded-card`, `<Link>`)
    - Loading: `Skeleton`; 403: permission denied message; error: `ErrorState` with retry
    - Centered layout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 11.1_

- [x] 13. Create Payments Page (`/mis-pagos`)
  - [x] 13.1 Create the Next.js page file
    - Create `src/frontend/app/mis-pagos/page.tsx`
    - Server component that renders the `PaymentsView` client component wrapped in `ProtectedRoute`
    - _Requirements: 7.1, 7.12_

  - [x] 13.2 Create `PaymentsView` client component
    - Create `src/frontend/modules/tenant/components/PaymentsView.tsx`
    - `'use client'` component, uses `useAuth` for token and roles
    - TENANT role check
    - On mount: fetch `tenantService.getPaymentHistory(token)`
    - Display each payment as a card: amount formatted with `formatCOP`, due date in Spanish, `StatusBadge` variant `paymentStatus`, description (if available)
    - PENDING payments show a "Pagar" button:
      - On click: call `tenantService.initiatePayment({ scheduledPaymentId }, token)`
      - While processing: button disabled + spinner (`isSubmitting` state)
      - On success: inline confirmation message (MVP stub returns APPROVED)
      - On failure: inline error message below button, button re-enabled for retry
    - Loading: `Skeleton`; empty: message "No tienes pagos registrados"; error: `ErrorState` with retry; 401 → `logout()`
    - Header with hamburger → SideMenu (lazy-loaded), pass `roles`
    - Centered layout, 44px touch targets
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 11.1, 11.2, 11.6_

- [x] 14. Checkpoint — New pages complete
  - Ensure frontend builds and lint passes, ask the user if questions arise.

- [x] 15. Modify Listing Detail Page (`/explorar/[id]`) — Contact Landlord Button
  - In `src/frontend/app/explorar/[id]/page.tsx`
  - Add a "Contactar arrendador" button below the `ListingDetailView` component (only visible when listing is loaded successfully)
  - Auth check inline:
    - Not authenticated → redirect to `/auth/login`
    - Authenticated but not TENANT → show message "Solo los arrendatarios pueden contactar arrendadores"
    - Authenticated TENANT → show `ConfirmationDialog` asking to confirm contact initiation
  - On confirm: call `tenantService.transitionLeaseState(leaseId, 'CONTACT_INITIATED', token)`
  - On success: confirmation message "El contacto ha sido iniciado. El arrendador será notificado."
  - On 404 error: "No se encontró un arriendo asociado a este inmueble"
  - On network/server error: "Ocurrió un error al iniciar el contacto. Intenta de nuevo."
  - Button disabled + spinner while processing
  - 44px min touch target
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 11.2_

- [x] 16. Update all tenant pages to pass `roles` to SideMenu
  - Ensure all pages that render `SideMenu` (both new tenant pages and existing landlord pages) pass the `roles` array from `useAuth().user.roles` to the SideMenu `user` prop
  - Update `ContractsListView` (`src/frontend/modules/landlord-contracts/components/ContractsListView.tsx`) and any other existing pages that use SideMenu to pass `roles`
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 17. Checkpoint — All pages complete
  - Ensure frontend builds and lint passes, ask the user if questions arise.

- [ ] 18. Property-based tests
  - [ ]* 18.1 Write property test for auth header attachment
    - **Property 1: Authorization header is always attached**
    - **Validates: Requirements 1.4**
    - Use fast-check to generate random non-empty token strings
    - Mock `fetch` and verify every `tenantService` function attaches `Authorization: Bearer <token>` header
    - Place test in `src/frontend/shared/services/__tests__/tenant.property.spec.ts`

  - [ ]* 18.2 Write property test for 5xx Spanish error messages
    - **Property 2: Server errors produce Spanish error messages**
    - **Validates: Requirements 1.7**
    - Use fast-check to generate random integers in 500–599 range
    - Mock `fetch` to return those status codes, verify error message is a non-empty Spanish string (not HTTP status code or English text)
    - Place test in `src/frontend/shared/services/__tests__/tenant.property.spec.ts`

  - [ ]* 18.3 Write property test for tenant contracts filter correctness
    - **Property 3: Tenant contracts endpoint returns only tenant-party contracts**
    - **Validates: Requirements 2.1, 2.2**
    - Use fast-check to generate random contract/party configurations with varying roles
    - Verify `GetTenantContractsUseCase` returns only contracts where user is TENANT party, with all required fields non-null
    - Place test in `src/backend/modules/contracts/application/use-cases/get-tenant-contracts.property.spec.ts`

  - [ ]* 18.4 Write property test for tenant contracts ordering
    - **Property 4: Tenant contracts are ordered by creation date descending**
    - **Validates: Requirements 2.6**
    - Use fast-check to generate random lists of contracts with varying dates
    - Verify each contract's creation date ≥ next contract's creation date in the returned list
    - Place test in `src/backend/modules/contracts/application/use-cases/get-tenant-contracts.property.spec.ts`

  - [ ]* 18.5 Write property test for timeline step classification
    - **Property 5: Timeline step classification is consistent with lifecycle ordering**
    - **Validates: Requirements 4.4**
    - Use fast-check to generate random valid tracking states
    - Verify `classifyTimelineSteps(currentState)` classifies states before current as "completed", current as "current", and after as "pending"
    - Place test in `src/frontend/modules/tenant/components/__tests__/timeline.property.spec.ts`

  - [ ]* 18.6 Write property test for role-based navigation links
    - **Property 6: Role-based navigation links are the correct union**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
    - Use fast-check to generate random subsets of {TENANT, LANDLORD}
    - Verify `buildNavLinks(roles)` returns exactly the union of role-specific links with no duplicates for shared links and disambiguated contract labels for dual-role
    - Place test in `src/frontend/shared/components/__tests__/SideMenu.property.spec.ts`

  - [ ]* 18.7 Write property test for StatusBadge variant mappings
    - **Property 7: StatusBadge variant mappings produce correct labels and colors**
    - **Validates: Requirements 10.1, 10.2, 10.3**
    - Use fast-check to generate random valid variant/status pairs
    - Verify rendered badge displays correct Spanish label, background color, and text color
    - Verify existing variant mappings remain unchanged
    - Place test in `src/frontend/shared/components/__tests__/StatusBadge.property.spec.ts`

  - [ ]* 18.8 Write property test for StatusBadge color contrast
    - **Property 8: StatusBadge color pairs meet WCAG AA contrast ratios**
    - **Validates: Requirements 11.5**
    - Enumerate all variant/status combinations
    - Compute contrast ratio between text color and background color
    - Verify ratio ≥ 4.5:1 for all pairs
    - Place test in `src/frontend/shared/components/__tests__/StatusBadge.property.spec.ts`

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure backend tests pass (`npm run test` from `src/backend/`), frontend builds (`npm run build` from `src/frontend/`), and lint passes (`npm run lint` from `src/frontend/`). Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The `GET /contracts/tenant` route MUST be registered before `GET /contracts/:id` in the controller to avoid route conflicts
- All DTOs use `!` definite assignment per `strictPropertyInitialization: true`
- All controller methods include `@ApiOperation`, `@ApiBearerAuth`, and response type decorators for Swagger
- Frontend uses Spanish UI text, English code identifiers, and Spanish URL routes
- Back buttons use `<Link>`, `rounded-card` class, and left-arrow SVG (line pattern, not chevron)
- Cross-schema queries use multi-step lookups (no Prisma `@relation` across schemas)
- PII decryption for landlord names uses `IPIIEncryptor` injected via `@Inject(PII_ENCRYPTOR)` — import token from `register-user.use-case.ts`
- The `classifyTimelineSteps` function is extracted as a pure export for property-based testing
- The `buildNavLinks` function is extracted as a pure export from SideMenu for property-based testing
- Property tests use fast-check library and follow the tag format: `Feature: tenant-flows-frontend, Property {N}: {title}`
- The tenant contract detail page reuses `contractService.getContract()` — no new backend endpoint needed
- `tenantService.transitionLeaseState` wraps `POST /tracking/leases/transition` which already exists
