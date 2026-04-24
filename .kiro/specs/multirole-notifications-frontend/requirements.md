# Documento de Requisitos — Multirole y Notificaciones (Frontend)

## Introducción

Este documento especifica los requisitos para la implementación de dos capacidades relacionadas en la plataforma de gestión de arriendo de vivienda urbana:

1. **Experiencia multirole** — Los usuarios que poseen ambos roles (LANDLORD y TENANT) necesitan una experiencia cohesiva. Actualmente el SideMenu ya muestra enlaces fusionados para usuarios con doble rol, pero no existe un mecanismo de cambio de contexto de rol. Este spec aborda la página de perfil mejorada como landing page con navegación rápida por rol, la experiencia de navegación para usuarios multirole y la redirección post-login unificada a `/mi-perfil`.

2. **Gestión de notificaciones (frontend)** — El módulo backend de notificaciones existe completamente (`SendNotificationUseCase`, `UpdateNotificationPreferencesUseCase`, `PrismaNotificationRepository`, `MessagingChannelAdapter` stub), pero no existen páginas frontend para visualizar el historial de notificaciones ni para gestionar las preferencias de notificación. Este spec cubre la creación de las páginas frontend, el servicio API, los endpoints backend faltantes y la integración con el SideMenu. **Las notificaciones in-app son el canal base siempre activo**: cada evento de notificación genera un registro in-app que el usuario puede consultar en `/mis-notificaciones`. Los canales externos (EMAIL, WHATSAPP) son opcionales y adicionales al canal in-app.

3. **Adquisición y gestión de roles** — Mecanismos para que los usuarios adquieran roles adicionales: asignación automática del rol TENANT al crear un arriendo (`CreateLeaseUseCase`), y gestión manual de roles desde la página de perfil (`/mi-perfil`) con validación de reglas de negocio que impiden eliminar roles con recursos activos vinculados.

El frontend se implementa como parte de la aplicación Next.js (App Router) existente en `src/frontend/`, con Tailwind CSS y TypeScript, siguiendo un enfoque mobile-first y cumpliendo con los criterios de accesibilidad WCAG 2.1 AA. La interfaz se presenta en idioma español y consume los endpoints REST del backend NestJS existente.

**Fuera de alcance:** Integración real con WhatsApp/email (MVP usa stub), notificaciones push en tiempo real (WebSocket), panel de administración de tipos de notificación, creación de nuevos roles más allá de LANDLORD/TENANT.

---

## Glosario

