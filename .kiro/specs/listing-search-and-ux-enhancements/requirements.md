# Requirements Document

## Introduction

This feature spec covers a set of improvements to the Colombian urban housing rental platform focused on search, filtering, and UX quality. The changes span five areas: (1) making listing filters backend-driven with extended AdditionalFeature metadata, (2) adding a keyword search bar with tag-based filtering, (3) creating a landing page, (4) redesigning the lease detail page with cards, and (5) reviewing contract screens for visual consistency and fixing the "Invalid Date" bug.

## Glossary

- **Platform**: The Colombian urban housing rental web application (frontend + backend).
- **Filter_Panel**: The full-screen overlay component on the `/explorar` page that allows users to narrow listing results by location, price, property type, and other criteria.
- **AdditionalFeature**: A catalog table in the `property_listings` PostgreSQL schema that stores configurable property attributes (e.g., parking, pets allowed, furnished). Currently has `id`, `name`, `description`, and `deleted_at` columns.
- **PropertyAdditionalFeature**: A join table linking a `Property` to an `AdditionalFeature` with a `value` and `order`.
- **Department**: A catalog table in the `property_listings` schema representing Colombian departments (states), seeded from the DANE geo catalog.
- **City**: A catalog table in the `property_listings` schema representing Colombian cities, linked to a Department via `department_code`.
- **Keyword_Search_Bar**: A text input on the explore page that suggests structured filter tags (e.g., "ciudad: Cali") as the user types, and applies them as chip filters on explicit action.
- **Tag_Chip**: A visual pill/badge element representing an active structured filter derived from a keyword search suggestion.
- **Landing_Page**: The root page (`/`) of the platform, providing introductory information and a call-to-action to search listings.
- **Lease_Detail_Page**: The page at `/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]` that displays the full details of a lease agreement.
- **Contract_Screen**: Any page under `/mis-contratos` or `/mis-contratos-arrendatario` that displays contract information (list, detail, creation wizard).
- **Landlord**: An authenticated user with the `LANDLORD` role who manages property portfolios and leases.
- **Tenant**: An authenticated user with the `TENANT` role who searches for and rents properties.
- **Anonymous_User**: A visitor who browses listings without authentication.
- **Buscar_Button**: The explicit search/filter trigger button next to the Keyword_Search_Bar.

## Requirements

### Requirement 1: Backend-Driven Department Dropdown

**User Story:** As an Anonymous_User or Tenant, I want the department filter to load its options from the backend geo catalog, so that the available departments are always accurate and up to date.

#### Acceptance Criteria

1. WHEN the Filter_Panel is opened, THE Platform SHALL fetch the list of active departments from the backend `Department` catalog and populate the department dropdown.
2. WHEN a department is selected, THE Filter_Panel SHALL fetch the list of active cities belonging to that department from the backend `City` catalog and populate the city dropdown.
3. WHEN no department is selected, THE Filter_Panel SHALL disable the city dropdown and display a helper message "Primero selecciona un departamento".
4. WHEN the department selection changes, THE Filter_Panel SHALL clear the previously selected city and neighborhood values.
5. THE Backend SHALL expose a public `GET` endpoint that returns the list of active departments sorted alphabetically by name.
6. THE Backend SHALL expose a public `GET` endpoint that returns the list of active cities for a given department, sorted alphabetically by name.
7. IF the department or city catalog fetch fails, THEN THE Filter_Panel SHALL display the dropdown with a "No se pudieron cargar las opciones" message and allow the user to retry.

### Requirement 2: Neighborhood and Area Filter Level

**User Story:** As a Tenant, I want to optionally filter by neighborhood or area after selecting a city, so that I can narrow results to a specific zone.

#### Acceptance Criteria

