# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Lease Lifecycle Status Never Advances Beyond CONTACT_INITIATED
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the lifecycle gap, incorrect unit status derivation, restrictive cancel gate, and inflated income report
  - **Scoped PBT Approach**: Scope the property to concrete failing cases:
    - Contract upload event → lease tracking status should be CONTRACT_UPLOADED but remains CONTACT_INITIATED
    - Signing webhook COMPLETED → lease tracking status should be CONTRACT_SIGNED but remains CONTACT_INITIATED
    - Lease in CONTACT_INITIATED with end_date=null → unit status should be "Disponible" but returns "Ocupado"
    - Lease in CONTACT_INITIATED with contractStatus=null → canCancel should be true but returns false
    - Lease in CONTACT_INITIATED on income report → badge should NOT be "Vigente" but shows "Vigente"
  - Test `UploadContractUseCase.execute()` with valid inputs, then query `LeaseCurrentStatus` — assert it equals CONTRACT_UPLOADED (from Bug Condition `isBugCondition_ContractUpload`)
  - Test `HandleSigningWebhookUseCase.execute()` with status COMPLETED, then query `LeaseCurrentStatus` — assert it equals CONTRACT_SIGNED (from Bug Condition `isBugCondition_ContractSigned`)
  - Test `GetPortfolioUseCase` with lease in CONTACT_INITIATED — assert unitStatus is "Disponible" (from Bug Condition `isUnitStatusBugCondition`)
  - Test `CancelLeaseUseCase` with lease in CONTACT_INITIATED and contractStatus=null — assert cancellation succeeds (from Bug Condition `isCancelGateBugCondition`)
  - Test income report derivation with lease in CONTACT_INITIATED — assert badge is NOT "Vigente" and income contribution is 0 (from Bug Condition `isIncomeReportBugCondition`)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - `LeaseCurrentStatus` remains CONTACT_INITIATED after contract upload and signing
    - `unitStatus` returns "Ocupado" for leases in CONTACT_INITIATED
    - `CancelLeaseUseCase` throws "Solo se pueden cancelar arriendos en estado Acordado" for CONTACT_INITIATED leases
    - Income report shows "Vigente" badge and includes rent for pre-signing leases
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.4a, 1.9, 1.9a, 1.9b, 1.9c_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Signed Leases Remain Occupied, Non-Cancellable, and Income-Contributing
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (cases where isBugCondition returns false):
    - Observe: `HandleSigningWebhookUseCase` with status FAILED keeps contract at SIGNATURE_PENDING and does NOT modify tracking status
    - Observe: Unit with lease at CONTRACT_SIGNED (end_date=null, deleted_at=null) returns unitStatus "Ocupado"
    - Observe: Unit with lease at PAYMENT_RECEIVED returns unitStatus "Ocupado" and is counted in active lease metrics
    - Observe: Lease with contractStatus='SIGNED' is rejected by `CancelLeaseUseCase`
    - Observe: Payment status lookups for PENDING, PROCESSING, PAID, REJECTED succeed
    - Observe: Income report for unit with CONTRACT_SIGNED lease shows "Vigente" badge and includes rent in totals
  - Write property-based tests capturing observed behavior patterns:
    - For all webhook events with status ≠ COMPLETED: contract stays at SIGNATURE_PENDING, tracking status unchanged (from Preservation Requirements 3.1)
    - For all leases with trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED} and end_date=null and deleted_at=null: unitStatus = "Ocupado" (from Preservation Requirements 3.2)
    - For all leases with contractStatus = 'SIGNED': canCancel = false and cancellation is rejected (from Preservation Requirements 3.10)
    - For all units with no active lease (end_date set or deleted_at set): unitStatus = "Disponible" (from Preservation Requirements 3.3)
    - For all leases with trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED} on income report: badge = "Vigente" and rent included in totals (from Preservation Requirements 3.11)
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.9, 3.10, 3.11_

