# Bugfix Requirements Document

## Introduction

The rental lifecycle status system has a cross-module communication gap that causes the lease tracking status to never advance beyond its initial state. Neither `UploadContractUseCase` (contract creation), `InitiateSigningUseCase` (signing initiation), nor `HandleSigningWebhookUseCase` (signing completion) call the rental-tracking module to transition the lease status. This means the lease stays stuck at CONTACT_INITIATED throughout the entire contract lifecycle — even after a contract is uploaded, sent for signature, and fully signed. This causes the unit status derivation to incorrectly mark units as "Ocupado" for leases that haven't reached CONTRACT_SIGNED, the frontend to display untranslated raw enum values, active listings to remain published after a unit is truly occupied, the "Ver contrato archivado" button to be non-functional, and the payment flow to crash due to missing seed data. As a direct consequence of the same flawed active-lease derivation, the "Reporte de portafolio" page at `/mis-ingresos/portafolio/[portfolioId]` shows "Vigente" badges — and inflated income totals — for units whose lease is still in a pre-signing state, breaking consistency with "Mi portafolio". Finally, landlords cannot cancel / delete a lease that is still in "contacto iniciado" or any other pre-contract/premature state: both the frontend lease detail page and the backend `CancelLeaseUseCase` gate cancellation on the narrow check `status === 'Acordado'` instead of on the semantic condition that actually matters — "no signed contract exists yet" — forcing users to generate a contract before they can get rid of a lease they never intended to pursue.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a contract is uploaded via `UploadContractUseCase` THEN the system creates the contract with status PENDING but does NOT transition the lease tracking status to CONTRACT_UPLOADED via the rental-tracking module — the lease stays stuck at CONTACT_INITIATED

1.2 WHEN signing is initiated via `InitiateSigningUseCase` THEN the system updates the contract status to SIGNATURE_PENDING but does NOT transition the lease tracking status — the lease remains at CONTACT_INITIATED

1.3 WHEN a contract signing webhook is received with status COMPLETED THEN the system updates the contract status to SIGNED but does NOT transition the lease tracking status to CONTRACT_SIGNED via the rental-tracking module — the lease remains at CONTACT_INITIATED throughout the entire contract lifecycle

1.4 WHEN the portfolio use case checks unit occupancy AND any active lease exists (end_date = null, deleted_at = null) regardless of its tracking status THEN the system marks the unit as "Ocupado" even if the lease is in CONTACT_INITIATED or CONTRACT_UPLOADED state

1.4a WHEN the portfolio summary calculates "Arriendos activos" count and occupancy percentage THEN the system counts ALL leases with (deleted_at = null AND end_date = null or future) regardless of tracking status, inflating the active lease counter and occupancy percentage for leases that are still in negotiation (CONTACT_INITIATED, CONTRACT_UPLOADED) and have not yet reached a signed contract state

1.5 WHEN the lease detail page renders a lease whose tracking status is a raw enum value (e.g., CONTACT_INITIATED, CONTRACT_UPLOADED, CONTRACT_SIGNED) THEN the system passes variant="lease" to StatusBadge which only handles Vigente/Acordado/Finalizado, causing the raw enum to display without Spanish translation

1.6 WHEN a contract is signed and the unit becomes truly occupied THEN the system does NOT deactivate the active listing for that unit, leaving contradictory states (unit shows "Ocupado" + listing shows "Publicada")

1.7 WHEN the lease card shows a signed contract (contractStatus === 'SIGNED') THEN the "Ver contrato archivado" button links to the same lease detail page with gray disabled-looking styling instead of navigating to the contract detail page

1.8 WHEN the payment flow attempts to log a payment event with status 'APPROVED' THEN the system crashes with "PaymentStatus 'APPROVED' not found in database" because the PaymentStatus catalog table does not have an APPROVED record seeded (only PENDING, PROCESSING, PAID, REJECTED exist)

1.9 WHEN a lease has no signed contract yet (i.e., `contractStatus` is null, PENDING, or SIGNATURE_PENDING) AND the landlord wants to delete/cancel it while it is still in a pre-contract or premature state (Acordado, CONTACT_INITIATED, or CONTRACT_UPLOADED) THEN the frontend lease detail page at `src/frontend/app/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]/page.tsx` computes `canCancel` as `lease?.status === 'Acordado'`, which is too narrow: it hides the "Cancelar arriendo" button whenever the lease's tracking status is a raw enum value (e.g., `CONTACT_INITIATED`, `CONTRACT_UPLOADED`) or any other pre-signing state, forcing the landlord to first generate a contract before they can get rid of the lease. From the user's perspective, this makes it impossible to delete a lease that is in "contacto iniciado" or any premature state without first advancing it to contract generation.

