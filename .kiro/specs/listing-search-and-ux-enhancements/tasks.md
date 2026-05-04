# Implementation Plan: Listing Search and UX Enhancements

## Overview

This plan implements ten interconnected improvements across backend schema, API endpoints, frontend components, and bug fixes. Tasks are ordered by dependency: database schema first, then backend endpoints and use cases, then frontend components, and finally cross-cutting tests. Each task builds incrementally on previous work so there is no orphaned code.

## Tasks

- [x] 1. Extend AdditionalFeature schema with new columns
  - [x] 1.1 Create Prisma migration adding columns to AdditionalFeature
    - Add `type String @default("text")`, `element String @default("text_field")`, `active Boolean @default(true)`, `main Boolean @default(false)`, `required Boolean @default(false)`, `error_message String?` to the `AdditionalFeature` model in `src/backend/db/prisma/schema.prisma`
    - Generate and apply the migration via `npm run migration:generate` with name `add_additional_feature_metadata`
    - Defaults ensure backward compatibility with existing rows
    - _Requirements: 3.1_

- [x] 2. Backend: Additional features endpoint and listing filter extensions
  - [x] 2.1 Create GetAdditionalFeaturesUseCase and AdditionalFeatureResponseDto
    - Create `src/backend/modules/property-listings/application/dtos/additional-feature-response.dto.ts` with fields: `id`, `name`, `description`, `type`, `element`, `active`, `main`, `required`, `errorMessage` — all decorated with `@ApiProperty`/`@ApiPropertyOptional`
    - Create `src/backend/modules/property-listings/application/use-cases/get-additional-features.use-case.ts` that queries `AdditionalFeature` where `active: true` and `deleted_at: null`, with optional `main` boolean filter
    - _Requirements: 3.2_

  - [x] 2.2 Add GET /listings/additional-features route to PropertyListingsController
    - Add `@Public() @Get('additional-features')` route in `src/backend/modules/property-listings/property-listings.controller.ts`
    - Accept optional `@Query('main')` boolean parameter
    - Inject and call `GetAdditionalFeaturesUseCase`
    - Register the use case in `property-listings.module.ts` providers
    - _Requirements: 3.2_

  - [x] 2.3 Extend ListingFiltersDto with department and additionalFeatures params
    - Add `department?: string` (DANE department code) to `src/backend/modules/property-listings/application/dtos/listing-filters.dto.ts` with `@IsOptional() @IsString()` and `@ApiPropertyOptional`
    - Add `additionalFeatures?: string` (JSON-encoded `Record<string, string>`) with `@IsOptional() @IsString()` — parsed in the use case
    - Update the `ListingFilters` interface in `src/backend/modules/property-listings/domain/ports/listing-repository.port.ts` to include `department?: string` and `additionalFeatures?: Record<string, string>`
    - _Requirements: 2.4, 3.5_

  - [x] 2.4 Update SearchListingsUseCase and repository to filter by department and additionalFeatures
    - In `SearchListingsUseCase`, parse the `additionalFeatures` JSON string from the DTO into a `Record<string, string>` before passing to the repository
    - Update the Prisma repository's `findPublished` method to add `WHERE` conditions: filter by `Address.state` matching department name (resolve department code → name via `Department` table), and filter by `PropertyAdditionalFeature` entries matching each key-value pair in `additionalFeatures`
    - _Requirements: 2.3, 3.5_

  - [ ]* 2.5 Write property test for location filter correctness
    - **Property 1: Location filter correctness**
    - **Validates: Requirements 2.3**

  - [ ]* 2.6 Write property test for additional feature filter correctness
    - **Property 2: Additional feature filter correctness**
    - **Validates: Requirements 3.5**