- **App_Frontend**: La aplicación Next.js (App Router) existente en `src/frontend/` que implementa la interfaz de usuario de la plataforma.
- **Módulo_Notificaciones_Frontend**: Conjunto de páginas, componentes y servicios ubicados en `src/frontend/modules/notifications/` y las rutas correspondientes en `src/frontend/app/`.
- **Servicio_Notificaciones**: Capa de abstracción en `src/frontend/shared/services/notification.ts` que encapsula las llamadas HTTP a los endpoints del backend del módulo de notificaciones.
- **API_Notificaciones**: Endpoints del módulo `notifications` del backend NestJS.
- **Página_Notificaciones**: Página protegida accesible en la ruta `/mis-notificaciones` que lista el historial de notificaciones in-app del usuario autenticado.
- **Página_Preferencias_Notificaciones**: Página protegida accesible en la ruta `/mis-notificaciones/preferencias` que permite al usuario gestionar sus preferencias de canales externos de notificación (EMAIL, WHATSAPP). Las notificaciones in-app no se gestionan aquí porque están siempre activas.
- **Sección_Navegación_Rápida**: Sección dentro de la página de perfil (`/mi-perfil`) que muestra tarjetas de navegación rápida hacia las secciones principales de la plataforma según los roles del usuario, funcionando como guía de onboarding para usuarios nuevos.
- **Menú_Lateral**: Componente SideMenu existente en `src/frontend/shared/components/SideMenu.tsx` que muestra navegación contextual según los roles del usuario.
- **Token_JWT**: Token de acceso JSON Web Token utilizado para autenticar peticiones protegidas.
- **AuthProvider**: Componente React Context existente que gestiona el estado de autenticación global, incluyendo `roles: string[]`.
- **StatusBadge**: Componente compartido existente para mostrar estados con badges de color.
- **Tipo_Notificación**: Registro `NotificationType` del catálogo backend que define los tipos de notificación disponibles (ej: CONTRACT_SIGNED, PAYMENT_RECEIVED).
- **Preferencia_Notificación**: Registro `NotificationPreference` que almacena la preferencia del usuario para un tipo de notificación y canal externo específico (EMAIL o WHATSAPP), indicando si está activa o inactiva. No aplica al canal in-app, que está siempre activo.
- **Canal_Externo**: Medio externo por el cual se envía una notificación adicionalmente al canal in-app: EMAIL o WHATSAPP. Estos canales son opcionales y configurables por el usuario.
- **Notificación_InApp**: Registro persistido que representa una notificación in-app para el usuario. Se crea siempre que ocurre un evento de notificación, independientemente de las preferencias de canales externos. Contiene: id, userId, notificationTypeId, title, message, read (booleano, default false), eventSource, data, createdAt.
- **Registro_Notificación**: Registro persistido en `NotificationsRaw` que contiene el historial de notificaciones enviadas por canales externos al usuario, incluyendo tipo, canal, estado (SENT/FAILED/PENDING) y datos del evento.
- **Usuario_Multirole**: Usuario autenticado que posee ambos roles LANDLORD y TENANT simultáneamente.
- **Arrendatario**: Usuario autenticado con rol TENANT.
- **Arrendador**: Usuario autenticado con rol LANDLORD.
- **Tabla_UserRole**: Tabla join `UserRole` en el esquema `users` que asocia usuarios con roles mediante `user_id` y `role_id`, con restricción `@@unique([user_id, role_id])`. Soporta múltiples roles por usuario.
- **API_Roles**: Endpoints del módulo `users` del backend NestJS dedicados a la gestión de roles del usuario autenticado: `POST /auth/roles/add`, `DELETE /auth/roles/:roleName` y `GET /auth/roles/removable`.
- **Servicio_Roles**: Capa de abstracción en el frontend que encapsula las llamadas HTTP a los endpoints de API_Roles.
- **Sección_Gestionar_Roles**: Sección dentro de la página de perfil (`/mi-perfil`) que permite al usuario visualizar sus roles actuales, agregar un rol faltante o eliminar un rol existente.
- **Recurso_Activo**: Entidad de negocio vinculada a un rol que impide su eliminación. Para TENANT: arriendos activos (Lease con estado "Vigente" o "Acordado"), contratos activos (ContractParty con rol "TENANT" en contratos no finalizados) o pagos pendientes (ScheduledPayment sin pago completado). Para LANDLORD: portafolios con unidades (LandlordPortfolio con PortfolioUnit asociados), arriendos activos (Lease en unidades del portafolio con estado "Vigente" o "Acordado") o contratos activos (ContractParty con rol "LANDLORD" en contratos no finalizados).
- **CreateLeaseUseCase**: Caso de uso existente en `src/backend/modules/landlord-portfolio/application/use-cases/create-lease.use-case.ts` que crea un arriendo resolviendo al arrendatario por correo electrónico.
- **Respuesta_Removable**: Objeto retornado por `GET /auth/roles/removable` que indica para cada rol del usuario si puede ser eliminado (`removable: boolean`) y, en caso negativo, las razones específicas (`reasons: string[]`).
- **CheckAndRevokeAutoAssignedRoleUseCase**: Caso de uso que verifica si un rol auto-asignado debe ser revocado cuando el arriendo que lo originó no se materializa. Se invoca tras la eliminación de un contrato PENDING o la finalización de un arriendo sin contrato firmado.
- **Auto_Assigned**: Columna booleana en la Tabla_UserRole que indica si el rol fue asignado automáticamente por el sistema (`true`) o agregado manualmente por el usuario (`false`). Solo los roles con `auto_assigned = true` son candidatos a auto-revocación.

---

## Requisitos

### Requisito 1: Servicio Frontend de Notificaciones

**Historia de usuario:** Como usuario autenticado, quiero que la aplicación frontend tenga una capa de servicio que encapsule las llamadas HTTP al módulo de notificaciones del backend, para que las páginas de notificaciones y preferencias puedan consumir datos de forma consistente y con manejo de errores estandarizado.

#### Criterios de aceptación