1.9a WHEN the backend `CancelLeaseUseCase` receives a cancellation request for a lease that has no signed contract (`contractStatus` is null, PENDING, or SIGNATURE_PENDING) but whose current tracking status is `CONTACT_INITIATED` or `CONTRACT_UPLOADED` (i.e., the negotiation/premature states the user explicitly wants to cancel) THEN the use case rejects the cancellation with the error "Solo se pueden cancelar arriendos en estado Acordado" because its guard only checks `leaseStatusName === 'Acordado'`. The check is anchored to a specific Spanish status string instead of the semantic condition that actually matters ("no signed contract exists yet"), so the backend refuses to delete leases that the landlord has every right to cancel.

1.9b WHEN the "Mis ingresos" portfolio detail page ("Reporte de portafolio") at the route `/mis-ingresos/portafolio/[portfolioId]` renders unit status badges THEN it derives the lease status from the `unitStatus` field using `getLeaseStatus()`: if `unitStatus === 'Ocupado'` the card shows a "Vigente" badge. Because the underlying `unitStatus` suffers from the same defect described in 1.4 / 1.4a (it marks a unit as "Ocupado" for any active lease regardless of tracking status), the Reporte de portafolio shows "Vigente" for units whose lease is still in CONTACT_INITIATED or CONTRACT_UPLOADED. The result is that the same unit is shown as "Vigente" in `/mis-ingresos/portafolio/[portfolioId]` but would (once 1.4 is fixed) be shown as non-occupied in "Mi portafolio" — the two views use different, inconsistent rules for what counts as an active lease.

1.9c WHEN the Reporte de portafolio page (`/mis-ingresos/portafolio/[portfolioId]`) computes the income figures displayed at the top of the page ("Ingresos recibidos", "Ingresos esperados") and the per-unit amounts on each unit card THEN those totals include the expected rent of units whose underlying lease has not yet reached CONTRACT_SIGNED (i.e., leases in Acordado, CONTACT_INITIATED, or CONTRACT_UPLOADED). This inflates "Ingresos esperados" with amounts that do not yet correspond to a legally binding, signed lease, so the income report does not match the active-lease definition used for occupancy and is internally inconsistent with the "Vigente / Ocupado" derivation expected after the fix.

### Expected Behavior (Correct)

2.1 WHEN a contract is uploaded via `UploadContractUseCase` THEN the system SHALL create the contract with status PENDING AND call the rental-tracking module to transition the lease tracking status to CONTRACT_UPLOADED

2.2 WHEN signing is initiated via `InitiateSigningUseCase` and the e-signature provider returns successfully THEN the system SHALL update the contract status to SIGNATURE_PENDING (no lease tracking transition needed — CONTRACT_UPLOADED remains the tracking state until signing completes)

2.3 WHEN a contract signing webhook is received with status COMPLETED THEN the system SHALL update the contract status to SIGNED AND call the rental-tracking module to transition the lease tracking status to CONTRACT_SIGNED

2.4 WHEN the portfolio use case checks unit occupancy THEN the system SHALL mark the unit as "Ocupado" ONLY if the lease's current tracking status is CONTRACT_SIGNED or PAYMENT_RECEIVED; leases in earlier states (CONTACT_INITIATED, CONTRACT_UPLOADED) SHALL leave the unit as "Disponible"

2.4a WHEN the portfolio summary calculates "Arriendos activos" count and occupancy percentage THEN the system SHALL only count leases whose current tracking status is CONTRACT_SIGNED or PAYMENT_RECEIVED. Leases in earlier states (Acordado, CONTACT_INITIATED, CONTRACT_UPLOADED) SHALL NOT be counted as active leases and SHALL NOT contribute to the occupancy percentage.

2.5 WHEN the lease detail page renders a lease whose tracking status is a raw enum value (PUBLISHED, CONTACT_INITIATED, CONTRACT_UPLOADED, CONTRACT_SIGNED, PAYMENT_RECEIVED) THEN the system SHALL pass variant="tracking" to StatusBadge so the correct Spanish translation is displayed (e.g., "Contacto iniciado", "Contrato subido", "Contrato firmado")

2.6 WHEN a contract is signed and the lease transitions to CONTRACT_SIGNED THEN the system SHALL deactivate the active listing for that unit (set is_active = false) so the unit is no longer publicly listed

2.7 WHEN the lease card shows a signed contract (contractStatus === 'SIGNED') THEN the "Ver contrato archivado" button SHALL navigate to the contract detail page (e.g., /mis-contratos/{contractId}) and be styled as an active link (not gray/disabled)

