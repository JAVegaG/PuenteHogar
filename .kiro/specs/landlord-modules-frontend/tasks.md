# Implementation Plan: Landlord Modules Frontend

## Overview

Incremental implementation of 4 new frontend modules (landlord-accounting, landlord-leases, landlord-contracts, landlord-publish), 2 shared components (StatusBadge, Toast), 3 new services (AccountingService, ContractService, LeaseService), extension of api.ts with createListing, 8 new App Router pages, and 3 new backend lease endpoints. Each task builds on the previous, wiring components into pages progressively.

## Tasks

- [x] 1. Create shared components and service layer foundation
  - [x] 1.1 Create StatusBadge shared component
    - Create `src/frontend/shared/components/StatusBadge.tsx`
    - Implement props: `status: string`, `variant?: 'lease' | 'unit' | 'payment'`
    - Implement color mappings for lease (Vigente/Acordado/Finalizado), unit (Ocupado/Disponible/Mantenimiento), payment (Al día/Pendiente)
    - Add `aria-label="Estado: {status}"`, border-radius 4px, padding horizontal 8px vertical 2px, text-small font-medium
    - _Requirements: 6.7, 15.9_

  - [x] 1.2 Create Toast shared component
    - Create `src/frontend/shared/components/Toast.tsx`
    - Implement props: `message: string`, `isVisible: boolean`, `onClose: () => void`, `duration?: number` (default 3000)
    - Position at bottom of screen, bg `#111827`, text white, border-radius 6px, auto-hide after duration
    - Add `role="status"`, `aria-live="polite"`
    - _Requirements: 4.7, 5.7, 5.8, 15.8_

  - [x] 1.3 Create AccountingService
    - Create `src/frontend/shared/services/accounting.ts`
    - Define `accountingService` object with `getAggregatedReport` and `getIndividualReport` methods
    - Use native `fetch` with `Authorization: Bearer <token>` header and `Content-Type: application/json`
    - `getAggregatedReport` → `POST /accounting/reports/portfolio/${portfolioId}/aggregated` with body `{ year, month }`
    - `getIndividualReport` → `POST /accounting/reports/portfolio/${portfolioId}/unit/${unitId}` with body `{ year, month }`
    - Error handling: 401 → "Sesión expirada", 403 → "No tienes permiso para acceder a reportes contables", network → "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.", 5xx → "Error del servidor. Intenta de nuevo más tarde."
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 1.4 Create ContractService
    - Create `src/frontend/shared/services/contract.ts`
    - Define `contractService` object with `createContract`, `getContract`, `signContract` methods
    - Use native `fetch` with `Authorization: Bearer <token>` header
    - `createContract` → `POST /contracts`, `getContract` → `GET /contracts/${contractId}`, `signContract` → `POST /contracts/${contractId}/sign`
    - Error handling: 401 → "Sesión expirada", 403 → "No tienes permiso para realizar esta acción", 404 → "Contrato no encontrado", 422 → "Solo se permiten archivos PDF de máximo 10 MB", network/5xx → standard messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 1.5 Create LeaseService
    - Create `src/frontend/shared/services/lease.ts`
    - Define `leaseService` object with `getUnitLeases`, `getLeaseDetail`, `createLease` methods
    - `getUnitLeases` → `GET /portfolio/${portfolioId}/units/${unitId}/leases`
    - `getLeaseDetail` → `GET /portfolio/${portfolioId}/units/${unitId}/leases/${leaseId}`
    - `createLease` → `POST /portfolio/${portfolioId}/units/${unitId}/leases` with body `{ tenantEmail, startDate, endDate? }`
    - Error handling: 401/403/404/409/network/5xx with Spanish messages per design
    - _Requirements: 1.1, 12.1, 12.3, 12.4_

  - [x] 1.6 Extend api.ts with createListing function
    - Add `createListing(formData: FormData, token: string): Promise<{ id: string }>` to `src/frontend/shared/services/api.ts`
    - Use `POST /listings` with `Authorization: Bearer <token>` header, no Content-Type (browser sets multipart boundary)
    - Error handling: 401 → "Sesión expirada", 403 → "No tienes permiso para publicar este inmueble", 5xx/network → standard messages
    - _Requirements: 9.11_

  - [ ]* 1.7 Write property test for Bearer token header attachment (Property 1)
    - **Property 1: Bearer token header attachment**
    - Create `src/frontend/shared/services/__tests__/landlord-services.property.test.ts`
    - For any non-empty token string, all HTTP requests made by AccountingService, ContractService, and LeaseService must include `Authorization: Bearer <token>` header
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 1.3, 2.3**

