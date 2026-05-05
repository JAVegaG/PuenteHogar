# Bugfix Requirements Document

## Introduction

This document covers multiple UI/UX polish bugs reported by a tenant user during the listing exploration and contract creation flows. The issues affect user confidence (destructive-looking button for a non-destructive action), error visibility (buried error messages), form pre-filling (missing startDate in contract wizard), display formatting (duplicated `$` symbols in money fields), and visual alignment (pagination dropdown chevron clipped by border). Together these create a confusing and unpolished experience that undermines trust in the platform. Additionally, the platform lacks documentation for testing flows that depend on external service stubs (e-signature, payment gateway), and the signing flow does not automatically create scheduled payments after a contract is signed.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a tenant clicks "Contactar arrendador" on a listing detail page THEN the ConfirmationDialog displays the "Confirmar" button with a red background (`bg-red-600`), making it appear as a destructive/dangerous action even though contacting a landlord is a non-destructive operation

1.2 WHEN the "Contactar arrendador" action fails with error "No se encontró un arriendo asociado a este inmueble" THEN the error message is rendered below the contact button at the bottom of the page with only `mt-3` spacing, making it easily missed by the user who may not scroll down

1.3 WHEN a landlord opens the contract creation wizard at step 2 "Términos del contrato" and the lease has a `startDate` value THEN the startDate field is initialized as empty (`startDate: ''`) instead of being pre-filled from the lease data, unlike the monthlyRent field which is correctly pre-filled

1.4 WHEN money amounts are displayed in the listing management view or formatted via `formatCOP` helpers across the application THEN some fields show duplicated `$` symbols (e.g., `$$1.200.000`) because the `formatCOP` function prepends `$` to a value that may already contain a `$` prefix, or because the `$` is added both by the format function and by the display template

1.5 WHEN the pagination component renders the page-size `<select>` dropdown THEN the native browser chevron/triangle indicator appears too close to the right border due to insufficient right padding (`px-2`), creating a visually cramped and unpolished appearance

1.6 WHEN the signing webhook confirms a contract as SIGNED (via `POST /contracts/webhook/signing` with `status: "COMPLETED"`) THEN the `HandleSigningWebhookUseCase` updates the contract status, sends notifications, and logs an audit entry, but does NOT create any `ScheduledPayment` record for the lease — nothing writes to `PaymentsRaw` either — so the tenant sees "No tienes pagos registrados" in `/mis-pagos` and the landlord sees no payment data in `/mis-ingresos` because no scheduled payments exist for the newly signed contract

1.7 WHEN a developer or tester needs to test flows that depend on external service stubs (e-signature provider, payment gateway) THEN there is no documentation explaining that manual webhook calls are required to complete the signing and payment flows, or what the correct endpoint URLs and payloads are — developers must inspect source code to understand the manual steps needed to advance the rental lifecycle past stub boundaries

1.8 WHEN a landlord opens the contract creation wizard at step 2 "Términos del contrato" and the lease has a `startDate` value (ISO format like `"2026-05-03T00:00:00.000Z"`) THEN the startDate field appears empty because the HTML `<input type="date">` element requires `YYYY-MM-DD` format but receives the full ISO string — the previous fix (`startDate: lease.startDate || ''`) passes the raw ISO string which the date input cannot display

1.9 WHEN a tenant views the listing detail page ("Detalle del inmueble") THEN the "Área" field shows "-" (dash) even though the backend has the property's `area` value (e.g., `80`) — the frontend passes `area={null}` hardcoded to `PropertyInfoGrid` and the `ListingDetailResponseDto` does not include an `area` field

1.10 WHEN a tenant clicks "Contactar arrendador" on a published listing THEN the system returns "No se encontró un arriendo asociado a este inmueble" because the frontend passes the `listingId` to `transitionLeaseState` but the backend expects a `leaseId` — the system has no mechanism to resolve a listing ID to its associated lease ID

1.11 WHEN a tenant successfully initiates contact with a landlord (CONTACT_INITIATED state transition) THEN the rental-tracking module's notification port is a no-op stub that does nothing — no in-app notification is created, no external notification is sent — so the landlord is never informed that a tenant is interested in their property, despite the `NEW_INTEREST` notification type existing in the database and the `SendNotificationUseCase` being fully functional in other modules

