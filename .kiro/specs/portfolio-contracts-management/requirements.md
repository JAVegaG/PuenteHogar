# Requirements Document

## Introduction

This feature completes the CRUD operations for the landlord portfolio management module and introduces the initial contracts view in the frontend. Currently, landlords can create and list portfolios but cannot edit or delete them. Portfolio units can be created and updated but not deleted. The contracts backend is functional (upload, summary, signing, webhook) but the frontend has no wired-up pages — only isolated wizard components exist. This feature bridges those gaps to deliver a cohesive portfolio and contracts management experience.

## Glossary

- **Platform**: The web-based rental management system (frontend + backend)
- **Portfolio_API**: The NestJS backend controller handling portfolio CRUD operations at `/portfolio`
- **Contracts_API**: The NestJS backend controller handling contract operations at `/contracts`
- **Portfolio_Page**: The Next.js frontend page at `/mi-portafolio` that lists landlord portfolios
- **Unit_Detail_Page**: The Next.js frontend page at `/mi-portafolio/[id]/unidades/[unitId]` that shows unit details
- **Contracts_Page**: The Next.js frontend page for viewing and managing contracts (to be created)
- **Contract_Wizard**: The existing multi-step form component for creating contracts (StepTenant, StepTerms, StepDocument)
- **Portfolio_Service**: The frontend service module (`portfolioService`) that communicates with the Portfolio_API
- **Contracts_Service**: The frontend service module for communicating with the Contracts_API (to be created)
- **Landlord**: An authenticated user with the LANDLORD role who owns portfolios
- **Portfolio**: A `LandlordPortfolio` record grouping one or more portfolio units under a landlord
- **Portfolio_Unit**: A `PortfolioUnit` record representing a property within a portfolio
- **Lease**: A `Lease` record associating a tenant to a portfolio unit with rental terms
- **Contract**: A `Contract` record linked to a lease, with status tracking and file attachments
- **Confirmation_Dialog**: A modal UI component that requires explicit user confirmation before executing a destructive action

## Requirements

### Requirement 1: Update Portfolio

**User Story:** As a landlord, I want to edit my portfolio's name and description, so that I can keep my portfolio information accurate and up to date.

#### Acceptance Criteria

1. WHEN a PATCH request with a valid name is sent to `/portfolio/:portfolioId`, THE Portfolio_API SHALL update the portfolio name and return the updated portfolio object
2. WHEN a PATCH request with a valid description is sent to `/portfolio/:portfolioId`, THE Portfolio_API SHALL update the portfolio description and return the updated portfolio object
3. WHEN a PATCH request is sent to `/portfolio/:portfolioId` by a user who does not own the portfolio, THE Portfolio_API SHALL return a 403 Forbidden response
4. WHEN a PATCH request is sent to `/portfolio/:portfolioId` with a non-existent portfolio ID, THE Portfolio_API SHALL return a 404 Not Found response
5. WHEN a PATCH request is sent to `/portfolio/:portfolioId` by a user without the LANDLORD role, THE Portfolio_API SHALL return a 403 Forbidden response
6. WHEN the landlord taps the edit button on a portfolio card on the Portfolio_Page, THE Portfolio_Page SHALL display an inline edit form pre-filled with the current portfolio name and description
7. WHEN the landlord submits the edit form with valid data, THE Portfolio_Page SHALL send a PATCH request to the Portfolio_API and update the portfolio card with the new values
8. IF the PATCH request fails, THEN THE Portfolio_Page SHALL display an error message and preserve the form data so the landlord can retry

### Requirement 2: Delete Portfolio

