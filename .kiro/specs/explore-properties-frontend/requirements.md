# Documento de Requisitos

## Introducción

Este documento especifica los requisitos para la implementación del frontend de la pantalla "Explorar Inmuebles" de la plataforma de gestión de arriendo de vivienda urbana en Colombia (Valle del Cauca). La pantalla permite a usuarios anónimos y autenticados explorar la oferta de inmuebles publicados, aplicar filtros de búsqueda y acceder al detalle de cada inmueble.

El frontend se implementa como una aplicación Next.js (App Router) con Tailwind CSS y TypeScript, siguiendo un enfoque mobile-first y cumpliendo con los criterios de accesibilidad WCAG 2.1 AA. La interfaz se presenta en idioma español y consume los endpoints REST del backend NestJS existente (`GET /listings`, `GET /listings/:id`).

El alcance cubre: inicialización del proyecto Next.js, página de listado con búsqueda y filtros avanzados (ciudad, barrio, fecha de publicación, tipo de propiedad, precio, habitaciones, baños, área), ordenamiento de resultados, paginación, página de detalle del inmueble con galería de fotos y modal de imagen ampliada, tarjetas de inmueble con foto y datos clave, menú lateral de navegación, integración con la API backend, sistema de diseño base (colores, tipografía, espaciado) y cumplimiento de accesibilidad.

El diseño visual de referencia se encuentra en Figma: `https://www.figma.com/design/Yw53CFbVdMWVX7bQ6MFefk/properties_rental_platform_design`

**Fuera de alcance de este spec:** Las pantallas de autenticación (login, registro), perfil de usuario, gestión de portafolio del arrendador, contratos, pagos, contabilidad y demás secciones visibles en el Figma serán implementadas en specs separados. El botón "Contactar arrendador" en la Página_Detalle y los enlaces del Menú_Lateral que requieren autenticación se implementarán como enlaces/botones que redirigen a rutas placeholder (ej. `/auth/login`) hasta que los specs correspondientes sean implementados.

---

## Glosario

- **App_Frontend**: La aplicación Next.js (App Router) que implementa la interfaz de usuario del módulo de exploración de inmuebles.
- **Página_Explorar**: Página principal de exploración que muestra el listado de inmuebles publicados con capacidad de búsqueda y filtrado.
- **Página_Detalle**: Página que muestra la información completa de un inmueble específico.
- **Tarjeta_Inmueble**: Componente visual que representa un inmueble en el listado, mostrando foto principal, precio, título, número de habitaciones, número de baños y fecha relativa de publicación.
- **Panel_Filtros**: Panel de filtros avanzados accesible desde un botón "Filtros" en la barra superior, que incluye: ciudad, zona/barrio (dependiente de ciudad), fecha de publicación, tipo de propiedad, precio mensual (mínimo/máximo), número de habitaciones, número de baños y área en m² (mínimo/máximo). Incluye botones "Aplicar filtros" y "Limpiar filtros".
- **Panel_Ordenamiento**: Panel de ordenamiento accesible desde un botón "Más recientes" en la barra superior, con opciones: más recientes primero, más antiguos primero, precio menor a mayor, precio mayor a menor.
- **Paginación**: Componente de paginación que muestra el rango de resultados, permite cambiar la cantidad de items por página y navegar entre páginas.
- **Galería_Fotos**: Componente de galería de imágenes en la Página_Detalle con navegación izquierda/derecha, indicador de posición (ej. "1 / 3") y puntos de navegación.
- **Modal_Galería**: Modal de pantalla completa para visualizar fotos ampliadas del inmueble, con navegación entre imágenes, miniaturas y botón de cierre.
- **Menú_Lateral**: Menú de navegación lateral (drawer) con información del usuario autenticado y enlaces a las secciones principales: Explorar inmuebles, Mis arriendos, Mis ingresos, Mis contratos, Mi perfil y Cerrar sesión.
- **API_Backend**: El servidor NestJS que expone los endpoints REST `/listings` y `/listings/:id`.
- **Servicio_API**: Capa de abstracción en el frontend que encapsula las llamadas HTTP al API_Backend.
- **Sistema_Diseño**: Conjunto de tokens de diseño (colores, tipografía, espaciado) y componentes reutilizables que garantizan consistencia visual.
- **Usuario_Anónimo**: Persona que navega la plataforma sin autenticación.
- **Usuario_Autenticado**: Persona que ha iniciado sesión en la plataforma.
- **Listing**: Publicación de un inmueble en estado activo, retornada por el API_Backend.
- **ListingDetail**: Información completa de un inmueble incluyendo dirección, habitaciones, baños, tipo de propiedad y fotos.

