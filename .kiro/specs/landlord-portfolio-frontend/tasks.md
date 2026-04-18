# Implementation Plan: Landlord Portfolio Frontend

## Overview

Implement the Landlord Portfolio frontend module for the Next.js App Router application. This includes the PortfolioService API layer, TypeScript types, client-side validation functions, route protection component (LandlordRoute), reusable UnitForm, presentational components (UnitCard, PortfolioList, UnitDetailView), four pages (listing, create, detail, edit), SideMenu link update, and a `formatPortfolioDate` utility. All code is TypeScript with Tailwind CSS, mobile-first, WCAG 2.1 AA accessible, Spanish UI text, English code identifiers.

## Tasks

- [x] 1. Define module types and validation functions
  - [x] 1.1 Create `src/frontend/modules/landlord-portfolio/types.ts` with `PortfolioUnit`, `CreatePortfolioUnitRequest`, `UpdatePortfolioUnitRequest`, and `UnitFormData` interfaces
    - `PortfolioUnit`: id, portfolioId, propertyId, conditions (string | null), leaseBaseAmount, leaseBaseCurrency, createdAt, updatedAt (ISO strings)
    - `CreatePortfolioUnitRequest`: propertyId, leaseBaseAmount, leaseBaseCurrency, conditions (optional)
    - `UpdatePortfolioUnitRequest`: conditions?, leaseBaseAmount?, leaseBaseCurrency? (all optional)
    - `UnitFormData`: propertyId, leaseBaseAmount (string for input), leaseBaseCurrency, conditions (all strings)
    - _Requirements: 1.4_

  - [x] 1.2 Create `src/frontend/modules/landlord-portfolio/validation.ts` with pure validation functions
    - `validatePropertyId(value: string): string | null` — returns null if non-empty after trim, else "El ID del inmueble es obligatorio"
    - `validateLeaseBaseAmount(value: string): string | null` — empty → "El canon base es obligatorio"; not finite number → "Ingresa un valor numérico válido"; negative → "El canon base debe ser mayor o igual a cero"; else null
    - `validateLeaseBaseCurrency(value: string): string | null` — empty → "La moneda es obligatoria"; not exactly 3 alpha chars → "La moneda debe tener exactamente 3 caracteres (ej. COP)"; else null
    - `validateUnitForm(data: UnitFormData): Record<string, string>` — aggregates errors for propertyId, leaseBaseAmount, leaseBaseCurrency (conditions is optional, not validated)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 1.3 Write property test for `validatePropertyId`
    - **Property 2: validatePropertyId correctness**
    - For any string, returns null iff non-empty after trim; returns "El ID del inmueble es obligatorio" otherwise
    - Use fast-check with minimum 100 iterations
    - Test file: `src/frontend/modules/landlord-portfolio/__tests__/validation.property.test.ts`
    - **Validates: Requirements 4.3, 9.2, 9.5**

  - [ ]* 1.4 Write property test for `validateLeaseBaseAmount`
    - **Property 3: validateLeaseBaseAmount correctness**
    - For any string, returns null iff parseable as finite number ≥ 0; returns appropriate error message otherwise
    - Use fast-check with minimum 100 iterations
    - Test file: `src/frontend/modules/landlord-portfolio/__tests__/validation.property.test.ts`
    - **Validates: Requirements 4.4, 9.3, 9.6**

  - [ ]* 1.5 Write property test for `validateLeaseBaseCurrency`
    - **Property 4: validateLeaseBaseCurrency correctness**
    - For any string, returns null iff exactly 3 alphabetic chars; returns appropriate error message otherwise
    - Use fast-check with minimum 100 iterations
    - Test file: `src/frontend/modules/landlord-portfolio/__tests__/validation.property.test.ts`
    - **Validates: Requirements 4.5, 9.4, 9.7**

