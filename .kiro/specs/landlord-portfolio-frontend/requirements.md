# Documento de Requisitos — Portafolio del Arrendador (Frontend)

## Introducción

Este documento especifica los requisitos para la implementación del módulo frontend del Portafolio del Arrendador de la plataforma de gestión de arriendo de vivienda urbana en Colombia (Valle del Cauca). El módulo permite a arrendadores autenticados visualizar su portafolio de inmuebles, agregar nuevas unidades de portafolio, editar unidades existentes y consultar los arriendos (leases) asociados a cada unidad.

El frontend se implementa como parte de la aplicación Next.js (App Router) existente en `src/frontend/`, con Tailwind CSS y TypeScript, siguiendo un enfoque mobile-first y cumpliendo con los criterios de accesibilidad WCAG 2.1 AA. La interfaz se presenta en idioma español y consume los endpoints REST del backend NestJS existente (`GET /portfolio/:portfolioId/units`, `POST /portfolio/:portfolioId/units`, `PATCH /portfolio/:portfolioId/units/:id`, `GET /portfolio`, `POST /portfolio`).

El módulo se integra con la estructura frontend ya implementada por los specs `explore-properties-frontend` y `users-auth-frontend`, reutilizando el Sistema_Diseño (tokens de color, tipografía, espaciado), componentes compartidos (Header, SideMenu, Button, Skeleton, EmptyState, ErrorState, Pagination), el AuthProvider y el AuthService.

El diseño visual de referencia se encuentra en Figma: `https://www.figma.com/design/Yw53CFbVdMWVX7bQ6MFefk/properties_rental_platform_design`

**Alcance:** Página de listado de portafolios (`/mi-portafolio`), página de creación de unidad enriquecida (`/mi-portafolio/[portfolioId]/agregar-unidad`), página de edición de unidad de portafolio (`/mi-portafolio/[id]/editar`), página de detalle de unidad de portafolio (`/mi-portafolio/[id]`), servicio de integración con API backend (PortfolioService), tipos TypeScript del módulo, validación client-side de formularios, protección de rutas por rol LANDLORD e integración con el Menú_Lateral existente.

**Fuera de alcance:** Creación de inmuebles (Property) en el esquema `property_listings` (se asume que el `propertyId` ya existe), gestión de fotos de inmuebles, publicación de listings, gestión de contratos, gestión de pagos, notificaciones.

---

## Glosario

