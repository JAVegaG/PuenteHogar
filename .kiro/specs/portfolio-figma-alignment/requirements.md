# Documento de Requisitos — Alineación del Portafolio del Arrendador con Diseños Figma

## Introducción

Este documento especifica los requisitos para alinear el módulo de Portafolio del Arrendador (backend y frontend) con los diseños de Figma. Los diseños de Figma introducen un modelo centrado en portafolios con tarjetas enriquecidas, datos agregados (conteo de unidades, arriendos activos, porcentaje de ocupación), creación de portafolios, y un formulario de creación de unidades enriquecido.

El API anterior exponía endpoints planos de unidades (`GET /portfolio/units`, `POST /portfolio/units`, `PATCH /portfolio/units/:id`) sin agrupación por portafolio, sin datos agregados, y con un formulario de creación de unidades limitado a `propertyId`, `leaseBaseAmount`, `leaseBaseCurrency` y `conditions`. Estos endpoints fueron migrados a rutas con alcance de portafolio (`GET /portfolio/:portfolioId/units`, `POST /portfolio/:portfolioId/units`, `PATCH /portfolio/:portfolioId/units/:id`) y se agregaron nuevos endpoints para gestión de portafolios (`GET /portfolio`, `POST /portfolio`). El frontend fue reestructurado para soportar la vista de portafolios con estadísticas, la creación de portafolios, y un formulario de unidades con campos como nombre/identificación, dirección, área (largo × ancho), habitaciones, baños, canon base y descripción.

**Enfoque simplificado:** En lugar de duplicar campos físicos del inmueble en `PortfolioUnit`, se reutilizan las tablas existentes `Property` y `Address` del esquema `property_listings`. El endpoint de creación de unidades crea un `Property` + `Address` + `PortfolioUnit` en una transacción, y las consultas de lectura hacen join para obtener los datos enriquecidos. Solo se agregan dos campos al esquema: `description` en `LandlordPortfolio` y `name` en `PortfolioUnit`.

**Alcance:** Nuevos endpoints de backend para listado de portafolios con datos agregados, creación de portafolios, y creación enriquecida de unidades. Actualización del frontend para la página de listado de portafolios ("Mis arriendos"), tarjetas de portafolio con estadísticas, paginación, y página de creación de unidades ("Agregar unidad") con el formulario simplificado según Figma.

**Fuera de alcance:** Gestión de arriendos (leases), gestión de contratos, gestión de pagos, notificaciones, publicación de listings, edición/eliminación de portafolios, edición/eliminación de unidades, tipo de unidad (dropdown "Tipo de unidad" diferido), piso/nivel (diferido para MVP), parqueaderos (diferido para MVP).

---

## Glosario

