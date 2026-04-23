# Implementation Plan: Portfolio Contracts Management

## Overview

This plan implements portfolio CRUD completion (update/delete portfolio, delete unit) and the contracts frontend experience (list, detail, creation pages). Ordered by dependency: backend repository methods → use cases → controller routes → frontend service extensions → shared components → page modifications → new pages. All code is TypeScript. No database migrations are needed.

## Tasks

- [x] 1. Add new repository methods to `IPortfolioRepository` and `PrismaPortfolioRepository`
  - [x] 1.1 Add `updatePortfolio`, `deletePortfolio`, `deleteUnit`, `countUnitsByPortfolioId`, and `hasActiveLeases` to `IPortfolioRepository` port
    - Add to `src/backend/modules/landlord-portfolio/domain/ports/portfolio-repository.port.ts`:
    - `updatePortfolio(portfolioId: string, data: UpdatePortfolioData): Promise<LandlordPortfolioEntity>` — define `UpdatePortfolioData` as `{ name?: string; description?: string }`
    - `deletePortfolio(portfolioId: string): Promise<void>`
    - `deleteUnit(unitId: string): Promise<void>`
    - `countUnitsByPortfolioId(portfolioId: string): Promise<number>`
    - `hasActiveLeases(unitId: string): Promise<boolean>`
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

  - [x] 1.2 Implement new methods in `PrismaPortfolioRepository`
    - In `src/backend/modules/landlord-portfolio/infrastructure/repositories/prisma-portfolio.repository.ts`
    - `updatePortfolio`: `prisma.landlordPortfolio.update({ where: { id: portfolioId }, data })` — map to `LandlordPortfolioEntity`
    - `deletePortfolio`: `prisma.landlordPortfolio.delete({ where: { id: portfolioId } })`
    - `deleteUnit`: `prisma.portfolioUnit.delete({ where: { id: unitId } })`
    - `countUnitsByPortfolioId`: `prisma.portfolioUnit.count({ where: { portfolio_id: portfolioId } })`
    - `hasActiveLeases`: query `prisma.lease.findFirst` where `portfolio_unit_id = unitId` and the lease has an active current status — return `true` if found
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

- [x] 2. Add `findContractsByLandlordId` to `IContractRepository` and `PrismaContractRepository`
  - [x] 2.1 Add `findContractsByLandlordId` to `IContractRepository` port
    - Add to `src/backend/modules/contracts/domain/ports/contract-repository.port.ts`:
    - `findContractsByLandlordId(landlordUserId: string): Promise<LandlordContractListItem[]>`
    - Define `LandlordContractListItem` interface: `{ id: string; unitName: string; tenantName: string; status: string; startDate: Date; endDate: Date | null }`
    - _Requirements: 4.1, 4.2_

  - [x] 2.2 Implement `findContractsByLandlordId` in `PrismaContractRepository`
    - Cross-schema multi-step query: find all `LandlordPortfolio` where `user_id = landlordUserId`, then `PortfolioUnit` by `portfolio_id`, then `Lease` by `portfolio_unit_id`, then `Contract` by `lease_id`
    - Resolve tenant name from `Lease.user_id → User → NaturalPersonDetail` (first_name + last_name)
    - Resolve unit name from `PortfolioUnit.name`
    - Resolve contract status name from `ContractStatus` table
    - Return enriched `LandlordContractListItem[]`
    - _Requirements: 4.1, 4.2_

- [x] 3. Create backend DTOs
  - [x] 3.1 Create `UpdatePortfolioDto` request DTO
    - Create `src/backend/modules/landlord-portfolio/application/dtos/update-portfolio.dto.ts`
    - Fields: `name?: string` (`@IsOptional()`, `@IsString()`, `@IsNotEmpty()`), `description?: string` (`@IsOptional()`, `@IsString()`)
    - Use `@ApiPropertyOptional()` on every field for Swagger
    - Use `!` definite assignment per `strictPropertyInitialization`
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Create `LandlordContractListItemDto` response DTO
    - Create `src/backend/modules/contracts/application/dtos/landlord-contract-list-item.dto.ts`
    - Fields: `id!: string`, `unitName!: string`, `tenantName!: string`, `status!: string`, `startDate!: Date`, `endDate!: Date | null`
    - Use `@ApiProperty()` on all fields, `@ApiPropertyOptional({ nullable: true })` on `endDate`
    - _Requirements: 4.2_