1.12 WHEN a landlord receives a "Nuevo interesado" notification in `/mis-notificaciones` THEN the notification card only shows the title ("Nuevo interesado") and a generic message ("Un arrendatario ha mostrado interés en tu inmueble **{propertyTitle}**.") — the tenant's contact information (name, email, phone) is stored in the notification's `data` JSON field but is NOT displayed anywhere in the UI — the landlord has no way to see who the interested tenant is or how to contact them, making the notification effectively useless for follow-up

### Expected Behavior (Correct)

2.1 WHEN a tenant clicks "Contactar arrendador" on a listing detail page THEN the ConfirmationDialog SHALL display the "Confirmar" button with the primary blue style (`bg-[#1d4ed8]`) to indicate a safe, non-destructive action — the ConfirmationDialog component SHALL support a `variant` prop (`"destructive"` | `"primary"`) defaulting to `"destructive"` for backward compatibility

2.2 WHEN the "Contactar arrendador" action fails with any error THEN the error message SHALL be displayed in a prominent, visible location (e.g., inside a toast notification or an inline alert near the top of the interaction area) so the user is immediately aware that something went wrong without needing to scroll

2.3 WHEN a landlord opens the contract creation wizard at step 2 "Términos del contrato" and the lease has a `startDate` value THEN the startDate field SHALL be pre-filled with the lease's startDate value, following the same pattern used for monthlyRent pre-filling

2.4 WHEN money amounts are formatted for display using `formatCOP` helpers THEN the system SHALL ensure that only a single `$` symbol is shown regardless of whether the input already contains a `$` prefix — the `formatCOP` function SHALL strip any existing `$` before formatting

2.5 WHEN the pagination component renders the page-size `<select>` dropdown THEN the chevron/triangle indicator SHALL have adequate spacing from the right border (using `pr-8` or equivalent right padding and `appearance-none` with a custom chevron SVG background) so it does not appear visually clipped or cramped

2.6 WHEN a contract reaches SIGNED status (signing webhook with `status: "COMPLETED"`) THEN the system SHALL automatically create at least one `ScheduledPayment` record for the associated lease by looking up the lease's monthly amount and currency (COP), setting the due date to the contract's start date or the first day of the next month, and using a cross-module port interface (per project conventions the contracts module SHALL NOT directly write to the payments schema) so that the tenant can immediately see and pay their first scheduled payment in `/mis-pagos`

2.7 WHEN a developer or tester needs to test the full rental lifecycle (listing → contact → contract → signing → payment) THEN a documentation file `documentation/MVP-STUB-TESTING-GUIDE.md` SHALL exist that documents all MVP stubs, their behavior, the manual steps required to test each flow end-to-end, and exact curl commands with example payloads for each webhook endpoint — the guide SHALL cover: (a) the e-signature signing flow (initiate signing → manual webhook call to complete), (b) the payment flow (initiate payment → manual webhook call to confirm), and (c) the full rental lifecycle from listing to payment

2.8 WHEN a landlord opens the contract creation wizard at step 2 "Términos del contrato" and the lease has a `startDate` value in ISO format THEN the startDate field SHALL be pre-filled with the date portion only (`YYYY-MM-DD`) extracted from the ISO string, so the HTML date input can display it correctly

2.9 WHEN a tenant views the listing detail page THEN the "Área" field SHALL display the property's area value (in m²) fetched from the backend — the backend SHALL include the `area` field in the `ListingDetailResponseDto` by reading it from the `Property` table

2.10 WHEN a tenant clicks "Contactar arrendador" on a published listing THEN the system SHALL resolve the listing ID to its associated lease ID (via listing → portfolio_unit → lease lookup) and successfully initiate the contact flow without errors — a published listing with an active lease SHALL always allow contact initiation

2.11 WHEN a tenant successfully initiates contact with a landlord THEN the landlord SHALL receive a notification (in-app or via the notification port) containing the interested tenant's contact information (name, email, phone) so the landlord can follow up — the `CONTACT_INITIATED` state SHALL trigger a notification to the landlord

2.12 WHEN the "Contactar arrendador" button and success/error messages are displayed on desktop viewports THEN they SHALL be constrained to a reasonable max-width (matching the listing detail content area, e.g., `max-w-[560px]`) so they don't stretch full-width across the entire screen