- [ ] 3. Wire cross-module calls from contracts → rental-tracking

  - [x] 3.1 Import RentalTrackingModule in ContractsModule and register listing deactivation port
    - Add `RentalTrackingModule` to imports array in `src/backend/modules/contracts/contracts.module.ts`
    - Define `IListingDeactivationPort` interface with method `deactivateByLeaseId(leaseId: string): Promise<void>` in contracts domain ports
    - Define DI token `LISTING_DEACTIVATION_PORT`
    - Implement adapter that queries the lease's unit and sets `is_active = false` on the associated listing
    - Register the adapter as provider in `contracts.module.ts`
    - _Bug_Condition: isBugCondition_LifecycleGap — contract events don't propagate to rental-tracking_
    - _Expected_Behavior: Contract lifecycle events trigger lease tracking transitions_
    - _Preservation: Failed webhooks and existing contract operations remain unchanged_
    - _Requirements: 2.1, 2.3, 2.6_

  - [x] 3.2 Add tracking status transition call to UploadContractUseCase
    - Inject `TransitionLeaseStateUseCase` via `@Inject()` in `src/backend/modules/contracts/application/use-cases/upload-contract.use-case.ts`
    - After successful contract creation and audit log, call `transitionLeaseState.execute({ leaseId: dto.leaseId, newState: 'CONTRACT_UPLOADED' }, userId)`
    - Use fire-and-forget pattern: `.catch(() => undefined)` to avoid blocking contract upload on tracking failures
    - _Bug_Condition: isBugCondition_ContractUpload(X) where X.contractCreated = true_
    - _Expected_Behavior: leaseTrackingStatus(X.leaseId) = 'CONTRACT_UPLOADED' after upload_
    - _Preservation: Contract creation logic and audit logging remain unchanged_
    - _Requirements: 2.1_

  - [x] 3.3 Add tracking status transition and listing deactivation to HandleSigningWebhookUseCase
    - Inject `TransitionLeaseStateUseCase` and `IListingDeactivationPort` (via `LISTING_DEACTIVATION_PORT` token) in `src/backend/modules/contracts/application/use-cases/handle-signing-webhook.use-case.ts`
    - After updating contract status to SIGNED (when webhook status = COMPLETED), call `transitionLeaseState.execute({ leaseId: contract.leaseId, newState: 'CONTRACT_SIGNED' }, 'system')`
    - Call `listingDeactivationPort.deactivateByLeaseId(contract.leaseId).catch(() => undefined)` — fire-and-forget
    - Do NOT call transition or deactivation for non-COMPLETED webhook statuses (preserves requirement 3.1)
    - _Bug_Condition: isBugCondition_ContractSigned(X) where X.webhookStatus = 'COMPLETED'_
    - _Expected_Behavior: leaseTrackingStatus = 'CONTRACT_SIGNED' AND listing.is_active = false_
    - _Preservation: Failed webhooks (status ≠ COMPLETED) keep contract at SIGNATURE_PENDING, no tracking change_
    - _Requirements: 2.3, 2.6, 3.1_

  - [x] 3.4 Verify bug condition exploration test now passes for lifecycle gap
    - **Property 1: Expected Behavior** - Contract Upload and Signing Propagate Tracking Status
    - **IMPORTANT**: Re-run the SAME test from task 1 (lifecycle gap assertions only) - do NOT write a new test
    - The test from task 1 encodes the expected behavior for contract upload → CONTRACT_UPLOADED and signing → CONTRACT_SIGNED
    - Run bug condition exploration test from step 1 (lifecycle gap portion)
    - **EXPECTED OUTCOME**: Test PASSES (confirms lifecycle gap is fixed)
    - _Requirements: 2.1, 2.3, 2.6_

  - [x] 3.5 Verify preservation tests still pass for webhook handling
    - **Property 2: Preservation** - Failed Webhooks Don't Change Tracking Status
    - **IMPORTANT**: Re-run the SAME tests from task 2 (webhook preservation assertions) - do NOT write new tests
    - Run preservation property tests from step 2 (failed webhook portion)
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in webhook handling)