- [x] 4. Create backend use cases
  - [x] 4.1 Create `UpdatePortfolioUseCase`
    - Create `src/backend/modules/landlord-portfolio/application/use-cases/update-portfolio.use-case.ts`
    - Inject `IPortfolioRepository` via `@Inject(PORTFOLIO_REPOSITORY)`
    - `execute(portfolioId: string, dto: UpdatePortfolioDto, userId: string, userRoles: string[]): Promise<PortfolioSummaryResponseDto>`
    - Verify LANDLORD role — throw `ForbiddenException` if missing
    - Call `repository.findPortfolioById(portfolioId)` — throw `NotFoundException` if null
    - Verify ownership (`portfolio.userId === userId`) — throw `ForbiddenException` if mismatch
    - Call `repository.updatePortfolio(portfolioId, { name: dto.name, description: dto.description })`
    - Map result to `PortfolioSummaryResponseDto`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Create `DeletePortfolioUseCase`
    - Create `src/backend/modules/landlord-portfolio/application/use-cases/delete-portfolio.use-case.ts`
    - Inject `IPortfolioRepository`
    - `execute(portfolioId: string, userId: string, userRoles: string[]): Promise<void>`
    - Verify LANDLORD role — throw `ForbiddenException` if missing
    - Call `repository.findPortfolioById(portfolioId)` — throw `NotFoundException` if null
    - Verify ownership — throw `ForbiddenException` if mismatch
    - Call `repository.countUnitsByPortfolioId(portfolioId)` — throw `ConflictException('El portafolio tiene unidades asociadas y no puede ser eliminado')` if count > 0
    - Call `repository.deletePortfolio(portfolioId)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.3 Create `DeleteUnitUseCase`
    - Create `src/backend/modules/landlord-portfolio/application/use-cases/delete-unit.use-case.ts`
    - Inject `IPortfolioRepository`
    - `execute(portfolioId: string, unitId: string, userId: string): Promise<void>`
    - Call `repository.findUnitById(unitId)` — throw `NotFoundException` if null
    - Call `repository.getPortfolioOwnerUserId(unitId)` — verify ownership, throw `ForbiddenException` if mismatch
    - Call `repository.hasActiveLeases(unitId)` — throw `ConflictException('La unidad tiene arriendos activos y no puede ser eliminada')` if true
    - Call `repository.deleteUnit(unitId)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.4 Create `GetLandlordContractsUseCase`
    - Create `src/backend/modules/contracts/application/use-cases/get-landlord-contracts.use-case.ts`
    - Inject `IContractRepository` via `@Inject(CONTRACT_REPOSITORY)`
    - `execute(userId: string): Promise<LandlordContractListItemDto[]>`
    - Call `repository.findContractsByLandlordId(userId)`
    - Map results to `LandlordContractListItemDto[]`
    - _Requirements: 4.1, 4.2_

