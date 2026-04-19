# Implementation Plan: Colombian Geographic Catalog

## Overview

Add Department and City catalog tables to the `property_listings` schema, seed them from the DANE CSV file, expose public GET endpoints for cascading dropdowns, validate department/city codes in unit creation, and extend the AddUnitForm with cascading department → city selectors. Implementation follows hexagonal architecture order: schema → seed → domain → infrastructure → application → controller → frontend.

## Tasks

- [x] 1. Add Department and City models to Prisma schema and generate migration
  - Add the `Department` model to `src/backend/db/prisma/schema.prisma` in the `property_listings` schema section with columns: `id` (UUID PK), `code` (unique String, 2-digit DANE code), `name` (String), `is_active` (Boolean, default true), and a `cities City[]` relation
  - Add the `City` model with columns: `id` (UUID PK), `code` (unique String, 5-digit DANE code), `department_code` (String), `name` (String), `is_active` (Boolean, default true), and a `@relation(fields: [department_code], references: [code])` to Department
  - Run `npm run migration:generate` from `src/backend/` to create the migration
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Seed Department and City catalog data from DANE CSV
  - Add a new "Departments & Cities (DANE CSV)" section to `src/backend/db/seeds/seed.ts` after the Property Types block
  - Import `fs` and `path`, read `states_citys_colombia.seed.csv` with `fs.readFileSync(csvPath, 'utf-8')` to preserve accented characters
  - Parse semicolon-delimited content, trim whitespace from column headers and values
  - Extract unique departments from CSV columns `Código_Departamento` and `Nombre_Departamento`, upsert each into Department using `where: { code }` with `is_active: true`
  - Upsert each municipality row into City using `where: { code }` with `department_code`, `name`, and `is_active: true`
  - Log count of departments and cities seeded upon completion
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Backend domain and infrastructure
  - [x] 3.1 Extend IPortfolioRepository port with geographic catalog methods
    - Add `findAllDepartments(): Promise<{ id: string; code: string; name: string }[]>` to the interface in `portfolio-repository.port.ts`
    - Add `findCitiesByDepartmentCode(departmentCode: string): Promise<{ id: string; code: string; departmentCode: string; name: string }[]>` to the interface
    - Add `findDepartmentByCode(code: string): Promise<{ id: string; code: string; name: string } | null>` to the interface
    - Add `findCityByCode(code: string): Promise<{ id: string; code: string; departmentCode: string; name: string } | null>` to the interface
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 3.2 Update CreateEnrichedUnitData interface with new required fields
    - Add `departmentName: string`, `cityName: string`, `departmentCode: string`, `cityCode: string` as required fields in the `CreateEnrichedUnitData` interface in `portfolio-repository.port.ts`
    - _Requirements: 10.2_

  - [x] 3.3 Implement geographic catalog methods in PrismaPortfolioRepository
    - Implement `findAllDepartments` — query `prisma.department.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } })`, map to `{ id, code, name }`
    - Implement `findCitiesByDepartmentCode` — query `prisma.city.findMany({ where: { department_code: departmentCode, is_active: true }, orderBy: { name: 'asc' } })`, map to `{ id, code, departmentCode, name }`
    - Implement `findDepartmentByCode` — query `prisma.department.findUnique({ where: { code } })`, return `{ id, code, name }` or null if not found or inactive
    - Implement `findCityByCode` — query `prisma.city.findUnique({ where: { code } })`, return `{ id, code, departmentCode, name }` or null if not found or inactive
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 3.4 Update PrismaPortfolioRepository.createEnrichedUnit() to use department/city names
    - Update the `Address.create` call inside `createEnrichedUnit` to use `data.departmentName` for `state` and `data.cityName` for `city` instead of empty strings
    - _Requirements: 7.5_

  - [ ]* 3.5 Write property test for findAllDepartments active-only filtering and ordering
    - **Property 1: Active-only department filtering with name ordering**
    - **Validates: Requirements 4.3, 4.4, 6.1**

  - [ ]* 3.6 Write property test for findCitiesByDepartmentCode filtering and ordering
    - **Property 2: Active city filtering by department with name ordering**
    - **Validates: Requirements 5.4, 5.5, 6.2**

- [x] 4. Backend application layer
  - [x] 4.1 Create DepartmentResponseDto and CityResponseDto
    - Create `src/backend/modules/landlord-portfolio/application/dtos/department-response.dto.ts` with `@ApiProperty()` decorators on `id`, `code`, `name` fields
    - Create `src/backend/modules/landlord-portfolio/application/dtos/city-response.dto.ts` with `@ApiProperty()` decorators on `id`, `code`, `departmentCode`, `name` fields
    - _Requirements: 4.5, 5.7_

  - [x] 4.2 Update CreateEnrichedUnitDto with required departmentCode and cityCode fields
    - Add `departmentCode` field with `@ApiProperty`, `@IsString()`, `@IsNotEmpty()` decorators
    - Add `cityCode` field with `@ApiProperty`, `@IsString()`, `@IsNotEmpty()` decorators
    - _Requirements: 10.1_

  - [x] 4.3 Update EnrichedUnitResponseDto with departmentCode and cityCode fields
    - Add `departmentCode` and `cityCode` fields with `@ApiProperty()` decorators
    - _Requirements: 10.3_

  - [x] 4.4 Add department/city validation to CreateEnrichedUnitUseCase
    - After propertyType validation, call `findDepartmentByCode(dto.departmentCode)` — if null, throw `BadRequestException` with descriptive message referencing `GET /portfolio/departments`
    - Call `findCityByCode(dto.cityCode)` — if null or `city.departmentCode !== dto.departmentCode`, throw `BadRequestException` with descriptive message referencing `GET /portfolio/departments/:departmentCode/cities`
    - Pass resolved `departmentName`, `cityName`, `departmentCode`, `cityCode` to `createEnrichedUnit` data
    - Update `toResponseDto` to include `departmentCode` and `cityCode` in the response
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 4.5 Write property test for CreateEnrichedUnitUseCase geographic validation
    - **Property 3: Geographic validation accepts valid department+city and rejects invalid**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

  - [ ]* 4.6 Write property test for Address populated from catalog names
    - **Property 4: Address populated from catalog names**
    - **Validates: Requirements 7.5**