- **API_Backend**: El servidor NestJS que expone los endpoints REST del módulo `landlord-portfolio`.
- **Portafolio**: Registro `LandlordPortfolio` que agrupa unidades inmobiliarias de un arrendador. Tiene nombre, descripción opcional, fecha de creación, y relación con múltiples unidades.
- **Unidad**: Registro `PortfolioUnit` que representa una propiedad individual dentro de un portafolio, arrendable de forma independiente (ej: Apartamento 301, Casa 5, Local 102). Tiene un `name` para identificación y referencia a un `Property` para datos físicos.
- **Propiedad**: Registro `Property` del esquema `property_listings` que contiene datos físicos del inmueble (`property_type`, `length`, `width`, `number_of_rooms`, `number_of_bathrooms`) y su dirección asociada via `Address`.
- **Dirección**: Registro `Address` del esquema `property_listings` vinculado a un `Property` via `property_id`. Contiene `address`, `neighborhood`, `city`, `state`.
- **Arriendo_Activo**: Un registro `Lease` asociado a una unidad cuyo campo `end_date` es nulo o posterior a la fecha actual.
- **Ocupación**: Porcentaje de unidades de un portafolio que tienen al menos un Arriendo_Activo, calculado como `(unidades con arriendo activo / unidades totales) × 100`.
- **Página_Listado_Portafolios**: Página frontend accesible en `/mi-portafolio` que muestra las tarjetas de portafolios del arrendador autenticado con datos agregados.
- **Tarjeta_Portafolio**: Componente visual que representa un portafolio en el listado, mostrando nombre, descripción, tipo de propiedad, conteo de unidades, arriendos activos, barra de ocupación y botón "Ver unidades".
- **Página_Agregar_Unidad**: Página frontend accesible en `/mi-portafolio/[portfolioId]/agregar-unidad` que permite al arrendador agregar una nueva unidad a un portafolio específico.
- **Formulario_Unidad**: Formulario de creación de unidad con secciones: Información básica (nombre, dirección), Detalles de la propiedad (área vía largo×ancho, habitaciones, baños, descripción), y Datos de arriendo (canon base, moneda).
- **Arrendador**: Usuario autenticado con rol LANDLORD que gestiona portafolios de inmuebles.
- **Sistema_Diseño**: Tokens de diseño configurados en `tailwind.config.ts` y componentes compartidos (Header, Button, Skeleton, EmptyState, ErrorState, Pagination).
- **Paginación**: Mecanismo de navegación que divide el listado de portafolios en páginas, mostrando un subconjunto de resultados con controles para avanzar/retroceder.

---

## Requisitos

### Requisito 1: Endpoint de Listado de Portafolios con Datos Agregados

**User Story:** Como arrendador autenticado, quiero obtener un listado paginado de mis portafolios con estadísticas agregadas (conteo de unidades, arriendos activos, porcentaje de ocupación), para visualizar el estado general de mis propiedades.

#### Criterios de Aceptación

1. WHEN el Arrendador envía una solicitud `GET /portfolio` con un Token_JWT válido, THE API_Backend SHALL retornar un listado paginado de portafolios pertenecientes al usuario autenticado.
2. THE API_Backend SHALL incluir en cada portafolio del listado los campos: `id`, `name`, `description`, `creationDate`, `totalUnits` (conteo de unidades asociadas), `activeLeases` (conteo de arriendos activos), `occupancyPercentage` (porcentaje de ocupación calculado), y `propertyType` (tipo de propiedad predominante obtenido del primer `Property` vinculado a las unidades del portafolio, o `null` si no hay unidades).
3. THE API_Backend SHALL calcular `activeLeases` contando los registros `Lease` asociados a las unidades del portafolio cuyo campo `end_date` sea nulo o posterior a la fecha actual.
4. THE API_Backend SHALL calcular `occupancyPercentage` como `(unidades con al menos un arriendo activo / totalUnits) × 100`, redondeado a un entero; IF `totalUnits` es cero, THEN `occupancyPercentage` SHALL ser cero.
5. THE API_Backend SHALL aceptar parámetros de paginación `page` (número de página, base 1, por defecto 1) y `limit` (cantidad por página, por defecto 6, máximo 50) como query parameters.
6. THE API_Backend SHALL retornar metadatos de paginación: `total` (total de portafolios), `page` (página actual), `limit` (cantidad por página), y `totalPages` (total de páginas).
7. THE API_Backend SHALL retornar un resumen global con `globalTotalUnits` (suma de unidades de todos los portafolios del usuario) y `globalActiveLeases` (suma de arriendos activos de todos los portafolios del usuario) en la respuesta.
8. IF el Arrendador no tiene portafolios, THEN THE API_Backend SHALL retornar un listado vacío con `total: 0` y los contadores globales en cero.
9. IF el parámetro `page` excede el total de páginas disponibles, THEN THE API_Backend SHALL retornar un listado vacío con los metadatos de paginación correctos.

---

### Requisito 2: Endpoint de Creación de Portafolio

**User Story:** Como arrendador autenticado, quiero crear un nuevo portafolio proporcionando un nombre y una descripción opcional, para organizar mis propiedades en grupos lógicos.

#### Criterios de Aceptación