1. THE Servicio_Notificaciones SHALL exponer un método `getNotifications(token)` que realice una petición `GET /notifications` con el Token_JWT en el encabezado `Authorization: Bearer` y retorne la lista de registros Notificación_InApp del usuario autenticado.
2. THE Servicio_Notificaciones SHALL exponer un método `getNotificationCount(token)` que realice una petición `GET /notifications/count` con el Token_JWT y retorne un objeto con la propiedad `unreadCount` representando la cantidad de notificaciones in-app no leídas.
3. THE Servicio_Notificaciones SHALL exponer un método `markAsRead(notificationId, token)` que realice una petición `PATCH /notifications/:id/read` con el Token_JWT para marcar una Notificación_InApp específica como leída.
4. THE Servicio_Notificaciones SHALL exponer un método `markAllAsRead(token)` que realice una petición `PATCH /notifications/read-all` con el Token_JWT para marcar todas las notificaciones in-app del usuario como leídas.
5. THE Servicio_Notificaciones SHALL exponer un método `getPreferences(token)` que realice una petición `GET /notifications/preferences` con el Token_JWT y retorne las preferencias de canales externos (EMAIL, WHATSAPP) del usuario autenticado.
6. THE Servicio_Notificaciones SHALL exponer un método `updatePreference(data, token)` que realice una petición `PUT /notifications/preferences` con el Token_JWT y el cuerpo `{ notificationTypeName, channel, isActive }` para actualizar una preferencia de Canal_Externo.
7. WHEN la API_Notificaciones responda con código HTTP 401, THEN THE Servicio_Notificaciones SHALL lanzar un error con el mensaje "Sesión expirada".
8. WHEN la API_Notificaciones responda con código HTTP 403, THEN THE Servicio_Notificaciones SHALL lanzar un error con el mensaje "No tienes permiso para realizar esta acción".
9. WHEN la API_Notificaciones responda con código HTTP 500 o superior, THEN THE Servicio_Notificaciones SHALL lanzar un error con el mensaje "Error del servidor. Intenta de nuevo más tarde.".
10. THE Servicio_Notificaciones SHALL utilizar `fetch` nativo para todas las peticiones HTTP, sin dependencias de librerías externas de HTTP.

---

### Requisito 2: Endpoints Backend — Notificaciones In-App y Preferencias de Canales Externos

**Historia de usuario:** Como usuario autenticado, quiero que el backend exponga endpoints para consultar mis notificaciones in-app, obtener el conteo de no leídas, marcarlas como leídas y consultar mis preferencias de canales externos, para que el frontend pueda construir las páginas de historial y preferencias de notificaciones.

#### Criterios de aceptación

1. WHEN un usuario autenticado realice una petición `GET /notifications`, THE API_Notificaciones SHALL retornar la lista de registros Notificación_InApp del usuario, ordenados por `createdAt` descendente, donde cada registro contenga los campos: `id`, `notificationType`, `title`, `message`, `read`, `eventSource`, `data` y `createdAt`.
2. WHEN un usuario autenticado realice una petición `GET /notifications/count`, THE API_Notificaciones SHALL retornar un objeto `{ unreadCount: number }` con la cantidad de registros Notificación_InApp del usuario cuyo campo `read` sea `false`.
3. WHEN un usuario autenticado realice una petición `PATCH /notifications/:id/read` con un `id` válido perteneciente al usuario, THE API_Notificaciones SHALL actualizar el campo `read` del registro Notificación_InApp a `true` y retornar el registro actualizado.
4. WHEN un usuario autenticado realice una petición `PATCH /notifications/:id/read` con un `id` que no pertenezca al usuario o no exista, THEN THE API_Notificaciones SHALL responder con código HTTP 404 y un mensaje descriptivo.
5. WHEN un usuario autenticado realice una petición `PATCH /notifications/read-all`, THE API_Notificaciones SHALL actualizar el campo `read` a `true` en todos los registros Notificación_InApp del usuario cuyo campo `read` sea `false` y retornar la cantidad de registros actualizados.
6. WHEN un usuario autenticado realice una petición `GET /notifications/preferences`, THE API_Notificaciones SHALL retornar las preferencias de canales externos (EMAIL, WHATSAPP) agrupadas por Tipo_Notificación, donde cada tipo incluya el estado activo/inactivo de cada Canal_Externo; si no existe una preferencia para un tipo y canal, el valor por defecto es `isActive: false`.
7. THE API_Notificaciones SHALL mantener el endpoint existente `PUT /notifications/preferences` para gestionar preferencias de canales externos sin modificar su contrato actual.
8. WHEN ocurra un evento de notificación, THE SendNotificationUseCase SHALL crear un registro Notificación_InApp para el usuario destino con `read: false`, independientemente de las preferencias de canales externos del usuario.
9. WHEN ocurra un evento de notificación y el usuario destino tenga preferencias activas para canales externos, THE SendNotificationUseCase SHALL enviar la notificación adicionalmente por los canales externos activos (EMAIL, WHATSAPP) según las preferencias del usuario.
10. THE API_Notificaciones SHALL requerir un nuevo modelo o tabla para Notificación_InApp (separado de `NotificationsRaw` que registra entregas de canales externos), con los campos: `id` (UUID), `userId` (String), `notificationTypeId` (String), `title` (String), `message` (String), `read` (Boolean, default false), `eventSource` (String), `data` (JSON), `createdAt` (DateTime).