**User Story:** As a landlord, I want to delete a portfolio I no longer need, so that I can keep my portfolio list clean and organized.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/portfolio/:portfolioId` for a portfolio with zero units, THE Portfolio_API SHALL delete the portfolio and return a 200 OK response
2. WHEN a DELETE request is sent to `/portfolio/:portfolioId` for a portfolio that has associated units, THE Portfolio_API SHALL return a 409 Conflict response with a message indicating the portfolio has units and cannot be deleted
3. WHEN a DELETE request is sent to `/portfolio/:portfolioId` by a user who does not own the portfolio, THE Portfolio_API SHALL return a 403 Forbidden response
4. WHEN a DELETE request is sent to `/portfolio/:portfolioId` with a non-existent portfolio ID, THE Portfolio_API SHALL return a 404 Not Found response
5. WHEN the landlord taps the delete button on a portfolio card, THE Portfolio_Page SHALL display a Confirmation_Dialog asking the landlord to confirm the deletion
6. WHEN the landlord confirms the deletion in the Confirmation_Dialog, THE Portfolio_Page SHALL send a DELETE request to the Portfolio_API and remove the portfolio card from the list upon success
7. IF the DELETE request returns a 409 Conflict, THEN THE Portfolio_Page SHALL display a message explaining that the portfolio has units and must be emptied before deletion
8. WHEN the landlord cancels the Confirmation_Dialog, THE Portfolio_Page SHALL close the dialog without making any changes

### Requirement 3: Delete Portfolio Unit

**User Story:** As a landlord, I want to delete a unit from my portfolio, so that I can remove properties I no longer manage.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/portfolio/:portfolioId/units/:id` for a unit with no active leases, THE Portfolio_API SHALL delete the unit and return a 200 OK response
2. WHEN a DELETE request is sent to `/portfolio/:portfolioId/units/:id` for a unit that has active leases, THE Portfolio_API SHALL return a 409 Conflict response with a message indicating the unit has active leases
3. WHEN a DELETE request is sent to `/portfolio/:portfolioId/units/:id` by a user who does not own the portfolio, THE Portfolio_API SHALL return a 403 Forbidden response
4. WHEN a DELETE request is sent to `/portfolio/:portfolioId/units/:id` with a non-existent unit ID, THE Portfolio_API SHALL return a 404 Not Found response
5. WHEN the landlord taps the delete button on a unit card, THE Unit_Detail_Page SHALL display a Confirmation_Dialog asking the landlord to confirm the deletion
6. WHEN the landlord confirms the deletion in the Confirmation_Dialog, THE Unit_Detail_Page SHALL send a DELETE request to the Portfolio_API and navigate the landlord back to the portfolio list upon success
7. IF the DELETE request returns a 409 Conflict, THEN THE Unit_Detail_Page SHALL display a message explaining that the unit has active leases and cannot be deleted
8. WHEN the landlord cancels the Confirmation_Dialog, THE Unit_Detail_Page SHALL close the dialog without making any changes

### Requirement 4: Contracts List View

**User Story:** As a landlord, I want to see a list of all contracts associated with my portfolio units, so that I can track the status of my rental agreements.

#### Acceptance Criteria

1. WHEN the landlord navigates to the Contracts_Page, THE Contracts_Page SHALL fetch and display a list of contracts associated with the landlord's leases
2. THE Contracts_Page SHALL display each contract with the unit name, tenant name, contract status, start date, and end date
3. THE Contracts_Page SHALL display the contract status using a color-coded badge (PENDING in amber, SIGNATURE_PENDING in blue, SIGNED in green)
4. WHEN the contracts list is loading, THE Contracts_Page SHALL display skeleton placeholders to indicate loading state
5. IF the contracts list fetch fails, THEN THE Contracts_Page SHALL display an error state with a retry button
6. WHEN the landlord has no contracts, THE Contracts_Page SHALL display an empty state message with guidance on how to create a contract
7. WHEN the landlord taps on a contract card, THE Contracts_Page SHALL navigate to the contract detail view

### Requirement 5: Contract Detail View

**User Story:** As a landlord, I want to view the details of a specific contract, so that I can review the terms, parties, and signing status.

