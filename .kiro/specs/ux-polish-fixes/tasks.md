# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - UX Polish Bugs Exist on Unfixed Code
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate all seven bugs exist
  - **Scoped PBT Approach**: For each bug, scope the property to the concrete failing case(s)
  - Test 1a: Render ConfirmationDialog with `variant="primary"` → assert confirm button has `bg-[#1d4ed8]` (will FAIL — button always has `bg-red-600`)
  - Test 1b: Render ContactLandlordButton, trigger error → assert error element DOM index < button DOM index (will FAIL — error renders after button)
  - Test 1c: Render ContractWizard with `lease.startDate = "2025-03-01"` → assert startDate input value is `"2025-03-01"` (will FAIL — startDate is `""`)
  - Test 1d: Call `formatPrice(1200000)` → assert output starts with `$` and contains exactly one `$` (will FAIL — formatPrice does not prepend `$`)
  - Test 1e: Call local `formatCOP("$120000")` from ListingManagementView pattern → assert output has exactly one `$` (will FAIL — template literal produces `$$`)
  - Test 1f: Render Pagination → assert select element has `appearance-none` class (will FAIL — select uses `px-2` without `appearance-none`)
  - Test 1g: Execute HandleSigningWebhookUseCase with COMPLETED webhook → assert `IPaymentSchedulingPort.scheduleInitialPayment` is called (will FAIL — port not injected)
  - Test 1h: Assert `documentation/MVP-STUB-TESTING-GUIDE.md` exists (will FAIL — file does not exist)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Existing Behavior Unchanged for Non-Bug Inputs
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: ConfirmationDialog without `variant` prop renders red `bg-red-600` button on unfixed code
  - Observe: ContactLandlordButton success message displays correctly on unfixed code
  - Observe: ContractWizard pre-fills monthlyRent from `lease.monthlyAmount` on unfixed code
  - Observe: `formatCOP("1200000")` (clean digits, no `$`) produces `"$1.200.000"` on unfixed code
  - Observe: Pagination page buttons, prev/next, ellipsis, touch targets, aria attributes render correctly on unfixed code
  - Observe: HandleSigningWebhookUseCase sends notifications and logs audit for COMPLETED webhooks on unfixed code
  - Observe: HandleSigningWebhookUseCase does NOT create scheduled payments for FAILED webhooks on unfixed code
  - Write property-based tests:
    - For all ConfirmationDialog renders without `variant` or with `variant="destructive"`, confirm button has `bg-red-600` class
    - For all clean digit string inputs to formatCOP (no `$` prefix), output matches original behavior (`$` + thousand-separated digits)
    - For all lease objects, monthlyRent is pre-filled as `String(lease.monthlyAmount || '')`
    - For all webhook statuses != COMPLETED, no `scheduleInitialPayment` call is made
    - For all COMPLETED webhooks, notifications are still sent and audit is still logged
    - Pagination navigation buttons maintain min 44px touch targets and correct aria attributes
  - Verify all tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 3. Fix Bug #1 — Red confirm button → variant-aware ConfirmationDialog

  - [x] 3.1 Add `variant` prop to ConfirmationDialog
    - Add `variant?: 'destructive' | 'primary'` to `ConfirmationDialogProps`, defaulting to `'destructive'`
    - Replace hardcoded `bg-red-600` confirm button classes with conditional expression:
      - `variant === 'primary'`: `bg-[#1d4ed8] hover:bg-blue-800 active:bg-blue-900 focus-visible:ring-[#1d4ed8]`
      - `variant === 'destructive'` (default): `bg-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-600`
    - File: `src/frontend/shared/components/ConfirmationDialog.tsx`
    - _Bug_Condition: isBugCondition_ConfirmButton(input) where component='ConfirmationDialog' AND variant='primary' AND confirmButton has 'bg-red-600'_
    - _Expected_Behavior: confirm button uses bg-[#1d4ed8] when variant='primary'_
    - _Preservation: default (no variant or variant='destructive') continues to use bg-red-600_
    - _Requirements: 2.1, 3.1, 3.6_

  - [x] 3.2 Pass `variant="primary"` in ContactLandlordButton
    - Add `variant="primary"` prop to the `<ConfirmationDialog>` usage in ContactLandlordButton
    - File: `src/frontend/modules/tenant/components/ContactLandlordButton.tsx`
    - _Requirements: 2.1_

- [ ] 4. Fix Bug #2 — Buried error message → error above button

  - [x] 4.1 Move error message above button in ContactLandlordButton
    - Reorder JSX so the `message` alert `div` renders BEFORE the `<button>` element
    - Enhance error styling: use `rounded-md border border-red-200 bg-red-50 p-3 text-body text-red-700` for error state
    - Keep success message styling as-is (green variant)
    - File: `src/frontend/modules/tenant/components/ContactLandlordButton.tsx`
    - _Bug_Condition: isBugCondition_BuriedError(input) where error element appears after button in DOM_
    - _Expected_Behavior: error element DOM index < button DOM index_
    - _Preservation: success message continues to display in visible location_
    - _Requirements: 2.2, 3.2_

- [ ] 5. Fix Bug #3 — startDate not pre-filled in ContractWizard

  - [x] 5.1 Pre-fill startDate from lease data
    - Change `startDate: ''` to `startDate: lease.startDate || ''` in the `useState` initializer for `formData`
    - Follow the same pattern as `monthlyRent: String(lease.monthlyAmount || '')`
    - File: `src/frontend/modules/landlord-contracts/components/ContractWizard.tsx`
    - _Bug_Condition: isBugCondition_StartDateEmpty(input) where lease.startDate is not empty AND wizardFormData.startDate = ''_
    - _Expected_Behavior: formData.startDate = lease.startDate_
    - _Preservation: monthlyRent pre-fill unchanged, other fields unchanged_
    - _Requirements: 2.3, 3.3_

- [ ] 6. Fix Bug #4 — Duplicated `$` symbols in currency formatting

  - [x] 6.1 Update `formatPrice` to prepend `$`
    - Change return statement to `return \`$${formatted}\`` so the shared utility includes the `$` symbol
    - File: `src/frontend/shared/utils/formatPrice.ts`
    - _Requirements: 2.4_

  - [x] 6.2 Remove manual `$` prefix from callers of formatPrice
    - Update `PortfolioIncomeCard.tsx`: remove manual `$` prefix where `formatPrice` is called
    - Update `mis-ingresos/page.tsx`: remove `` `$${formatPrice(...)}` `` → use `formatPrice(...)` directly
    - Update `mis-ingresos/portafolio/[portfolioId]/page.tsx`: remove manual `$` prefix
    - _Requirements: 2.4_

  - [x] 6.3 Fix local `formatCOP` in ListingManagementView
    - Ensure the local `formatCOP(amount: number)` returns `$` + formatted digits with no possibility of double `$`
    - Current code: `` return `${formatted}` `` — change to `` return `$${formatted}` `` (it currently omits the `$`)
    - File: `src/frontend/modules/landlord-portfolio/components/ListingManagementView.tsx`
    - _Requirements: 2.4_

  - [x] 6.4 Verify local `formatCOP` in StepTerms and FilterPanel
    - Verify `StepTerms.tsx` local `formatCOP(raw: string)` strips non-digits via `raw.replace(/\D/g, '')` and prepends exactly one `$`
    - Verify `FilterPanel.tsx` local `formatCOP(raw: string)` follows the same pattern
    - Fix if needed — the string-based variants already strip `$` since it's a non-digit character
    - Files: `src/frontend/modules/landlord-contracts/components/StepTerms.tsx`, `src/frontend/modules/property-listings/components/FilterPanel.tsx`
    - _Bug_Condition: isBugCondition_DuplicateDollar(input) where input contains '$' AND formatCOP output starts with '$$'_
    - _Expected_Behavior: output contains exactly one '$' at the start_
    - _Preservation: clean digit inputs continue to produce same output (e.g., "1200000" → "$1.200.000")_
    - _Requirements: 2.4, 3.4_

- [ ] 7. Fix Bug #5 — Pagination chevron clipped

  - [x] 7.1 Replace select styling with appearance-none + custom chevron
    - Change the `<select>` element's className from `px-2 py-1` to use:
      - `appearance-none`
      - `pl-3 pr-8` for adequate chevron space
      - Inline SVG chevron via `bg-[url("data:image/svg+xml;...")]` background
      - `bg-[length:20px_20px] bg-[right_8px_center] bg-no-repeat`
    - Match the pattern established in `FilterPanel.tsx`
    - File: `src/frontend/shared/components/Pagination.tsx`
    - _Bug_Condition: isBugCondition_ClippedChevron(input) where select has 'px-2' AND NOT 'appearance-none'_
    - _Expected_Behavior: select has 'appearance-none' with custom SVG chevron and pr-8_
    - _Preservation: page number buttons, prev/next navigation, touch targets (min 44px), ellipsis, aria attributes unchanged_
    - _Requirements: 2.5, 3.5_

- [ ] 8. Fix Bug #6 — Missing scheduled payment on contract signing

  - [x] 8.1 Create `IPaymentSchedulingPort` interface
    - Define port interface with method: `scheduleInitialPayment(leaseId: string, amount: number, currency: string, dueDate: Date): Promise<void>`
    - Export DI token: `export const PAYMENT_SCHEDULING_PORT = 'PAYMENT_SCHEDULING_PORT'`
    - File (NEW): `src/backend/modules/contracts/domain/ports/payment-scheduling.port.ts`
    - _Requirements: 2.6_

  - [x] 8.2 Create `PaymentSchedulingAdapter` implementation
    - Implement `IPaymentSchedulingPort` as `@Injectable()` class
    - Inject `PrismaService`
    - Create `ScheduledPayment` record: `prisma.scheduledPayment.create({ data: { lease_id, amount, currency, due_date } })`
    - File (NEW): `src/backend/modules/payments/infrastructure/adapters/payment-scheduling.adapter.ts`
    - _Requirements: 2.6_

  - [x] 8.3 Export adapter from PaymentsModule
    - Register `PaymentSchedulingAdapter` as provider in `payments.module.ts`
    - Export `PaymentSchedulingAdapter` so the contracts module can inject it
    - File: `src/backend/modules/payments/payments.module.ts`
    - _Requirements: 2.6_

  - [x] 8.4 Import PaymentsModule in ContractsModule and register port
    - Add `PaymentsModule` to the `imports` array
    - Add `{ provide: PAYMENT_SCHEDULING_PORT, useExisting: PaymentSchedulingAdapter }` to providers
    - File: `src/backend/modules/contracts/contracts.module.ts`
    - _Requirements: 2.6_

  - [x] 8.5 Add `getLeaseMonthlyAmount` to contract repository port
    - Add method signature: `getLeaseMonthlyAmount(leaseId: string): Promise<{ amount: number; currency: string } | null>`
    - File: `src/backend/modules/contracts/domain/ports/contract-repository.port.ts`
    - _Requirements: 2.6_

  - [x] 8.6 Implement `getLeaseMonthlyAmount` in Prisma repository
    - Multi-step query: find Lease by ID → get associated PortfolioUnit → return `{ amount: portfolioUnit.lease_base_amount, currency: portfolioUnit.lease_base_currency ?? 'COP' }`
    - File: `src/backend/modules/contracts/infrastructure/repositories/prisma-contract.repository.ts`
    - _Requirements: 2.6_

  - [x] 8.7 Inject port and call fire-and-forget in HandleSigningWebhookUseCase
    - Add `@Inject(PAYMENT_SCHEDULING_PORT) private readonly paymentSchedulingPort: IPaymentSchedulingPort` to constructor
    - After notifications block (when status is COMPLETED): look up lease amount via `this.repository.getLeaseMonthlyAmount(contract.leaseId)`
    - Call `this.paymentSchedulingPort.scheduleInitialPayment(contract.leaseId, leaseAmount, 'COP', contract.startDate).catch(() => undefined)` — fire-and-forget pattern
    - A failure in payment scheduling SHALL NOT prevent contract status update, notifications, or audit logging
    - File: `src/backend/modules/contracts/application/use-cases/handle-signing-webhook.use-case.ts`
    - _Bug_Condition: isBugCondition_MissingScheduledPayment(input) where webhook status='COMPLETED' AND contract has leaseId AND startDate AND no ScheduledPayment exists_
    - _Expected_Behavior: ScheduledPayment created with lease monthly amount, currency 'COP', due_date = contract.startDate_
    - _Preservation: notifications fire-and-forget unchanged, audit log unchanged, FAILED webhooks unaffected_
    - _Requirements: 2.6, 3.7, 3.8_

- [ ] 9. Fix Bug #7 — MVP stub testing documentation

  - [x] 9.1 Create `documentation/MVP-STUB-TESTING-GUIDE.md`
    - **Overview**: Explain MVP stubs for external integrations and what manual steps are needed
    - **Stubs Reference**: Table of all stubs (ESignatureProviderAdapter, PaymentGatewayAdapter, MessagingChannelAdapter) with behavior and manual intervention requirements
    - **E-Signature Flow**: Step-by-step guide with curl command for `POST /contracts/webhook/signing`
    - **Payment Flow**: Step-by-step guide with curl command for `POST /payments/webhook` — reference that scheduled payments are now auto-created on signing (bug #6 fix)
    - **Full Rental Lifecycle**: End-to-end testing checklist (register → portfolio → lease → listing → contact → contract → signing webhook → payment)
    - **Messaging**: Note that MessagingChannelAdapter logs to console, no manual intervention needed
    - File (NEW): `documentation/MVP-STUB-TESTING-GUIDE.md`
    - _Bug_Condition: isBugCondition_MissingStubTestingDocs where file does not exist_
    - _Expected_Behavior: file exists with accurate endpoint URLs, valid JSON payloads matching DTO schemas, correct state transitions_
    - _Preservation: existing documentation files unchanged — this is purely additive_
    - _Requirements: 2.7, 3.9_

- [ ] 10. Verify fixes pass exploration and preservation tests

  - [x] 10.1 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - All Seven Bugs Are Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied for all seven bugs
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms all bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 10.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Behavior Still Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fixes (no regressions introduced)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 11. Checkpoint — Ensure all tests pass
  - Run full test suite (frontend + backend)
  - Ensure all exploration tests (task 1) pass on fixed code
  - Ensure all preservation tests (task 2) pass on fixed code
  - Ensure no other existing tests are broken
  - Check TSC, linting and formatting, solve all issues
  - Ask the user if questions arise

- [ ] 12. Fix Bug #8 — startDate ISO format not compatible with date input

  - [x] 12.1 Convert ISO startDate to YYYY-MM-DD format in ContractWizard
    - The lease API returns `startDate` as ISO string (e.g., `"2026-05-03T00:00:00.000Z"`)
    - HTML `<input type="date">` requires `YYYY-MM-DD` format (e.g., `"2026-05-03"`)
    - Change `startDate: lease.startDate || ''` to `startDate: lease.startDate ? lease.startDate.split('T')[0] : ''`
    - File: `src/frontend/modules/landlord-contracts/components/ContractWizard.tsx`
    - _Bug_Condition: lease.startDate is ISO format AND date input shows empty_
    - _Expected_Behavior: date input displays the date correctly in YYYY-MM-DD format_
    - _Preservation: monthlyRent pre-fill unchanged, other fields unchanged_
    - _Requirements: 2.8, 3.3_

- [ ] 13. Fix Bug #9 — Area not displayed in listing detail

  - [x] 13.1 Add `area` field to ListingDetailResponseDto
    - Add `@ApiPropertyOptional({ nullable: true }) area!: number | null;` to the DTO
    - File: `src/backend/modules/property-listings/application/dtos/listing-detail-response.dto.ts`
    - _Requirements: 2.9_

  - [x] 13.2 Fetch area from Property in listing repository
    - In `findDetailById`, add `area` to the `property` select/include
    - Return `area: property.area ?? null` in the listing detail result
    - File: `src/backend/modules/property-listings/infrastructure/repositories/prisma-listing.repository.ts`
    - _Requirements: 2.9_

  - [x] 13.3 Add `area` to frontend ListingDetail type
    - Add `area: number | null` to the `ListingDetail` type definition
    - File: `src/frontend/modules/property-listings/types.ts` (or wherever the type is defined)
    - _Requirements: 2.9_

  - [x] 13.4 Pass area to PropertyInfoGrid in ListingDetailView
    - Change `area={null}` to `area={listing.area}` in ListingDetailView
    - File: `src/frontend/modules/property-listings/components/ListingDetailView.tsx`
    - _Preservation: rooms and bathrooms display unchanged_
    - _Requirements: 2.9, 3.10_

- [ ] 14. Fix Bug #10 — Contact landlord fails because listingId passed instead of leaseId

  - [x] 14.1 Add endpoint to resolve listing ID to lease ID
    - Create a new endpoint or modify the existing `transitionLeaseState` to accept a `listingId` parameter
    - The resolution path: listing → portfolio_unit_id → lease (where portfolio_unit_id matches and lease is active)
    - Add method to rental-tracking repository: `findLeaseIdByListingId(listingId: string): Promise<string | null>`
    - File: `src/backend/modules/rental-tracking/infrastructure/repositories/prisma-tracking.repository.ts`
    - _Requirements: 2.10_

  - [x] 14.2 Update TransitionLeaseStateDto to accept listingId
    - Add optional `listingId?: string` field to the DTO (alternative to `leaseId`)
    - In the use case, if `listingId` is provided instead of `leaseId`, resolve it first
    - Files: `src/backend/modules/rental-tracking/application/dtos/transition-lease-state.dto.ts`, `src/backend/modules/rental-tracking/application/use-cases/transition-lease-state.use-case.ts`
    - _Requirements: 2.10_

  - [x] 14.3 Update frontend to pass listingId correctly
    - Ensure `tenantService.transitionLeaseState` passes `listingId` in the correct field
    - File: `src/frontend/shared/services/tenant.ts`
    - _Preservation: existing lease state transitions with leaseId still work_
    - _Requirements: 2.10, 3.11_

- [x] 15. Final verification — Run tests for bugs 8-10
  - Run frontend tests to verify startDate pre-fill works
  - Run backend tests to verify area is returned and lease resolution works
  - Verify no regressions in existing tests

- [ ] 16. Fix Bug #11 — Notify landlord with tenant contact info on CONTACT_INITIATED

  - [x] 16.1 Add CONTACT_INITIATED to NOTIFY_ON_STATES in TransitionLeaseStateUseCase
    - Add `'CONTACT_INITIATED'` to the `NOTIFY_ON_STATES` set so the notification port is called
    - File: `src/backend/modules/rental-tracking/application/use-cases/transition-lease-state.use-case.ts`
    - _Requirements: 2.11_

  - [x] 16.2 Enhance notification to include tenant contact info for CONTACT_INITIATED
    - When state is CONTACT_INITIATED, resolve tenant's name, email, phone (via cross-schema lookup) and include in the notification payload
    - The landlord should receive the tenant's contact info so they can follow up
    - Update the notification port interface if needed to support additional metadata
    - Files: `src/backend/modules/rental-tracking/domain/ports/notification.port.ts`, `src/backend/modules/rental-tracking/application/use-cases/transition-lease-state.use-case.ts`
    - _Requirements: 2.11_

  - [x] 16.3 Wire real TrackingNotificationAdapter replacing the no-op stub
    - The rental-tracking module's notification port was a stub (`useValue: { notifyLeaseStateChanged: async () => {} }`) that never sent notifications
    - Create `TrackingNotificationAdapter` implementing `ITrackingNotificationPort` using `SendNotificationUseCase`
    - Use `NEW_INTEREST` notification type (already seeded in DB) for `CONTACT_INITIATED` state
    - Include tenant contact info (name, email, phone) and property title in notification data
    - Resolve property title from lease via cross-schema lookup (Lease → PortfolioUnit → Listing.title)
    - Import `NotificationsModule` in `RentalTrackingModule` and register adapter with `useClass`
    - File (NEW): `src/backend/modules/rental-tracking/infrastructure/adapters/tracking-notification.adapter.ts`
    - File: `src/backend/modules/rental-tracking/rental-tracking.module.ts`
    - _Requirements: 2.11, 2.14, 3.12_

- [ ] 19. Fix Bug #15 — Tenant contact info not visible in NEW_INTEREST notification

  - [ ] 19.1 Update `buildNotificationContent` to include tenant name in NEW_INTEREST message
    - Change the `NEW_INTEREST` case to include tenant name when available in data:
      - If `data.tenantName` AND `data.propertyTitle`: `"**{tenantName}** ha mostrado interés en tu inmueble **{propertyTitle}**."`
      - If only `data.tenantName`: `"**{tenantName}** ha mostrado interés en uno de tus inmuebles."`
      - Fallback (no tenantName): keep current generic message
    - File: `src/backend/modules/notifications/application/use-cases/send-notification.use-case.ts`
    - _Requirements: 2.15_

  - [ ] 19.2 Render tenant contact info in NotificationsListView for NEW_INTEREST
    - When `notification.notificationType === 'NEW_INTEREST'` and `notification.data` contains `tenantEmail` or `tenantPhone`, render a contact info section below the message
    - Display tenant email as a `mailto:` link with an envelope icon
    - Display tenant phone as a `tel:` link with a phone icon
    - Use `text-caption text-neutral-600` styling, compact layout
    - Only render for `NEW_INTEREST` type — other notification types unchanged
    - File: `src/frontend/modules/notifications/components/NotificationsListView.tsx`
    - _Preservation: other notification types continue to render title + message only_
    - _Requirements: 2.15, 3.13_

- [ ] 17. Fix Bug #12 — Contact button and message too wide on desktop

  - [x] 17.1 Constrain ContactLandlordButton width on desktop
    - The button and message currently stretch full-width on desktop
    - Add `max-w-[560px] mx-auto` to the container div to match the listing detail content area
    - File: `src/frontend/modules/tenant/components/ContactLandlordButton.tsx`
    - _Requirements: 2.12_

- [ ] 18. Fix Bug #13 — "undefined m²" displayed when area is null/undefined

  - [x] 18.1 Fix PropertyInfoGrid area null check
    - Change `area !== null` to `area != null` (loose equality) to handle both `null` and `undefined`
    - File: `src/frontend/modules/property-listings/components/PropertyInfoGrid.tsx`
    - _Requirements: 2.13_
