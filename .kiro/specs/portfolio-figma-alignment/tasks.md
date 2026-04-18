# Implementation Plan: Portfolio Figma Alignment

## Overview

This plan implements the backend and frontend changes to align the Landlord Portfolio module with Figma designs. The simplified approach reuses existing `Property` and `Address` tables instead of duplicating fields on `PortfolioUnit`. Only two schema changes are needed: `description` on `LandlordPortfolio` and `name` on `PortfolioUnit`. The backend follows hexagonal architecture (schema → domain → application → infrastructure → controller). The frontend follows the existing patterns (types → validation → service → components → pages). All code is TypeScript.

## Tasks

- [x] 1. Database schema migration
  - [x] 1.1 Add minimal new fields to Prisma schema
    - Add `description String?` to `LandlordPortfolio` model
    - Add `name String @default('')` to `PortfolioUnit` model
    - Only two columns added — all property data reuses existing `Property` and `Address` tables
    - File: `src/backend/db/prisma/schema.prisma`
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 1.2 Generate and apply Prisma migration
    - Run `npx prisma migrate dev --name add_portfolio_description_unit_name` from `src/backend/`
    - Verify migration SQL is incremental and non-destructive (ALTER TABLE ADD COLUMN with defaults)
    - _Requirements: 4.3_

- [x] 2. Backend domain layer updates
  - [x] 2.1 Update LandlordPortfolioEntity to include description field
    - Add `description: string | null` parameter to constructor
    - File: `src/backend/modules/landlord-portfolio/domain/entities/landlord-portfolio.entity.ts`
    - _Requirements: 4.1_

  - [x] 2.2 Create EnrichedPortfolioUnitEntity
    - New entity class with fields: id, portfolioId, name, propertyType, address, area (number | null, computed from length × width), numberOfRooms, numberOfBathrooms, description, leaseBaseAmount, leaseBaseCurrency, createdAt, updatedAt
    - File: `src/backend/modules/landlord-portfolio/domain/entities/enriched-portfolio-unit.entity.ts`
    - _Requirements: 3.11_

  - [x] 2.3 Create domain types for portfolio stats and enriched unit creation
    - Define `PortfolioWithStats` (includes propertyType: string | null), `CreatePortfolioData`, `CreateEnrichedUnitData` (includes propertyType, address, length?, width?, numberOfRooms, numberOfBathrooms, leaseBaseAmount, leaseBaseCurrency) interfaces
    - File: `src/backend/modules/landlord-portfolio/domain/ports/portfolio-repository.port.ts`
    - _Requirements: 1.2, 1.7, 2.1, 3.1_

  - [x] 2.4 Extend IPortfolioRepository port with new methods
    - Add `findPortfoliosByUserId(userId, page, limit)`, `getGlobalStats(userId)`, `createPortfolio(data)`, `findPortfolioById(portfolioId)`, `createEnrichedUnit(data)` to the port interface
    - File: `src/backend/modules/landlord-portfolio/domain/ports/portfolio-repository.port.ts`
    - _Requirements: 1.1, 1.7, 2.1, 3.1_