---

### Requisito 3: Página de Historial de Notificaciones

**Historia de usuario:** Como usuario autenticado, quiero ver mi historial de notificaciones in-app en una página dedicada, para poder revisar los eventos importantes de mi actividad en la plataforma y marcarlos como leídos.

#### Criterios de aceptación

1. THE Página_Notificaciones SHALL estar accesible en la ruta `/mis-notificaciones` para cualquier usuario autenticado independientemente de su rol.
2. WHEN un usuario anónimo intente acceder a `/mis-notificaciones`, THEN THE App_Frontend SHALL redirigir al usuario a `/auth/login`.
3. THE Página_Notificaciones SHALL mostrar cada Notificación_InApp como una tarjeta que contenga: el Tipo_Notificación traducido al español, el título, el mensaje, un indicador visual de estado leído/no leído (borde izquierdo azul o texto en negrita para no leídas) y la fecha relativa de creación.
4. THE Página_Notificaciones SHALL mostrar un botón "Marcar todas como leídas" en la parte superior que invoque `PATCH /notifications/read-all` a través del Servicio_Notificaciones y actualice el estado visual de todas las tarjetas a leído.
5. WHEN el usuario toque una tarjeta de notificación no leída, THE Página_Notificaciones SHALL invocar `PATCH /notifications/:id/read` a través del Servicio_Notificaciones y actualizar el indicador visual de esa tarjeta a estado leído.
6. THE Página_Notificaciones SHALL incluir un enlace "Gestionar preferencias" que navegue a `/mis-notificaciones/preferencias`.
7. WHILE la Página_Notificaciones esté cargando los datos, THE Página_Notificaciones SHALL mostrar un esqueleto de carga (skeleton) como indicador de progreso.
8. WHEN la lista de notificaciones esté vacía, THE Página_Notificaciones SHALL mostrar el mensaje "No tienes notificaciones aún".
9. WHEN ocurra un error al cargar las notificaciones, THE Página_Notificaciones SHALL mostrar un mensaje de error con un botón "Reintentar" que permita volver a cargar los datos.
10. THE Página_Notificaciones SHALL mostrar un encabezado con botón de menú hamburguesa que abra el Menú_Lateral y el título "Mis notificaciones".

---

### Requisito 4: Página de Preferencias de Canales Externos

**Historia de usuario:** Como usuario autenticado, quiero gestionar mis preferencias de canales externos de notificación (EMAIL, WHATSAPP), para poder elegir por qué medios adicionales recibir notificaciones además del canal in-app que está siempre activo.

#### Criterios de aceptación