---

## Requisitos

### Requisito 1: Inicialización del Proyecto Frontend

**User Story:** Como desarrollador, quiero tener un proyecto Next.js configurado con App Router, Tailwind CSS y TypeScript en `src/frontend/`, para poder implementar las pantallas del módulo de exploración de inmuebles.

#### Criterios de Aceptación

1. THE App_Frontend SHALL estar configurada como un proyecto Next.js con App Router, TypeScript y Tailwind CSS en el directorio `src/frontend/`.
2. THE App_Frontend SHALL incluir un archivo `tailwind.config.ts` con los tokens del Sistema_Diseño: paleta de colores (neutral, primario, secundario, estados), escala tipográfica mobile-first (H1: 24px SemiBold, H2: 20px SemiBold, Body: 16px Regular, Caption: 14px Regular) y sistema de espaciado basado en grilla de 4/8pt.
3. THE App_Frontend SHALL utilizar una fuente base de la familia Inter, Roboto o System UI con los pesos Regular (400), Medium (500) y SemiBold (600).
4. THE App_Frontend SHALL definir un layout raíz (`app/layout.tsx`) que establezca el idioma como español (`lang="es"`), aplique la fuente base y provea una estructura HTML semántica con metadatos básicos.
5. THE App_Frontend SHALL incluir una variable de entorno `NEXT_PUBLIC_API_URL` para configurar la URL base del API_Backend.

---

### Requisito 2: Página de Exploración de Inmuebles (Listado)

**User Story:** Como usuario anónimo o autenticado, quiero ver un listado de inmuebles publicados al acceder a la pantalla de exploración, para conocer la oferta disponible de arriendo.

#### Criterios de Aceptación

1. WHEN un usuario accede a la ruta `/explorar`, THE Página_Explorar SHALL solicitar el listado de inmuebles al API_Backend mediante `GET /listings` y mostrar los resultados como una cuadrícula de Tarjeta_Inmueble.
2. THE Página_Explorar SHALL ser accesible sin autenticación, permitiendo que cualquier Usuario_Anónimo explore la oferta de inmuebles.
3. WHILE el listado de inmuebles se está cargando desde el API_Backend, THE Página_Explorar SHALL mostrar un indicador de carga visual (skeleton o spinner) que comunique al usuario que los datos están siendo obtenidos.
4. IF el API_Backend retorna un listado vacío, THEN THE Página_Explorar SHALL mostrar un mensaje claro en español indicando que no se encontraron inmuebles, junto con una sugerencia de ajustar los filtros de búsqueda.
5. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Explorar SHALL mostrar un mensaje de error comprensible en español con una opción para reintentar la carga.
6. THE Página_Explorar SHALL utilizar un layout de una sola columna en dispositivos móviles y expandir a dos columnas en pantallas de mayor resolución (≥768px), siguiendo el enfoque mobile-first y el diseño de referencia en Figma.
7. THE Página_Explorar SHALL incluir un encabezado fijo con borde inferior (`border-bottom`) que contenga un botón de menú hamburguesa a la izquierda y el título "Explorar inmuebles" centrado, utilizando la jerarquía tipográfica H1 (32px Bold, color `#111827`) del Sistema_Diseño.
8. THE Página_Explorar SHALL incluir una barra de acciones debajo del encabezado con dos botones: "Filtros" (con icono) que abre el Panel_Filtros, y "Más recientes" (con icono) que abre el Panel_Ordenamiento.
9. THE Página_Explorar SHALL incluir un componente de Paginación debajo del listado de tarjetas que muestre el texto "Mostrando X a Y de Z resultados", un selector de items por página y controles de navegación de páginas (anterior, números de página, siguiente).

---

### Requisito 3: Filtrado Avanzado de Inmuebles

**User Story:** Como usuario, quiero filtrar inmuebles por múltiples criterios (ciudad, barrio, fecha, tipo, precio, habitaciones, baños, área) para encontrar opciones de arriendo relevantes a mis necesidades.

#### Criterios de Aceptación