- [x] 2. Checkpoint — Verify shared components and services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement landlord-accounting module types, utils, and components
  - [x] 3.1 Create accounting types and period computation utils
    - Create `src/frontend/modules/landlord-accounting/types.ts` with interfaces: `PeriodRequest`, `PeriodOption`, `AggregatedReportResponse`, `IndividualReportResponse`, `PortfolioIncomeSummary`, `PropertyDetailRow`
    - Create `src/frontend/modules/landlord-accounting/utils.ts` with `computePeriod(option: PeriodOption, now?: Date): PeriodRequest` function
    - `PERIOD_MONTHS` map: '1m'→1, '3m'→3, '6m'→6, '12m'→12
    - Subtract months from current date, return 1-indexed month
    - _Requirements: 13.1, 13.4, 1.4_

  - [ ]* 3.2 Write property test for period computation (Property 5)
    - **Property 5: Period computation correctness**
    - Create `src/frontend/modules/landlord-accounting/__tests__/utils.property.test.ts`
    - For any valid date and any PeriodOption, `computePeriod` must produce year between 2020-2100 and month between 1-12; computing twice with same args must produce same result
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 13.4, 13.7**

  - [x] 3.3 Create PeriodFilter component
    - Create `src/frontend/modules/landlord-accounting/components/PeriodFilter.tsx`
    - Props: `selectedPeriod: PeriodOption`, `onPeriodChange: (period: PeriodRequest) => void`
    - Render 4 horizontal tabs with `role="tablist"`, each tab with `role="tab"` + `aria-selected`
    - Selected tab: bg `#1d4ed8` text white; unselected: bg `#f3f4f6` text `#4b5563`
    - `overflow-x-auto` with `scrollbar-width: none` for mobile
    - Min touch target 44×44px
    - On tab select, compute `PeriodRequest` via `computePeriod` and invoke `onPeriodChange`
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6, 15.10_

  - [x] 3.4 Create SummaryCard component
    - Create `src/frontend/modules/landlord-accounting/components/SummaryCard.tsx`
    - Props: `label: string`, `value: string`, `valueColor?: string`
    - Container with border `#d1d5db`, border-radius 6px, padding 16px
    - Label in text-caption color `#4b5563`, value in text-h3 font-semibold with configurable color (default `#111827`)
    - _Requirements: 3.3, 4.5, 5.5_

  - [x] 3.5 Create PortfolioIncomeCard component
    - Create `src/frontend/modules/landlord-accounting/components/PortfolioIncomeCard.tsx`
    - Props: `portfolio: PortfolioIncomeSummary`
    - Card with border, border-radius 6px, shadow-card
    - Display portfolio name (text-body font-semibold), property count (text-caption `#4b5563`), monthly income in COP (text-h3 font-semibold color primary)
    - Two buttons: "Ver reporte" → `/mis-ingresos/portafolio/[id]`, "Ver inmuebles" → `/mi-portafolio/[id]`
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 3.6 Create PropertyDetailTable component
    - Create `src/frontend/modules/landlord-accounting/components/PropertyDetailTable.tsx`
    - Props: `units: PropertyDetailRow[]`
    - Semantic table (`<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`) with columns: address, neighborhood, monthly income (COP), payment status (StatusBadge)
    - Mobile: each row renders as stacked card
    - _Requirements: 4.6, 15.7_

