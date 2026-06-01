# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Tenant Lease Detail Shows Tracking Instead of Property Info
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in the current codebase
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases:
    - `GET /leases/:leaseId/detail` endpoint does not exist in `landlord-portfolio` module (404)
    - `RentalDetailView` renders tracking timeline (`Estado actual`, `Progreso`) but NOT property info (`Canon mensual`, property card)
    - `GET /payments/units` endpoint does not exist (404)
    - `PaymentsView` renders flat payment list instead of unit-grouped cards
    - `GET /payments/:paymentId/detail` endpoint does not exist (404)
  - Write integration tests for the backend:
    - Test that `GET /leases/:leaseId/detail` returns 404 (endpoint missing in landlord-portfolio)
    - Test that `GET /payments/units` returns 404 (endpoint missing)
    - Test that `GET /payments/units/:unitId/history` returns 404 (endpoint missing)
    - Test that `GET /payments/:paymentId/detail` returns 404 (endpoint missing)
  - Write component tests for the frontend:
    - Test that `RentalDetailView` does NOT render a property info card (only tracking timeline)
    - Test that `PaymentsView` does NOT render unit-grouped cards (only flat list)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found:
    - Lease detail page contains `h2` "Estado actual" but NOT "Canon mensual" or property info card
    - Payments page renders individual payment cards but NOT unit-grouped cards
    - No endpoints exist for tenant lease detail, payment units, or payment detail
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unchanged Tenant Behaviors (Empty States, Permissions, Not-Found, Gateway Flow)
  - **IMPORTANT**: Follow observation-first methodology
  - **Observe behavior on UNFIXED code for non-buggy inputs:**
    - Observe: Tenant with no active leases sees "No tienes arriendos activos" + "Explorar inmuebles" link
    - Observe: Tenant with no payments sees "No tienes pagos registrados" message
    - Observe: Non-TENANT user accessing `/mis-arriendos` or `/mis-pagos` sees "No tienes permisos"
    - Observe: Invalid lease ID shows "Arriendo no encontrado" with back link
    - Observe: `initiatePayment` calls the payment gateway adapter and returns redirect URL
    - Observe: Lease list page (`/mis-arriendos`) displays lease cards with property name and status badge
  - **Write property-based tests capturing observed behavior patterns:**
    - For all users without TENANT role → permission denied message is shown
    - For all tenants with zero active leases → empty state with "Explorar inmuebles" link
    - For all tenants with zero payments → empty state with "No tienes pagos registrados"
    - For all invalid lease IDs → not-found state with back link
    - For all payment initiation requests with valid data → gateway adapter returns redirect URL
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8_

- [x] 3. Backend: New `GetTenantLeaseDetailUseCase` + endpoint in `landlord-portfolio` module

  - [x] 3.1 Create `TenantLeaseDetailDto` response DTO
    - File: `src/backend/modules/landlord-portfolio/application/dtos/tenant-lease-detail.dto.ts`
    - Fields: `leaseId`, `unitId`, `propertyType`, `neighborhood`, `address`, `monthlyAmount`, `currency`, `leaseStatus`, `nextPayment: { id, amount, dueDate, status } | null`
    - Add `@ApiProperty()` decorators on all fields for Swagger documentation
    - _Requirements: 2.1_

  - [x] 3.2 Create `GetTenantLeaseDetailUseCase`
    - File: `src/backend/modules/landlord-portfolio/application/use-cases/get-tenant-lease-detail.use-case.ts`
    - Accepts `leaseId` and `userId` (from JWT)
    - Verifies `Lease.user_id = userId` (resource ownership — 403 if not tenant)
    - Resolves within `landlord_portfolio` schema: `Lease → PortfolioUnit` (get `portfolio_unit_id`, `lease_base_amount`, `lease_base_currency`)
    - Resolves within `landlord_portfolio` schema: `PortfolioUnit.property_id → Property + Address` (get property type, neighborhood, address)
    - Cross-schema call to `payments` module via `IPaymentsCrossModuleQuery` port: queries next pending `ScheduledPayment` where `lease_id = leaseId AND status = 'PENDING' AND deleted_at = null` ordered by `due_date ASC LIMIT 1`
    - Returns `TenantLeaseDetailDto`
    - _Bug_Condition: isBugCondition_LeaseDetail(X) where X.action = "click_lease_card"_
    - _Expected_Behavior: page contains property_info_card, monthly_rent_amount, next_payment_card, pagar_ahora_button_
    - _Preservation: Existing landlord-facing tracking views remain unchanged_
    - _Requirements: 2.1_

  - [x] 3.3 Create `tenant-leases.controller.ts` with `GET /leases/:leaseId/detail` endpoint
    - File: `src/backend/modules/landlord-portfolio/tenant-leases.controller.ts`
    - Route prefix: `/leases`
    - `@ApiTags('tenant-leases')`
    - Protected route with `@ApiBearerAuth('JWT')`
    - Add `@ApiOperation`, `@ApiOkResponse({ type: TenantLeaseDetailDto })`, `@ApiForbiddenResponse`
    - Inject and call `GetTenantLeaseDetailUseCase`
    - Register controller in `landlord-portfolio.module.ts`
    - _Requirements: 2.1_

  - [x] 3.4 Define `IPaymentsCrossModuleQuery` port for next pending payment lookup
    - File: `src/backend/modules/payments/domain/ports/payments-cross-module-query.port.ts`
    - Method: `getNextPendingPayment(leaseId: string): Promise<{ id: string; amount: number; dueDate: Date; status: string } | null>`
    - Implement in `payments/infrastructure/` using Prisma query against `payments` schema
    - Export DI token `PAYMENTS_CROSS_MODULE_QUERY` from `payments.module.ts`
    - Inject in `landlord-portfolio` module via `@Inject(PAYMENTS_CROSS_MODULE_QUERY)`
    - _Requirements: 2.1_

  - [x] 3.5 Write unit tests for `GetTenantLeaseDetailUseCase`
    - Test resolves property info within `landlord_portfolio` schema correctly
    - Test returns next pending payment via cross-module port (earliest due date)
    - Test returns `null` next payment when all are PAID
    - Test rejects non-tenant users (403 Forbidden)
    - Test handles soft-deleted records correctly (`deleted_at = null` filter)
    - _Requirements: 2.1_