- **App_Frontend**: La aplicación Next.js (App Router) existente en `src/frontend/` que implementa la interfaz de usuario de la plataforma.
- **Módulo_Portafolio**: Conjunto de páginas, componentes, servicios y tipos ubicados en `src/frontend/modules/landlord-portfolio/` y `src/frontend/app/mi-portafolio/`.
- **Página_Portafolio**: Página protegida accesible en la ruta `/mi-portafolio` que muestra el listado de unidades de portafolio del arrendador autenticado.
- **Página_Nueva_Unidad**: La antigua página `/mi-portafolio/nueva-unidad` fue reemplazada por la página de creación enriquecida en `/mi-portafolio/[portfolioId]/agregar-unidad`. La ruta antigua redirige a `/mi-portafolio`.
- **Página_Editar_Unidad**: Página protegida accesible en la ruta `/mi-portafolio/[id]/editar` que permite al arrendador modificar los datos de una unidad de portafolio existente.
- **Página_Detalle_Unidad**: Página protegida accesible en la ruta `/mi-portafolio/[id]` que muestra la información completa de una unidad de portafolio, incluyendo los arriendos asociados.
- **Tarjeta_Unidad**: Componente visual que representa una unidad de portafolio en el listado, mostrando el identificador del inmueble, el canon base, la moneda y las condiciones.
- **Formulario_Unidad**: Formulario reutilizable para crear y editar unidades de portafolio con campos: ID del inmueble, canon base, moneda y condiciones.
- **PortfolioService**: Capa de abstracción en `src/frontend/shared/services/` que encapsula las llamadas HTTP a los endpoints del portafolio del API_Backend.
- **API_Backend**: El servidor NestJS que expone los endpoints REST `GET /portfolio` (listar portafolios), `POST /portfolio` (crear portafolio), `GET /portfolio/:portfolioId/units`, `POST /portfolio/:portfolioId/units` y `PATCH /portfolio/:portfolioId/units/:id`.
- **Token_JWT**: Token de acceso JSON Web Token utilizado para autenticar peticiones protegidas.
- **AuthProvider**: Componente React Context existente que gestiona el estado de autenticación global.
- **Menú_Lateral**: Componente SideMenu existente que muestra navegación contextual según el estado de autenticación del usuario.
- **Sistema_Diseño**: Tokens de diseño ya configurados en `tailwind.config.ts` (colores, tipografía, espaciado) y componentes compartidos (Button, Header, Skeleton, EmptyState, ErrorState, Pagination).
- **Unidad_Portafolio**: Registro que asocia un inmueble (Property) al portafolio de un arrendador, con canon base de arrendamiento, moneda y condiciones especiales.
- **Arriendo**: Registro de un contrato de arriendo (Lease) asociado a una unidad de portafolio, con arrendatario, fecha de inicio y fecha de fin.
- **Arrendador**: Usuario autenticado con rol LANDLORD que gestiona inmuebles en arriendo.
- **ProtectedRoute**: Componente existente que verifica la autenticación antes de renderizar contenido protegido.

---

## Requisitos

### Requisito 1: Servicio de Integración con API Backend (PortfolioService)

**User Story:** Como desarrollador, quiero una capa de abstracción para las llamadas a los endpoints del portafolio del backend, para mantener el código organizado y facilitar el manejo de errores.

#### Criterios de Aceptación

1. THE PortfolioService SHALL encapsular las llamadas HTTP al API_Backend en funciones tipadas con TypeScript para los endpoints `GET /portfolio` (listar portafolios), `POST /portfolio` (crear portafolio), `GET /portfolio/:portfolioId/units`, `POST /portfolio/:portfolioId/units` y `PATCH /portfolio/:portfolioId/units/:id`.
2. THE PortfolioService SHALL utilizar la variable de entorno `NEXT_PUBLIC_API_URL` como URL base para todas las solicitudes al API_Backend.
3. THE PortfolioService SHALL adjuntar el header `Authorization: Bearer <token>` en todas las peticiones HTTP, obteniendo el token desde `localStorage` bajo la clave `auth_token`.
4. THE PortfolioService SHALL definir interfaces TypeScript que reflejen la estructura de las peticiones y respuestas: `PortfolioUnit` (id, portfolioId, propertyId, conditions, leaseBaseAmount, leaseBaseCurrency, createdAt, updatedAt), `CreatePortfolioUnitRequest` (propertyId, leaseBaseAmount, leaseBaseCurrency, conditions) y `UpdatePortfolioUnitRequest` (conditions, leaseBaseAmount, leaseBaseCurrency), todos los campos de actualización opcionales.
5. IF una solicitud HTTP al API_Backend falla con código 401, THEN THE PortfolioService SHALL propagar un error con el mensaje "Sesión expirada".
6. IF una solicitud HTTP al API_Backend falla con código 403, THEN THE PortfolioService SHALL propagar un error con el mensaje "No tienes permiso para realizar esta acción".
7. IF una solicitud HTTP al API_Backend falla con código 404, THEN THE PortfolioService SHALL propagar un error con el mensaje "Unidad de portafolio no encontrada".
8. IF una solicitud HTTP al API_Backend falla por error de red o error del servidor (5xx), THEN THE PortfolioService SHALL propagar un error con el mensaje "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo." para errores de red, o "Error del servidor. Intenta de nuevo más tarde." para errores 5xx.
9. THE PortfolioService SHALL utilizar la API nativa `fetch` para las solicitudes HTTP, consistente con el patrón establecido en el AuthService y Servicio_API existentes.

