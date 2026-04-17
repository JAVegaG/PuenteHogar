# Frontend — Explorar Inmuebles

Aplicación Next.js (App Router) con Tailwind CSS y TypeScript para el módulo de exploración de inmuebles de la plataforma de arriendo.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Fuente Inter (400, 600, 700)

## Estructura del Proyecto

```
src/frontend/
├── app/
│   ├── layout.tsx            # Layout raíz (lang="es", Inter, metadatos)
│   ├── page.tsx              # Redirect → /explorar
│   ├── globals.css           # Estilos globales + Tailwind
│   └── explorar/
│       ├── page.tsx          # Página de listado (Server Component)
│       └── [id]/
│           └── page.tsx      # Página de detalle (Server Component)
├── modules/
│   └── property-listings/
│       ├── components/
│       │   ├── ActionBar.tsx          # Barra de acciones (Filtros + Ordenar)
│       │   ├── FilterPanel.tsx        # Panel de filtros avanzados (Client Component)
│       │   ├── GalleryModal.tsx       # Modal fullscreen de imagen ampliada
│       │   ├── ListingCard.tsx        # Tarjeta de inmueble
│       │   ├── ListingDetailView.tsx  # Vista completa del detalle
│       │   ├── ListingGrid.tsx        # Cuadrícula responsive de tarjetas
│       │   ├── PhotoGallery.tsx       # Galería de fotos con navegación
│       │   ├── PropertyInfoGrid.tsx   # Grilla de habitaciones/baños/área
│       │   └── SortPanel.tsx          # Panel de ordenamiento (Client Component)
│       ├── hooks/
│       │   ├── useFilters.ts          # Gestión de filtros vía URL query params
│       │   └── useListings.ts         # Fetch con AbortController + loading state
│       └── types.ts                   # Interfaces: Listing, ListingDetail, ListingFilters, etc.
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
│   │   ├── SideMenu.tsx           # Menú lateral (drawer 320px)
│   │   └── Skeleton.tsx           # Skeleton loader genérico
│   ├── hooks/
│   │   ├── useBodyScrollLock.ts   # Bloqueo de scroll para modales/drawers
│   │   └── useDebounce.ts        # Debounce genérico (default 400ms)
│   ├── services/
│   │   └── api.ts                 # Capa de servicio HTTP (fetchListings, fetchListingDetail)
│   └── utils/
│       ├── formatPrice.ts         # Formato COP ($X.XXX.XXX)
│       └── formatRelativeDate.ts  # Fecha relativa en español
├── .env.local
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
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

| Ruta | Descripción |
|------|-------------|
| `/` | Redirect a `/explorar` |
| `/explorar` | Listado de inmuebles con filtros, ordenamiento y paginación |
| `/explorar/[id]` | Detalle del inmueble con galería de fotos y modal de imagen ampliada |

## API Backend

El frontend consume los endpoints REST del backend NestJS:

- `GET /listings` — Listado paginado con filtros (city, neighborhood, propertyType, priceMin/Max, rooms, bathrooms, areaMin/Max, publishedWithin, sortBy, sortOrder, page, pageSize)
- `GET /listings/:id` — Detalle completo del inmueble

## Diseño

- Mobile-first, responsive (1 col mobile, 2 col ≥768px)
- Tokens de diseño definidos en `tailwind.config.ts` (colores, tipografía, espaciado)
- Referencia visual en Figma: `https://www.figma.com/design/Yw53CFbVdMWVX7bQ6MFefk/properties_rental_platform_design`
