# Bugfix Requirements Document

## Introduction

The tenant-facing pages "Mis arriendos" and "Mis pagos" do not match the design mockups. Two main UX bugs exist:

1. **"Mis arriendos" detail page** — Clicking a lease card navigates to a rental tracking/progress view (timeline, state history) instead of a lease detail page showing property info, monthly rent, next payment, and a "Pagar ahora" CTA.
2. **"Mis pagos" page** — Shows a flat list of all payments instead of a unit-grouped view where the tenant first selects a unit, then sees the payment history for that unit with filtering, and can navigate to a payment detail/checkout page.

These bugs result in a degraded tenant experience where key information (property details, rent amount, payment breakdown) is inaccessible, and the payment flow lacks the expected multi-step navigation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a tenant clicks a lease card in "Mis arriendos" THEN the system navigates to a "Detalle del arriendo" page that shows only the rental tracking view (Estado actual, Progreso del arriendo timeline, Historial de estados) with no property information, rent amount, or payment action

1.2 WHEN a tenant views the lease detail page THEN the system does not display property info (type, neighborhood, address), monthly rent amount, next payment due date/amount, or a "Pagar ahora" button

1.3 WHEN a tenant navigates to "Mis pagos" THEN the system shows a flat list of all payment cards (amount, due date, status, "Pagar" button) without grouping by unit/property

1.4 WHEN a tenant views "Mis pagos" THEN the system does not provide a way to see payment history per unit, filter payments by status (Todos, Pendientes, Pagados, Vencidos), or navigate to a payment detail/checkout page with line-item breakdown

1.5 WHEN a tenant clicks "Pagar" on a payment card in "Mis pagos" THEN the system initiates payment immediately inline without showing a payment detail page with cost breakdown, due date warning, or payment method selection

1.6 WHEN a tenant clicks on a paid (completed) payment card THEN the system does not provide a way to view the historical payment details (amount paid, date, line items, method, receipt)

1.7 WHEN a payment is successfully processed via webhook THEN the system does not notify the landlord or reflect the payment in the landlord's "Mis ingresos" balance

### Expected Behavior (Correct)

2.1 WHEN a tenant clicks a lease card in "Mis arriendos" THEN the system SHALL navigate to a "Mi arriendo" detail page that displays: property info card (property type icon, type name, neighborhood, address), monthly rent amount ("Canon mensual"), next payment card (due date, amount, status badge), a "Pagar ahora" primary button that navigates to `/mis-pagos/{unitId}/{nextPaymentId}` (the payment detail/checkout page for the next due payment), and a "Ver historial de pagos" link that navigates to `/mis-pagos/{unitId}` (the payment history page for that unit). All payment flows are unified under "Mis pagos" — the lease detail page does NOT host its own payment or history subpages. The page does NOT include any tracking timeline — tracking is a landlord-only concern.

2.3 WHEN a tenant navigates to "Mis pagos" THEN the system SHALL show a list of unit cards grouped by property/unit (similar to "Mis arriendos" card style), each displaying the property name and lease status

2.4 WHEN a tenant clicks a unit card in "Mis pagos" THEN the system SHALL navigate to a "Historial de pagos" page for that unit showing: filter tabs (Todos, Pendientes, Pagados, Vencidos), a list of monthly payment cards (month/year title, due date, amount, status badge, "Pagar >" link for pending, "Ver comprobante" link for paid), and pagination at the bottom

2.5 WHEN a tenant clicks "Pagar" on a pending (not yet paid) payment in the payment history THEN the system SHALL navigate to a "Detalle de pago" page showing: "Resumen de la cuota" with line items (Canon de arrendamiento, Administración, Servicios públicos, Total a pagar), a due date warning banner, payment method selection (Tarjeta débito/crédito, Transferencia bancaria / PSE), and a "Continuar con pago" primary button. The payment method selection and "Continuar con pago" button SHALL only be displayed for payments with a pending/due status — never for already-paid payments.

2.6 WHEN a tenant clicks on a paid (completed) payment card in the payment history THEN the system SHALL navigate to a payment detail view showing ONLY the historical receipt data: amount paid, date paid, line items breakdown, payment method used, and receipt/comprobante link. This view SHALL NOT display payment method selection, "Continuar con pago" button, or any payment action — it is a read-only historical record.