- [x] 5. Add new controller routes and wire use cases in modules
  - [x] 5.1 Add `PATCH /portfolio/:portfolioId` and `DELETE /portfolio/:portfolioId` and `DELETE /portfolio/:portfolioId/units/:id` routes to `LandlordPortfolioController`
    - Import `Delete` from `@nestjs/common`
    - Add `PATCH /:portfolioId` route: `@ApiOperation`, `@ApiOkResponse({ type: PortfolioSummaryResponseDto })`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse` — calls `updatePortfolioUseCase.execute(portfolioId, dto, req.user.id, req.user.roles)`
    - Add `DELETE /:portfolioId` route: `@ApiOperation`, `@ApiOkResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse` — calls `deletePortfolioUseCase.execute(portfolioId, req.user.id, req.user.roles)`
    - Add `DELETE /:portfolioId/units/:id` route: `@ApiOperation`, `@ApiOkResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse` — calls `deleteUnitUseCase.execute(portfolioId, id, req.user.id)`
    - Inject `UpdatePortfolioUseCase`, `DeletePortfolioUseCase`, `DeleteUnitUseCase` in controller constructor
    - _Requirements: 1.1–1.5, 2.1–2.4, 3.1–3.4_

  - [x] 5.2 Add `GET /contracts/landlord` route to `ContractsController`
    - Add the route **before** the existing `GET /contracts/:id` route to avoid NestJS treating `landlord` as an `:id` parameter
    - `@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth('JWT')`, `@ApiOperation({ summary: 'Listar contratos del arrendador' })`, `@ApiOkResponse({ type: [LandlordContractListItemDto] })`
    - Calls `getLandlordContractsUseCase.execute(req.user.id)`
    - Inject `GetLandlordContractsUseCase` in controller constructor
    - _Requirements: 4.1, 4.2_

  - [x] 5.3 Register new use cases in their respective modules
    - Add `UpdatePortfolioUseCase`, `DeletePortfolioUseCase`, `DeleteUnitUseCase` to `LandlordPortfolioModule` providers
    - Add `GetLandlordContractsUseCase` to `ContractsModule` providers
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 6. Checkpoint — Backend complete
  - Ensure all tests pass (`npm run test` from `src/backend/`), ask the user if questions arise.

- [x] 7. Extend frontend service layer and types
  - [x] 7.1 Add `UpdatePortfolioRequest` and `LandlordContractListItem` types
    - Add `UpdatePortfolioRequest` to `src/frontend/modules/landlord-portfolio/types.ts`: `{ name?: string; description?: string }`
    - Add `LandlordContractListItem` to `src/frontend/modules/landlord-contracts/types.ts`: `{ id: string; unitName: string; tenantName: string; status: 'PENDING' | 'SIGNATURE_PENDING' | 'SIGNED'; startDate: string; endDate: string | null }`
    - _Requirements: 7.1, 8.1_

  - [x] 7.2 Add `updatePortfolio`, `deletePortfolio`, `deleteUnit` to `portfolioService`
    - In `src/frontend/shared/services/portfolio.ts`
    - `updatePortfolio(portfolioId: string, data: UpdatePortfolioRequest, token: string): Promise<PortfolioSummary>` — `PATCH ${API_URL}/portfolio/${portfolioId}`
    - `deletePortfolio(portfolioId: string, token: string): Promise<void>` — `DELETE ${API_URL}/portfolio/${portfolioId}`
    - `deleteUnit(portfolioId: string, unitId: string, token: string): Promise<void>` — `DELETE ${API_URL}/portfolio/${portfolioId}/units/${unitId}`
    - Error handling: 401 → "Sesión expirada", 409 → parse conflict message from response body, 403 → permission error
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 7.3 Add `getContractsByLandlord` to `contractService`
    - In `src/frontend/shared/services/contract.ts`
    - `getContractsByLandlord(token: string): Promise<LandlordContractListItem[]>` — `GET ${API_URL}/contracts/landlord`
    - Error handling: 401 → "Sesión expirada", 403 → permission error, network error → "No se pudo conectar con el servidor."
    - Import `LandlordContractListItem` from `@modules/landlord-contracts/types`
    - _Requirements: 7.1, 7.4, 7.5, 7.6_

- [x] 8. Create `ConfirmationDialog` shared component
  - Create `src/frontend/shared/components/ConfirmationDialog.tsx`
  - Props: `isOpen`, `title`, `message`, `confirmLabel`, `cancelLabel?` (default "Cancelar"), `onConfirm`, `onCancel`, `isLoading?`
  - Use native `<dialog>` element with `role="alertdialog"`, `aria-labelledby`, `aria-describedby`
  - Focus trap within the dialog, Escape key closes via `onCancel`
  - Confirm button: destructive style (red), Cancel button: secondary style
  - Minimum 44px touch targets on both buttons
  - `isLoading` state disables buttons and shows spinner on confirm button
  - _Requirements: 2.5, 2.8, 3.5, 3.8_

- [x] 9. Add `contract` variant to `StatusBadge` component
  - In `src/frontend/shared/components/StatusBadge.tsx`
  - Add `'contract'` to the `variant` union type
  - Add color mappings: PENDING → amber (`#FEF3C7` bg, `#92400E` text, label "Pendiente"), SIGNATURE_PENDING → blue (`#DBEAFE` bg, `#1E40AF` text, label "Firma pendiente"), SIGNED → green (`#D1FAE5` bg, `#065F46` text, label "Firmado")
  - Unknown statuses fall back to gray
  - _Requirements: 4.3_

