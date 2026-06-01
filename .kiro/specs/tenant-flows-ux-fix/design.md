# Tenant Flows UX Fix — Bugfix Design

## Overview

The tenant-facing pages "Mis arriendos" and "Mis pagos" do not match the design mockups. The lease detail page (`/mis-arriendos/[id]`) currently shows only the rental tracking timeline (state machine progress) instead of a property-info-centric detail page with payment CTAs. The payments page (`/mis-pagos`) shows a flat list of all payments with inline "Pagar" buttons instead of a unit-grouped → payment-history → payment-detail multi-step navigation.

The fix restructures the frontend page hierarchy and introduces new backend endpoints to support:
1. A lease detail page with property info, monthly rent, next payment, and navigation CTAs to unified payment flows under `/mis-pagos/{unitId}/...`
2. A unit-grouped payments landing → per-unit payment history with filters → payment detail/checkout (pending) or read-only receipt (paid)

The rental tracking (lifecycle timeline, state history) is a landlord-only concern and is NOT accessible from the tenant lease detail page. The payment webhook already notifies the landlord (confirmed in `HandlePaymentWebhookUseCase`), so requirement 2.7 is already satisfied — no backend change needed for that.

## Glossary

- **Bug_Condition (C)**: The set of tenant navigation actions that produce incorrect page content — clicking a lease card shows tracking instead of property info; navigating to `/mis-pagos` shows a flat list instead of unit-grouped view; clicking "Pagar" initiates payment inline instead of navigating to a detail/checkout page
- **Property (P)**: The desired behavior — lease detail shows property info + payment CTAs; payments page shows unit cards; payment detail shows line items + method selection (pending) or read-only receipt (paid)
- **Preservation**: Existing behaviors that must remain unchanged — empty states, permission checks, not-found handling, payment gateway adapter flow, pagination
- **`RentalDetailView`**: The component in `src/frontend/modules/tenant/components/RentalDetailView.tsx` that currently renders only the tracking timeline — will be refactored to show property info + payment CTAs (no tracking)
- **`PaymentsView`**: The component in `src/frontend/modules/tenant/components/PaymentsView.tsx` that currently renders a flat payment list with inline pay buttons
- **`ScheduledPayment`**: The `payments.ScheduledPayment` table record representing a monthly rent obligation with `lease_id`, `amount`, `due_date`, and status
- **`PortfolioUnit`**: The `landlord_portfolio.PortfolioUnit` table record linking a property to a portfolio with `lease_base_amount` and `lease_base_currency`
- **Cross-schema lookup**: Multi-step query pattern (e.g., `Lease → PortfolioUnit → Property + Address`) since schemas have no FK relations

## Bug Details

### Bug Condition

The bug manifests in five distinct navigation scenarios where the tenant UI does not match the expected design:

1. **Lease detail page** shows only tracking timeline (Estado actual, Progreso, Historial) instead of property info card, monthly rent, next payment, and payment CTAs
2. **Payments landing page** shows a flat list of all `ScheduledPayment` records instead of unit cards grouped by property
3. **Pay action** triggers payment inline (via `tenantService.initiatePayment`) instead of navigating to a detail/checkout page
4. **Paid payment view** has no way to view historical receipt data (amount paid, date, method, line items)
5. **Payment webhook notification** — already implemented correctly in `HandlePaymentWebhookUseCase` (fire-and-forget `notifyPaymentReceived` to landlord)

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type TenantNavigation
  OUTPUT: boolean

  RETURN (input.action = "click_lease_card" AND input.source = "mis-arriendos-list")
         OR (input.action = "navigate" AND input.destination = "/mis-pagos")
         OR (input.action = "click_pay" AND input.source = "payment-list")
         OR (input.action = "click_payment_card" AND input.paymentStatus = "PAID")