1. WHEN a city is selected in the Filter_Panel, THE Platform SHALL enable the neighborhood text input field for free-text entry.
2. WHERE the "area" additional feature is configured as active and main in the AdditionalFeature catalog, THE Filter_Panel SHALL display it as a filter option alongside the neighborhood field.
3. WHEN filters are applied, THE Backend SHALL filter listings by the selected department, city, and optionally neighborhood or area values.
4. THE Backend listing search endpoint SHALL accept `department`, `city`, `neighborhood`, and additional feature filter parameters.

### Requirement 3: AdditionalFeature Table Schema Extension

**User Story:** As a Landlord, I want additional features to have rich metadata (type, display element, active status, main/advanced classification, required flag, error message), so that the platform can dynamically render and validate them.

#### Acceptance Criteria

1. THE Platform SHALL add the following columns to the `AdditionalFeature` table: `type` (string, catalog-driven — indicates whether the value is numeric or text), `element` (string, catalog-driven — indicates the UI display element such as text field, dropdown, checkbox), `active` (boolean — whether the feature is currently in use), `main` (boolean — whether the feature appears in the basic filter or is an advanced filter option), `required` (boolean — whether the field is required on the frontend when creating or publishing a listing), and `error_message` (string, nullable — the validation error message to display on the frontend).
2. THE Backend SHALL expose an endpoint that returns the list of active additional features with their full metadata (type, element, active, main, required, error_message).
3. WHEN the Filter_Panel loads, THE Platform SHALL fetch active additional features and render those marked as `main: true` in the basic filter section.
4. WHERE an additional feature is marked as `main: false` and `active: true`, THE Filter_Panel SHALL render it in an expandable "Filtros avanzados" section.
5. THE Backend listing search endpoint SHALL accept filter parameters for additional features and filter listings that have matching `PropertyAdditionalFeature` values.

### Requirement 4: Additional Features in Listing Creation and Publishing

**User Story:** As a Landlord, I want to add additional feature information when creating or publishing a property listing, so that tenants can find my property through detailed filters.

#### Acceptance Criteria

1. WHEN a Landlord creates a property or publishes a listing, THE Platform SHALL fetch the list of active additional features from the backend and render input fields according to each feature's `element` type (text field, dropdown, checkbox, etc.).
2. WHEN an additional feature is marked as `required: true`, THE Platform SHALL display the field as required and validate that a value is provided before submission.
3. IF a required additional feature field is left empty, THEN THE Platform SHALL display the feature's configured `error_message` next to the field.
4. WHEN the listing creation form is submitted, THE Backend SHALL persist the additional feature values in the `PropertyAdditionalFeature` table linked to the property.
5. THE Backend SHALL validate that submitted additional feature values match the expected `type` (numeric values for numeric type, text values for text type).
6. IF an additional feature value fails type validation, THEN THE Backend SHALL return a descriptive error indicating the field name and expected type.

### Requirement 5: Keyword Search Bar with Suggestions

**User Story:** As a Tenant or Anonymous_User, I want a keyword search bar on the explore page that suggests structured filters as I type, so that I can quickly build precise search criteria.

#### Acceptance Criteria