2.8 WHEN the payment flow attempts to log a payment event with status 'APPROVED' THEN the system SHALL find the corresponding PaymentStatus record in the database because the seed script includes an APPROVED status entry

2.9 WHEN a lease has no signed contract (`contractStatus` is null, PENDING, or SIGNATURE_PENDING) — regardless of whether its tracking status is `Acordado`, `CONTACT_INITIATED`, or `CONTRACT_UPLOADED` — THEN both the frontend AND the backend SHALL allow the landlord to cancel/delete the lease:

- The frontend lease detail page at `src/frontend/app/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]/page.tsx` SHALL compute `canCancel` based on the absence of a signed contract (`lease?.contractStatus !== 'SIGNED'`) rather than on `lease?.status === 'Acordado'`. Whenever `canCancel` is true, the "Cancelar arriendo" button SHALL be rendered.
- The backend `CancelLeaseUseCase` SHALL replace its `leaseStatusName === 'Acordado'` guard with an equivalent semantic check: the cancellation is allowed if and only if no signed contract exists for the lease (`contractStatus ∉ {'SIGNED'}`). The rejection message "Solo se pueden cancelar arriendos en estado Acordado" SHALL be removed in favor of a message that reflects the actual rule (e.g., "No se puede cancelar un arriendo con contrato firmado").

From the user's perspective, "cancel" in this flow is functionally equivalent to "delete the premature lease"; the existing confirmation dialog already reads "Esta acción eliminará el arriendo…", so the UX vocabulary is already aligned and only the gating logic needs to be broadened.

2.9a WHEN the "Mis ingresos" portfolio detail page ("Reporte de portafolio") at `/mis-ingresos/portafolio/[portfolioId]` renders unit status badges THEN the badge SHALL be derived from the SAME active-vs-inactive lease rule used by "Mi portafolio" (sections 1.4 / 2.4 and 1.4a / 2.4a): a unit is shown as "Vigente" / "Ocupado" if and only if its lease's current `trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED}`. Units whose lease is in a pre-signing state (Acordado, CONTACT_INITIATED, or CONTRACT_UPLOADED) SHALL NOT be shown as "Vigente"; they SHALL show the appropriate tracking status translation (e.g., "Acordado", "Contacto iniciado", "Contrato subido") instead. The Reporte de portafolio MUST NOT maintain its own independent derivation of "active lease" — it SHALL consume the same signal that drives portfolio occupancy so the two views are always consistent.

2.9c WHEN the Reporte de portafolio page (`/mis-ingresos/portafolio/[portfolioId]`) computes "Ingresos recibidos", "Ingresos esperados", and the per-unit income figures THEN those totals SHALL only aggregate amounts from leases whose current `trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED}`. Leases in pre-signing states (Acordado, CONTACT_INITIATED, CONTRACT_UPLOADED) SHALL NOT contribute to "Ingresos esperados" or any other income total on this page. This ensures the income report corresponds exactly to the same active-lease definition used for the "Vigente" badge on the same page and for "Ocupado" / "Arriendos activos" in "Mi portafolio".

### Status Naming Alignment

The system uses two parallel status naming conventions that must be reconciled:
- **Lease lifecycle statuses** (from `CreateLeaseUseCase`): `Acordado`, `Vigente`, `Finalizado` — Spanish names used as the initial lease states
- **Tracking process statuses** (from `rental-tracking` module): `CONTACT_INITIATED`, `CONTRACT_UPLOADED`, `CONTRACT_SIGNED`, `PAYMENT_RECEIVED` — English enum names representing the rental process progression

The fix SHALL establish a clear mapping:
- `Acordado` = lease created, awaiting contact/negotiation (equivalent to pre-CONTACT_INITIATED)
- `CONTACT_INITIATED` = contact between parties has been initiated
- `CONTRACT_UPLOADED` = contract document has been uploaded
- `CONTRACT_SIGNED` = contract has been signed by all parties
- `Vigente` = lease is active with signed contract (equivalent to CONTRACT_SIGNED/PAYMENT_RECEIVED)
- `Finalizado` = lease has ended or been cancelled

The frontend SHALL handle both naming conventions gracefully via the StatusBadge `tracking` variant and the cancel logic SHALL not depend on a specific status string.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a contract signing webhook is received with a non-COMPLETED status (e.g., FAILED) THEN the system SHALL CONTINUE TO keep the contract status as SIGNATURE_PENDING and notify the landlord of the failure without modifying the lease tracking status