END FUNCTION
```

### Examples

- **Lease detail**: Tenant clicks "Apartamento Centro" card → sees "Estado actual: PAYMENT_RECEIVED" timeline. Expected: sees property info (Apartamento, Centro, Calle 5 #10-20), canon mensual $1.200.000, next payment card (Vence: 1 julio 2025, $1.200.000, Pendiente), "Pagar ahora" button, "Ver historial de pagos" link
- **Payments landing**: Tenant navigates to `/mis-pagos` → sees flat list of 12 payment cards (all units mixed). Expected: sees 2 unit cards ("Apartamento Centro", "Casa Norte") grouped by property
- **Payment detail (pending)**: Tenant clicks "Pagar >" on June payment → payment initiates immediately. Expected: navigates to `/mis-pagos/{unitId}/{paymentId}` showing line items (Canon $1.000.000, Administración $150.000, Servicios $50.000, Total $1.200.000), due date warning, payment method selection, "Continuar con pago" button
- **Payment detail (paid)**: Tenant clicks on May payment (PAID) → no action available. Expected: navigates to `/mis-pagos/{unitId}/{paymentId}` showing read-only receipt (amount paid, date, method used, receipt link) — NO payment method selection or "Continuar con pago" button

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Lease list page (`/mis-arriendos`) continues to display lease cards with property name and tracking status badge
- Empty state "No tienes arriendos activos" with "Explorar inmuebles" link remains unchanged
- Empty state "No tienes pagos registrados" remains unchanged
- Permission check "No tienes permisos" for non-TENANT users remains unchanged
- Not-found state "Arriendo no encontrado" with back link remains unchanged
- Payment gateway adapter (stub) continues to return `APPROVED` with mock redirect URL
- Payment webhook processing and landlord notification remain unchanged
- Pagination support for payment history remains unchanged
- Rental tracking (lifecycle timeline, state history) remains a landlord-only feature — unchanged and unaffected by this fix

**Scope:**
All inputs that do NOT involve the five bug conditions should be completely unaffected by this fix. This includes:
- Mouse clicks on navigation menu items
- Empty state rendering
- Permission/role checks
- Error state rendering and retry logic
- Notification badge counts
- Side menu behavior
- Landlord-facing rental tracking views (completely separate from tenant flows)

## Hypothesized Root Cause

Based on the code analysis, the root causes are:

1. **`RentalDetailView` renders only tracking data**: The component calls `tenantService.getLeaseStatus(id, token)` which returns `{ leaseId, currentState, lastChangedAt, history }` from the `rental-tracking` module. There is no call to fetch property info, monthly rent, or next payment data. The backend has no tenant-facing endpoint that returns this combined data — the `GET /portfolio/:portfolioId/units/:unitId/leases/:leaseId` endpoint is landlord-only (requires portfolio ownership). The tenant needs a dedicated endpoint in the `landlord-portfolio` module (which owns the `landlord_portfolio` schema containing `Lease`, `PortfolioUnit`, `Property`, and `Address`) with a cross-schema call to `payments` for the next pending `ScheduledPayment`.

2. **`PaymentsView` renders a flat list**: The component calls `tenantService.getPaymentHistory(token)` which hits `GET /payments/history` returning all `ScheduledPayment` records for the user without any unit/property grouping. The backend `GetPaymentHistoryUseCase` returns a flat array with no `unitId` or property name.

3. **Inline payment initiation**: The `PaymentsView` component has a `handlePay` function that directly calls `tenantService.initiatePayment(...)` on button click instead of navigating to a detail page. There is no `/mis-pagos/[unitId]/[paymentId]` route or component.

4. **No paid payment detail view**: There is no route or component for viewing a completed payment's receipt data. The current UI only shows amount, due date, and status badge inline.

5. **Missing backend endpoints for tenant lease detail**: The tenant needs a dedicated endpoint in the `landlord-portfolio` module that resolves `Lease → PortfolioUnit → Property + Address` (all within the `landlord_portfolio` schema) and makes a single cross-schema call to `payments` for the next pending `ScheduledPayment` — without requiring landlord portfolio ownership. Auth verifies `Lease.user_id = userId` (tenant ownership).

## Correctness Properties

Property 1: Bug Condition - Lease Detail Shows Property Info and Payment CTAs

_For any_ tenant navigation where the user clicks a lease card in "Mis arriendos", the fixed lease detail page SHALL display: a property info card (property type, neighborhood, address), the monthly rent amount (canon mensual), a next payment card (due date, amount, status), a "Pagar ahora" button navigating to `/mis-pagos/{unitId}/{nextPaymentId}`, and a "Ver historial de pagos" link navigating to `/mis-pagos/{unitId}`. The page does NOT include any tracking timeline — tracking is a landlord-only concern.

**Validates: Requirements 2.1**

Property 2: Bug Condition - Payments Landing Shows Unit-Grouped Cards

_For any_ tenant navigation to `/mis-pagos`, the fixed page SHALL display unit cards grouped by property/unit (showing property name and lease status) instead of a flat payment list.

**Validates: Requirements 2.3, 2.4**

Property 3: Bug Condition - Payment Detail Page for Pending Payments

_For any_ tenant click on "Pagar" for a pending payment, the system SHALL navigate to `/mis-pagos/{unitId}/{paymentId}` showing line items (resumen de cuota), due date warning, payment method selection, and "Continuar con pago" button.

**Validates: Requirements 2.5**

Property 4: Bug Condition - Read-Only Receipt for Paid Payments

_For any_ tenant click on a paid payment card, the system SHALL navigate to `/mis-pagos/{unitId}/{paymentId}` showing ONLY historical receipt data (amount, date paid, line items, method, receipt link) with NO payment method selection or "Continuar con pago" button.

**Validates: Requirements 2.6**

Property 5: Preservation - Unchanged Behaviors

_For any_ input where the bug condition does NOT hold (empty states, permission checks, not-found handling, payment gateway flow, pagination), the fixed code SHALL produce the same result as the original code, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8**

## Fix Implementation

### Changes Required

#### Backend Changes

**File**: `src/backend/modules/landlord-portfolio/tenant-leases.controller.ts`

**New Endpoint**: `GET /leases/:leaseId/detail`

**Purpose**: Tenant-facing lease detail that resolves property info, monthly rent, and next payment. Lives in the `landlord-portfolio` module because it owns the `landlord_portfolio` PostgreSQL schema which contains `Lease`, `PortfolioUnit`, `Property`, and `Address` — all the data needed for the tenant lease detail. The only cross-schema call is to the `payments` module to get the next pending `ScheduledPayment`.

**Specific Changes**:
1. **New use case `GetTenantLeaseDetailUseCase`** in `landlord-portfolio/application/use-cases/`:
   - Accepts `leaseId` and `userId`
   - Verifies the user is the tenant on the lease (`Lease.user_id = userId`)
   - Resolves within `landlord_portfolio` schema: `Lease → PortfolioUnit` to get `portfolio_unit_id`, `lease_base_amount`, `lease_base_currency`
   - Resolves within `landlord_portfolio` schema: `PortfolioUnit.property_id → Property + Address` to get property type, neighborhood, address
   - Cross-schema call to `payments` module: queries `ScheduledPayment` where `lease_id = leaseId AND status = 'PENDING' AND deleted_at = null` ordered by `due_date ASC LIMIT 1` to get next payment
   - Returns `TenantLeaseDetailDto`

2. **New DTO `TenantLeaseDetailDto`** in `landlord-portfolio/application/dtos/`:
   ```typescript
   {
     leaseId: string;
     unitId: string;  // portfolio_unit_id — needed for navigation
     propertyType: string;
     neighborhood: string;
     address: string;
     monthlyAmount: number;
     currency: string;
     leaseStatus: string;  // Vigente | Acordado | Finalizado
     nextPayment: {
       id: string;
       amount: number;
       dueDate: Date;
       status: string;
     } | null;
   }
   ```

3. **New controller `tenant-leases.controller.ts`** in `landlord-portfolio/`:
   - Route prefix: `/leases`
   - Protected route with `@ApiBearerAuth('JWT')`
   - `@ApiTags('tenant-leases')`
   - Auth: Verifies `Lease.user_id = userId` (tenant ownership)

4. **New endpoint `GET /payments/units`** in `payments.controller.ts`:
   - Returns unit cards grouped by property for the authenticated tenant
   - Resolves `ScheduledPayment.lease_id → Lease.portfolio_unit_id → PortfolioUnit → Property + Address` to get property name
   - Groups by `portfolio_unit_id` and returns one card per unit with property name and lease status

5. **New endpoint `GET /payments/units/:unitId/history`** in `payments.controller.ts`:
   - Accepts query params: `status` (filter: ALL | PENDING | PAID | OVERDUE), `page`, `limit`
   - Returns paginated payment history for a specific unit
   - Verifies the authenticated user is the tenant on the lease associated with the unit

6. **New endpoint `GET /payments/:paymentId/detail`** in `payments.controller.ts`:
   - Returns full payment detail including line items breakdown
   - For PENDING: returns line items + allows checkout flow
   - For PAID: returns line items + payment log data (date paid, method, receipt)
   - Verifies the authenticated user is the tenant

#### Frontend Changes

**New Route Structure**:
```
/mis-pagos/                     → PaymentsUnitsView (unit cards)
/mis-pagos/[unitId]/            → PaymentHistoryView (filtered list)
/mis-pagos/[unitId]/[paymentId] → PaymentDetailView (checkout or receipt)
```

**File**: `src/frontend/modules/tenant/components/RentalDetailView.tsx`

**Changes**:
1. Replace the tracking-only view with a property-info-centric layout
2. Add a new API call to `GET /leases/:leaseId/detail` for property info + next payment
3. Display: property info card (type icon, type name, neighborhood, address), canon mensual, next payment card with "Pagar ahora" CTA → navigates to `/mis-pagos/{unitId}/{nextPaymentId}`
4. Add "Ver historial de pagos" link → navigates to `/mis-pagos/{unitId}`
5. No tracking timeline section — tracking is a landlord-only concern and is not shown on the tenant lease detail page

**File**: `src/frontend/modules/tenant/components/PaymentsView.tsx`

**Changes**:
1. Replace flat payment list with unit cards (call `GET /payments/units`)
2. Each card shows property name + lease status badge
3. Card click navigates to `/mis-pagos/{unitId}`

**New File**: `src/frontend/app/mis-pagos/[unitId]/page.tsx`

**Purpose**: Payment history page for a specific unit with filter tabs (Todos, Pendientes, Pagados, Vencidos)

**New File**: `src/frontend/app/mis-pagos/[unitId]/[paymentId]/page.tsx`

**Purpose**: Payment detail page — conditional rendering:
- If payment status is PENDING: show line items, due date warning, payment method selection, "Continuar con pago" button
- If payment status is PAID: show read-only receipt (amount, date, line items, method, receipt link)

**New File**: `src/frontend/modules/tenant/components/PaymentHistoryView.tsx`

**Purpose**: Component for the per-unit payment history with filter tabs and paginated list

**New File**: `src/frontend/modules/tenant/components/PaymentDetailView.tsx`

**Purpose**: Component for payment detail/checkout (pending) or receipt (paid)

**Frontend Service Updates** (`src/frontend/shared/services/tenant.ts`):
- Add `getTenantLeaseDetail(leaseId, token)` → `GET /leases/:leaseId/detail`
- Add `getPaymentUnits(token)` → `GET /payments/units`
- Add `getPaymentHistory(unitId, token, filters)` → `GET /payments/units/:unitId/history`
- Add `getPaymentDetail(paymentId, token)` → `GET /payments/:paymentId/detail`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write integration tests that verify the current page content when navigating to lease detail and payments pages. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **Lease Detail Content Test**: Navigate to `/mis-arriendos/{leaseId}` and assert property info card is present (will fail — only tracking timeline exists)
2. **Payments Grouping Test**: Navigate to `/mis-pagos` and assert unit cards are displayed (will fail — flat list is rendered)
3. **Payment Navigation Test**: Click "Pagar" on a pending payment and assert navigation to detail page (will fail — inline payment initiation occurs)
4. **Paid Payment Receipt Test**: Click on a PAID payment card and assert receipt view is shown (will fail — no click handler for paid payments)

**Expected Counterexamples**:
- Lease detail page contains `h2` "Estado actual" but NOT "Canon mensual" or property info
- Payments page contains individual payment cards but NOT unit-grouped cards
- "Pagar" button triggers `fetch('/payments/initiate')` instead of `router.push('/mis-pagos/...')`
- `GET /leases/:leaseId/detail` endpoint does not exist (404)

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderFixedPage(input)
  ASSERT expectedContent(result)
END FOR
```