- [x] 2. Implement PortfolioService and utility functions
  - [x] 2.1 Create `src/frontend/shared/services/portfolio.ts` with `portfolioService` object
    - `getUnits(token: string): Promise<PortfolioUnit[]>` — GET /portfolio/units with Bearer token
    - `createUnit(data: CreatePortfolioUnitRequest, token: string): Promise<PortfolioUnit>` — POST /portfolio/units with Bearer token
    - `updateUnit(id: string, data: UpdatePortfolioUnitRequest, token: string): Promise<PortfolioUnit>` — PATCH /portfolio/units/:id with Bearer token
    - Use `fetch` nativo, `NEXT_PUBLIC_API_URL` env var, `Content-Type: application/json`
    - Error handling: 401 → "Sesión expirada", 403 → "No tienes permiso para realizar esta acción", 404 → "Unidad de portafolio no encontrada", 5xx → "Error del servidor. Intenta de nuevo más tarde.", network error → "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo."
    - Follow the pattern established in `src/frontend/shared/services/auth.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [ ]* 2.2 Write property test for Bearer token header attachment
    - **Property 1: Bearer token header attachment**
    - For any non-empty token string, all PortfolioService methods must include `Authorization: Bearer <token>` header
    - Use fast-check with minimum 100 iterations, mock fetch to inspect headers
    - Test file: `src/frontend/shared/services/__tests__/portfolio.property.test.ts`
    - **Validates: Requirement 1.3**

  - [x] 2.3 Create `src/frontend/modules/landlord-portfolio/utils.ts` with `formatPortfolioDate` wrapper
    - Import `formatRelativeDate` from `shared/utils/formatRelativeDate`
    - Replace "Publicado" prefix with "Agregado" in the returned string
    - _Requirements: 3.5_

- [x] 3. Implement LandlordRoute protection component
  - [x] 3.1 Create `src/frontend/modules/landlord-portfolio/components/LandlordRoute.tsx`
    - Client Component (`'use client'`)
    - Props: `children: React.ReactNode`
    - Consume `useAuth()` from AuthContext
    - If `isLoading`: show centered spinner with `aria-busy="true"`, `role="status"`, sr-only "Cargando..."
    - If `!isAuthenticated`: redirect to `/auth/login` via `router.push`
    - If authenticated but no LANDLORD role: show "No tienes permisos para acceder a esta sección" with link to `/explorar`
    - If authenticated + LANDLORD: render `children`
    - Use `aria-live="polite"` on message zone
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement presentational components (UnitCard, PortfolioList, UnitDetailView)
  - [x] 5.1 Create `src/frontend/modules/landlord-portfolio/components/UnitCard.tsx`
    - Props: `unit: PortfolioUnit`
    - Render as `<Link>` to `/mi-portafolio/${unit.id}` wrapping an `<article>`
    - Container: border `#d1d5db`, border-radius 6px, shadow `0px 1px 2px rgba(0,0,0,0.05)`, bg white, padding 16px
    - Canon base formatted with `formatPrice` in H3 style (20px SemiBold, color primary `#1d4ed8`) + "/mes" in Caption (14px, `#4b5563`)
    - Currency badge: bg `#f3f4f6`, border-radius 4px, Caption 14px, `#4b5563`
    - Conditions in Body (16px, `#4b5563`) or "Sin condiciones especiales" in Caption if null/empty
    - Date with `formatPortfolioDate` in Caption (14px, `#4b5563`)
    - Min touch target 44×44px, descriptive `aria-label`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 5.2 Create `src/frontend/modules/landlord-portfolio/components/PortfolioList.tsx`
    - Props: `units: PortfolioUnit[]`
    - Render vertical list of `UnitCard` components in single-column mobile-first layout
    - Wrap in `<section aria-label="Listado de unidades de portafolio">`
    - _Requirements: 2.1, 2.9_

  - [x] 5.3 Create `src/frontend/modules/landlord-portfolio/components/UnitDetailView.tsx`
    - Props: `unit: PortfolioUnit`
    - Canon base as "$X/mes" in H2 (24px Bold, primary color)
    - Currency badge (bg `#f3f4f6`, border-radius 4px, Caption)
    - "Condiciones" section with H3 title + Body text or "Sin condiciones especiales"
    - "Información" section with createdAt and updatedAt formatted in Spanish
    - "Editar unidad" primary button linking to `/mi-portafolio/${unit.id}/editar`
    - Semantic HTML (`section`, `h2`, `h3`), `aria-label` on sections
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 6. Implement UnitForm component
  - [x] 6.1 Create `src/frontend/modules/landlord-portfolio/components/UnitForm.tsx`
    - Client Component (`'use client'`)
    - Props: `mode: 'create' | 'edit'`, `initialData?: PortfolioUnit`, `onSuccess: () => void`
    - Local state: formData (UnitFormData), errors (Record<string, string>), serverError (string | null), isSubmitting (boolean)
    - Fields: propertyId (text, read-only in edit mode), leaseBaseAmount (number input), leaseBaseCurrency (text, default "COP"), conditions (textarea, optional)
    - On submit: call `validateUnitForm(formData)`, show errors below fields in Caption (14px, error color), highlight field borders with error color
    - Errors disappear on `onChange` when user corrects value
    - Create mode: call `portfolioService.createUnit(payload, token)`, show confirmation, call `onSuccess()`
    - Edit mode: compute diff between `initialData` and current formData, send only modified fields via `portfolioService.updateUnit(id, diffPayload, token)`, show confirmation, call `onSuccess()`
    - Button text: "Guardar unidad" (create) / "Guardar cambios" (edit), full-width primary style
    - Disable button + show spinner during submit with `aria-busy`
    - Handle 401 → logout, 403 → show permission error preserving data, 404 → show not found, network/5xx → show error preserving data
    - Labels with `htmlFor`, errors with `aria-describedby`, `aria-live="polite"` on error zone
    - Keyboard navigation: Tab/Shift+Tab/Enter
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ]* 6.2 Write property test for PATCH diff computation
    - **Property 5: PATCH diff computation**
    - For any pair of UnitFormData objects (initial and current), the diff payload must contain exactly the fields whose values differ, and must not include fields with identical values
    - Use fast-check with minimum 100 iterations
    - Test file: `src/frontend/modules/landlord-portfolio/__tests__/validation.property.test.ts`
    - **Validates: Requirement 5.5**

