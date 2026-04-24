# Documento de Requisitos — Flujos del Arrendatario (Frontend)

## Introducción

Este documento especifica los requisitos para la implementación de los flujos frontend del arrendatario (tenant) en la plataforma de gestión de arriendo de vivienda urbana en Colombia (Valle del Cauca). Actualmente, el arrendatario puede explorar inmuebles de forma anónima, registrarse, iniciar sesión y ver su perfil, pero no cuenta con pantallas autenticadas propias para gestionar su ciclo de arriendo.

Este spec cubre las siguientes funcionalidades para el arrendatario autenticado:

1. **Mis Arriendos** — Listado de arriendos del arrendatario con su estado actual, funcionando como página principal post-login del arrendatario. Incluye detalle de cada arriendo (propiedad, arrendador, fechas, estado del proceso de arriendo).
2. **Mis Contratos** — Listado de contratos asociados a los arriendos del arrendatario, visualización de archivos de contrato y estado de firma.
3. **Mis Pagos** — Pagos programados, historial de pagos, inicio de pago vía pasarela externa (stub) y comprobantes.
4. **Contactar Arrendador** — Flujo de contacto desde la página de detalle del inmueble que transiciona el estado del arriendo a `CONTACT_INITIATED`.
5. **Navegación del arrendatario** — Actualización del Menú Lateral para mostrar enlaces contextuales según el rol del usuario.

El frontend se implementa como parte de la aplicación Next.js (App Router) existente en `src/frontend/`, con Tailwind CSS y TypeScript, siguiendo un enfoque mobile-first y cumpliendo con los criterios de accesibilidad WCAG 2.1 AA. La interfaz se presenta en idioma español y consume los endpoints REST del backend NestJS existente.

El módulo se integra con la estructura frontend ya implementada, reutilizando el Sistema_Diseño (tokens de color, tipografía, espaciado), componentes compartidos (Header, SideMenu, StatusBadge, ErrorState, Skeleton, Pagination, ConfirmationDialog) y la capa de servicios API existente.

**Fuera de alcance:** Creación de arriendos por parte del arrendatario (lo hace el arrendador), carga de contratos (lo hace el arrendador), firma digital real (MVP usa stub), integración real con pasarela de pagos (MVP usa stub), notificaciones push/email, edición de perfil.

---

## Glosario

- **App_Frontend**: La aplicación Next.js (App Router) existente en `src/frontend/` que implementa la interfaz de usuario de la plataforma.
- **Módulo_Arrendatario**: Conjunto de páginas, componentes y servicios ubicados en `src/frontend/modules/tenant/` y las rutas correspondientes en `src/frontend/app/`.
- **Página_Arriendos**: Página protegida accesible en la ruta `/mis-arriendos` que lista todos los arriendos del arrendatario con su estado actual, funcionando como página principal post-login del arrendatario.
- **Página_Detalle_Arriendo**: Página protegida accesible en la ruta `/mis-arriendos/[id]` que muestra la información completa de un arriendo específico.
- **Página_Contratos_Arrendatario**: Página protegida accesible en la ruta `/mis-contratos-arrendatario` que lista los contratos asociados a los arriendos del arrendatario.
- **Página_Detalle_Contrato_Arrendatario**: Página protegida accesible en la ruta `/mis-contratos-arrendatario/[id]` que muestra el detalle de un contrato específico.
- **Página_Pagos**: Página protegida accesible en la ruta `/mis-pagos` que muestra los pagos programados y el historial de pagos del arrendatario.
- **Servicio_Arrendatario**: Capa de abstracción en `src/frontend/shared/services/` que encapsula las llamadas HTTP a los endpoints del backend orientados al arrendatario.
- **API_Backend**: El servidor NestJS que expone los endpoints REST consumidos por el frontend.
- **API_Tracking**: Endpoints del módulo `rental-tracking` del backend: `GET /tracking/leases/active`, `GET /tracking/leases/:leaseId/status`.
- **API_Payments**: Endpoints del módulo `payments` del backend: `GET /payments/history`, `POST /payments/initiate`.
- **API_Contracts**: Endpoints del módulo `contracts` del backend: `GET /contracts/:id`, `GET /contracts/tenant`.
- **Token_JWT**: Token de acceso JSON Web Token utilizado para autenticar peticiones protegidas.
- **AuthProvider**: Componente React Context existente que gestiona el estado de autenticación global.
- **Menú_Lateral**: Componente SideMenu existente que muestra navegación contextual.
- **StatusBadge**: Componente compartido existente para mostrar estados con badges de color.
- **Estado_Arriendo**: Estado del proceso de arriendo según el ciclo de vida: PUBLISHED, CONTACT_INITIATED, CONTRACT_UPLOADED, CONTRACT_SIGNED, PAYMENT_RECEIVED.
- **Pago_Programado**: Registro `ScheduledPayment` que representa un pago de canon pendiente con monto y fecha de vencimiento.
- **Pago**: Registro `Payment` que representa un pago realizado contra un pago programado.
- **Estado_Pago**: Estado del pago: PENDING, PROCESSING, PAID, REJECTED.
- **Arrendatario**: Usuario autenticado con rol TENANT.
- **Arrendador**: Usuario autenticado con rol LANDLORD.

