# Plan de Implementación: Explorar Inmuebles (Frontend + Backend)

## Visión General

Implementación del módulo "Explorar Inmuebles" que cubre: extensión del endpoint backend `GET /listings` con filtros avanzados, ordenamiento y paginación; inicialización del proyecto Next.js en `src/frontend/`; componentes compartidos y del módulo property-listings; páginas de exploración y detalle; e integración final.

El orden de implementación es: (1) cambios backend, (2) inicialización frontend, (3) componentes compartidos y utilidades, (4) componentes del módulo, (5) páginas, (6) integración y pulido.

## Tareas

- [x] 1. Ampliar el endpoint backend `GET /listings` con filtros, ordenamiento y paginación
  - **Nota:** Cada modificación al backend debe ser revisada/aprobada antes de implementarse.

  - [x] 1.1 Actualizar `ListingFiltersDto` con nuevos parámetros de filtrado, ordenamiento y paginación
    - Agregar campos: `propertyType`, `priceMin`, `priceMax`, `rooms`, `bathrooms`, `areaMin`, `areaMax`, `publishedWithin`, `sortBy`, `sortOrder`, `page`, `pageSize`
    - Incluir decoradores `@IsOptional`, `@IsString`, `@IsNumber`, `@IsIn`, `@Type(() => Number)` y `@ApiPropertyOptional` en cada campo
    - Archivo: `src/backend/modules/property-listings/application/dtos/listing-filters.dto.ts`
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.8_

  - [x] 1.2 Crear DTO `PaginatedListingsResponseDto` y enriquecer `ListingResponseDto`
    - Agregar campos `numberOfRooms`, `numberOfBathrooms`, `propertyType`, `neighborhood` a `ListingResponseDto`
    - Crear `PaginatedListingsResponseDto` con `data: ListingResponseDto[]`, `total`, `page`, `pageSize`
    - Archivos: `src/backend/modules/property-listings/application/dtos/listing-response.dto.ts`, nuevo `paginated-listings-response.dto.ts`
    - _Requisitos: 6.5, 6.6, 6.7_

  - [x] 1.3 Actualizar la interfaz `IListingRepository` y el port `ListingFilters`
    - Extender `ListingFilters` con los nuevos campos de filtrado, ordenamiento y paginación
    - Actualizar la firma de `findPublished` para retornar `{ data: ListingEntity[], total: number }` con datos enriquecidos de `Property` y `Address`
    - Archivo: `src/backend/modules/property-listings/domain/ports/listing-repository.port.ts`
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 1.4 Implementar filtros avanzados, ordenamiento, paginación y datos enriquecidos en `PrismaListingRepository.findPublished`
    - Resolver `Property` y `Address` para cada listing vía `PortfolioUnit` (patrón cross-schema existente)
    - Aplicar filtros: `propertyType`, `priceMin`/`priceMax`, `rooms`, `bathrooms`, `areaMin`/`areaMax` (length × width), `publishedWithin` sobre `listing_date`
    - Aplicar ordenamiento por `date` o `price` con dirección `asc`/`desc`
    - Aplicar paginación con `skip`/`take` basado en `page`/`pageSize`
    - Retornar `{ data, total }` en lugar de arreglo plano, incluyendo `numberOfRooms`, `numberOfBathrooms`, `propertyType`, `neighborhood`
    - Archivo: `src/backend/modules/property-listings/infrastructure/repositories/prisma-listing.repository.ts`
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 1.5 Actualizar `SearchListingsUseCase` y controlador para respuesta paginada enriquecida
    - Modificar `SearchListingsUseCase.execute` para retornar `PaginatedListingsResponseDto` en lugar de `ListingResponseDto[]`
    - Mapear los nuevos campos (`numberOfRooms`, `numberOfBathrooms`, `propertyType`, `neighborhood`) en `toResponseDto`
    - Actualizar el controlador `search()` para usar el tipo de respuesta paginada y documentar con `@ApiOkResponse({ type: PaginatedListingsResponseDto })`
    - Archivos: `src/backend/modules/property-listings/application/use-cases/search-listings.use-case.ts`, `src/backend/modules/property-listings/property-listings.controller.ts`
    - _Requisitos: 6.5, 6.6, 6.7_


  - [ ]* 1.6 Escribir tests de propiedad para filtros válidos del backend
    - **Propiedad 11: Backend acepta filtros válidos**
    - Generar combinaciones aleatorias de `ListingFiltersDto` válidos con fast-check y verificar que el use case no lanza errores de validación
    - **Valida: Requisitos 6.1, 6.2, 6.8**

  - [ ]* 1.7 Escribir tests de propiedad para ordenamiento del backend
    - **Propiedad 12: Ordenamiento correcto en backend**
    - Generar listas de listings y verificar que el resultado está ordenado según `sortBy` y `sortOrder`
    - **Valida: Requisito 6.3**

  - [ ]* 1.8 Escribir tests de propiedad para paginación del backend
    - **Propiedad 13: Paginación correcta en backend**
    - Generar `page`/`pageSize` válidos y verificar: longitud de `data` ≤ `pageSize`, `total` correcto, fórmula `min(pageSize, total - (page-1)*pageSize)`
    - **Valida: Requisitos 6.4, 6.5**

  - [ ]* 1.9 Escribir tests de propiedad para respuesta enriquecida del backend
    - **Propiedad 14: Respuesta enriquecida del backend**
    - Generar listings vinculados a properties y verificar que `numberOfRooms`, `numberOfBathrooms`, `propertyType`, `neighborhood` reflejan los datos de `Property` y `Address`
    - **Valida: Requisitos 6.6, 6.7**