1. THE Platform SHALL display a Keyword_Search_Bar at the top of the `/explorar` page.
2. WHEN the `/explorar` page loads, THE Platform SHALL prefetch the catalog data needed for suggestions (departments, cities, property types, and additional features marked as `main: true`) in a single initial load and cache it in client-side state.
3. THE Platform SHALL NOT make API calls on every keystroke. All suggestion filtering SHALL be performed client-side against the prefetched catalog data.
4. WHEN the user types text into the Keyword_Search_Bar, THE Platform SHALL apply a debounce of at least 300ms before computing and displaying the filtered suggestion list from the prefetched catalog data.
5. WHEN the debounced input value changes, THE Platform SHALL display a dropdown of suggested structured filters matching the input (e.g., typing "Cali" suggests "ciudad: Cali") by performing a case-insensitive substring match against the prefetched catalog entries.
6. THE Platform SHALL generate suggestions from the available filter dimensions: department, city, property type, and additional features marked as `main: true`.
7. WHEN the user clicks a suggestion, THE Platform SHALL add it as a Tag_Chip below the Keyword_Search_Bar, clear the text input, and immediately trigger the listing search with the updated filters.
8. WHEN a Tag_Chip is displayed, THE Platform SHALL provide a remove button on the chip that removes the corresponding filter and immediately triggers the listing search with the updated filters.
9. THE Platform SHALL trigger the listing search automatically when a Tag_Chip is added or removed, so that the visible chips always reflect the active search criteria.
10. THE Buscar_Button next to the Keyword_Search_Bar SHALL also trigger the listing search with all active Tag_Chip filters (as a redundant explicit action).
11. WHEN Tag_Chip filters change (via addition or removal), THE Platform SHALL synchronize them with the Filter_Panel state so both mechanisms reflect the same active filters.
12. THE Buscar_Button SHALL be visually proportionate to the search input (minimum width 80px, wider padding) and the search bar row SHALL align horizontally with the Filter/Sort action bar below it.

### Requirement 6: Landing Page

**User Story:** As an Anonymous_User, I want a landing page that explains the platform's purpose and provides a clear path to search listings, so that I understand the value proposition before exploring.

#### Acceptance Criteria

1. THE Platform SHALL display a Landing_Page at the root URL (`/`) instead of redirecting to `/explorar`.
2. THE Landing_Page SHALL include a hero section with a visual icon, a heading, and a brief description of the platform's purpose (facilitating urban housing rental in Colombia).
3. THE Landing_Page SHALL include a prominent "Buscar inmuebles" call-to-action button that navigates to the `/explorar` page.
4. THE Landing_Page SHALL include a responsive navigation bar: on desktop, showing links to Explorar, Iniciar sesión, and Registrarse; on mobile, showing compact "Ingresar" and "Registrarse" buttons to avoid crowding the logo.
5. THE Landing_Page SHALL include a value propositions section with three items (Sencillo, Seguro, Accesible), each with an icon and short description, displayed in a three-column grid on desktop and stacked vertically on mobile.
6. THE Landing_Page SHALL include a footer with copyright information.
7. THE Landing_Page SHALL follow the platform's mobile-first responsive design, using the established design system tokens (typography, colors, spacing).
8. THE Landing_Page SHALL meet WCAG 2.1 AA accessibility standards (contrast ratio ≥ 4.5:1, touch targets ≥ 44px).
9. THE Landing_Page SHALL NOT make any API calls — it SHALL be a fully static page for fast LCP.

### Requirement 7: Lease Detail Page Redesign with Cards

**User Story:** As a Landlord, I want the lease detail page to present information in visually organized cards instead of a flat list, so that the page is easier to read and consistent with the rest of the platform.

#### Acceptance Criteria

1. THE Lease_Detail_Page SHALL organize information into distinct card sections: "Inmueble" (property details), "Arrendatario" (tenant details), and "Acuerdo" (lease terms).
2. EACH card section SHALL have a visible border or background that visually separates it from adjacent sections, consistent with the platform's card styling patterns.
3. THE Lease_Detail_Page SHALL display the lease status using the shared `StatusBadge` component with the `lease` variant.
4. THE Lease_Detail_Page SHALL maintain all existing information fields (property type, rooms, bathrooms, area, address, tenant name, document, email, phone, monthly amount, start date).
5. THE Lease_Detail_Page SHALL follow the platform's mobile-first responsive design and accessibility standards (WCAG 2.1 AA).
6. THE UnitCard component SHALL always display the "Ver historial de arriendos" link regardless of unit status (Ocupado or Disponible), providing a consistent navigation path to the lease history.

### Requirement 8: Lease Cancellation Mechanism

**User Story:** As a Landlord, I want to cancel or delete a lease when either party changes their mind, so that the property unit is not stuck in "Acordado" status and "Ocupado" lease status indefinitely.

