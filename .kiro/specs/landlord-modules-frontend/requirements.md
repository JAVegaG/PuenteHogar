# Requirements Document — Landlord Modules Frontend

## Introduction

This document specifies the requirements for the remaining landlord-facing frontend modules of the rental platform. These modules cover the screens visible in the Figma design file that have NOT been implemented yet. The already-implemented modules are: `explore-properties-frontend`, `users-auth-frontend`, and `landlord-portfolio-frontend`.

The modules to implement are:

1. **Mis ingresos / Accounting Overview** — Dashboard showing total monthly income, total properties, active leases, portfolio income summaries, and navigation to detailed reports.
2. **Reporte de portafolio / Aggregated Report** — Portfolio-level income report with period filters, summary cards, and per-property detail table.
3. **Reporte de inmueble / Individual Unit Report** — Unit-level income report with period filters, summary cards, and lease history.
4. **Crear contrato / Contract Creation Wizard** — Multi-step form (3 steps: Arrendatario, Términos, Documento) for initiating a contract from a lease.
5. **Detalle del arriendo / Lease Detail** — Read-only view of a lease with property info, tenant info, agreement terms, and contract generation action.
6. **Arriendos de la unidad / Unit Leases History** — List of all leases for a portfolio unit with status badges and contextual actions.
7. **Publicar en arriendo / Publish Listing** — Flow for a landlord to publish a portfolio unit as a listing on the "Explorar inmuebles" screen, including photo uploads, title, description, and price.
8. **Crear arriendo / Create Lease** — Form for a landlord to create a new lease for a portfolio unit by specifying the tenant email and lease dates.

The frontend is implemented as part of the existing Next.js (App Router) application in `src/frontend/`, with Tailwind CSS and TypeScript, following a mobile-first approach and WCAG 2.1 AA accessibility compliance. The UI text is in Spanish; all code identifiers are in English. The modules integrate with the existing design system tokens, shared components (Header, SideMenu, Button, Skeleton, EmptyState, ErrorState, Pagination), AuthProvider, AuthService, and PortfolioService.

The backend already exposes the following relevant endpoints:
- `POST /accounting/reports/portfolio/:portfolioId/aggregated` — Aggregated income report by period
- `POST /accounting/reports/portfolio/:portfolioId/unit/:unitId` — Individual unit income report by period
- `POST /contracts` — Upload/create a contract for a lease
- `GET /contracts/:id` — Get contract summary
- `POST /contracts/:id/sign` — Initiate digital signing
- `GET /portfolio` — List landlord portfolios (paginated)
- `GET /portfolio/:portfolioId/units` — List units of a portfolio
- `POST /listings` — Create a listing (publish a portfolio unit with title, description, price, and photos)

The Figma design reference: `https://www.figma.com/design/Yw53CFbVdMWVX7bQ6MFefk/properties_rental_platform_design`

**Out of scope:** Tenant-facing modules, payment processing screens, notification management, real e-signature integration (MVP uses stubs), real payment gateway integration (MVP uses stubs).

---

## Glossary

- **App_Frontend**: The existing Next.js (App Router) application in `src/frontend/`.
- **Módulo_Arrendador**: The set of new pages, components, services, and types for landlord accounting, lease management, and contract creation, located in `src/frontend/modules/landlord-accounting/`, `src/frontend/modules/landlord-leases/`, `src/frontend/modules/landlord-contracts/`, and corresponding `src/frontend/app/` routes.
- **Página_Ingresos**: Protected page at route `/mis-ingresos` showing the landlord's accounting overview dashboard.
- **Página_Reporte_Portafolio**: Protected page at route `/mis-ingresos/portafolio/[portfolioId]` showing the aggregated income report for a specific portfolio.
- **Página_Reporte_Unidad**: Protected page at route `/mis-ingresos/portafolio/[portfolioId]/unidad/[unitId]` showing the individual income report for a specific portfolio unit.
- **Página_Arriendos_Unidad**: Protected page at route `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos` showing the lease history for a specific portfolio unit.
- **Página_Detalle_Arriendo**: Protected page at route `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos/[leaseId]` showing the full detail of a specific lease.
- **Página_Crear_Contrato**: Protected page at route `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos/[leaseId]/crear-contrato` implementing the multi-step contract creation wizard.
- **Tarjeta_Portafolio_Ingresos**: Card component in Página_Ingresos showing a portfolio name, property count, and income summary with actions "Ver reporte" and "Ver inmuebles".
- **Tabla_Detalle_Propiedades**: Table component in Página_Reporte_Portafolio showing per-property rows with address, neighborhood, monthly income, and payment status.
- **Tarjeta_Arriendo**: Card component in Página_Arriendos_Unidad showing a lease with tenant name, period, monthly amount, and status badge.
- **Filtro_Periodo**: Period filter tabs component with options: "Último mes", "Últimos 3 meses", "Últimos 6 meses", "Último año".
- **Tarjeta_Resumen**: Summary metric card showing a label and a formatted value (e.g., "Ingresos recibidos", "$4.200.000").
- **Badge_Estado**: Visual badge component displaying lease status (e.g., "Vigente", "Acordado", "Finalizado") with color coding.
- **Wizard_Contrato**: Multi-step form component with progress indicator (3 steps) for contract creation.
- **AccountingService**: Service layer in `src/frontend/shared/services/` encapsulating HTTP calls to the accounting backend endpoints.
- **ContractService**: Service layer in `src/frontend/shared/services/` encapsulating HTTP calls to the contracts backend endpoints.
- **LeaseService**: Service layer in `src/frontend/shared/services/` encapsulating HTTP calls to lease-related backend endpoints.
- **API_Backend**: The NestJS server exposing REST endpoints for accounting, contracts, and portfolio management.
- **Token_JWT**: JWT access token used to authenticate protected requests.
- **AuthProvider**: Existing React Context managing global authentication state.
- **ProtectedRoute**: Existing component verifying authentication before rendering protected content.
- **Sistema_Diseño**: Design tokens already configured in `globals.css` (colors, typography, spacing) and shared components.
- **Arrendador**: Authenticated user with role LANDLORD who manages rental properties.
- **Arrendatario**: Tenant user associated with a lease.
- **Lease**: A rental agreement record associated with a portfolio unit, with tenant, start date, end date, and status.
- **Contract**: A legal document record associated with a lease, with status (PENDING, SIGNATURE_PENDING, SIGNED), file URL, and parties.
- **Página_Publicar_Arriendo**: Protected page at route `/mi-portafolio/[portfolioId]/unidades/[unitId]/publicar` implementing the listing publication form for a portfolio unit.
- **Tarjeta_Unidad_Portafolio**: Enhanced unit card component in the portfolio units list showing unit details, status badge ("Ocupado", "Disponible", "Mantenimiento"), and contextual actions including "Publicar en arriendo" for available units and "Ver historial" link.
- **ListingService**: The existing service layer in `src/frontend/shared/services/` that encapsulates HTTP calls to the listings backend endpoints, extended to support `POST /listings` for creating new listings.
- **Página_Crear_Arriendo**: Protected page at route `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos/crear` implementing the lease creation form for a portfolio unit.