- [x] 2. Checkpoint — Verificar cambios backend
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.
  - Confirmar que `GET /listings` retorna la estructura paginada enriquecida correctamente.

- [x] 3. Inicializar proyecto Next.js y configurar sistema de diseño
  - [x] 3.1 Inicializar proyecto Next.js con App Router, TypeScript y Tailwind CSS en `src/frontend/`
    - Ejecutar inicialización de Next.js con App Router habilitado
    - Configurar `tsconfig.json` con path aliases
    - Crear `.env.local` con `NEXT_PUBLIC_API_URL`
    - Crear `next.config.ts` básico
    - _Requisitos: 1.1, 1.5_

  - [x] 3.2 Configurar `tailwind.config.ts` con tokens del sistema de diseño
    - Definir paleta de colores: primario `#1d4ed8`, neutrales (`#111827`, `#4b5563`, `#d1d5db`, `#f3f4f6`, `#f9fafb`)
    - Definir escala tipográfica: h1 (32px Bold), h2 (24px Bold), h3 (20px SemiBold), body (16px Regular), caption (14px Regular), small (12px Regular)
    - Definir espaciado: `mobile-margin` (16px), `desktop-margin` (52px), `section-gap` (24px), `element-gap` (12px)
    - Definir `borderRadius` (card: 6px, badge: 4px) y `boxShadow` (card)
    - Configurar fuente Inter como `fontFamily.sans`
    - _Requisitos: 1.2, 9.1, 9.2, 9.4, 9.5_

  - [x] 3.3 Crear layout raíz (`app/layout.tsx`) con fuente Inter, idioma español y metadatos
    - Configurar `<html lang="es">` con fuente Inter de `next/font/google` (pesos 400, 600, 700)
    - Aplicar estructura HTML semántica (`<main>`, etc.)
    - Incluir metadatos básicos de la plataforma
    - _Requisitos: 1.3, 1.4, 8.1, 9.6, 9.8_

  - [x] 3.4 Crear `app/page.tsx` con redirect a `/explorar`
    - Implementar redirect desde la raíz a `/explorar`
    - _Requisito: 2.1_

