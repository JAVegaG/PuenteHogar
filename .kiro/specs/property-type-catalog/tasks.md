# Implementation Plan: PropertyType Catalog

## Overview

Replace the free-text `propertyType` field with a catalog-driven `PropertyType` table, following the DocumentType pattern. Implementation follows hexagonal architecture order: schema → seed → domain → infrastructure → application → controller → frontend.

## Tasks

- [x] 1. Add PropertyType model to Prisma schema and generate migration
  - Add the `PropertyType` model to `src/backend/db/prisma/schema.prisma` in the `property_listings` schema section with columns: `id` (UUID PK), `code` (unique String), `description` (String), `is_active` (Boolean, default true)
  - Run `npm run migration:generate` from `src/backend/` to create the migration
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Seed PropertyType catalog data
  - Add a new "Property Types" section to `src/backend/db/seeds/seed.ts` after the Document Types block
  - Upsert all 9 property types: APARTAMENTO, CASA, LOCAL, OFICINA, BODEGA, LOTE, FINCA, HABITACION, ESTUDIO with their Spanish descriptions
  - Use `where: { code }` for idempotent upsert, set `is_active: true` on all entries
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Backend domain and infrastructure
  - [x] 3.1 Extend IPortfolioRepository port with new methods
    - Add `findPropertyTypeByCode(code: string): Promise<{ id: string; code: string } | null>` to the interface in `portfolio-repository.port.ts`
    - Add `findAllPropertyTypes(): Promise<{ id: string; code: string; description: string }[]>` to the interface
    - _Requirements: 4.3, 4.4_

  - [x] 3.2 Implement new methods in PrismaPortfolioRepository
    - Implement `findPropertyTypeByCode` — query `prisma.propertyType.findUnique({ where: { code } })`, return `{ id, code }` or null
    - Implement `findAllPropertyTypes` — query `prisma.propertyType.findMany({ where: { is_active: true }, orderBy: { code: 'asc' } })`, map to `{ id, code, description }`
    - _Requirements: 4.3, 4.4_

  - [ ]* 3.3 Write property test for findAllPropertyTypes active-only filtering
    - **Property 1: Active-only filtering**
    - **Validates: Requirements 3.3, 4.4**

  - [ ]* 3.4 Write property test for findAllPropertyTypes alphabetical ordering
    - **Property 2: Alphabetical ordering invariant**
    - **Validates: Requirements 3.4**

- [x] 4. Backend application layer
  - [x] 4.1 Create PropertyTypeResponseDto
    - Create `src/backend/modules/landlord-portfolio/application/dtos/property-type-response.dto.ts`
    - Add `@ApiProperty()` decorators on `id`, `code`, `description` fields
    - _Requirements: 3.5_

  - [x] 4.2 Add propertyType validation to CreateEnrichedUnitUseCase
    - After portfolio ownership check, call `findPropertyTypeByCode(dto.propertyType)`
    - If null, throw `BadRequestException` with descriptive message referencing `GET /portfolio/property-types`
    - _Requirements: 4.1, 4.2_

  - [x] 4.3 Update CreateEnrichedUnitDto Swagger description
    - Change the `propertyType` field's `@ApiProperty` description from "Tipo de propiedad (texto libre)" to reference the catalog endpoint
    - _Requirements: 4.1_

  - [ ]* 4.4 Write property test for CreateEnrichedUnitUseCase validation
    - **Property 3: Validation accepts valid codes and rejects invalid codes**
    - **Validates: Requirements 4.1, 4.2**

- [x] 5. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Ensure linting and formatting pass

- [x] 6. Backend controller layer
  - [x] 6.1 Add GET /portfolio/property-types endpoint
    - Add `@Public()` + `@Get('property-types')` route to `LandlordPortfolioController` — must be declared BEFORE `:portfolioId` routes to avoid param collision
    - Inject `IPortfolioRepository` via `@Inject(PORTFOLIO_REPOSITORY)` in the controller constructor
    - Add `@ApiOperation`, `@ApiOkResponse({ type: [PropertyTypeResponseDto] })` decorators
    - Return `this.portfolioRepository.findAllPropertyTypes()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.2 Update LandlordPortfolioModule to export repository token
    - Ensure the `PORTFOLIO_REPOSITORY` provider is available for controller injection (already provided, just needs constructor injection in controller)
    - _Requirements: 3.1_

  - [x] 6.3 Update ListingFiltersDto Swagger description
    - Update the `propertyType` field description in `src/backend/modules/property-listings/application/dtos/listing-filters.dto.ts` to reference `GET /portfolio/property-types`
    - _Requirements: 8.4_

- [x] 7. Checkpoint - Ensure backend compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Frontend types and service
  - [x] 8.1 Add PropertyType interface
    - Add `PropertyType` interface with `id: string`, `code: string`, `description: string` to `src/frontend/modules/landlord-portfolio/types.ts`
    - _Requirements: 7.1_

  - [x] 8.2 Add getPropertyTypes() to portfolioService
    - Add `getPropertyTypes(): Promise<PropertyType[]>` to `src/frontend/shared/services/portfolio.ts`
    - No auth token needed — public endpoint
    - Follow same error handling pattern as other service methods (network error, server error ≥ 500)
    - _Requirements: 7.2, 7.3, 7.4_

- [x] 9. Frontend AddUnitForm — replace text input with select dropdown
  - Add `useState` for `propertyTypes` array and `isLoadingPropertyTypes` boolean
  - Add `useEffect` to fetch property types on mount via `portfolioService.getPropertyTypes()`
  - Replace the `<input>` for propertyType with a `<select>` element
  - Show `<Skeleton>` while loading (same pattern as `Step2PersonalData` document type dropdown)
  - Add disabled default option: "Selecciona un tipo de propiedad"
  - Map fetched types to `<option key={pt.code} value={pt.code}>{pt.description}</option>`
  - Keep `aria-describedby`, `min-h-[44px]`, associated `<label>`, and error display
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 10. Frontend FilterPanel — replace hardcoded PROPERTY_TYPES with dynamic fetch
  - Add `useState` for `propertyTypes` array and `isLoadingPropertyTypes` boolean
  - Add `useEffect` to fetch property types on mount via `portfolioService.getPropertyTypes()`
  - Remove the hardcoded `const PROPERTY_TYPES = ['Apartamento', 'Casa', 'Estudio', 'Habitación']` array
  - Replace property type `<select>` options with dynamically fetched types using `code` as value and `description` as label
  - On fetch failure: catch error silently, leave `propertyTypes` as empty array (graceful degradation — dropdown shows only "Todos los tipos")
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 10.1 Write property test for AddUnitForm dropdown rendering
  - **Property 4: AddUnitForm dropdown renders catalog faithfully**
  - **Validates: Requirements 5.3, 5.5**

- [ ]* 10.2 Write property test for FilterPanel dropdown rendering
  - **Property 5: FilterPanel dropdown renders catalog faithfully**
  - **Validates: Requirements 6.2, 6.3**

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Ensure tsc, linting and formatting pass including tests

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The implementation follows hexagonal architecture order: schema → domain → application → infrastructure → controller → frontend
- The PropertyType catalog mirrors the DocumentType pattern at every layer