- [x] 10. Checkpoint — Shared components complete
  - Ensure frontend builds (`npm run build` from `src/frontend/`) and lint passes (`npm run lint` from `src/frontend/`), ask the user if questions arise.

- [x] 11. Modify `PortfolioCard` with edit and delete actions
  - In `src/frontend/modules/landlord-portfolio/components/PortfolioCard.tsx`
  - Add edit button (pencil icon) that toggles an inline edit form pre-filled with current name and description
  - Inline edit form: name input (required), description textarea (optional), Save and Cancel buttons
  - On save: call `portfolioService.updatePortfolio(portfolio.id, data, token)` — on success update card, on error show error message and preserve form data
  - Add delete button (trash icon) that opens `ConfirmationDialog`
  - On confirm delete: call `portfolioService.deletePortfolio(portfolio.id, token)` — on success remove card from list (via callback prop `onDelete`), on 409 show conflict message
  - On cancel: close dialog
  - Accept `token: string`, `onUpdate: (updated: PortfolioSummary) => void`, `onDelete: (id: string) => void` as new props
  - Make component `'use client'` since it now has interactive state
  - _Requirements: 1.6, 1.7, 1.8, 2.5, 2.6, 2.7, 2.8_

- [x] 12. Modify `UnitDetailView` with delete action
  - In `src/frontend/modules/landlord-portfolio/components/UnitDetailView.tsx`
  - Add a "Eliminar unidad" delete button below existing action buttons
  - Delete button opens `ConfirmationDialog` with message "¿Estás seguro de que deseas eliminar esta unidad?"
  - On confirm: call `portfolioService.deleteUnit(portfolioId, unit.id, token)` — on success navigate to `/mi-portafolio/${portfolioId}/unidades`, on 409 show conflict message about active leases
  - On cancel: close dialog
  - Make component `'use client'` since it now has interactive state
  - Accept `token: string` and `onDelete?: () => void` as new props (or use `useAuth` + `useRouter` internally)
  - _Requirements: 3.5, 3.6, 3.7, 3.8_

- [x] 13. Checkpoint — Component modifications complete
  - Ensure frontend builds and lint passes, ask the user if questions arise.