- [x] 4. Implementar componentes compartidos y utilidades
  - [x] 4.1 Crear interfaces TypeScript del módulo property-listings (`types.ts`)
    - Definir: `Photo`, `Listing`, `ListingAddress`, `ListingDetail`, `ListingFilters`, `PaginatedListings`
    - Archivo: `src/frontend/modules/property-listings/types.ts`
    - _Requisitos: 7.3, 7.4, 7.5_

  - [x] 4.2 Implementar capa de servicio API (`shared/services/api.ts`)
    - Implementar `fetchListings(filters, signal?)` que construye query params y retorna `PaginatedListings`
    - Implementar `fetchListingDetail(id, signal?)` que retorna `ListingDetail`
    - Usar `fetch` nativo con soporte para `AbortSignal`
    - Usar `NEXT_PUBLIC_API_URL` como URL base con fallback a `http://localhost:3001` en desarrollo
    - Propagar errores con código de status HTTP en el mensaje
    - _Requisitos: 7.1, 7.2, 7.6, 7.7_


  - [ ]* 4.3 Escribir tests de propiedad para mapeo de filtros a parámetros de API
    - **Propiedad 2: Mapeo de filtros a parámetros de API**
    - Generar objetos `ListingFilters` aleatorios y verificar que la URL construida contiene exactamente los parámetros con valores definidos
    - **Valida: Requisito 3.12**

  - [ ]* 4.4 Escribir tests de propiedad para propagación de errores del Servicio_API
    - **Propiedad 15: Propagación de errores en Servicio_API**
    - Generar status codes HTTP entre 400-599 y verificar que `fetchListings` y `fetchListingDetail` lanzan errores con el código en el mensaje
    - **Valida: Requisito 7.6**

  - [x] 4.5 Implementar utilidades de formateo: `formatPrice` y `formatRelativeDate`
    - `formatPrice`: Formatear número como COP con separador de miles punto (ej. "$4.200.000")
    - `formatRelativeDate`: Convertir fecha ISO a texto relativo en español ("Publicado hace X días/semanas/meses")
    - Archivos: `src/frontend/shared/utils/formatPrice.ts`, `src/frontend/shared/utils/formatRelativeDate.ts`
    - _Requisitos: 4.4, 4.6, 5.5_

  - [ ]* 4.6 Escribir tests de propiedad para formato de precio COP
    - **Propiedad 7: Formato de precio en COP**
    - Generar números no negativos con `fc.nat()` y verificar: comienza con "$", usa puntos como separadores de miles, no tiene decimales, round-trip de dígitos produce el número original
    - **Valida: Requisitos 4.4, 5.5**

  - [ ]* 4.7 Escribir tests de propiedad para fecha relativa en español
    - **Propiedad 8: Fecha relativa en español**
    - Generar fechas en el pasado (1 min a 365 días) y verificar: cadena no vacía, comienza con "Publicado hace", contiene unidad de tiempo válida en español
    - **Valida: Requisito 4.6**

  - [x] 4.8 Implementar hook `useDebounce`
    - Hook genérico que retorna un valor debounced después de un delay configurable (default 400ms)
    - Archivo: `src/frontend/shared/hooks/useDebounce.ts`
    - _Requisitos: Control de llamadas API (decisión de diseño)_

  - [ ]* 4.9 Escribir tests de propiedad para debounce
    - **Propiedad 17: Debounce suprime llamadas intermedias**
    - Generar secuencias de N cambios de valor (N ≥ 2) dentro de un intervalo menor al delay y verificar con fake timers que solo el último valor se propaga
    - **Valida: Control de llamadas API**

  - [x] 4.10 Implementar hook `useBodyScrollLock`
    - Bloquear/desbloquear scroll del body cuando hay modal o drawer abierto
    - Archivo: `src/frontend/shared/hooks/useBodyScrollLock.ts`
    - _Requisitos: 5.4, 11.1_

  - [x] 4.11 Implementar componentes compartidos de UI base
    - `Button`: Botón reutilizable con variantes primary (fondo `#1d4ed8`, texto blanco, h-56px) y secondary (fondo blanco, borde `#d1d5db`, texto `#111827`, h-58px), border-radius 6px, ancho completo
    - `Skeleton`: Componente genérico de skeleton loader con `animate-pulse` (rectángulo, círculo, líneas de texto)
    - `EmptyState`: Mensaje de estado vacío con texto en español y sugerencia de ajustar filtros
    - `ErrorState`: Mensaje de error con botón "Reintentar"
    - Archivos en: `src/frontend/shared/components/`
    - _Requisitos: 2.4, 2.5, 3.10, 3.11, 8.2, 8.7_