2.7 WHEN a payment is successfully processed (webhook confirms success) THEN the system SHALL notify the landlord and the payment SHALL be reflected in the landlord's "Mis ingresos" page balance

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a tenant views the "Mis arriendos" list page THEN the system SHALL CONTINUE TO display lease cards with property name and status badge, and the list shall remain accessible only to users with the TENANT role

3.2 WHEN a tenant has no active leases THEN the system SHALL CONTINUE TO show the empty state with "No tienes arriendos activos" message and "Explorar inmuebles" link

3.3 WHEN a tenant has no payments registered THEN the system SHALL CONTINUE TO show the empty state with "No tienes pagos registrados" message

3.4 WHEN a tenant without the TENANT role accesses "Mis arriendos" or "Mis pagos" THEN the system SHALL CONTINUE TO show the "No tienes permisos" message

3.5 WHEN a lease is not found (invalid ID) THEN the system SHALL CONTINUE TO show the "Arriendo no encontrado" not-found state with a link back to the list

3.7 WHEN a payment is initiated and the gateway returns a redirect URL THEN the system SHALL CONTINUE TO use the existing payment gateway adapter (stub for MVP) to process the payment

3.8 WHEN the payment history list has multiple pages of results THEN the system SHALL CONTINUE TO support pagination to navigate between pages

---

## Bug Condition (Formal)

### Bug Condition Function

```pascal
FUNCTION isBugCondition_LeaseDetail(X)
  INPUT: X of type TenantNavigation
  OUTPUT: boolean
  
  // Returns true when tenant clicks a lease card expecting lease detail
  RETURN X.action = "click_lease_card" AND X.source = "mis-arriendos-list"
END FUNCTION

FUNCTION isBugCondition_PaymentsList(X)
  INPUT: X of type TenantNavigation
  OUTPUT: boolean
  
  // Returns true when tenant navigates to Mis pagos expecting grouped view
  RETURN X.action = "navigate" AND X.destination = "/mis-pagos"
END FUNCTION

FUNCTION isBugCondition_PaymentDetail(X)
  INPUT: X of type TenantNavigation
  OUTPUT: boolean
  
  // Returns true when tenant clicks Pay expecting detail/checkout page
  RETURN X.action = "click_pay" AND X.source = "payment-history"
END FUNCTION

FUNCTION isBugCondition_PaidPaymentView(X)
  INPUT: X of type TenantNavigation
  OUTPUT: boolean
  
  // Returns true when tenant clicks a completed payment expecting historical detail
  RETURN X.action = "click_payment_card" AND X.paymentStatus = "PAID"
END FUNCTION

FUNCTION isBugCondition_PaymentWebhook(X)
  INPUT: X of type PaymentEvent
  OUTPUT: boolean
  
  // Returns true when payment succeeds and landlord should be notified
  RETURN X.event = "payment_success" AND X.webhookConfirmed = true
END FUNCTION
```

### Property Specification — Fix Checking