- [x] 7. Implement pages
  - [x] 7.1 Create `src/frontend/app/mi-portafolio/page.tsx` — Portfolio listing page
    - Client Component wrapping content in `LandlordRoute`
    - Header with hamburger menu button + "Mi portafolio" title (H1, 32px Bold)
    - SideMenu integration (open/close state)
    - "Agregar unidad" primary button below header, navigates to `/mi-portafolio/nueva-unidad`
    - Fetch units via `portfolioService.getUnits(token)` on mount
    - Loading state: Skeleton loader (3 card placeholders)
    - Empty state: message "No tienes unidades en tu portafolio" with suggestion to add one
    - Error state: ErrorState component with retry button
    - 401 handling: call `logout()` from AuthProvider
    - Render `PortfolioList` with fetched units
    - Semantic `<main>` wrapper
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 7.2 Create `src/frontend/app/mi-portafolio/nueva-unidad/page.tsx` — Create unit page
    - Client Component wrapping content in `LandlordRoute`
    - Header with back arrow (navigates to `/mi-portafolio`) + "Agregar unidad" title (H1)
    - Render `UnitForm` with `mode='create'`
    - `onSuccess`: redirect to `/mi-portafolio` via `router.push`
    - _Requirements: 4.1, 4.2, 4.9, 4.12_

  - [x] 7.3 Create `src/frontend/app/mi-portafolio/[id]/page.tsx` — Unit detail page
    - Client Component wrapping content in `LandlordRoute`
    - Header with back arrow (navigates to `/mi-portafolio`) + "Detalle de unidad" title (H1)
    - Fetch unit data from `portfolioService.getUnits(token)` and find by id param
    - Loading state: Skeleton loader replicating UnitDetailView structure
    - 404 handling: "Unidad de portafolio no encontrada" with link to `/mi-portafolio`
    - Error state: ErrorState with retry
    - 401 handling: call `logout()`
    - Render `UnitDetailView` with fetched unit
    - _Requirements: 6.1, 6.2, 6.8, 6.9, 6.10, 6.11, 6.12_

  - [x] 7.4 Create `src/frontend/app/mi-portafolio/[id]/editar/page.tsx` — Edit unit page
    - Client Component wrapping content in `LandlordRoute`
    - Header with back arrow (navigates to `/mi-portafolio/${id}`) + "Editar unidad" title (H1)
    - Fetch unit data on mount, show Skeleton while loading
    - 404 handling: "Unidad de portafolio no encontrada" with link to `/mi-portafolio`
    - Render `UnitForm` with `mode='edit'` and `initialData` from fetched unit
    - `onSuccess`: redirect to `/mi-portafolio/${id}` via `router.push`
    - _Requirements: 5.1, 5.2, 5.7, 5.8, 5.11, 5.12_

- [x] 8. Update SideMenu link
  - [x] 8.1 Modify `src/frontend/shared/components/SideMenu.tsx`
    - Change the `href` of "Mis arriendos" nav link from `/mis-arriendos` to `/mi-portafolio`
    - No other changes needed
    - _Requirements: 8.1, 8.2_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–5)
- All components use Tailwind CSS design tokens, WCAG 2.1 AA accessibility, Spanish UI text, English code identifiers
- The `formatPortfolioDate` wrapper avoids modifying the shared `formatRelativeDate` function