- [x] 5. Checkpoint — Verificar utilidades y componentes base
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [ ] 6. Implementar componentes del módulo property-listings
  - [x] 6.1 Implementar `Header` y `SideMenu` (menú lateral)
    - `Header`: Encabezado fijo con borde inferior, botón hamburguesa a la izquierda, título centrado (H1 32px Bold `#111827`)
    - `SideMenu`: Drawer 320px desde la izquierda con animación de deslizamiento. Encabezado "Menú" (24px Bold) + botón cierre (X). Si autenticado: avatar, nombre, rol + enlaces completos. Si anónimo: "Explorar inmuebles" + opciones login/registro. Cierra con click fuera o botón X. Usar `React.lazy` + `Suspense` para carga diferida
    - Usar `useBodyScrollLock` cuando el menú esté abierto
    - Archivos: `src/frontend/shared/components/Header.tsx`, `src/frontend/shared/components/SideMenu.tsx`
    - _Requisitos: 2.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_


  - [x] 6.2 Implementar `ListingCard` (tarjeta de inmueble)
    - Contenedor con borde `#d1d5db`, border-radius 6px, sombra `0px 1px 2px rgba(0,0,0,0.05)`, fondo blanco
    - Foto principal con `next/image` (isMain: true, o primera foto, o placeholder si no hay fotos)
    - Título "Tipo · Barrio" (H2 24px Bold `#111827`), precio COP (H3 20px SemiBold `#1d4ed8`), badges habitaciones/baños (fondo `#f3f4f6`, caption 14px), fecha relativa
    - Enlace a `/explorar/[id]`, `<article>` semántico, área táctil mínima 44×44px
    - Archivo: `src/frontend/modules/property-listings/components/ListingCard.tsx`
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 8.2, 8.3_

  - [ ]* 6.3 Escribir tests de propiedad para selección de foto principal
    - **Propiedad 5: Selección de foto principal en tarjeta**
    - Generar arreglos de fotos con `fc.array(photoArb)` y verificar: si existe foto con `isMain === true` se selecciona, sino la primera del arreglo
    - **Valida: Requisito 4.2**

  - [ ]* 6.4 Escribir tests de propiedad para formato de título "Tipo · Barrio"
    - **Propiedad 6: Formato de título "Tipo · Barrio"**
    - Generar pares de strings opcionales para `propertyType` y `neighborhood` y verificar: ambos no nulos → separados por " · "; uno nulo → solo el disponible sin separador
    - **Valida: Requisito 4.3**

  - [ ]* 6.5 Escribir tests de propiedad para atributos derivados de la tarjeta
    - **Propiedad 9: Atributos derivados de la tarjeta**
    - Generar `id` (UUID) y `title` (string no vacío) y verificar: href === `/explorar/${id}`, alt contiene el title
    - **Valida: Requisitos 4.7, 4.8**

  - [x] 6.6 Implementar componentes skeleton: `ListingCardSkeleton`, `ListingGridSkeleton`, `ListingDetailSkeleton`
    - `ListingCardSkeleton`: Réplica de la estructura de `ListingCard` con bloques `animate-pulse`
    - `ListingGridSkeleton`: Grid responsive de skeletons (6 en desktop, 3 en mobile)
    - `ListingDetailSkeleton`: Réplica de la página de detalle con bloques animados
    - Archivos en: `src/frontend/shared/components/`
    - _Requisitos: 2.3, 8.7_

  - [x] 6.7 Implementar `ListingGrid` (cuadrícula de tarjetas)
    - Grid responsive: 1 columna en mobile (< 768px), 2 columnas en ≥ 768px, gap 16px
    - Renderiza `ListingCard` por cada listing del arreglo
    - Archivo: `src/frontend/modules/property-listings/components/ListingGrid.tsx`
    - _Requisitos: 2.1, 2.6, 9.3_

  - [x] 6.8 Implementar `Pagination` (componente de paginación)
    - Texto "Mostrando X a Y de Z resultados", selector de items por página, botones anterior/siguiente y números de página
    - Archivo: `src/frontend/shared/components/Pagination.tsx`
    - _Requisito: 2.9_

  - [x] 6.9 Implementar hook `useFilters` para gestión de filtros vía URL
    - Leer/escribir query params con `useSearchParams` y `useRouter` de Next.js
    - Exponer: `filters`, `setFilter`, `clearFilters`, `setSort`, `setPage`, `setPageSize`
    - Archivo: `src/frontend/modules/property-listings/hooks/useFilters.ts`
    - _Requisitos: 3.12, 3.13_

  - [ ]* 6.10 Escribir tests de propiedad para round-trip de filtros en URL
    - **Propiedad 1: Round-trip de filtros en URL**
    - Generar objetos `ListingFilters` válidos con `fc.record()`, serializar como query params, parsear de vuelta y verificar equivalencia
    - **Valida: Requisito 3.13**

  - [ ]* 6.11 Escribir tests de propiedad para limpiar filtros
    - **Propiedad 3: Limpiar filtros restablece al estado inicial**
    - Generar filtros con uno o más valores definidos, ejecutar `clearFilters` y verificar que todos los campos son `undefined`
    - **Valida: Requisito 3.11**

  - [~] 6.12 Implementar `FilterPanel` (panel de filtros avanzados)
    - Client Component (`'use client'`), cargado con `React.lazy` + `Suspense`
    - Vista fullscreen en mobile con encabezado "Filtros" (32px Bold) y botón de retorno
    - Campos: ciudad (dropdown), barrio (dropdown, deshabilitado sin ciudad con texto "Primero selecciona una ciudad"), fecha publicación (dropdown), tipo propiedad (dropdown), precio min/max (inputs numéricos con `useDebounce`), habitaciones (dropdown), baños (dropdown), área min/max (inputs numéricos con `useDebounce`)
    - Estado local que acumula cambios sin disparar API. Botón "Aplicar filtros" (primary) actualiza URL query params. Botón "Limpiar filtros" (secondary) resetea todo
    - Estilos: dropdowns con fondo `#f9fafb`, borde `#d1d5db`, border-radius 6px. Inputs de precio fondo blanco. Inputs de área fondo `#f9fafb`
    - Etiquetas `<label>` asociadas programáticamente a cada campo (`htmlFor` o `aria-label`)
    - Archivo: `src/frontend/modules/property-listings/components/FilterPanel.tsx`
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 8.4_

  - [ ]* 6.13 Escribir tests de propiedad para selector de barrio deshabilitado sin ciudad
    - **Propiedad 4: Selector de barrio deshabilitado sin ciudad**
    - Generar valores opcionales de `city` y verificar: city undefined/vacío → barrio deshabilitado; city con valor → barrio habilitado
    - **Valida: Requisito 3.3**

  - [ ]* 6.14 Escribir tests de propiedad para filtros no disparan API sin acción explícita
    - **Propiedad 19: Filtros no disparan API sin acción explícita**
    - Generar secuencias de cambios en campos del FilterPanel sin presionar "Aplicar filtros" y verificar que el número de llamadas HTTP es cero
    - **Valida: Control de llamadas API**

  - [~] 6.15 Implementar `SortPanel` (panel de ordenamiento)
    - Client Component con vista fullscreen, encabezado "Ordenar" (32px Bold) y botón de retorno
    - 4 opciones radio: "Más recientes primero", "Más antiguos primero", "Precio: menor a mayor", "Precio: mayor a menor" — cada una con título (20px SemiBold) y descripción (14px Regular `#4b5563`)
    - Check visual (color `#1d4ed8`) en opción seleccionada
    - Botón "Aplicar ordenamiento" (primary)
    - Archivo: `src/frontend/modules/property-listings/components/SortPanel.tsx`
    - _Requisitos: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 6.16 Escribir tests de propiedad para texto del botón de ordenamiento
    - **Propiedad 16: Texto del botón de ordenamiento refleja selección**
    - Generar opciones de ordenamiento con `fc.constantFrom(...)` y verificar que el texto del botón coincide con la etiqueta de la opción seleccionada
    - **Valida: Requisito 10.5**

  - [~] 6.17 Implementar `ActionBar` (barra de acciones: Filtros + Ordenar)
    - Barra debajo del encabezado con dos botones: "Filtros" (con icono) y botón de ordenamiento cuyo texto refleja la opción seleccionada (default "Más recientes")
    - Controla apertura/cierre de `FilterPanel` y `SortPanel`
    - Archivo: `src/frontend/modules/property-listings/components/ActionBar.tsx`
    - _Requisitos: 2.8, 10.5_

