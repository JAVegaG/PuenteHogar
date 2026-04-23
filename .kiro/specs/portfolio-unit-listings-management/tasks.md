# Implementation Plan: Portfolio Unit Listings Management

## Overview

This plan implements listing management capabilities for portfolio units, ordered by dependency: backend repository methods → use cases → controller routes → frontend service layer → component modifications → new pages. All code is TypeScript. No database migrations are needed.

## Tasks

- [x] 1. Add new repository methods to `IListingRepository` and `PrismaListingRepository`
  - [x] 1.1 Add `findActiveByPortfolioUnitId`, `update`, and `getOwnerUserIdByUnit` to `IListingRepository` port
    - Add `findActiveByPortfolioUnitId(portfolioUnitId: string): Promise<ListingEntity | null>` to the interface in `src/backend/modules/property-listings/domain/ports/listing-repository.port.ts`
    - Add `update(id: string, data: UpdateListingData): Promise<ListingEntity>` to the interface
    - Add `getOwnerUserIdByUnit(portfolioUnitId: string): Promise<string | null>` to the interface
    - Define the `UpdateListingData` interface in the same file: `{ title?: string; description?: string; price?: number; newPhotoUrls?: string[]; removePhotoIds?: string[] }`
    - _Requirements: 3.5, 4.7_

  - [x] 1.2 Implement `findActiveByPortfolioUnitId` in `PrismaListingRepository`
    - In `src/backend/modules/property-listings/infrastructure/repositories/prisma-listing.repository.ts`
    - Query `prisma.listing.findFirst({ where: { portfolio_unit_id: portfolioUnitId, is_active: true }, include: { photos: true } })`
    - Return `null` if not found, otherwise map to `ListingEntity` via existing `toEntity` helper
    - _Requirements: 3.5_

  - [x] 1.3 Implement `getOwnerUserIdByUnit` in `PrismaListingRepository`
    - 2-hop cross-schema lookup: `PortfolioUnit.id → PortfolioUnit.portfolio_id → LandlordPortfolio.user_id`
    - Query `prisma.portfolioUnit.findFirst` then `prisma.landlordPortfolio.findFirst`
    - Return `null` if either step fails
    - _Requirements: 3.3, 3.4, 4.2, 4.3_

  - [x] 1.4 Implement `update` in `PrismaListingRepository`
    - Use `prisma.$transaction` to atomically update listing fields and manage photos
    - Update only provided fields (title, description, price) via Prisma `update`
    - Delete photos matching `removePhotoIds` via `prisma.photo.deleteMany({ where: { id: { in: removePhotoIds }, listing_id: id } })`
    - Create new photos from `newPhotoUrls` via `prisma.photo.createMany`
    - Return the updated listing with photos included, mapped to `ListingEntity`
    - _Requirements: 4.7_

- [x] 2. Create `UpdateListingDto` request DTO
  - Create `src/backend/modules/property-listings/application/dtos/update-listing.dto.ts`
  - Fields: `title?: string`, `description?: string`, `price?: number`, `photoUrls?: string[]`, `removePhotoIds?: string[]`
  - Use `class-validator` decorators: `@IsOptional()`, `@IsString()`, `@IsNotEmpty()`, `@IsNumber()`, `@Min(1)`, `@IsArray()`, `@IsString({ each: true })`
  - Use `@ApiPropertyOptional()` on every field for Swagger documentation
  - Use `!` definite assignment for required-style optional fields per `strictPropertyInitialization`
  - _Requirements: 4.1_

- [x] 3. Create backend use cases
  - [x] 3.1 Create `FindListingByUnitUseCase`
    - Create `src/backend/modules/property-listings/application/use-cases/find-listing-by-unit.use-case.ts`
    - Inject `IListingRepository` via `@Inject(LISTING_REPOSITORY)`
    - `execute(portfolioUnitId: string, userId: string): Promise<ListingResponseDto>`
    - Call `repository.getOwnerUserIdByUnit(portfolioUnitId)` — throw `NotFoundException` if null
    - Compare owner with `userId` — throw `ForbiddenException` if mismatch
    - Call `repository.findActiveByPortfolioUnitId(portfolioUnitId)` — throw `NotFoundException` if null
    - Map result to `ListingResponseDto` using the same `toResponseDto` pattern as `CreateListingUseCase`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Create `UpdateListingUseCase`
    - Create `src/backend/modules/property-listings/application/use-cases/update-listing.use-case.ts`
    - Inject `IListingRepository`, `IListingCache`, `IObjectStorage`
    - `execute(listingId: string, dto: UpdateListingDto, userId: string, files?: UploadedFile[]): Promise<ListingResponseDto>`
    - Call `repository.getOwnerUserId(listingId)` — throw `NotFoundException` if null
    - Compare owner with `userId` — throw `ForbiddenException` if mismatch
    - Verify listing exists and is active via `repository.findById(listingId)` — throw `NotFoundException` if not found or `!isActive`
    - Validate total photo count: `(existing.photos.length - (dto.removePhotoIds?.length ?? 0) + (files?.length ?? 0) + (dto.photoUrls?.length ?? 0)) <= 10`
    - Upload new files via `objectStorage.uploadPhoto()` if files provided
    - Build `UpdateListingData` and call `repository.update(listingId, data)`
    - Invalidate cache: `cache.invalidateByPattern('listings:published*')`
    - Return `ListingResponseDto`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_