---

### Requisito 2: Página de Listado de Portafolio

**User Story:** Como arrendador autenticado, quiero ver un listado de todas las unidades de mi portafolio al acceder a la sección "Mi portafolio", para tener una visión general de mis inmuebles en arriendo.

#### Criterios de Aceptación

1. WHEN un Arrendador accede a la ruta `/mi-portafolio`, THE Página_Portafolio SHALL solicitar el listado de portafolios al API_Backend mediante `GET /portfolio` con el Token_JWT en el header de autorización y mostrar los resultados como una lista de tarjetas de portafolio.
2. THE Página_Portafolio SHALL incluir un encabezado fijo con borde inferior que contenga un botón de menú hamburguesa a la izquierda y el título "Mi portafolio" centrado, siguiendo la jerarquía tipográfica H1 (32px Bold, color `#111827`) del Sistema_Diseño.
3. THE Página_Portafolio SHALL incluir un botón primario "+ Crear nuevo portafolio" debajo del encabezado que muestre un formulario inline para crear un nuevo portafolio con nombre y descripción.
4. WHILE el listado de unidades se está cargando desde el API_Backend, THE Página_Portafolio SHALL mostrar un indicador de carga visual (skeleton) que comunique al usuario que los datos están siendo obtenidos.
5. IF el API_Backend retorna un listado vacío, THEN THE Página_Portafolio SHALL mostrar un mensaje claro en español indicando que el arrendador no tiene unidades en su portafolio, junto con una sugerencia de agregar una nueva unidad.
6. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Portafolio SHALL mostrar un mensaje de error comprensible en español con una opción para reintentar la carga.
7. IF el Token_JWT es inválido o ha expirado (error 401), THEN THE Página_Portafolio SHALL invocar la función `logout` del AuthProvider, lo cual redirigirá al usuario a la Página_Login.
8. THE Página_Portafolio SHALL ser accesible únicamente para usuarios autenticados con rol LANDLORD; IF un usuario sin rol LANDLORD accede a la ruta, THEN THE Página_Portafolio SHALL mostrar un mensaje indicando que no tiene permisos para acceder a esta sección.
9. THE Página_Portafolio SHALL utilizar un layout de una sola columna en dispositivos móviles, siguiendo el enfoque mobile-first del Sistema_Diseño.

---

### Requisito 3: Tarjeta de Unidad de Portafolio

**User Story:** Como arrendador, quiero ver una tarjeta visual por cada unidad de mi portafolio con el identificador del inmueble, el canon base y las condiciones, para evaluar rápidamente el estado de mis inmuebles.

#### Criterios de Aceptación

1. THE Tarjeta_Unidad SHALL renderizarse como un contenedor con borde (`#d1d5db`), border-radius de 6px, sombra sutil (`0px 1px 2px rgba(0,0,0,0.05)`), fondo blanco y padding de 16px, conforme al Sistema_Diseño.
2. THE Tarjeta_Unidad SHALL mostrar el canon base de arrendamiento formateado en pesos colombianos (COP) con separador de miles de punto (ejemplo: "$1.200.000") usando tipografía H3 (20px SemiBold, color primario `#1d4ed8`), seguido de la etiqueta "/mes" en tipografía Caption (14px Regular, color `#4b5563`).
3. THE Tarjeta_Unidad SHALL mostrar la moneda del canon (leaseBaseCurrency) como un badge compacto con fondo `#f3f4f6` y border-radius 4px, usando tipografía Caption (14px Regular, color `#4b5563`).
4. THE Tarjeta_Unidad SHALL mostrar las condiciones especiales del arrendamiento en tipografía Body (16px Regular, color `#4b5563`); IF las condiciones son nulas o vacías, THEN THE Tarjeta_Unidad SHALL mostrar el texto "Sin condiciones especiales" en tipografía Caption (14px Regular, color `#4b5563`).
5. THE Tarjeta_Unidad SHALL mostrar la fecha de creación de la unidad en formato relativo en español (ej. "Agregado hace 3 días") usando tipografía Caption (14px Regular, color `#4b5563`).
6. THE Tarjeta_Unidad SHALL ser un enlace navegable que dirija al arrendador a la Página_Detalle_Unidad correspondiente (`/mi-portafolio/[id]`).
7. THE Tarjeta_Unidad SHALL tener un área táctil mínima de 44x44 píxeles para cumplir con los criterios de accesibilidad WCAG 2.1 AA.

