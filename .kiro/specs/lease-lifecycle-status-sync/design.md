# Lease Lifecycle Status Sync Bugfix Design

## Overview

The rental lifecycle status system has a cross-module communication gap where contract lifecycle use cases (`UploadContractUseCase`, `InitiateSigningUseCase`, `HandleSigningWebhookUseCase`) never call the `rental-tracking` module to advance the lease tracking status. This causes a cascade of downstream defects: incorrect unit occupancy derivation, inflated portfolio metrics, untranslated status badges, stale listings, broken contract links, missing seed data, overly restrictive cancel logic, and inconsistent income reports.

The fix strategy is minimal and targeted:
1. Wire cross-module calls from `contracts` → `rental-tracking` at the two key lifecycle transitions (upload and signing completion)
2. Tighten the unit occupancy derivation to require `CONTRACT_SIGNED` or `PAYMENT_RECEIVED`
3. Add a `tracking` variant usage to `StatusBadge` on the lease detail page
4. Deactivate listings on contract signing
5. Fix the "Ver contrato" link and styling
6. Seed the missing `APPROVED` payment status
7. Broaden the cancel gate from `status === 'Acordado'` to `contractStatus !== 'SIGNED'`
8. Align the income report page with the corrected active-lease rule

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger the defective behavior — contract lifecycle events that don't propagate to rental-tracking, and downstream derivations that use an overly broad "active lease" definition
- **Property (P)**: The desired correct behavior — tracking status advances on contract events, unit occupancy requires signed contract, income reports only count signed leases
- **Preservation**: Existing behaviors that must remain unchanged — failed webhooks, signed-lease occupancy, existing payment status lookups, manual listing deactivation
- **`TransitionLeaseStateUseCase`**: The use case in `rental-tracking` module that records a state transition and updates `LeaseCurrentStatus` atomically
- **`GetPortfolioUseCase`**: The use case in `landlord-portfolio` that derives `unitStatus` from active leases — currently marks any lease with `end_date = null` as "Ocupado"
- **`trackingStatus`**: The current state in the rental lifecycle state machine: `PUBLISHED → CONTACT_INITIATED → CONTRACT_UPLOADED → CONTRACT_SIGNED → PAYMENT_RECEIVED`
- **`contractStatus`**: The contract document status: `PENDING → SIGNATURE_PENDING → SIGNED`

## Bug Details

### Bug Condition

The bug manifests across multiple interconnected defects. The root cause is that the `contracts` module operates in isolation from the `rental-tracking` module — it updates contract status but never signals the lease lifecycle state machine. Downstream consumers (`GetPortfolioUseCase`, the income report, the frontend) then derive incorrect states from the stale tracking data.

**Formal Specification:**
```
FUNCTION isBugCondition_LifecycleGap(input)
  INPUT: input of type ContractLifecycleEvent
  OUTPUT: boolean

  RETURN (input.eventType = 'CONTRACT_UPLOADED' AND leaseTrackingStatus(input.leaseId) != 'CONTRACT_UPLOADED')
      OR (input.eventType = 'CONTRACT_SIGNED' AND leaseTrackingStatus(input.leaseId) != 'CONTRACT_SIGNED')
END FUNCTION

FUNCTION isBugCondition_UnitStatus(input)
  INPUT: input of type LeaseWithTrackingStatus
  OUTPUT: boolean

  RETURN input.trackingStatus IN {'PUBLISHED', 'CONTACT_INITIATED', 'CONTRACT_UPLOADED'}
    AND input.end_date = null
    AND input.deleted_at = null
    AND derivedUnitStatus(input.unitId) = 'Ocupado'
END FUNCTION

FUNCTION isBugCondition_CancelGate(input)
  INPUT: input of type LeaseForCancellation
  OUTPUT: boolean

  RETURN input.contractStatus IN {null, 'PENDING', 'SIGNATURE_PENDING'}
    AND input.trackingStatus != 'Acordado'
    AND canCancel(input) = false
END FUNCTION

FUNCTION isBugCondition_IncomeReport(input)
  INPUT: input of type LeaseOnIncomeReport
  OUTPUT: boolean

  RETURN input.trackingStatus IN {'Acordado', 'CONTACT_INITIATED', 'CONTRACT_UPLOADED'}
    AND input.end_date = null
    AND input.deleted_at = null
    AND (badge(input) = 'Vigente' OR contributesToIncome(input) = true)
END FUNCTION
```

### Examples