- [x] 4. Add new routes to `PropertyListingsController` and wire use cases in module
  - [x] 4.1 Add `GET /listings/by-unit/:portfolioUnitId` route to `PropertyListingsController`
    - Add the route method **before** the existing `GET /listings/:id` route to avoid NestJS treating `by-unit` as an `:id` parameter
    - Use `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth('JWT')`, `@ApiOperation`, `@ApiOkResponse({ type: ListingResponseDto })`, `@ApiNotFoundResponse`, `@ApiForbiddenResponse`
    - Inject `FindListingByUnitUseCase` in the controller constructor
    - Call `findListingByUnitUseCase.execute(portfolioUnitId, req.user.id)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Add `PATCH /listings/:id` update route to `PropertyListingsController`
    - Use `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth('JWT')`, `@ApiConsumes('multipart/form-data', 'application/json')`, `@UseInterceptors(FilesInterceptor('photos', 10))`
    - Add `@ApiOperation`, `@ApiOkResponse({ type: ListingResponseDto })`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`
    - Inject `UpdateListingUseCase` in the controller constructor
    - Call `updateListingUseCase.execute(id, dto, req.user.id, uploadedFiles)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.3 Register new use cases in `PropertyListingsModule`
    - Add `FindListingByUnitUseCase` and `UpdateListingUseCase` to the `providers` array in `src/backend/modules/property-listings/property-listings.module.ts`
    - Add both to the `exports` array
    - _Requirements: 3.1, 4.1_

- [x] 5. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add frontend service functions and types
  - [x] 6.1 Add `ListingResponse` type to frontend types
    - Add the `ListingResponse` interface to `src/frontend/modules/property-listings/types.ts` (or a shared types file): `{ id, portfolioUnitId, title, description, listingDate, price, currency, isActive, photos: { id, fileUrl, isMain }[] }`
    - _Requirements: 5.1, 6.1_

  - [x] 6.2 Add `fetchListingByUnit` and `updateListing` to `api.ts`
    - In `src/frontend/shared/services/api.ts`
    - `fetchListingByUnit(unitId: string, token: string): Promise<ListingResponse>` — `GET ${API_URL}/listings/by-unit/${unitId}` with Bearer token, throw `'NOT_FOUND'` on 404, `'Sesión expirada'` on 401, `'Acceso denegado'` on 403
    - `updateListing(id: string, formData: FormData, token: string): Promise<ListingResponse>` — `PATCH ${API_URL}/listings/${id}` with Bearer token and FormData body, same error handling pattern as `createListing`
    - Also add `unpublishListing(id: string, token: string): Promise<void>` — `PATCH ${API_URL}/listings/${id}/unpublish` with Bearer token (reuse existing endpoint, currently only called from backend tests)
    - _Requirements: 5.1, 5.4, 6.3_

- [x] 7. Modify `UnitCard` component
  - In `src/frontend/modules/landlord-portfolio/components/UnitCard.tsx`
  - Replace the green "✓ Publicada en Explorar" indicator (`hasActiveListing` block) with a "Gestionar publicación" button
  - The button must be a `<Link>` to `/mi-portafolio/${pid}/unidades/${unit.id}/publicacion`
  - Style: `min-h-[44px]` touch target, visible `focus-visible:ring-2` focus indicator, consistent with existing button styles
  - Keep the existing `isAvailable && !hasActiveListing` → "Publicar en arriendo" logic unchanged
  - Ensure `!isAvailable && !hasActiveListing` shows no listing-related button (already the case)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8. Modify `UnitDetailView` component
  - In `src/frontend/modules/landlord-portfolio/components/UnitDetailView.tsx`
  - The component needs `hasActiveListing`, `portfolioId`, and `unitStatus` — update the `UnitDetailViewProps` interface to accept these (either directly or via the `PortfolioUnit` type which already has them)
  - Add conditional listing buttons below the existing "Editar unidad" link:
    - `hasActiveListing === true` → "Gestionar publicación" `<Link>` to `/mi-portafolio/${portfolioId}/unidades/${unit.id}/publicacion`
    - `unitStatus === 'Disponible' && !hasActiveListing` → "Publicar en arriendo" `<Link>` to `/mi-portafolio/${portfolioId}/unidades/${unit.id}/publicar`
    - Neither condition → no listing button
  - All buttons: `min-h-[44px]`, `focus-visible:ring-2` focus indicator
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 9. Checkpoint — Component modifications complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Create Listing Management View page
  - [x] 10.1 Create the Next.js page file
    - Create `src/frontend/app/mi-portafolio/[portfolioId]/unidades/[unitId]/publicacion/page.tsx`
    - Server component that renders the `ListingManagementView` client component
    - Extract `portfolioId` and `unitId` from route params
    - _Requirements: 5.1_

  - [x] 10.2 Create `ListingManagementView` client component
    - Create `src/frontend/modules/landlord-portfolio/components/ListingManagementView.tsx`
    - `'use client'` component, uses `useAuth` for token, `useEffect` to fetch listing via `fetchListingByUnit(unitId, token)`
    - Display: title, description, price (formatted COP via `formatCOP`), photos (image gallery), listing date (formatted Spanish date)
    - "Editar publicación" button → `<Link>` to `/mi-portafolio/${portfolioId}/unidades/${unitId}/publicacion/editar`
    - "Despublicar" button → triggers confirmation dialog, then calls `unpublishListing(listing.id, token)`, on success redirect to `/mi-portafolio/${portfolioId}/unidades/${unitId}`
    - Confirmation dialog: modal with "¿Estás seguro?" message, "Confirmar" and "Cancelar" buttons
    - 404 fallback: display "No hay publicación activa" message with link to `/mi-portafolio/${portfolioId}/unidades/${unitId}/publicar`
    - Back button: `<Link>` to `/mi-portafolio/${portfolioId}/unidades/${unitId}` using `rounded-card` class and left-arrow SVG icon (line pattern, not chevron)
    - Wrap content in `<main className="flex justify-center ..."><div className="w-full max-w-[560px]">...</div></main>`
    - Loading state with spinner while fetching
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 11. Create Listing Edit Form page
  - [x] 11.1 Create the Next.js page file
    - Create `src/frontend/app/mi-portafolio/[portfolioId]/unidades/[unitId]/publicacion/editar/page.tsx`
    - Server component that renders the `ListingEditForm` client component
    - Extract `portfolioId` and `unitId` from route params
    - _Requirements: 6.1_

  - [x] 11.2 Create `ListingEditForm` client component
    - Create `src/frontend/modules/landlord-portfolio/components/ListingEditForm.tsx`
    - `'use client'` component, uses `useAuth` for token
    - On mount: fetch current listing via `fetchListingByUnit(unitId, token)`, pre-populate all fields
    - Fields: title (required, `<input>`), description (optional, `<textarea>`), price (required, COP format using `formatCOP`/`stripCOP` helpers from PublishForm pattern)
    - Photo management: display existing photos with remove button (adds to `removePhotoIds`), add new photos via `PhotoUploader` component (reuse from `landlord-publish` module), enforce max 10 total
    - Validation: title not empty, price > 0 — show inline error messages
    - Submit: build `FormData` with updated fields, append new photo files, include `removePhotoIds`, call `updateListing(listing.id, formData, token)`
    - On success: redirect to `/mi-portafolio/${portfolioId}/unidades/${unitId}/publicacion`
    - On error: display server error in alert banner, preserve all unsaved changes
    - Back button: `<Link>` to `/mi-portafolio/${portfolioId}/unidades/${unitId}/publicacion` using `rounded-card` class and left-arrow SVG icon
    - Wrap content in `<main className="flex justify-center ..."><div className="w-full max-w-[560px]">...</div></main>`
    - All interactive elements: `min-h-[44px]` touch targets, `focus-visible:ring-2` focus indicators
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP — no tasks are marked optional in this plan since the design has no Correctness Properties section
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The `GET /listings/by-unit/:portfolioUnitId` route MUST be registered before `GET /listings/:id` in the controller to avoid route conflicts
- All DTOs use `!` definite assignment per `strictPropertyInitialization: true`
- All controller methods include `@ApiOperation`, `@ApiBearerAuth`, and response type decorators for Swagger
- Frontend uses Spanish UI text, English code identifiers, and Spanish URL routes
- COP currency formatting uses `formatCOP`/`stripCOP` helpers consistent with existing `PublishForm`
- Back buttons use `<Link>`, `rounded-card` class, and left-arrow SVG (line pattern, not chevron)