---

## Requisitos

### Requisito 1: Servicio Frontend del Arrendatario

**User Story:** Como desarrollador, quiero una capa de abstracción para las llamadas a los endpoints del backend orientados al arrendatario, para mantener el código organizado y facilitar la evolución de la integración.

#### Criterios de Aceptación

1. THE Servicio_Arrendatario SHALL encapsular las llamadas HTTP al API_Backend en funciones tipadas con TypeScript para los endpoints: `GET /tracking/leases/active`, `GET /tracking/leases/:leaseId/status`, `GET /payments/history`, `POST /payments/initiate` y `GET /contracts/tenant`.
2. THE Servicio_Arrendatario SHALL utilizar la variable de entorno `NEXT_PUBLIC_API_URL` como URL base para todas las solicitudes al API_Backend.
3. THE Servicio_Arrendatario SHALL definir interfaces TypeScript que reflejen la estructura de las respuestas del API_Backend: `ActiveLeaseSummary` (leaseId, propertyName, currentState, lastChangedAt), `LeaseStatusResponse` (leaseId, currentState, lastChangedAt, history), `LeaseStatusHistoryItem` (id, state, recordedAt), `PaymentResponse` (id, scheduledPaymentId, amount, currency, status, dueDate, paymentDesc, createdAt) e `InitiatePaymentRequest` (scheduledPaymentId).
4. THE Servicio_Arrendatario SHALL adjuntar automáticamente el header `Authorization: Bearer <token>` en todas las peticiones, utilizando el Token_JWT almacenado.
5. IF una solicitud HTTP al API_Backend falla con código 401, THEN THE Servicio_Arrendatario SHALL propagar un error con el mensaje "Sesión expirada".
6. IF una solicitud HTTP al API_Backend falla con código 403, THEN THE Servicio_Arrendatario SHALL propagar un error con el mensaje "No tienes permiso para realizar esta acción".
7. IF una solicitud HTTP al API_Backend falla por error de red o error del servidor (5xx), THEN THE Servicio_Arrendatario SHALL propagar un error con un mensaje descriptivo en español que permita a los componentes consumidores mostrar retroalimentación adecuada al usuario.
8. THE Servicio_Arrendatario SHALL utilizar la API nativa `fetch` para las solicitudes HTTP, consistente con el patrón establecido en los servicios existentes (`contractService`, `leaseService`).

---

### Requisito 2: Endpoint Backend — Listar Contratos del Arrendatario

**User Story:** Como arrendatario, necesito que el backend exponga un endpoint para obtener los contratos asociados a mis arriendos, para poder visualizarlos en el frontend.

**Nota:** Este requisito implica un nuevo endpoint en el backend que debe ser implementado antes de la pantalla frontend correspondiente.

#### Criterios de Aceptación