---

## Requirements

### Requirement 1: Accounting Service Integration (AccountingService)

**User Story:** As a developer, I want a service layer that encapsulates HTTP calls to the accounting and lease-related backend endpoints, so that the frontend modules can fetch income reports and lease data in a consistent, typed manner.

#### Acceptance Criteria

1. THE AccountingService SHALL encapsulate HTTP calls to the API_Backend in typed TypeScript functions for the endpoints `POST /accounting/reports/portfolio/:portfolioId/aggregated` and `POST /accounting/reports/portfolio/:portfolioId/unit/:unitId`.
2. THE AccountingService SHALL use the environment variable `NEXT_PUBLIC_API_URL` as the base URL for all requests to the API_Backend.
3. THE AccountingService SHALL attach the header `Authorization: Bearer <token>` on all requests, obtaining the token from `localStorage` under the key `auth_token`.
4. THE AccountingService SHALL define TypeScript interfaces reflecting the request and response structures: `PeriodRequest` (year: number, month: number), `AggregatedReportResponse` (portfolioId, periodStart, periodEnd, currency, numberOfUnits, totalAmount, avgAmount, paymentCount, minAmount, maxAmount, expectedAmount, overdueCount, message?), and `IndividualReportResponse` (portfolioUnitId, periodStart, periodEnd, currency, totalAmount, minAmount, maxAmount, paymentCount, expectedAmount, overdueCount, message?).
5. IF a request to the API_Backend fails with status 401, THEN THE AccountingService SHALL propagate an error with the message "Sesión expirada".
6. IF a request to the API_Backend fails with status 403, THEN THE AccountingService SHALL propagate an error with the message "No tienes permiso para acceder a reportes contables".
7. IF a request to the API_Backend fails due to a network error or server error (5xx), THEN THE AccountingService SHALL propagate an error with the message "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo." for network errors, or "Error del servidor. Intenta de nuevo más tarde." for 5xx errors.
8. THE AccountingService SHALL use the native `fetch` API for HTTP requests, consistent with the pattern established in the existing PortfolioService and AuthService.

---

### Requirement 2: Contract Service Integration (ContractService)

**User Story:** As a developer, I want a service layer that encapsulates HTTP calls to the contracts backend endpoints, so that the frontend can create contracts, fetch contract summaries, and initiate signing processes.

#### Acceptance Criteria

1. THE ContractService SHALL encapsulate HTTP calls to the API_Backend in typed TypeScript functions for the endpoints `POST /contracts` (upload/create contract), `GET /contracts/:id` (get contract summary), and `POST /contracts/:id/sign` (initiate signing).
2. THE ContractService SHALL use the environment variable `NEXT_PUBLIC_API_URL` as the base URL for all requests to the API_Backend.
3. THE ContractService SHALL attach the header `Authorization: Bearer <token>` on all requests, obtaining the token from `localStorage` under the key `auth_token`.
4. THE ContractService SHALL define TypeScript interfaces: `UploadContractRequest` (leaseId: string, startDate: string, endDate?: string, fileUrl: string, fileSizeBytes?: number, mimeType?: string), `ContractParty` (userId: string, role: string), and `ContractSummary` (id, leaseId, status, startDate, endDate, fileUrl, signedAt, externalSigningId, parties: ContractParty[]).
5. IF a request to the API_Backend fails with status 401, THEN THE ContractService SHALL propagate an error with the message "Sesión expirada".
6. IF a request to the API_Backend fails with status 403, THEN THE ContractService SHALL propagate an error with the message "No tienes permiso para realizar esta acción".
7. IF a request to the API_Backend fails with status 404, THEN THE ContractService SHALL propagate an error with the message "Contrato no encontrado".
8. IF a request to the API_Backend fails with status 422, THEN THE ContractService SHALL propagate an error with the message "Solo se permiten archivos PDF de máximo 10 MB".
9. IF a request to the API_Backend fails due to a network error or server error (5xx), THEN THE ContractService SHALL propagate an error with the message "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo." for network errors, or "Error del servidor. Intenta de nuevo más tarde." for 5xx errors.
10. THE ContractService SHALL use the native `fetch` API for HTTP requests, consistent with the existing service patterns.

---

### Requirement 3: Accounting Overview Page (Mis ingresos)

**User Story:** As an authenticated landlord, I want to see a dashboard summarizing my total monthly income, total properties, and active leases across all portfolios, so that I can quickly assess my rental business performance.

#### Acceptance Criteria

1. WHEN an Arrendador accesses the route `/mis-ingresos`, THE Página_Ingresos SHALL request the list of portfolios from the API_Backend via `GET /portfolio` with the Token_JWT in the authorization header and display the results as a dashboard.
2. THE Página_Ingresos SHALL include a fixed header with bottom border containing a hamburger menu button on the left and the title "Mis ingresos" centered, using the H1 typographic hierarchy (32px Bold, color `#111827`) of the Sistema_Diseño.
3. THE Página_Ingresos SHALL display summary cards at the top showing: "Ingresos del mes" (total monthly income formatted in COP), "Total inmuebles" (total number of portfolio units), and "Arriendos activos" (total number of active leases), each as a Tarjeta_Resumen with label in text-caption color `#4b5563` and value in text-h3 font-semibold color `#111827`.
4. THE Página_Ingresos SHALL display a section titled "Mis portafolios" (text-h3 font-semibold) with a list of Tarjeta_Portafolio_Ingresos, one per portfolio.
5. THE Tarjeta_Portafolio_Ingresos SHALL display the portfolio name (text-body font-semibold), the number of properties (text-caption color `#4b5563`), and the total income for the current month formatted in COP (text-h3 font-semibold color primary `#1d4ed8`).
6. THE Tarjeta_Portafolio_Ingresos SHALL include two action buttons: "Ver reporte" (navigates to Página_Reporte_Portafolio at `/mis-ingresos/portafolio/[portfolioId]`) and "Ver inmuebles" (navigates to the portfolio detail at `/mi-portafolio/[portfolioId]`).
7. WHILE the portfolio data is loading from the API_Backend, THE Página_Ingresos SHALL display a skeleton loading indicator.
8. IF the API_Backend returns an empty portfolio list, THEN THE Página_Ingresos SHALL display a message in Spanish indicating that the landlord has no portfolios, with a suggestion to create one.
9. IF the request to the API_Backend fails due to a network error or server error, THEN THE Página_Ingresos SHALL display an error message in Spanish with a retry option.
10. IF the Token_JWT is invalid or expired (error 401), THEN THE Página_Ingresos SHALL invoke the `logout` function of the AuthProvider.
11. THE Página_Ingresos SHALL be accessible only to authenticated users with role LANDLORD; IF a user without LANDLORD role accesses the route, THEN THE Página_Ingresos SHALL display a message indicating insufficient permissions.
12. THE Página_Ingresos SHALL use a single-column layout on mobile devices, following the mobile-first approach of the Sistema_Diseño.