- [x] 3. Backend application layer — DTOs
  - [x] 3.1 Create ListPortfoliosQueryDto
    - Fields: `page?` (default 1, min 1), `limit?` (default 6, min 1, max 50) with class-validator decorators and Swagger annotations
    - File: `src/backend/modules/landlord-portfolio/application/dtos/list-portfolios-query.dto.ts`
    - _Requirements: 1.5_

  - [x] 3.2 Create PortfolioSummaryResponseDto
    - Fields: id, name, description, propertyType, creationDate, totalUnits, activeLeases, occupancyPercentage with Swagger annotations
    - File: `src/backend/modules/landlord-portfolio/application/dtos/portfolio-summary-response.dto.ts`
    - _Requirements: 1.2, 2.5_

  - [x] 3.3 Create PaginatedPortfoliosResponseDto
    - Fields: data (PortfolioSummaryResponseDto[]), total, page, limit, totalPages, globalTotalUnits, globalActiveLeases with Swagger annotations
    - File: `src/backend/modules/landlord-portfolio/application/dtos/paginated-portfolios-response.dto.ts`
    - _Requirements: 1.6, 1.7_

  - [x] 3.4 Create CreatePortfolioDto
    - Fields: name (@IsNotEmpty, @Length(1,200)), description? (@IsOptional, @MaxLength(500)) with Swagger annotations
    - File: `src/backend/modules/landlord-portfolio/application/dtos/create-portfolio.dto.ts`
    - _Requirements: 2.2, 2.3_

  - [x] 3.5 Create CreateEnrichedUnitDto
    - Fields: name (@IsNotEmpty, @Length(1,200)), address (@IsNotEmpty, @Length(1,300)), propertyType (@IsNotEmpty), length? (@IsOptional, @IsNumber, @IsPositive), width? (@IsOptional, @IsNumber, @IsPositive), numberOfRooms? (@IsOptional, @IsInt, @Min(0), default 0), numberOfBathrooms? (@IsOptional, @IsInt, @Min(0), default 0), description? (@IsOptional), leaseBaseAmount (@IsNumber, @Min(0)), leaseBaseCurrency? (@IsOptional, @Length(3,3), default "COP")
    - No unitType field, no VALID_UNIT_TYPES constant — propertyType is a free-text string
    - File: `src/backend/modules/landlord-portfolio/application/dtos/create-enriched-unit.dto.ts`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 3.6 Create EnrichedUnitResponseDto
    - Fields: id, portfolioId, name, propertyType, address, area (number | null — computed from length × width), numberOfRooms, numberOfBathrooms, description, leaseBaseAmount, leaseBaseCurrency, createdAt, updatedAt with Swagger annotations
    - File: `src/backend/modules/landlord-portfolio/application/dtos/enriched-unit-response.dto.ts`
    - _Requirements: 3.11_