1. WHEN el usuario presiona el botón "Filtros" en la barra de acciones, THE Página_Explorar SHALL mostrar el Panel_Filtros como una vista de pantalla completa con encabezado "Filtros" (32px Bold, centrado) y un botón de retorno (flecha izquierda).
2. THE Panel_Filtros SHALL incluir un selector de ciudad (dropdown con fondo `#f9fafb`, borde `#d1d5db`, border-radius 6px) con etiqueta "Ciudad".
3. THE Panel_Filtros SHALL incluir un selector de zona/barrio (dropdown) con etiqueta "Zona / Barrio" que envíe el parámetro `neighborhood` al API_Backend; IF no se ha seleccionado una ciudad, THEN el selector de barrio SHALL estar deshabilitado (opacity 50%) y mostrar el texto de ayuda "Primero selecciona una ciudad" debajo del campo.
4. THE Panel_Filtros SHALL incluir un selector de fecha de publicación (dropdown) con etiqueta "Fecha de publicación" y opciones predefinidas para filtrar por antigüedad de la publicación.
5. THE Panel_Filtros SHALL incluir un selector de tipo de propiedad (dropdown) con etiqueta "Tipo de propiedad".
6. THE Panel_Filtros SHALL incluir dos campos de entrada numérica para precio mensual con etiqueta "Precio mensual": un campo "Mínimo" y un campo "Máximo" dispuestos horizontalmente con gap de 12px, fondo blanco y borde `#d1d5db`.
7. THE Panel_Filtros SHALL incluir un selector de número de habitaciones (dropdown) con etiqueta "Número de habitaciones".
8. THE Panel_Filtros SHALL incluir un selector de número de baños (dropdown) con etiqueta "Número de baños".
9. THE Panel_Filtros SHALL incluir dos campos de entrada numérica para área en m² con etiqueta "Área (m²)": un campo "Mínimo" y un campo "Máximo" dispuestos horizontalmente, con fondo `#f9fafb` y borde `#d1d5db`.
10. THE Panel_Filtros SHALL incluir un botón primario "Aplicar filtros" (fondo `#1d4ed8`, texto blanco, 56px de alto, border-radius 6px, ancho completo) que aplique los filtros seleccionados y retorne al listado.
11. THE Panel_Filtros SHALL incluir un botón secundario "Limpiar filtros" (fondo blanco, borde `#d1d5db`, texto `#111827`, 58px de alto, border-radius 6px, ancho completo) que restablezca todos los filtros a su estado inicial.
12. WHEN el usuario aplica filtros, THE Página_Explorar SHALL realizar una nueva solicitud al API_Backend con los parámetros actualizados (city, neighborhood, search) y mostrar los resultados correspondientes.
13. THE Panel_Filtros SHALL sincronizar los filtros activos con los parámetros de la URL (query params) para permitir compartir búsquedas mediante enlace directo.

---

### Requisito 4: Tarjeta de Inmueble

**User Story:** Como usuario, quiero ver una tarjeta visual por cada inmueble con su foto principal, tipo de propiedad, barrio, precio, habitaciones, baños y fecha de publicación, para evaluar rápidamente las opciones disponibles.

#### Criterios de Aceptación

1. THE Tarjeta_Inmueble SHALL renderizarse como un contenedor con borde (`#d1d5db`), border-radius de 6px, sombra sutil (`0px 1px 2px rgba(0,0,0,0.05)`), fondo blanco y overflow oculto, conforme al diseño de referencia en Figma.
2. THE Tarjeta_Inmueble SHALL mostrar la foto principal del inmueble (la foto con `isMain: true`) en la parte superior ocupando el ancho completo de la tarjeta con aspect ratio de imagen; si no existe foto principal, THE Tarjeta_Inmueble SHALL mostrar la primera foto disponible del arreglo de fotos.
3. THE Tarjeta_Inmueble SHALL mostrar debajo de la imagen un área de contenido con padding de 16px que incluya: el título del inmueble en formato "Tipo · Barrio" (ej. "Casa · Usaquén") usando tipografía H2 (24px Bold, color `#111827`).
4. THE Tarjeta_Inmueble SHALL mostrar el precio del inmueble formateado en pesos colombianos (COP) con separador de miles de punto (ejemplo: "$4.200.000") usando tipografía H3 (20px SemiBold, color primario `#1d4ed8`).
5. THE Tarjeta_Inmueble SHALL mostrar a la derecha del precio dos badges compactos con fondo `#f3f4f6` y border-radius 4px: uno con icono de habitaciones y el número, otro con icono de baños y el número, usando tipografía Caption (14px Regular, color `#4b5563`) con gap de 6px entre icono y texto.
6. THE Tarjeta_Inmueble SHALL mostrar la fecha de publicación en formato relativo en español (ej. "Publicado hace 1 día") usando tipografía Caption (14px Regular, color `#4b5563`).
7. THE Tarjeta_Inmueble SHALL ser un enlace navegable que dirija al usuario a la Página_Detalle del inmueble correspondiente (`/explorar/[id]`).
8. THE Tarjeta_Inmueble SHALL utilizar el componente `next/image` de Next.js para la carga optimizada de imágenes con atributo `alt` descriptivo basado en el título del inmueble.
9. IF el inmueble no tiene fotos asociadas, THEN THE Tarjeta_Inmueble SHALL mostrar una imagen placeholder que indique la ausencia de fotografía.
10. THE Tarjeta_Inmueble SHALL tener un área táctil mínima de 44x44 píxeles para cumplir con los criterios de accesibilidad WCAG 2.1 AA.