3.2 WHEN a unit has a lease with tracking status CONTRACT_SIGNED or PAYMENT_RECEIVED THEN the system SHALL CONTINUE TO mark the unit as "Ocupado" in the portfolio view AND count it in the "Arriendos activos" counter and occupancy percentage

3.3 WHEN a unit has no active lease (end_date is set or deleted_at is set) THEN the system SHALL CONTINUE TO mark the unit as "Disponible"

3.4 WHEN the StatusBadge receives a status that matches the lease variant (Vigente, Acordado, Finalizado) THEN the system SHALL CONTINUE TO display it with the correct lease color mapping

3.5 WHEN a lease is in CONTACT_INITIATED state and no contract exists THEN the system SHALL CONTINUE TO show the "Generar contrato" button on the lease card

3.6 WHEN a contract has status PENDING or SIGNATURE_PENDING THEN the system SHALL CONTINUE TO show the "Ver contrato" button with active blue styling

3.7 WHEN the payment flow logs events with existing statuses (PENDING, PROCESSING, PAID, REJECTED) THEN the system SHALL CONTINUE TO find the corresponding PaymentStatus records and log events successfully

3.8 WHEN a listing is manually deactivated by the landlord THEN the system SHALL CONTINUE TO respect that deactivation without interference from the automated deactivation logic