---

### Requisito 4: Página de Creación de Unidad de Portafolio

**User Story:** Como arrendador autenticado, quiero agregar una nueva unidad a mi portafolio proporcionando el ID del inmueble, el canon base, la moneda y las condiciones, para gestionar un nuevo inmueble en arriendo.

#### Criterios de Aceptación

1. WHEN un Arrendador accede a la ruta `/mi-portafolio/nueva-unidad`, THE Página_Nueva_Unidad SHALL redirigir automáticamente a la Página_Portafolio (`/mi-portafolio`). La creación de unidades se realiza ahora desde la ruta `/mi-portafolio/[portfolioId]/agregar-unidad` con el formulario enriquecido.
2. THE Página_Nueva_Unidad SHALL incluir un encabezado con el título "Agregar unidad" centrado, siguiendo la jerarquía tipográfica H1 (32px Bold, color `#111827`) del Sistema_Diseño, y un botón de retorno (flecha izquierda) que navegue a la Página_Portafolio.
3. THE Formulario_Unidad SHALL validar en el cliente que el campo ID del inmueble (propertyId) no esté vacío; IF el campo está vacío, THEN SHALL mostrar el mensaje "El ID del inmueble es obligatorio" debajo del campo.
4. THE Formulario_Unidad SHALL validar en el cliente que el campo canon base (leaseBaseAmount) no esté vacío, sea un número y sea mayor o igual a cero; IF el campo está vacío, THEN SHALL mostrar "El canon base es obligatorio"; IF el valor no es un número válido, THEN SHALL mostrar "Ingresa un valor numérico válido"; IF el valor es negativo, THEN SHALL mostrar "El canon base debe ser mayor o igual a cero".
5. THE Formulario_Unidad SHALL validar en el cliente que el campo moneda (leaseBaseCurrency) no esté vacío y contenga exactamente 3 caracteres alfabéticos (código ISO 4217); IF el campo está vacío, THEN SHALL mostrar "La moneda es obligatoria"; IF no tiene exactamente 3 caracteres, THEN SHALL mostrar "La moneda debe tener exactamente 3 caracteres (ej. COP)".
6. THE Formulario_Unidad SHALL validar en el cliente todos los campos requeridos antes de enviar la solicitud al API_Backend, mostrando mensajes de error descriptivos en español debajo de cada campo afectado (tipografía Caption 14px, color de estado error), resaltando visualmente el borde del campo con color de error. Los mensajes de error SHALL desaparecer cuando el usuario corrige el valor del campo correspondiente.
7. THE Formulario_Unidad SHALL incluir un botón primario "Guardar unidad" (fondo `#1d4ed8`, texto blanco, ancho completo) que envíe los datos al API_Backend mediante `POST /portfolio/:portfolioId/units`.
8. WHILE la solicitud de creación se está procesando, THE Formulario_Unidad SHALL deshabilitar el botón "Guardar unidad" y mostrar un indicador de carga para comunicar al usuario que la operación está en progreso.
9. WHEN el API_Backend retorna una respuesta exitosa de creación, THE Página_Nueva_Unidad SHALL mostrar un mensaje de confirmación en español y redirigir al arrendador a la Página_Portafolio.
10. IF el API_Backend retorna un error 403 (acceso denegado), THEN THE Página_Nueva_Unidad SHALL mostrar un mensaje de error "No tienes permiso para realizar esta acción" y preservar los datos del formulario.
11. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Nueva_Unidad SHALL mostrar un mensaje de error comprensible en español indicando que no se pudo completar la operación, preservando todos los datos ingresados.
12. THE Página_Nueva_Unidad SHALL ser accesible únicamente para usuarios autenticados con rol LANDLORD.