- [x] 3. Checkpoint — Ensure backend schema and endpoints compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend: CancelLeaseUseCase
  - [x] 4.1 Create CancelLeaseUseCase
    - Create `src/backend/modules/landlord-portfolio/application/use-cases/cancel-lease.use-case.ts`
    - Implement transactional logic: verify portfolio ownership (403 if not owner), verify unit belongs to portfolio, find lease and verify it belongs to unit, check lease status is "Acordado" (409 otherwise), check associated contract status — SIGNED → 409 conflict, PENDING/SIGNATURE_PENDING → soft-delete contract, none → proceed
    - Soft-delete lease (set `deleted_at`), create `LeaseStatusHistory` entry with "Finalizado" status, update `LeaseCurrentStatus` to "Finalizado"
    - Use `AuditLoggerService` to log the cancellation action
    - Follow the same ownership verification pattern as `CreateLeaseUseCase` and `GetLeaseDetailUseCase`
    - _Requirements: 8.3, 8.4, 8.5, 8.7_

  - [x] 4.2 Add DELETE route to LandlordPortfolioController
    - Add `@Delete(':portfolioId/units/:unitId/leases/:leaseId')` route in `src/backend/modules/landlord-portfolio/landlord-portfolio.controller.ts`
    - Inject `CancelLeaseUseCase` in the controller constructor
    - Register the use case in `landlord-portfolio.module.ts` providers
    - Add Swagger decorators: `@ApiOperation`, `@ApiOkResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`
    - _Requirements: 8.3, 8.7_

  - [ ]* 4.3 Write property test for lease cancellation state transitions
    - **Property 6: Lease cancellation state transitions**
    - **Validates: Requirements 8.3, 8.4**

  - [ ]* 4.4 Write property test for signed contract blocks cancellation
    - **Property 7: Signed contract blocks cancellation**
    - **Validates: Requirements 8.5**

  - [ ]* 4.5 Write property test for ownership authorization on cancellation
    - **Property 8: Ownership authorization on cancellation**
    - **Validates: Requirements 8.7**

- [x] 5. Backend: Fix contract date validation
  - [x] 5.1 Add date validation guard in UploadContractUseCase
    - In `src/backend/modules/contracts/application/use-cases/upload-contract.use-case.ts`, add a guard after `new Date(dto.startDate)` that checks `isNaN(parsedStartDate.getTime())` and throws `UnprocessableEntityException` with message "La fecha de inicio no es válida. Use formato ISO 8601 (ej: 2025-01-15)"
    - Apply the same guard for `dto.endDate` if provided
    - _Requirements: 10.2_

  - [ ]* 5.2 Write property test for backend ISO 8601 date validation
    - **Property 10: Backend ISO 8601 date validation**
    - **Validates: Requirements 10.2**

- [x] 6. Checkpoint — Ensure all backend changes compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Frontend: Update ListingFilters type and useFilters hook
  - [x] 7.1 Extend ListingFilters type with department and additionalFeatures
    - In `src/frontend/modules/property-listings/types.ts`, add `department?: string` and `additionalFeatures?: Record<string, string>` to the `ListingFilters` interface
    - Update `useFilters.ts` to handle the new `additionalFeatures` field — serialize as JSON string for URL params and parse back on read
    - _Requirements: 2.4, 3.5_

- [x] 8. Frontend: Backend-driven FilterPanel
  - [x] 8.1 Replace hardcoded CITIES with backend-driven department/city dropdowns
    - In `src/frontend/modules/property-listings/components/FilterPanel.tsx`, remove the hardcoded `CITIES` array
    - Fetch departments from `GET /portfolio/departments` on mount
    - Add a department `<select>` dropdown above the city dropdown
    - When a department is selected, fetch cities from `GET /portfolio/departments/:code/cities` and populate the city dropdown
    - Disable city dropdown when no department is selected, showing "Primero selecciona un departamento"
    - Clear city and neighborhood when department changes
    - Handle fetch errors with "No se pudieron cargar las opciones" message and retry button
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [x] 8.2 Add additional features sections to FilterPanel
    - Fetch active additional features from `GET /listings/additional-features` on mount
    - Render `main: true` features in the basic filter section, dynamically creating inputs based on `element` type (text_field → text input, dropdown → select, checkbox → checkbox, number_field → numeric input)
    - Render `main: false && active: true` features in an expandable "Filtros avanzados" section
    - Include additional feature values in the filter object passed to `onApply`
    - Handle fetch failure gracefully — show only built-in filters
    - _Requirements: 3.3, 3.4_