1. WHEN el Arrendador envía una solicitud `POST /portfolio` con un cuerpo JSON que contiene `name` (obligatorio) y `description` (opcional), THE API_Backend SHALL crear un nuevo registro `LandlordPortfolio` asociado al usuario autenticado y retornar los datos del portafolio creado.
2. THE API_Backend SHALL validar que el campo `name` no esté vacío y tenga entre 1 y 200 caracteres; IF la validación falla, THEN THE API_Backend SHALL retornar un error 400 con un mensaje descriptivo.
3. THE API_Backend SHALL validar que el campo `description`, si se proporciona, tenga un máximo de 500 caracteres; IF la validación falla, THEN THE API_Backend SHALL retornar un error 400 con un mensaje descriptivo.
4. IF el usuario autenticado no tiene rol LANDLORD, THEN THE API_Backend SHALL retornar un error 403 con el mensaje "Acceso denegado".
5. THE API_Backend SHALL retornar el portafolio creado con los campos: `id`, `name`, `description`, `creationDate`, `totalUnits` (0), `activeLeases` (0), `occupancyPercentage` (0), `propertyType` (null).

---

### Requisito 3: Endpoint Enriquecido de Creación de Unidad

**User Story:** Como arrendador autenticado, quiero agregar una nueva unidad a un portafolio específico proporcionando nombre, dirección, tipo de propiedad, dimensiones, habitaciones, baños, canon base y descripción, para registrar los detalles completos de la propiedad reutilizando las tablas existentes Property y Address.

#### Criterios de Aceptación

1. WHEN el Arrendador envía una solicitud `POST /portfolio/:portfolioId/units` con los datos de la unidad, THE API_Backend SHALL crear un nuevo registro `Property` (con tipo, dimensiones, habitaciones, baños), un registro `Address` (con dirección), y un registro `PortfolioUnit` (con nombre, referencia al Property, canon base, moneda, condiciones) en una transacción atómica.
2. THE API_Backend SHALL aceptar los siguientes campos en el cuerpo de la solicitud: `name` (obligatorio, nombre/identificación de la unidad), `address` (obligatorio, dirección de la unidad), `propertyType` (obligatorio, tipo de propiedad, ej: "Apartamento"), `length` (opcional, largo en metros, Decimal), `width` (opcional, ancho en metros, Decimal), `numberOfRooms` (opcional, por defecto 0), `numberOfBathrooms` (opcional, por defecto 0), `description` (opcional, descripción adicional almacenada en `PortfolioUnit.conditions`), `leaseBaseAmount` (obligatorio, canon base de arrendamiento), y `leaseBaseCurrency` (opcional, por defecto "COP").
3. THE API_Backend SHALL validar que el campo `name` no esté vacío y tenga entre 1 y 200 caracteres.
4. THE API_Backend SHALL validar que el campo `address` no esté vacío y tenga entre 1 y 300 caracteres.
5. THE API_Backend SHALL validar que el campo `propertyType` no esté vacío.
6. THE API_Backend SHALL validar que `length` y `width`, si se proporcionan, sean números positivos (Decimal).
7. THE API_Backend SHALL validar que `numberOfRooms` y `numberOfBathrooms` sean enteros no negativos cuando se proporcionen.
8. THE API_Backend SHALL validar que `leaseBaseAmount` sea un número mayor o igual a cero.
9. IF el portafolio especificado por `portfolioId` no existe o no pertenece al usuario autenticado, THEN THE API_Backend SHALL retornar un error 404 con el mensaje "Portafolio no encontrado".
10. IF alguna validación de campos falla, THEN THE API_Backend SHALL retornar un error 400 con mensajes descriptivos por cada campo inválido.
11. THE API_Backend SHALL retornar la unidad creada con los campos enriquecidos: `id`, `portfolioId`, `name`, `propertyType`, `address`, `area` (calculada como `length × width` si ambos están presentes, o `null`), `numberOfRooms`, `numberOfBathrooms`, `description`, `leaseBaseAmount`, `leaseBaseCurrency`, `createdAt`, `updatedAt`.