- [x] 4. Backend: New `GET /payments/units` endpoint (unit-grouped cards)

  - [x] 4.1 Create `PaymentUnitCardDto` response DTO
    - File: `src/backend/modules/payments/application/dtos/payment-unit-card.dto.ts`
    - Fields: `unitId`, `propertyName`, `propertyType`, `neighborhood`, `leaseStatus`, `pendingCount`
    - Add `@ApiProperty()` decorators
    - _Requirements: 2.3_

  - [x] 4.2 Create `GetPaymentUnitsUseCase`
    - File: `src/backend/modules/payments/application/use-cases/get-payment-units.use-case.ts`
    - Accepts `userId` (from JWT)
    - Queries `ScheduledPayment` grouped by `lease_id`
    - Resolves `lease_id → Lease → PortfolioUnit → Property + Address` cross-schema via `IPortfolioCrossModuleQuery` port
    - Groups by `portfolio_unit_id`, returns one card per unit with property name and lease status
    - Filters only active leases (tenant's leases where `deleted_at = null`)
    - _Bug_Condition: isBugCondition_PaymentsList(X) where X.destination = "/mis-pagos"_
    - _Expected_Behavior: page displays unit_cards_grouped_by_property AND NOT flat_payment_list_
    - _Requirements: 2.3_

  - [x] 4.3 Add `GET /payments/units` endpoint
    - File: `src/backend/modules/payments/payments.controller.ts`
    - Protected route, `@ApiTags('payments')`, `@ApiBearerAuth('JWT')`
    - Add `@ApiOperation`, `@ApiOkResponse({ type: [PaymentUnitCardDto] })`
    - _Requirements: 2.3_

  - [x] 4.4 Write unit tests for `GetPaymentUnitsUseCase`
    - Test groups payments by unit correctly (one card per distinct unit)
    - Test resolves property name cross-schema via port
    - Test returns empty array for tenant with no payments
    - Test excludes soft-deleted leases/payments
    - _Requirements: 2.3_

- [x] 5. Backend: New `GET /payments/units/:unitId/history` endpoint

  - [x] 5.1 Create `PaymentHistoryQueryDto` request DTO and `PaymentHistoryItemDto` response DTO
    - Query params: `status` (ALL | PENDING | PAID | OVERDUE), `page` (default 1), `limit` (default 10)
    - Response fields: `id`, `monthLabel`, `dueDate`, `amount`, `currency`, `status`
    - Add `@ApiProperty()` and `class-validator` decorators
    - _Requirements: 2.4_

  - [x] 5.2 Create `GetPaymentHistoryByUnitUseCase`
    - File: `src/backend/modules/payments/application/use-cases/get-payment-history-by-unit.use-case.ts`
    - Accepts `unitId`, `userId`, `status`, `page`, `limit`
    - Verifies authenticated user is the tenant on the lease associated with the unit
    - Queries `ScheduledPayment` where `lease_id` matches the unit's lease, filtered by status
    - Returns paginated results with total count
    - _Requirements: 2.4_

  - [x] 5.3 Add `GET /payments/units/:unitId/history` endpoint
    - File: `src/backend/modules/payments/payments.controller.ts`
    - Protected route with query param validation
    - Add Swagger decorators
    - _Requirements: 2.4_

  - [x] 5.4 Write unit tests for `GetPaymentHistoryByUnitUseCase`
    - Test filters by status (PENDING, PAID, OVERDUE, ALL)
    - Test pagination (page, limit, total count)
    - Test rejects non-tenant users (403)
    - _Requirements: 2.4_

- [x] 6. Backend: New `GET /payments/:paymentId/detail` endpoint

  - [x] 6.1 Create `PaymentDetailDto` response DTO
    - File: `src/backend/modules/payments/application/dtos/payment-detail.dto.ts`
    - Fields: `id`, `status`, `amount`, `currency`, `dueDate`, `lineItems: PaymentLineItemDto[]`, `isPending: boolean`
    - Conditional fields for PAID: `datePaid`, `paymentMethod`, `receiptUrl`
    - Add `@ApiProperty()` decorators
    - _Requirements: 2.5, 2.6_

  - [x] 6.2 Create `GetPaymentDetailUseCase`
    - File: `src/backend/modules/payments/application/use-cases/get-payment-detail.use-case.ts`
    - Accepts `paymentId` and `userId`
    - Verifies authenticated user is the tenant
    - For PENDING: returns line items breakdown + `isPending: true`
    - For PAID: returns line items + payment log data (date paid, method, receipt) + `isPending: false`
    - Does NOT include payment method selection for paid payments (frontend responsibility)
    - _Bug_Condition: isBugCondition_PaymentDetail(X) AND isBugCondition_PaidPaymentView(X)_
    - _Expected_Behavior: pending → line items + checkout; paid → receipt only, NO payment actions_
    - _Requirements: 2.5, 2.6_

  - [x] 6.3 Add `GET /payments/:paymentId/detail` endpoint
    - File: `src/backend/modules/payments/payments.controller.ts`
    - Protected route with Swagger decorators
    - _Requirements: 2.5, 2.6_

  - [x] 6.4 Write unit tests for `GetPaymentDetailUseCase`
    - Test returns line items for pending payments
    - Test returns receipt data for paid payments
    - Test does NOT include checkout fields for paid payments
    - Test rejects non-tenant users (403)
    - _Requirements: 2.5, 2.6_

- [x] 7. Frontend: Refactor `RentalDetailView` to show property info + payment CTAs (no tracking)

  - [x] 7.1 Update `tenant.ts` service with new API calls
    - File: `src/frontend/shared/services/tenant.ts`
    - Add `getTenantLeaseDetail(leaseId, token)` → `GET /leases/:leaseId/detail`
    - Add `getPaymentUnits(token)` → `GET /payments/units`
    - Add `getPaymentHistory(unitId, token, filters)` → `GET /payments/units/:unitId/history`
    - Add `getPaymentDetail(paymentId, token)` → `GET /payments/:paymentId/detail`
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [x] 7.2 Refactor `RentalDetailView` component
    - File: `src/frontend/modules/tenant/components/RentalDetailView.tsx`
    - Replace tracking-only view with property-info-centric layout
    - Call `getTenantLeaseDetail(leaseId, token)` for property info + next payment
    - Display: property info card (type icon, type name, neighborhood, address)
    - Display: "Canon mensual" with formatted COP amount
    - Display: next payment card (due date, amount, status badge) with "Pagar ahora" CTA → navigates to `/mis-pagos/{unitId}/{nextPaymentId}`
    - Display: "Ver historial de pagos" link → navigates to `/mis-pagos/{unitId}`
    - **NO tracking timeline section** — tracking is a landlord-only concern, not shown on tenant lease detail
    - Use `StatusBadge` component with `variant='payment'` for next payment status
    - Use `formatCOP` helper for currency display
    - Follow centered container standard (`max-w-[560px]`)
    - _Bug_Condition: isBugCondition_LeaseDetail(X)_
    - _Expected_Behavior: property_info_card + monthly_rent + next_payment + CTAs, NO tracking_
    - _Requirements: 2.1_

- [x] 8. Frontend: Refactor `PaymentsView` to show unit cards

  - [x] 8.1 Refactor `PaymentsView` component
    - File: `src/frontend/modules/tenant/components/PaymentsView.tsx`
    - Replace flat payment list with unit cards (call `getPaymentUnits(token)`)
    - Each card shows property name + lease status badge (use `StatusBadge` with `variant='lease'`)
    - Card click navigates to `/mis-pagos/{unitId}`
    - Keep empty state "No tienes pagos registrados" when no units returned
    - Follow centered container standard (`max-w-[560px]`)
    - _Bug_Condition: isBugCondition_PaymentsList(X)_
    - _Expected_Behavior: unit_cards_grouped_by_property, NOT flat_payment_list_
    - _Preservation: Empty state message preserved_
    - _Requirements: 2.3, 3.3_

- [x] 9. Frontend: New route `/mis-pagos/[unitId]/page.tsx` with `PaymentHistoryView`

  - [x] 9.1 Create `PaymentHistoryView` component
    - File: `src/frontend/modules/tenant/components/PaymentHistoryView.tsx`
    - Filter tabs: Todos, Pendientes, Pagados, Vencidos
    - List of monthly payment cards: month/year title, due date, amount, status badge, "Pagar >" link (pending), "Ver comprobante" link (paid)
    - Pagination at the bottom
    - Call `getPaymentHistory(unitId, token, { status, page, limit })`
    - Use `StatusBadge` with `variant='payment'`
    - Use `formatCOP` for amounts
    - Back button navigates to `/mis-pagos`
    - _Requirements: 2.4_

  - [x] 9.2 Create page route file
    - File: `src/frontend/app/mis-pagos/[unitId]/page.tsx`
    - Import and render `PaymentHistoryView`
    - Follow centered container standard, back button pattern, Header with `leftAction`
    - _Requirements: 2.4_

- [x] 10. Frontend: New route `/mis-pagos/[unitId]/[paymentId]/page.tsx` with `PaymentDetailView`

  - [x] 10.1 Create `PaymentDetailView` component
    - File: `src/frontend/modules/tenant/components/PaymentDetailView.tsx`
    - Conditional rendering based on payment status:
      - **PENDING**: "Resumen de la cuota" with line items, due date warning banner, payment method selection (Tarjeta débito/crédito, Transferencia bancaria / PSE), "Continuar con pago" primary button
      - **PAID**: Read-only receipt — amount paid, date paid, line items, payment method used, receipt link. NO payment method selection, NO "Continuar con pago" button
    - Call `getPaymentDetail(paymentId, token)`
    - Use Primary_Button_Style for "Continuar con pago"
    - Use `formatCOP` for amounts
    - Back button navigates to `/mis-pagos/{unitId}`
    - _Bug_Condition: isBugCondition_PaymentDetail(X) AND isBugCondition_PaidPaymentView(X)_
    - _Expected_Behavior: pending → checkout UI; paid → read-only receipt_
    - _Requirements: 2.5, 2.6_

  - [x] 10.2 Create page route file
    - File: `src/frontend/app/mis-pagos/[unitId]/[paymentId]/page.tsx`
    - Import and render `PaymentDetailView`
    - Follow centered container standard, back button pattern, Header with `leftAction`
    - _Requirements: 2.5, 2.6_

- [x] 11. Fix verification and validation

  - [x] 11.1 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Tenant Lease Detail Shows Property Info and Payment CTAs
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied:
      - `GET /leases/:leaseId/detail` returns 200 with property info (from landlord-portfolio module)
      - `GET /payments/units` returns 200 with unit-grouped cards
      - `GET /payments/units/:unitId/history` returns 200 with filtered history
      - `GET /payments/:paymentId/detail` returns 200 with line items (pending) or receipt (paid)
      - `RentalDetailView` renders property info card, canon mensual, next payment, CTAs — NO tracking
      - `PaymentsView` renders unit-grouped cards
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [x] 11.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Unchanged Tenant Behaviors
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fix:
      - Empty states render correctly
      - Permission checks work
      - Not-found states work
      - Payment gateway adapter flow unchanged
      - Pagination works
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8_

- [x] 12. Checkpoint - Ensure all tests pass
  - Run `npm run build` in `src/backend/` — no compilation errors
  - Run `npm run test` in `src/backend/` — all unit tests pass
  - Run `npm run build` in `src/frontend/` — no compilation errors
  - Run `npm run lint` in both `src/backend/` and `src/frontend/` — no lint errors
  - Verify all property-based tests (bug condition + preservation) pass
  - Ensure all tests pass, ask the user if questions arise

- [x] 13. Manual QA and post-implementation review
  - Deploy or run the feature locally and test all user-facing flows end-to-end
  - Test flow: lease list → lease detail → "Pagar ahora" → payment detail → "Continuar con pago" → gateway redirect
  - Test flow: lease detail → "Ver historial de pagos" → payment history → filter tabs → click paid payment → receipt view
  - Test flow: `/mis-pagos` → unit card click → payment history → filter tabs work correctly
  - Verify lease detail page shows ONLY property info + payment CTAs (no tracking timeline)
  - Verify back navigation works correctly at each level of the page hierarchy
  - Verify UI text is in Spanish and free of raw IDs/UUIDs
  - Verify `StatusBadge` variants display correct colors for all payment statuses
  - Verify currency amounts display in `$X.XXX.XXX` COP format
  - Verify WCAG 2.1 AA compliance (touch targets ≥ 44px, contrast ≥ 4.5:1)
  - Document any issues found as new requirements in a "Post-Implementation Findings" section in bugfix.md
  - Add corresponding design notes and implementation tasks for each finding
  - Re-run build and tests after fixes