```pascal
// Property: Fix Checking — Lease Detail Navigation
FOR ALL X WHERE isBugCondition_LeaseDetail(X) DO
  page ← navigateTo("/mis-arriendos/{leaseId}")
  ASSERT page.contains("property_info_card")
    AND page.contains("monthly_rent_amount")
    AND page.contains("next_payment_card")
    AND page.contains("pagar_ahora_button")
    AND page.pagar_ahora_button.navigatesTo("/mis-pagos/{unitId}/{nextPaymentId}")
    AND page.contains("ver_historial_pagos_link")
    AND page.ver_historial_pagos_link.navigatesTo("/mis-pagos/{unitId}")
END FOR

// Property: Fix Checking — Payments Grouped View
FOR ALL X WHERE isBugCondition_PaymentsList(X) DO
  page ← navigateTo("/mis-pagos")
  ASSERT page.displays("unit_cards_grouped_by_property")
    AND NOT page.displays("flat_payment_list")
END FOR

// Property: Fix Checking — Payment Detail/Checkout Page (Pending Payments Only)
FOR ALL X WHERE isBugCondition_PaymentDetail(X) DO
  page ← navigateTo("/mis-pagos/{unitId}/{paymentId}")
  ASSERT X.paymentStatus = "PENDING"
    AND page.contains("resumen_de_cuota_line_items")
    AND page.contains("due_date_warning")
    AND page.contains("payment_method_selection")
    AND page.contains("continuar_con_pago_button")
END FOR

// Property: Fix Checking — Paid Payment Historical View (Read-Only, No Payment Action)
FOR ALL X WHERE isBugCondition_PaidPaymentView(X) DO
  page ← navigateTo("/mis-pagos/{unitId}/{paymentId}")
  ASSERT page.contains("historical_amount")
    AND page.contains("date_paid")
    AND page.contains("line_items")
    AND page.contains("payment_method_used")
    AND page.contains("receipt_link")
    AND NOT page.contains("payment_method_selection")
    AND NOT page.contains("continuar_con_pago_button")
END FOR

// Property: Fix Checking — Payment Webhook Notification
FOR ALL X WHERE isBugCondition_PaymentWebhook(X) DO
  result ← processWebhook(X)
  ASSERT landlord_notified(result)
    AND landlord_income_updated(result)
END FOR
```

