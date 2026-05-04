# Implementation Plan: In-App Notifications Wiring

## Overview

Replace empty notification port stubs in four backend modules (contracts, payments, landlord-portfolio, property-listings) with real `@Injectable()` adapter classes that delegate to `SendNotificationUseCase`. Add missing notification type seeds and `buildNotificationContent` cases so that key rental lifecycle events produce real `InAppNotification` records. All work is backend-only TypeScript (NestJS).

## Tasks

- [x] 1. Seed data and buildNotificationContent updates (foundation)
  - [x] 1.1 Add missing notification types to the seed script
    - Open `src/backend/db/seeds/seed.ts`
    - Add `CONTRACT_UPLOADED`, `LEASE_CREATED`, and `LEASE_CANCELLED` to the `notificationTypes` array (keep existing `NEW_INTEREST`, `CONTRACT_SIGNED`, `PAYMENT_RECEIVED`, `PAYMENT_DUE`)
    - Use `upsert` to avoid duplicates, matching the existing seed pattern
    - _Requirements: 8.1, 8.2_

  - [x] 1.2 Add new cases to `buildNotificationContent` in `SendNotificationUseCase`
    - Open `src/backend/modules/notifications/application/use-cases/send-notification.use-case.ts`
    - Add `case 'NEW_INTEREST'` with title `'Nuevo interesado'` and message referencing `data.listingId`
    - Add `case 'LEASE_CREATED'` with title `'Arriendo creado'` and message referencing `data.leaseId`
    - Add `case 'LEASE_CANCELLED'` with title `'Arriendo cancelado'` and message referencing `data.leaseId`
    - Update existing `case 'CONTRACT_UPLOADED'` message to also reference `data.leaseId` if present
    - _Requirements: 8.3, 10.3, 10.4_

- [x] 2. NotificationsModule export (enables DI for all adapters)
  - [x] 2.1 Verify and update `NotificationsModule` exports
    - Open `src/backend/modules/notifications/notifications.module.ts`
    - Confirm `SendNotificationUseCase` is in the `exports` array (it already is — verify no changes needed)
    - Ensure the module can be imported by contracts, payments, landlord-portfolio, and property-listings modules
    - _Requirements: 9.1_

