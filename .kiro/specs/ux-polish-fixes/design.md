# UX Polish Fixes — Bugfix Design

## Overview

This design addresses seven UI/UX polish bugs that collectively undermine user trust and usability across the rental platform. The bugs span multiple components and modules: (1) a red confirm button on a non-destructive action, (2) a buried error message, (3) a missing form pre-fill, (4) duplicated `$` symbols in currency formatting, (5) a clipped pagination chevron, and (6) missing scheduled payment creation when a contract is signed. Each fix is scoped to be minimal and targeted, with explicit preservation requirements to prevent regressions in existing functionality.

## Glossary

- **Bug_Condition (C)**: The set of conditions under which any of the seven UI/UX defects manifest — each sub-bug has its own condition function
- **Property (P)**: The desired correct behavior for each bug condition — variant-aware button styling, prominent error placement, pre-filled dates, single `$` symbol, properly spaced chevron, and automatic scheduled payment creation on contract signing
- **Preservation**: Existing behaviors that must remain unchanged — destructive dialog styling, success messages, monthlyRent pre-fill, clean-input formatting, pagination button layout, existing notification/audit flows, ETL-based payment creation, and existing documentation files
- **ConfirmationDialog**: Shared dialog component at `src/frontend/shared/components/ConfirmationDialog.tsx` used for confirming both destructive and non-destructive actions
- **ContactLandlordButton**: Tenant-facing component at `src/frontend/modules/tenant/components/ContactLandlordButton.tsx` that initiates landlord contact
- **ContractWizard**: Landlord-facing multi-step form at `src/frontend/modules/landlord-contracts/components/ContractWizard.tsx` for creating contracts
- **formatCOP**: Local helper functions duplicated across multiple files that format raw numeric strings as COP currency display (e.g., `"120000"` → `"$120.000"`)
- **formatPrice**: Shared utility at `src/frontend/shared/utils/formatPrice.ts` that formats a number with locale separators but does NOT prepend `$`
- **Pagination**: Shared component at `src/frontend/shared/components/Pagination.tsx` with page navigation and page-size selector
- **HandleSigningWebhookUseCase**: Backend use case at `src/backend/modules/contracts/application/use-cases/handle-signing-webhook.use-case.ts` that processes signing provider webhooks and updates contract status
- **IPaymentSchedulingPort**: Port interface to be defined in the contracts module's `domain/ports/` directory for cross-module communication with the payments module to create scheduled payments
- **PaymentSchedulingAdapter**: Implementation of `IPaymentSchedulingPort` in the payments module that creates `ScheduledPayment` records directly via Prisma
- **ScheduledPayment**: Payments-schema model representing a future payment obligation for a lease, with `lease_id`, `amount`, `currency`, and `due_date`
- **MVP-STUB-TESTING-GUIDE.md**: New documentation file at `documentation/MVP-STUB-TESTING-GUIDE.md` that explains how to test flows depending on external service stubs, including manual webhook calls with curl commands

## Bug Details

### Bug Condition

The five bugs manifest under distinct conditions across different components. Together they represent a class of UI polish issues where visual presentation diverges from user expectations.

**Formal Specification:**

```
FUNCTION isBugCondition_ConfirmButton(input)
  INPUT: input of type { component: string, variant?: string }
  OUTPUT: boolean

  RETURN input.component = 'ConfirmationDialog'
         AND (input.variant IS UNDEFINED OR input.variant = 'primary')
         AND confirmButtonHasClass('bg-red-600')
END FUNCTION

FUNCTION isBugCondition_BuriedError(input)
  INPUT: input of type { component: string, messageType: string }
  OUTPUT: boolean

  RETURN input.component = 'ContactLandlordButton'
         AND input.messageType = 'error'
         AND errorElementAppearsAfterButton()
END FUNCTION

FUNCTION isBugCondition_StartDateEmpty(input)
  INPUT: input of type { lease: LeaseDetail }
  OUTPUT: boolean

  RETURN input.lease.startDate IS NOT EMPTY
         AND wizardFormData.startDate = ''
END FUNCTION

FUNCTION isBugCondition_DuplicateDollar(input)
  INPUT: input of type { rawValue: string }
  OUTPUT: boolean

  RETURN input.rawValue CONTAINS '$'
         AND formatCOP(input.rawValue) STARTS WITH '$$'
END FUNCTION

FUNCTION isBugCondition_ClippedChevron(input)
  INPUT: input of type { component: string }
  OUTPUT: boolean

  RETURN input.component = 'Pagination'
         AND selectElement.hasClass('px-2')
         AND NOT selectElement.hasClass('appearance-none')
END FUNCTION

FUNCTION isBugCondition_MissingScheduledPayment(input)
  INPUT: input of type { webhookDto: SigningWebhookDto, contract: ContractEntity }
  OUTPUT: boolean

  RETURN input.webhookDto.status = 'COMPLETED'
         AND input.contract.leaseId IS NOT EMPTY
         AND input.contract.startDate IS NOT NULL
         AND NOT existsScheduledPayment(input.contract.leaseId, input.contract.startDate)
END FUNCTION

FUNCTION isBugCondition_MissingStubTestingDocs(input)
  INPUT: input of type { documentationDir: string }
  OUTPUT: boolean

  RETURN NOT fileExists('documentation/MVP-STUB-TESTING-GUIDE.md')
END FUNCTION
```