- [x] 5. Backend controller layer
  - [x] 5.1 Add GET /portfolio/departments endpoint
    - Add `@Public()` + `@Get('departments')` route to `LandlordPortfolioController` — must be declared BEFORE `:portfolioId` routes to avoid param collision
    - Add `@ApiOperation`, `@ApiOkResponse({ type: [DepartmentResponseDto] })` decorators
    - Return `this.portfolioRepository.findAllDepartments()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Add GET /portfolio/departments/:departmentCode/cities endpoint
    - Add `@Public()` + `@Get('departments/:departmentCode/cities')` route — must be declared BEFORE `:portfolioId` routes
    - Add `@ApiOperation`, `@ApiParam({ name: 'departmentCode' })`, `@ApiOkResponse({ type: [CityResponseDto] })` decorators
    - Return `this.portfolioRepository.findCitiesByDepartmentCode(departmentCode)`
    - Return empty array for non-existent department codes (no error)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 6. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Ensure tsc, linting and formatting pass

- [x] 7. Frontend types and service
  - [x] 7.1 Add Department and City interfaces and update existing types
    - Add `Department` interface with `id: string`, `code: string`, `name: string` to `src/frontend/modules/landlord-portfolio/types.ts`
    - Add `City` interface with `id: string`, `code: string`, `departmentCode: string`, `name: string`
    - Add required `departmentCode: string` and `cityCode: string` fields to `CreateUnitRequest`
    - Add `departmentCode: string` and `cityCode: string` fields to `EnrichedUnitFormData`
    - Add `departmentCode: string` and `cityCode: string` fields to `EnrichedUnitResponse`
    - _Requirements: 9.1, 9.2, 10.4, 10.5_

  - [x] 7.2 Add getDepartments() and getCitiesByDepartment() to portfolioService
    - Add `getDepartments(): Promise<Department[]>` — GET to `/portfolio/departments`, no auth token needed
    - Add `getCitiesByDepartment(departmentCode: string): Promise<City[]>` — GET to `/portfolio/departments/${departmentCode}/cities`, no auth token needed
    - Follow same error handling pattern as `getPropertyTypes()` (network error, server error ≥ 500)
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 8. Frontend AddUnitForm — add cascading department and city dropdowns
  - Add `useState` for `departments` array, `isLoadingDepartments` boolean, `cities` array, `isLoadingCities` boolean
  - Add `useEffect` to fetch departments on mount via `portfolioService.getDepartments()` (same pattern as property types fetch)
  - Add `useEffect` to fetch cities when `formData.departmentCode` changes via `portfolioService.getCitiesByDepartment()`; clear cities when no department selected
  - Add `handleDepartmentChange` that calls `handleChange('departmentCode', value)` and `handleChange('cityCode', '')` to clear city on department change
  - Render department `<select>` with `<Skeleton>` while loading, disabled default option "Selecciona un departamento", options mapped from fetched departments (`d.code` as value, `d.name` as label)
  - Render city `<select>` with `<Skeleton>` while loading, disabled when no department selected, disabled default option "Selecciona una ciudad", options mapped from fetched cities (`c.code` as value, `c.name` as label)
  - Both selects must have `min-h-[44px]`, associated `<label>`, and `aria-describedby` linking to validation error messages
  - Update `initialFormData` to include `departmentCode: ''` and `cityCode: ''`
  - Update `handleSubmit` to include `departmentCode` and `cityCode` in the `CreateUnitRequest`
  - Add validation for `departmentCode` and `cityCode` in `validateEnrichedUnitForm` in `validation.ts` (required fields)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12_

  - [ ]* 8.1 Write property test for department dropdown rendering
    - **Property 5: Department dropdown renders catalog faithfully**
    - **Validates: Requirements 8.3**

  - [ ]* 8.2 Write property test for city dropdown rendering
    - **Property 6: City dropdown renders catalog faithfully**
    - **Validates: Requirements 8.7**

  - [ ]* 8.3 Write property test for department change clears city
    - **Property 7: Department change clears city and triggers city fetch**
    - **Validates: Requirements 8.5, 8.9**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Ensure tsc, linting and formatting pass including tests

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The implementation follows hexagonal architecture order: schema → seed → domain → infrastructure → application → controller → frontend
- The Department/City catalog mirrors the PropertyType/DocumentType pattern at every layer
- `departmentCode` and `cityCode` are required fields — no backward compatibility needed
- The CSV seed parsing handles semicolon delimiters, whitespace trimming, and UTF-8 accented characters
- The City model has a Prisma `@relation` to Department within the same `property_listings` schema
- Frontend cascading dropdowns: selecting a department fetches and populates the city dropdown