---

### Requisito 5: Página de Detalle del Inmueble

**User Story:** Como usuario, quiero ver la información completa de un inmueble al seleccionarlo del listado, para tomar una decisión informada sobre si me interesa contactar al arrendador.

#### Criterios de Aceptación

1. WHEN un usuario accede a la ruta `/explorar/[id]`, THE Página_Detalle SHALL solicitar la información completa del inmueble al API_Backend mediante `GET /listings/:id` y mostrar los datos obtenidos.
2. THE Página_Detalle SHALL incluir un encabezado fijo con borde inferior que contenga un botón de retorno (flecha izquierda) y el título "Detalle del inmueble" centrado (32px Bold, color `#111827`).
3. THE Página_Detalle SHALL mostrar una Galería_Fotos con la imagen principal ocupando el ancho completo (con márgenes laterales de 52px en desktop), botones de navegación izquierda/derecha superpuestos sobre la imagen (36x36px, fondo semitransparente), un indicador de posición "X / Y" con fondo semitransparente y puntos de navegación debajo.
4. WHEN el usuario hace clic en una foto de la Galería_Fotos, THE Página_Detalle SHALL abrir el Modal_Galería a pantalla completa con la imagen ampliada, navegación izquierda/derecha (48x48px), miniaturas de las fotos en la parte inferior, indicador de posición "X / Y" y botón de cierre (X) en la esquina superior derecha.
5. THE Página_Detalle SHALL mostrar el precio formateado como "$X/mes" en tipografía H2 (24px Bold, color primario `#1d4ed8`) seguido del título del inmueble en tipografía H3 (20px SemiBold, color `#111827`).
6. THE Página_Detalle SHALL mostrar una grilla de 3 columnas con tarjetas informativas (fondo `#f3f4f6`, border-radius 6px, padding 12px) para: Habitaciones (icono + número + etiqueta), Baños (icono + número + etiqueta) y Área en m² (icono + valor + etiqueta), cada una con icono centrado arriba, valor en 16px Regular y etiqueta en 12px Regular color `#4b5563`.
7. THE Página_Detalle SHALL mostrar una sección "Descripción" con título H3 (20px SemiBold) y el texto de descripción en 16px Regular color `#4b5563`.
8. THE Página_Detalle SHALL mostrar una sección "Características" con título H3 (20px SemiBold) y las características adicionales como badges en grilla de 2 columnas (fondo `#f3f4f6`, border-radius 4px, padding 16px horizontal, 7.5px vertical, texto 16px Regular).
9. THE Página_Detalle SHALL mostrar una sección "Ubicación" con título H3 (20px SemiBold) y la dirección con icono de ubicación a la izquierda seguido del texto de la ciudad/dirección en 16px Regular color `#4b5563`.
10. THE Página_Detalle SHALL mostrar un botón primario "Contactar arrendador" (fondo `#1d4ed8`, texto blanco, 56px de alto, border-radius 6px, ancho completo) al final del contenido.
11. IF el API_Backend retorna un error 404 para el inmueble solicitado, THEN THE Página_Detalle SHALL mostrar un mensaje claro en español indicando que el inmueble no fue encontrado, con un enlace para regresar a la Página_Explorar.
12. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Detalle SHALL mostrar un mensaje de error comprensible en español con una opción para reintentar la carga.
13. THE Página_Detalle SHALL ser accesible sin autenticación.