---

### Requisito 5: Página de Edición de Unidad de Portafolio

**User Story:** Como arrendador autenticado, quiero editar los datos de una unidad existente de mi portafolio (condiciones, canon base, moneda), para mantener actualizada la información de mis inmuebles en arriendo.

#### Criterios de Aceptación

1. WHEN un Arrendador accede a la ruta `/mi-portafolio/[id]/editar`, THE Página_Editar_Unidad SHALL solicitar los datos actuales de la unidad al API_Backend y pre-poblar el Formulario_Unidad con los valores existentes (conditions, leaseBaseAmount, leaseBaseCurrency).
2. THE Página_Editar_Unidad SHALL incluir un encabezado con el título "Editar unidad" centrado, siguiendo la jerarquía tipográfica H1 (32px Bold, color `#111827`) del Sistema_Diseño, y un botón de retorno (flecha izquierda) que navegue a la Página_Detalle_Unidad.
3. THE Formulario_Unidad en modo edición SHALL mostrar el campo ID del inmueble (propertyId) como solo lectura, ya que el inmueble asociado no puede cambiarse después de la creación.
4. THE Formulario_Unidad en modo edición SHALL aplicar las mismas reglas de validación client-side que en modo creación para los campos editables (leaseBaseAmount, leaseBaseCurrency, conditions).
5. THE Formulario_Unidad en modo edición SHALL incluir un botón primario "Guardar cambios" que envíe únicamente los campos modificados al API_Backend mediante `PATCH /portfolio/:portfolioId/units/:id`.
6. WHILE la solicitud de actualización se está procesando, THE Formulario_Unidad SHALL deshabilitar el botón "Guardar cambios" y mostrar un indicador de carga.
7. WHEN el API_Backend retorna una respuesta exitosa de actualización, THE Página_Editar_Unidad SHALL mostrar un mensaje de confirmación en español y redirigir al arrendador a la Página_Detalle_Unidad.
8. IF el API_Backend retorna un error 404 (unidad no encontrada), THEN THE Página_Editar_Unidad SHALL mostrar un mensaje de error "Unidad de portafolio no encontrada" con un enlace para regresar a la Página_Portafolio.
9. IF el API_Backend retorna un error 403 (acceso denegado), THEN THE Página_Editar_Unidad SHALL mostrar un mensaje de error "No tienes permiso para editar esta unidad".
10. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Editar_Unidad SHALL mostrar un mensaje de error comprensible en español, preservando los datos del formulario.
11. WHILE los datos actuales de la unidad se están cargando desde el API_Backend, THE Página_Editar_Unidad SHALL mostrar un indicador de carga visual (skeleton) en el formulario.
12. THE Página_Editar_Unidad SHALL ser accesible únicamente para usuarios autenticados con rol LANDLORD.

---

### Requisito 6: Página de Detalle de Unidad de Portafolio

**User Story:** Como arrendador autenticado, quiero ver la información completa de una unidad de mi portafolio, incluyendo los arriendos asociados, para tener visibilidad del estado de cada inmueble.

#### Criterios de Aceptación