---

### Requirement 4: Aggregated Portfolio Report Page (Reporte de portafolio)

**User Story:** As an authenticated landlord, I want to see an aggregated income report for a specific portfolio with period filters and per-property details, so that I can analyze the financial performance of my portfolio.

#### Acceptance Criteria

1. WHEN an Arrendador accesses the route `/mis-ingresos/portafolio/[portfolioId]`, THE Página_Reporte_Portafolio SHALL display a header with the portfolio name and property count, and request the aggregated report from the API_Backend via `POST /accounting/reports/portfolio/:portfolioId/aggregated` with the selected period.
2. THE Página_Reporte_Portafolio SHALL include a fixed header with bottom border containing a back button (left arrow) that navigates to Página_Ingresos and the title "Reporte de portafolio" centered (H1 32px Bold, color `#111827`).
3. THE Página_Reporte_Portafolio SHALL display a Filtro_Periodo component with four selectable tabs: "Último mes" (1 month), "Últimos 3 meses" (3 months), "Últimos 6 meses" (6 months), "Último año" (12 months). The default selected tab SHALL be "Último mes".
4. WHEN the user selects a different period tab, THE Página_Reporte_Portafolio SHALL request a new aggregated report from the API_Backend with the updated period parameters and display the updated results.
5. THE Página_Reporte_Portafolio SHALL display two Tarjeta_Resumen cards: "Ingresos recibidos" (totalAmount formatted in COP, color primary `#1d4ed8`) and "Ingresos esperados" (expectedAmount formatted in COP, color `#111827`).
6. THE Página_Reporte_Portafolio SHALL display a Tabla_Detalle_Propiedades showing one row per portfolio unit with columns: address (text-body), neighborhood (text-caption color `#4b5563`), monthly income formatted in COP (text-body font-semibold), and payment status as a Badge_Estado ("Al día" in green/success color or "Pendiente" in warning color).
7. THE Página_Reporte_Portafolio SHALL include an "Exportar reporte" button (secondary variant, full width) at the bottom of the page. For MVP, WHEN the user presses this button, THE Página_Reporte_Portafolio SHALL display a toast message "Funcionalidad disponible próximamente" since export is a post-MVP feature.
8. WHILE the report data is loading from the API_Backend, THE Página_Reporte_Portafolio SHALL display a skeleton loading indicator.
9. IF the API_Backend returns a report with zero payments, THEN THE Página_Reporte_Portafolio SHALL display the summary cards with $0 values and show an empty state message in the detail table indicating no payments were found for the selected period.
10. IF the request to the API_Backend fails due to a network error or server error, THEN THE Página_Reporte_Portafolio SHALL display an error message in Spanish with a retry option.
11. IF the Token_JWT is invalid or expired (error 401), THEN THE Página_Reporte_Portafolio SHALL invoke the `logout` function of the AuthProvider.
12. THE Página_Reporte_Portafolio SHALL be accessible only to authenticated users with role LANDLORD.

---

### Requirement 5: Individual Unit Report Page (Reporte de inmueble)

**User Story:** As an authenticated landlord, I want to see an individual income report for a specific portfolio unit with period filters and lease history, so that I can track the financial performance and tenant history of a single property.

#### Acceptance Criteria

1. WHEN an Arrendador accesses the route `/mis-ingresos/portafolio/[portfolioId]/unidad/[unitId]`, THE Página_Reporte_Unidad SHALL display a header with the property address and neighborhood, and request the individual report from the API_Backend via `POST /accounting/reports/portfolio/:portfolioId/unit/:unitId` with the selected period.
2. THE Página_Reporte_Unidad SHALL include a fixed header with bottom border containing a back button (left arrow) that navigates to Página_Reporte_Portafolio and the title "Reporte de inmueble" centered (H1 32px Bold, color `#111827`).
3. THE Página_Reporte_Unidad SHALL display the same Filtro_Periodo component as Página_Reporte_Portafolio with four selectable tabs: "Último mes", "Últimos 3 meses", "Últimos 6 meses", "Último año". The default selected tab SHALL be "Último mes".
4. WHEN the user selects a different period tab, THE Página_Reporte_Unidad SHALL request a new individual report from the API_Backend with the updated period parameters and display the updated results.
5. THE Página_Reporte_Unidad SHALL display two Tarjeta_Resumen cards: "Ingresos recibidos" (totalAmount formatted in COP, color primary `#1d4ed8`) and "Ingresos esperados" (expectedAmount formatted in COP, color `#111827`).
6. THE Página_Reporte_Unidad SHALL display a "Historial de arriendos" section (text-h3 font-semibold) showing lease records with: tenant name (text-body font-semibold), lease status as Badge_Estado, lease period formatted as "DD/MM/YYYY - DD/MM/YYYY" (text-caption color `#4b5563`), and monthly amount formatted in COP (text-body color primary).
7. THE Página_Reporte_Unidad SHALL include a "Ver pagos" action link per lease record that navigates to the lease payment detail. For MVP, WHEN the user presses this link, THE Página_Reporte_Unidad SHALL display a toast message "Funcionalidad disponible próximamente" since payment detail is a post-MVP feature.
8. THE Página_Reporte_Unidad SHALL include an "Exportar reporte" button (secondary variant, full width) at the bottom. For MVP, WHEN the user presses this button, THE Página_Reporte_Unidad SHALL display a toast message "Funcionalidad disponible próximamente".
9. WHILE the report data is loading from the API_Backend, THE Página_Reporte_Unidad SHALL display a skeleton loading indicator.
10. IF the API_Backend returns a report with zero payments, THEN THE Página_Reporte_Unidad SHALL display the summary cards with $0 values and show an empty state message in the lease history section.
11. IF the request to the API_Backend fails due to a network error or server error, THEN THE Página_Reporte_Unidad SHALL display an error message in Spanish with a retry option.
12. IF the Token_JWT is invalid or expired (error 401), THEN THE Página_Reporte_Unidad SHALL invoke the `logout` function of the AuthProvider.
13. THE Página_Reporte_Unidad SHALL be accessible only to authenticated users with role LANDLORD.