- [x] 9. Frontend: KeywordSearchBar component
  - [x] 9.1 Create KeywordSearchBar component with prefetch and debounce
    - Create `src/frontend/modules/property-listings/components/KeywordSearchBar.tsx`
    - On mount, prefetch catalogs: departments, cities (for all active departments), property types, and main additional features — store in component state
    - Implement 300ms debounce on input changes using a `useDebounce` hook or `setTimeout`
    - On debounced input change, perform case-insensitive substring matching against prefetched catalogs
    - Display suggestion dropdown with structured labels (e.g., "departamento: Antioquia", "ciudad: Cali", "tipo: Apartamento")
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 9.2 Implement TagChip pattern and Buscar button
    - On suggestion click, add a `TagChip` (pill element with remove button) below the search bar and clear the text input
    - On chip remove, remove the corresponding filter — no API call
    - On "Buscar" button click, convert all active TagChips to `ListingFilters` and call `onSearch` callback
    - Synchronize TagChip filters with FilterPanel state so both reflect the same active filters
    - _Requirements: 5.7, 5.8, 5.9, 5.10, 5.11_

  - [x] 9.3 Integrate KeywordSearchBar into the explore page
    - In `src/frontend/app/explorar/page.tsx`, add `KeywordSearchBar` above the `ActionBar`
    - Wire `onSearch` to the existing `setFilters` from `useFilters` hook
    - Pass `currentFilters` so the search bar can reflect externally applied filters
    - _Requirements: 5.1, 5.11_

  - [ ]* 9.4 Write property test for case-insensitive substring suggestion matching
    - **Property 5: Case-insensitive substring suggestion matching**
    - Export the `filterSuggestions` pure function from KeywordSearchBar and test it with fast-check
    - **Validates: Requirements 5.5**

- [x] 10. Frontend: Landing page
  - [x] 10.1 Replace redirect with static landing page at /
    - Replace the content of `src/frontend/app/page.tsx` (currently `redirect('/explorar')`) with a static landing page component
    - Include a `<nav>` with links to: `/explorar` (Explorar), `/auth/login` (Iniciar sesión), `/auth/registro` (Registrarse)
    - Include a hero section with a brief platform description (facilitating urban housing rental in Colombia)
    - Include a prominent "Buscar inmuebles" CTA button linking to `/explorar` using Primary_Button_Style
    - Follow mobile-first responsive design, design system tokens (`text-h1`, `text-h2`, `text-body`), WCAG 2.1 AA (contrast ≥ 4.5:1, touch targets ≥ 44px)
    - No API calls — fully static page for fast LCP
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 11. Checkpoint — Ensure frontend builds and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Frontend: Lease detail page redesign with cards
  - [ ] 12.1 Redesign LeaseDetailPage with card-based layout
    - Update the lease detail page component to organize information into three card sections: "Inmueble" (property type, rooms, bathrooms, area, address), "Arrendatario" (full name, document, email, phone), and "Acuerdo" (monthly amount, start date, end date, contract link, contract status)
    - Each card section uses visible border/background consistent with platform card styling (`border border-neutral-200 rounded-card bg-white p-4`)
    - Display lease status using `StatusBadge` with `lease` variant at the top
    - Include a back arrow header navigating to the unit detail page
    - Maintain all existing information fields
    - Follow mobile-first responsive design and WCAG 2.1 AA
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 12.2 Add "Cancelar arriendo" button and cancellation flow
    - Show "Cancelar arriendo" button only when lease status is "Acordado"
    - On click, display `ConfirmationDialog` explaining consequences of cancellation
    - On confirm, call `DELETE /portfolio/:pid/units/:uid/leases/:lid` with auth token
    - Handle 409 conflict (signed contract) by showing the error message from the backend
    - On success, navigate to unit detail page and display a success toast/message
    - _Requirements: 8.1, 8.2, 8.5, 8.6_