3.9 WHEN a lease has no signed contract (contractStatus is null, PENDING, or SIGNATURE_PENDING) THEN the system SHALL CONTINUE TO allow the landlord to cancel the lease regardless of the tracking status name (whether it's 'Acordado', 'CONTACT_INITIATED', or 'CONTRACT_UPLOADED')

3.10 WHEN a lease has `contractStatus === 'SIGNED'` THEN the system SHALL CONTINUE TO reject cancellation through this flow, regardless of any change to the gating logic: the frontend SHALL NOT render the "Cancelar arriendo" button and the backend `CancelLeaseUseCase` SHALL reject the request with a message reflecting that a signed contract cannot be cancelled via this operation. Broadening the cancel gate to "no signed contract exists" MUST NOT, as a side effect, enable cancellation of already-signed leases.

3.11 WHEN a unit has a lease whose current `trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED}` THEN the Reporte de portafolio page (`/mis-ingresos/portafolio/[portfolioId]`) SHALL CONTINUE TO show it as "Vigente" AND SHALL CONTINUE TO include its rent in "Ingresos recibidos" / "Ingresos esperados" exactly as it does today — the income-report fix only excludes pre-signing leases; it MUST NOT change the numbers or badges for units that legitimately have an active, signed lease.

---

## Bug Condition Derivation

### Bug Condition Function

```pascal
FUNCTION isBugCondition_ContractUpload(X)
  INPUT: X of type ContractUploadEvent
  OUTPUT: boolean
  
  // The bug triggers when a contract is uploaded successfully
  // but the lease tracking status is not updated to CONTRACT_UPLOADED
  RETURN X.contractCreated = true
END FUNCTION

FUNCTION isBugCondition_ContractSigned(X)
  INPUT: X of type SigningWebhookEvent
  OUTPUT: boolean
  
  // The bug triggers when a contract signing completes successfully
  // but the lease tracking status is not updated to CONTRACT_SIGNED
  RETURN X.webhookStatus = 'COMPLETED'
END FUNCTION
```

### Property Specification — Fix Checking

```pascal
// Property: Fix Checking — Contract upload propagates to lease tracking
FOR ALL X WHERE isBugCondition_ContractUpload(X) DO
  result ← uploadContract'(X)
  leaseStatus ← getLeaseCurrentStatus(X.leaseId)
  ASSERT leaseStatus = 'CONTRACT_UPLOADED'
END FOR

// Property: Fix Checking — Contract signing propagates to lease tracking
FOR ALL X WHERE isBugCondition_ContractSigned(X) DO
  result ← handleSigningWebhook'(X)
  leaseStatus ← getLeaseCurrentStatus(X.leaseId)
  ASSERT leaseStatus = 'CONTRACT_SIGNED'
  ASSERT listing_for_unit(X.unitId).is_active = false
END FOR
```

### Property Specification — Unit Status Derivation

```pascal
FUNCTION isUnitStatusBugCondition(X)
  INPUT: X of type LeaseWithTrackingStatus
  OUTPUT: boolean
  
  // The bug triggers when a lease exists but its tracking status
  // is before CONTRACT_SIGNED
  RETURN X.trackingStatus IN {'PUBLISHED', 'CONTACT_INITIATED', 'CONTRACT_UPLOADED'}
    AND X.end_date = null
    AND X.deleted_at = null
END FUNCTION

// Property: Fix Checking — Unit status only "Ocupado" for signed+ leases
FOR ALL X WHERE isUnitStatusBugCondition(X) DO
  unitStatus ← getPortfolioUnitStatus'(X.unitId)
  ASSERT unitStatus = 'Disponible'
END FOR
```

### Property Specification — Income Report Consistency (Reporte de portafolio)

```pascal
FUNCTION isIncomeReportBugCondition(X)
  INPUT: X of type LeaseWithTrackingStatus rendered on /mis-ingresos/portafolio/[portfolioId]
  OUTPUT: boolean

  // The bug triggers when the income report treats a lease as active
  // even though its tracking status is before CONTRACT_SIGNED
  RETURN X.trackingStatus IN {'Acordado', 'CONTACT_INITIATED', 'CONTRACT_UPLOADED'}
    AND X.end_date = null
    AND X.deleted_at = null
END FUNCTION

// Property: Fix Checking — Reporte de portafolio mirrors "Mi portafolio" occupancy rule
FOR ALL X WHERE isIncomeReportBugCondition(X) DO
  badge ← getIncomeReportUnitBadge'(X.unitId)
  ASSERT badge != 'Vigente'

  // And the per-unit amount MUST NOT feed the page totals
  ASSERT contributionToIngresosEsperados'(X) = 0
  ASSERT contributionToIngresosRecibidos'(X) = 0
END FOR

// Property: Cross-view consistency — same active-lease rule on both pages
FOR ALL X WHERE X.end_date = null AND X.deleted_at = null DO
  isActive_portfolio  ← isCountedAsActiveIn_MiPortafolio'(X)     // from 2.4 / 2.4a
  isActive_ingresos   ← isCountedAsActiveIn_ReporteDePortafolio'(X) // from 2.9a / 2.9c
  ASSERT isActive_portfolio = isActive_ingresos
  ASSERT isActive_portfolio = (X.trackingStatus IN {'CONTRACT_SIGNED', 'PAYMENT_RECEIVED'})
END FOR
```

### Property Specification — Cancel Lease Gating (No Signed Contract)

```pascal
FUNCTION isCancelGateBugCondition(X)
  INPUT: X of type LeaseForCancellation
  OUTPUT: boolean

  // The bug triggers when the landlord wants to cancel a lease that
  // has no signed contract yet, but whose tracking status is not 'Acordado'
  // (e.g., CONTACT_INITIATED, CONTRACT_UPLOADED). The current gate
  // `leaseStatusName === 'Acordado'` refuses cancellation in these cases.
  RETURN X.contractStatus IN {null, 'PENDING', 'SIGNATURE_PENDING'}
    AND X.trackingStatus != 'Acordado'
END FUNCTION

// Property: Fix Checking — Cancellation is gated by "no signed contract"
FOR ALL X WHERE isCancelGateBugCondition(X) DO
  // Frontend: the Cancelar arriendo button must be rendered
  ASSERT canCancel'(X) = true

  // Backend: the use case must accept the cancellation
  result ← cancelLeaseUseCase'(X)
  ASSERT result.ok = true
  ASSERT result.errorMessage != 'Solo se pueden cancelar arriendos en estado Acordado'
END FOR
```

### Preservation Goal

```pascal
// Property: Preservation Checking — Failed signing webhooks don't change lease status
FOR ALL X WHERE NOT isBugCondition_ContractSigned(X) DO
  ASSERT handleSigningWebhook(X) = handleSigningWebhook'(X)
END FOR

// Property: Preservation Checking — Units with signed leases stay Ocupado
FOR ALL X WHERE NOT isUnitStatusBugCondition(X) AND X.end_date = null AND X.deleted_at = null DO
  ASSERT getPortfolioUnitStatus(X.unitId) = getPortfolioUnitStatus'(X.unitId)
END FOR

// Property: Preservation Checking — Income report is unchanged for signed+ leases
FOR ALL X WHERE NOT isIncomeReportBugCondition(X) AND X.end_date = null AND X.deleted_at = null DO
  ASSERT getIncomeReportUnitBadge(X.unitId)       = getIncomeReportUnitBadge'(X.unitId)
  ASSERT contributionToIngresosRecibidos(X)       = contributionToIngresosRecibidos'(X)
  ASSERT contributionToIngresosEsperados(X)       = contributionToIngresosEsperados'(X)
END FOR

// Property: Preservation Checking — Signed leases remain non-cancellable
// Broadening the cancel gate to "no signed contract" MUST NOT enable cancelling signed leases.
FOR ALL X WHERE X.contractStatus = 'SIGNED' DO
  ASSERT canCancel'(X) = false
  result ← cancelLeaseUseCase'(X)
  ASSERT result.ok = false
END FOR
```