- [ ] 7. Checkpoint — Verificar componentes del módulo
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [ ] 8. Implementar hook `useListings` con AbortController
  - Implementar hook que gestiona fetch de listings con `AbortController` para cancelar requests en vuelo
  - Estados: `data` (`PaginatedListings | null`), `isLoading` (boolean), `error` (`Error | null`), `retry` (función)
  - Cancelar request anterior con `controller.abort()` cuando los filtros cambian antes de que la respuesta llegue
  - Ignorar errores `AbortError` y no actualizar estado si `signal.aborted`
  - Archivo: `src/frontend/modules/property-listings/hooks/useListings.ts`
  - _Requisitos: 7.1, 7.7, Control de llamadas API_

  - [ ]* 8.1 Escribir tests de propiedad para AbortController
    - **Propiedad 18: AbortController cancela requests previos**
    - Generar secuencias de dos invocaciones consecutivas con filtros distintos y verificar que el AbortController de la primera es abortado antes de iniciar la segunda
    - **Valida: Control de llamadas API**


- [ ] 9. Implementar página de exploración (`/explorar`)
  - [~] 9.1 Crear `app/explorar/page.tsx` como Server Component
    - Leer query params de la URL (filtros, ordenamiento, paginación)
    - Llamar a `fetchListings` con los parámetros del URL desde el servidor
    - Renderizar `ActionBar`, `ListingGrid` (o `ListingGridSkeleton` / `EmptyState` / `ErrorState` según estado), `Pagination`
    - Layout: 1 columna en mobile, 2 columnas en ≥ 768px, márgenes laterales 16px mobile / 52px desktop
    - Usar `<Suspense>` con `ListingGridSkeleton` como fallback para carga de datos
    - Accesible sin autenticación
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 9.1, 9.3, 9.7_

  - [ ]* 9.2 Escribir tests unitarios para la página de exploración
    - Verificar renderizado con datos mock, estado vacío, estado de error con retry
    - Verificar accesibilidad: estructura semántica, atributos ARIA (`aria-live`, `aria-busy`)
    - _Requisitos: 2.1, 2.3, 2.4, 2.5, 8.1, 8.7_