- [x] 3. Create adapter classes and wire them in each module
  - [x] 3.1 Extend contracts `INotificationPort` with `notifyContractUploaded`
    - Open `src/backend/modules/contracts/domain/ports/notification.port.ts`
    - Add `notifyContractUploaded(tenantUserId: string, contractId: string, leaseId: string): Promise<void>` to the interface
    - _Requirements: 2.3_

  - [x] 3.2 Create `ContractNotificationAdapter`
    - Create file `src/backend/modules/contracts/infrastructure/adapters/contract-notification.adapter.ts`
    - Implement `INotificationPort` with `@Injectable()` decorator
    - Inject `SendNotificationUseCase` via constructor
    - `notifyContractSigned`: call `sendNotification.execute` twice (landlord + tenant) with `notificationTypeName: 'CONTRACT_SIGNED'`, `eventSource: 'contract.signed'`, `data: { contractId, signedAt }`
    - `notifySigningFailed`: call once with `notificationTypeName: 'CONTRACT_SIGNED'`, `eventSource: 'contract.signing_failed'`, `data: { contractId }`
    - `notifyContractUploaded`: guard `if (!tenantUserId) return;`, then call once with `notificationTypeName: 'CONTRACT_UPLOADED'`, `eventSource: 'contract.uploaded'`, `data: { contractId, leaseId }`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.4_

  - [x] 3.3 Wire `ContractNotificationAdapter` in `ContractsModule`
    - Open `src/backend/modules/contracts/contracts.module.ts`
    - Add `NotificationsModule` to `imports` array
    - Import `ContractNotificationAdapter`
    - Replace `{ provide: CONTRACT_NOTIFICATION_PORT, useValue: { ... } }` with `{ provide: CONTRACT_NOTIFICATION_PORT, useClass: ContractNotificationAdapter }`
    - _Requirements: 1.4, 1.5, 9.2, 9.6_

  - [x] 3.4 Create `PaymentNotificationAdapter`
    - Create file `src/backend/modules/payments/infrastructure/adapters/payment-notification.adapter.ts`
    - Implement `IPaymentNotificationPort` with `@Injectable()` decorator
    - Inject `SendNotificationUseCase` via constructor
    - `notifyPaymentReceived`: call once with `notificationTypeName: 'PAYMENT_RECEIVED'`, `eventSource: 'payment.received'`, `data: { amount, currency, leaseId }`
    - _Requirements: 3.1, 3.2_

  - [x] 3.5 Wire `PaymentNotificationAdapter` in `PaymentsModule`
    - Open `src/backend/modules/payments/payments.module.ts`
    - Add `NotificationsModule` to `imports` array
    - Import `PaymentNotificationAdapter`
    - Replace `{ provide: PAYMENT_NOTIFICATION_PORT, useValue: { ... } }` with `{ provide: PAYMENT_NOTIFICATION_PORT, useClass: PaymentNotificationAdapter }`
    - _Requirements: 3.3, 3.4, 9.3, 9.6_

  - [x] 3.6 Create `IPortfolioNotificationPort` interface and DI token
    - Create file `src/backend/modules/landlord-portfolio/domain/ports/notification.port.ts`
    - Export `PORTFOLIO_NOTIFICATION_PORT = 'PORTFOLIO_NOTIFICATION_PORT'`
    - Define `IPortfolioNotificationPort` with `notifyLeaseCreated(tenantUserId, leaseId, unitId): Promise<void>` and `notifyLeaseCancelled(tenantUserId, leaseId): Promise<void>`
    - _Requirements: 4.3, 5.3_

  - [x] 3.7 Create `PortfolioNotificationAdapter`
    - Create file `src/backend/modules/landlord-portfolio/infrastructure/adapters/portfolio-notification.adapter.ts`
    - Implement `IPortfolioNotificationPort` with `@Injectable()` decorator
    - Inject `SendNotificationUseCase` via constructor
    - `notifyLeaseCreated`: guard `if (!tenantUserId) return;`, then call once with `notificationTypeName: 'LEASE_CREATED'`, `eventSource: 'lease.created'`, `data: { leaseId, unitId }`
    - `notifyLeaseCancelled`: guard `if (!tenantUserId) return;`, then call once with `notificationTypeName: 'LEASE_CANCELLED'`, `eventSource: 'lease.cancelled'`, `data: { leaseId }`
    - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.4_

  - [x] 3.8 Wire `PortfolioNotificationAdapter` in `LandlordPortfolioModule`
    - Open `src/backend/modules/landlord-portfolio/landlord-portfolio.module.ts`
    - Add `NotificationsModule` to `imports` array
    - Import `PortfolioNotificationAdapter` and `PORTFOLIO_NOTIFICATION_PORT`
    - Add `{ provide: PORTFOLIO_NOTIFICATION_PORT, useClass: PortfolioNotificationAdapter }` to `providers`
    - _Requirements: 4.4, 4.5, 9.4, 9.6_

  - [x] 3.9 Create `ListingNotificationAdapter`
    - Create file `src/backend/modules/property-listings/infrastructure/adapters/listing-notification.adapter.ts`
    - Implement `INotificationPort` (from property-listings) with `@Injectable()` decorator
    - Inject `SendNotificationUseCase` via constructor
    - `notifyLandlordOfInterest`: call once with `notificationTypeName: 'NEW_INTEREST'`, `eventSource: 'listing.contact_initiated'`, `data: { listingId, tenantUserId }`
    - _Requirements: 6.1, 6.2_

  - [x] 3.10 Wire `ListingNotificationAdapter` in `PropertyListingsModule`
    - Open `src/backend/modules/property-listings/property-listings.module.ts`
    - Add `NotificationsModule` to `imports` array
    - Import `ListingNotificationAdapter`
    - Replace `{ provide: NOTIFICATION_PORT, useValue: { ... } }` with `{ provide: NOTIFICATION_PORT, useClass: ListingNotificationAdapter }`
    - _Requirements: 6.3, 6.4, 9.5, 9.6_