---

### Requisito 4: Modificación del Esquema de Base de Datos

**User Story:** Como desarrollador, quiero que el esquema de base de datos soporte los nuevos campos mínimos requeridos, reutilizando las tablas existentes Property y Address para datos físicos del inmueble.

#### Criterios de Aceptación

1. THE API_Backend SHALL agregar un campo `description` (opcional, tipo String) al modelo `LandlordPortfolio` en el esquema Prisma para almacenar la descripción del portafolio.
2. THE API_Backend SHALL agregar un campo `name` (obligatorio, tipo String, con `@default('')` para registros existentes) al modelo `PortfolioUnit` en el esquema Prisma para almacenar el nombre/identificación de la unidad (ej: "Apartamento 301").
3. THE API_Backend SHALL crear una migración Prisma que aplique los cambios de esquema de forma incremental sin pérdida de datos existentes.
4. THE API_Backend SHALL reutilizar los campos existentes de `Property` (`property_type`, `length`, `width`, `number_of_rooms`, `number_of_bathrooms`) y `Address` (`address`, `neighborhood`, `city`) para almacenar los datos físicos y de ubicación de las unidades, sin agregar campos duplicados a `PortfolioUnit`.

---

### Requisito 5: Página de Listado de Portafolios (Frontend)

**User Story:** Como arrendador autenticado, quiero ver un listado de mis portafolios con estadísticas agregadas al acceder a "Mis arriendos", para tener una visión general del estado de mis propiedades.

#### Criterios de Aceptación

1. WHEN un Arrendador accede a la ruta `/mi-portafolio`, THE Página_Listado_Portafolios SHALL solicitar el listado paginado de portafolios al API_Backend mediante `GET /portfolio` y mostrar los resultados como una lista de Tarjeta_Portafolio.
2. THE Página_Listado_Portafolios SHALL mostrar un encabezado con el título "Mis arriendos" y el subtítulo "Gestión de propiedades", seguido de contadores globales que muestren el total de unidades y el total de arriendos activos del arrendador.
3. THE Página_Listado_Portafolios SHALL incluir un botón primario "+ Crear nuevo portafolio" que abra un diálogo o navegue a un flujo de creación de portafolio.
4. WHILE el listado de portafolios se está cargando desde el API_Backend, THE Página_Listado_Portafolios SHALL mostrar un indicador de carga visual (skeleton) que replique la estructura de las tarjetas de portafolio.
5. IF el API_Backend retorna un listado vacío, THEN THE Página_Listado_Portafolios SHALL mostrar un mensaje claro en español indicando que el arrendador no tiene portafolios, junto con una sugerencia de crear uno nuevo.
6. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Listado_Portafolios SHALL mostrar un mensaje de error comprensible en español con una opción para reintentar la carga.
7. IF el Token_JWT es inválido o ha expirado (error 401), THEN THE Página_Listado_Portafolios SHALL invocar la función `logout` del AuthProvider, redirigiendo al usuario a la página de login.
8. THE Página_Listado_Portafolios SHALL mostrar controles de paginación en la parte inferior con el texto "Mostrando X a Y de Z resultados" y botones para navegar entre páginas.
9. THE Página_Listado_Portafolios SHALL ser accesible únicamente para usuarios autenticados con rol LANDLORD; IF un usuario sin rol LANDLORD accede a la ruta, THEN SHALL mostrar un mensaje indicando que no tiene permisos.
10. THE Página_Listado_Portafolios SHALL utilizar un layout de una sola columna en dispositivos móviles, siguiendo el enfoque mobile-first del Sistema_Diseño.

---

### Requisito 6: Tarjeta de Portafolio

**User Story:** Como arrendador, quiero ver una tarjeta visual por cada portafolio con el nombre, tipo de propiedad, estadísticas de unidades y ocupación, para evaluar rápidamente el estado de cada grupo de propiedades.