1. THE API_Contracts SHALL exponer un endpoint `GET /contracts/tenant` protegido con JWT que retorne la lista de contratos donde el usuario autenticado es parte con rol de arrendatario (`ContractParty.role_in_contract = 'TENANT'`).
2. THE API_Contracts SHALL retornar para cada contrato: id, leaseId, status (PENDING, SIGNATURE_PENDING, SIGNED), startDate, endDate, unitName (nombre de la unidad del portafolio asociada al lease) y landlordName (nombre del arrendador).
3. THE API_Contracts SHALL resolver el nombre de la unidad mediante la cadena `Contract.lease_id → Lease.portfolio_unit_id → PortfolioUnit.name`.
4. THE API_Contracts SHALL resolver el nombre del arrendador mediante la cadena `ContractParty (role_in_contract = 'LANDLORD') → User → NaturalPersonDetail.first_name + last_name` o `LegalPersonDetail.business_name`, desencriptando los campos PII necesarios.
5. IF el usuario autenticado no tiene rol TENANT, THEN THE API_Contracts SHALL retornar un arreglo vacío.
6. THE API_Contracts SHALL ordenar los contratos por fecha de creación descendente (más recientes primero).

---

### Requisito 3: Página de Arriendos del Arrendatario

**User Story:** Como arrendatario autenticado, quiero ver un listado de mis arriendos activos con su estado actual al acceder a la plataforma, para tener una visión general de mi situación de arriendo.

#### Criterios de Aceptación

1. WHEN un arrendatario autenticado accede a la ruta `/mis-arriendos`, THE Página_Arriendos SHALL solicitar la lista de arriendos activos al API_Backend mediante `GET /tracking/leases/active` y mostrar los resultados como tarjetas.
2. THE Página_Arriendos SHALL incluir un encabezado con botón de menú hamburguesa a la izquierda y el título "Mis arriendos" centrado, siguiendo la jerarquía tipográfica H1 del Sistema_Diseño.
3. THE Página_Arriendos SHALL mostrar cada arriendo como una tarjeta con borde (`#d1d5db`), border-radius 6px, fondo blanco y padding 16px, que incluya: nombre de la propiedad (tipografía H3, color `#111827`), estado actual del proceso de arriendo como badge de color usando el componente StatusBadge, y fecha del último cambio de estado en formato relativo en español (ej. "Hace 3 días").
4. THE Página_Arriendos SHALL traducir los estados del proceso de arriendo a español para mostrarlos en el StatusBadge: PUBLISHED → "Publicado", CONTACT_INITIATED → "Contacto iniciado", CONTRACT_UPLOADED → "Contrato cargado", CONTRACT_SIGNED → "Contrato firmado", PAYMENT_RECEIVED → "Pago recibido".
5. WHEN el arrendatario presiona una tarjeta de arriendo, THE Página_Arriendos SHALL navegar a la Página_Detalle_Arriendo (`/mis-arriendos/[leaseId]`).
6. WHILE la lista de arriendos se está cargando, THE Página_Arriendos SHALL mostrar un indicador de carga visual (skeleton) que comunique al usuario que los datos están siendo obtenidos.
7. IF el API_Backend retorna una lista vacía, THEN THE Página_Arriendos SHALL mostrar un mensaje en español indicando que el arrendatario no tiene arriendos activos, con una sugerencia de explorar inmuebles disponibles y un enlace a `/explorar`.
8. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Arriendos SHALL mostrar un componente ErrorState con opción para reintentar la carga.
9. THE Página_Arriendos SHALL ser accesible únicamente para usuarios autenticados con rol TENANT; IF un usuario anónimo accede a la ruta, THEN SHALL ser redirigido a `/auth/login`.

---

### Requisito 4: Página de Detalle del Arriendo

**User Story:** Como arrendatario, quiero ver la información completa de un arriendo específico, incluyendo el estado del proceso, datos de la propiedad e historial de estados, para hacer seguimiento detallado de mi arriendo.

#### Criterios de Aceptación

