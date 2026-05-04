# Requirements Document

## Introduction

This feature wires real in-app notification implementations across the contracts, payments, landlord-portfolio, and property-listings modules. Currently, each module defines a local `INotificationPort` interface with empty stub implementations that do nothing. The goal is to replace those stubs with real adapter classes that call `SendNotificationUseCase` from the notifications module, creating actual `InAppNotification` records in the database for key rental lifecycle events. External messaging channels (email, WhatsApp) remain stubbed — only in-app notifications are activated.

## Glossary

- **Notification_Adapter**: A concrete implementation of a module's `INotificationPort` interface that delegates to `SendNotificationUseCase` to create in-app notifications
- **SendNotificationUseCase**: The existing use case in the notifications module that resolves notification types, builds content, creates `InAppNotification` records, and attempts external messaging
- **INotificationPort**: A module-local interface defining notification methods specific to that module's domain events
- **NotificationType**: A catalog record in the `notifications` schema identifying the kind of event (e.g., `CONTRACT_SIGNED`, `PAYMENT_RECEIVED`)
- **InAppNotification**: A database record representing a notification visible to a user in the `/mis-notificaciones` page
- **Fire_And_Forget**: The pattern where notification calls are not awaited and failures are silently caught, ensuring the main business flow is never interrupted
- **MessagingChannelAdapter**: The existing console-logging stub for external messaging (WhatsApp/email) that remains unchanged

## Requirements

### Requirement 1: Contracts Module Notification Adapter

**User Story:** As a landlord or tenant, I want to receive in-app notifications when a contract is signed or when signing fails, so that I stay informed about my contract status without checking manually.

#### Acceptance Criteria

1. WHEN a contract signing webhook reports status COMPLETED, THE Notification_Adapter SHALL call SendNotificationUseCase with notification type `CONTRACT_SIGNED` for both the landlord and the tenant user IDs
2. WHEN a contract signing webhook reports a failure status, THE Notification_Adapter SHALL call SendNotificationUseCase with notification type `CONTRACT_SIGNED` and event source `contract.signing_failed` for the landlord user ID
3. THE Notification_Adapter SHALL include the contract ID in the notification data payload
4. THE Notification_Adapter SHALL be registered in the contracts module as the provider for the `CONTRACT_NOTIFICATION_PORT` token, replacing the current empty stub
5. THE Notification_Adapter SHALL import `SendNotificationUseCase` from the notifications module via NestJS dependency injection

### Requirement 2: Contract Upload Notification

**User Story:** As a tenant, I want to receive an in-app notification when my landlord uploads a contract for my lease, so that I know a contract is ready for my review.

#### Acceptance Criteria

1. WHEN a contract is uploaded successfully, THE Notification_Adapter SHALL call SendNotificationUseCase with notification type `CONTRACT_UPLOADED` for the tenant user ID
2. THE Notification_Adapter SHALL include the contract ID and lease ID in the notification data payload
3. THE contracts module `INotificationPort` interface SHALL include a `notifyContractUploaded` method accepting the tenant user ID and contract ID
4. IF the tenant user ID cannot be resolved for the lease, THEN THE Notification_Adapter SHALL skip the notification without throwing an error

### Requirement 3: Payments Module Notification Adapter

**User Story:** As a landlord, I want to receive an in-app notification when a rent payment is received, so that I can confirm income without checking the payment history manually.

#### Acceptance Criteria

1. WHEN a payment webhook reports status APPROVED, THE Notification_Adapter SHALL call SendNotificationUseCase with notification type `PAYMENT_RECEIVED` for the landlord user ID
2. THE Notification_Adapter SHALL include the payment amount, currency, and lease ID in the notification data payload
3. THE Notification_Adapter SHALL be registered in the payments module as the provider for the `PAYMENT_NOTIFICATION_PORT` token, replacing the current empty stub
4. THE Notification_Adapter SHALL import `SendNotificationUseCase` from the notifications module via NestJS dependency injection

### Requirement 4: Landlord-Portfolio Module Notification Adapter — Lease Created

**User Story:** As a tenant, I want to receive an in-app notification when a landlord creates a lease for me, so that I know a rental agreement has been initiated.

#### Acceptance Criteria

1. WHEN a lease is created, THE Notification_Adapter SHALL call SendNotificationUseCase with notification type `LEASE_CREATED` for the tenant user ID
2. THE Notification_Adapter SHALL include the lease ID and portfolio unit ID in the notification data payload
3. THE landlord-portfolio module SHALL define an `INotificationPort` interface with a `notifyLeaseCreated` method
4. THE Notification_Adapter SHALL be registered in the landlord-portfolio module as the provider for the notification port token
5. THE Notification_Adapter SHALL import `SendNotificationUseCase` from the notifications module via NestJS dependency injection