#### Criterios de Aceptación

1. THE Tarjeta_Portafolio SHALL renderizarse como un contenedor con borde, border-radius, sombra sutil y fondo blanco, conforme al Sistema_Diseño.
2. THE Tarjeta_Portafolio SHALL mostrar el nombre del portafolio con un ícono de edificio, seguido de la descripción del portafolio si existe.
3. THE Tarjeta_Portafolio SHALL mostrar un badge con el tipo de propiedad predominante del portafolio (obtenido del campo `propertyType` de la respuesta del API, ej: "Apartamento", "Casa"), o no mostrar badge si `propertyType` es `null`.
4. THE Tarjeta_Portafolio SHALL mostrar las estadísticas "Unidades totales" y "Arriendos activos" con sus respectivos valores numéricos.
5. THE Tarjeta_Portafolio SHALL mostrar una barra de progreso visual que represente el porcentaje de ocupación del portafolio, acompañada del valor porcentual.
6. THE Tarjeta_Portafolio SHALL incluir un botón "Ver unidades" que navegue a la vista de unidades del portafolio correspondiente.
7. THE Tarjeta_Portafolio SHALL tener un área táctil mínima de 44x44 píxeles en todos los elementos interactivos para cumplir con los criterios de accesibilidad WCAG 2.1 AA.

---

### Requisito 7: Página de Creación de Unidad (Agregar Unidad)

**User Story:** Como arrendador autenticado, quiero agregar una nueva unidad a un portafolio específico proporcionando nombre, dirección, detalles de la propiedad y datos de arriendo, para registrar un inmueble arrendable con información completa.

#### Criterios de Aceptación

1. WHEN un Arrendador accede a la ruta `/mi-portafolio/[portfolioId]/agregar-unidad`, THE Página_Agregar_Unidad SHALL mostrar un encabezado con flecha de retorno y el título "Agregar unidad", seguido del texto "Agregando unidad a: [nombre del portafolio]".
2. THE Página_Agregar_Unidad SHALL mostrar un banner informativo que explique qué es una unidad inmobiliaria: "Una unidad es una propiedad individual dentro de tu portafolio que puede ser arrendada. Por ejemplo: Apartamento 301, Casa 5, Local 102, etc."
3. THE Formulario_Unidad SHALL incluir una sección "Información básica" con los campos: Nombre/Identificación (obligatorio, texto, placeholder "Ej: Apartamento 301, Casa 5, Local 102"), Dirección (obligatorio, texto, placeholder "Ej: Carrera 7 #58-32"), y Tipo de propiedad (obligatorio, texto, placeholder "Ej: Apartamento, Casa, Local").
4. THE Formulario_Unidad SHALL incluir una sección "Detalles de la propiedad" con los campos: Largo (opcional, numérico, metros), Ancho (opcional, numérico, metros), Área calculada (display de largo × ancho si ambos están presentes), Habitaciones (numérico, por defecto 0), Baños (numérico, por defecto 0), y Descripción adicional (opcional, textarea).
5. THE Formulario_Unidad SHALL incluir una sección "Datos de arriendo" con los campos: Canon base (obligatorio, numérico), y Moneda (texto, por defecto "COP").
6. THE Formulario_Unidad SHALL validar en el cliente que el campo Nombre/Identificación no esté vacío; IF está vacío, THEN SHALL mostrar "El nombre de la unidad es obligatorio".
7. THE Formulario_Unidad SHALL validar en el cliente que el campo Dirección no esté vacío; IF está vacío, THEN SHALL mostrar "La dirección es obligatoria".
8. THE Formulario_Unidad SHALL validar en el cliente que el campo Tipo de propiedad no esté vacío; IF está vacío, THEN SHALL mostrar "El tipo de propiedad es obligatorio".
9. THE Formulario_Unidad SHALL validar en el cliente que el campo Canon base no esté vacío y sea un valor numérico mayor o igual a cero; IF está vacío, THEN SHALL mostrar "El canon base es obligatorio"; IF no es un número válido o es negativo, THEN SHALL mostrar "Ingresa un valor numérico válido".
10. THE Formulario_Unidad SHALL validar en el cliente que los campos Largo y Ancho, si se proporcionan, sean valores numéricos positivos; IF alguno no es un número válido o es menor o igual a cero, THEN SHALL mostrar "Ingresa un valor válido mayor a cero".
11. THE Formulario_Unidad SHALL validar en el cliente que los campos Habitaciones y Baños sean enteros no negativos cuando se modifiquen; IF alguno es negativo, THEN SHALL mostrar "El valor debe ser cero o mayor".
12. THE Formulario_Unidad SHALL incluir un botón primario "Agregar unidad" que envíe los datos al API_Backend mediante `POST /portfolio/:portfolioId/units`, y un botón secundario "Cancelar" que navegue de regreso al portafolio.
13. WHILE la solicitud de creación se está procesando, THE Formulario_Unidad SHALL deshabilitar el botón "Agregar unidad" y mostrar un indicador de carga.
14. WHEN el API_Backend retorna una respuesta exitosa, THE Página_Agregar_Unidad SHALL mostrar un mensaje de confirmación y redirigir al arrendador a la vista de unidades del portafolio.
15. IF el API_Backend retorna un error 404 (portafolio no encontrado), THEN THE Página_Agregar_Unidad SHALL mostrar un mensaje "Portafolio no encontrado" con un enlace para regresar al listado de portafolios.
16. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Agregar_Unidad SHALL mostrar un mensaje de error comprensible en español, preservando todos los datos ingresados.
17. THE Página_Agregar_Unidad SHALL mostrar una sección informativa "Próximos pasos" que indique: "Una vez agregada la unidad, podrás crear arriendos para ella, gestionar contratos y realizar seguimiento de pagos."
18. THE Página_Agregar_Unidad SHALL ser accesible únicamente para usuarios autenticados con rol LANDLORD.