#### Acceptance Criteria

1. WHEN a Landlord views a lease with status "Acordado", THE Lease_Detail_Page SHALL display a "Cancelar arriendo" action button.
2. WHEN the Landlord clicks "Cancelar arriendo", THE Platform SHALL display a confirmation dialog explaining the consequences of cancellation.
3. WHEN the Landlord confirms the cancellation, THE Backend SHALL soft-delete the lease record (set `deleted_at`), update the unit status back to "Disponible", and update the lease tracking status to "Finalizado".
4. IF the lease has an associated contract with status "PENDING" or "SIGNATURE_PENDING", THEN THE Backend SHALL also soft-delete the contract record when the lease is cancelled.
5. IF the lease has an associated contract with status "SIGNED", THEN THE Platform SHALL prevent cancellation and display a message indicating that a signed contract cannot be cancelled through this mechanism.
6. WHEN a lease is successfully cancelled, THE Platform SHALL navigate the Landlord back to the unit detail page and display a success confirmation message.
7. THE Backend SHALL verify that the requesting user is the owner of the portfolio containing the lease before allowing cancellation (resource ownership check).
8. AFTER a lease is cancelled (soft-deleted), THE Platform SHALL exclude it from all active lease counts, unit status derivation, and lease list queries. Specifically: the unit SHALL show as "Disponible" (not "Ocupado"), the portfolio "Arriendos activos" counter SHALL NOT count the cancelled lease, and the unit's lease list SHALL NOT display the cancelled lease.
9. AFTER a lease is cancelled and its associated contract is soft-deleted, THE Platform SHALL exclude the soft-deleted contract from the landlord's "Mis contratos" list and the tenant's contract list. Soft-deleted contracts SHALL NOT appear with active statuses like "Firma pendiente".

### Requirement 9: Contract Screens Visual Consistency

**User Story:** As a Landlord, I want contract-related screens to be visually consistent with the rest of the platform, so that the experience feels cohesive and professional.

#### Acceptance Criteria

1. THE Contract_Screen list view SHALL display each contract in a card format consistent with the platform's card styling patterns (visible border or background, consistent spacing).
2. THE Contract_Screen detail view SHALL organize contract information into card sections: "Términos" (dates, amounts), "Partes" (landlord and tenant), and "Documento" (file and signing status).
3. THE Contract_Screen creation wizard SHALL use the platform's established form styling (design system typography tokens, Primary_Button_Style for CTAs, consistent input field styling).
4. ALL Contract_Screen pages SHALL use the shared `StatusBadge` component with the `contract` variant for displaying contract status.
5. ALL Contract_Screen pages SHALL follow the platform's mobile-first responsive design and accessibility standards (WCAG 2.1 AA).
6. THE Contract_Screen detail view SHALL display party names as human-readable names (resolved from NaturalPersonDetail or LegalPersonDetail cross-schema) instead of raw user IDs.

### Requirement 10: Fix "Fecha de inicio: Invalid Date" Bug in Contract Creation

**User Story:** As a Landlord, I want the contract creation flow to correctly handle the start date field, so that I do not see "Fecha de inicio: Invalid Date" when creating a contract.

#### Acceptance Criteria

1. WHEN a Landlord creates a contract through the wizard, THE Platform SHALL correctly parse and display the start date in all steps and in the contract detail view after creation.
2. WHEN the contract start date is submitted to the Backend, THE Backend SHALL validate that the date is a valid ISO 8601 date string and return a descriptive error if it is not.
3. IF the start date value is empty, null, or an invalid date string, THEN THE Platform SHALL display a validation error "La fecha de inicio es obligatoria" instead of rendering "Invalid Date".
4. WHEN a contract is created successfully, THE Contract_Screen detail view SHALL display the start date formatted as `DD/MM/YYYY` without any "Invalid Date" text.