1. THE Página_Preferencias_Notificaciones SHALL estar accesible en la ruta `/mis-notificaciones/preferencias` para cualquier usuario autenticado independientemente de su rol.
2. WHEN un usuario anónimo intente acceder a `/mis-notificaciones/preferencias`, THEN THE App_Frontend SHALL redirigir al usuario a `/auth/login`.
3. THE Página_Preferencias_Notificaciones SHALL mostrar un banner informativo con fondo azul y el texto "Las notificaciones en la aplicación están siempre activas" para comunicar que el canal in-app no es configurable.
4. THE Página_Preferencias_Notificaciones SHALL mostrar las preferencias de canales externos exclusivamente (EMAIL, WHATSAPP), sin incluir controles para el canal in-app.
5. THE Página_Preferencias_Notificaciones SHALL mostrar cada Tipo_Notificación como una sección con controles toggle para EMAIL y WHATSAPP.
6. WHEN el usuario cambie el estado de un toggle de Canal_Externo, THE Página_Preferencias_Notificaciones SHALL invocar `PUT /notifications/preferences` a través del Servicio_Notificaciones de forma inmediata con UI optimista, actualizando el toggle visualmente antes de recibir la respuesta del servidor.
7. WHEN la invocación a `PUT /notifications/preferences` falle, THEN THE Página_Preferencias_Notificaciones SHALL revertir el toggle al estado anterior (rollback) y mostrar un mensaje de error.
8. WHILE la Página_Preferencias_Notificaciones esté cargando los datos, THE Página_Preferencias_Notificaciones SHALL mostrar un esqueleto de carga (skeleton) como indicador de progreso.
9. WHEN ocurra un error al cargar las preferencias, THE Página_Preferencias_Notificaciones SHALL mostrar un mensaje de error con un botón "Reintentar" que permita volver a cargar los datos.
10. THE Página_Preferencias_Notificaciones SHALL mostrar un encabezado con flecha de retroceso que navegue a `/mis-notificaciones` y el título "Preferencias de notificación".

---

### Requisito 5: Página de Perfil Mejorada como Landing Page

**Historia de usuario:** Como usuario autenticado, quiero que mi página de perfil incluya una sección de navegación rápida con tarjetas descriptivas hacia las secciones principales de la plataforma según mis roles, para poder orientarme fácilmente después de iniciar sesión o registrarme.

#### Criterios de aceptación

1. WHEN un usuario autenticado acceda a `/mi-perfil`, THE App_Frontend SHALL mostrar la Sección_Navegación_Rápida debajo de la Sección_Gestionar_Roles (Requisito 12) con el título "Navegación rápida".
2. WHEN el usuario tenga únicamente el rol LANDLORD, THE Sección_Navegación_Rápida SHALL mostrar una tarjeta "Ir a mi portafolio" con un ícono, una descripción explicativa (ej: "Gestiona tus propiedades, unidades y arriendos. Publica inmuebles para encontrar arrendatarios.") y un indicador de flecha, que navegue a `/mi-portafolio`.
3. WHEN el usuario tenga únicamente el rol TENANT, THE Sección_Navegación_Rápida SHALL mostrar una tarjeta "Ir a mis arriendos" con un ícono, una descripción explicativa (ej: "Consulta tus arriendos activos, contratos y pagos. Haz seguimiento del proceso de arriendo.") y un indicador de flecha, que navegue a `/mis-arriendos`.
4. WHEN el usuario sea un Usuario_Multirole (LANDLORD y TENANT), THE Sección_Navegación_Rápida SHALL mostrar ambas tarjetas: "Ir a mi portafolio" e "Ir a mis arriendos" con sus respectivas descripciones.
5. THE Sección_Navegación_Rápida SHALL renderizar cada tarjeta como un elemento `<a>` (Link) con un área de toque mínima de 44px, borde (`border`), `border-radius: 6px`, y cumpliendo con los criterios de accesibilidad WCAG 2.1 AA.

---

### Requisito 6: Redirección Post-Login a Página de Perfil

**Historia de usuario:** Como usuario autenticado, quiero ser redirigido automáticamente a mi página de perfil después de iniciar sesión o registrarme, para poder ver mi información, gestionar mis roles y navegar rápidamente a las secciones relevantes de la plataforma.

#### Criterios de aceptación

1. WHEN cualquier usuario autenticado (independientemente de sus roles) inicie sesión exitosamente, THE App_Frontend SHALL redirigir al usuario a `/mi-perfil`.
2. WHEN un usuario complete el registro y realice su primer inicio de sesión, THE App_Frontend SHALL redirigir al usuario a `/mi-perfil`.
3. WHEN un usuario intente acceder a una URL protegida sin estar autenticado y sea redirigido a `/auth/login`, THEN THE App_Frontend SHALL redirigir al usuario de vuelta a la URL protegida original (`returnUrl`) después de un inicio de sesión exitoso, en lugar de aplicar la redirección por defecto a `/mi-perfil`.

---

### Requisito 7: Actualización del Menú Lateral