### Examples

- **Red confirm button**: Tenant clicks "Contactar arrendador" → ConfirmationDialog shows a red "Confirmar" button (`bg-red-600`), implying a destructive/dangerous action. Expected: blue primary button (`bg-[#1d4ed8]`) since contacting a landlord is non-destructive.
- **Buried error**: Contact fails with "No se encontró un arriendo asociado a este inmueble" → error renders below the button at page bottom with only `mt-3` spacing. User may not see it without scrolling. Expected: error appears above the button in a prominent alert.
- **Empty startDate**: Landlord opens contract wizard step 2 for a lease with `startDate: "2025-03-01"` → the date field is empty while monthlyRent is correctly pre-filled from `lease.monthlyAmount`. Expected: startDate pre-filled as `"2025-03-01"`.
- **Double `$`**: `formatCOP("$120000")` returns `"$$120.000"` because the function prepends `$` without checking if the input already has one. Also, JSX templates like `${formatPrice(amount)}` in `PortfolioIncomeCard.tsx` produce `$1.200.000` in JSX text (the `$` is a literal character in JSX, not a template literal), but callers like `mis-ingresos/page.tsx` use `` `$${formatPrice(totalMonthlyIncome)}` `` which correctly prepends `$` — the inconsistency across callers creates confusion and potential double-`$` when `formatPrice` is changed to include `$`.
- **Clipped chevron**: Pagination `<select>` uses `px-2` (8px each side) which leaves insufficient room for the native browser dropdown chevron, making it appear cramped against the right border.
- **Missing scheduled payment**: Signing webhook confirms contract as SIGNED → `HandleSigningWebhookUseCase` updates status, sends notifications, logs audit entry, but creates no `ScheduledPayment` record → tenant sees "No tienes pagos registrados" in `/mis-pagos`. Expected: a `ScheduledPayment` is created with the lease's monthly amount, currency COP, and due date set to the contract's `start_date`.
- **Missing stub testing documentation**: A developer or tester wants to test the full rental lifecycle (listing → contact → contract → signing → payment) but no documentation exists explaining that manual webhook calls are required to advance past the e-signature and payment gateway stubs. They must inspect source code (`ESignatureProviderAdapter`, `PaymentGatewayAdapter`, `contracts.controller.ts`, `payments.controller.ts`) to discover the webhook endpoints and required payloads. Expected: a `documentation/MVP-STUB-TESTING-GUIDE.md` file exists with step-by-step instructions and curl commands.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All existing ConfirmationDialog usages for destructive actions (delete portfolio, delete unit, unpublish listing, delete contract, cancel lease, remove role) must continue to display the red `bg-red-600` confirm button
- The success message in ContactLandlordButton ("El contacto ha sido iniciado. El arrendador será notificado.") must continue to display in a visible location
- The monthlyRent field in ContractWizard must continue to be pre-filled from `lease.monthlyAmount`
- All `formatCOP` functions receiving clean digit strings (e.g., `"1200000"`) must continue to produce `"$1.200.000"`
- Pagination page number buttons, previous/next navigation, touch targets (min 44px), and accessibility attributes must remain unchanged
- The ConfirmationDialog's focus trap, Escape key handling, loading spinner, and `role="alertdialog"` behavior must remain unchanged
- The existing notification flow in `HandleSigningWebhookUseCase` (fire-and-forget `notifyContractSigned` to landlord and tenant) must continue to work exactly as before
- The audit log entry with action `CONTRACT_SIGNED` must continue to be recorded as before
- The `PaymentsEtlService.processPaymentsRaw()` cron job must continue to process `PaymentsRaw` records and create `ScheduledPayment` records via the ETL pipeline without interference from the new on-signing creation path
- The existing `src/backend/README.md` and all files in the `documentation/` directory must remain unchanged — the new `documentation/MVP-STUB-TESTING-GUIDE.md` is purely additive

