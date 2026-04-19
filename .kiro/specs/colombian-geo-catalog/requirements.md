# Requirements Document

## Introduction

This feature introduces a Colombian geographic catalog (departments and cities/municipalities) into the `property_listings` schema, following the same catalog pattern as `PropertyType` and `DocumentType`. Two new tables — `Department` and `City` — store the official DANE geographic division data (33 departments, 1,122 municipalities) seeded from the existing CSV file at `db/seeds/states_citys_colombia.seed.csv`. Public GET endpoints enable cascading frontend dropdowns (select department → filter cities), and the `AddUnitForm` is extended with department and city selectors that populate the `Address.state` and `Address.city` fields. The `Address` model's `state` and `city` fields remain plain `String` columns storing the catalog codes — no foreign key relations — consistent with the project's cross-schema reference conventions.

## Glossary

- **Department_Catalog**: A database table in the `property_listings` schema that stores Colombian departments (departamentos), with columns `id`, `code` (unique, 2-digit DANE code), `name`, and `is_active`.
- **City_Catalog**: A database table in the `property_listings` schema that stores Colombian cities/municipalities (municipios), with columns `id`, `code` (unique, 5-digit DANE code), `department_code` (references Department_Catalog.code as plain String), `name`, and `is_active`.
- **DANE_Code**: The official numeric code assigned by DANE (Departamento Administrativo Nacional de Estadística) to each geographic division. Departments use 2-digit codes (e.g., `05` for Antioquia); municipalities use 5-digit codes (e.g., `05001` for Medellín).
- **DANE_CSV**: The seed CSV file at `src/backend/db/seeds/states_citys_colombia.seed.csv` containing 1,122 municipality records with semicolon delimiters and columns: `Código_Departamento`, `Nombre_Departamento`, `Código_Municipio`, `Nombre_Municipio`, `Tipo`, `Longitud_Localización`, `Latitud_Localización`, `Nota`.
- **Department_Endpoint**: A public HTTP GET endpoint that returns the list of active departments for frontend consumption.
- **City_Endpoint**: A public HTTP GET endpoint that returns the list of active cities filtered by department code for frontend consumption.
- **AddUnitForm**: The frontend form component used by landlords to create enriched units within a portfolio.
- **CreateEnrichedUnit_UseCase**: The backend use case that orchestrates creation of a Property, Address, and PortfolioUnit in a single transaction.
- **Portfolio_Repository**: The repository port interface in the landlord-portfolio module that defines data access methods.
- **Seed_Script**: The database seed script (`db/seeds/seed.ts`) that populates catalog tables with initial data using upsert operations.
- **Address_Model**: The Prisma model in the `property_listings` schema with `state` and `city` String fields that store the department name and city name respectively.
- **Cascading_Dropdown**: A UI pattern where selecting a value in one dropdown (department) filters the options available in a dependent dropdown (city).

## Requirements

### Requirement 1: Department Catalog Table

**User Story:** As a platform maintainer, I want Colombian departments stored in a catalog table, so that the set of valid departments is centrally managed and consistent across the system.

#### Acceptance Criteria

1. THE Department_Catalog SHALL contain columns `id` (UUID primary key), `code` (unique string, 2-digit DANE code), `name` (string), and `is_active` (boolean, default true).
2. THE Department_Catalog SHALL reside in the `property_listings` PostgreSQL schema.
3. THE Department_Catalog SHALL enforce uniqueness on the `code` column.

### Requirement 2: City/Municipality Catalog Table

**User Story:** As a platform maintainer, I want Colombian cities/municipalities stored in a catalog table linked to departments, so that geographic data is structured and queryable by department.

#### Acceptance Criteria

1. THE City_Catalog SHALL contain columns `id` (UUID primary key), `code` (unique string, 5-digit DANE code), `department_code` (string referencing Department_Catalog code), `name` (string), and `is_active` (boolean, default true).
2. THE City_Catalog SHALL reside in the `property_listings` PostgreSQL schema.
3. THE City_Catalog SHALL enforce uniqueness on the `code` column.
4. THE City_Catalog SHALL define a Prisma relation from `department_code` to the Department_Catalog `code` field, enabling cascading queries within the same schema.

### Requirement 3: Seed Data from DANE CSV

**User Story:** As a platform maintainer, I want the department and city catalogs pre-populated from the official DANE CSV file, so that all 33 departments and 1,122 municipalities are available from the first deployment.

#### Acceptance Criteria

