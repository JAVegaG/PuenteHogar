# Requirements Document

## Introduction

This feature replaces the free-text `propertyType` field with a catalog-driven `PropertyType` table, following the exact same pattern as `DocumentType` in the users module. The catalog stores common Colombian property types (Apartamento, Casa, Local, etc.) and exposes them via a public endpoint so the frontend can render dropdowns instead of text inputs. Backend validation ensures only valid property type codes are accepted when creating enriched units. The `GET /listings` endpoint's `propertyType` filter is also aligned to use catalog codes, and the frontend FilterPanel replaces its hardcoded property type array with the dynamic catalog.

## Glossary

- **PropertyType_Catalog**: A database table in the `property_listings` schema that stores master data for property types, with columns `id`, `code` (unique), `description`, and `is_active`.
- **Property_Type_Code**: A unique short identifier for a property type (e.g., `APARTAMENTO`, `CASA`, `LOCAL`). Used as the lookup key in the catalog.
- **PropertyType_Endpoint**: A public HTTP GET endpoint that returns the list of active property types for frontend consumption.
- **AddUnitForm**: The frontend form component used by landlords to create enriched units within a portfolio.
- **FilterPanel**: The frontend component used by anonymous and authenticated users to filter property listings by criteria including property type.
- **CreateEnrichedUnit_UseCase**: The backend use case that orchestrates creation of a Property, Address, and PortfolioUnit in a single transaction.
- **Portfolio_Repository**: The repository port interface in the landlord-portfolio module that defines data access methods.
- **Seed_Script**: The database seed script (`db/seeds/seed.ts`) that populates catalog tables with initial data using upsert operations.
- **SearchListings_UseCase**: The backend use case in the `property-listings` module that handles `GET /listings` with filters including `propertyType`.
- **ListingFiltersDto**: The DTO that defines query parameters for the `GET /listings` endpoint, including the optional `propertyType` filter.

## Requirements

### Requirement 1: PropertyType Catalog Table

**User Story:** As a platform maintainer, I want property types stored in a catalog table, so that the set of valid property types is centrally managed and consistent across the system.

#### Acceptance Criteria

1. THE PropertyType_Catalog SHALL contain columns `id` (UUID primary key), `code` (unique string), `description` (string), and `is_active` (boolean, default true).
2. THE PropertyType_Catalog SHALL reside in the `property_listings` PostgreSQL schema.
3. THE PropertyType_Catalog SHALL enforce uniqueness on the `code` column.
4. THE Property model `property_type` field SHALL remain a plain `String` storing the Property_Type_Code value (no foreign key relation, consistent with cross-schema reference conventions).

### Requirement 2: Seed Data for Colombian Property Types

**User Story:** As a platform maintainer, I want the catalog pre-populated with common Colombian property types, so that landlords have meaningful options from the first deployment.

#### Acceptance Criteria

1. THE Seed_Script SHALL upsert the following property types into the PropertyType_Catalog: `APARTAMENTO` ("Apartamento"), `CASA` ("Casa"), `LOCAL` ("Local comercial"), `OFICINA` ("Oficina"), `BODEGA` ("Bodega"), `LOTE` ("Lote"), `FINCA` ("Finca"), `HABITACION` ("Habitación"), `ESTUDIO` ("Estudio").
2. THE Seed_Script SHALL use `where: { code }` for upsert operations to ensure idempotent execution.
3. THE Seed_Script SHALL set `is_active: true` for all seeded property types.

### Requirement 3: Public GET Endpoint for Active Property Types

**User Story:** As a frontend developer, I want a public endpoint that returns active property types, so that I can populate dropdowns without requiring user authentication.

#### Acceptance Criteria

1. THE PropertyType_Endpoint SHALL be accessible via `GET /portfolio/property-types` without authentication.
2. THE PropertyType_Endpoint SHALL return an array of objects, each containing `id`, `code`, and `description` fields.
3. THE PropertyType_Endpoint SHALL return only property types where `is_active` is true.
4. THE PropertyType_Endpoint SHALL return results ordered by `code` in ascending alphabetical order.
5. THE PropertyType_Endpoint SHALL include Swagger/OpenAPI decorators (`@ApiOperation`, `@ApiOkResponse`) with a response DTO type.

### Requirement 4: Backend Validation of Property Type Code

