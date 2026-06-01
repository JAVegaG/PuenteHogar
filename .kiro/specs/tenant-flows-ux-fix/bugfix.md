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