---

### Requirement 6: Unit Leases History Page (Arriendos de la unidad)

**User Story:** As an authenticated landlord, I want to see all leases associated with a specific portfolio unit, including their status and key details, so that I can manage the rental history of each property.

#### Acceptance Criteria

1. WHEN an Arrendador accesses the route `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos`, THE Página_Arriendos_Unidad SHALL request the unit details and associated leases from the API_Backend and display the results.
2. THE Página_Arriendos_Unidad SHALL include a fixed header with bottom border containing a back button (left arrow) that navigates to the portfolio unit detail and the title "Arriendos de la unidad" centered (H1 32px Bold, color `#111827`).
3. THE Página_Arriendos_Unidad SHALL display a unit information header showing: unit name (text-h3 font-semibold), property type (text-caption color `#4b5563`), address (text-caption color `#4b5563`), and property details as compact badges (rooms, bathrooms, area in m²) with background `#f3f4f6` and border-radius 4px.
4. THE Página_Arriendos_Unidad SHALL include a primary button "+ Crear nuevo arriendo para esta unidad" (full width, background primary `#1d4ed8`, text white) below the unit header that navigates to Página_Crear_Arriendo at `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos/crear`.
5. THE Página_Arriendos_Unidad SHALL display a list of Tarjeta_Arriendo components, one per lease, ordered by start date descending (most recent first).
6. THE Tarjeta_Arriendo SHALL display: tenant name (text-body font-semibold), lease period formatted as "DD/MM/YYYY - DD/MM/YYYY" or "DD/MM/YYYY - Vigente" for open-ended leases (text-caption color `#4b5563`), monthly amount formatted in COP (text-h3 font-semibold color primary `#1d4ed8`), and a Badge_Estado showing the lease status.
7. THE Badge_Estado SHALL render with the following color mapping: "Vigente" (active) with background `#DCFCE7` and text `#166534` (success), "Acordado" (agreed) with background `#DBEAFE` and text `#1E40AF` (info), "Finalizado" (ended) with background `#F3F4F6` and text `#4B5563` (neutral).
8. THE Tarjeta_Arriendo SHALL include contextual action buttons based on lease status: "Ver detalle" (always visible, navigates to Página_Detalle_Arriendo), "Generar contrato" (visible when no contract exists, navigates to Página_Crear_Contrato), "Ver contrato" (visible when a contract exists with status PENDING or SIGNATURE_PENDING), "Ver contrato archivado" (visible when a contract exists with status SIGNED).
9. WHILE the lease data is loading from the API_Backend, THE Página_Arriendos_Unidad SHALL display a skeleton loading indicator.
10. IF the unit has no leases, THEN THE Página_Arriendos_Unidad SHALL display an empty state message in Spanish indicating no leases exist for this unit, with a suggestion to create a new lease.
11. IF the request to the API_Backend fails due to a network error or server error, THEN THE Página_Arriendos_Unidad SHALL display an error message in Spanish with a retry option.
12. IF the Token_JWT is invalid or expired (error 401), THEN THE Página_Arriendos_Unidad SHALL invoke the `logout` function of the AuthProvider.
13. THE Página_Arriendos_Unidad SHALL be accessible only to authenticated users with role LANDLORD.

---

### Requirement 7: Lease Detail Page (Detalle del arriendo)

**User Story:** As an authenticated landlord, I want to see the full detail of a specific lease including property information, tenant data, and agreement terms, so that I can review the lease before generating a contract.

#### Acceptance Criteria

1. WHEN an Arrendador accesses the route `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos/[leaseId]`, THE Página_Detalle_Arriendo SHALL request the lease details from the API_Backend and display the complete information.
2. THE Página_Detalle_Arriendo SHALL include a fixed header with bottom border containing a back button (left arrow) that navigates to Página_Arriendos_Unidad and the title "Detalle del arriendo" centered (H1 32px Bold, color `#111827`).
3. THE Página_Detalle_Arriendo SHALL display a Badge_Estado at the top showing the current lease status (e.g., "Acordado", "Vigente") with the color mapping defined in Requirement 6.
4. THE Página_Detalle_Arriendo SHALL display a "Inmueble" section (text-h3 font-semibold) showing: property type, number of rooms, number of bathrooms, area in m², and full address, each as a labeled field with label in text-caption font-medium color `#4b5563` and value in text-body color `#111827`.
5. THE Página_Detalle_Arriendo SHALL display an "Arrendatario" section (text-h3 font-semibold) showing: tenant full name, document type and number, email, and phone number, each as a labeled field with the same styling pattern.
6. THE Página_Detalle_Arriendo SHALL display an "Acuerdo" section (text-h3 font-semibold) showing: monthly rent formatted in COP (text-h3 font-semibold color primary `#1d4ed8`), agreement date formatted as "DD/MM/YYYY", and proposed start date formatted as "DD/MM/YYYY".
7. THE Página_Detalle_Arriendo SHALL include a primary button "Generar contrato" (full width, background primary `#1d4ed8`, text white, min-height 44px) at the bottom that navigates to Página_Crear_Contrato. IF a contract already exists for this lease, THEN the button text SHALL change to "Ver contrato" and navigate to the contract detail instead.
8. WHILE the lease data is loading from the API_Backend, THE Página_Detalle_Arriendo SHALL display a skeleton loading indicator.
9. IF the API_Backend returns a 404 error for the lease, THEN THE Página_Detalle_Arriendo SHALL display a message in Spanish indicating the lease was not found, with a link to return to Página_Arriendos_Unidad.
10. IF the request to the API_Backend fails due to a network error or server error, THEN THE Página_Detalle_Arriendo SHALL display an error message in Spanish with a retry option.
11. IF the Token_JWT is invalid or expired (error 401), THEN THE Página_Detalle_Arriendo SHALL invoke the `logout` function of the AuthProvider.
12. THE Página_Detalle_Arriendo SHALL be accessible only to authenticated users with role LANDLORD.