#### Acceptance Criteria

1. WHEN the landlord navigates to the contract detail page, THE Platform SHALL fetch the contract summary from `GET /contracts/:id` and display the contract details
2. THE Platform SHALL display the contract start date, end date, status, and a link to download the contract PDF
3. THE Platform SHALL display the list of contract parties with their roles (landlord, tenant)
4. WHEN the contract status is PENDING, THE Platform SHALL display a button to initiate the signing process
5. WHEN the contract status is SIGNATURE_PENDING, THE Platform SHALL display a message indicating the contract is awaiting signatures
6. WHEN the contract status is SIGNED, THE Platform SHALL display the signed date and a confirmation message
7. IF the contract summary fetch fails, THEN THE Platform SHALL display an error state with a retry button
8. WHEN the landlord taps the "Iniciar firma" button, THE Platform SHALL send a POST request to `/contracts/:id/sign` and update the contract status to SIGNATURE_PENDING upon success

### Requirement 6: Contract Creation Flow

**User Story:** As a landlord, I want to create a new contract for a lease, so that I can formalize the rental agreement with my tenant.

#### Acceptance Criteria

1. WHEN the landlord initiates contract creation from a lease detail view, THE Contract_Wizard SHALL guide the landlord through three steps: tenant information, contract terms, and document upload
2. THE Contract_Wizard SHALL validate tenant information (name, document type, document number, email, phone) before allowing progression to the next step
3. THE Contract_Wizard SHALL validate contract terms (start date, optional end date, monthly rent as a positive number) before allowing progression to the next step
4. THE Contract_Wizard SHALL validate that a PDF file is selected before allowing contract submission
5. WHEN the landlord completes all three steps and submits, THE Platform SHALL send a POST request to `/contracts` with the lease ID, dates, and file URL
6. WHEN the contract is created successfully, THE Platform SHALL navigate the landlord to the contract detail view for the new contract
7. IF the contract creation request fails, THEN THE Platform SHALL display an error message and preserve the form data so the landlord can retry
8. THE Contract_Wizard SHALL display a progress indicator showing the current step and total steps

### Requirement 7: Contracts Frontend Service

**User Story:** As a developer, I want a frontend service module for contracts API communication, so that contract pages can interact with the backend consistently.

#### Acceptance Criteria

1. THE Contracts_Service SHALL provide a method to fetch a contract summary by ID using `GET /contracts/:id`
2. THE Contracts_Service SHALL provide a method to upload a contract using `POST /contracts`
3. THE Contracts_Service SHALL provide a method to initiate signing using `POST /contracts/:id/sign`
4. WHEN any Contracts_Service request receives a 401 response, THE Contracts_Service SHALL throw a "Sesión expirada" error
5. WHEN any Contracts_Service request receives a 403 response, THE Contracts_Service SHALL throw a permission denied error
6. IF a network error occurs during any Contracts_Service request, THEN THE Contracts_Service SHALL throw a connection error with a user-friendly message in Spanish

### Requirement 8: Portfolio Service Extension for Edit and Delete

**User Story:** As a developer, I want the portfolio frontend service to support update and delete operations for portfolios and units, so that the UI can call these new endpoints.

#### Acceptance Criteria

1. THE Portfolio_Service SHALL provide a method to update a portfolio by ID using `PATCH /portfolio/:portfolioId`
2. THE Portfolio_Service SHALL provide a method to delete a portfolio by ID using `DELETE /portfolio/:portfolioId`
3. THE Portfolio_Service SHALL provide a method to delete a portfolio unit by ID using `DELETE /portfolio/:portfolioId/units/:id`
4. WHEN any new Portfolio_Service request receives a 401 response, THE Portfolio_Service SHALL throw a "Sesión expirada" error
5. WHEN any new Portfolio_Service request receives a 409 Conflict response, THE Portfolio_Service SHALL throw an error with the conflict message from the server response