**Scope:**
All inputs that do NOT match the seven bug conditions should be completely unaffected by these fixes. This includes:
- Destructive confirmation dialogs (no `variant` prop or `variant="destructive"`)
- Success messages in ContactLandlordButton
- Other form fields in ContractWizard (firstName, lastName, email, etc.)
- Currency formatting of clean numeric inputs without `$` prefix
- Pagination page buttons, ellipsis, and prev/next controls
- Signing webhooks with `status` other than `"COMPLETED"` (e.g., `"FAILED"`)
- Contracts that are already SIGNED (idempotency — no duplicate scheduled payments)
- `ScheduledPayment` records created via the ETL pipeline from `PaymentsRaw`
- Existing documentation files (`src/backend/README.md`, `documentation/DOCUMENTO DE ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE.md`, `documentation/Diseño Arquitectónico y Funcional.md`)

## Hypothesized Root Cause

Based on the bug descriptions and code analysis, the root causes are:

1. **ConfirmationDialog — Missing variant prop**: The component was designed only for destructive actions. The confirm button hardcodes `bg-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-600`. There is no mechanism to switch to primary styling. ContactLandlordButton reuses the dialog for a non-destructive action without any way to change the button color.

2. **ContactLandlordButton — Error placement after button**: The component renders the message `div` (both success and error) after the `<button>` element in the JSX tree. Since the button is a full-width CTA at the bottom of the listing detail page, the error message appears below the fold. The `mt-3` spacing is insufficient visual prominence.

3. **ContractWizard — Missing startDate initialization**: The `useState` initializer for `formData` sets `startDate: ''` while `monthlyRent` uses `String(lease.monthlyAmount || '')`. The `lease` object (type `LeaseDetail`) has a `startDate: string` field, but it was simply not wired into the initial state. This appears to be an oversight during implementation.

4. **formatCOP — No input sanitization**: The local `formatCOP(raw: string)` functions in `StepTerms.tsx`, `FilterPanel.tsx`, and others strip non-digit characters via `raw.replace(/\D/g, '')` — this already handles `$` in the input. However, the `formatCOP(amount: number)` variant in `ListingManagementView.tsx` prepends `$` via template literal `` `$${formatted}` ``, and the shared `formatPrice` does NOT prepend `$`. The inconsistency means some callers add `$` in JSX (e.g., `${formatPrice(amount)}` in JSX text) while others rely on the function. The `PortfolioIncomeCard` renders `${formatPrice(...)}` as JSX text where `$` is a literal character — this works correctly. But `mis-ingresos/page.tsx` uses `` `$${formatPrice(totalMonthlyIncome)}` `` as a string prop. The core issue is that `formatPrice` doesn't include `$`, so callers must add it manually, creating inconsistency. The fix should make `formatPrice` always return a `$`-prefixed string and strip any existing `$` from inputs in `formatCOP` variants.

5. **Pagination — Insufficient select padding**: The `<select>` element uses `px-2` (8px horizontal padding) which doesn't account for the native browser dropdown chevron indicator. The chevron overlaps with or gets clipped by the element boundary. The `FilterPanel` already solves this with `appearance-none` + custom SVG chevron + `pr-10`, but the Pagination component was not updated to follow the same pattern.

6. **HandleSigningWebhookUseCase — No payment scheduling on contract signing**: The `HandleSigningWebhookUseCase` only updates contract status to SIGNED, sends notifications (fire-and-forget), and logs an audit entry. It does NOT trigger creation of `ScheduledPayment` records. The only existing path to create `ScheduledPayment` records is via the `PaymentsEtlService` cron job processing `PaymentsRaw` records — but nothing writes to `PaymentsRaw` when a contract is signed. The result is that after signing, the tenant sees "No tienes pagos registrados" in `/mis-pagos` because no scheduled payment exists for the lease. Per project cross-module communication conventions, the contracts module cannot directly write to the payments schema — it must use a port interface injected via NestJS DI, with the implementation living in the payments module.

7. **Missing MVP Stub Testing Documentation**: No documentation exists explaining how to test flows that depend on external service stubs. The `ESignatureProviderAdapter` returns a mock signing ID with status "INITIATED" but the developer must manually call `POST /contracts/webhook/signing` to advance the contract to SIGNED. Similarly, the `PaymentGatewayAdapter` returns APPROVED with a mock redirect URL but the developer may need to call `POST /payments/webhook` to confirm payment processing. The `MessagingChannelAdapter` just logs to console and needs no manual intervention. Without a testing guide, developers must read adapter source code, controller routes, and DTO definitions to piece together the correct webhook payloads — a significant onboarding friction and source of testing errors.

## Correctness Properties

Property 1: Bug Condition — ConfirmationDialog Variant Styling

_For any_ ConfirmationDialog rendered with `variant="primary"`, the confirm button SHALL use the primary blue style (`bg-[#1d4ed8]`, `hover:bg-blue-800`, `focus-visible:ring-[#1d4ed8]`) instead of the red destructive style.

**Validates: Requirements 2.1**

Property 2: Preservation — ConfirmationDialog Default Destructive Styling

