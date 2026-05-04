# Frontend — Plataforma de Arriendo

Aplicación Next.js (App Router) con Tailwind CSS y TypeScript para la plataforma de arriendo de vivienda urbana. Incluye los módulos de exploración de inmuebles con filtros backend-driven y barra de búsqueda por palabras clave, autenticación/perfil de usuarios, portafolio del arrendador, contabilidad, gestión de arriendos con cancelación, gestión de contratos (listado, detalle, creación y firma), publicación de unidades, notificaciones in-app con preferencias de canales externos, experiencia multirole con gestión de roles, flujos del arrendatario (arriendos activos, pagos, contratos), y landing page estática.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Vitest (testing)
- Fuente Inter (400, 600, 700)

## Estructura del Proyecto

```
src/frontend/
├── app/
│   ├── layout.tsx            # Layout raíz (lang="es", Inter, AuthProvider)
│   ├── page.tsx              # Landing page estática (hero + CTA "Buscar inmuebles")
│   ├── globals.css           # Estilos globales + Tailwind
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx      # Página de inicio de sesión (Client Component)
│   │   └── registro/
│   │       └── page.tsx      # Página de registro multi-paso (Client Component)
│   ├── explorar/
│   │   ├── page.tsx          # Página de listado (Server Component)
│   │   └── [id]/
│   │       └── page.tsx      # Página de detalle (Server Component)
│   ├── mi-perfil/
│   │   └── page.tsx          # Página de perfil con gestión de roles y navegación rápida (Client Component, protegida)
│   ├── mis-notificaciones/
│   │   ├── page.tsx              # Historial de notificaciones in-app (Client Component, protegida)
│   │   └── preferencias/
│   │       └── page.tsx          # Preferencias de canales externos (Client Component, protegida)
│   ├── mis-arriendos/
│   │   ├── page.tsx              # Arriendos activos del arrendatario (Client Component, TENANT)
│   │   └── [id]/
│   │       └── page.tsx          # Detalle de arriendo del arrendatario (Client Component, TENANT)
│   ├── mi-portafolio/
│   │   ├── page.tsx              # Listado de portafolios con estadísticas (Client Component, LANDLORD)
│   │   ├── nueva-unidad/
│   │   │   └── page.tsx          # Redirige a /mi-portafolio (legacy)
│   │   └── [id]/
│   │       ├── editar/
│   │       │   └── page.tsx      # Editar unidad (Client Component, LANDLORD)
│   │       ├── agregar-unidad/
│   │       │   └── page.tsx      # Agregar unidad enriquecida a portafolio (Client Component, LANDLORD)
│   │       └── unidades/
│   │           ├── page.tsx      # Listado de unidades de un portafolio (Client Component, LANDLORD)
│   │           └── [unitId]/
│   │               ├── page.tsx          # Detalle de unidad (Client Component, LANDLORD)
│   │               ├── arriendos/
│   │               │   ├── page.tsx          # Historial de arriendos de la unidad (Client Component, LANDLORD)
│   │               │   ├── crear/
│   │               │   │   └── page.tsx      # Crear arriendo (Client Component, LANDLORD)
│   │               │   └── [leaseId]/
│   │               │       ├── page.tsx      # Detalle del arriendo (Client Component, LANDLORD)
│   │               │       └── crear-contrato/
│   │               │           └── page.tsx  # Wizard de creación de contrato (Client Component, LANDLORD)
│   │               ├── publicacion/
│   │               │   ├── page.tsx          # Gestión de publicación activa (Client Component, LANDLORD)
│   │               │   └── editar/
│   │               │       └── page.tsx      # Editar publicación activa (Client Component, LANDLORD)
│   │               └── publicar/
│   │                   └── page.tsx          # Publicar unidad en Explorar (Client Component, LANDLORD)
│   ├── mis-contratos/
│   │   ├── page.tsx              # Listado de contratos del arrendador (Client Component, LANDLORD)
│   │   ├── crear/
│   │   │   └── page.tsx          # Creación de contrato via wizard (Client Component, LANDLORD)
│   │   └── [id]/
│   │       └── page.tsx          # Detalle de contrato (Client Component, LANDLORD)
│   ├── mis-contratos-arrendatario/
│   │   ├── page.tsx              # Listado de contratos del arrendatario (Client Component, TENANT)
│   │   └── [id]/
│   │       └── page.tsx          # Detalle de contrato del arrendatario (Client Component, TENANT)
│   ├── mis-pagos/
│   │   └── page.tsx              # Historial de pagos del arrendatario (Client Component, TENANT)
│   └── mis-ingresos/
│       ├── page.tsx              # Dashboard de ingresos del arrendador (Client Component, LANDLORD)
│       └── portafolio/
│           └── [portfolioId]/
│               ├── page.tsx      # Reporte agregado de portafolio (Client Component, LANDLORD)
│               └── unidad/
│                   └── [unitId]/
│                       └── page.tsx  # Reporte individual de unidad (Client Component, LANDLORD)
├── modules/
│   ├── landlord-accounting/
│   │   ├── components/
│   │   │   ├── PeriodFilter.tsx         # Selector de periodo por tabs (1m, 3m, 6m, 12m)
│   │   │   ├── SummaryCard.tsx          # Tarjeta de métrica (label + valor formateado)
│   │   │   ├── PortfolioIncomeCard.tsx  # Tarjeta de portafolio para overview de ingresos
│   │   │   └── PropertyDetailTable.tsx  # Tabla de detalle por propiedad
│   │   ├── __tests__/
│   │   │   └── utils.test.ts
│   │   ├── types.ts                     # Interfaces: PeriodRequest, AggregatedReportResponse, IndividualReportResponse, etc.
│   │   └── utils.ts                     # computePeriod helper
│   ├── landlord-contracts/
│   │   ├── components/
│   │   │   ├── ContractsListView.tsx    # Vista de listado de contratos del arrendador
│   │   │   ├── ContractDetailView.tsx   # Vista de detalle de contrato (estado, partes, firma)
│   │   │   ├── ContractCreationView.tsx # Vista de creación de contrato (wrapper del wizard)
│   │   │   ├── ContractWizard.tsx       # Orquestador del wizard de 3 pasos
│   │   │   ├── WizardProgress.tsx       # Indicador visual de progreso (1-2-3)
│   │   │   ├── StepTenant.tsx           # Paso 1: datos del arrendatario
│   │   │   ├── StepTerms.tsx            # Paso 2: términos del contrato
│   │   │   └── StepDocument.tsx         # Paso 3: carga de PDF
│   │   ├── types.ts                     # Interfaces: ContractFormData, UploadContractRequest, ContractSummary, LandlordContractListItem, etc.
│   │   └── validation.ts               # Validación por paso: step1, step2, step3
│   ├── landlord-leases/
│   │   ├── components/
│   │   │   ├── LeaseCard.tsx            # Tarjeta de arriendo con estado y acciones contextuales
│   │   │   ├── LeaseCreateForm.tsx      # Formulario de creación de arriendo
│   │   │   ├── LeaseDetailView.tsx      # Vista de detalle de arriendo (solo lectura)
│   │   │   └── UnitInfoHeader.tsx       # Encabezado con info de la unidad
│   │   ├── types.ts                     # Interfaces: LeaseListItem, LeaseDetail, UnitInfo, CreateLeaseRequest
│   │   └── validation.ts               # Validación de formulario de arriendo
│   ├── landlord-portfolio/
│   │   ├── components/
│   │   │   ├── AddUnitForm.tsx         # Formulario enriquecido de creación de unidad (3 secciones)
│   │   │   ├── LandlordRoute.tsx      # Protección auth + rol LANDLORD
│   │   │   ├── PortfolioCard.tsx      # Tarjeta de portafolio con estadísticas y ocupación
│   │   │   ├── PortfolioList.tsx      # Lista vertical de tarjetas de unidades
│   │   │   ├── ListingEditForm.tsx     # Formulario de edición de publicación activa
│   │   │   ├── ListingManagementView.tsx # Vista de gestión de publicación (ver, editar, despublicar)
│   │   │   ├── UnitCard.tsx           # Tarjeta individual de unidad de portafolio
│   │   │   ├── UnitDetailView.tsx     # Vista de detalle de unidad
│   │   │   └── UnitForm.tsx           # Formulario crear/editar (reutilizable)
│   │   ├── __tests__/
│   │   │   └── validation.test.ts
│   │   ├── types.ts                   # Interfaces: PortfolioUnit, PortfolioSummary, PaginatedPortfolios, CreateUnitRequest, etc.
│   │   ├── utils.ts                   # formatPortfolioDate (wrapper de formatRelativeDate)
│   │   └── validation.ts             # Validación pura: propertyId, leaseBaseAmount, leaseBaseCurrency, unitName, address, propertyType, positiveDecimal, nonNegativeInteger
│   ├── landlord-publish/
│   │   ├── components/
│   │   │   ├── PublishForm.tsx          # Formulario de publicación de listing
│   │   │   ├── PhotoUploader.tsx        # Carga de fotos con previews
│   │   │   └── PhotoThumbnail.tsx       # Preview individual de foto
│   │   ├── types.ts                     # Interfaces: PhotoFile, PublishFormData, CreateListingRequest
│   │   └── validation.ts               # Validación de formulario de publicación
│   ├── property-listings/
│   │   ├── components/
│   │   │   ├── ActionBar.tsx          # Barra de acciones (Filtros + Ordenar)
│   │   │   ├── FilterPanel.tsx        # Panel de filtros backend-driven (departamento/ciudad desde API, características adicionales dinámicas)
│   │   │   ├── GalleryModal.tsx       # Modal fullscreen de imagen ampliada
│   │   │   ├── KeywordSearchBar.tsx   # Barra de búsqueda con sugerencias prefetched, TagChips y botón Buscar
│   │   │   ├── ListingCard.tsx        # Tarjeta de inmueble
│   │   │   ├── ListingDetailView.tsx  # Vista completa del detalle
│   │   │   ├── ListingGrid.tsx        # Cuadrícula responsive de tarjetas
│   │   │   ├── PhotoGallery.tsx       # Galería de fotos con navegación
│   │   │   ├── PropertyInfoGrid.tsx   # Grilla de habitaciones/baños/área
│   │   │   └── SortPanel.tsx          # Panel de ordenamiento (Client Component)
│   │   ├── hooks/
│   │   │   ├── useFilters.ts          # Gestión de filtros vía URL query params (incluye department y additionalFeatures)
│   │   │   └── useListings.ts         # Fetch con AbortController + loading state
│   │   └── types.ts                   # Interfaces: Listing, ListingDetail, ListingFilters, AdditionalFeature, etc.
│   ├── notifications/
│   │   ├── components/
│   │   │   ├── NotificationsListView.tsx  # Lista de tarjetas de notificación (leído/no leído, marcar como leída)
│   │   │   └── PreferencesView.tsx        # Preferencias de canales externos (toggles EMAIL/WHATSAPP)
│   │   └── utils/
│   │       ├── translate-notification-type.test.ts  # Tests de traducción de tipos de notificación
│   │       └── translate-notification-type.ts       # Mapa de traducciones de tipos de notificación
│   ├── tenant/
│   │   └── components/
│   │       ├── ContactLandlordButton.tsx      # Botón de contacto con arrendador
│   │       ├── PaymentsView.tsx               # Vista de historial de pagos
│   │       ├── RentalDetailView.tsx           # Detalle de arriendo del arrendatario
│   │       ├── RentalsListView.tsx            # Lista de arriendos activos
│   │       ├── TenantContractDetailView.tsx   # Detalle de contrato del arrendatario
│   │       └── TenantContractsListView.tsx    # Lista de contratos del arrendatario
│   └── users/
│       ├── components/
│       │   ├── LoginForm.tsx          # Formulario de login con validación client-side
│       │   ├── ProfileCard.tsx        # Tarjeta de perfil (solo lectura) + logout
│       │   ├── ProtectedRoute.tsx     # Wrapper de protección de rutas autenticadas
│       │   ├── QuickNavSection.tsx     # Navegación rápida por rol (tarjetas LANDLORD/TENANT)
│       │   ├── RegistrationWizard.tsx     # Orquestador del formulario multi-paso (3 pasos)
│       │   ├── RegistroWizard.tsx         # Wizard de registro alternativo (mismo flujo, naming en español)
│       │   ├── RoleManagementSection.tsx  # Gestión de roles (agregar/eliminar) en perfil
│       │   ├── Step1UserType.tsx      # Paso 1: selección de rol y tipo de persona
│       │   ├── Step2PersonalData.tsx  # Paso 2: datos personales + documento + teléfono
│       │   ├── Step3Credentials.tsx   # Paso 3: email + contraseña + confirmación
│       │   └── StepIndicator.tsx      # Indicador visual de progreso (1-2-3)
│       ├── context/
│       │   └── AuthContext.tsx         # AuthProvider + useAuth hook (estado global de sesión)
│       ├── __tests__/
│       │   ├── ProtectedRoute.test.ts
│       │   ├── StepIndicator.test.ts
│       │   └── validation.test.ts
│       ├── types.ts                   # Interfaces: AuthUser, LoginRequest, RegisterRequest, etc.
│       └── validation.ts             # Funciones de validación puras (email, password, phone, etc.)
├── shared/
│   ├── components/
│   │   ├── Button.tsx             # Botón primary/secondary reutilizable
│   │   ├── ConfirmationDialog.tsx # Diálogo modal de confirmación para acciones destructivas
│   │   ├── EmptyState.tsx         # Estado vacío (sin resultados)
│   │   ├── ErrorState.tsx         # Estado de error con retry
│   │   ├── Header.tsx             # Encabezado fijo (hamburguesa + título)
│   │   ├── ListingCardSkeleton.tsx
│   │   ├── ListingDetailSkeleton.tsx
│   │   ├── ListingGridSkeleton.tsx
│   │   ├── Pagination.tsx         # Paginación con selector de items/página
│   │   ├── SideMenu.tsx           # Menú lateral (drawer 320px, auth-aware)
│   │   ├── Skeleton.tsx           # Skeleton loader genérico
│   │   ├── StatusBadge.tsx        # Badge de estado reutilizable (variantes: lease, unit, payment, listing, contract)
│   │   ├── Toast.tsx              # Notificación temporal (auto-hide, role="status")
│   │   └── WizardProgress.tsx     # Indicador visual de progreso multi-paso (pasos numerados, checks, conectores)
│   ├── hooks/
│   │   ├── useBodyScrollLock.ts   # Bloqueo de scroll para modales/drawers
│   │   └── useDebounce.ts        # Debounce genérico (default 400ms)
│   ├── services/
│   │   ├── accounting.ts         # AccountingService (getAggregatedReport, getIndividualReport)
│   │   ├── api.ts                # Servicio HTTP listings (fetchListings, fetchListingDetail, createListing)
│   │   ├── auth.ts               # Servicio HTTP auth (login, register, getProfile, getDocumentTypes)
│   │   ├── contract.ts           # ContractService (createContract, getContract, signContract)
│   │   ├── lease.ts              # LeaseService (getUnitLeases, getLeaseDetail, createLease)
│   │   ├── notification.ts       # NotificationService (getNotifications, getNotificationCount, markAsRead, markAllAsRead, getPreferences, updatePreference)
│   │   ├── portfolio.ts          # PortfolioService (getPortfolios, createPortfolio, getUnits, createUnit, createEnrichedUnit, updateUnit, getDepartments, getCitiesByDepartment, getPropertyTypes)
│   │   ├── role.ts               # RoleService (addRole, removeRole, getRemovableRoles)
│   │   └── tenant.ts             # TenantService (getActiveLeases, getLeaseStatus, getPaymentHistory, initiatePayment, transitionLeaseState, getTenantContracts)
│   └── utils/
│       ├── formatPrice.ts         # Formato COP ($X.XXX.XXX)
│       └── formatRelativeDate.ts  # Fecha relativa en español
├── .env.local
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

## Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL base del backend NestJS | `http://localhost:3000` |