1. WHEN un arrendatario autenticado accede a la ruta `/mis-arriendos/[id]`, THE Página_Detalle_Arriendo SHALL solicitar el estado e historial del arriendo al API_Backend mediante `GET /tracking/leases/:leaseId/status` y mostrar los datos obtenidos.
2. THE Página_Detalle_Arriendo SHALL incluir un encabezado con botón de retorno (flecha izquierda, patrón `<Link>` con clase `rounded-card`) que navegue a `/mis-arriendos` y el título "Detalle del arriendo" centrado.
3. THE Página_Detalle_Arriendo SHALL mostrar una sección de estado actual con el estado del proceso de arriendo como badge de color (StatusBadge) y la fecha del último cambio de estado.
4. THE Página_Detalle_Arriendo SHALL mostrar una sección "Progreso del arriendo" con una línea de tiempo vertical que visualice los estados del ciclo de arriendo (Publicado → Contacto iniciado → Contrato cargado → Contrato firmado → Pago recibido), resaltando el estado actual y los estados completados con color primario (`#1d4ed8`) y los estados pendientes en gris (`#d1d5db`).
5. THE Página_Detalle_Arriendo SHALL mostrar una sección "Historial" con la lista de transiciones de estado ordenadas cronológicamente (más reciente primero), mostrando para cada entrada: el nombre del estado en español, la fecha y hora formateadas.
6. WHILE los datos del arriendo se están cargando, THE Página_Detalle_Arriendo SHALL mostrar un indicador de carga visual (skeleton).
7. IF la solicitud al API_Backend falla con código 404, THEN THE Página_Detalle_Arriendo SHALL mostrar un mensaje indicando que el arriendo no fue encontrado, con un enlace para regresar a `/mis-arriendos`.
8. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Detalle_Arriendo SHALL mostrar un componente ErrorState con opción para reintentar la carga.

---

### Requisito 5: Página de Contratos del Arrendatario

**User Story:** Como arrendatario, quiero ver la lista de contratos asociados a mis arriendos, para conocer el estado de formalización de cada uno.

#### Criterios de Aceptación

1. WHEN un arrendatario autenticado accede a la ruta `/mis-contratos-arrendatario`, THE Página_Contratos_Arrendatario SHALL solicitar la lista de contratos al API_Backend mediante `GET /contracts/tenant` y mostrar los resultados como tarjetas.
2. THE Página_Contratos_Arrendatario SHALL incluir un encabezado con botón de menú hamburguesa a la izquierda y el título "Mis contratos" centrado.
3. THE Página_Contratos_Arrendatario SHALL mostrar cada contrato como una tarjeta con: nombre de la unidad (tipografía H3), nombre del arrendador (tipografía Caption, color `#4b5563`), estado del contrato como badge de color usando StatusBadge con variante `contract`, y fechas de inicio y fin del contrato.
4. WHEN el arrendatario presiona una tarjeta de contrato, THE Página_Contratos_Arrendatario SHALL navegar a la Página_Detalle_Contrato_Arrendatario (`/mis-contratos-arrendatario/[id]`).
5. WHILE la lista de contratos se está cargando, THE Página_Contratos_Arrendatario SHALL mostrar un indicador de carga visual (skeleton).
6. IF el API_Backend retorna una lista vacía, THEN THE Página_Contratos_Arrendatario SHALL mostrar un mensaje en español indicando que el arrendatario no tiene contratos asociados.
7. IF la solicitud al API_Backend falla, THEN THE Página_Contratos_Arrendatario SHALL mostrar un componente ErrorState con opción para reintentar la carga.
8. THE Página_Contratos_Arrendatario SHALL ser accesible únicamente para usuarios autenticados con rol TENANT.

---

### Requisito 6: Página de Detalle del Contrato del Arrendatario

**User Story:** Como arrendatario, quiero ver el detalle de un contrato específico, incluyendo el archivo PDF y el estado de firma, para revisar los términos de mi arriendo.

#### Criterios de Aceptación