- [x] 4. Backend application layer — Use cases
  - [x] 4.1 Create ListPortfoliosUseCase
    - Inject IPortfolioRepository, accept userId + ListPortfoliosQueryDto
    - Call `findPortfoliosByUserId` for paginated portfolios with stats (including propertyType from first Property), call `getGlobalStats` for global counters
    - Map to PaginatedPortfoliosResponseDto with totalPages = ceil(total/limit)
    - File: `src/backend/modules/landlord-portfolio/application/use-cases/list-portfolios.use-case.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [ ]* 4.2 Write unit tests for ListPortfoliosUseCase
    - Test empty portfolio list returns total:0 and global counters at zero
    - Test paginated response with correct metadata (totalPages, page, limit)
    - Test page exceeding totalPages returns empty data array
    - _Requirements: 1.8, 1.9_

  - [x] 4.3 Create CreatePortfolioUseCase
    - Inject IPortfolioRepository, accept CreatePortfolioDto + userId + userRoles
    - Validate LANDLORD role (throw ForbiddenException if missing)
    - Call `createPortfolio`, return PortfolioSummaryResponseDto with stats at zero and propertyType null
    - File: `src/backend/modules/landlord-portfolio/application/use-cases/create-portfolio.use-case.ts`
    - _Requirements: 2.1, 2.4, 2.5_

  - [ ]* 4.4 Write unit tests for CreatePortfolioUseCase
    - Test successful creation returns portfolio with zero stats and null propertyType
    - Test rejection with 403 when user lacks LANDLORD role
    - _Requirements: 2.4, 2.5_

  - [x] 4.5 Create CreateEnrichedUnitUseCase
    - Inject IPortfolioRepository, accept portfolioId + CreateEnrichedUnitDto + userId + userRoles
    - Validate LANDLORD role (throw ForbiddenException)
    - Call `findPortfolioById`, verify exists and userId matches (throw NotFoundException otherwise)
    - Call `createEnrichedUnit` (cross-schema transaction: creates Property + Address + PortfolioUnit), return EnrichedUnitResponseDto
    - File: `src/backend/modules/landlord-portfolio/application/use-cases/create-enriched-unit.use-case.ts`
    - _Requirements: 3.1, 3.9, 3.10, 3.11_

  - [ ]* 4.6 Write unit tests for CreateEnrichedUnitUseCase
    - Test successful creation returns enriched unit with all fields including computed area
    - Test rejection with 404 when portfolio not found
    - Test rejection with 404 when portfolio belongs to another user
    - Test rejection with 403 when user lacks LANDLORD role
    - _Requirements: 3.9, 3.10_

- [x] 5. Checkpoint — Backend application layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Backend infrastructure layer — Repository extension
  - [x] 6.1 Implement findPortfoliosByUserId in PrismaPortfolioRepository
    - Query LandlordPortfolio with pagination (skip/take), include `_count` of units and active leases (Lease where end_date is null or > now())
    - Calculate occupancyPercentage per portfolio: round((units with active lease / totalUnits) * 100), 0 if totalUnits is 0
    - Resolve propertyType by querying the first PortfolioUnit's Property.property_type via cross-schema lookup (PortfolioUnit.property_id → Property.property_type)
    - Return `{ portfolios: PortfolioWithStats[], total: number }`
    - File: `src/backend/modules/landlord-portfolio/infrastructure/repositories/prisma-portfolio.repository.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 6.2 Implement getGlobalStats in PrismaPortfolioRepository
    - Aggregate totalUnits and activeLeases across all portfolios for the user
    - File: `src/backend/modules/landlord-portfolio/infrastructure/repositories/prisma-portfolio.repository.ts`
    - _Requirements: 1.7_

  - [x] 6.3 Implement createPortfolio in PrismaPortfolioRepository
    - Create LandlordPortfolio record with name, description, user_id
    - Return LandlordPortfolioEntity (with description field)
    - File: `src/backend/modules/landlord-portfolio/infrastructure/repositories/prisma-portfolio.repository.ts`
    - _Requirements: 2.1_

  - [x] 6.4 Implement findPortfolioById in PrismaPortfolioRepository
    - Find LandlordPortfolio by id, return LandlordPortfolioEntity or null
    - File: `src/backend/modules/landlord-portfolio/infrastructure/repositories/prisma-portfolio.repository.ts`
    - _Requirements: 3.9_

  - [x] 6.5 Implement createEnrichedUnit in PrismaPortfolioRepository
    - Use `prisma.$transaction` for atomicity across schemas
    - Create Property in property_listings schema (property_type from dto.propertyType, length, width, number_of_rooms, number_of_bathrooms)
    - Create Address in property_listings schema (address string from dto.address, property_id)
    - Create PortfolioUnit in landlord_portfolio schema (name, portfolio_id, property_id, conditions=dto.description, lease_base_amount, lease_base_currency)
    - Create PortfolioRaw audit record
    - Compute area = length × width if both present, else null
    - Return EnrichedPortfolioUnitEntity with joined data
    - File: `src/backend/modules/landlord-portfolio/infrastructure/repositories/prisma-portfolio.repository.ts`
    - _Requirements: 3.1, 3.11_