- [x] 4. Implement accounting pages (3 routes)
  - [x] 4.1 Create Accounting Overview page (`/mis-ingresos`)
    - Create `src/frontend/app/mis-ingresos/page.tsx` as Client Component
    - Wrap in `LandlordRoute` for auth + LANDLORD role protection
    - Header with hamburger menu + "Mis ingresos" title (H1)
    - Fetch portfolios via `GET /portfolio` using PortfolioService
    - Display 3 SummaryCards: "Ingresos del mes", "Total inmuebles", "Arriendos activos"
    - Display "Mis portafolios" section with PortfolioIncomeCard per portfolio
    - Loading: Skeleton indicator; Empty: Spanish message; Error: ErrorState with retry; 401: logout
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 14.1, 14.2, 14.3, 14.4_

  - [x] 4.2 Create Aggregated Portfolio Report page (`/mis-ingresos/portafolio/[portfolioId]`)
    - Create `src/frontend/app/mis-ingresos/portafolio/[portfolioId]/page.tsx` as Client Component
    - Wrap in `LandlordRoute`
    - Header with back button → `/mis-ingresos` + "Reporte de portafolio" title (H1)
    - PeriodFilter with default "Último mes", fetch aggregated report via AccountingService on period change
    - Display 2 SummaryCards: "Ingresos recibidos" (primary color), "Ingresos esperados"
    - Display PropertyDetailTable with per-unit rows
    - "Exportar reporte" button → Toast "Funcionalidad disponible próximamente"
    - Loading: Skeleton; Empty: $0 values + empty state; Error: ErrorState with retry; 401: logout
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 14.1, 14.2, 14.3, 14.4_

  - [x] 4.3 Create Individual Unit Report page (`/mis-ingresos/portafolio/[portfolioId]/unidad/[unitId]`)
    - Create `src/frontend/app/mis-ingresos/portafolio/[portfolioId]/unidad/[unitId]/page.tsx` as Client Component
    - Wrap in `LandlordRoute`
    - Header with back button → portfolio report + "Reporte de inmueble" title (H1)
    - PeriodFilter with default "Último mes", fetch individual report via AccountingService on period change
    - Display 2 SummaryCards: "Ingresos recibidos" (primary color), "Ingresos esperados"
    - Display "Historial de arriendos" section with LeaseCard components
    - "Ver pagos" per lease → Toast "Funcionalidad disponible próximamente"
    - "Exportar reporte" button → Toast
    - Loading: Skeleton; Empty: $0 + empty state; Error: ErrorState with retry; 401: logout
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 14.1, 14.2, 14.3, 14.4_

- [x] 5. Checkpoint — Verify accounting module
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement landlord-leases module types, validation, and components
  - [x] 6.1 Create lease types and validation
    - Create `src/frontend/modules/landlord-leases/types.ts` with interfaces: `LeaseListItem`, `LeaseDetail`, `UnitInfo`, `CreateLeaseRequest`
    - Create `src/frontend/modules/landlord-leases/validation.ts` with `validateLeaseForm` and `validateLeaseEmail` functions
    - `validateLeaseForm`: error for tenantEmail if empty/invalid format, error for startDate if empty, error for endDate if provided and not after startDate
    - _Requirements: 11.5, 6.6_

  - [ ]* 6.2 Write property test for lease form validation (Property 6)
    - **Property 6: Lease form validation**
    - Create `src/frontend/modules/landlord-leases/__tests__/validation.property.test.ts`
    - For any email string, start date string, and end date string: error for tenantEmail iff empty after trim or invalid email format; error for startDate iff empty; error for endDate iff non-empty and `new Date(endDate) <= new Date(startDate)`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirement 11.5**

  - [x] 6.3 Create UnitInfoHeader component
    - Create `src/frontend/modules/landlord-leases/components/UnitInfoHeader.tsx`
    - Props: `unit: UnitInfo`
    - Display unit name (text-h3 font-semibold), property type (text-caption `#4b5563`), address (text-caption `#4b5563`)
    - Compact badges for rooms, bathrooms, area (bg `#f3f4f6`, border-radius 4px)
    - _Requirements: 6.3_

  - [x] 6.4 Create LeaseCard component
    - Create `src/frontend/modules/landlord-leases/components/LeaseCard.tsx`
    - Props: `lease: LeaseListItem`, `portfolioId: string`, `unitId: string`
    - Card with border, border-radius 6px, padding 16px
    - Display tenant name (text-body font-semibold), period "DD/MM/YYYY - DD/MM/YYYY" or "DD/MM/YYYY - Vigente" (text-caption `#4b5563`), monthly amount in COP (text-h3 font-semibold color primary), StatusBadge
    - Contextual actions: "Ver detalle" (always), "Generar contrato" (no contract), "Ver contrato" (PENDING/SIGNATURE_PENDING), "Ver contrato archivado" (SIGNED)
    - _Requirements: 6.5, 6.6, 6.8_

  - [x] 6.5 Create LeaseDetailView component
    - Create `src/frontend/modules/landlord-leases/components/LeaseDetailView.tsx`
    - Props: `lease: LeaseDetail`
    - 3 sections: Inmueble (property type, rooms, bathrooms, area, address), Arrendatario (name, doc type/number, email, phone), Acuerdo (monthly rent COP, agreement date, start date)
    - Labels in text-caption font-medium `#4b5563`, values in text-body `#111827`
    - Bottom button: "Generar contrato" (primary, full width, min-height 44px) or "Ver contrato" if contract exists
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 6.6 Create LeaseCreateForm component
    - Create `src/frontend/modules/landlord-leases/components/LeaseCreateForm.tsx` as Client Component
    - Props: `unit: UnitInfo`, `portfolioId: string`, `unitId: string`, `onSuccess: () => void`
    - Fields: tenant email (email input), start date (date input), end date (date input, optional)
    - Client-side validation via `validateLeaseForm` before submit
    - Submit via `leaseService.createLease()` with `{ tenantEmail, startDate, endDate? }`
    - Error handling: 403 → "No tienes permiso para crear arriendos en esta unidad", 404 → "No se encontró un arrendatario con ese correo electrónico", 409 → "Esta unidad ya tiene un arriendo activo"
    - Success: show "¡Arriendo creado exitosamente!" and redirect to leases list
    - Form labels with `htmlFor`, errors with `aria-describedby` + `aria-live="polite"`
    - _Requirements: 11.1, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12, 11.13, 15.1, 15.2_