## Comandos

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run lint       # Linting
```

## Páginas

| Ruta | Tipo | Auth | Descripción |
|------|------|------|-------------|
| `/` | Server Component | No | Landing page estática con hero, descripción de la plataforma y CTA "Buscar inmuebles" |
| `/explorar` | Server Component | No | Listado de inmuebles con filtros, ordenamiento y paginación |
| `/explorar/[id]` | Server Component | No | Detalle del inmueble con galería de fotos |
| `/auth/login` | Client Component | No | Inicio de sesión (email + contraseña) |
| `/auth/registro` | Client Component | No | Registro multi-paso (rol, datos personales, credenciales) |
| `/mi-perfil` | Client Component | Sí | Perfil del usuario con gestión de roles y navegación rápida por rol |
| `/mis-notificaciones` | Client Component | Sí | Historial de notificaciones in-app (leído/no leído, marcar como leída) |
| `/mis-notificaciones/preferencias` | Client Component | Sí | Preferencias de canales externos (EMAIL, WHATSAPP) por tipo de notificación |
| `/mis-arriendos` | Client Component | TENANT | Arriendos activos del arrendatario con estado y seguimiento |
| `/mis-arriendos/[id]` | Client Component | TENANT | Detalle de arriendo del arrendatario (estado, contratos, pagos) |
| `/mi-portafolio` | Client Component | LANDLORD | Listado de portafolios con estadísticas, paginación y creación |
| `/mi-portafolio/nueva-unidad` | Client Component | LANDLORD | Redirige a `/mi-portafolio` (legacy) |
| `/mi-portafolio/[id]/editar` | Client Component | LANDLORD | Editar unidad de portafolio existente |
| `/mi-portafolio/[id]/agregar-unidad` | Client Component | LANDLORD | Agregar unidad enriquecida a un portafolio |
| `/mi-portafolio/[id]/unidades` | Client Component | LANDLORD | Listado de unidades de un portafolio |
| `/mi-portafolio/[id]/unidades/[unitId]` | Client Component | LANDLORD | Detalle de unidad con info completa y acción de eliminar |
| `/mi-portafolio/[id]/unidades/[unitId]/arriendos` | Client Component | LANDLORD | Historial de arriendos de una unidad |
| `/mi-portafolio/[id]/unidades/[unitId]/arriendos/crear` | Client Component | LANDLORD | Crear nuevo arriendo para una unidad |
| `/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]` | Client Component | LANDLORD | Detalle de un arriendo específico |
| `/mi-portafolio/[id]/unidades/[unitId]/arriendos/[leaseId]/crear-contrato` | Client Component | LANDLORD | Wizard de creación de contrato (3 pasos) |
| `/mi-portafolio/[id]/unidades/[unitId]/publicacion` | Client Component | LANDLORD | Gestión de publicación activa (ver, editar, despublicar) |
| `/mi-portafolio/[id]/unidades/[unitId]/publicacion/editar` | Client Component | LANDLORD | Editar publicación activa (título, descripción, precio, fotos) |
| `/mi-portafolio/[id]/unidades/[unitId]/publicar` | Client Component | LANDLORD | Publicar unidad como listing en Explorar |
| `/mis-contratos` | Client Component | LANDLORD | Listado de contratos del arrendador con badges de estado (SideMenu, no back arrow — first-level page) |
| `/mis-contratos/[id]` | Client Component | LANDLORD | Detalle de contrato (estado, partes, firma, PDF) |
| `/mis-contratos/crear` | Client Component | LANDLORD | Creación de contrato via wizard (3 pasos) |
| `/mis-contratos-arrendatario` | Client Component | TENANT | Listado de contratos del arrendatario |
| `/mis-contratos-arrendatario/[id]` | Client Component | TENANT | Detalle de contrato del arrendatario |
| `/mis-pagos` | Client Component | TENANT | Historial de pagos del arrendatario |
| `/mis-ingresos` | Client Component | LANDLORD | Dashboard de ingresos del arrendador |
| `/mis-ingresos/portafolio/[portfolioId]` | Client Component | LANDLORD | Reporte agregado de ingresos por portafolio |
| `/mis-ingresos/portafolio/[portfolioId]/unidad/[unitId]` | Client Component | LANDLORD | Reporte individual de ingresos por unidad |

## Módulos

### property-listings

Exploración pública de inmuebles: listado con filtros backend-driven (departamento, ciudad, barrio, tipo, precio, habitaciones, baños, área, fecha, características adicionales dinámicas), barra de búsqueda por palabras clave con sugerencias prefetched y TagChips, ordenamiento, paginación y vista de detalle con galería de fotos.

### users

Autenticación y perfil de usuario: login con email/contraseña, registro multi-paso (3 pasos: tipo de usuario, datos personales, credenciales), perfil con gestión de roles (agregar/eliminar) y navegación rápida por rol, gestión de sesión JWT (AuthProvider con `updateAuth` para cambios de rol), protección de rutas, catálogo de tipos de documento desde el backend, y redirección post-login a `/mi-perfil` con soporte para `returnUrl`.

### notifications

Notificaciones in-app y preferencias de canales externos: historial de notificaciones con indicador leído/no leído, marcar como leída individual o masiva, enlace a preferencias, página de preferencias con toggles EMAIL/WHATSAPP por tipo de notificación con UI optimista, banner informativo de canal in-app siempre activo, y helper de traducción de tipos de notificación al español (CONTRACT_SIGNED, PAYMENT_RECEIVED, CONTACT_INITIATED, CONTRACT_UPLOADED, PAYMENT_DUE, NEW_INTEREST) con fallback automático para tipos desconocidos. Componentes: NotificationsListView, PreferencesView.

### tenant

Flujos del arrendatario: listado de arriendos activos con estado y seguimiento, detalle de arriendo con historial de estados, historial de pagos con iniciación de pago, listado y detalle de contratos del arrendatario, y botón de contacto con arrendador. Componentes: RentalsListView, RentalDetailView, PaymentsView, TenantContractsListView, TenantContractDetailView, ContactLandlordButton.

### landlord-portfolio

Portafolio del arrendador: listado de portafolios con tarjetas de estadísticas (unidades, arriendos activos, ocupación), creación, edición inline y eliminación de portafolios, listado de unidades por portafolio, creación de unidades enriquecidas (nombre, dirección, tipo de propiedad, dimensiones, habitaciones, baños, canon base, departamento, ciudad), edición y eliminación de unidades, detalle de unidad, badges de estado por unidad (Ocupado, Disponible, Mantenimiento), acciones contextuales (publicar, gestionar publicación, ver historial, eliminar), gestión de publicaciones activas (ver detalle, editar, despublicar), formulario de edición de listing con manejo de fotos, diálogos de confirmación para acciones destructivas, protección de rutas por rol LANDLORD (LandlordRoute), validación client-side de formularios y servicio de integración con API backend (PortfolioService).

### landlord-accounting

Contabilidad del arrendador: dashboard de ingresos con resumen mensual (ingresos, total inmuebles, arriendos activos), tarjetas de portafolio con ingresos, reporte agregado por portafolio con filtro de periodo (1m, 3m, 6m, 12m), tarjetas de resumen (ingresos recibidos/esperados), tabla de detalle por propiedad con estado de pago, reporte individual por unidad con historial de arriendos. Componentes reutilizables: PeriodFilter, SummaryCard, PortfolioIncomeCard, PropertyDetailTable.

### landlord-leases

Gestión de arriendos: historial de arriendos por unidad con tarjetas de estado y acciones contextuales (ver detalle, generar/ver contrato), vista de detalle de arriendo rediseñada con tarjetas (Inmueble, Arrendatario, Acuerdo), cancelación de arriendo con diálogo de confirmación y cascada de contrato, creación de arriendo (email del arrendatario, fechas), encabezado de info de unidad. Componentes: LeaseCard, LeaseDetailView, LeaseCreateForm, UnitInfoHeader.

### landlord-contracts

Creación y gestión de contratos: wizard de 3 pasos (arrendatario, términos, documento PDF) con indicador de progreso, validación por paso (incluye validación de fecha para prevenir "Invalid Date"), pre-población desde datos del arriendo, carga de archivo PDF, y envío al backend. Listado de contratos del arrendador con badges de estado en formato tarjeta, vista de detalle con secciones en tarjetas (Términos, Partes, Documento) y acciones contextuales (iniciar firma, ver estado), y página de creación con wrapper del wizard. Componentes: ContractsListView, ContractDetailView, ContractCreationView, ContractWizard, WizardProgress, StepTenant, StepTerms, StepDocument.

### landlord-publish

Publicación de unidades: formulario para publicar una unidad del portafolio como listing en Explorar, con carga de fotos (JPEG/PNG/WebP, mín. 3, máx. 10), título, descripción, precio en COP, y previews de fotos. Componentes: PublishForm, PhotoUploader, PhotoThumbnail.

## Componentes Compartidos

| Componente | Descripción |
|------------|-------------|
| `Button` | Botón primary/secondary reutilizable |
| `EmptyState` | Estado vacío (sin resultados) |
| `ErrorState` | Estado de error con retry |
| `Header` | Encabezado fijo (hamburguesa/back + título) |
| `ListingCardSkeleton` | Skeleton para tarjeta de listing |
| `ListingDetailSkeleton` | Skeleton para detalle de listing |
| `ListingGridSkeleton` | Skeleton para grilla de listings |
| `Pagination` | Paginación con selector de items/página |
| `SideMenu` | Menú lateral (drawer 320px, auth-aware, enlace "Mis notificaciones" con badge de no leídas) |
| `Skeleton` | Skeleton loader genérico |
| `ConfirmationDialog` | Diálogo modal de confirmación para acciones destructivas (native `<dialog>`, focus trap, Escape to close) |
| `StatusBadge` | Badge de estado con variantes: lease (Vigente/Acordado/Finalizado), unit (Ocupado/Disponible/Mantenimiento), payment (Al día/Pendiente), listing (Publicada/Sin publicar), contract (Pendiente/Firma pendiente/Firmado), notification (Enviada/Fallida/Pendiente), tracking, paymentStatus |
| `Toast` | Notificación temporal auto-hide (`role="status"`, `aria-live="polite"`) |
| `WizardProgress` | Indicador visual de progreso multi-paso (pasos numerados con check en completados, conector entre pasos, `aria-current="step"`) |

## Servicios

| Servicio | Archivo | Descripción |
|----------|---------|-------------|
| Listings | `api.ts` | fetchListings, fetchListingDetail, createListing, fetchListingByUnit, updateListing, unpublishListing, fetchAdditionalFeatures |
| Auth | `auth.ts` | login, register, getProfile, getDocumentTypes |
| Portfolio | `portfolio.ts` | getPortfolios, createPortfolio, getUnits, createUnit, createEnrichedUnit, updateUnit, updatePortfolio, deletePortfolio, deleteUnit, getDepartments, getCitiesByDepartment, getPropertyTypes |
| Accounting | `accounting.ts` | getAggregatedReport, getIndividualReport |
| Contract | `contract.ts` | createContract, getContract, signContract, getContractsByLandlord |
| Lease | `lease.ts` | getUnitLeases, getLeaseDetail, createLease, cancelLease |
| Notification | `notification.ts` | getNotifications, getNotificationCount, markAsRead, markAllAsRead, getPreferences, updatePreference |
| Role | `role.ts` | addRole, removeRole, getRemovableRoles |
| Tenant | `tenant.ts` | getActiveLeases, getLeaseStatus, getPaymentHistory, initiatePayment, transitionLeaseState, getTenantContracts |

Todos los servicios usan `fetch` nativo, `Authorization: Bearer <token>` desde `localStorage`, y manejo de errores tipado con mensajes en español.

## API Backend

El frontend consume los endpoints REST del backend NestJS:

- `GET /listings` — Listado paginado con filtros
- `GET /listings/:id` — Detalle completo del inmueble
- `POST /listings` — Crear listing (publicar unidad, requiere JWT, rol LANDLORD)
- `GET /listings/by-unit/:portfolioUnitId` — Listing activo de una unidad (requiere JWT, rol LANDLORD)
- `PATCH /listings/:id` — Actualizar listing (título, descripción, precio, fotos; requiere JWT, rol LANDLORD)
- `PATCH /listings/:id/unpublish` — Despublicar listing activo (requiere JWT, rol LANDLORD)
- `GET /listings/additional-features` — Catálogo de características adicionales activas (público, filtro opcional `?main=true`)
- `POST /auth/login` — Inicio de sesión (retorna JWT)
- `POST /auth/register` — Registro de usuario
- `GET /auth/profile` — Perfil del usuario autenticado (requiere JWT)
- `GET /auth/document-types` — Catálogo de tipos de documento
- `GET /portfolio` — Listado paginado de portafolios con estadísticas (requiere JWT, rol LANDLORD)
- `POST /portfolio` — Crear portafolio (requiere JWT, rol LANDLORD)
- `PATCH /portfolio/:portfolioId` — Actualizar portafolio (nombre, descripción; requiere JWT, rol LANDLORD)
- `DELETE /portfolio/:portfolioId` — Eliminar portafolio vacío (requiere JWT, rol LANDLORD)
- `GET /portfolio/:portfolioId/units` — Listado de unidades de un portafolio (requiere JWT, rol LANDLORD)
- `POST /portfolio/:portfolioId/units` — Crear unidad enriquecida (requiere JWT, rol LANDLORD)
- `PATCH /portfolio/:portfolioId/units/:id` — Actualizar unidad (requiere JWT, rol LANDLORD)
- `DELETE /portfolio/:portfolioId/units/:id` — Eliminar unidad sin arriendos activos (requiere JWT, rol LANDLORD)
- `GET /portfolio/departments` — Catálogo de departamentos (público)
- `GET /portfolio/departments/:departmentCode/cities` — Ciudades por departamento (público)
- `GET /portfolio/:portfolioId/units/:unitId/leases` — Arriendos de una unidad (requiere JWT, rol LANDLORD)
- `GET /portfolio/:portfolioId/units/:unitId/leases/:leaseId` — Detalle de arriendo (requiere JWT, rol LANDLORD)
- `POST /portfolio/:portfolioId/units/:unitId/leases` — Crear arriendo (requiere JWT, rol LANDLORD)
- `DELETE /portfolio/:portfolioId/units/:unitId/leases/:leaseId` — Cancelar arriendo con cascada de contrato (requiere JWT, rol LANDLORD)
- `POST /accounting/reports/portfolio/:portfolioId/aggregated` — Reporte agregado de ingresos (requiere JWT, rol LANDLORD)
- `POST /accounting/reports/portfolio/:portfolioId/unit/:unitId` — Reporte individual de ingresos (requiere JWT, rol LANDLORD)
- `POST /contracts` — Crear contrato (requiere JWT, rol LANDLORD)
- `GET /contracts/landlord` — Listado de contratos del arrendador (requiere JWT)
- `GET /contracts/:id` — Resumen de contrato (requiere JWT, rol LANDLORD)
- `POST /contracts/:id/sign` — Iniciar firma digital (requiere JWT, rol LANDLORD)
- `GET /contracts/tenant` — Listado de contratos del arrendatario (requiere JWT, rol TENANT)
- `GET /notifications` — Listado de notificaciones in-app del usuario (requiere JWT)
- `GET /notifications/count` — Conteo de notificaciones no leídas (requiere JWT)
- `PATCH /notifications/:id/read` — Marcar notificación como leída (requiere JWT)
- `PATCH /notifications/read-all` — Marcar todas como leídas (requiere JWT)
- `GET /notifications/preferences` — Preferencias de canales externos agrupadas por tipo (requiere JWT)
- `PUT /notifications/preferences` — Actualizar preferencia de canal externo (requiere JWT)
- `POST /auth/roles/add` — Agregar rol al usuario (requiere JWT)
- `DELETE /auth/roles/:roleName` — Eliminar rol del usuario (requiere JWT)
- `GET /auth/roles/removable` — Consultar eliminabilidad de roles (requiere JWT)
- `GET /tracking/leases/active` — Arriendos activos del arrendatario (requiere JWT, rol TENANT)
- `GET /tracking/leases/:leaseId/status` — Estado e historial de un arriendo (requiere JWT, rol TENANT)
- `POST /tracking/leases/transition` — Transicionar estado de arriendo (requiere JWT)
- `GET /payments/history` — Historial de pagos del arrendatario (requiere JWT, rol TENANT)
- `POST /payments/initiate` — Iniciar pago (requiere JWT, rol TENANT)

## Diseño

- Mobile-first, responsive (1 col mobile, 2 col ≥768px)
- Tokens de diseño definidos en `tailwind.config.ts` (colores, tipografía, espaciado)
- Interfaz en idioma español
- Referencia visual en Figma: `https://www.figma.com/design/Yw53CFbVdMWVX7bQ6MFefk/properties_rental_platform_design`