**Historia de usuario:** Como usuario autenticado, quiero ver un enlace a mis notificaciones con un indicador de notificaciones no leídas en el menú lateral, para poder acceder rápidamente a esta funcionalidad desde cualquier página.

#### Criterios de aceptación

1. WHILE un usuario esté autenticado, THE Menú_Lateral SHALL mostrar un enlace "Mis notificaciones" con un ícono de campana, posicionado inmediatamente antes del enlace "Mi perfil" en la lista de navegación.
2. WHEN el conteo de notificaciones in-app no leídas del usuario sea mayor a cero, THE Menú_Lateral SHALL mostrar un badge numérico junto al ícono de campana indicando la cantidad de notificaciones no leídas, obtenida mediante `GET /notifications/count` a través del Servicio_Notificaciones.
3. WHILE un usuario anónimo esté navegando, THE Menú_Lateral SHALL mantener su comportamiento actual sin mostrar el enlace "Mis notificaciones".

---

### Requisito 8: Extensión del StatusBadge para Estados de Notificación

**Historia de usuario:** Como desarrollador frontend, quiero que el componente StatusBadge soporte una variante para estados de entrega de notificaciones por canales externos, para poder reutilizar el componente compartido al mostrar el estado de envío de notificaciones externas.

#### Criterios de aceptación

1. THE StatusBadge SHALL soportar una nueva variante `notification` que mapee los estados de entrega de canales externos: `SENT` a "Enviada" con colores verde (fondo `#DCFCE7`, texto `#166534`), `FAILED` a "Fallida" con colores rojo (fondo `#FEE2E2`, texto `#991B1B`) y `PENDING` a "Pendiente" con colores ámbar (fondo `#FEF3C7`, texto `#92400E`).
2. THE StatusBadge SHALL mantener todas las variantes existentes (`lease`, `unit`, `payment`, `listing`, `contract`, `tracking`, `paymentStatus`) sin modificaciones en su comportamiento o mapeo de colores.
3. WHEN se utilice la variante `notification` con un estado no reconocido, THE StatusBadge SHALL aplicar el estilo por defecto gris (fondo `#F3F4F6`, texto `#4B5563`).

---

### Requisito 9: Traducción de Tipos de Notificación

**Historia de usuario:** Como usuario autenticado, quiero ver los tipos de notificación traducidos al español en las páginas de notificaciones y preferencias, para entender claramente a qué evento corresponde cada notificación.

#### Criterios de aceptación

1. THE Módulo_Notificaciones_Frontend SHALL traducir el Tipo_Notificación `CONTRACT_SIGNED` como "Contrato firmado" en todas las interfaces de usuario.
2. THE Módulo_Notificaciones_Frontend SHALL traducir el Tipo_Notificación `PAYMENT_RECEIVED` como "Pago recibido" en todas las interfaces de usuario.
3. THE Módulo_Notificaciones_Frontend SHALL traducir el Tipo_Notificación `CONTACT_INITIATED` como "Contacto iniciado" en todas las interfaces de usuario.
4. THE Módulo_Notificaciones_Frontend SHALL traducir el Tipo_Notificación `CONTRACT_UPLOADED` como "Contrato cargado" en todas las interfaces de usuario.
5. WHEN el Módulo_Notificaciones_Frontend encuentre un Tipo_Notificación no incluido en el mapa de traducciones conocido, THE Módulo_Notificaciones_Frontend SHALL mostrar el nombre original del tipo como texto de respaldo.

---

### Requisito 10: Accesibilidad WCAG 2.1 AA

**Historia de usuario:** Como usuario con diversidad funcional, quiero que las nuevas páginas y componentes de notificaciones, preferencias, inicio multirole y gestión de roles cumplan con los criterios de accesibilidad WCAG 2.1 nivel AA, para poder utilizar la plataforma de forma efectiva con tecnologías de asistencia.

#### Criterios de aceptación