- [x] 7. Implement lease pages (3 routes)
  - [x] 7.1 Create Unit Leases History page (`/mi-portafolio/[id]/unidades/[unitId]/arriendos`)
    - Create `src/frontend/app/mi-portafolio/[id]/unidades/[unitId]/arriendos/page.tsx` as Client Component
    - Wrap in `LandlordRoute`
    - Header with back button → portfolio unit detail + "Arriendos de la unidad" title (H1)
    - Display UnitInfoHeader with unit details
    - Primary button "+ Crear nuevo arriendo para esta unidad" → `/mi-portafolio/[id]/unidades/[unitId]/arriendos/crear`
    - Fetch leases via `leaseService.getUnitLeases()`, display LeaseCard list ordered by start date descending
    - Loading: Skeleton; Empty: Spanish message suggesting create; Error: ErrorState with retry; 401: logout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.9, 6.10, 6.11, 6.12, 6.13, 14.1, 14.2, 14.3, 14.4_

  - [x] 7.2 Create Lease Detail page (`/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]`)
    - Create `src/frontend/app/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]/page.tsx` as Client Component
    - Wrap in `LandlordRoute`
    - Header with back button → leases list + "Detalle del arriendo" title (H1)
    - Fetch lease detail via `leaseService.getLeaseDetail()`, display LeaseDetailView
    - StatusBadge at top showing current lease status
    - Loading: Skeleton; 404: "Arriendo no encontrado" with link back; Error: ErrorState with retry; 401: logout
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 14.1, 14.2, 14.3, 14.4_

  - [x] 7.3 Create Lease Creation page (`/mi-portafolio/[id]/unidades/[unitId]/arriendos/crear`)
    - Create `src/frontend/app/mi-portafolio/[id]/unidades/[unitId]/arriendos/crear/page.tsx` as Client Component
    - Wrap in `LandlordRoute`
    - Header with back button → leases list + "Crear arriendo" title (H1)
    - Display unit info summary card (read-only) at top
    - Render LeaseCreateForm with `max-w-[560px]` centered container
    - On success redirect to leases list page
    - _Requirements: 11.1, 11.2, 11.14, 14.1, 14.2, 14.3, 14.4_