- [x] 7. Backend controller — New endpoints
  - [x] 7.1 Add GET /portfolio endpoint to LandlordPortfolioController
    - Accept ListPortfoliosQueryDto as @Query, extract userId from request
    - Call ListPortfoliosUseCase, return PaginatedPortfoliosResponseDto
    - Add Swagger decorators (@ApiOperation, @ApiOkResponse)
    - File: `src/backend/modules/landlord-portfolio/landlord-portfolio.controller.ts`
    - _Requirements: 1.1_

  - [x] 7.2 Add POST /portfolio endpoint to LandlordPortfolioController
    - Accept CreatePortfolioDto as @Body, extract userId and roles from request
    - Call CreatePortfolioUseCase, return PortfolioSummaryResponseDto with 201 status
    - Add Swagger decorators
    - File: `src/backend/modules/landlord-portfolio/landlord-portfolio.controller.ts`
    - _Requirements: 2.1_

  - [x] 7.3 Add POST /portfolio/:portfolioId/units endpoint to LandlordPortfolioController
    - Accept CreateEnrichedUnitDto as @Body, portfolioId as @Param, extract userId and roles from request
    - Call CreateEnrichedUnitUseCase, return EnrichedUnitResponseDto with 201 status
    - Add Swagger decorators
    - File: `src/backend/modules/landlord-portfolio/landlord-portfolio.controller.ts`
    - _Requirements: 3.1_

  - [x] 7.4 Register new use cases in LandlordPortfolioModule
    - Add ListPortfoliosUseCase, CreatePortfolioUseCase, CreateEnrichedUnitUseCase to providers and exports
    - Inject them in the controller constructor
    - File: `src/backend/modules/landlord-portfolio/landlord-portfolio.module.ts`
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 8. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.
  - Ensure linting and formatting pass.

- [ ]* 9. Backend property-based tests
  - [ ]* 9.1 Write property test for pagination correctness (Property 3)
    - **Property 3: Pagination returns correct subset and metadata**
    - Generate random total N, page p (≥1), limit l (1–50) with fast-check
    - Verify: at most l items, offset = (p-1)*l, totalPages = ceil(N/l), empty data when p > totalPages
    - **Validates: Requirements 1.5, 1.6, 1.8, 1.9**

  - [ ]* 9.2 Write property test for occupancy calculation (Property 2)
    - **Property 2: Active lease count and occupancy calculation**
    - Generate portfolios with units and leases (mix of active/expired) with fast-check
    - Verify activeLeases count and occupancyPercentage = round((occupied/total)*100), 0 when totalUnits=0
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 9.3 Write property test for global stats aggregation (Property 4)
    - **Property 4: Global stats are sum of individual portfolio stats**
    - Generate user with multiple portfolios, verify globalTotalUnits = sum(totalUnits), globalActiveLeases = sum(activeLeases)
    - **Validates: Requirements 1.7**

  - [ ]* 9.4 Write property test for portfolio creation validation (Property 6)
    - **Property 6: Portfolio creation validation rejects invalid input**
    - Generate strings of random length, verify: empty or >200 chars name → rejected (400), >500 chars description → rejected (400), valid inputs → accepted
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 9.5 Write property test for portfolio creation round-trip (Property 5)
    - **Property 5: Portfolio creation round-trip**
    - Generate valid names (1–200 chars) and descriptions (≤500 chars), create and retrieve, verify data matches, stats are zero, and propertyType is null
    - **Validates: Requirements 2.1, 2.5**

  - [ ]* 9.6 Write property test for enriched unit creation round-trip (Property 7)
    - **Property 7: Enriched unit creation round-trip**
    - Generate valid enriched unit data (valid name, non-empty address, non-empty propertyType, optional positive length/width, non-negative integers for rooms/bathrooms, non-negative leaseBaseAmount), create unit, verify all fields match and area = length × width when both present
    - **Validates: Requirements 3.1, 3.11**

- [x] 10. Frontend types and constants
  - [x] 10.1 Add new TypeScript interfaces to frontend types
    - Add `PortfolioSummary` (with propertyType: string | null), `PaginatedPortfolios`, `CreatePortfolioRequest`, `CreateUnitRequest` (with name, address, propertyType, length?, width?, numberOfRooms?, numberOfBathrooms?, description?, leaseBaseAmount, leaseBaseCurrency?), `EnrichedUnitFormData` interfaces
    - Keep existing interfaces (PortfolioUnit, CreatePortfolioUnitRequest, etc.) for backward compatibility
    - No VALID_UNIT_TYPES constant — propertyType is free-text
    - File: `src/frontend/modules/landlord-portfolio/types.ts`
    - _Requirements: 8.2_