### Preservation Goal

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_LeaseDetail(X)
           AND NOT isBugCondition_PaymentsList(X)
           AND NOT isBugCondition_PaymentDetail(X)
           AND NOT isBugCondition_PaidPaymentView(X)
           AND NOT isBugCondition_PaymentWebhook(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

This ensures that for all non-buggy navigation paths (empty states, permission checks, not-found handling, payment gateway flow, pagination), the fixed code behaves identically to the original.


---

## Post-Implementation Findings

The following issues were discovered during the manual QA and post-implementation review (Task 13).

### Finding 13.1 — WCAG Touch Target Violation on Filter Tabs and Pagination (FIXED)

**Observed**: In `PaymentHistoryView.tsx`, the filter tab buttons (`Todos`, `Pendientes`, `Pagados`, `Vencidos`) and pagination buttons (page numbers, prev/next arrows) used `min-h-[36px]` / `min-w-[36px]`, which is below the WCAG 2.1 AA minimum touch target of 44×44px.

**Fix Applied**: Updated all filter tab buttons to `min-h-[44px]` and all pagination buttons to `min-h-[44px] min-w-[44px]`.

**Status**: ✅ Fixed

### Finding 13.2 — Raw English Status Values Displayed to Users (FIXED)

**Observed**: The `StatusBadge` component was missing the `OVERDUE` mapping in `paymentStatusColors`, causing raw "OVERDUE" text to display. Additionally, `RentalDetailView` and `PaymentsView` used `variant="lease"` (which expects Spanish labels like "Vigente") but the backend returns raw tracking states like `CONTRACT_UPLOADED`. The `lease` variant only maps "Vigente", "Acordado", "Finalizado" — not the tracking enum values.

**Fix Applied**:
- Added `OVERDUE → 'Vencido'` (red) to `paymentStatusColors` in `StatusBadge.tsx`
- Changed `RentalDetailView` and `PaymentsView` to use `variant="tracking"` which correctly maps raw states (e.g., `CONTRACT_UPLOADED` → "Contrato cargado")
- Created centralized `shared/utils/statusMaps.ts` with all status label maps and helper functions
- Updated `frontend-patterns.md` steering with variant selection guide and centralized mapper rules

**Status**: ✅ Fixed

### Finding 13.3 — Typography Hierarchy Collision (FIXED)

**Observed**: In `RentalDetailView` and `PaymentDetailView`, section headings ("Próximo pago", "Resumen de la cuota", "Método de pago") and primary values (amounts, totals) both used `text-h3 font-semibold/bold`, making them visually indistinguishable. This violated the typography hierarchy principle.

**Fix Applied**:
- Primary values (amounts, totals) promoted to `text-h2 font-bold` (24px)
- Section headings remain at `text-h3 font-semibold` (20px)
- Updated `frontend-patterns.md` steering with explicit typography hierarchy rules

**Status**: ✅ Fixed

### Finding 13.4 — "Mis pagos" Card Shows Wrong Property Name (FIXED)

**Observed**: The "Mis pagos" unit card displayed "CASA" (raw property type) while "Mis arriendos" displayed "Hermosa casa en el limonar" (listing title) for the same lease. The `getPropertyInfoByLeaseId` method constructed `propertyName` as `${propertyType} ${neighborhood}` instead of using the listing title.

**Fix Applied**: Updated `PortfolioCrossModuleQueryService.getPropertyInfoByLeaseId` to resolve the listing title via `Lease → PortfolioUnit → Listing.title`, falling back to `${propertyType} ${neighborhood}` only when no listing exists.

**Status**: ✅ Fixed

### Finding 13.5 — Next Payment Not Showing on Lease Detail (FIXED)

**Observed**: The "Mi arriendo" page showed "No tienes pagos pendientes" even though "Mis pagos" correctly showed an overdue payment for the same lease. The `getNextPendingPayment` SQL query used `NOT EXISTS (SELECT 1 FROM Payment WHERE scheduled_payment_id = sp.id)` which excluded scheduled payments that have a `Payment` record with non-PAID status (e.g., PENDING, REJECTED).

**Fix Applied**: Changed the query to check `NOT EXISTS (... JOIN PaymentLog pl ... WHERE pl.status = 'PAID')` — now it only excludes scheduled payments with a confirmed PAID log, matching the logic used by `GetPaymentHistoryByUnitUseCase`.

**Status**: ✅ Fixed

### Finding 13.6 — Location Icon Not Showing When Neighborhood is Empty (FIXED)

**Observed**: The location pin icon in `RentalDetailView` was wrapped in a conditional `{data.neighborhood && ...}` block, so when the neighborhood field was empty, the entire location section (including the address) lost its icon.

**Fix Applied**: Restructured the layout so the location icon always renders next to the address. Neighborhood is shown above the address only when present.

**Status**: ✅ Fixed

### Finding 13.7 — Redesign to Match Figma Mockups (FIXED)

**Observed**: The initial implementation of `RentalDetailView` and `PaymentHistoryView` did not match the provided Figma mockups. Key differences:
- Lease detail: property card should include canon mensual as an inline row (not separate card), next payment card should use calendar/dollar icons with labeled fields
- Payment history: cards should have calendar icon on left, month label as title, amount + action link on bottom row, pill-shaped filter tabs, numbered pagination

**Fix Applied**: Complete redesign of both components to match the mockups exactly:
- `RentalDetailView`: property card with home icon + location pin + canon mensual row, next payment card with calendar/dollar icons and labeled fields, full-width "Pagar ahora" button, "Ver historial de pagos >" link with chevron
- `PaymentHistoryView`: calendar icon cards, pill-shaped filter tabs (rounded-full), "Mostrando X a Y de Z" counter, numbered page buttons

**Status**: ✅ Fixed

---

## Future Considerations (Out of Scope for This Bugfix)

The following issues were identified during QA but are **not bugs introduced by this fix** — they are pre-existing limitations or post-MVP concerns.

### FC-1: Payment Webhook Does Not Validate Amount

**Issue**: The `HandlePaymentWebhookUseCase` does not verify that the webhook `amount` matches the `ScheduledPayment.amount`. A malicious or erroneous webhook could mark a payment as PAID with a different amount than expected.

**Impact**: The `Payment` record stores whatever amount the webhook sends. The accounting module then reports this incorrect amount as income.

**Recommendation for post-MVP**:
- Verify webhook signature (HMAC from payment gateway)
- Validate `webhook.amount === scheduledPayment.amount` (reject mismatches)
- Log amount discrepancies in the audit trail
- Consider a tolerance threshold for rounding differences

### FC-2: No Idempotency Check on Payment Webhook

**Issue**: The webhook endpoint does not check if a `ScheduledPayment` has already been marked as PAID. Sending the same webhook twice (or sending a second webhook for an already-paid payment) creates a duplicate `Payment` record.

**Impact**: Multiple `Payment` records for the same `ScheduledPayment`. The accounting module uses `payments[0]` (most recent) which may have a different amount than the original payment.

**Recommendation for post-MVP**:
- Check if `ScheduledPayment` already has a PAID `PaymentLog` before processing
- Use the `idempotencyKey` field to deduplicate webhook calls
- Return 200 OK (idempotent) for duplicate webhooks without creating new records

### FC-3: "Último mes" Period Filter Shows Previous Month, Not Current Month

**Issue**: The "Mis ingresos" page's "Último mes" filter uses `computePeriod('1m')` which subtracts 1 month from today. On May 31, 2026, it queries April 2026 — not May 2026. Payments due in the current month won't appear until next month.

**Impact**: Landlord sees `$0` income for a payment that was just processed today if the payment's `due_date` is in the current month.

**Recommendation**:
- Consider renaming "Último mes" to "Mes anterior" for clarity
- Add a "Mes actual" option that queries the current month
- Or change the default to show the current month instead of the previous month

### FC-4: Accounting Module Missing `deleted_at` Filters

**Issue**: The `PrismaAccountingRepository` queries `PortfolioUnit`, `Lease`, and `ScheduledPayment` without `deleted_at: null` filters. Soft-deleted records could be included in income calculations.

**Impact**: Cancelled leases or deleted units could still contribute to income reports.

**Recommendation**: Add `deleted_at: null` to all `where` clauses in the accounting repository (same pattern as all other modules).

---

## Post-Implementation Enhancement: Text Sanitization with Auto-Capitalize

### Finding 13.8 — Titles and Descriptions Not Capitalized (FIXED)

**Observed**: User-submitted titles, names, and descriptions were stored exactly as entered — no normalization applied. This led to inconsistent display across the platform (e.g., "apartamento en el centro" vs "Apartamento en el centro"). Additionally, old data stored without capitalization displayed as-is with no retroactive fix.

**Fix Applied**: Created a platform-wide text sanitization system:

1. **Shared utility** (`src/backend/src/shared/text/sanitize-text.utils.ts`):
   - `sanitizeText(value)` — trims, collapses multiple spaces, capitalizes first character
   - `sanitizeTextStrict(value)` — non-nullable variant for required fields
   - `sanitizeDisplayText(value)` — alias for backward compatibility on output

2. **Input sanitization** (ValidationInterceptor enhanced):
   - Fields `title`, `name`, `description`, `fullName`, `firstName`, `lastName`, `preferredName`, `businessName`, `conditions` are automatically capitalized on every incoming request body
   - Applied globally via the existing `ValidationInterceptor` — no per-module changes needed

3. **Output sanitization for backward compatibility** (new `TextSanitizeResponseInterceptor`):
   - Registered globally in `main.ts`
   - Capitalizes `title`, `name`, `description`, `propertyName`, `unitName`, `landlordName`, etc. on all API responses
   - Ensures old data stored without capitalization displays correctly without requiring a data migration

**Affected fields**: `title`, `name`, `description`, `fullName`, `firstName`, `lastName`, `preferredName`, `businessName`, `conditions`, `propertyName`, `unitName`, `landlordName`

**Status**: ✅ Fixed and deployed to staging

### QA Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` (backend) | ✅ Pass — no compilation errors |
| `npm run build` (frontend) | ✅ Pass — no compilation errors |
| `npm run test` (backend) | ✅ Pass — 68 suites, 397 tests |
| `npm run lint` (backend) | ✅ Pass — 0 errors, 0 warnings |
| `npm run lint` (frontend) | ✅ Pass — 0 errors, 5 warnings (unused vars in test files only) |
| Spanish UI text | ✅ All user-facing text in Spanish |
| No raw UUIDs displayed | ✅ No IDs/UUIDs shown to users |
| Touch targets ≥ 44px | ✅ All interactive elements meet minimum (after fix 13.1) |
| `StatusBadge` variants correct | ✅ `paymentStatus` for payment statuses, `tracking` for lease tracking states |
| `formatCOP` for currency | ✅ All amounts use `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })` |
| Centered container `max-w-[560px]` | ✅ All pages follow the standard |
| Back button pattern (Link + left-arrow SVG) | ✅ All sub-pages use correct pattern |
| No tracking timeline on tenant lease detail | ✅ `RentalDetailView` shows property info + payment CTAs only |