- [ ] 4. Fix unit occupancy derivation and portfolio summary metrics

  - [x] 4.1 Update GetPortfolioUseCase to require CONTRACT_SIGNED or PAYMENT_RECEIVED for "Ocupado"
    - In `src/backend/modules/landlord-portfolio/application/use-cases/get-portfolio.use-case.ts`
    - After finding an active lease (end_date=null, deleted_at=null), query `LeaseCurrentStatus` for that lease
    - Check if `status.name IN ('CONTRACT_SIGNED', 'PAYMENT_RECEIVED')`
    - Only mark unit as "Ocupado" if tracking status is in the signed set; otherwise treat as "Disponible"
    - Update active lease count logic: only count leases with signed+ tracking status in "Arriendos activos" and occupancy percentage
    - _Bug_Condition: isUnitStatusBugCondition — lease in pre-signing state with end_date=null incorrectly marked "Ocupado"_
    - _Expected_Behavior: unitStatus = 'Disponible' for leases in {PUBLISHED, CONTACT_INITIATED, CONTRACT_UPLOADED}_
    - _Preservation: Units with CONTRACT_SIGNED/PAYMENT_RECEIVED leases continue to show "Ocupado"_
    - _Requirements: 2.4, 2.4a, 3.2, 3.3_

  - [x] 4.2 Add trackingStatus field to portfolio unit response DTO
    - In `src/backend/modules/landlord-portfolio/application/dtos/portfolio-unit-response.dto.ts`
    - Add `trackingStatus?: string` field with `@ApiPropertyOptional()` decorator
    - Populate from the lease's current tracking status name in `GetPortfolioUseCase.toResponseDto()`
    - This enables the frontend income report page to derive badges from tracking status directly
    - _Requirements: 2.9a_

  - [x] 4.3 Verify bug condition exploration test now passes for unit status derivation
    - **Property 1: Expected Behavior** - Unit Occupancy Requires Signed Contract
    - **IMPORTANT**: Re-run the SAME test from task 1 (unit status assertions only) - do NOT write a new test
    - Run bug condition exploration test from step 1 (unit status portion)
    - **EXPECTED OUTCOME**: Test PASSES (confirms unit status derivation is fixed)
    - _Requirements: 2.4, 2.4a_

  - [x] 4.4 Verify preservation tests still pass for signed lease occupancy
    - **Property 2: Preservation** - Signed Leases Remain Occupied
    - **IMPORTANT**: Re-run the SAME tests from task 2 (signed lease occupancy assertions) - do NOT write new tests
    - Run preservation property tests from step 2 (signed lease occupancy portion)
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions for signed leases)