- [x] 8. Checkpoint — Verify leases module
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement landlord-contracts module types, validation, and components
  - [x] 9.1 Create contract types and validation
    - Create `src/frontend/modules/landlord-contracts/types.ts` with interfaces: `ContractFormData`, `UploadContractRequest`, `ContractParty`, `ContractSummary`
    - Create `src/frontend/modules/landlord-contracts/validation.ts` with `validateContractStep1`, `validateContractStep2`, `validateContractStep3`, `validateContractEmail`, `validateContractPhone`, `validateMonthlyRent` functions
    - Step 1: all fields non-empty, email valid format, phone exactly 10 digits
    - Step 2: startDate required, endDate after startDate if provided, monthlyRent positive number
    - Step 3: file must be selected
    - _Requirements: 2.4, 8.5, 8.9, 8.11_

  - [ ]* 9.2 Write property test for Contract Step 1 validation (Property 2)
    - **Property 2: Contract Step 1 validation**
    - Create `src/frontend/modules/landlord-contracts/__tests__/validation.property.test.ts`
    - For any `ContractFormData`, `validateContractStep1` returns empty record iff all fields valid; each invalid field produces its corresponding error key
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirement 8.5**

  - [ ]* 9.3 Write property test for Contract Step 2 validation (Property 3)
    - **Property 3: Contract Step 2 date and amount validation**
    - Add to `src/frontend/modules/landlord-contracts/__tests__/validation.property.test.ts`
    - For any pair of date strings and amount string: error for endDate iff non-empty and `new Date(endDate) <= new Date(startDate)`; error for monthlyRent iff empty, not finite, or ≤ 0
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirement 8.9**

  - [x] 9.4 Create WizardProgress component
    - Create `src/frontend/modules/landlord-contracts/components/WizardProgress.tsx`
    - Props: `currentStep: number`, `steps: string[]`
    - 3 numbered circles connected by lines; current step: bg primary; completed: check green; pending: bg neutral
    - Labels below: "Arrendatario", "Términos", "Documento"
    - `aria-current="step"` on current, `aria-label="Paso X de Y: {label}"` on each
    - _Requirements: 8.1, 15.5_

  - [x] 9.5 Create StepTenant component
    - Create `src/frontend/modules/landlord-contracts/components/StepTenant.tsx`
    - Props: `data: ContractFormData`, `errors: Record<string, string>`, `onChange: (field, value) => void`
    - Fields: nombre, apellido, tipo documento (dropdown), número documento, email, teléfono
    - Pre-populated from lease tenant data
    - Notice box: bg `#FEF3C7`, border `#F59E0B`, disclaimer text in text-caption color `#92400E`
    - Form labels with `htmlFor`, errors with `aria-describedby`
    - _Requirements: 8.4, 8.6, 15.1, 15.2_

  - [x] 9.6 Create StepTerms component
    - Create `src/frontend/modules/landlord-contracts/components/StepTerms.tsx`
    - Props: `data: ContractFormData`, `errors: Record<string, string>`, `onChange: (field, value) => void`
    - Fields: start date (date input), end date (date input, optional), monthly rent (currency input with formatCOP/stripCOP, pre-populated from leaseBaseAmount)
    - Form labels with `htmlFor`, errors with `aria-describedby`
    - _Requirements: 8.8, 15.1, 15.2_

  - [x] 9.7 Create StepDocument component
    - Create `src/frontend/modules/landlord-contracts/components/StepDocument.tsx`
    - Props: `data: ContractFormData`, `errors: Record<string, string>`, `onFileSelect: (file: File) => void`
    - Upload area with dashed border `#d1d5db`, border-radius 6px, accepts only PDF
    - Display selected file name or "Seleccionar archivo PDF"
    - _Requirements: 8.10, 8.11_

  - [x] 9.8 Create ContractWizard orchestrator component
    - Create `src/frontend/modules/landlord-contracts/components/ContractWizard.tsx` as Client Component
    - Props: `lease: LeaseDetail`, `onSuccess: () => void`
    - Local state: `currentStep: 1|2|3`, `formData: ContractFormData`, `errors`, `serverError`, `isSubmitting`
    - Orchestrate 3 steps: render WizardProgress + current step component
    - Validate current step before advancing (validateContractStep1/2/3)
    - Preserve formData across step navigation (forward and backward)
    - Step 1 button: "Continuar a términos del contrato"
    - Step 3 submit: send data via `contractService.createContract()`, show success, redirect
    - Error handling: 403/422/network/5xx with Spanish messages, preserve data on error
    - Disable submit button + spinner while submitting
    - _Requirements: 8.1, 8.5, 8.7, 8.9, 8.11, 8.12, 8.13, 8.14, 8.15, 8.16, 8.17, 8.18, 15.4_

- [x] 10. Implement contract creation page
  - [x] 10.1 Create Contract Creation Wizard page (`/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]/crear-contrato`)
    - Create `src/frontend/app/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]/crear-contrato/page.tsx` as Client Component
    - Wrap in `LandlordRoute`
    - Header with back button (→ previous step or lease detail if step 1) + "Crear contrato" title (H1)
    - Display property info header (unit name + address) above wizard
    - Fetch lease detail via `leaseService.getLeaseDetail()` to pre-populate wizard
    - Render ContractWizard with `max-w-[560px]` centered container
    - On success redirect to lease detail page
    - _Requirements: 8.1, 8.2, 8.3, 8.19, 14.1, 14.2, 14.3, 14.4_