---

### Requirement 8: Contract Creation Wizard Page (Crear contrato)

**User Story:** As an authenticated landlord, I want to create a contract for a lease through a guided multi-step wizard, so that I can formalize the rental agreement with the tenant.

#### Acceptance Criteria

1. WHEN an Arrendador accesses the route `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos/[leaseId]/crear-contrato`, THE Página_Crear_Contrato SHALL display the Wizard_Contrato as a 3-step process with a visual progress indicator showing the current step (1, 2, or 3) and the step labels: "Arrendatario", "Términos", "Documento".
2. THE Página_Crear_Contrato SHALL include a fixed header with bottom border containing a back button (left arrow) that navigates to the previous step or to Página_Detalle_Arriendo if the user is on step 1, and the title "Crear contrato" centered (H1 32px Bold, color `#111827`).
3. THE Página_Crear_Contrato SHALL display a property info header above the wizard steps showing the unit name and address (text-caption color `#4b5563`), providing context about which property the contract is for.
4. THE Wizard_Contrato SHALL present in Step 1 ("Arrendatario") the tenant data fields: first name (nombre), last name (apellido), document type (tipo de documento, dropdown), document number (número de documento), email (correo electrónico), and phone number (teléfono). These fields SHALL be pre-populated from the lease tenant data when available and editable by the landlord.
5. THE Wizard_Contrato SHALL validate in Step 1 that all required fields are non-empty: IF first name is empty, THEN SHALL show "El nombre es obligatorio"; IF last name is empty, THEN SHALL show "El apellido es obligatorio"; IF document type is not selected, THEN SHALL show "Selecciona un tipo de documento"; IF document number is empty, THEN SHALL show "El número de documento es obligatorio"; IF email is empty or has invalid format, THEN SHALL show "Ingresa un correo electrónico válido"; IF phone number is empty or does not have exactly 10 digits, THEN SHALL show "El teléfono debe tener exactamente 10 dígitos".
6. THE Wizard_Contrato SHALL display a prominent notice box (background `#FEF3C7`, border `#F59E0B`, border-radius 6px, padding 16px) in Step 1 with the text: "Importante: Esta plataforma no genera contratos legalmente vinculantes. El contrato generado es un documento de referencia. Consulte con un abogado para formalizar el acuerdo." using text-caption color `#92400E`.
7. THE Wizard_Contrato SHALL include a primary button "Continuar a términos del contrato" at the bottom of Step 1 that validates all fields before advancing to Step 2.
8. THE Wizard_Contrato SHALL present in Step 2 ("Términos") the contract terms fields: contract start date (fecha de inicio), contract end date (fecha de fin, optional), and monthly rent amount (canon mensual, pre-populated from lease base amount, formatted in COP using formatCOP/stripCOP helpers).
9. THE Wizard_Contrato SHALL validate in Step 2 that the start date is not empty and is a valid date; IF the end date is provided, THEN the end date SHALL be after the start date; IF the monthly rent is empty or not a valid positive number, THEN SHALL show "El canon mensual es obligatorio y debe ser un valor positivo".
10. THE Wizard_Contrato SHALL present in Step 3 ("Documento") a file upload area for the contract PDF document. For MVP, THE Wizard_Contrato SHALL display a placeholder upload area with the text "Seleccionar archivo PDF" and accept only PDF files. The actual file upload SHALL use the MVP stub (ObjectStorageAdapter returns a placeholder S3 URL).
11. THE Wizard_Contrato SHALL validate in Step 3 that a file has been selected; IF no file is selected, THEN SHALL show "Debes seleccionar un archivo PDF para continuar".
12. THE Wizard_Contrato SHALL preserve all data entered by the user when navigating between steps (forward and backward) without losing information.
13. WHEN the user completes Step 3 and presses "Crear contrato", THE Wizard_Contrato SHALL send the collected data to the API_Backend via `POST /contracts` with the lease ID, start date, end date, and file URL.
14. WHILE the contract creation request is being processed, THE Wizard_Contrato SHALL disable the submit button and show a loading indicator.
15. WHEN the API_Backend returns a successful response, THE Página_Crear_Contrato SHALL display a success message in Spanish and redirect the landlord to Página_Detalle_Arriendo.
16. IF the API_Backend returns a 403 error, THEN THE Página_Crear_Contrato SHALL display the error message "No tienes permiso para crear un contrato para este arriendo".
17. IF the API_Backend returns a 422 error, THEN THE Página_Crear_Contrato SHALL display the error message "Solo se permiten archivos PDF de máximo 10 MB".
18. IF the request to the API_Backend fails due to a network error or server error, THEN THE Página_Crear_Contrato SHALL display an error message in Spanish, preserving all entered data.
19. THE Página_Crear_Contrato SHALL be accessible only to authenticated users with role LANDLORD.

---

### Requirement 9: Publish Listing Page (Publicar en arriendo)

**User Story:** As an authenticated landlord, I want to publish a portfolio unit as a listing on the "Explorar inmuebles" screen by providing a title, description, price, and uploading photos, so that tenants can discover my property.

#### Acceptance Criteria