- [ ] 10. Implementar componentes de detalle del inmueble
  - [~] 10.1 Implementar `PhotoGallery` (galería de fotos con navegación)
    - Client Component con imagen principal ocupando ancho completo (márgenes 52px en desktop)
    - Botones de navegación izquierda/derecha (36×36px, fondo semitransparente) superpuestos sobre la imagen
    - Indicador de posición "X / Y" con fondo semitransparente
    - Puntos de navegación debajo de la imagen
    - Click en imagen abre `GalleryModal`
    - Archivo: `src/frontend/modules/property-listings/components/PhotoGallery.tsx`
    - _Requisitos: 5.3, 8.3_

  - [ ]* 10.2 Escribir tests de propiedad para indicador de posición de la galería
    - **Propiedad 10: Indicador de posición de la galería**
    - Generar N (≥ 1) e I (1 ≤ I ≤ N) y verificar que el indicador muestra "I / N"
    - **Valida: Requisito 5.3**

  - [~] 10.3 Implementar `GalleryModal` (modal de imagen ampliada)
    - Client Component cargado con `React.lazy` + `Suspense`
    - Fullscreen con imagen ampliada, navegación izquierda/derecha (48×48px), miniaturas en la parte inferior, indicador "X / Y", botón cierre (X)
    - Cierra con tecla Escape y con click en botón X
    - Bloquea scroll del body con `useBodyScrollLock`
    - Archivo: `src/frontend/modules/property-listings/components/GalleryModal.tsx`
    - _Requisitos: 5.4, 8.6_

  - [~] 10.4 Implementar `PropertyInfoGrid` (grilla de habitaciones/baños/área)
    - Grilla de 3 columnas con tarjetas (fondo `#f3f4f6`, border-radius 6px, padding 12px)
    - Cada tarjeta: icono centrado, valor (16px Regular), etiqueta (12px Regular `#4b5563`)
    - Campos: Habitaciones, Baños, Área (m²)
    - Archivo: `src/frontend/modules/property-listings/components/PropertyInfoGrid.tsx`
    - _Requisito: 5.6_

  - [~] 10.5 Implementar `ListingDetailView` (vista completa del detalle)
    - Precio "$X/mes" (H2 24px Bold `#1d4ed8`), título (H3 20px SemiBold `#111827`)
    - `PropertyInfoGrid` para habitaciones/baños/área
    - Sección "Descripción" (H3 + texto 16px Regular `#4b5563`)
    - Sección "Características" con badges en grilla 2 columnas (fondo `#f3f4f6`, border-radius 4px)
    - Sección "Ubicación" con icono + dirección (16px Regular `#4b5563`)
    - Botón "Contactar arrendador" (primary, redirecciona a ruta placeholder por ahora)
    - Archivo: `src/frontend/modules/property-listings/components/ListingDetailView.tsx`
    - _Requisitos: 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