1. THE Seed_Script SHALL read the DANE_CSV file and parse its semicolon-delimited content, trimming whitespace from column headers and values.
2. THE Seed_Script SHALL extract unique departments from the CSV and upsert each into the Department_Catalog using `where: { code }` for idempotent execution.
3. THE Seed_Script SHALL upsert each municipality row from the CSV into the City_Catalog using `where: { code }` for idempotent execution, storing the `Código_Departamento` value in the `department_code` field.
4. THE Seed_Script SHALL set `is_active: true` for all seeded departments and cities.
5. THE Seed_Script SHALL log the count of departments and cities seeded upon completion.
6. THE Seed_Script SHALL handle the CSV encoding correctly, preserving accented characters (e.g., MEDELLÍN, BOGOTÁ, CAQUETÁ).

### Requirement 4: Public GET Endpoint for Active Departments

**User Story:** As a frontend developer, I want a public endpoint that returns active departments, so that I can populate the department dropdown without requiring user authentication.

#### Acceptance Criteria

1. THE Department_Endpoint SHALL be accessible via `GET /portfolio/departments` without authentication.
2. THE Department_Endpoint SHALL return an array of objects, each containing `id`, `code`, and `name` fields.
3. THE Department_Endpoint SHALL return only departments where `is_active` is true.
4. THE Department_Endpoint SHALL return results ordered by `name` in ascending alphabetical order.
5. THE Department_Endpoint SHALL include Swagger/OpenAPI decorators (`@ApiOperation`, `@ApiOkResponse`) with a response DTO type.

### Requirement 5: Public GET Endpoint for Cities by Department

**User Story:** As a frontend developer, I want a public endpoint that returns active cities filtered by department, so that I can implement a cascading dropdown where selecting a department loads its cities.

#### Acceptance Criteria

1. THE City_Endpoint SHALL be accessible via `GET /portfolio/departments/:departmentCode/cities` without authentication.
2. THE City_Endpoint SHALL accept a `departmentCode` path parameter (2-digit DANE code string).
3. THE City_Endpoint SHALL return an array of objects, each containing `id`, `code`, `department_code`, and `name` fields.
4. THE City_Endpoint SHALL return only cities where `is_active` is true and `department_code` matches the provided path parameter.
5. THE City_Endpoint SHALL return results ordered by `name` in ascending alphabetical order.
6. IF the provided `departmentCode` does not match any existing department, THEN THE City_Endpoint SHALL return an empty array (no error).
7. THE City_Endpoint SHALL include Swagger/OpenAPI decorators (`@ApiOperation`, `@ApiOkResponse`, `@ApiParam`) with a response DTO type.

### Requirement 6: Repository Port Methods for Geographic Catalog

**User Story:** As a backend developer, I want repository methods for department and city lookups, so that use cases and controllers can access the geographic catalog through the hexagonal port interface.

#### Acceptance Criteria

1. THE Portfolio_Repository port SHALL expose a `findAllDepartments()` method that returns `{ id: string; code: string; name: string }[]` filtered by `is_active: true` and ordered by `name` ascending.
2. THE Portfolio_Repository port SHALL expose a `findCitiesByDepartmentCode(departmentCode: string)` method that returns `{ id: string; code: string; departmentCode: string; name: string }[]` filtered by `is_active: true` and matching `department_code`, ordered by `name` ascending.
3. THE Portfolio_Repository port SHALL expose a `findDepartmentByCode(code: string)` method that returns `{ id: string; code: string; name: string } | null`.
4. THE Portfolio_Repository port SHALL expose a `findCityByCode(code: string)` method that returns `{ id: string; code: string; departmentCode: string; name: string } | null`.

### Requirement 7: Backend Validation of Department and City in Unit Creation

**User Story:** As a platform operator, I want the backend to validate that the department and city provided when creating a unit are valid catalog entries, so that only DANE-defined geographic data is stored.

#### Acceptance Criteria

1. THE CreateEnrichedUnit_UseCase SHALL verify that the provided `departmentCode` matches an existing active department in the Department_Catalog.
2. THE CreateEnrichedUnit_UseCase SHALL verify that the provided `cityCode` matches an existing active city in the City_Catalog and that the city belongs to the specified department.
3. IF the provided `departmentCode` does not match any active department, THEN THE CreateEnrichedUnit_UseCase SHALL return a 400 Bad Request response with a descriptive error message.
4. IF the provided `cityCode` does not match any active city or does not belong to the specified department, THEN THE CreateEnrichedUnit_UseCase SHALL return a 400 Bad Request response with a descriptive error message.
5. THE CreateEnrichedUnit_UseCase SHALL store the department `name` in `Address.state` and the city `name` in `Address.city` after successful validation.