---

### Requisito 6: Ampliación del Endpoint de Búsqueda en el Backend

**User Story:** Como frontend, necesito que el endpoint `GET /listings` del backend soporte los filtros avanzados, ordenamiento y paginación definidos en el diseño, para poder implementar el Panel_Filtros, Panel_Ordenamiento y Paginación del frontend.

**Nota:** Cada modificación al backend debe ser consultada y aprobada antes de implementarse. A continuación se detallan los cambios necesarios y su justificación.

#### Criterios de Aceptación

1. THE API_Backend SHALL aceptar los siguientes parámetros adicionales en `GET /listings` para soportar los filtros del diseño: `propertyType` (string, opcional — filtra por `Property.property_type`), `priceMin` (number, opcional — precio mínimo), `priceMax` (number, opcional — precio máximo), `rooms` (number, opcional — filtra por `Property.number_of_rooms`), `bathrooms` (number, opcional — filtra por `Property.number_of_bathrooms`), `areaMin` (number, opcional — área mínima calculada como `Property.length * Property.width`), `areaMax` (number, opcional — área máxima). **Justificación:** El diseño en Figma incluye filtros por tipo de propiedad, rango de precio, habitaciones, baños y área que el endpoint actual no soporta; los datos ya existen en las tablas `Property` y `Listing` del esquema `property_listings`.
2. THE API_Backend SHALL aceptar un parámetro `publishedWithin` (string, opcional, valores: `24h`, `7d`, `30d`, `90d`, `any`) en `GET /listings` que filtre publicaciones por antigüedad relativa a la fecha actual usando `Listing.listing_date`. **Justificación:** El diseño incluye un filtro "Fecha de publicación" con opciones predefinidas de antigüedad.
3. THE API_Backend SHALL aceptar los parámetros `sortBy` (string, opcional, valores: `date`, `price`) y `sortOrder` (string, opcional, valores: `asc`, `desc`, default: `desc`) en `GET /listings` para ordenar los resultados. **Justificación:** El diseño incluye un Panel_Ordenamiento con 4 opciones de ordenamiento (más recientes, más antiguos, precio ascendente, precio descendente) que el endpoint actual no soporta.
4. THE API_Backend SHALL aceptar los parámetros `page` (number, opcional, default: 1) y `pageSize` (number, opcional, default: 9) en `GET /listings` para paginación. **Justificación:** El diseño incluye un componente de Paginación con navegación por páginas y selector de items por página.
5. THE API_Backend SHALL retornar en la respuesta de `GET /listings` un objeto con la estructura `{ data: ListingResponseDto[], total: number, page: number, pageSize: number }` en lugar del arreglo plano actual, para soportar la paginación en el frontend. **Justificación:** El frontend necesita conocer el total de resultados para renderizar la Paginación ("Mostrando X a Y de Z resultados") y los controles de navegación de páginas.
6. THE API_Backend SHALL extender `ListingResponseDto` para incluir los campos `numberOfRooms` (number | null), `numberOfBathrooms` (number | null) y `propertyType` (string | null) en cada elemento del listado, resolviendo estos datos desde la tabla `Property` a través de la relación `PortfolioUnit`. **Justificación:** La Tarjeta_Inmueble del diseño muestra el tipo de propiedad en el título (formato "Tipo · Barrio") y badges de habitaciones/baños; actualmente estos campos solo están disponibles en el endpoint de detalle (`GET /listings/:id`), no en el listado.
7. THE API_Backend SHALL extender `ListingResponseDto` para incluir el campo `neighborhood` (string | null) resuelto desde la tabla `Address` a través de `Property` y `PortfolioUnit`. **Justificación:** La Tarjeta_Inmueble muestra el barrio en el título (formato "Tipo · Barrio"); actualmente este dato solo está disponible en el detalle.
8. THE ListingFiltersDto del backend SHALL ser actualizado para incluir validaciones (`@IsOptional`, `@IsString`, `@IsNumber`, `@IsIn`) en todos los nuevos parámetros de filtrado, ordenamiento y paginación, con decoradores `@ApiPropertyOptional` para documentación Swagger.

---

### Requisito 7: Servicio de Integración con API Backend (Frontend)