---

### Requisito 8: Servicio Frontend de Portafolios (PortfolioService Actualizado)

**User Story:** Como desarrollador, quiero una capa de abstracción actualizada para las llamadas a los nuevos endpoints del portafolio, para mantener el código organizado y facilitar el manejo de errores.

#### Criterios de Aceptación

1. THE PortfolioService SHALL encapsular las llamadas HTTP al API_Backend en funciones tipadas para los endpoints `GET /portfolio`, `POST /portfolio`, y `POST /portfolio/:portfolioId/units`.
2. THE PortfolioService SHALL definir interfaces TypeScript que reflejen las nuevas estructuras de respuesta: `PortfolioSummary` (id, name, description, propertyType, creationDate, totalUnits, activeLeases, occupancyPercentage), `PaginatedPortfolios` (data, total, page, limit, totalPages, globalTotalUnits, globalActiveLeases), `CreatePortfolioRequest` (name, description), y `CreateUnitRequest` (name, address, propertyType, length, width, numberOfRooms, numberOfBathrooms, description, leaseBaseAmount, leaseBaseCurrency).
3. THE PortfolioService SHALL adjuntar el header `Authorization: Bearer <token>` en todas las peticiones HTTP.
4. IF una solicitud HTTP falla con código 401, THEN THE PortfolioService SHALL propagar un error con el mensaje "Sesión expirada".
5. IF una solicitud HTTP falla con código 403, THEN THE PortfolioService SHALL propagar un error con el mensaje "No tienes permiso para realizar esta acción".
6. IF una solicitud HTTP falla con código 404, THEN THE PortfolioService SHALL propagar un error con el mensaje "Recurso no encontrado".
7. IF una solicitud HTTP falla por error de red, THEN THE PortfolioService SHALL propagar un error con el mensaje "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo."; IF falla con error del servidor (5xx), THEN SHALL propagar "Error del servidor. Intenta de nuevo más tarde."

---

### Requisito 9: Validación Client-Side del Formulario de Unidad

