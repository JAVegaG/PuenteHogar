# Requirements Document

## Introduction

This feature adds listing management capabilities for portfolio units. Currently, landlords can publish a unit as a listing but cannot view, edit, or unpublish an existing listing from the portfolio context. Additionally, the UnitCard publish button incorrectly appears when a unit already has an active listing. This feature corrects the publish button logic, adds a backend endpoint to fetch a listing by portfolio unit ID, adds a backend endpoint to update an existing listing, and introduces a frontend listing management view where landlords can view, edit, and unpublish their active listing.

## Glossary

- **Listing_Management_View**: The frontend page where a landlord views and manages the active listing for a specific portfolio unit.
- **UnitCard**: The card component that displays a portfolio unit summary, including status, publish action, and listing indicator.
- **UnitDetailView**: The detail component that displays full information about a portfolio unit, including conditions, pricing, and action buttons.
- **Listing**: A published rental offer linked to a portfolio unit via `portfolio_unit_id`, containing title, description, price, currency, and photos.
- **Portfolio_Unit**: A unit within a landlord's portfolio, linked to a property and optionally to an active listing.
- **Active_Listing**: A Listing record where `is_active = true`. The database constraint `@@unique([portfolio_unit_id, is_active])` ensures at most one active listing per portfolio unit.
- **Listings_API**: The NestJS `PropertyListingsController` that exposes listing-related HTTP endpoints.
- **Listing_Repository**: The `IListingRepository` port that defines data access methods for listings.
- **Listing_Edit_Form**: The frontend form component that allows editing an existing listing's title, description, price, and photos.

## Requirements

### Requirement 1: Correct Publish Button Visibility on UnitCard

**User Story:** As a landlord, I want the publish button to only appear when my unit is available and has no active listing, so that I am not confused by a publish action on an already-listed unit.

#### Acceptance Criteria

1. WHEN a portfolio unit has `unitStatus` equal to "Disponible" AND `hasActiveListing` equal to `false`, THE UnitCard SHALL display the "Publicar en arriendo" button linking to the publish route.
2. WHEN a portfolio unit has `hasActiveListing` equal to `true`, THE UnitCard SHALL display a "Gestionar publicación" button linking to the listing management route `/mi-portafolio/{portfolioId}/unidades/{unitId}/publicacion`.
3. WHEN a portfolio unit has `unitStatus` not equal to "Disponible" AND `hasActiveListing` equal to `false`, THE UnitCard SHALL display neither the publish button nor the manage listing button.
4. THE UnitCard SHALL render the "Gestionar publicación" button with a minimum touch target of 44×44 pixels and visible focus indicator for accessibility compliance.
5. THE UnitCard SHALL display a listing status badge using the `StatusBadge` component with variant `listing`, showing "Publicada" (blue) when `hasActiveListing` is `true` and "Sin publicar" (gray) when `false`, positioned in the top-right corner below the unit status badge.

### Requirement 2: Manage Listing Button on UnitDetailView

**User Story:** As a landlord, I want to see a manage listing action on the unit detail page when my unit has an active listing, so that I can navigate to listing management from the detail view.

#### Acceptance Criteria

1. WHEN a portfolio unit has `hasActiveListing` equal to `true`, THE UnitDetailView SHALL display a "Gestionar publicación" button linking to the listing management route.
2. WHEN a portfolio unit has `unitStatus` equal to "Disponible" AND `hasActiveListing` equal to `false`, THE UnitDetailView SHALL display a "Publicar en arriendo" button linking to the publish route.
3. WHEN a portfolio unit has `unitStatus` not equal to "Disponible" AND `hasActiveListing` equal to `false`, THE UnitDetailView SHALL display neither the publish button nor the manage listing button.

### Requirement 3: Backend Endpoint to Fetch Listing by Portfolio Unit ID