1. WHEN un arrendatario autenticado accede a la ruta `/mis-contratos-arrendatario/[id]`, THE Página_Detalle_Contrato_Arrendatario SHALL solicitar el resumen del contrato al API_Backend mediante `GET /contracts/:id` y mostrar los datos obtenidos.
2. THE Página_Detalle_Contrato_Arrendatario SHALL incluir un encabezado con botón de retorno que navegue a `/mis-contratos-arrendatario` y el título "Detalle del contrato" centrado.
3. THE Página_Detalle_Contrato_Arrendatario SHALL mostrar: el estado del contrato como badge de color (StatusBadge variante `contract`), la fecha de inicio y fin del contrato, y la lista de partes del contrato con sus roles (Arrendador, Arrendatario).
4. THE Página_Detalle_Contrato_Arrendatario SHALL mostrar un enlace o botón "Ver documento" que abra el archivo PDF del contrato en una nueva pestaña del navegador utilizando la URL presignada retornada por el backend.
5. WHEN el estado del contrato es SIGNATURE_PENDING, THE Página_Detalle_Contrato_Arrendatario SHALL mostrar un mensaje informativo indicando que el contrato está en proceso de firma.
6. WHEN el estado del contrato es SIGNED, THE Página_Detalle_Contrato_Arrendatario SHALL mostrar un mensaje de confirmación indicando que el contrato ha sido firmado por todas las partes.
7. WHILE los datos del contrato se están cargando, THE Página_Detalle_Contrato_Arrendatario SHALL mostrar un indicador de carga visual (skeleton).
8. IF la solicitud al API_Backend falla con código 403, THEN THE Página_Detalle_Contrato_Arrendatario SHALL mostrar un mensaje indicando que el arrendatario no tiene permiso para ver este contrato.
9. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Detalle_Contrato_Arrendatario SHALL mostrar un componente ErrorState con opción para reintentar la carga.

---

### Requisito 7: Página de Pagos del Arrendatario

**User Story:** Como arrendatario, quiero ver mis pagos programados y mi historial de pagos, para saber cuánto debo, cuándo vence y qué pagos he realizado.

#### Criterios de Aceptación

1. WHEN un arrendatario autenticado accede a la ruta `/mis-pagos`, THE Página_Pagos SHALL solicitar el historial de pagos al API_Backend mediante `GET /payments/history` y mostrar los resultados.
2. THE Página_Pagos SHALL incluir un encabezado con botón de menú hamburguesa a la izquierda y el título "Mis pagos" centrado.
3. THE Página_Pagos SHALL mostrar cada pago como una tarjeta con: monto formateado en pesos colombianos (formato "$1.200.000" usando el helper `formatCOP`), fecha de vencimiento (dueDate) formateada en español, estado del pago como badge de color (PENDING → "Pendiente" en ámbar, PROCESSING → "Procesando" en azul, PAID → "Pagado" en verde, REJECTED → "Rechazado" en rojo), y descripción del pago cuando esté disponible.
4. WHEN un pago tiene estado PENDING, THE Página_Pagos SHALL mostrar un botón "Pagar" en la tarjeta del pago que permita al arrendatario iniciar el flujo de pago.
5. WHEN el arrendatario presiona el botón "Pagar", THE Página_Pagos SHALL enviar una solicitud `POST /payments/initiate` con el `scheduledPaymentId` correspondiente al API_Backend.
6. WHEN el API_Backend retorna una respuesta exitosa con una URL de redirección de la pasarela de pagos, THE Página_Pagos SHALL mostrar un mensaje de confirmación indicando que el pago ha sido iniciado exitosamente (dado que el MVP usa un stub que retorna APPROVED).
7. WHILE la solicitud de inicio de pago se está procesando, THE Página_Pagos SHALL deshabilitar el botón "Pagar" y mostrar un indicador de carga.
8. IF la solicitud de inicio de pago falla, THEN THE Página_Pagos SHALL mostrar un mensaje de error en español y mantener el botón "Pagar" habilitado para reintentar.
9. WHILE la lista de pagos se está cargando, THE Página_Pagos SHALL mostrar un indicador de carga visual (skeleton).
10. IF el API_Backend retorna una lista vacía, THEN THE Página_Pagos SHALL mostrar un mensaje en español indicando que el arrendatario no tiene pagos registrados.
11. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Pagos SHALL mostrar un componente ErrorState con opción para reintentar la carga.
12. THE Página_Pagos SHALL ser accesible únicamente para usuarios autenticados con rol TENANT.