2.13 WHEN the area value is `null` or `undefined` (property has no length/width data) THEN the PropertyInfoGrid SHALL display "-" for the Área field — it SHALL NOT display "undefined m²" or "null m²"

2.14 WHEN a tenant successfully initiates contact with a landlord (CONTACT_INITIATED state transition) THEN the rental-tracking module SHALL send a real notification to the landlord using the `NEW_INTEREST` notification type via `SendNotificationUseCase` — the notification SHALL include the property title and the tenant's contact information (name, email, phone) so the landlord can follow up — the notification port stub SHALL be replaced with a real `TrackingNotificationAdapter` that imports `NotificationsModule`

2.15 WHEN a landlord views a "Nuevo interesado" notification in `/mis-notificaciones` THEN the notification card SHALL display the tenant's contact information (name, email, phone number) extracted from the notification's `data` field — the notification message SHALL include the tenant's name (e.g., "**Juan Pérez** ha mostrado interés en tu inmueble **Hermosa casa en el limonar**.") and the card SHALL render the email and phone below the message so the landlord can immediately follow up without needing a separate screen or flow

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the ConfirmationDialog is used for destructive actions (e.g., delete portfolio, delete unit, unpublish listing) THEN the system SHALL CONTINUE TO display the confirm button with the red destructive style (`bg-red-600`)

3.2 WHEN the "Contactar arrendador" action succeeds THEN the system SHALL CONTINUE TO display the success message ("El contacto ha sido iniciado. El arrendador será notificado.") in a visible location

3.3 WHEN a landlord opens the contract creation wizard and the lease has a `monthlyRent` value THEN the system SHALL CONTINUE TO pre-fill the monthlyRent field correctly from the lease data

3.4 WHEN money amounts are formatted from raw digit strings (e.g., `"1200000"`) that do not already contain a `$` symbol THEN the system SHALL CONTINUE TO display them correctly as `$1.200.000`

3.5 WHEN the pagination component renders page number buttons and previous/next navigation THEN the system SHALL CONTINUE TO display them with correct spacing, touch targets (min 44px), and accessibility attributes

3.6 WHEN the ConfirmationDialog is used without specifying a `variant` prop THEN the system SHALL CONTINUE TO default to the destructive (red) style to maintain backward compatibility with all existing usages

3.7 WHEN a contract is signed THEN the system SHALL CONTINUE TO send notifications to landlord and tenant and log an audit entry with action `CONTRACT_SIGNED` as it does today — the new scheduled payment creation must not interfere with the existing notification and audit flows

3.8 WHEN `ScheduledPayment` records are created via the `PaymentsRaw` ETL pipeline (`PaymentsEtlService.processPaymentsRaw()`) THEN the system SHALL CONTINUE TO process those raw records and create scheduled payments as before — the new on-signing creation path must not duplicate or conflict with ETL-created records

3.9 WHEN the existing `src/backend/README.md` and files in the `documentation/` directory exist THEN the system SHALL CONTINUE TO leave them unchanged — the new `documentation/MVP-STUB-TESTING-GUIDE.md` is an additive file, not a modification of existing documentation

3.10 WHEN the listing detail page displays rooms and bathrooms THEN the system SHALL CONTINUE TO display those values correctly — the area fix must not affect existing property info rendering

3.11 WHEN a tenant successfully contacts a landlord via the existing flow (where a valid lease ID is provided) THEN the system SHALL CONTINUE TO transition the lease state correctly and send notifications

3.12 WHEN the `CONTACT_INITIATED` notification is sent to the landlord THEN the existing `CONTRACT_SIGNED` and `PAYMENT_RECEIVED` notification flows in other modules (contracts, payments) SHALL CONTINUE TO work independently — the rental-tracking notification adapter SHALL only handle `CONTACT_INITIATED` and delegate other states to their respective module adapters

3.13 WHEN other notification types (CONTRACT_SIGNED, PAYMENT_RECEIVED, LEASE_CREATED, LEASE_CANCELLED, CONTRACT_UPLOADED) are displayed in `/mis-notificaciones` THEN they SHALL CONTINUE TO render as before (title + message only) — the tenant contact info display is specific to `NEW_INTEREST` notifications only