- **Contract upload**: Landlord uploads a PDF contract for lease L1 → contract status becomes PENDING, but `LeaseCurrentStatus` for L1 remains CONTACT_INITIATED. Unit shows "Ocupado" incorrectly.
- **Contract signing**: Webhook arrives with `status: COMPLETED` → contract status becomes SIGNED, but `LeaseCurrentStatus` stays CONTACT_INITIATED. Listing remains published. Unit shows "Ocupado" based on wrong criteria.
- **Cancel attempt**: Landlord tries to cancel lease in CONTACT_INITIATED state → frontend hides "Cancelar arriendo" button because `lease.status !== 'Acordado'`. Backend rejects with "Solo se pueden cancelar arriendos en estado Acordado".
- **Income report**: Unit with lease in CONTACT_INITIATED shows "Vigente" badge and its rent is included in "Ingresos esperados" — inflating the total.
- **StatusBadge**: Lease detail page passes `status="CONTACT_INITIATED"` with `variant="lease"` → falls through to gray default, displaying raw English enum.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Failed signing webhooks (status ≠ COMPLETED) must continue to keep contract at SIGNATURE_PENDING and NOT modify lease tracking status
- Units with leases at CONTRACT_SIGNED or PAYMENT_RECEIVED must continue to show "Ocupado"
- Units with no active lease (end_date set or deleted_at set) must continue to show "Disponible"
- StatusBadge with existing lease variant statuses (Vigente, Acordado, Finalizado) must continue to display correctly
- Existing payment status lookups (PENDING, PROCESSING, PAID, REJECTED) must continue to work
- Manual listing deactivation by landlord must not be interfered with by automated deactivation
- Leases with `contractStatus === 'SIGNED'` must remain non-cancellable
- Income report for units with signed leases must continue to show "Vigente" and include their rent in totals

**Scope:**
All inputs that do NOT involve the bug conditions should be completely unaffected by this fix. This includes:
- Leases that already have CONTRACT_SIGNED or PAYMENT_RECEIVED tracking status
- Units with no active lease
- Payment flows using existing statuses (PENDING, PROCESSING, PAID, REJECTED)
- Contract operations on already-signed contracts
- Mouse/touch interactions on the lease detail page

## Hypothesized Root Cause

Based on the code analysis, the confirmed root causes are:

1. **Missing cross-module calls in contracts module**: `UploadContractUseCase` (line ~90) creates the contract and logs an audit event but never calls `TransitionLeaseStateUseCase.execute()` with `newState: 'CONTRACT_UPLOADED'`. Similarly, `HandleSigningWebhookUseCase` updates contract status to SIGNED but never calls `TransitionLeaseStateUseCase.execute()` with `newState: 'CONTRACT_SIGNED'`. The `contracts.module.ts` does not import `RentalTrackingModule`.

2. **Overly broad unit status derivation**: `GetPortfolioUseCase.toResponseDto()` queries `prisma.lease.findFirst({ where: { portfolio_unit_id, end_date: null, deleted_at: null } })` — if ANY active lease exists, it marks the unit as "Ocupado". It does not check the lease's tracking status.

3. **Wrong StatusBadge variant**: The lease detail page passes `variant="lease"` to StatusBadge, but the lease's `status` field may contain tracking enum values (CONTACT_INITIATED, etc.) that only exist in the `tracking` variant's color map.

4. **No listing deactivation on signing**: `HandleSigningWebhookUseCase` does not call `IListingRepository.unpublish()` or any equivalent when a contract is signed.

5. **Incorrect "Ver contrato" link**: `LeaseDetailView` always links to `basePath` (the lease detail page itself) instead of the contract detail page at `/mis-contratos/{contractId}`.

6. **Missing APPROVED seed**: The `seed.ts` payment statuses array only contains PENDING, PROCESSING, PAID, REJECTED — no APPROVED entry.

7. **Narrow cancel gate**: `CancelLeaseUseCase` checks `leaseStatusName !== 'Acordado'` (step 4) and throws ConflictException. The frontend mirrors this with `canCancel = lease?.status === 'Acordado'`. Both should check for absence of a signed contract instead.

8. **Income report uses `unitStatus` for badge derivation**: The `getLeaseStatus()` function in the income report page maps `unitStatus === 'Ocupado'` → "Vigente", inheriting the same overly broad active-lease bug from `GetPortfolioUseCase`.

## Correctness Properties

Property 1: Bug Condition - Contract Upload Propagates Tracking Status

_For any_ contract upload event where `UploadContractUseCase` successfully creates a contract, the fixed use case SHALL call the rental-tracking module to transition the lease's tracking status to `CONTRACT_UPLOADED`.