- [ ] 5. Broaden cancel gate in CancelLeaseUseCase (backend) and lease detail page (frontend)

  - [x] 5.1 Replace status name check with contract status check in CancelLeaseUseCase
    - In `src/backend/modules/landlord-portfolio/application/use-cases/cancel-lease.use-case.ts`
    - Remove step 4's `leaseStatusName !== 'Acordado'` guard
    - Replace with semantic check: cancellation is allowed if and only if `contractStatus ∉ {'SIGNED'}` (i.e., contractStatus is null, PENDING, or SIGNATURE_PENDING)
    - Update error message from "Solo se pueden cancelar arriendos en estado Acordado" to "No se puede cancelar un arriendo con contrato firmado"
    - _Bug_Condition: isCancelGateBugCondition — contractStatus ∈ {null, 'PENDING', 'SIGNATURE_PENDING'} AND trackingStatus != 'Acordado' → canCancel = false_
    - _Expected_Behavior: canCancel = true for all leases without a signed contract_
    - _Preservation: Leases with contractStatus = 'SIGNED' remain non-cancellable (requirement 3.10)_
    - _Requirements: 2.9, 3.9, 3.10_

  - [~] 5.2 Fix canCancel logic and StatusBadge variant on lease detail page
    - In `src/frontend/app/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]/page.tsx`
    - Change `canCancel` from `lease?.status === 'Acordado'` to `lease?.contractStatus !== 'SIGNED'`
    - Change StatusBadge from `variant="lease"` to `variant="tracking"` when the status is a tracking enum value (CONTACT_INITIATED, CONTRACT_UPLOADED, CONTRACT_SIGNED, PAYMENT_RECEIVED)
    - Ensure "Cancelar arriendo" button renders whenever `canCancel` is true
    - _Bug_Condition: Frontend hides cancel button for CONTACT_INITIATED/CONTRACT_UPLOADED leases_
    - _Expected_Behavior: Cancel button visible for all leases without signed contract; correct Spanish badge_
    - _Preservation: Cancel button hidden when contractStatus = 'SIGNED'; lease variant statuses (Vigente, Acordado, Finalizado) still display correctly_
    - _Requirements: 2.5, 2.9, 3.4, 3.10_

  - [~] 5.3 Verify bug condition exploration test now passes for cancel gate
    - **Property 1: Expected Behavior** - Cancel Gate Allows Pre-Signing Cancellation
    - **IMPORTANT**: Re-run the SAME test from task 1 (cancel gate assertions only) - do NOT write a new test
    - Run bug condition exploration test from step 1 (cancel gate portion)
    - **EXPECTED OUTCOME**: Test PASSES (confirms cancel gate is fixed)
    - _Requirements: 2.9_

  - [~] 5.4 Verify preservation tests still pass for signed lease non-cancellability
    - **Property 2: Preservation** - Signed Leases Remain Non-Cancellable
    - **IMPORTANT**: Re-run the SAME tests from task 2 (signed lease cancellation assertions) - do NOT write new tests
    - Run preservation property tests from step 2 (signed lease non-cancellable portion)
    - **EXPECTED OUTCOME**: Tests PASS (confirms signed leases still cannot be cancelled)

- [ ] 6. Fix "Ver contrato archivado" button link and styling

  - [~] 6.1 Fix contract link in LeaseDetailView
    - In `src/frontend/modules/landlord-leases/components/LeaseDetailView.tsx`
    - When `contractStatus === 'SIGNED'`, change `href` from `basePath` (lease detail page) to `/mis-contratos/${lease.contractId}`
    - Apply active blue link styling (Primary_Button_Style or equivalent active link style) instead of gray/disabled styling
    - When `contractStatus` is PENDING or SIGNATURE_PENDING, keep existing "Ver contrato" button with active blue styling
    - _Bug_Condition: "Ver contrato archivado" links to same page with gray disabled styling_
    - _Expected_Behavior: Button navigates to contract detail page with active styling_
    - _Preservation: "Ver contrato" button for PENDING/SIGNATURE_PENDING contracts remains unchanged (requirement 3.6)_
    - _Requirements: 2.7, 3.5, 3.6_

- [ ] 7. Add APPROVED to PaymentStatus seed

  - [~] 7.1 Add APPROVED entry to payment statuses seed array
    - In `src/backend/db/seeds/seed.ts`
    - Add `{ name: 'APPROVED', description: 'Pago aprobado por la pasarela' }` to the `paymentStatuses` array
    - Ensure existing statuses (PENDING, PROCESSING, PAID, REJECTED) remain unchanged
    - _Bug_Condition: PaymentStatus 'APPROVED' not found in database causes crash_
    - _Expected_Behavior: Seed includes APPROVED so payment flow can log events with this status_
    - _Preservation: Existing payment status lookups (PENDING, PROCESSING, PAID, REJECTED) continue to work (requirement 3.7)_
    - _Requirements: 2.8, 3.7_