---

### Requisito 8: Flujo de Contactar Arrendador

**User Story:** Como arrendatario autenticado, quiero contactar al arrendador de un inmueble que me interesa desde la página de detalle del inmueble, para iniciar el proceso de arriendo.

#### Criterios de Aceptación

1. WHEN un arrendatario autenticado presiona el botón "Contactar arrendador" en la Página_Detalle del inmueble (`/explorar/[id]`), THE App_Frontend SHALL mostrar un diálogo de confirmación preguntando al arrendatario si desea iniciar el contacto con el arrendador de este inmueble.
2. WHEN el arrendatario confirma el contacto en el diálogo, THE App_Frontend SHALL enviar una solicitud `POST /tracking/leases/transition` al API_Backend con el `leaseId` correspondiente y el `newState` como `CONTACT_INITIATED`.
3. WHEN el API_Backend retorna una respuesta exitosa, THE App_Frontend SHALL mostrar un mensaje de confirmación en español indicando que el contacto ha sido iniciado y que el arrendador será notificado.
4. WHILE la solicitud de contacto se está procesando, THE App_Frontend SHALL deshabilitar el botón "Contactar arrendador" y mostrar un indicador de carga.
5. IF el usuario no está autenticado, THEN WHEN presiona el botón "Contactar arrendador", THE App_Frontend SHALL redirigir al usuario a la Página_Login (`/auth/login`).
6. IF el usuario autenticado no tiene rol TENANT, THEN THE App_Frontend SHALL mostrar un mensaje indicando que solo los arrendatarios pueden contactar arrendadores.
7. IF la solicitud al API_Backend falla con código 404, THEN THE App_Frontend SHALL mostrar un mensaje indicando que no se encontró un arriendo asociado a este inmueble.
8. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE App_Frontend SHALL mostrar un mensaje de error comprensible en español con sugerencia de reintentar.

---

### Requisito 9: Navegación Contextual por Rol en el Menú Lateral

**User Story:** Como usuario autenticado, quiero que el menú lateral muestre enlaces de navegación relevantes a mi rol (arrendador o arrendatario), para acceder rápidamente a las secciones que me corresponden. Si tengo ambos roles, quiero ver todas las secciones disponibles.

#### Criterios de Aceptación

1. WHEN un usuario autenticado con rol TENANT abre el Menú_Lateral, THE Menú_Lateral SHALL mostrar los siguientes enlaces de navegación: "Explorar inmuebles" (`/explorar`), "Mis arriendos" (`/mis-arriendos`), "Mis contratos" (`/mis-contratos-arrendatario`), "Mis pagos" (`/mis-pagos`), "Mi perfil" (`/mi-perfil`).
2. WHEN un usuario autenticado con rol LANDLORD abre el Menú_Lateral, THE Menú_Lateral SHALL mostrar los siguientes enlaces de navegación: "Explorar inmuebles" (`/explorar`), "Mi portafolio" (`/mi-portafolio`), "Mis ingresos" (`/mis-ingresos`), "Mis contratos" (`/mis-contratos`), "Mi perfil" (`/mi-perfil`).
3. WHEN un usuario autenticado tiene ambos roles (LANDLORD y TENANT), THE Menú_Lateral SHALL mostrar la unión de los enlaces de ambos roles: "Explorar inmuebles" (`/explorar`), "Mi portafolio" (`/mi-portafolio`), "Mis arriendos" (`/mis-arriendos`), "Mis ingresos" (`/mis-ingresos`), "Mis contratos (arrendador)" (`/mis-contratos`), "Mis contratos (arrendatario)" (`/mis-contratos-arrendatario`), "Mis pagos" (`/mis-pagos`), "Mi perfil" (`/mi-perfil`).
4. THE Menú_Lateral SHALL determinar los enlaces a mostrar consultando los roles del usuario desde el AuthProvider, construyendo la lista de enlaces como la unión de los enlaces correspondientes a cada rol presente.
5. THE Menú_Lateral SHALL mantener el comportamiento actual para usuarios anónimos: mostrar únicamente "Explorar inmuebles" y opciones de iniciar sesión o registrarse.