1. WHEN un Arrendador accede a la ruta `/mi-portafolio/[id]`, THE Página_Detalle_Unidad SHALL solicitar los datos de la unidad al API_Backend y mostrar la información completa.
2. THE Página_Detalle_Unidad SHALL incluir un encabezado fijo con borde inferior que contenga un botón de retorno (flecha izquierda) que navegue a la Página_Portafolio y el título "Detalle de unidad" centrado (32px Bold, color `#111827`).
3. THE Página_Detalle_Unidad SHALL mostrar el canon base formateado como "$X/mes" en tipografía H2 (24px Bold, color primario `#1d4ed8`).
4. THE Página_Detalle_Unidad SHALL mostrar la moneda del canon como un badge compacto con fondo `#f3f4f6`, border-radius 4px, tipografía Caption (14px Regular, color `#4b5563`).
5. THE Página_Detalle_Unidad SHALL mostrar una sección "Condiciones" con título H3 (20px SemiBold) y el texto de condiciones en 16px Regular color `#4b5563`; IF las condiciones son nulas o vacías, THEN SHALL mostrar "Sin condiciones especiales".
6. THE Página_Detalle_Unidad SHALL mostrar una sección "Información" con la fecha de creación y la fecha de última actualización de la unidad, formateadas en español.
7. THE Página_Detalle_Unidad SHALL incluir un botón primario "Editar unidad" que navegue a la Página_Editar_Unidad (`/mi-portafolio/[id]/editar`).
8. IF el API_Backend retorna un error 404 para la unidad solicitada, THEN THE Página_Detalle_Unidad SHALL mostrar un mensaje claro en español indicando que la unidad no fue encontrada, con un enlace para regresar a la Página_Portafolio.
9. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Detalle_Unidad SHALL mostrar un mensaje de error comprensible en español con una opción para reintentar la carga.
10. WHILE los datos de la unidad se están cargando desde el API_Backend, THE Página_Detalle_Unidad SHALL mostrar un indicador de carga visual (skeleton).
11. IF el Token_JWT es inválido o ha expirado (error 401), THEN THE Página_Detalle_Unidad SHALL invocar la función `logout` del AuthProvider.
12. THE Página_Detalle_Unidad SHALL ser accesible únicamente para usuarios autenticados con rol LANDLORD.

---

### Requisito 7: Protección de Rutas por Rol LANDLORD

**User Story:** Como plataforma, quiero que las páginas del portafolio del arrendador solo sean accesibles para usuarios autenticados con rol LANDLORD, para garantizar que solo arrendadores gestionen su portafolio.

#### Criterios de Aceptación

1. WHEN un Usuario_Anónimo intenta acceder a cualquier ruta bajo `/mi-portafolio`, THE App_Frontend SHALL redirigir automáticamente a la Página_Login (`/auth/login`).
2. WHEN un usuario autenticado sin rol LANDLORD intenta acceder a cualquier ruta bajo `/mi-portafolio`, THE App_Frontend SHALL mostrar un mensaje indicando que no tiene permisos para acceder a esta sección, con un enlace para regresar a la página de exploración (`/explorar`).
3. THE Módulo_Portafolio SHALL implementar un componente o mecanismo de protección de rutas que verifique tanto la autenticación como el rol LANDLORD del usuario en el AuthProvider antes de renderizar el contenido.
4. WHILE el AuthProvider está verificando el estado de autenticación durante la carga inicial, THE Módulo_Portafolio SHALL mostrar un indicador de carga en las rutas protegidas en lugar de redirigir prematuramente.

---

### Requisito 8: Integración con Menú Lateral

**User Story:** Como arrendador autenticado, quiero que el enlace "Mis arriendos" del menú lateral me lleve a mi portafolio, para acceder fácilmente a la gestión de mis inmuebles.

#### Criterios de Aceptación

1. THE Menú_Lateral SHALL actualizar el enlace "Mis arriendos" para que navegue a la ruta `/mi-portafolio` en lugar de `/mis-arriendos`.
2. WHEN un Arrendador navega a la Página_Portafolio desde el Menú_Lateral, THE Página_Portafolio SHALL cargarse correctamente mostrando el listado de unidades del arrendador.

---

### Requisito 9: Validación Client-Side de Formularios