- [x] 11. Checkpoint — Verify contracts module
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement landlord-publish module types, validation, and components
  - [x] 12.1 Create publish types and validation
    - Create `src/frontend/modules/landlord-publish/types.ts` with interfaces: `PhotoFile`, `PublishFormData`, `CreateListingRequest`
    - Create `src/frontend/modules/landlord-publish/validation.ts` with `validatePublishForm` and `validatePublishPrice` functions
    - `validatePublishForm`: error for photos if count < 3, error for title if empty, error for price if empty/not finite/≤ 0
    - _Requirements: 9.9_

  - [ ]* 12.2 Write property test for publish form validation (Property 4)
    - **Property 4: Publish form validation**
    - Create `src/frontend/modules/landlord-publish/__tests__/validation.property.test.ts`
    - For any combination of photo count (0-15), title string, and price string: error for photos iff count < 3; error for title iff empty after trim; error for price iff empty, not finite, or ≤ 0
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirement 9.9**

  - [x] 12.3 Create PhotoThumbnail component
    - Create `src/frontend/modules/landlord-publish/components/PhotoThumbnail.tsx`
    - Props: `src: string`, `onRemove: () => void`
    - Preview 1:1 aspect ratio, border-radius 6px, X button in top-right corner
    - _Requirements: 9.7_

  - [x] 12.4 Create PhotoUploader component
    - Create `src/frontend/modules/landlord-publish/components/PhotoUploader.tsx` as Client Component
    - Props: `photos: PhotoFile[]`, `onAdd: (files: File[]) => void`, `onRemove: (index: number) => void`, `maxPhotos?: number` (default 10)
    - Upload area with dashed border, accepts JPEG/PNG/WebP (image/jpeg, image/png, image/webp)
    - Display PhotoThumbnail components in horizontal scrollable row
    - Counter: "X de 10 fotos" + "Faltan Y fotos" (Y = max(0, 3 - count))
    - _Requirements: 9.5, 9.6, 9.7_

  - [x] 12.5 Create PublishForm component
    - Create `src/frontend/modules/landlord-publish/components/PublishForm.tsx` as Client Component
    - Props: `unit: UnitInfo`, `onSuccess: () => void`
    - Local state: photos, title, description, price, errors, serverError, isSubmitting
    - Fields: title (text input), description (textarea, optional), price (currency input with formatCOP/stripCOP)
    - PhotoUploader for photo management
    - Client-side validation via `validatePublishForm` before submit
    - Submit: build FormData with portfolioUnitId, title, description, price, currency "COP", photos → `createListing(formData, token)`
    - Success: "¡Inmueble publicado exitosamente!" + redirect to portfolio units page
    - Error handling: 403/network/5xx with Spanish messages, preserve data + photos on error
    - Disable submit button + spinner while submitting
    - Form labels with `htmlFor`, errors with `aria-describedby` + `aria-live="polite"`
    - _Requirements: 9.1, 9.3, 9.4, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14, 9.15, 15.1, 15.2_

  - [x] 12.6 Create Publish Listing page (`/mi-portafolio/[id]/unidades/[unitId]/publicar`)
    - Create `src/frontend/app/mi-portafolio/[id]/unidades/[unitId]/publicar/page.tsx` as Client Component
    - Wrap in `LandlordRoute`
    - Header with back button → portfolio units page + "Publicar en arriendo" title (H1)
    - Display unit info summary card (read-only) at top
    - Info notice box: bg `#DBEAFE`, border `#1d4ed8`, "Publicación en Explorar" title + helper text
    - Render PublishForm with `max-w-[560px]` centered container
    - _Requirements: 9.1, 9.2, 9.3, 9.16, 14.1, 14.2, 14.3, 14.4_