**Validates: Requirements 2.1**

Property 2: Bug Condition - Contract Signing Propagates Tracking Status and Deactivates Listing

_For any_ signing webhook event with status COMPLETED, the fixed `HandleSigningWebhookUseCase` SHALL call the rental-tracking module to transition the lease's tracking status to `CONTRACT_SIGNED` AND SHALL deactivate the active listing for the associated unit.

**Validates: Requirements 2.3, 2.6**

Property 3: Bug Condition - Unit Occupancy Requires Signed Contract

_For any_ lease whose tracking status is in {PUBLISHED, CONTACT_INITIATED, CONTRACT_UPLOADED} with end_date = null and deleted_at = null, the fixed `GetPortfolioUseCase` SHALL derive unitStatus as "Disponible" (not "Ocupado").

**Validates: Requirements 2.4, 2.4a**

Property 4: Bug Condition - Cancel Gate Allows Pre-Signing Cancellation

_For any_ lease where contractStatus is null, PENDING, or SIGNATURE_PENDING (regardless of tracking status name), the fixed system SHALL allow cancellation: the frontend SHALL render the "Cancelar arriendo" button and the backend SHALL accept the cancellation request.

**Validates: Requirements 2.9**

Property 5: Bug Condition - Income Report Excludes Pre-Signing Leases

_For any_ unit whose lease tracking status is in {Acordado, CONTACT_INITIATED, CONTRACT_UPLOADED}, the fixed income report page SHALL NOT show a "Vigente" badge and SHALL NOT include its rent in income totals.

**Validates: Requirements 2.9a, 2.9c**

Property 6: Preservation - Failed Webhooks Don't Change Tracking Status

_For any_ signing webhook event with status ≠ COMPLETED, the fixed `HandleSigningWebhookUseCase` SHALL produce the same behavior as the original: keep contract at SIGNATURE_PENDING, notify landlord of failure, and NOT modify the lease tracking status.

**Validates: Requirements 3.1**

Property 7: Preservation - Signed Leases Remain Occupied and Non-Cancellable

_For any_ lease with tracking status CONTRACT_SIGNED or PAYMENT_RECEIVED, the fixed system SHALL continue to mark the unit as "Ocupado", count it in active lease metrics, show "Vigente" on the income report, include its rent in income totals, and reject cancellation attempts.