### Requirement 5: Landlord-Portfolio Module Notification Adapter — Lease Cancelled

**User Story:** As a tenant, I want to receive an in-app notification when my lease is cancelled, so that I am immediately aware of the change in my rental status.

#### Acceptance Criteria

1. WHEN a lease is cancelled, THE Notification_Adapter SHALL call SendNotificationUseCase with notification type `LEASE_CANCELLED` for the tenant user ID
2. THE Notification_Adapter SHALL include the lease ID in the notification data payload
3. THE landlord-portfolio module `INotificationPort` interface SHALL include a `notifyLeaseCancelled` method accepting the tenant user ID and lease ID
4. IF the tenant user ID cannot be resolved from the lease record, THEN THE Notification_Adapter SHALL skip the notification without throwing an error

### Requirement 6: Property-Listings Module Notification Adapter

**User Story:** As a landlord, I want to receive an in-app notification when a tenant initiates contact on my listing, so that I can respond promptly.

#### Acceptance Criteria

1. WHEN a contact event is registered, THE Notification_Adapter SHALL call SendNotificationUseCase with notification type `NEW_INTEREST` for the landlord user ID
2. THE Notification_Adapter SHALL include the listing ID and tenant user ID in the notification data payload
3. THE Notification_Adapter SHALL be registered in the property-listings module as the provider for the `NOTIFICATION_PORT` token, replacing the current empty stub
4. THE Notification_Adapter SHALL import `SendNotificationUseCase` from the notifications module via NestJS dependency injection

### Requirement 7: Fire-and-Forget Invocation Pattern

**User Story:** As a platform operator, I want notification failures to never interrupt the main business flow, so that the system remains reliable even when notifications encounter errors.

#### Acceptance Criteria

1. THE use cases in contracts, payments, landlord-portfolio, and property-listings modules SHALL invoke notification port methods without awaiting the result (fire-and-forget pattern)
2. THE use cases SHALL catch and suppress any errors thrown by notification port methods using `.catch(() => undefined)`
3. IF SendNotificationUseCase cannot find the notification type in the catalog, THEN THE SendNotificationUseCase SHALL log a warning and return without throwing an error
4. THE MessagingChannelAdapter SHALL remain unchanged as a console-logging stub for external channels

### Requirement 8: Notification Type Catalog Seeding

**User Story:** As a developer, I want all required notification types to exist in the database catalog, so that the notification adapters can resolve type IDs at runtime.

#### Acceptance Criteria

1. THE seed script SHALL include notification types: `CONTRACT_SIGNED`, `PAYMENT_RECEIVED`, `NEW_INTEREST`, `CONTRACT_UPLOADED`, `LEASE_CREATED`, `LEASE_CANCELLED`
2. WHEN a notification type already exists in the database, THE seed script SHALL update its description without creating a duplicate
3. THE SendNotificationUseCase `buildNotificationContent` function SHALL produce Spanish-language title and message for each notification type including `LEASE_CREATED` and `LEASE_CANCELLED`

### Requirement 9: NestJS Module Wiring

**User Story:** As a developer, I want the notification adapters to be properly wired via NestJS dependency injection, so that each module can call `SendNotificationUseCase` without tight coupling.

#### Acceptance Criteria

1. THE NotificationsModule SHALL export `SendNotificationUseCase` so that other modules can inject it
2. THE contracts module SHALL import `NotificationsModule` to access `SendNotificationUseCase`
3. THE payments module SHALL import `NotificationsModule` to access `SendNotificationUseCase`
4. THE landlord-portfolio module SHALL import `NotificationsModule` to access `SendNotificationUseCase`
5. THE property-listings module SHALL import `NotificationsModule` to access `SendNotificationUseCase`
6. EACH notification adapter class SHALL be an `@Injectable()` NestJS service that receives `SendNotificationUseCase` via constructor injection

### Requirement 10: Frontend Compatibility

**User Story:** As a user, I want the `/mis-notificaciones` page to display real notifications with correct titles and messages, so that I can understand what happened without confusion.

#### Acceptance Criteria

1. THE backend `GET /notifications` endpoint SHALL return `InAppNotificationDto` objects with fields: `id`, `notificationType`, `title`, `message`, `read`, `eventSource`, `data`, `createdAt`
2. THE frontend `InAppNotification` interface SHALL match the backend DTO field names exactly (already the case)
3. WHEN a new notification is created, THE notification title and message SHALL be in Spanish and describe the event clearly (e.g., "Contrato firmado", "Pago recibido", "Arriendo creado")
4. THE `buildNotificationContent` function SHALL use contextual data (contract ID, amount, lease ID) to produce informative messages when available