### Requirement 8: Frontend Department and City Dropdowns in AddUnitForm

**User Story:** As a landlord, I want to select a department and city from cascading dropdowns when adding a unit, so that I can accurately specify the property location without typing or guessing.

#### Acceptance Criteria

1. WHEN the AddUnitForm mounts, THE AddUnitForm SHALL fetch the list of active departments from the Department_Endpoint.
2. WHILE the departments are loading, THE AddUnitForm SHALL display a skeleton placeholder in place of the department dropdown.
3. THE AddUnitForm SHALL render a `<select>` element for department with options mapped from the fetched department list, displaying `name` as the option label and storing `code` as the selected value.
4. THE AddUnitForm department `<select>` element SHALL include a disabled default option with text "Selecciona un departamento".
5. WHEN the user selects a department, THE AddUnitForm SHALL fetch the list of cities for that department from the City_Endpoint.
6. WHILE the cities are loading, THE AddUnitForm SHALL display a skeleton placeholder in place of the city dropdown.
7. THE AddUnitForm SHALL render a `<select>` element for city with options mapped from the fetched city list, displaying `name` as the option label and storing `code` as the selected value.
8. THE AddUnitForm city `<select>` element SHALL include a disabled default option with text "Selecciona una ciudad".
9. WHEN the user changes the selected department, THE AddUnitForm SHALL clear the previously selected city and fetch the new department's cities.
10. WHILE no department is selected, THE AddUnitForm city `<select>` element SHALL be disabled.
11. THE AddUnitForm department and city `<select>` elements SHALL each have a minimum touch target of 44px height, an associated `<label>`, and `aria-describedby` linking to any validation error message.
12. THE AddUnitForm SHALL store the selected department code in form state field `departmentCode` and the selected city code in form state field `cityCode`.

### Requirement 9: Frontend Service Methods for Geographic Catalog

**User Story:** As a frontend developer, I want shared service functions and TypeScript interfaces for departments and cities, so that the geographic catalog integration is reusable across components.

#### Acceptance Criteria

1. THE frontend SHALL define a `Department` interface with fields `id: string`, `code: string`, and `name: string`.
2. THE frontend SHALL define a `City` interface with fields `id: string`, `code: string`, `departmentCode: string`, and `name: string`.
3. THE frontend portfolio service SHALL expose a `getDepartments()` method that performs a GET request to the Department_Endpoint and returns `Promise<Department[]>`.
4. THE frontend portfolio service SHALL expose a `getCitiesByDepartment(departmentCode: string)` method that performs a GET request to the City_Endpoint and returns `Promise<City[]>`.
5. IF the `getDepartments()` request fails with a network error, THEN THE portfolio service SHALL throw an error with the message "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo."
6. IF the `getDepartments()` request returns a server error (status >= 500), THEN THE portfolio service SHALL throw an error with the message "Error del servidor. Intenta de nuevo más tarde."
7. IF the `getCitiesByDepartment()` request fails with a network error, THEN THE portfolio service SHALL throw an error with the message "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo."
8. IF the `getCitiesByDepartment()` request returns a server error (status >= 500), THEN THE portfolio service SHALL throw an error with the message "Error del servidor. Intenta de nuevo más tarde."

### Requirement 10: DTO and Schema Updates for Department and City Fields

**User Story:** As a backend developer, I want the CreateEnrichedUnit DTO and related data structures updated to accept department and city codes, so that the geographic catalog data flows through the API boundary correctly.

#### Acceptance Criteria

1. THE CreateEnrichedUnit DTO SHALL include required fields `departmentCode` (string) and `cityCode` (string) with appropriate `@ApiProperty`, `@IsString`, and `@IsNotEmpty` decorators.
2. THE CreateEnrichedUnitData interface in the repository port SHALL include required fields `departmentCode` and `cityCode`.
3. THE EnrichedUnitResponse DTO SHALL include `departmentCode` and `cityCode` fields so the frontend can display the selected geographic data.
4. THE frontend `CreateUnitRequest` type SHALL include required fields `departmentCode` and `cityCode`.
5. THE frontend `EnrichedUnitFormData` type SHALL include fields `departmentCode` and `cityCode` (string, defaulting to empty string).