- [x] 11. Frontend validation functions
  - [x] 11.1 Add enriched unit validation functions
    - Implement `validateUnitName`, `validateUnitAddress`, `validatePropertyType`, `validatePositiveDecimal`, `validateNonNegativeInteger`, `validateEnrichedUnitForm`
    - Reuse existing `validateLeaseBaseAmount` and `validateLeaseBaseCurrency`
    - Each returns `null` if valid, or a Spanish error message string if invalid
    - Keep existing validation functions for backward compatibility
    - File: `src/frontend/modules/landlord-portfolio/validation.ts`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 11.2 Write unit tests for enriched unit validation functions
    - Test each function with valid inputs, empty strings, whitespace-only strings, boundary values
    - File: `src/frontend/modules/landlord-portfolio/__tests__/enriched-validation.test.ts`
    - _Requirements: 9.2, 9.3, 9.5, 9.6_

- [ ]* 12. Frontend validation property-based tests
  - [ ]* 12.1 Write property test for required string validation (Property 8)
    - **Property 8: Client-side required string validation (name, address, propertyType)**
    - Generate random strings (including empty, whitespace-only, valid), verify validateUnitName, validateUnitAddress, and validatePropertyType return null for non-empty trimmed strings, error message otherwise
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.8**

  - [ ]* 12.2 Write property test for positive decimal validation (Property 9)
    - **Property 9: Client-side positive decimal validation (length, width)**
    - Generate random strings (positive numbers, negative, zero, NaN, empty, text), verify validatePositiveDecimal returns null for positive finite numbers, error message otherwise
    - **Validates: Requirements 9.6, 9.9**

  - [ ]* 12.3 Write property test for non-negative integer validation (Property 10)
    - **Property 10: Client-side non-negative integer validation**
    - Generate random strings (non-negative integers, negative, decimal, text, empty), verify validateNonNegativeInteger returns null for non-negative integers, error message otherwise
    - **Validates: Requirements 9.7**

- [x] 13. Frontend service layer
  - [x] 13.1 Add new methods to portfolioService
    - Add `getPortfolios(token, page?, limit?): Promise<PaginatedPortfolios>` → `GET /portfolio?page=X&limit=Y`
    - Add `createPortfolio(data, token): Promise<PortfolioSummary>` → `POST /portfolio`
    - Add `createEnrichedUnit(portfolioId, data, token): Promise<EnrichedUnitResponse>` → `POST /portfolio/:portfolioId/units`
    - Follow existing error handling pattern (401→"Sesión expirada", 403→"No tienes permiso...", 404→"Recurso no encontrado", 5xx→"Error del servidor...", network→"No se pudo conectar...")
    - File: `src/frontend/shared/services/portfolio.ts`
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 13.2 Write unit tests for new portfolioService methods
    - Mock fetch, test each method for success response, 401, 403, 404, 5xx, and network error
    - File: `src/frontend/shared/services/__tests__/portfolio.test.ts`
    - _Requirements: 8.4, 8.5, 8.6, 8.7_

- [x] 14. Checkpoint — Frontend foundation complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Frontend components — PortfolioCard
  - [x] 15.1 Create PortfolioCard component
    - Props: `portfolio: PortfolioSummary`
    - Render: portfolio name with building icon, description (if exists), propertyType badge (if not null), stats (totalUnits, activeLeases), occupancy progress bar with `role="progressbar"` and `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, "Ver unidades" button
    - Use semantic HTML (`article`), ensure 44x44px touch targets
    - Apply design system styles (border, border-radius, shadow, white background)
    - File: `src/frontend/modules/landlord-portfolio/components/PortfolioCard.tsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 10.3, 10.4_

  - [ ]* 15.2 Write unit tests for PortfolioCard
    - Test renders name, description, stats, occupancy bar, "Ver unidades" link
    - Test renders propertyType badge when present, hides when null
    - Test accessibility: progressbar role, aria attributes
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 10.4_