_For any_ ConfirmationDialog rendered without a `variant` prop or with `variant="destructive"`, the confirm button SHALL continue to use the red destructive style (`bg-red-600`, `hover:bg-red-700`, `focus-visible:ring-red-600`), preserving backward compatibility with all existing usages.

**Validates: Requirements 3.1, 3.6**

Property 3: Bug Condition — Error Message Placement Above Button

_For any_ error state in ContactLandlordButton, the error alert element SHALL appear above the contact button in the DOM order, ensuring immediate visibility without scrolling.

**Validates: Requirements 2.2**

Property 4: Preservation — Success Message Visibility

_For any_ successful contact initiation in ContactLandlordButton, the success message SHALL continue to be displayed in a visible, prominent location.

**Validates: Requirements 3.2**

Property 5: Bug Condition — StartDate Pre-filled from Lease

_For any_ lease object with a non-empty `startDate` value passed to ContractWizard, the wizard's form data SHALL initialize `startDate` with the lease's `startDate` value.

**Validates: Requirements 2.3**

Property 6: Preservation — MonthlyRent Pre-fill Unchanged

_For any_ lease object with a `monthlyAmount` value passed to ContractWizard, the wizard's form data SHALL continue to initialize `monthlyRent` with `String(lease.monthlyAmount || '')`, preserving existing pre-fill behavior.

**Validates: Requirements 3.3**

Property 7: Bug Condition — Single Dollar Sign in Currency Output

_For any_ input to `formatCOP` (whether it contains an existing `$` prefix or not), the output SHALL contain exactly one `$` symbol at the start of the formatted string.

**Validates: Requirements 2.4**

Property 8: Preservation — Clean Digit Input Formatting Unchanged

_For any_ raw digit string input (e.g., `"1200000"`) that does NOT already contain a `$` symbol, `formatCOP` SHALL continue to produce the same output as before (e.g., `"$1.200.000"`).

**Validates: Requirements 3.4**

Property 9: Bug Condition — Pagination Select Chevron Spacing

_For any_ rendering of the Pagination component, the page-size `<select>` element SHALL use `appearance-none` with a custom SVG chevron background and adequate right padding (`pr-8` or equivalent) so the chevron is not visually clipped.

**Validates: Requirements 2.5**

Property 10: Preservation — Pagination Navigation Unchanged

_For any_ rendering of the Pagination component, the page number buttons, previous/next navigation, touch targets (min 44px), ellipsis rendering, and accessibility attributes (`aria-label`, `aria-current`) SHALL remain unchanged.

**Validates: Requirements 3.5**

Property 11: Bug Condition — Scheduled Payment Created on Contract Signing

_For any_ signing webhook with `status: "COMPLETED"` where the contract has a valid `leaseId` and `startDate`, the fixed `HandleSigningWebhookUseCase` SHALL trigger creation of a `ScheduledPayment` record with the lease's monthly amount, currency "COP", and due date set to the contract's `start_date`, using a cross-module port interface (`IPaymentSchedulingPort`) rather than directly writing to the payments schema.

**Validates: Requirements 2.6**

Property 12: Preservation — Existing Notification and Audit Flows Unchanged

_For any_ signing webhook processed by `HandleSigningWebhookUseCase`, the existing notification flow (fire-and-forget `notifyContractSigned` to landlord and tenant) and audit logging (`CONTRACT_SIGNED` action) SHALL continue to execute exactly as before. A failure in scheduled payment creation SHALL NOT prevent the contract from being marked as SIGNED, notifications from being sent, or the audit entry from being logged.

**Validates: Requirements 3.7, 3.8**

Property 13: Bug Condition — MVP Stub Testing Documentation Exists

_For any_ developer or tester following the MVP Stub Testing Guide (`documentation/MVP-STUB-TESTING-GUIDE.md`), they SHALL be able to complete the full rental lifecycle (listing → contact → contract → signing → payment) without needing to inspect source code to understand what manual steps are required. The guide SHALL document all MVP stubs (e-signature, payment gateway, messaging), their behavior, exact curl commands with example payloads for each webhook endpoint (`POST /contracts/webhook/signing` and `POST /payments/webhook`), and the end-to-end testing flow.