- [x] 4. Integrate notification calls into use cases (fire-and-forget)
  - [x] 4.1 Add `notifyContractUploaded` call to `UploadContractUseCase`
    - Open `src/backend/modules/contracts/application/use-cases/upload-contract.use-case.ts`
    - Inject `CONTRACT_NOTIFICATION_PORT` (`INotificationPort`) via constructor using `@Inject(CONTRACT_NOTIFICATION_PORT)`
    - After the `this.auditLogger.log(...)` call, add fire-and-forget notification: `if (tenantUserId) { this.notificationPort.notifyContractUploaded(tenantUserId, contract.id, dto.leaseId).catch(() => undefined); }`
    - _Requirements: 2.1, 2.4, 7.1, 7.2_

  - [x] 4.2 Add `notifySigningFailed` call to `HandleSigningWebhookUseCase`
    - Open `src/backend/modules/contracts/application/use-cases/handle-signing-webhook.use-case.ts`
    - In the `else` branch (FAILED status), after the audit log, add fire-and-forget: `const parties = await this.repository.findContractParties(contract.id); const landlord = parties.find(p => p.roleInContract === 'LANDLORD'); if (landlord) { this.notificationPort.notifySigningFailed(landlord.userId, contract.id).catch(() => undefined); }`
    - _Requirements: 1.2, 7.1, 7.2_

  - [x] 4.3 Add notification calls to `CreateLeaseUseCase`
    - Open `src/backend/modules/landlord-portfolio/application/use-cases/create-lease.use-case.ts`
    - Inject `PORTFOLIO_NOTIFICATION_PORT` (`IPortfolioNotificationPort`) via constructor using `@Inject(PORTFOLIO_NOTIFICATION_PORT)`
    - After building the response DTO (before `return result`), add fire-and-forget: `this.notificationPort.notifyLeaseCreated(tenantUser.id, newLease.id, unitId).catch(() => undefined);`
    - _Requirements: 4.1, 4.2, 7.1, 7.2_

  - [x] 4.4 Add notification call to `CancelLeaseUseCase`
    - Open `src/backend/modules/landlord-portfolio/application/use-cases/cancel-lease.use-case.ts`
    - Inject `PORTFOLIO_NOTIFICATION_PORT` (`IPortfolioNotificationPort`) via constructor using `@Inject(PORTFOLIO_NOTIFICATION_PORT)`
    - After the audit log, add fire-and-forget: `if (lease.user_id) { this.notificationPort.notifyLeaseCancelled(lease.user_id, leaseId).catch(() => undefined); }`
    - _Requirements: 5.1, 5.2, 5.4, 7.1, 7.2_

- [x] 5. Checkpoint — build and verify
  - Ensure the project compiles with `npm run build` from `src/backend/`
  - Ensure all existing tests pass with `npm run test` from `src/backend/`
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 6. Property-based tests for adapter delegation correctness
  - [ ]* 6.1 Write property test for ContractNotificationAdapter
    - **Property 1: Contracts adapter delegates with correct notification type and data**
    - Create test file `src/backend/modules/contracts/infrastructure/adapters/contract-notification.adapter.spec.ts`
    - Use `fast-check` to generate random landlordUserId, tenantUserId, contractId, leaseId
    - Mock `SendNotificationUseCase.execute` and verify call count, `notificationTypeName`, `eventSource`, and `data` payload for `notifyContractSigned`, `notifySigningFailed`, and `notifyContractUploaded`
    - Verify `notifyContractUploaded` with empty tenantUserId does not call `execute`
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2**

  - [ ]* 6.2 Write property test for PaymentNotificationAdapter
    - **Property 2: Payments adapter delegates with correct notification type and data**
    - Create test file `src/backend/modules/payments/infrastructure/adapters/payment-notification.adapter.spec.ts`
    - Use `fast-check` to generate random landlordUserId, positive amount, currency, leaseId
    - Mock `SendNotificationUseCase.execute` and verify `notificationTypeName: 'PAYMENT_RECEIVED'`, `eventSource: 'payment.received'`, and `data` payload
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 6.3 Write property test for PortfolioNotificationAdapter
    - **Property 3: Landlord-portfolio adapter delegates with correct notification type and data**
    - Create test file `src/backend/modules/landlord-portfolio/infrastructure/adapters/portfolio-notification.adapter.spec.ts`
    - Use `fast-check` to generate random tenantUserId, leaseId, unitId
    - Mock `SendNotificationUseCase.execute` and verify `notifyLeaseCreated` produces `notificationTypeName: 'LEASE_CREATED'` and `notifyLeaseCancelled` produces `notificationTypeName: 'LEASE_CANCELLED'`
    - Verify empty tenantUserId skips the call
    - **Validates: Requirements 4.1, 4.2, 5.1, 5.2**

  - [ ]* 6.4 Write property test for ListingNotificationAdapter
    - **Property 4: Property-listings adapter delegates with correct notification type and data**
    - Create test file `src/backend/modules/property-listings/infrastructure/adapters/listing-notification.adapter.spec.ts`
    - Use `fast-check` to generate random landlordUserId, tenantUserId, listingId
    - Mock `SendNotificationUseCase.execute` and verify `notificationTypeName: 'NEW_INTEREST'`, `eventSource: 'listing.contact_initiated'`, and `data` payload
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 6.5 Write property test for buildNotificationContent
    - **Property 5: buildNotificationContent produces valid Spanish content for all known types**
    - Create test file `src/backend/modules/notifications/application/use-cases/build-notification-content.spec.ts`
    - Use `fast-check` to generate random data payloads for each known type in `{CONTRACT_SIGNED, PAYMENT_RECEIVED, NEW_INTEREST, CONTRACT_UPLOADED, LEASE_CREATED, LEASE_CANCELLED}`
    - Verify non-empty `title` and non-empty `message` for every type
    - Verify contextual data fields (contractId, amount, leaseId, listingId) appear in the message when present
    - **Validates: Requirements 8.3, 10.3, 10.4**

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Post-Implementation UX Fixes (Requirements 11–14)