1. THE App_Frontend SHALL utilizar elementos HTML semánticos (`nav`, `main`, `section`, `header`, `button`, `a`) en todas las páginas nuevas (Página_Notificaciones, Página_Preferencias_Notificaciones, Sección_Navegación_Rápida, Sección_Gestionar_Roles).
2. THE App_Frontend SHALL garantizar que todos los elementos interactivos (botones, enlaces, toggles) tengan un área de toque mínima de 44×44 píxeles CSS en todas las páginas nuevas.
3. THE App_Frontend SHALL garantizar que todos los elementos interactivos en las páginas nuevas sean accesibles mediante navegación por teclado (Tab, Enter, Escape).
4. THE App_Frontend SHALL asignar el atributo `role="switch"` y `aria-checked` con el valor booleano correspondiente a todos los controles toggle de la Página_Preferencias_Notificaciones.
5. THE App_Frontend SHALL garantizar una relación de contraste mínima de 4.5:1 entre el texto y el fondo en todos los elementos de las páginas nuevas.
6. THE App_Frontend SHALL presentar todo el texto visible de las páginas nuevas en idioma español.

---

### Requisito 11: Asignación Automática de Rol TENANT al Crear un Arriendo

**Historia de usuario:** Como Arrendador, quiero que cuando cree un arriendo para un usuario que aún no tiene el rol TENANT, el sistema le asigne automáticamente ese rol, para que el arrendatario pueda acceder inmediatamente a las funcionalidades de su nuevo rol sin intervención manual.

#### Criterios de aceptación

1. WHEN el CreateLeaseUseCase cree un arriendo y el usuario arrendatario no posea el rol TENANT en la Tabla_UserRole, THEN THE CreateLeaseUseCase SHALL asignar el rol TENANT al usuario arrendatario insertando un registro en la Tabla_UserRole.
2. WHEN el CreateLeaseUseCase asigne el rol TENANT al usuario arrendatario, THE CreateLeaseUseCase SHALL actualizar el campo `user_type` del usuario a "BOTH" para reflejar que posee múltiples roles.
3. THE CreateLeaseUseCase SHALL ejecutar la asignación de rol y la actualización de `user_type` dentro de la misma transacción de base de datos que la creación del arriendo.
4. WHEN el usuario arrendatario ya posea el rol TENANT en la Tabla_UserRole, THE CreateLeaseUseCase SHALL continuar la creación del arriendo sin error, ignorando la restricción de unicidad duplicada de forma controlada.
5. WHEN el CreateLeaseUseCase asigne automáticamente el rol TENANT, THE CreateLeaseUseCase SHALL registrar un evento de auditoría con la acción `ROLE_AUTO_ASSIGNED` que incluya el identificador del usuario y el nombre del rol asignado.

---

### Requisito 12: Gestión de Roles desde la Página de Perfil

**Historia de usuario:** Como usuario autenticado, quiero poder agregar un rol faltante o eliminar un rol existente desde mi página de perfil, para poder adaptar mi experiencia en la plataforma según mis necesidades actuales sin crear una nueva cuenta.

#### Criterios de aceptación

1. WHEN un usuario autenticado realice una petición `POST /auth/roles/add` con un nombre de rol válido, THE API_Roles SHALL agregar el rol al usuario en la Tabla_UserRole, actualizar `user_type` a "BOTH" y retornar un nuevo Token_JWT con los roles actualizados.
2. WHEN un usuario autenticado realice una petición `GET /auth/roles/removable`, THE API_Roles SHALL retornar una Respuesta_Removable para cada rol del usuario indicando si el rol puede ser eliminado (`removable: boolean`) y, en caso negativo, las razones específicas en español (`reasons: string[]`).
3. WHEN se evalúe la eliminabilidad del rol TENANT, THE API_Roles SHALL marcar el rol como no eliminable si el usuario tiene arriendos activos (Lease con estado "Vigente" o "Acordado"), contratos activos como arrendatario (ContractParty con rol "TENANT" en contratos no finalizados) o pagos pendientes (ScheduledPayment sin pago completado).
4. WHEN se evalúe la eliminabilidad del rol LANDLORD, THE API_Roles SHALL marcar el rol como no eliminable si el usuario tiene portafolios con unidades (LandlordPortfolio con PortfolioUnit asociados), arriendos activos en unidades de sus portafolios (Lease con estado "Vigente" o "Acordado") o contratos activos como arrendador (ContractParty con rol "LANDLORD" en contratos no finalizados).
5. WHEN un usuario autenticado realice una petición `DELETE /auth/roles/:roleName` y el rol sea eliminable según las reglas de negocio, THE API_Roles SHALL eliminar el rol de la Tabla_UserRole, actualizar `user_type` al rol restante y retornar un nuevo Token_JWT con los roles actualizados.
6. WHEN un usuario autenticado intente eliminar su único rol, THEN THE API_Roles SHALL rechazar la operación con código HTTP 400 y un mensaje indicando que el usuario debe tener al menos un rol.
7. THE Sección_Gestionar_Roles SHALL mostrarse en la página `/mi-perfil` debajo del componente ProfileCard existente, mostrando los roles actuales del usuario como badges.
8. WHEN el usuario tenga un solo rol, THE Sección_Gestionar_Roles SHALL mostrar un botón "Agregar rol" que permita agregar el rol faltante (LANDLORD o TENANT) invocando `POST /auth/roles/add` a través del Servicio_Roles.
9. THE Sección_Gestionar_Roles SHALL mostrar un botón "Eliminar rol" junto a cada rol del usuario; el botón estará deshabilitado con una explicación textual de las razones si el rol no es eliminable según la Respuesta_Removable.
10. WHEN el usuario presione "Eliminar rol" en un rol eliminable, THE Sección_Gestionar_Roles SHALL mostrar un ConfirmationDialog solicitando confirmación antes de invocar `DELETE /auth/roles/:roleName` a través del Servicio_Roles.
11. WHEN la API_Roles retorne un nuevo Token_JWT después de agregar o eliminar un rol, THE AuthProvider SHALL actualizar el estado de autenticación global (token, roles y `user_type`) con los datos del nuevo token sin requerir un nuevo inicio de sesión.