- [ ] 13. Frontend: Contract screens visual consistency
  - [ ] 13.1 Update ContractDetailView with card-based sections
    - In `src/frontend/modules/landlord-contracts/components/ContractDetailView.tsx`, wrap existing sections in card containers with `border border-neutral-200 rounded-card bg-white p-4`
    - Organize into three card sections: "Términos" (dates, status), "Partes" (landlord and tenant), "Documento" (file download, replace, delete actions)
    - Ensure `StatusBadge` with `contract` variant is used consistently
    - Use design system typography tokens (`text-h2`, `text-h3`, `text-body`, `text-caption`)
    - _Requirements: 9.2, 9.4_

  - [ ] 13.2 Update ContractWizard with design system consistency
    - In `src/frontend/modules/landlord-contracts/components/ContractWizard.tsx`, ensure all CTAs use Primary_Button_Style
    - Verify design system typography tokens are used throughout
    - Ensure consistent input field styling matching the platform patterns
    - _Requirements: 9.3, 9.5_

- [ ] 14. Frontend: Fix "Invalid Date" bug
  - [ ] 14.1 Fix formatDate function in ContractDetailView
    - In `src/frontend/modules/landlord-contracts/components/ContractDetailView.tsx`, update the `formatDate` function to handle empty, null, or invalid date strings by returning "—" instead of "Invalid Date"
    - Add guard: `if (!dateStr) return '—'; const date = new Date(dateStr); if (isNaN(date.getTime())) return '—';`
    - _Requirements: 10.1, 10.4_

  - [ ] 14.2 Add frontend date validation in contract wizard step 2
    - In `src/frontend/modules/landlord-contracts/validation.ts`, update `validateContractStep2` to check for invalid date strings: if `data.startDate` is truthy but `isNaN(new Date(data.startDate).getTime())`, set error "La fecha de inicio es obligatoria"
    - This prevents the form from submitting with a value that would produce "Invalid Date"
    - _Requirements: 10.3_

  - [ ]* 14.3 Write property test for date formatting never produces "Invalid Date"
    - **Property 9: Date formatting never produces "Invalid Date"**
    - Export the `formatDate` function and test with fast-check: valid ISO dates produce Spanish locale format, invalid/empty strings produce "—"
    - **Validates: Requirements 10.1, 10.4**

  - [ ]* 14.4 Write property test for frontend empty/invalid date validation
    - **Property 11: Frontend empty/invalid date validation**
    - Test `validateContractStep2` with fast-check: empty/null/NaN-producing strings always return the error message "La fecha de inicio es obligatoria"
    - **Validates: Requirements 10.3**

- [ ] 15. Additional features in listing creation
  - [ ] 15.1 Update listing creation form to render additional feature fields
    - In the listing creation/publishing flow, fetch active additional features from `GET /listings/additional-features` and render input fields based on each feature's `element` type
    - Mark fields as required when `required: true`, display the configured `error_message` when validation fails
    - Submit additional feature values as part of the listing creation payload, persisted in `PropertyAdditionalFeature`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 15.2 Write property test for required feature validation with error message
    - **Property 3: Required feature validation with error message**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 15.3 Write property test for additional feature type validation
    - **Property 4: Additional feature type validation**
    - **Validates: Requirements 4.5**

- [ ] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check (minimum 100 iterations per property)
- Unit tests validate specific examples and edge cases
- The implementation language is TypeScript across the full stack (NestJS backend, Next.js frontend)