**Validates: Requirements 3.2, 3.10, 3.11**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/backend/modules/contracts/application/use-cases/upload-contract.use-case.ts`

**Specific Changes**:
1. **Inject `TransitionLeaseStateUseCase`**: Add constructor parameter with `@Inject()` for the rental-tracking transition use case
2. **Call transition after contract creation**: After successful contract creation and audit log, call `transitionLeaseState.execute({ leaseId: dto.leaseId, newState: 'CONTRACT_UPLOADED' }, userId)` — fire-and-forget with `.catch(() => undefined)` to avoid blocking the contract upload on tracking failures

---

**File**: `src/backend/modules/contracts/application/use-cases/handle-signing-webhook.use-case.ts`

**Specific Changes**:
1. **Inject `TransitionLeaseStateUseCase`**: Add constructor parameter
2. **Inject listing deactivation port**: Add a port interface `IListingDeactivationPort` with method `deactivateByLeaseId(leaseId: string): Promise<void>`
3. **Call transition on COMPLETED**: After updating contract status to SIGNED, call `transitionLeaseState.execute({ leaseId: contract.leaseId, newState: 'CONTRACT_SIGNED' }, 'system')`
4. **Deactivate listing on COMPLETED**: Call `listingDeactivationPort.deactivateByLeaseId(contract.leaseId).catch(() => undefined)` — fire-and-forget

---

**File**: `src/backend/modules/contracts/contracts.module.ts`

**Specific Changes**:
1. **Import `RentalTrackingModule`**: Add to imports array
2. **Register listing deactivation port**: Define DI token and provide adapter implementation
3. **Wire `TransitionLeaseStateUseCase`**: Already exported from `RentalTrackingModule`, will be available via DI

---

**File**: `src/backend/modules/landlord-portfolio/application/use-cases/get-portfolio.use-case.ts`

**Specific Changes**:
1. **Add tracking status check**: After finding an active lease, query `LeaseCurrentStatus` for that lease and check if `status.name IN ('CONTRACT_SIGNED', 'PAYMENT_RECEIVED')`
2. **Only mark "Ocupado" for signed+ leases**: If tracking status is not in the signed set, treat the unit as "Disponible" (no tenant name, no monthly rent)
3. **Update active lease count logic**: Ensure the portfolio summary only counts leases with signed+ tracking status

---

**File**: `src/backend/modules/landlord-portfolio/application/use-cases/cancel-lease.use-case.ts`

**Specific Changes**:
1. **Replace status name check**: Remove step 4's `leaseStatusName !== 'Acordado'` guard
2. **Add contract status check**: The existing step 5 already checks contract status — move the `contractStatusName === 'SIGNED'` rejection to be the primary gate. If no contract exists OR contract is PENDING/SIGNATURE_PENDING, allow cancellation.
3. **Update error message**: Change from "Solo se pueden cancelar arriendos en estado Acordado" to "No se puede cancelar un arriendo con contrato firmado"

---

**File**: `src/frontend/app/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]/page.tsx`

**Specific Changes**:
1. **Fix `canCancel` logic**: Change from `lease?.status === 'Acordado'` to `lease?.contractStatus !== 'SIGNED'`
2. **Fix StatusBadge variant**: Change from `variant="lease"` to use `variant="tracking"` when the status is a tracking enum value (detect by checking if status is in the tracking enum set)

---

**File**: `src/frontend/modules/landlord-leases/components/LeaseDetailView.tsx`

**Specific Changes**:
1. **Fix "Ver contrato" link**: Change `href={basePath}` to `href={/mis-contratos/${lease.contractId}}` when `contractStatus === 'SIGNED'`
2. **Fix link styling**: When contract is SIGNED, use active blue link styling (not gray/disabled)

---

**File**: `src/frontend/app/mis-ingresos/portafolio/[portfolioId]/page.tsx`

**Specific Changes**:
1. **Fix `getLeaseStatus()` function**: Instead of deriving from `unitStatus`, use the tracking status directly from the unit data (requires backend to include `trackingStatus` in the portfolio unit response)
2. **Filter income display**: Only show income amounts for units whose tracking status is CONTRACT_SIGNED or PAYMENT_RECEIVED
3. **Use `variant="tracking"` for StatusBadge**: Pass the tracking status with the tracking variant for correct Spanish translation

---

**File**: `src/backend/db/seeds/seed.ts`

**Specific Changes**:
1. **Add APPROVED to payment statuses array**: Add `{ name: 'APPROVED', description: 'Pago aprobado por la pasarela' }` to the `paymentStatuses` array

---

**File**: `src/backend/modules/landlord-portfolio/application/dtos/portfolio-unit-response.dto.ts`

**Specific Changes**:
1. **Add `trackingStatus` field**: Include the lease's current tracking status name in the response DTO so the frontend can use it for badge rendering and income filtering

---

**File**: `src/frontend/modules/landlord-leases/types.ts`

**Specific Changes**:
1. **Broaden `LeaseDetail.status` type**: Change from `'Vigente' | 'Acordado' | 'Finalizado'` to `string` to accommodate tracking enum values

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write integration-style tests that exercise the contract lifecycle use cases and assert that the lease tracking status is updated. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Upload Contract → Tracking Status**: Call `UploadContractUseCase.execute()` with valid inputs, then query `LeaseCurrentStatus` — assert it equals CONTRACT_UPLOADED (will fail on unfixed code)
2. **Signing Webhook COMPLETED → Tracking Status**: Call `HandleSigningWebhookUseCase.execute()` with status COMPLETED, then query `LeaseCurrentStatus` — assert it equals CONTRACT_SIGNED (will fail on unfixed code)
3. **Unit Status for Pre-Signing Lease**: Create a lease with CONTACT_INITIATED status, call `GetPortfolioUseCase.execute()` — assert unitStatus is "Disponible" (will fail on unfixed code, returns "Ocupado")
4. **Cancel Lease in CONTACT_INITIATED**: Attempt cancellation of a lease in CONTACT_INITIATED state — assert it succeeds (will fail on unfixed code with ConflictException)

**Expected Counterexamples**:
- `LeaseCurrentStatus` remains CONTACT_INITIATED after contract upload and signing
- `unitStatus` returns "Ocupado" for leases in CONTACT_INITIATED
- `CancelLeaseUseCase` throws "Solo se pueden cancelar arriendos en estado Acordado" for CONTACT_INITIATED leases

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_LifecycleGap(input) DO
  result := executeContractLifecycleEvent'(input)
  ASSERT leaseTrackingStatus(input.leaseId) = expectedTrackingStatus(input.eventType)
  IF input.eventType = 'CONTRACT_SIGNED' THEN
    ASSERT listing_for_unit(input.unitId).is_active = false
  END IF
END FOR

FOR ALL input WHERE isBugCondition_UnitStatus(input) DO
  unitStatus := getPortfolioUnitStatus'(input.unitId)
  ASSERT unitStatus = 'Disponible'
END FOR

FOR ALL input WHERE isBugCondition_CancelGate(input) DO
  ASSERT canCancel'(input) = true
  result := cancelLeaseUseCase'(input)
  ASSERT result.ok = true
END FOR

FOR ALL input WHERE isBugCondition_IncomeReport(input) DO
  badge := getIncomeReportBadge'(input.unitId)
  ASSERT badge != 'Vigente'
  ASSERT contributionToIncome'(input) = 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition_LifecycleGap(input) DO
  ASSERT handleSigningWebhook(input) = handleSigningWebhook'(input)
END FOR

FOR ALL input WHERE NOT isBugCondition_UnitStatus(input) AND input.end_date = null AND input.deleted_at = null DO
  ASSERT getPortfolioUnitStatus(input.unitId) = getPortfolioUnitStatus'(input.unitId)
END FOR

FOR ALL input WHERE input.contractStatus = 'SIGNED' DO
  ASSERT canCancel'(input) = false
  result := cancelLeaseUseCase'(input)
  ASSERT result.ok = false
END FOR

FOR ALL input WHERE input.trackingStatus IN {'CONTRACT_SIGNED', 'PAYMENT_RECEIVED'} DO
  ASSERT getIncomeReportBadge'(input.unitId) = 'Vigente'
  ASSERT contributionToIncome'(input) = contributionToIncome(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various tracking statuses, contract statuses, lease configurations)
- It catches edge cases that manual unit tests might miss (e.g., lease with PAYMENT_RECEIVED + null contract)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for signed leases and failed webhooks, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Failed Webhook Preservation**: Verify that webhooks with status ≠ COMPLETED continue to keep contract at SIGNATURE_PENDING and don't touch tracking status
2. **Signed Lease Occupancy Preservation**: Verify units with CONTRACT_SIGNED/PAYMENT_RECEIVED leases continue to show "Ocupado"
3. **Signed Lease Non-Cancellable Preservation**: Verify leases with contractStatus SIGNED continue to be rejected by cancel logic
4. **Existing Payment Status Preservation**: Verify PENDING, PROCESSING, PAID, REJECTED lookups continue to work after adding APPROVED

### Unit Tests

- Test `UploadContractUseCase` calls `TransitionLeaseStateUseCase` with CONTRACT_UPLOADED after successful upload
- Test `HandleSigningWebhookUseCase` calls `TransitionLeaseStateUseCase` with CONTRACT_SIGNED on COMPLETED webhook
- Test `HandleSigningWebhookUseCase` does NOT call transition on FAILED webhook
- Test `HandleSigningWebhookUseCase` calls listing deactivation on COMPLETED webhook
- Test `GetPortfolioUseCase` returns "Disponible" for leases in CONTACT_INITIATED
- Test `GetPortfolioUseCase` returns "Ocupado" for leases in CONTRACT_SIGNED
- Test `CancelLeaseUseCase` allows cancellation when contractStatus is null
- Test `CancelLeaseUseCase` allows cancellation when contractStatus is PENDING
- Test `CancelLeaseUseCase` rejects cancellation when contractStatus is SIGNED
- Test `canCancel` frontend logic returns true when contractStatus !== 'SIGNED'
- Test `canCancel` frontend logic returns false when contractStatus === 'SIGNED'
- Test StatusBadge renders correct Spanish label for tracking statuses
- Test "Ver contrato" link points to `/mis-contratos/{contractId}` when contract is SIGNED
- Test income report `getLeaseStatus()` returns correct badge based on tracking status

### Property-Based Tests

- Generate random lease configurations (various tracking statuses × contract statuses) and verify unit occupancy derivation is correct
- Generate random webhook events (COMPLETED vs non-COMPLETED) and verify tracking status transitions only happen on COMPLETED
- Generate random lease states and verify cancel gate allows/rejects based on contract status (not tracking status name)
- Generate random unit configurations and verify income report badge and income contribution match the active-lease rule

### Integration Tests

- Test full contract lifecycle flow: upload → initiate signing → webhook COMPLETED → verify tracking status progression
- Test that listing is deactivated after full signing flow
- Test portfolio view shows correct unit statuses after contract lifecycle events
- Test income report page shows correct badges and totals with mixed lease states
- Test cancel flow for leases in various pre-signing states
- Test seed script includes APPROVED payment status