**User Story:** Como arrendador, quiero recibir retroalimentación inmediata cuando ingreso datos incorrectos en los formularios del portafolio, para corregir errores antes de enviar la solicitud al servidor.

#### Criterios de Aceptación

1. THE Módulo_Portafolio SHALL implementar funciones de validación puras en un archivo `validation.ts` que validen cada campo del Formulario_Unidad y retornen `null` si el valor es válido o un mensaje de error en español si es inválido.
2. THE Módulo_Portafolio SHALL validar el campo propertyId: no vacío; IF vacío, THEN retornar "El ID del inmueble es obligatorio".
3. THE Módulo_Portafolio SHALL validar el campo leaseBaseAmount: no vacío, numérico, mayor o igual a cero; IF vacío, THEN retornar "El canon base es obligatorio"; IF no numérico, THEN retornar "Ingresa un valor numérico válido"; IF negativo, THEN retornar "El canon base debe ser mayor o igual a cero".
4. THE Módulo_Portafolio SHALL validar el campo leaseBaseCurrency: no vacío, exactamente 3 caracteres alfabéticos; IF vacío, THEN retornar "La moneda es obligatoria"; IF no tiene exactamente 3 caracteres alfabéticos, THEN retornar "La moneda debe tener exactamente 3 caracteres (ej. COP)".
5. FOR ALL cadenas de texto, la función `validatePropertyId` SHALL retornar `null` si y solo si la cadena no está vacía después de eliminar espacios en blanco (round-trip: validar → corregir → validar produce resultado consistente).
6. FOR ALL valores numéricos, la función `validateLeaseBaseAmount` SHALL retornar `null` si y solo si el valor es un número finito mayor o igual a cero; para cualquier otro valor (NaN, Infinity, negativo, cadena no numérica) SHALL retornar el mensaje de error correspondiente.
7. FOR ALL cadenas de texto, la función `validateLeaseBaseCurrency` SHALL retornar `null` si y solo si la cadena consiste exactamente en 3 caracteres alfabéticos (mayúsculas o minúsculas); para cualquier otra cadena SHALL retornar el mensaje de error correspondiente.

---

### Requisito 10: Accesibilidad WCAG 2.1 AA en Módulo de Portafolio

**User Story:** Como arrendador con diversas capacidades, quiero que las páginas del portafolio sean accesibles y legibles, para poder gestionar mis inmuebles sin barreras de interacción.

#### Criterios de Aceptación

1. THE Módulo_Portafolio SHALL garantizar que todos los campos de formulario (creación, edición) tengan etiquetas (`label`) asociadas programáticamente mediante el atributo `htmlFor` o `aria-label`.
2. THE Módulo_Portafolio SHALL garantizar que todos los mensajes de error de validación estén asociados a sus campos correspondientes mediante `aria-describedby` y sean anunciados a tecnologías asistivas mediante `aria-live="polite"`.
3. THE Módulo_Portafolio SHALL garantizar que todos los elementos interactivos (botones, enlaces, campos de formulario, tarjetas) tengan un área táctil mínima de 44x44 píxeles.
4. THE Módulo_Portafolio SHALL garantizar que la navegación por teclado funcione correctamente en todos los formularios: Tab para avanzar entre campos, Shift+Tab para retroceder, Enter para enviar el formulario.
5. THE Módulo_Portafolio SHALL aplicar la paleta de colores del Sistema_Diseño garantizando un contraste mínimo de 4.5:1 entre texto y fondo para texto normal, y de 3:1 para texto grande.
6. THE Módulo_Portafolio SHALL utilizar elementos HTML semánticos (`main`, `section`, `article`, `h1`-`h3`) para estructurar el contenido de cada página.
7. THE Módulo_Portafolio SHALL utilizar atributos ARIA (`aria-live`, `aria-busy`, `role="alert"`) para comunicar estados dinámicos como la carga de datos, mensajes de éxito y errores a tecnologías asistivas.