**Validates: Requirements 2.7, 3.9**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/frontend/shared/components/ConfirmationDialog.tsx`

**Changes**:
1. **Add `variant` prop**: Add `variant?: 'destructive' | 'primary'` to `ConfirmationDialogProps`, defaulting to `'destructive'`
2. **Conditional button styling**: Replace the hardcoded `bg-red-600` classes on the confirm button with a conditional expression:
   - `variant === 'primary'`: `bg-[#1d4ed8] hover:bg-blue-800 active:bg-blue-900 focus-visible:ring-[#1d4ed8]`
   - `variant === 'destructive'` (default): `bg-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-600`

---

**File**: `src/frontend/modules/tenant/components/ContactLandlordButton.tsx`

**Changes**:
1. **Pass `variant="primary"`** to the `ConfirmationDialog` usage
2. **Move message rendering above the button**: Reorder the JSX so the `message` alert `div` renders before the `<button>` element
3. **Enhance error styling**: Use a more prominent alert style (e.g., `rounded-md border border-red-200 bg-red-50 p-3 text-body text-red-700`) consistent with the error alert pattern used in `ContractWizard`

---

**File**: `src/frontend/modules/landlord-contracts/components/ContractWizard.tsx`

**Changes**:
1. **Pre-fill startDate**: Change `startDate: ''` to `startDate: lease.startDate || ''` in the `useState` initializer, following the same pattern as `monthlyRent: String(lease.monthlyAmount || '')`

---

**File**: `src/frontend/modules/landlord-contracts/components/StepTerms.tsx`

**Changes**:
1. **Sanitize formatCOP input**: In the local `formatCOP` function, strip `$` from the input before processing: change `raw.replace(/\D/g, '')` — this already strips `$` since `$` is a non-digit character, so the local string-based `formatCOP` functions are already safe. The issue is in the number-based variant.

---

**File**: `src/frontend/shared/utils/formatPrice.ts`

**Changes**:
1. **Prepend `$` in formatPrice**: Change the return statement to `return \`$${formatted}\`` so the shared utility consistently includes the `$` symbol
2. **Update callers that manually prepend `$`**: Remove the manual `$` prefix from callers in `PortfolioIncomeCard.tsx`, `mis-ingresos/page.tsx`, and `mis-ingresos/portafolio/[portfolioId]/page.tsx` to prevent double `$`

---

**File**: `src/frontend/modules/landlord-portfolio/components/ListingManagementView.tsx`

**Changes**:
1. **Sanitize formatCOP input**: Add `$` stripping to the local `formatCOP(amount: number)` function — since this variant takes a number, the `$` duplication comes from the template literal. Ensure the return is `\`$${formatted}\`` with no possibility of double `$`.

---

**File**: `src/frontend/modules/property-listings/components/FilterPanel.tsx`

**Changes**:
1. **Sanitize formatCOP input**: The local `formatCOP(raw: string)` already strips non-digits via `raw.replace(/\D/g, '')` which removes `$`. Verify the return includes exactly one `$`. No change needed if already correct.

---

**File**: `src/frontend/shared/components/Pagination.tsx`

**Changes**:
1. **Replace select styling**: Change the `<select>` element's className from `px-2 py-1` to use `appearance-none` with a custom SVG chevron background, matching the pattern established in `FilterPanel.tsx`:
   - Add `appearance-none`
   - Change padding to `pl-3 pr-8` (or `px-3 pr-8`) for adequate chevron space
   - Add inline SVG chevron via `bg-[url("data:image/svg+xml;...")]` background
   - Add `bg-[length:20px_20px] bg-[right_8px_center] bg-no-repeat`

---

**File**: `src/backend/modules/contracts/domain/ports/payment-scheduling.port.ts` (NEW)

**Changes**:
1. **Define port interface**: Create `IPaymentSchedulingPort` with method `scheduleInitialPayment(leaseId: string, amount: number, currency: string, dueDate: Date): Promise<void>`
2. **Export DI token**: `export const PAYMENT_SCHEDULING_PORT = 'PAYMENT_SCHEDULING_PORT'`

---

**File**: `src/backend/modules/payments/infrastructure/adapters/payment-scheduling.adapter.ts` (NEW)

**Changes**:
1. **Implement `IPaymentSchedulingPort`**: Create `PaymentSchedulingAdapter` class decorated with `@Injectable()`
2. **Inject `PrismaService`**: Use Prisma to create a `ScheduledPayment` record directly (not via ETL/raw table, since this is a synchronous in-process call within the monolith)
3. **Create record**: `prisma.scheduledPayment.create({ data: { lease_id: leaseId, amount, currency, due_date: dueDate } })`

---

**File**: `src/backend/modules/payments/payments.module.ts`

**Changes**:
1. **Register adapter as provider**: Add `PaymentSchedulingAdapter` to providers
2. **Export adapter**: Add `PaymentSchedulingAdapter` and `PAYMENT_SCHEDULING_PORT` to exports so the contracts module can inject it

---

**File**: `src/backend/modules/contracts/contracts.module.ts`

**Changes**:
1. **Import `PaymentsModule`**: Add to the `imports` array
2. **Register port provider**: Add `{ provide: PAYMENT_SCHEDULING_PORT, useExisting: PaymentSchedulingAdapter }` to providers (or use `useClass` if importing the adapter directly)

---

**File**: `src/backend/modules/contracts/application/use-cases/handle-signing-webhook.use-case.ts`

**Changes**:
1. **Inject `IPaymentSchedulingPort`**: Add `@Inject(PAYMENT_SCHEDULING_PORT) private readonly paymentSchedulingPort: IPaymentSchedulingPort` to the constructor
2. **Look up lease amount**: After updating contract status to SIGNED, retrieve the lease's monthly amount via the contract repository (add a new method `getLeaseMonthlyAmount(leaseId: string): Promise<{ amount: number; currency: string } | null>` to `IContractRepository`)
3. **Call port (fire-and-forget)**: After notifications, call `this.paymentSchedulingPort.scheduleInitialPayment(contract.leaseId, leaseAmount, 'COP', contract.startDate).catch(() => undefined)` — following the same fire-and-forget pattern as notifications so a failure does not prevent the contract from being marked as SIGNED

---

**File**: `src/backend/modules/contracts/domain/ports/contract-repository.port.ts`

**Changes**:
1. **Add method**: `getLeaseMonthlyAmount(leaseId: string): Promise<{ amount: number; currency: string } | null>` — performs cross-schema lookup: `Lease → PortfolioUnit → lease_base_amount, lease_base_currency`

---

**File**: `src/backend/modules/contracts/infrastructure/repositories/prisma-contract.repository.ts`

**Changes**:
1. **Implement `getLeaseMonthlyAmount`**: Multi-step query: find Lease by ID → get associated PortfolioUnit → return `{ amount: portfolioUnit.lease_base_amount, currency: portfolioUnit.lease_base_currency ?? 'COP' }`

---

**File**: `documentation/MVP-STUB-TESTING-GUIDE.md` (NEW)

**Changes**:
1. **Create comprehensive testing guide** for MVP stub workarounds with the following sections:
   - **Overview**: Explains that the MVP uses stubs for external integrations (e-signature, payment gateway, messaging) and what that means for testing — stubs return mock responses immediately but some flows require manual webhook calls to advance state
   - **Stubs Reference**: Table of all stubs with columns: Stub Name, Adapter File, Behavior, Manual Intervention Required
     - `ESignatureProviderAdapter` → returns mock signing ID, status "INITIATED" → Yes (webhook needed)
     - `PaymentGatewayAdapter` → returns APPROVED with mock redirect URL → Yes (webhook needed for confirmation)
     - `MessagingChannelAdapter` → logs to console → No
   - **E-Signature Flow**: Step-by-step guide:
     1. Create contract as landlord (via UI or `POST /contracts` with PDF upload)
     2. Initiate signing: click "Iniciar firma" in contract detail or call `POST /contracts/:id/sign`
     3. Contract moves to `SIGNATURE_PENDING`
     4. Manual step: call signing webhook with curl:
        ```bash
        curl -X POST http://localhost:3001/contracts/webhook/signing \
          -H "Content-Type: application/json" \
          -d '{"contractId": "<CONTRACT_ID>", "status": "COMPLETED", "externalSigningId": "mock-signing-id", "completedAt": "2026-05-04T12:00:00.000Z"}'
        ```
     5. Contract moves to `SIGNED`, notifications sent, audit logged, scheduled payment created
   - **Payment Flow**: Step-by-step guide:
     1. After contract is signed, scheduled payments are created automatically (bug #6 fix)
     2. Tenant navigates to `/mis-pagos` and clicks "Pagar"
     3. Payment gateway stub auto-approves and returns mock redirect URL
     4. Manual step (if needed for webhook confirmation): call payment webhook with curl:
        ```bash
        curl -X POST http://localhost:3001/payments/webhook \
          -H "Content-Type: application/json" \
          -d '{"scheduledPaymentId": "<SCHEDULED_PAYMENT_ID>", "status": "APPROVED", "amount": 1200000, "currency": "COP", "externalTransactionId": "mock-txn-123"}'
        ```
     5. Payment status updates, notification sent to landlord
   - **Full Rental Lifecycle**: End-to-end testing checklist:
     1. Register landlord and tenant accounts
     2. Landlord creates portfolio and unit
     3. Landlord creates lease for unit
     4. Landlord publishes listing
     5. Tenant searches and finds listing in `/explorar`
     6. Tenant clicks "Contactar arrendador"
     7. Landlord uploads contract PDF
     8. Landlord initiates signing → manual webhook call → contract SIGNED
     9. Scheduled payment created automatically
     10. Tenant pays → manual webhook call (if needed) → payment confirmed
   - **Messaging**: Note that the messaging stub (`MessagingChannelAdapter`) just logs notifications to the NestJS console — no manual intervention needed, notifications can be verified by checking server logs

**No new Property-Based Tests needed** — this is a documentation-only task. Correctness is validated by manual review: the guide must contain accurate endpoint URLs, valid JSON payloads matching the DTO schemas (`SigningWebhookDto`, `PaymentWebhookDto`), and correct state transition descriptions.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that render each affected component and assert the buggy behavior exists. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Red Button Test**: Render ConfirmationDialog and assert the confirm button has `bg-red-600` class regardless of context (will confirm bug exists on unfixed code)
2. **Buried Error Test**: Render ContactLandlordButton, trigger an error, and assert the error element appears after the button in DOM order (will confirm bug exists on unfixed code)
3. **Empty StartDate Test**: Render ContractWizard with a lease that has `startDate: "2025-03-01"` and assert the startDate input value is empty (will confirm bug exists on unfixed code)
4. **Double Dollar Test**: Call `formatCOP("$120000")` and assert the output starts with `$$` (will confirm bug exists on unfixed code for string-based variants)
5. **Clipped Chevron Test**: Render Pagination and assert the select element has `px-2` and does NOT have `appearance-none` (will confirm bug exists on unfixed code)
6. **Missing Scheduled Payment Test**: Execute `HandleSigningWebhookUseCase` with a COMPLETED webhook for a valid contract, then query `ScheduledPayment` by `lease_id` and assert no record exists (will confirm bug exists on unfixed code)
7. **Missing Stub Testing Docs Test**: Assert that `documentation/MVP-STUB-TESTING-GUIDE.md` does not exist (will confirm the documentation gap on unfixed code)

**Expected Counterexamples**:
- ConfirmationDialog always renders red button regardless of action context
- Error message DOM position is after the button element
- startDate form field is empty despite lease having a startDate value
- formatCOP output contains `$$` when input has `$` prefix
- Select element lacks `appearance-none` and custom chevron styling
- No `ScheduledPayment` record is created after contract signing — the use case only updates status, sends notifications, and logs audit
- No `documentation/MVP-STUB-TESTING-GUIDE.md` file exists — developers must read source code to understand stub workarounds

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed functions/components produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_ConfirmButton(input) DO
  result := renderConfirmationDialog({ variant: 'primary' })
  ASSERT confirmButton.hasClass('bg-[#1d4ed8]')
  ASSERT NOT confirmButton.hasClass('bg-red-600')
END FOR

FOR ALL input WHERE isBugCondition_BuriedError(input) DO
  result := renderContactLandlordButton(input)
  triggerError(result)
  ASSERT errorElement.domIndex < buttonElement.domIndex
END FOR

FOR ALL input WHERE isBugCondition_StartDateEmpty(input) DO
  result := renderContractWizard({ lease: input.lease })
  ASSERT formData.startDate = input.lease.startDate
END FOR

FOR ALL rawValue WHERE isBugCondition_DuplicateDollar(rawValue) DO
  result := formatCOP(rawValue)
  ASSERT result MATCHES /^\$[^$]/
  ASSERT countOccurrences(result, '$') = 1
END FOR

FOR ALL input WHERE isBugCondition_ClippedChevron(input) DO
  result := renderPagination(input)
  ASSERT selectElement.hasClass('appearance-none')
  ASSERT selectElement.hasClass('pr-8') OR selectElement.style.paddingRight >= '32px'
END FOR

FOR ALL input WHERE isBugCondition_MissingScheduledPayment(input) DO
  result := handleSigningWebhook_fixed(input.webhookDto)
  scheduledPayment := findScheduledPayment(input.contract.leaseId, input.contract.startDate)
  ASSERT scheduledPayment IS NOT NULL
  ASSERT scheduledPayment.amount = leaseMonthlyAmount(input.contract.leaseId)
  ASSERT scheduledPayment.currency = 'COP'
  ASSERT scheduledPayment.due_date = input.contract.startDate
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed components produce the same result as the original components.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition_ConfirmButton(input) DO
  ASSERT renderConfirmationDialog_original(input) = renderConfirmationDialog_fixed(input)
END FOR

FOR ALL input WHERE NOT isBugCondition_DuplicateDollar(input) DO
  ASSERT formatCOP_original(input) = formatCOP_fixed(input)
END FOR

FOR ALL input WHERE NOT isBugCondition_StartDateEmpty(input) DO
  ASSERT renderContractWizard_original(input) = renderContractWizard_fixed(input)
END FOR

FOR ALL input WHERE NOT isBugCondition_MissingScheduledPayment(input) DO
  // Webhooks with status != 'COMPLETED' should not create any ScheduledPayment
  handleSigningWebhook_fixed(input.webhookDto)
  ASSERT notificationsSent_original(input) = notificationsSent_fixed(input)
  ASSERT auditLogs_original(input) = auditLogs_fixed(input)
  ASSERT noNewScheduledPaymentCreated(input.contract.leaseId)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-bug inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Destructive Dialog Preservation**: Verify ConfirmationDialog without `variant` prop (or with `variant="destructive"`) continues to render red `bg-red-600` button across many prop combinations
2. **Success Message Preservation**: Verify ContactLandlordButton success flow continues to display the success message prominently
3. **MonthlyRent Pre-fill Preservation**: Verify ContractWizard continues to pre-fill monthlyRent from lease.monthlyAmount for various lease amounts
4. **Clean Input Formatting Preservation**: Verify formatCOP with clean digit strings (no `$`) produces identical output to the original function across many random numeric strings
5. **Pagination Navigation Preservation**: Verify page buttons, prev/next, ellipsis, touch targets, and aria attributes remain unchanged
6. **Notification Flow Preservation**: Verify that after fix, `HandleSigningWebhookUseCase` still sends `notifyContractSigned` to landlord and tenant (fire-and-forget) exactly as before
7. **Audit Log Preservation**: Verify that after fix, `HandleSigningWebhookUseCase` still logs `CONTRACT_SIGNED` audit entry with correct metadata
8. **ETL Pipeline Preservation**: Verify that `PaymentsEtlService.processPaymentsRaw()` continues to create `ScheduledPayment` records from `PaymentsRaw` without interference from the new on-signing path

### Unit Tests

- Test ConfirmationDialog renders primary blue button when `variant="primary"` is passed
- Test ConfirmationDialog renders red button when `variant="destructive"` or no variant is passed
- Test ContactLandlordButton error message appears above the button in DOM order
- Test ContactLandlordButton success message continues to display correctly
- Test ContractWizard initializes startDate from lease.startDate
- Test ContractWizard continues to initialize monthlyRent from lease.monthlyAmount
- Test formatCOP strips `$` from input before formatting
- Test formatCOP produces single `$` for inputs with and without existing `$`
- Test Pagination select has `appearance-none` and custom chevron classes
- Test Pagination page buttons and navigation remain unchanged
- Test `HandleSigningWebhookUseCase` calls `IPaymentSchedulingPort.scheduleInitialPayment` with correct args when webhook status is COMPLETED
- Test `HandleSigningWebhookUseCase` does NOT call `IPaymentSchedulingPort` when webhook status is not COMPLETED (e.g., FAILED)
- Test `PaymentSchedulingAdapter` creates a `ScheduledPayment` record with correct `lease_id`, `amount`, `currency`, and `due_date`
- Test that a failure in `scheduleInitialPayment` (rejected promise) does NOT prevent contract status update, notifications, or audit logging
- Test `getLeaseMonthlyAmount` returns correct amount from cross-schema lookup (Lease → PortfolioUnit → lease_base_amount)
- Test that `documentation/MVP-STUB-TESTING-GUIDE.md` exists and contains required sections (Overview, Stubs Reference, E-Signature Flow, Payment Flow, Full Rental Lifecycle, Messaging)
- Test that the guide contains valid curl commands for `POST /contracts/webhook/signing` and `POST /payments/webhook`
- Test that the guide documents all three stubs (ESignatureProviderAdapter, PaymentGatewayAdapter, MessagingChannelAdapter)

### Property-Based Tests

- Generate random `variant` values (`"primary"`, `"destructive"`, `undefined`) and verify ConfirmationDialog applies correct button styling for each
- Generate random numeric strings (with and without `$` prefix, with and without thousand separators) and verify formatCOP always produces output with exactly one `$` at the start
- Generate random lease objects with various startDate values and verify ContractWizard pre-fills correctly
- Generate random clean digit strings and verify formatCOP output matches the original function's output (preservation)
- Generate random valid contract/lease combinations and verify that `scheduleInitialPayment` is called with correct amount and due date for all COMPLETED webhooks
- Generate random webhook statuses (COMPLETED, FAILED, other) and verify that only COMPLETED triggers payment scheduling while all statuses preserve notification and audit behavior

### Integration Tests

- Test full ContactLandlordButton flow: click → dialog with blue button → confirm → error displayed above button
- Test full ContractWizard flow: open with lease data → step 2 shows pre-filled startDate and monthlyRent
- Test Pagination rendering with various total/page/pageSize combinations to verify select chevron and navigation remain correct
- Test ListingManagementView renders prices with single `$` symbol
- Test full signing webhook flow: POST `/contracts/webhook/signing` with COMPLETED status → verify contract status updated to SIGNED, notification sent, audit logged, AND `ScheduledPayment` record created with correct lease amount and due date
- Test that `PaymentsEtlService` can still process `PaymentsRaw` records independently of the on-signing path (no conflicts or duplicates)
- Test that tenant can see the newly created scheduled payment in `/mis-pagos` after contract signing
- Test that following the MVP Stub Testing Guide's curl commands for the signing webhook produces the expected state transitions (contract moves to SIGNED, scheduled payment created)