---

### Requisito 10: Extensión del StatusBadge para Estados del Arrendatario

**User Story:** Como desarrollador, quiero que el componente StatusBadge soporte los estados del proceso de arriendo y los estados de pago del arrendatario, para mantener consistencia visual en las nuevas pantallas.

#### Criterios de Aceptación

1. THE StatusBadge SHALL soportar una nueva variante `tracking` con los siguientes mapeos de color: PUBLISHED → "Publicado" (gris, fondo `#F3F4F6`, texto `#4B5563`), CONTACT_INITIATED → "Contacto iniciado" (azul, fondo `#DBEAFE`, texto `#1E40AF`), CONTRACT_UPLOADED → "Contrato cargado" (ámbar, fondo `#FEF3C7`, texto `#92400E`), CONTRACT_SIGNED → "Contrato firmado" (verde, fondo `#DCFCE7`, texto `#166534`), PAYMENT_RECEIVED → "Pago recibido" (verde, fondo `#D1FAE5`, texto `#065F46`).
2. THE StatusBadge SHALL soportar una nueva variante `paymentStatus` con los siguientes mapeos de color: PENDING → "Pendiente" (ámbar, fondo `#FEF3C7`, texto `#92400E`), PROCESSING → "Procesando" (azul, fondo `#DBEAFE`, texto `#1E40AF`), PAID → "Pagado" (verde, fondo `#DCFCE7`, texto `#166534`), REJECTED → "Rechazado" (rojo, fondo `#FEE2E2`, texto `#991B1B`).
3. THE StatusBadge SHALL mantener compatibilidad con las variantes existentes (`lease`, `unit`, `payment`, `listing`, `contract`) sin modificar su comportamiento actual.

---

### Requisito 11: Accesibilidad WCAG 2.1 AA en Módulo del Arrendatario

**User Story:** Como usuario con diversas capacidades, quiero que las páginas del arrendatario sean accesibles, para poder gestionar mis arriendos, contratos y pagos sin barreras de interacción.

#### Criterios de Aceptación

1. THE Módulo_Arrendatario SHALL utilizar elementos HTML semánticos (`main`, `nav`, `article`, `section`, `header`, `h1`-`h6`) para estructurar el contenido de cada página.
2. THE Módulo_Arrendatario SHALL garantizar que todos los elementos interactivos (botones, enlaces, tarjetas navegables) tengan un área táctil mínima de 44x44 píxeles.
3. THE Módulo_Arrendatario SHALL garantizar que la navegación por teclado funcione correctamente en todos los elementos interactivos, con indicadores de foco visibles.
4. THE Módulo_Arrendatario SHALL utilizar atributos ARIA (`aria-live`, `aria-busy`, `role`) para comunicar estados dinámicos como la carga de datos, mensajes de éxito y errores a tecnologías asistivas.
5. THE Módulo_Arrendatario SHALL aplicar la paleta de colores del Sistema_Diseño garantizando un contraste mínimo de 4.5:1 entre texto y fondo para texto normal, y de 3:1 para texto grande.
6. THE Módulo_Arrendatario SHALL garantizar que todos los textos en la interfaz estén en idioma español.
7. THE Módulo_Arrendatario SHALL garantizar que la línea de tiempo de progreso del arriendo en la Página_Detalle_Arriendo sea accesible, comunicando el paso actual y los pasos completados a tecnologías asistivas mediante atributos `aria-current` y `aria-label`.