- [ ] 8. Fix income report page (badges + income totals)

  - [~] 8.1 Fix getLeaseStatus() and income derivation on Reporte de portafolio page
    - In `src/frontend/app/mis-ingresos/portafolio/[portfolioId]/page.tsx`
    - Replace `getLeaseStatus()` derivation from `unitStatus` with direct use of `trackingStatus` from the portfolio unit response DTO (added in task 4.2)
    - Only show "Vigente" badge for units whose `trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED}`
    - For pre-signing states (Acordado, CONTACT_INITIATED, CONTRACT_UPLOADED), show the appropriate tracking status translation using `variant="tracking"` on StatusBadge
    - Filter income display: only include amounts in "Ingresos recibidos" and "Ingresos esperados" for units whose `trackingStatus ∈ {CONTRACT_SIGNED, PAYMENT_RECEIVED}`
    - Leases in pre-signing states SHALL NOT contribute to any income total
    - _Bug_Condition: isIncomeReportBugCondition — pre-signing leases show "Vigente" and inflate income totals_
    - _Expected_Behavior: Badge and income totals only reflect signed+ leases; cross-view consistency with "Mi portafolio"_
    - _Preservation: Units with CONTRACT_SIGNED/PAYMENT_RECEIVED continue to show "Vigente" and include rent in totals (requirement 3.11)_
    - _Requirements: 2.9a, 2.9c, 3.11_

  - [~] 8.2 Verify bug condition exploration test now passes for income report
    - **Property 1: Expected Behavior** - Income Report Excludes Pre-Signing Leases
    - **IMPORTANT**: Re-run the SAME test from task 1 (income report assertions only) - do NOT write a new test
    - Run bug condition exploration test from step 1 (income report portion)
    - **EXPECTED OUTCOME**: Test PASSES (confirms income report is fixed)
    - _Requirements: 2.9a, 2.9c_

  - [~] 8.3 Verify preservation tests still pass for signed lease income reporting
    - **Property 2: Preservation** - Signed Leases Continue Contributing to Income
    - **IMPORTANT**: Re-run the SAME tests from task 2 (income report preservation assertions) - do NOT write new tests
    - Run preservation property tests from step 2 (signed lease income portion)
    - **EXPECTED OUTCOME**: Tests PASS (confirms signed leases still show "Vigente" and contribute to income)

- [~] 9. Checkpoint - Ensure all tests pass
  - Run full backend test suite: `npm run test` from `src/backend/`
  - Run frontend build: `npm run build` from `src/frontend/`
  - Run backend build: `npm run build` from `src/backend/`
  - Ensure all property-based tests (bug condition + preservation) pass
  - Ensure no TypeScript compilation errors
  - Ensure no lint errors
  - Ask the user if questions arise

- [~] 10. Manual QA and post-implementation review
  - Deploy or run the feature locally and test all user-facing flows end-to-end
  - Test contract lifecycle flow: upload contract → initiate signing → webhook COMPLETED → verify tracking status progression on lease detail page
  - Verify unit status shows "Disponible" for leases in pre-signing states and "Ocupado" only for CONTRACT_SIGNED/PAYMENT_RECEIVED
  - Verify portfolio summary "Arriendos activos" count and occupancy percentage only reflect signed leases
  - Verify StatusBadge shows correct Spanish translations for all tracking statuses (Contacto iniciado, Contrato subido, Contrato firmado, Pago recibido)
  - Verify "Cancelar arriendo" button appears for leases in CONTACT_INITIATED, CONTRACT_UPLOADED, and Acordado states (no signed contract)
  - Verify "Cancelar arriendo" button is hidden for leases with contractStatus = 'SIGNED'
  - Verify "Ver contrato archivado" button navigates to `/mis-contratos/{contractId}` with active blue styling when contract is SIGNED
  - Verify income report page at `/mis-ingresos/portafolio/[portfolioId]` shows correct badges and excludes pre-signing leases from income totals
  - Verify cross-view consistency: same unit shows same active/inactive state on both "Mi portafolio" and "Reporte de portafolio"
  - Verify listing is deactivated after contract signing (unit no longer appears in `/explorar`)
  - Verify payment flow works with APPROVED status after running seed
  - Verify UI text is in Spanish and free of raw IDs/UUIDs or untranslated enum values
  - Verify navigation, badges, and indicators work across all relevant pages
  - Document any issues found as new requirements in a "Post-Implementation Findings" section in bugfix.md
  - Add corresponding design notes and implementation tasks for each finding
  - Re-run build and tests after fixes