**User Story:** Como arrendador, quiero recibir retroalimentación inmediata cuando ingreso datos incorrectos en el formulario de agregar unidad, para corregir errores antes de enviar la solicitud al servidor.

#### Criterios de Aceptación

1. THE Módulo_Portafolio SHALL implementar funciones de validación puras que validen cada campo del Formulario_Unidad y retornen `null` si el valor es válido o un mensaje de error en español si es inválido.
2. THE Módulo_Portafolio SHALL validar el campo `name`: no vacío después de trim; IF vacío, THEN retornar "El nombre de la unidad es obligatorio".
3. THE Módulo_Portafolio SHALL validar el campo `address`: no vacío después de trim; IF vacío, THEN retornar "La dirección es obligatoria".
4. THE Módulo_Portafolio SHALL validar el campo `propertyType`: no vacío después de trim; IF vacío, THEN retornar "El tipo de propiedad es obligatorio".
5. THE Módulo_Portafolio SHALL validar el campo `leaseBaseAmount`: no vacío, numérico, mayor o igual a cero; IF vacío, THEN retornar "El canon base es obligatorio"; IF no numérico o negativo, THEN retornar "Ingresa un valor numérico válido".
6. THE Módulo_Portafolio SHALL validar los campos `length` y `width` (si no vacíos): numéricos, mayores a cero; IF no numérico o menor o igual a cero, THEN retornar "Ingresa un valor válido mayor a cero".
7. THE Módulo_Portafolio SHALL validar los campos `numberOfRooms` y `numberOfBathrooms`: enteros no negativos; IF alguno es negativo, THEN retornar "El valor debe ser cero o mayor".
8. FOR ALL cadenas de texto no vacías (después de trim), las funciones `validateUnitName`, `validateUnitAddress` y `validatePropertyType` SHALL retornar `null`; FOR ALL cadenas vacías o compuestas solo de espacios, SHALL retornar el mensaje de error correspondiente.
9. FOR ALL valores numéricos positivos finitos, la función `validatePositiveDecimal` SHALL retornar `null`; FOR ALL otros valores (vacío, NaN, cero, negativo, Infinity) SHALL retornar el mensaje de error correspondiente.

---

### Requisito 10: Accesibilidad WCAG 2.1 AA

**User Story:** Como arrendador con diversas capacidades, quiero que las páginas del portafolio sean accesibles y legibles, para poder gestionar mis propiedades sin barreras de interacción.

#### Criterios de Aceptación

1. THE Módulo_Portafolio SHALL garantizar que todos los campos del Formulario_Unidad tengan etiquetas (`label`) asociadas programáticamente mediante el atributo `htmlFor` o `aria-label`.
2. THE Módulo_Portafolio SHALL garantizar que todos los mensajes de error de validación estén asociados a sus campos correspondientes mediante `aria-describedby` y sean anunciados a tecnologías asistivas mediante `aria-live="polite"`.
3. THE Módulo_Portafolio SHALL garantizar que todos los elementos interactivos (botones, enlaces, campos de formulario, tarjetas) tengan un área táctil mínima de 44x44 píxeles.
4. THE Módulo_Portafolio SHALL garantizar que la barra de progreso de ocupación tenga un atributo `role="progressbar"` con `aria-valuenow`, `aria-valuemin` y `aria-valuemax` apropiados.
5. THE Módulo_Portafolio SHALL aplicar la paleta de colores del Sistema_Diseño garantizando un contraste mínimo de 4.5:1 entre texto y fondo para texto normal, y de 3:1 para texto grande.
6. THE Módulo_Portafolio SHALL utilizar elementos HTML semánticos (`main`, `section`, `article`, `h1`-`h3`, `nav`) para estructurar el contenido de cada página.
7. THE Módulo_Portafolio SHALL garantizar que la paginación sea navegable por teclado y que el estado actual de la página sea comunicado a tecnologías asistivas mediante `aria-current="page"`.
