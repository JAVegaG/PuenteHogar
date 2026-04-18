# Frontend — Plataforma de Arriendo

Aplicación Next.js (App Router) con Tailwind CSS y TypeScript para la plataforma de arriendo de vivienda urbana. Incluye los módulos de exploración de inmuebles, autenticación/perfil de usuarios y portafolio del arrendador.

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
│   ├── page.tsx              # Redirect → /explorar
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
│   │   └── page.tsx          # Página de perfil (Client Component, protegida)
│   └── mi-portafolio/
│       ├── page.tsx              # Listado de unidades de portafolio (Client Component, LANDLORD)
│       ├── nueva-unidad/
│       │   └── page.tsx          # Crear nueva unidad (Client Component, LANDLORD)
│       └── [id]/
│           ├── page.tsx          # Detalle de unidad (Client Component, LANDLORD)
│           └── editar/
│               └── page.tsx      # Editar unidad (Client Component, LANDLORD)
├── modules/
│   ├── landlord-portfolio/
│   │   ├── components/
│   │   │   ├── LandlordRoute.tsx      # Protección auth + rol LANDLORD
│   │   │   ├── PortfolioList.tsx      # Lista vertical de tarjetas de unidades
│   │   │   ├── UnitCard.tsx           # Tarjeta individual de unidad de portafolio
│   │   │   ├── UnitDetailView.tsx     # Vista de detalle de unidad
│   │   │   └── UnitForm.tsx           # Formulario crear/editar (reutilizable)
│   │   ├── __tests__/
│   │   │   └── validation.test.ts
│   │   ├── types.ts                   # Interfaces: PortfolioUnit, CreatePortfolioUnitRequest, etc.
│   │   ├── utils.ts                   # formatPortfolioDate (wrapper de formatRelativeDate)
│   │   └── validation.ts             # Validación pura: propertyId, leaseBaseAmount, leaseBaseCurrency
│   ├── property-listings/
│   │   ├── components/
│   │   │   ├── ActionBar.tsx          # Barra de acciones (Filtros + Ordenar)
│   │   │   ├── FilterPanel.tsx        # Panel de filtros avanzados (Client Component)
│   │   │   ├── GalleryModal.tsx       # Modal fullscreen de imagen ampliada
│   │   │   ├── ListingCard.tsx        # Tarjeta de inmueble
│   │   │   ├── ListingDetailView.tsx  # Vista completa del detalle
│   │   │   ├── ListingGrid.tsx        # Cuadrícula responsive de tarjetas
│   │   │   ├── PhotoGallery.tsx       # Galería de fotos con navegación
│   │   │   ├── PropertyInfoGrid.tsx   # Grilla de habitaciones/baños/área
│   │   │   └── SortPanel.tsx          # Panel de ordenamiento (Client Component)
│   │   ├── hooks/
│   │   │   ├── useFilters.ts          # Gestión de filtros vía URL query params
│   │   │   └── useListings.ts         # Fetch con AbortController + loading state
│   │   └── types.ts                   # Interfaces: Listing, ListingDetail, ListingFilters, etc.
│   └── users/
│       ├── components/
│       │   ├── LoginForm.tsx          # Formulario de login con validación client-side
│       │   ├── ProfileCard.tsx        # Tarjeta de perfil (solo lectura) + logout
│       │   ├── ProtectedRoute.tsx     # Wrapper de protección de rutas autenticadas
│       │   ├── RegistrationWizard.tsx     # Orquestador del formulario multi-paso (3 pasos)
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
│   │   ├── EmptyState.tsx         # Estado vacío (sin resultados)
│   │   ├── ErrorState.tsx         # Estado de error con retry
│   │   ├── Header.tsx             # Encabezado fijo (hamburguesa + título)
│   │   ├── ListingCardSkeleton.tsx
│   │   ├── ListingDetailSkeleton.tsx
│   │   ├── ListingGridSkeleton.tsx
│   │   ├── Pagination.tsx         # Paginación con selector de items/página
│   │   ├── SideMenu.tsx           # Menú lateral (drawer 320px, auth-aware)
│   │   └── Skeleton.tsx           # Skeleton loader genérico
│   ├── hooks/
│   │   ├── useBodyScrollLock.ts   # Bloqueo de scroll para modales/drawers
│   │   └── useDebounce.ts        # Debounce genérico (default 400ms)
│   ├── services/
│   │   ├── api.ts                 # Servicio HTTP listings (fetchListings, fetchListingDetail)
│   │   ├── auth.ts               # Servicio HTTP auth (login, register, getProfile, getDocumentTypes)
│   │   └── portfolio.ts          # Servicio HTTP portafolio (getUnits, createUnit, updateUnit)
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
| `/` | Redirect | No | Redirect a `/explorar` |
| `/explorar` | Server Component | No | Listado de inmuebles con filtros, ordenamiento y paginación |
| `/explorar/[id]` | Server Component | No | Detalle del inmueble con galería de fotos |
| `/auth/login` | Client Component | No | Inicio de sesión (email + contraseña) |
| `/auth/registro` | Client Component | No | Registro multi-paso (rol, datos personales, credenciales) |
| `/mi-perfil` | Client Component | Sí | Perfil del usuario autenticado (solo lectura) |
| `/mi-portafolio` | Client Component | LANDLORD | Listado de unidades del portafolio del arrendador |
| `/mi-portafolio/nueva-unidad` | Client Component | LANDLORD | Crear nueva unidad de portafolio |
| `/mi-portafolio/[id]` | Client Component | LANDLORD | Detalle de unidad con info completa |
| `/mi-portafolio/[id]/editar` | Client Component | LANDLORD | Editar unidad de portafolio existente |

## Módulos

### property-listings

Exploración pública de inmuebles: listado con filtros avanzados (ciudad, barrio, tipo, precio, habitaciones, baños, área, fecha), ordenamiento, paginación y vista de detalle con galería de fotos.

### users

Autenticación y perfil de usuario: login con email/contraseña, registro multi-paso (3 pasos: tipo de usuario, datos personales, credenciales), perfil de solo lectura, gestión de sesión JWT (AuthProvider), protección de rutas y catálogo de tipos de documento desde el backend.

### landlord-portfolio

Portafolio del arrendador: listado de unidades de portafolio, creación y edición de unidades (canon base, moneda, condiciones), detalle de unidad, protección de rutas por rol LANDLORD (LandlordRoute), validación client-side de formularios y servicio de integración con API backend (PortfolioService).

## API Backend

El frontend consume los endpoints REST del backend NestJS:

- `GET /listings` — Listado paginado con filtros
- `GET /listings/:id` — Detalle completo del inmueble
- `POST /auth/login` — Inicio de sesión (retorna JWT)
- `POST /auth/register` — Registro de usuario
- `GET /auth/profile` — Perfil del usuario autenticado (requiere JWT)
- `GET /auth/document-types` — Catálogo de tipos de documento
- `GET /portfolio/units` — Listado de unidades del portafolio (requiere JWT, rol LANDLORD)
- `POST /portfolio/units` — Crear unidad de portafolio (requiere JWT, rol LANDLORD)
- `PATCH /portfolio/units/:id` — Actualizar unidad de portafolio (requiere JWT, rol LANDLORD)

## Diseño

- Mobile-first, responsive (1 col mobile, 2 col ≥768px)
- Tokens de diseño definidos en `tailwind.config.ts` (colores, tipografía, espaciado)
- Interfaz en idioma español
- Referencia visual en Figma: `https://www.figma.com/design/Yw53CFbVdMWVX7bQ6MFefk/properties_rental_platform_design`