- [x] 13. Checkpoint — Verify publish module
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Enhance portfolio unit cards with publish action and lease history link
  - Locate existing unit card component in `src/frontend/modules/landlord-portfolio/`
  - Add StatusBadge to unit cards: "Ocupado" (active lease), "Disponible" (no active lease), "Mantenimiento"
  - Add "Publicar en arriendo" button (primary, full width, upload icon) for available units without active listing → navigates to `/mi-portafolio/[id]/unidades/[unitId]/publicar`
  - Add "✓ Publicada en Explorar" text indicator (text-caption, color `#166534`) for units with active listing
  - Add "Ver historial" link (text-caption, color primary) → `/mi-portafolio/[id]/unidades/[unitId]/arriendos`
  - Add tenant section for occupied units: "Arrendatario actual" label, tenant name, monthly rent in COP
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 15. Implement backend lease endpoints
  - [x] 15.1 Create lease DTOs with Swagger decorators
    - Create `LeaseListItemDto` response DTO in `src/backend/modules/landlord-portfolio/application/dtos/` with fields: id, tenantName, startDate, endDate, monthlyAmount, status, contractId, contractStatus — all with `@ApiProperty()` or `@ApiPropertyOptional()`
    - Create `LeaseDetailDto` response DTO with nested tenant (fullName, documentTypeCode, documentNumber, email, phoneNumber) and property (propertyType, numberOfRooms, numberOfBathrooms, area, address) objects — use `type: () => NestedDto` for nested DTOs
    - Create `CreateLeaseDto` request DTO with `tenantEmail` (required), `startDate` (required), `endDate` (optional) — with `class-validator` decorators + `@ApiProperty()`/`@ApiPropertyOptional()`
    - _Requirements: 12.8, 12.9_

  - [x] 15.2 Implement GET leases list use case and endpoint
    - Create use case for fetching unit leases in `src/backend/modules/landlord-portfolio/application/use-cases/`
    - Verify portfolio ownership (JWT user → `LandlordPortfolio.user_id`), return 403 if not owner
    - Query `Lease` records by `portfolio_unit_id`, resolve tenant name cross-schema from `users.NaturalPersonDetail`/`users.LegalPersonDetail` via `Lease.user_id`
    - Resolve lease status from `tracking_process.LeaseCurrentStatus` + `tracking_process.LeaseStatus`
    - Resolve monthlyAmount from `PortfolioUnit.leaseBaseAmount`, contractId/contractStatus from `contracts` schema
    - Add `GET /portfolio/:portfolioId/units/:unitId/leases` route to landlord-portfolio controller
    - Add Swagger decorators: `@ApiTags('portfolio')`, `@ApiOperation`, `@ApiBearerAuth('JWT')`, `@ApiOkResponse({ type: [LeaseListItemDto] })`, `@ApiForbiddenResponse`
    - _Requirements: 12.1, 12.2, 12.7, 12.8_

  - [x] 15.3 Implement GET lease detail use case and endpoint
    - Create use case for fetching single lease detail
    - Verify portfolio ownership, return 403 if not owner
    - Resolve full tenant info cross-schema: `Lease.user_id` → `users.User` → `users.NaturalPersonDetail`/`users.LegalPersonDetail` for name, document type/number, email, phone
    - Resolve property info: `PortfolioUnit.property_id` → `Property` → `Address` for type, rooms, bathrooms, area, address
    - Resolve lease status, monthlyAmount, contractId/contractStatus
    - Add `GET /portfolio/:portfolioId/units/:unitId/leases/:leaseId` route to controller
    - Add Swagger decorators: `@ApiOkResponse({ type: LeaseDetailDto })`, `@ApiNotFoundResponse`, `@ApiForbiddenResponse`
    - _Requirements: 12.3, 12.7, 12.8_

  - [x] 15.4 Implement POST create lease use case and endpoint
    - Create use case for creating a new lease
    - Verify portfolio ownership, return 403 if not owner
    - Resolve `tenantEmail` → `users.User.id` by querying `users.User` by `mail`; return 404 if not found with message "No se encontró un arrendatario con ese correo electrónico"
    - Check no active lease exists for unit (no lease with status "Vigente" and no end_date or future end_date); return 409 if conflict with message "Esta unidad ya tiene un arriendo activo"
    - Create `Lease` record in `landlord_portfolio` schema with `portfolio_unit_id`, `user_id`, `start_date`, `end_date`
    - Create `LeaseStatusHistory` in `tracking_process` schema with status "Acordado"
    - Create `LeaseCurrentStatus` in `tracking_process` pointing to the history entry
    - Return created lease as `LeaseListItemDto` (201 Created)
    - Add `POST /portfolio/:portfolioId/units/:unitId/leases` route to controller
    - Add Swagger decorators: `@ApiCreatedResponse({ type: LeaseListItemDto })`, `@ApiNotFoundResponse`, `@ApiForbiddenResponse`, `@ApiConflictResponse`
    - _Requirements: 12.4, 12.5, 12.6, 12.7, 12.8, 12.9_