**User Story:** As a platform operator, I want the backend to reject invalid property type codes, so that only catalog-defined property types are stored in the database.

#### Acceptance Criteria

1. WHEN a request to create an enriched unit is received, THE CreateEnrichedUnit_UseCase SHALL verify that the provided `propertyType` value matches an existing active Property_Type_Code in the PropertyType_Catalog.
2. IF the provided `propertyType` value does not match any active Property_Type_Code, THEN THE CreateEnrichedUnit_UseCase SHALL return a 400 Bad Request response with a descriptive error message.
3. THE Portfolio_Repository port SHALL expose a `findPropertyTypeByCode(code: string)` method that returns `{ id: string; code: string } | null`.
4. THE Portfolio_Repository port SHALL expose a `findAllPropertyTypes()` method that returns `{ id: string; code: string; description: string }[]` filtered by `is_active: true` and ordered by `code` ascending.

### Requirement 5: Frontend Dropdown in AddUnitForm

**User Story:** As a landlord, I want to select a property type from a dropdown list, so that I can quickly choose the correct type without typing or guessing valid values.

#### Acceptance Criteria

1. WHEN the AddUnitForm mounts, THE AddUnitForm SHALL fetch the list of active property types from the PropertyType_Endpoint.
2. WHILE the property types are loading, THE AddUnitForm SHALL display a skeleton placeholder in place of the dropdown.
3. THE AddUnitForm SHALL render a `<select>` element for property type with options mapped from the fetched property type list, displaying `description` as the option label and storing `code` as the selected value.
4. THE AddUnitForm `<select>` element SHALL include a disabled default option with text "Selecciona un tipo de propiedad".
5. THE AddUnitForm SHALL store the selected Property_Type_Code in the form state field `propertyType`.
6. THE AddUnitForm `<select>` element SHALL have a minimum touch target of 44px height, an associated `<label>`, and `aria-describedby` linking to any validation error message.

### Requirement 6: Frontend Dropdown in FilterPanel

**User Story:** As a user browsing listings, I want the property type filter populated from the catalog, so that filter options stay in sync with the types landlords can actually select.

#### Acceptance Criteria

1. WHEN the FilterPanel mounts, THE FilterPanel SHALL fetch the list of active property types from the PropertyType_Endpoint.
2. THE FilterPanel SHALL replace the hardcoded `PROPERTY_TYPES` array with the dynamically fetched property type list.
3. THE FilterPanel SHALL render property type options using `description` as the display label and `code` as the option value.
4. IF the property type fetch fails, THEN THE FilterPanel SHALL fall back to displaying the filter without property type options (graceful degradation).

### Requirement 7: Frontend Service and Type Definitions

**User Story:** As a frontend developer, I want a shared service function and TypeScript interface for property types, so that the catalog integration is reusable across components.

#### Acceptance Criteria

1. THE frontend SHALL define a `PropertyType` interface with fields `id: string`, `code: string`, and `description: string` (matching the DocumentType interface pattern).
2. THE frontend portfolio service SHALL expose a `getPropertyTypes()` method that performs a GET request to the PropertyType_Endpoint and returns `Promise<PropertyType[]>`.
3. IF the `getPropertyTypes()` request fails with a network error, THEN THE portfolio service SHALL throw an error with the message "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo."
4. IF the `getPropertyTypes()` request returns a server error (status >= 500), THEN THE portfolio service SHALL throw an error with the message "Error del servidor. Intenta de nuevo más tarde."

### Requirement 8: Listings Endpoint Property Type Filter Alignment

**User Story:** As a user browsing listings, I want the property type filter on the listings endpoint to accept only valid catalog codes, so that search results are consistent with the catalog-defined property types.

#### Acceptance Criteria

1. THE `GET /listings` endpoint SHALL continue to accept an optional `propertyType` query parameter in the ListingFiltersDto.
2. THE `propertyType` filter value SHALL match against `Property.property_type` which stores the Property_Type_Code from the catalog.
3. THE SearchListings_UseCase SHALL NOT reject requests with unknown `propertyType` values (the filter simply returns no results if no properties match), maintaining backward compatibility.
4. THE ListingFiltersDto `propertyType` field description in Swagger SHALL be updated to reference that valid values come from the `GET /portfolio/property-types` catalog endpoint.
