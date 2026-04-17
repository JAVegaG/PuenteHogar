# Frontend — Plataforma de Arriendo

Aplicación Next.js (App Router) con Tailwind CSS y TypeScript para la plataforma de arriendo de vivienda urbana. Incluye los módulos de exploración de inmuebles y autenticación/perfil de usuarios.

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
│   └── mi-perfil/
│       └── page.tsx          # Página de perfil (Client Component, protegida)
├── modules/
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
│   │   └── auth.ts               # Servicio HTTP auth (login, register, getProfile, getDocumentTypes)
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

## Módulos

### property-listings

Exploración pública de inmuebles: listado con filtros avanzados (ciudad, barrio, tipo, precio, habitaciones, baños, área, fecha), ordenamiento, paginación y vista de detalle con galería de fotos.

### users

Autenticación y perfil de usuario: login con email/contraseña, registro multi-paso (3 pasos: tipo de usuario, datos personales, credenciales), perfil de solo lectura, gestión de sesión JWT (AuthProvider), protección de rutas y catálogo de tipos de documento desde el backend.

## API Backend

El frontend consume los endpoints REST del backend NestJS:

- `GET /listings` — Listado paginado con filtros
- `GET /listings/:id` — Detalle completo del inmueble
- `POST /auth/login` — Inicio de sesión (retorna JWT)
- `POST /auth/register` — Registro de usuario
- `GET /auth/profile` — Perfil del usuario autenticado (requiere JWT)
- `GET /auth/document-types` — Catálogo de tipos de documento

## Diseño

- Mobile-first, responsive (1 col mobile, 2 col ≥768px)
- Tokens de diseño definidos en `tailwind.config.ts` (colores, tipografía, espaciado)
- Interfaz en idioma español
- Referencia visual en Figma: `https://www.figma.com/design/Yw53CFbVdMWVX7bQ6MFefk/properties_rental_platform_design`