- [x] 16. Checkpoint — Verify backend endpoints and full integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Final accessibility and wiring review
  - Verify all form fields have programmatically associated labels (`htmlFor` or `aria-label`)
  - Verify all validation errors use `aria-describedby` and `aria-live="polite"`
  - Verify all interactive elements have min 44×44px touch targets
  - Verify keyboard navigation (Tab/Shift+Tab/Enter) works in all forms and wizard
  - Verify semantic HTML (`main`, `section`, `table`, `thead`, `tbody`, `th`, `td`, heading hierarchy)
  - Verify `aria-busy="true"` on loading states, `role="alert"` on error messages, `role="status"` on success messages
  - Verify all pages use `LandlordRoute` wrapper for auth + LANDLORD role protection
  - Verify all routes use Spanish paths as specified in design
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10_

- [x] 18. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each module
- Property tests validate universal correctness properties from the design document (P1–P6)
- Unit tests validate specific examples and edge cases
- All UI text is in Spanish; all code identifiers are in English
- Use design system tokens (`text-h1`, `text-h3`, `text-body`, `text-caption`, `text-small`) — never Tailwind default text sizes
- Form pages use `max-w-[560px]` centered container pattern
- Currency formatting uses `formatCOP`/`stripCOP` helpers

---

## Post-Implementation Changes

The following changes were made during and after implementation, deviating from or extending the original spec.

### PI-1. GetPortfolioUseCase — Cross-Schema Property Resolution
- **Files changed:** `src/backend/modules/landlord-portfolio/application/use-cases/get-portfolio.use-case.ts`, `src/backend/modules/landlord-portfolio/application/dtos/portfolio-unit-response.dto.ts`
- The `GetPortfolioUseCase` was enhanced to resolve property details (propertyType, address, numberOfRooms, numberOfBathrooms, area) from the `Property` and `Address` tables via `prisma.property.findUnique({ include: { address: true } })`. Area is computed as `length × width`.
- `PortfolioUnitResponseDto` was extended with optional fields: `propertyType?`, `address?`, `numberOfRooms?`, `numberOfBathrooms?`, `area?`.
- _New requirements: 16.1_

### PI-2. Frontend PortfolioUnit Type Extended
- **File changed:** `src/frontend/modules/landlord-portfolio/types.ts`
- The `PortfolioUnit` interface was extended with optional fields: `propertyType?`, `address?`, `numberOfRooms?`, `numberOfBathrooms?`, `area?` — populated by the enhanced backend endpoint.
- _New requirements: 16.6_

### PI-3. Enhanced Unit Cards (Figma Design Match)
- **Files changed:** `src/frontend/modules/landlord-portfolio/components/UnitCard.tsx`, `src/frontend/app/mi-portafolio/[id]/unidades/page.tsx`
- Unit cards redesigned to show: property icon (house in circular gray bg), property type subtitle, address with location pin icon, property details row (area m², rooms hab, baths baños separated by dots), tenant section with chevron navigation for occupied units, "Publicada en Explorar" green pill indicator, "Ver historial" link only for non-occupied units.
- _New requirements: 16.2, 16.3, 16.4, 16.5_

### PI-4. Consistent Back Button Pattern
- **Pages updated:** publicar, arriendos, arriendos/crear, arriendos/[leaseId], arriendos/[leaseId]/crear-contrato, mis-ingresos/portafolio/[portfolioId], mis-ingresos/portafolio/[portfolioId]/unidad/[unitId]
- All pages updated to use `<Link>` from `next/link` (not `<button>` + `router.push()`), `rounded-card` class, and the left-arrow SVG icon (line + polyline) instead of the chevron icon.
- _New requirements: 17.1, 17.2, 17.3, 17.4_

### PI-5. mapPortfolioUnitToUnitInfo Uses Real Data
- **Pages updated:** publicar, arriendos, arriendos/crear
- The `mapPortfolioUnitToUnitInfo` function was updated to use real property data from the enhanced backend response instead of hardcoding zeros for rooms, baths, address, and propertyType.
- _New requirements: 16.6_