- [x] 14. Create Contracts List Page (`/mis-contratos`)
  - [x] 14.1 Create the Next.js page file
    - Create `src/frontend/app/mis-contratos/page.tsx`
    - Server component that renders the `ContractsListView` client component
    - _Requirements: 4.1_

  - [x] 14.2 Create `ContractsListView` client component
    - Create `src/frontend/modules/landlord-contracts/components/ContractsListView.tsx`
    - `'use client'` component, uses `useAuth` for token
    - On mount: fetch contracts via `contractService.getContractsByLandlord(token)`
    - Display each contract as a card: unit name, tenant name, `StatusBadge` with `variant="contract"`, start date (formatted Spanish), end date
    - Tap on card → navigate to `/mis-contratos/${contract.id}`
    - Loading state: `Skeleton` placeholders
    - Error state: `ErrorState` component with retry button
    - Empty state: message "No tienes contratos aún" with guidance on how to create one
    - Back button to `/mi-portafolio` using `rounded-card` class and left-arrow SVG
    - Wrap content in `<main className="flex justify-center ..."><div className="w-full max-w-[560px]">...</div></main>`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 15. Create Contract Detail Page (`/mis-contratos/[id]`)
  - [x] 15.1 Create the Next.js page file
    - Create `src/frontend/app/mis-contratos/[id]/page.tsx`
    - Server component that renders the `ContractDetailView` client component
    - Extract `id` from route params
    - _Requirements: 5.1_

  - [x] 15.2 Create `ContractDetailView` client component
    - Create `src/frontend/modules/landlord-contracts/components/ContractDetailView.tsx`
    - `'use client'` component, uses `useAuth` for token
    - On mount: fetch contract via `contractService.getContract(id, token)`
    - Display: start date, end date, `StatusBadge` with `variant="contract"`, PDF download link (`<a href={contract.fileUrl} target="_blank">`)
    - Display contract parties list with roles (landlord/tenant labels in Spanish)
    - Conditional actions based on status:
      - PENDING → "Iniciar firma" button → calls `contractService.signContract(id, token)`, on success update status to SIGNATURE_PENDING
      - SIGNATURE_PENDING → informational message "Esperando firmas de las partes"
      - SIGNED → display signed date (`contract.signedAt`) and confirmation message "Contrato firmado"
    - Error state: `ErrorState` with retry
    - Loading state: `Skeleton` placeholders
    - Back button to `/mis-contratos` using `rounded-card` class and left-arrow SVG
    - Wrap content in `<main className="flex justify-center ..."><div className="w-full max-w-[560px]">...</div></main>`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 16. Create Contract Creation Page (`/mis-contratos/crear`)
  - [x] 16.1 Create the Next.js page file
    - Create `src/frontend/app/mis-contratos/crear/page.tsx`
    - Server component that renders the `ContractCreationView` client component
    - _Requirements: 6.1_

  - [x] 16.2 Create `ContractCreationView` client component
    - Create `src/frontend/modules/landlord-contracts/components/ContractCreationView.tsx`
    - `'use client'` component, uses `useAuth` for token, `useSearchParams` for `leaseId` query param
    - On mount: fetch lease detail to pre-populate the `ContractWizard` (reuse existing lease detail fetch pattern)
    - Render the existing `ContractWizard` component with `lease` and `onSuccess` props
    - On success: navigate to `/mis-contratos/${newContractId}` (modify `ContractWizard` `onSuccess` to pass the new contract ID)
    - Error state if `leaseId` is missing or lease fetch fails
    - Loading state while fetching lease
    - Back button using `rounded-card` class and left-arrow SVG
    - Wrap content in `<main className="flex justify-center ..."><div className="w-full max-w-[560px]">...</div></main>`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure backend tests pass (`npm run test` from `src/backend/`), frontend builds (`npm run build` from `src/frontend/`), and lint passes (`npm run lint` from `src/frontend/`). Ask the user if questions arise.

## Notes

- No tasks are marked optional since the design has no Correctness Properties section
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The `GET /contracts/landlord` route MUST be registered before `GET /contracts/:id` in the controller to avoid route conflicts
- All DTOs use `!` definite assignment per `strictPropertyInitialization: true`
- All controller methods include `@ApiOperation`, `@ApiBearerAuth`, and response type decorators for Swagger
- Frontend uses Spanish UI text, English code identifiers, and Spanish URL routes
- Back buttons use `<Link>`, `rounded-card` class, and left-arrow SVG (line pattern, not chevron)
- Cross-schema queries use multi-step lookups (no Prisma `@relation` across schemas)
- `ConfirmationDialog` uses native `<dialog>` element for accessibility
- `StatusBadge` contract variant follows existing variant pattern