Specifically:
- Lease detail page renders property info card, monthly rent, next payment, CTAs
- Payments landing renders unit cards grouped by property
- Clicking "Pagar" navigates to `/mis-pagos/{unitId}/{paymentId}`
- Payment detail (pending) shows line items + method selection + "Continuar con pago"
- Payment detail (paid) shows receipt data only — NO payment actions

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for empty states, permission checks, and error handling, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Empty State Preservation**: Verify "No tienes arriendos activos" and "No tienes pagos registrados" messages continue to render when no data exists
2. **Permission Check Preservation**: Verify non-TENANT users see "No tienes permisos" message
3. **Not-Found Preservation**: Verify invalid lease IDs show "Arriendo no encontrado"
4. **Payment Gateway Preservation**: Verify `initiatePayment` still calls the gateway adapter and returns redirect URL

### Unit Tests

- Test `GetTenantLeaseDetailUseCase` resolves property info cross-schema correctly
- Test `GetTenantLeaseDetailUseCase` returns next pending payment (earliest due date)
- Test `GetTenantLeaseDetailUseCase` returns `null` next payment when all are PAID
- Test `GetTenantLeaseDetailUseCase` rejects non-tenant users (403)
- Test `GET /payments/units` groups payments by unit correctly
- Test `GET /payments/units/:unitId/history` filters by status (PENDING, PAID, OVERDUE)
- Test `GET /payments/:paymentId/detail` returns line items for pending payments
- Test `GET /payments/:paymentId/detail` returns receipt data for paid payments
- Test `GET /payments/:paymentId/detail` does NOT include payment method selection for paid payments

### Property-Based Tests

- Generate random lease/unit/property combinations and verify `GetTenantLeaseDetailUseCase` always resolves property info when data exists
- Generate random payment histories and verify unit grouping produces correct card count (one per distinct unit)
- Generate random payment statuses and verify detail view conditionally shows/hides payment actions based on status
- Generate random non-bug-condition inputs and verify preservation of empty states, permission checks, and error handling

### Integration Tests

- Test full flow: lease list → lease detail → "Pagar ahora" → payment detail → "Continuar con pago" → gateway redirect
- Test full flow: lease detail → "Ver historial de pagos" → payment history → filter by status → click paid payment → receipt view
- Test full flow: `/mis-pagos` → unit card click → payment history → filter tabs work correctly
- Test that back navigation works correctly at each level of the page hierarchy