---

### Requisito 13: Auto-Revocación del Rol TENANT Cuando el Arriendo No Se Materializa

**Historia de usuario:** Como sistema, quiero revocar automáticamente el rol TENANT que fue auto-asignado cuando el arriendo que lo originó no se materializa (contrato eliminado o arriendo finalizado sin contrato firmado), para que los usuarios no conserven roles que ya no corresponden a su situación real en la plataforma.

#### Criterios de aceptación

1. THE Tabla_UserRole SHALL incluir una columna `auto_assigned` de tipo booleano con valor por defecto `false`, que indique si el rol fue asignado automáticamente por el sistema o manualmente por el usuario.
2. WHEN el CreateLeaseUseCase asigne automáticamente el rol TENANT (Requisito 11), THE CreateLeaseUseCase SHALL establecer `auto_assigned = true` en el registro de la Tabla_UserRole correspondiente.
3. WHEN un usuario agregue un rol manualmente mediante `POST /auth/roles/add` (Requisito 12), THE AddRoleUseCase SHALL establecer `auto_assigned = false` en el registro de la Tabla_UserRole correspondiente.
4. WHEN el DeleteContractUseCase elimine un contrato con estado PENDING, THEN THE sistema SHALL verificar si el arrendatario del arriendo asociado aún necesita el rol TENANT.
5. WHEN un arriendo alcance el estado "Finalizado" sin haber tenido nunca un contrato con estado SIGNED, THEN THE sistema SHALL verificar si el arrendatario aún necesita el rol TENANT.
6. WHEN se verifique la necesidad del rol TENANT para un usuario Y el usuario NO tenga otros arriendos activos (Lease con estado "Vigente" o "Acordado") como arrendatario Y el rol TENANT tenga `auto_assigned = true` en la Tabla_UserRole, THEN THE sistema SHALL revocar el rol TENANT eliminando el registro de la Tabla_UserRole, actualizar `user_type` al rol restante y registrar un evento de auditoría con la acción `ROLE_AUTO_REVOKED`.
7. WHEN se verifique la necesidad del rol TENANT para un usuario Y el usuario tenga al menos un arriendo activo (Lease con estado "Vigente" o "Acordado") como arrendatario, THEN THE sistema SHALL mantener el rol TENANT sin cambios.
8. WHEN se verifique la necesidad del rol TENANT para un usuario Y el rol TENANT tenga `auto_assigned = false` en la Tabla_UserRole (el usuario lo agregó manualmente), THEN THE sistema SHALL mantener el rol TENANT sin cambios, independientemente del estado de sus arriendos.
9. THE CheckAndRevokeAutoAssignedRoleUseCase SHALL ejecutar la verificación y posible revocación dentro de una transacción de base de datos para garantizar consistencia.
10. WHEN el rol TENANT sea revocado automáticamente Y el usuario solo tenía el rol TENANT, THEN THE sistema SHALL NO revocar el rol, ya que el usuario debe conservar al menos un rol.