- [x] 16. Frontend components — AddUnitForm
  - [x] 16.1 Create AddUnitForm component for enriched unit creation
    - Three sections: "Información básica" (name, address, propertyType), "Detalles de la propiedad" (length, width, computed area display, numberOfRooms, numberOfBathrooms, description), "Datos de arriendo" (leaseBaseAmount, leaseBaseCurrency)
    - Client-side validation using enriched validation functions on submit
    - Inline error messages with `aria-describedby` and `aria-live="polite"`
    - All form fields with `htmlFor` labels
    - Submit calls `portfolioService.createEnrichedUnit`, disable button and show spinner while submitting
    - "Agregar unidad" primary button + "Cancelar" secondary button
    - Preserve form data on server error
    - File: `src/frontend/modules/landlord-portfolio/components/AddUnitForm.tsx`
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.16, 10.1, 10.2_

- [x] 17. Frontend pages — Portfolio listing page
  - [x] 17.1 Create updated portfolio listing page at /mi-portafolio
    - Create new route at `src/frontend/app/mi-portafolio/page.tsx`
    - Header with title "Mis arriendos" and subtitle "Gestión de propiedades"
    - Global counters showing total units and active leases
    - "+ Crear nuevo portafolio" primary button
    - Render list of PortfolioCard components from paginated API response
    - Pagination component at bottom with "Mostrando X a Y de Z resultados"
    - States: loading (skeleton), error (ErrorState with retry), empty (message + create suggestion)
    - Handle 401 → logout, wrap in LandlordRoute for auth/role guard
    - Use semantic HTML (`main`, `section`, `h1`-`h3`)
    - Single-column layout on mobile (mobile-first)
    - File: `src/frontend/app/mi-portafolio/page.tsx`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 10.5, 10.6, 10.7_

- [x] 18. Frontend pages — Add unit page
  - [x] 18.1 Create add unit page at /mi-portafolio/[portfolioId]/agregar-unidad
    - Create route directory and page file
    - Header with back arrow and title "Agregar unidad"
    - Subtitle "Agregando unidad a: [portfolio name]" (fetch portfolio name)
    - Informational banner explaining what a unit is
    - Render AddUnitForm component
    - On success: show confirmation message and redirect to portfolio units view
    - Handle 404: show "Portafolio no encontrado" with link to /mi-portafolio
    - "Próximos pasos" informational section at bottom
    - Wrap in LandlordRoute for auth/role guard
    - File: `src/frontend/app/mi-portafolio/[portfolioId]/agregar-unidad/page.tsx`
    - _Requirements: 7.1, 7.2, 7.14, 7.15, 7.16, 7.17, 7.18_

- [x] 19. Final checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Backend tasks follow hexagonal architecture: schema → domain → application → infrastructure → controller
- Frontend tasks follow: types → validation → service → components → pages
- Cross-schema unit creation uses Prisma `$transaction` for atomicity: creates Property + Address in property_listings, PortfolioUnit in landlord_portfolio
- Old flat endpoints (GET /portfolio/units, POST /portfolio/units, PATCH /portfolio/units/:id) were migrated to portfolio-scoped paths (GET /portfolio/:portfolioId/units, POST /portfolio/:portfolioId/units, PATCH /portfolio/:portfolioId/units/:id)
- **Simplified approach**: No `unit_type` field, no `floor` field, no `parking_spaces` field, no `area` field on PortfolioUnit — all physical property data lives in existing Property/Address tables
- **Deferred for future iterations**: Tipo de unidad dropdown, Piso/Nivel field, Parqueaderos field