**User Story:** As a frontend client, I want to retrieve the active listing for a specific portfolio unit, so that I can display listing details on the management view.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/listings/by-unit/{portfolioUnitId}` with a valid JWT, THE Listings_API SHALL return the active listing details including id, title, description, price, currency, photos, and listing date.
2. WHEN no active listing exists for the given portfolio unit ID, THE Listings_API SHALL return a 404 Not Found response with a descriptive error message.
3. THE Listings_API SHALL verify that the authenticated user is the owner of the portfolio unit before returning listing data.
4. IF the authenticated user is not the owner of the portfolio unit, THEN THE Listings_API SHALL return a 403 Forbidden response.
5. THE Listing_Repository SHALL implement a `findActiveByPortfolioUnitId` method that queries listings where `portfolio_unit_id` matches and `is_active` equals `true`.

### Requirement 4: Backend Endpoint to Update an Existing Listing

**User Story:** As a landlord, I want to update my active listing's title, description, price, and photos, so that I can keep my listing information accurate and attractive.

#### Acceptance Criteria

1. WHEN a PATCH request is sent to `/listings/{id}` with valid update fields (title, description, price, photoUrls), THE Listings_API SHALL update the listing and return the updated listing details.
2. THE Listings_API SHALL verify that the authenticated user is the owner of the listing before allowing the update.
3. IF the authenticated user is not the owner of the listing, THEN THE Listings_API SHALL return a 403 Forbidden response.
4. IF the listing does not exist or is not active, THEN THE Listings_API SHALL return a 404 Not Found response.
5. WHEN new photo files are uploaded in the update request, THE Listings_API SHALL upload the files to object storage and persist the resulting URLs.
6. WHEN the update request includes a `removePhotoIds` array, THE Listings_API SHALL delete the specified photos from the listing.
7. THE Listing_Repository SHALL implement an `update` method that modifies the specified fields of an existing listing and manages photo additions and removals.
8. WHEN a listing is successfully updated, THE Listings_API SHALL invalidate the published listings cache.

### Requirement 5: Listing Management View

**User Story:** As a landlord, I want a dedicated page to view my active listing details for a portfolio unit, so that I can review the current listing information before deciding to edit or unpublish.

#### Acceptance Criteria

1. WHEN a landlord navigates to `/mi-portafolio/{portfolioId}/unidades/{unitId}/publicacion`, THE Listing_Management_View SHALL fetch and display the active listing details including title, description, price, photos, and listing date.
2. THE Listing_Management_View SHALL display an "Editar publicación" button that navigates to the listing edit form.
3. THE Listing_Management_View SHALL display a "Despublicar" button that triggers the unpublish action.
4. WHEN the landlord confirms the unpublish action, THE Listing_Management_View SHALL call the existing `PATCH /listings/{id}/unpublish` endpoint and redirect to the portfolio units list page (`/mi-portafolio/{portfolioId}/unidades`) upon success.
5. THE Listing_Management_View SHALL display a confirmation dialog before executing the unpublish action to prevent accidental removal.
6. IF the listing fetch returns a 404, THEN THE Listing_Management_View SHALL display a message indicating no active listing exists and provide a link to publish.
7. THE Listing_Management_View SHALL include a back button linking to the portfolio unit page, following the established back button pattern (Link component, rounded-card class, left-arrow SVG icon).

### Requirement 6: Listing Edit Form

**User Story:** As a landlord, I want to edit my active listing's title, description, price, and photos, so that I can update the information shown to potential tenants.

#### Acceptance Criteria

1. WHEN a landlord navigates to the listing edit form, THE Listing_Edit_Form SHALL pre-populate all fields with the current listing data (title, description, price, photos).
2. THE Listing_Edit_Form SHALL validate that the title is not empty and the price is a positive number before submission.
3. WHEN the landlord submits valid changes, THE Listing_Edit_Form SHALL call `PATCH /listings/{id}` with the updated fields and redirect to the listing management view upon success.
4. THE Listing_Edit_Form SHALL allow adding new photos (up to 10 total) and removing existing photos.
5. THE Listing_Edit_Form SHALL display the price input using the COP format (`$1.200.000`) with `formatCOP`/`stripCOP` helpers, consistent with the existing PublishForm.
6. IF the update request fails, THEN THE Listing_Edit_Form SHALL display the server error message without losing the user's unsaved changes.
7. THE Listing_Edit_Form SHALL include a back button linking to the listing management view.