**User Story:** Como desarrollador, quiero una capa de abstracción para las llamadas al API backend, para mantener el código organizado y facilitar el manejo de errores y la evolución de la integración.

#### Criterios de Aceptación

1. THE Servicio_API SHALL encapsular las llamadas HTTP al API_Backend en funciones tipadas con TypeScript que correspondan a los endpoints `GET /listings` y `GET /listings/:id`.
2. THE Servicio_API SHALL utilizar la variable de entorno `NEXT_PUBLIC_API_URL` como URL base para todas las solicitudes al API_Backend.
3. THE Servicio_API SHALL definir interfaces TypeScript que reflejen la estructura de las respuestas del API_Backend: `Listing` (id, portfolioUnitId, title, description, listingDate, price, currency, isActive, photos, numberOfRooms, numberOfBathrooms, propertyType, neighborhood) y `ListingDetail` (campos de Listing más address, landlordUserId).
4. THE Servicio_API SHALL definir una interfaz TypeScript para los parámetros de filtrado: `ListingFilters` (city, neighborhood, search, propertyType, priceMin, priceMax, rooms, bathrooms, areaMin, areaMax, publishedWithin, sortBy, sortOrder, page, pageSize), todos opcionales.
5. THE Servicio_API SHALL definir una interfaz TypeScript para la respuesta paginada: `PaginatedListings` (data: Listing[], total: number, page: number, pageSize: number).
6. IF una solicitud HTTP al API_Backend falla, THEN THE Servicio_API SHALL propagar un error con un mensaje descriptivo que permita a los componentes consumidores mostrar retroalimentación adecuada al usuario.
7. THE Servicio_API SHALL utilizar la API nativa `fetch` de Next.js para las solicitudes HTTP, aprovechando las capacidades de caché y revalidación del framework.

---

### Requisito 8: Accesibilidad WCAG 2.1 AA

**User Story:** Como usuario con diversas capacidades, quiero que la interfaz sea accesible y legible, para poder explorar inmuebles sin barreras de interacción.

#### Criterios de Aceptación

1. THE App_Frontend SHALL utilizar elementos HTML semánticos (`main`, `nav`, `article`, `section`, `header`, `footer`, `h1`-`h6`) para estructurar el contenido de cada página.
2. THE App_Frontend SHALL garantizar que todos los elementos interactivos (botones, enlaces, campos de formulario) tengan un área táctil mínima de 44x44 píxeles en dispositivos móviles.
3. THE App_Frontend SHALL garantizar que todas las imágenes tengan atributos `alt` descriptivos en español; las imágenes decorativas tendrán `alt=""`.
4. THE App_Frontend SHALL garantizar que todos los campos de formulario de la Barra_Búsqueda tengan etiquetas (`label`) asociadas programáticamente mediante el atributo `htmlFor` o `aria-label`.
5. THE App_Frontend SHALL aplicar la paleta de colores del Sistema_Diseño garantizando un contraste mínimo de 4.5:1 entre texto y fondo para texto normal, y de 3:1 para texto grande (≥18px o ≥14px en negrita).
6. THE App_Frontend SHALL garantizar que la navegación por teclado funcione correctamente en todos los elementos interactivos, con indicadores de foco visibles.
7. THE App_Frontend SHALL utilizar atributos ARIA (`aria-live`, `aria-busy`, `role`) para comunicar estados dinámicos como la carga de datos y los mensajes de error a tecnologías asistivas.

---

### Requisito 9: Sistema de Diseño Base y Responsividad

**User Story:** Como usuario, quiero que la interfaz sea visualmente consistente, legible y se adapte correctamente a mi dispositivo, para tener una experiencia de uso clara y agradable.

#### Criterios de Aceptación