- [ ] 11. Implementar página de detalle (`/explorar/[id]`)
  - [~] 11.1 Crear `app/explorar/[id]/page.tsx` como Server Component
    - Llamar a `fetchListingDetail(id)` desde el servidor
    - Renderizar encabezado fijo con botón de retorno y título "Detalle del inmueble" (32px Bold `#111827`)
    - Renderizar `PhotoGallery` + `ListingDetailView` (o `ListingDetailSkeleton` / error state según estado)
    - Manejar error 404: mensaje "Este inmueble no fue encontrado" con enlace "Volver a explorar" → `/explorar`
    - Manejar errores de red/5xx: `ErrorState` con botón "Reintentar"
    - Accesible sin autenticación, usar `<Suspense>` con `ListingDetailSkeleton` como fallback
    - _Requisitos: 5.1, 5.2, 5.11, 5.12, 5.13_

  - [ ]* 11.2 Escribir tests unitarios para la página de detalle
    - Verificar renderizado con datos mock, error 404, error de red con retry
    - Verificar accesibilidad: estructura semántica, atributos ARIA
    - _Requisitos: 5.1, 5.11, 5.12, 8.1, 8.7_

- [ ] 12. Checkpoint — Verificar páginas completas
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.
  - Verificar que la navegación entre listado y detalle funciona correctamente.

- [ ] 13. Integración, accesibilidad y pulido final
  - [~] 13.1 Integrar Header con SideMenu en el layout raíz
    - Cablear el Header en `app/layout.tsx` con apertura/cierre del SideMenu
    - Verificar que el botón hamburguesa abre el menú y el título se muestra centrado en ambas páginas
    - _Requisitos: 2.7, 11.1_

  - [~] 13.2 Verificar accesibilidad en todos los componentes
    - Elementos HTML semánticos (`main`, `nav`, `article`, `section`, `header`, `h1`-`h6`)
    - Áreas táctiles mínimas 44×44px en botones y enlaces
    - Atributos `alt` descriptivos en español en todas las imágenes
    - Labels asociados programáticamente en campos de formulario
    - Contraste mínimo 4.5:1 texto/fondo (verificar paleta del Sistema_Diseño)
    - Navegación por teclado funcional con indicadores de foco visibles
    - Atributos ARIA (`aria-live`, `aria-busy`, `role`) en estados dinámicos (carga, error)
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [~] 13.3 Verificar responsividad y sistema de diseño
    - Márgenes laterales: 16px mobile, 52px desktop
    - Grid de tarjetas: 1 columna mobile, 2 columnas ≥ 768px
    - Escala tipográfica aplicada correctamente
    - Todos los textos en idioma español
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 13.4 Escribir tests de integración end-to-end
    - Verificar que query params de la URL se propagan al Servicio_API correctamente
    - Verificar flujo completo: listado → filtros → aplicar → resultados actualizados → click tarjeta → detalle → volver
    - _Requisitos: 2.1, 3.12, 3.13, 5.1_

- [ ] 14. Checkpoint final — Verificar implementación completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.
  - Confirmar que todas las páginas, componentes y la integración con el backend funcionan correctamente.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia requisitos específicos del documento de requisitos para trazabilidad.
- Los checkpoints permiten validación incremental del progreso.
- Los tests de propiedades validan propiedades universales de correctitud definidas en el documento de diseño.
- Los tests unitarios validan escenarios específicos y edge cases.
- Las modificaciones al backend (tareas del grupo 1) deben ser consultadas y aprobadas antes de implementarse.