1. WHEN an Arrendador accesses the route `/mi-portafolio/[portfolioId]/unidades/[unitId]/publicar`, THE Página_Publicar_Arriendo SHALL display a publication form pre-populated with the unit's property information (name, type, area, rooms, bathrooms, address) in a read-only summary card at the top.
2. THE Página_Publicar_Arriendo SHALL include a fixed header with bottom border containing a back button (left arrow) that navigates to the portfolio units page and the title "Publicar en arriendo" centered (H1 32px Bold, color `#111827`).
3. THE Página_Publicar_Arriendo SHALL display an informational notice box (background `#DBEAFE`, border `#1d4ed8`, border-radius 6px, padding 16px) with the title "Publicación en Explorar" (text-body font-semibold) and the text: "Esta unidad aparecerá en la sección 'Explorar inmuebles' donde los arrendatarios pueden buscar propiedades disponibles. Debes agregar al menos 3 fotos de calidad." using text-caption color `#4b5563`.
4. THE Página_Publicar_Arriendo SHALL include a "Fotos de la unidad *" section (text-body font-semibold) with helper text "Sube al menos 3 fotos de la propiedad. Las fotos de buena calidad atraen más arrendatarios." (text-caption color `#4b5563`).
5. THE Página_Publicar_Arriendo SHALL include a photo upload area with a dashed border container (border `#d1d5db`, border-radius 6px) containing an upload icon and the text "Subir foto", allowing the user to select image files (JPEG, PNG, WebP). The upload area SHALL accept up to 10 photos.
6. THE Página_Publicar_Arriendo SHALL display a photo counter below the upload area showing "X de 10 fotos" on the left and "Faltan Y fotos" on the right (where Y = max(0, 3 - currentCount)), both in text-caption color `#4b5563`.
7. THE Página_Publicar_Arriendo SHALL display uploaded photos as thumbnail previews (aspect ratio 1:1, border-radius 6px) in a horizontal scrollable row, each with a delete button (X icon) in the top-right corner to remove the photo.
8. THE Página_Publicar_Arriendo SHALL include a form section with the following fields: "Título de la publicación *" (text input, placeholder "Ej: Apartamento amplio con vista al parque"), "Descripción" (textarea, optional, placeholder "Describe las características principales del inmueble..."), and "Canon de arrendamiento mensual *" (currency input using formatCOP/stripCOP helpers, pre-populated from the unit's leaseBaseAmount).
9. THE Página_Publicar_Arriendo SHALL validate in the client that: at least 3 photos have been uploaded (IF fewer than 3, THEN SHALL show "Debes subir al menos 3 fotos"); the title is not empty (IF empty, THEN SHALL show "El título es obligatorio"); the price is not empty and is a valid positive number (IF empty, THEN SHALL show "El canon de arrendamiento es obligatorio"; IF not a valid positive number, THEN SHALL show "Ingresa un valor numérico válido").
10. THE Página_Publicar_Arriendo SHALL include a primary button "Publicar inmueble" (full width, background primary `#1d4ed8`, text white, min-height 56px) and a secondary button "Cancelar" (full width, background white, border `#d1d5db`, text `#111827`, min-height 58px) below the form.
11. WHEN the user presses "Publicar inmueble" and all validations pass, THE Página_Publicar_Arriendo SHALL send the data to the API_Backend via `POST /listings` with the portfolioUnitId, title, description, price, currency ("COP"), and the uploaded photo files as multipart form data.
12. WHILE the publication request is being processed, THE Página_Publicar_Arriendo SHALL disable the "Publicar inmueble" button and show a loading indicator.
13. WHEN the API_Backend returns a successful response, THE Página_Publicar_Arriendo SHALL display a success message "¡Inmueble publicado exitosamente!" in Spanish and redirect the landlord to the portfolio units page.
14. IF the API_Backend returns a 403 error, THEN THE Página_Publicar_Arriendo SHALL display the error message "No tienes permiso para publicar este inmueble".
15. IF the request to the API_Backend fails due to a network error or server error, THEN THE Página_Publicar_Arriendo SHALL display an error message in Spanish, preserving all entered data and uploaded photos.
16. THE Página_Publicar_Arriendo SHALL be accessible only to authenticated users with role LANDLORD.

---

### Requirement 10: Enhanced Portfolio Units List with Publish Action

**User Story:** As an authenticated landlord, I want to see a "Publicar en arriendo" button on available portfolio units, so that I can quickly publish properties for tenants to discover.

#### Acceptance Criteria

1. THE Tarjeta_Unidad_Portafolio in the portfolio units list SHALL display a status badge indicating the unit's current state: "Ocupado" (background `#FEF3C7`, text `#92400E`) when the unit has an active lease, "Disponible" (background `#DCFCE7`, text `#166534`) when the unit has no active lease, "Mantenimiento" (background `#FEE2E2`, text `#991B1B`) when the unit is under maintenance.
2. IF the unit status is "Disponible" and the unit does NOT have an active listing, THEN THE Tarjeta_Unidad_Portafolio SHALL display a primary button "Publicar en arriendo" (full width, background primary `#1d4ed8`, text white, with upload icon) that navigates to Página_Publicar_Arriendo at `/mi-portafolio/[portfolioId]/unidades/[unitId]/publicar`.
3. IF the unit already has an active listing (published on Explorar), THEN THE Tarjeta_Unidad_Portafolio SHALL display a text indicator "✓ Publicada en Explorar" (text-caption, color `#166534`) instead of the publish button.
4. THE Tarjeta_Unidad_Portafolio SHALL include a "Ver historial" link (text-caption, color primary `#1d4ed8`) that navigates to the unit's lease history page at `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos`.
5. IF the unit has an active tenant, THEN THE Tarjeta_Unidad_Portafolio SHALL display the tenant section showing: "Arrendatario actual" label (text-small color `#4b5563`), tenant name (text-caption), and monthly rent formatted in COP (text-body color primary `#1d4ed8`).

---

### Requirement 11: Lease Creation Page (Crear arriendo)

**User Story:** As an authenticated landlord, I want to create a new lease for a portfolio unit by specifying the tenant and lease terms, so that I can formalize a rental agreement for my property.

#### Acceptance Criteria

1. WHEN an Arrendador accesses the route `/mi-portafolio/[portfolioId]/unidades/[unitId]/arriendos/crear`, THE Página_Crear_Arriendo SHALL display a lease creation form with the unit's property information in a read-only summary card at the top.
2. THE Página_Crear_Arriendo SHALL include a fixed header with bottom border containing a back button (left arrow) that navigates to Página_Arriendos_Unidad and the title "Crear arriendo" centered (H1 32px Bold, color `#111827`).
3. THE Página_Crear_Arriendo SHALL display a "Datos del arrendatario" section (text-h3 font-semibold) with the following fields: correo electrónico del arrendatario (email input, required — used to look up or identify the tenant user in the system).
4. THE Página_Crear_Arriendo SHALL display a "Términos del arriendo" section (text-h3 font-semibold) with the following fields: fecha de inicio (date input, required), fecha de fin (date input, optional — leave empty for open-ended leases).
5. THE Página_Crear_Arriendo SHALL validate in the client that: the tenant email is not empty and has a valid email format (IF empty, THEN SHALL show "El correo electrónico del arrendatario es obligatorio"; IF invalid format, THEN SHALL show "Ingresa un correo electrónico válido"); the start date is not empty (IF empty, THEN SHALL show "La fecha de inicio es obligatoria"); IF end date is provided, THEN the end date SHALL be after the start date (IF not, THEN SHALL show "La fecha de fin debe ser posterior a la fecha de inicio").
6. THE Página_Crear_Arriendo SHALL include a primary button "Crear arriendo" (full width, background primary `#1d4ed8`, text white, min-height 56px) and a secondary button "Cancelar" (full width, background white, border `#d1d5db`, text `#111827`, min-height 58px) below the form.
7. WHEN the user presses "Crear arriendo" and all validations pass, THE Página_Crear_Arriendo SHALL send the data to the API_Backend via `POST /portfolio/:portfolioId/units/:unitId/leases` with the tenant email, start date, and optional end date.
8. WHILE the lease creation request is being processed, THE Página_Crear_Arriendo SHALL disable the "Crear arriendo" button and show a loading indicator.
9. WHEN the API_Backend returns a successful response, THE Página_Crear_Arriendo SHALL display a success message "¡Arriendo creado exitosamente!" in Spanish and redirect the landlord to Página_Arriendos_Unidad.
10. IF the API_Backend returns a 403 error, THEN THE Página_Crear_Arriendo SHALL display the error message "No tienes permiso para crear arriendos en esta unidad".
11. IF the API_Backend returns a 404 error, THEN THE Página_Crear_Arriendo SHALL display the error message "No se encontró un arrendatario con ese correo electrónico".
12. IF the API_Backend returns a 409 error (conflict — unit already has an active lease), THEN THE Página_Crear_Arriendo SHALL display the error message "Esta unidad ya tiene un arriendo activo".
13. IF the request to the API_Backend fails due to a network error or server error, THEN THE Página_Crear_Arriendo SHALL display an error message in Spanish, preserving all entered data.
14. THE Página_Crear_Arriendo SHALL be accessible only to authenticated users with role LANDLORD.

---

### Requirement 12: Backend Lease Endpoints Extension

**User Story:** As a frontend developer, I need the backend to expose endpoints for creating leases, fetching lease details, and unit lease history with resolved tenant and property information, so that the frontend can render the lease creation, lease detail, and unit leases pages.

**Note:** Each backend modification must be consulted and approved before implementation. Below are the necessary changes and their justification.

#### Acceptance Criteria

1. THE API_Backend SHALL expose a new endpoint `GET /portfolio/:portfolioId/units/:unitId/leases` that returns a list of leases for the specified portfolio unit, including for each lease: lease ID, tenant user ID, start date, end date, and the current lease status name resolved from the `tracking_process.LeaseCurrentStatus` and `tracking_process.LeaseStatus` tables. **Justification:** The Figma design for "Arriendos de la unidad" (frame 15:2408) shows a list of leases per unit with status badges; no existing endpoint returns leases with resolved status names.
2. THE API_Backend SHALL resolve and include tenant information in the lease list response: tenant full name (resolved from `users.NaturalPersonDetail` or `users.LegalPersonDetail` via the lease `user_id`), so the frontend can display tenant names without additional API calls. **Justification:** The Figma design shows tenant name on each lease card; cross-schema resolution is needed since `Lease.user_id` references the `users` schema.
3. THE API_Backend SHALL expose a new endpoint `GET /portfolio/:portfolioId/units/:unitId/leases/:leaseId` that returns the full detail of a specific lease, including: lease fields (id, portfolioUnitId, userId, startDate, endDate), resolved tenant information (full name, document type code, document number, email, phone), resolved property information (property type, rooms, bathrooms, area, full address), current lease status name, monthly rent amount (from PortfolioUnit.leaseBaseAmount), and associated contract ID if one exists. **Justification:** The Figma design for "Detalle del arriendo" (frame 15:2606) shows property info, tenant info, agreement terms, and a "Generar contrato" button that requires knowing if a contract already exists.
4. THE API_Backend SHALL expose a new endpoint `POST /portfolio/:portfolioId/units/:unitId/leases` that creates a new lease for the specified portfolio unit. The request body SHALL accept: `tenantEmail` (string, required — used to resolve the tenant user ID from the `users` schema), `startDate` (ISO date string, required), and `endDate` (ISO date string, optional). The endpoint SHALL resolve the tenant user ID by looking up the email in `users.User`, create the `Lease` record in `landlord_portfolio` schema, create an initial `LeaseStatusHistory` entry with status "Acordado" in `tracking_process` schema, and create the corresponding `LeaseCurrentStatus` record. **Justification:** The "Crear arriendo" page needs a backend endpoint to persist new leases; the Lease model requires `portfolio_unit_id`, `user_id`, `start_date`, and optional `end_date`.
5. IF the tenant email does not match any user in the `users.User` table, THEN THE `POST /portfolio/:portfolioId/units/:unitId/leases` endpoint SHALL return a 404 error with message "No se encontró un arrendatario con ese correo electrónico". **Justification:** The landlord enters the tenant's email; the system must validate the tenant exists.
6. IF the portfolio unit already has an active lease (a lease with no end_date or end_date in the future and status "Vigente"), THEN THE `POST /portfolio/:portfolioId/units/:unitId/leases` endpoint SHALL return a 409 error with message "Esta unidad ya tiene un arriendo activo". **Justification:** A unit cannot have two concurrent active leases.
7. THE new lease endpoints SHALL be protected with JWT authentication and SHALL verify that the authenticated user owns the portfolio (via `LandlordPortfolio.user_id`) before returning data; IF the user does not own the portfolio, THEN SHALL return a 403 error. **Justification:** Lease data contains tenant PII and must be restricted to the portfolio owner.
8. THE new lease endpoints SHALL include Swagger documentation with `@ApiTags('portfolio')`, `@ApiOperation`, `@ApiBearerAuth('JWT')`, `@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`, and `@ApiConflictResponse` decorators. **Justification:** Consistency with existing backend documentation standards.
9. THE response DTOs for the new lease endpoints SHALL include `@ApiProperty()` or `@ApiPropertyOptional()` on every field, and SHALL use `class-validator` decorators on request parameters. **Justification:** Swagger does not infer types from TypeScript alone; all DTOs must be explicitly documented.

---

### Requirement 13: Period Filter Component (Filtro_Periodo)

**User Story:** As an authenticated landlord, I want to filter accounting reports by predefined time periods, so that I can analyze income data for different timeframes.

#### Acceptance Criteria

1. THE Filtro_Periodo SHALL render as a horizontal row of selectable tab buttons with four options: "Último mes" (maps to 1 month back from current date), "Últimos 3 meses" (3 months), "Últimos 6 meses" (6 months), "Último año" (12 months).
2. THE Filtro_Periodo SHALL visually indicate the currently selected tab with primary color background (`#1d4ed8`) and white text, while unselected tabs SHALL have neutral background (`#f3f4f6`) and neutral text (`#4b5563`).
3. WHEN the user selects a tab, THE Filtro_Periodo SHALL invoke a callback function with the computed period parameters (year and month for the start of the period) that the parent page uses to request updated report data.
4. THE Filtro_Periodo SHALL compute the period start date by subtracting the selected number of months from the current date, using the year and month of the resulting date as the `PeriodRequest` parameters sent to the accounting API.
5. THE Filtro_Periodo SHALL have a minimum touch target of 44x44 pixels per tab button to comply with WCAG 2.1 AA accessibility criteria.
6. THE Filtro_Periodo SHALL be horizontally scrollable on narrow mobile screens when the tabs overflow the viewport width, with no visible scrollbar.
7. FOR ALL valid period selections, computing the period start from the current date and then formatting it back SHALL produce a consistent year/month pair (idempotent computation).

---

### Requirement 14: Route Protection for Landlord Modules

**User Story:** As a platform, I want all new landlord module routes to be protected by authentication and LANDLORD role verification, so that only authorized landlords can access accounting, lease, and contract management pages.

#### Acceptance Criteria

1. WHEN a Usuario_Anónimo attempts to access any route under `/mis-ingresos` or any new lease/contract route under `/mi-portafolio`, THE App_Frontend SHALL redirect automatically to the login page (`/auth/login`).
2. WHEN an authenticated user without LANDLORD role attempts to access any route under `/mis-ingresos` or any new lease/contract route under `/mi-portafolio`, THE App_Frontend SHALL display a message indicating insufficient permissions, with a link to return to `/explorar`.
3. THE Módulo_Arrendador SHALL use the existing ProtectedRoute component to verify both authentication and LANDLORD role in the AuthProvider before rendering protected content.
4. WHILE the AuthProvider is verifying the authentication state during initial load, THE Módulo_Arrendador SHALL display a loading indicator on protected routes instead of redirecting prematurely.

---

### Requirement 15: Accessibility WCAG 2.1 AA in Landlord Modules

**User Story:** As a landlord with diverse capabilities, I want the accounting, lease, and contract pages to be accessible and readable, so that I can manage my rental business without interaction barriers.

#### Acceptance Criteria

1. THE Módulo_Arrendador SHALL guarantee that all form fields (contract creation wizard) have labels (`label`) programmatically associated via the `htmlFor` attribute or `aria-label`.
2. THE Módulo_Arrendador SHALL guarantee that all validation error messages are associated with their corresponding fields via `aria-describedby` and announced to assistive technologies via `aria-live="polite"`.
3. THE Módulo_Arrendador SHALL guarantee that all interactive elements (buttons, links, form fields, cards, tabs) have a minimum touch target of 44x44 pixels.
4. THE Módulo_Arrendador SHALL guarantee that keyboard navigation works correctly in all forms and interactive components: Tab to advance between fields, Shift+Tab to go back, Enter to submit or activate.
5. THE Módulo_Arrendador SHALL guarantee that the Wizard_Contrato progress indicator is accessible, communicating the current step and total steps to assistive technologies via `aria-current` and `aria-label` attributes.
6. THE Módulo_Arrendador SHALL apply the Sistema_Diseño color palette guaranteeing a minimum contrast of 4.5:1 between text and background for normal text, and 3:1 for large text (≥18px or ≥14px bold).
7. THE Módulo_Arrendador SHALL use semantic HTML elements (`main`, `section`, `article`, `h1`-`h3`, `table`, `thead`, `tbody`, `th`, `td`) to structure the content of each page.
8. THE Módulo_Arrendador SHALL use ARIA attributes (`aria-live`, `aria-busy`, `role="alert"`, `role="status"`) to communicate dynamic states such as data loading, success messages, and errors to assistive technologies.
9. THE Módulo_Arrendador SHALL guarantee that the Badge_Estado component communicates the lease status to screen readers via `aria-label` (e.g., `aria-label="Estado: Vigente"`).
10. THE Módulo_Arrendador SHALL guarantee that the Filtro_Periodo tabs use `role="tablist"` and `role="tab"` with `aria-selected` to communicate the selected period to assistive technologies.

---

### Requirement 16: Enhanced Unit Cards with Property Details (Post-Implementation)

**User Story:** As an authenticated landlord, I want to see property details (type, address, area, rooms, bathrooms) on each unit card in the portfolio units list, so that I can quickly identify and differentiate my properties.

#### Acceptance Criteria

1. THE `GET /portfolio/:portfolioId/units` endpoint SHALL resolve and return property details for each unit: `propertyType` (from `Property.property_type`), `address` (from `Address.address`), `numberOfRooms`, `numberOfBathrooms`, and `area` (computed as `length × width` from `Property`), by performing a cross-schema lookup from `PortfolioUnit.property_id` to the `Property` and `Address` tables.
2. THE Tarjeta_Unidad_Portafolio SHALL display a property icon (house icon in a circular gray background) to the left of the unit name and status badge.
3. THE Tarjeta_Unidad_Portafolio SHALL display the property type as a subtitle below the unit name (text-caption color `#4b5563`).
4. THE Tarjeta_Unidad_Portafolio SHALL display the address with a location pin icon (text-caption color `#4b5563`).
5. THE Tarjeta_Unidad_Portafolio SHALL display a property details row showing area in m², rooms (hab), and bathrooms (baños) separated by dot separators (text-caption color `#4b5563`).
6. THE `mapPortfolioUnitToUnitInfo` function used in the publicar, arriendos, and arriendos/crear pages SHALL map the real property data from the backend response (`propertyType`, `address`, `numberOfRooms`, `numberOfBathrooms`, `area`) instead of hardcoding default values.

---

### Requirement 17: Consistent Back Button Navigation Pattern (Post-Implementation)

**User Story:** As a landlord navigating between pages, I want a consistent back button experience across all pages, so that navigation feels predictable and familiar.

#### Acceptance Criteria

1. ALL new landlord module pages SHALL use `<Link>` from `next/link` for the back button instead of `<button>` with `router.push()`, ensuring standard link behavior (right-click, open in new tab, etc.).
2. ALL back buttons SHALL use the `rounded-card` CSS class for border radius, consistent with the existing design system.
3. ALL back buttons SHALL use the left-arrow SVG icon consisting of a horizontal line (`<line x1="19" y1="12" x2="5" y2="12" />`) and an arrowhead polyline (`<polyline points="12 19 5 12 12 5" />`), NOT the chevron icon (`<polyline points="15 18 9 12 15 6" />`).
4. This pattern SHALL be consistent with the back buttons already used in `mi-portafolio/[id]/page.tsx` and `mi-portafolio/[id]/agregar-unidad/page.tsx`.