1. THE App_Frontend SHALL aplicar márgenes laterales de 16px en dispositivos móviles y 52px en desktop, siguiendo el sistema de espaciado del diseño de referencia en Figma.
2. THE App_Frontend SHALL aplicar una separación de 24px entre secciones principales y de 8 a 12px entre elementos relacionados, conforme al diseño de referencia.
3. THE App_Frontend SHALL utilizar una sola columna principal en dispositivos móviles (ancho < 768px) y expandir a dos columnas para la cuadrícula de tarjetas en pantallas de mayor resolución, con gap de 16px entre tarjetas.
4. THE App_Frontend SHALL aplicar la escala tipográfica del diseño de referencia: H1 a 32px Bold (color `#111827`), H2 a 24px Bold, H3 a 20px SemiBold, Body a 16px Regular, Caption/Paragraph a 14px Regular (color `#4b5563`).
5. THE App_Frontend SHALL utilizar la paleta de colores del diseño de referencia: primario `#1d4ed8` (botones principales, precios), neutral oscuro `#111827` (títulos, texto principal), neutral medio `#4b5563` (texto secundario, captions), neutral claro `#d1d5db` (bordes, divisores), fondo de campos `#f9fafb`, fondo de badges `#f3f4f6`, fondo general blanco `#ffffff`.
6. THE App_Frontend SHALL garantizar que todos los textos en la interfaz estén en idioma español.
7. THE App_Frontend SHALL optimizar la carga inicial para alcanzar un Largest Contentful Paint (LCP) menor o igual a 2.5 segundos en conexiones móviles 4G, utilizando carga optimizada de imágenes y renderizado del lado del servidor cuando sea apropiado.
8. THE App_Frontend SHALL utilizar la fuente Inter como fuente base con los pesos Regular (400), SemiBold (600) y Bold (700), conforme al diseño de referencia en Figma.


---

### Requisito 10: Ordenamiento de Resultados

**User Story:** Como usuario, quiero ordenar los inmuebles por diferentes criterios (fecha, precio) para encontrar más rápido las opciones que me interesan.

#### Criterios de Aceptación

1. WHEN el usuario presiona el botón "Más recientes" en la barra de acciones, THE Página_Explorar SHALL mostrar el Panel_Ordenamiento como una vista de pantalla completa con encabezado "Ordenar" (32px Bold, centrado) y un botón de retorno.
2. THE Panel_Ordenamiento SHALL presentar cuatro opciones de ordenamiento como botones de selección con título (20px SemiBold) y descripción (14px Regular, color `#4b5563`): "Más recientes primero" (descripción: "Publicaciones más nuevas al inicio"), "Más antiguos primero" (descripción: "Publicaciones más viejas al inicio"), "Precio: menor a mayor" (descripción: "Más baratos primero"), "Precio: mayor a menor" (descripción: "Más caros primero").
3. THE Panel_Ordenamiento SHALL indicar visualmente la opción actualmente seleccionada mediante un icono de check (color primario `#1d4ed8`) a la derecha de la opción.
4. THE Panel_Ordenamiento SHALL incluir un botón primario "Aplicar ordenamiento" (fondo `#1d4ed8`, texto blanco, 56px de alto, border-radius 6px, ancho completo) que aplique el ordenamiento seleccionado y retorne al listado.
5. WHEN el usuario aplica un ordenamiento, THE Página_Explorar SHALL actualizar el texto del botón de ordenamiento en la barra de acciones para reflejar la opción seleccionada.

---

### Requisito 11: Menú Lateral de Navegación

**User Story:** Como usuario autenticado, quiero acceder a un menú de navegación lateral para desplazarme entre las diferentes secciones de la plataforma.

#### Criterios de Aceptación

1. WHEN el usuario presiona el botón de menú hamburguesa en el encabezado, THE App_Frontend SHALL mostrar el Menú_Lateral como un drawer que se desliza desde la izquierda con ancho de 320px y fondo blanco.
2. THE Menú_Lateral SHALL incluir un encabezado con el título "Menú" (24px Bold) y un botón de cierre (X) a la derecha.
3. IF el usuario está autenticado, THEN THE Menú_Lateral SHALL mostrar debajo del encabezado una sección con un avatar/icono de usuario (48x48px), el nombre del usuario y su rol (ej. "Arrendador") en tipografía Caption (14px Regular, color `#4b5563`).
4. THE Menú_Lateral SHALL incluir los siguientes enlaces de navegación con icono a la izquierda y texto (16px Regular): "Explorar inmuebles", "Mis arriendos", "Mis ingresos", "Mis contratos", "Mi perfil", separados por un divisor visual antes de "Cerrar sesión".
5. WHEN el usuario presiona fuera del Menú_Lateral o presiona el botón de cierre, THE Menú_Lateral SHALL cerrarse con una animación de deslizamiento hacia la izquierda.
6. IF el usuario no está autenticado, THEN THE Menú_Lateral SHALL mostrar únicamente el enlace "Explorar inmuebles" y opciones para iniciar sesión o registrarse.