_These tasks address UX issues discovered during manual testing after the initial implementation._

- [x] 8. Fix notification type translations in frontend
  - [x] 8.1 Add missing Spanish translations for `LEASE_CREATED` and `LEASE_CANCELLED`
    - Open `src/frontend/modules/notifications/utils/translate-notification-type.ts`
    - Add `LEASE_CREATED: 'Arriendo creado'` and `LEASE_CANCELLED: 'Arriendo cancelado'` to the translations map
    - _Requirements: 12.1, 12.2_

- [x] 9. Replace raw UUIDs with human-readable names in notification messages
  - [x] 9.1 Update notification adapters to resolve display names before sending
    - In each adapter, resolve human-readable context (property name, unit name) from the database before calling `SendNotificationUseCase`
    - Pass resolved names in the `data` payload (e.g., `propertyName`, `unitName`)
    - _Requirements: 11.1, 11.2_

  - [x] 9.2 Update `buildNotificationContent` to use display names
    - Open `src/backend/modules/notifications/application/use-cases/send-notification.use-case.ts`
    - Update each case to prefer `data.propertyName` / `data.unitName` over raw IDs
    - Fall back to generic descriptions (e.g., "un contrato", "un arriendo") when names are unavailable
    - _Requirements: 11.1, 11.3, 11.4_

- [x] 10. Add delete notification endpoint and frontend action
  - [x] 10.1 Add `softDeleteNotification` to notification repository
    - Add method to `INotificationRepository` and `PrismaNotificationRepository`
    - Soft-delete by setting `deleted_at` on the `InAppNotification` record
    - Verify ownership: notification's `user_id` must match the requesting user
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 10.2 Create `DeleteNotificationUseCase`
    - Create use case that validates ownership and calls repository soft-delete
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 10.3 Add `DELETE /notifications/:id` endpoint to controller
    - Add route to `NotificationsController` with JWT guard
    - Add Swagger decorators
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 10.4 Add delete button to frontend notification cards
    - Add a trash icon button to each notification card in `NotificationsListView`
    - Call `DELETE /notifications/:id` on click
    - Remove the card from the list optimistically
    - _Requirements: 13.4, 13.5_

- [x] 11. Add notification badge to hamburger menu icon
  - [x] 11.1 Create shared `useUnreadNotificationCount` hook
    - Create a reusable hook that fetches `GET /notifications/count` and returns the unread count
    - Avoid duplicating the fetch logic across every page
    - _Requirements: 14.2, 14.4_

  - [x] 11.2 Add `unreadNotificationCount` prop to `Header` component
    - Add optional prop to `Header`
    - When > 0, render a small red dot indicator on the hamburger menu button
    - _Requirements: 14.1, 14.3_

  - [x] 11.3 Wire unread count into all authenticated pages
    - Update all pages that render `SideMenu` to use the shared hook and pass the count to both `Header` and `SideMenu`
    - Pages to update: `mi-portafolio`, `mis-contratos`, `mis-contratos-arrendatario`, `mis-arriendos`, `mis-pagos`, `mis-ingresos`, `explorar` (when authenticated)
    - _Requirements: 14.2, 14.4_

- [ ] 12. Post-fix checkpoint — build and verify
  - Ensure `npm run build` passes for both frontend and backend
  - Ensure `npm run test` passes for backend
  - Verify notifications display human-readable messages, Spanish labels, delete works, and badge appears on hamburger icon

- [ ] 13. Move "Gestionar preferencias" to top of notifications page
  - [~] 13.1 Relocate preferences link in `NotificationsListView`
    - Open `src/frontend/modules/notifications/components/NotificationsListView.tsx`
    - Move the "Gestionar preferencias" link from the bottom of the list to the top action bar, alongside "Marcar todas como leídas"
    - Remove the bottom "Gestionar preferencias" link
    - Ensure the link is visible in the empty state as well
    - _Requirements: 15.1, 15.2, 15.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- All notification calls use the fire-and-forget pattern: `.catch(() => undefined)` — no `await` in the calling use case
- No database migrations needed — only seed data additions and code changes
- External messaging (WhatsApp/email) remains stubbed via `MessagingChannelAdapter`
