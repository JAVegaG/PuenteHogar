# Documento de Requisitos

## Introducción

Este documento especifica los requisitos funcionales y no funcionales para la implementación del **backend y base de datos** de la plataforma de gestión del ciclo de arriendo de vivienda urbana en Colombia (Valle del Cauca), correspondiente al **MVP (Release 1)**.

El sistema actúa como orquestador del ciclo completo de arriendo: publicación de inmuebles, exploración de oferta, formalización contractual con firma electrónica y gestión de pagos. El backend se implementa como un **monolito modular** en NestJS con arquitectura hexagonal por módulo, PostgreSQL + Prisma como persistencia primaria, Redis como caché distribuido y almacenamiento de objetos para archivos.

El alcance de este spec cubre los ocho módulos del backend: `users`, `property-listings`, `landlord-portfolio`, `contracts`, `payments`, `accounting`, `rental-tracking` y `notifications`, incluyendo el esquema de base de datos Prisma, los casos de uso de aplicación, los adaptadores de infraestructura y las integraciones con servicios externos.

---

## Glosario

- **Arrendador**: Persona natural o jurídica que publica y gestiona inmuebles en arriendo dentro de la plataforma.
- **Arrendatario**: Persona que busca, contacta y arrienda inmuebles a través de la plataforma.
- **Usuario_Anónimo**: Persona que consulta la oferta de inmuebles sin autenticación.
- **Sistema**: La plataforma backend NestJS que implementa la lógica de negocio.
- **Auth_Service**: Módulo de autenticación y autorización del sistema (parte del módulo `users`).
- **Listing_Service**: Servicio de gestión de publicaciones del módulo `property-listings`.
- **Portfolio_Service**: Servicio de gestión del portafolio del arrendador en el módulo `landlord-portfolio`.
- **Contract_Service**: Servicio de gestión de contratos del módulo `contracts`.
- **Payment_Service**: Servicio de gestión de pagos del módulo `payments`.
- **Accounting_Service**: Servicio de reportes financieros del módulo `accounting`.
- **Tracking_Service**: Servicio de seguimiento del ciclo de arriendo del módulo `rental-tracking`.
- **Notification_Service**: Servicio de notificaciones del módulo `notifications`.
- **ETL_Job**: Proceso programado (cron job) que transforma datos de tablas RAW a tablas curadas.
- **Pasarela_Pagos**: Servicio externo de procesamiento de pagos electrónicos (PSE, tarjetas).
- **Proveedor_Firma**: Servicio externo de firma electrónica con validez jurídica colombiana.
- **Canal_Mensajería**: Servicio externo de mensajería (WhatsApp preferido) para notificaciones.
- **Lease**: Ciclo de arriendo activo que vincula una unidad de portafolio con un arrendatario.
- **Portfolio_Unit**: Unidad de inmueble gestionada dentro del portafolio de un arrendador.
- **Scheduled_Payment**: Obligación de pago programada derivada de un contrato activo.
- **RAW_Table**: Tabla de base de datos que almacena datos de entrada en formato JSON/JSONB sin transformar.
- **Curated_Table**: Tabla de base de datos con columnas tipadas, optimizada para lectura, poblada por ETL_Job.
- **RBAC**: Control de acceso basado en roles (Role-Based Access Control).
- **PII**: Información de identificación personal (Personally Identifiable Information).
- **Idempotency_Key**: Clave única por operación de pago que previene transacciones duplicadas.
- **Circuit_Breaker**: Patrón de resiliencia que aísla fallos de servicios externos.
- **enc_blob**: Campo cifrado en la tabla `lease` que almacena datos sensibles del ciclo de arriendo.
- **tx_hash**: Hash de verificación de integridad asociado a fotos y documentos almacenados en object storage.
- **signing_timestamp**: Marca temporal del evento de firma electrónica registrada en `signings`.
- **document_hash**: Hash del documento firmado, usado para verificar integridad post-firma.

---

## Requisitos

### Requisito 1: Registro y Autenticación de Usuarios

**User Story:** Como persona interesada en usar la plataforma, quiero registrarme y autenticarme con mis datos básicos para acceder a las funcionalidades correspondientes a mi rol (arrendador o arrendatario).

#### Criterios de Aceptación

1. WHEN un usuario envía una solicitud de registro con nombre completo, número de identificación colombiano, correo electrónico válido, número de celular y contraseña, THE Auth_Service SHALL crear la cuenta, asignar el rol correspondiente y retornar una confirmación de registro exitoso.
2. IF el correo electrónico ya existe en el sistema, THEN THE Auth_Service SHALL rechazar el registro y retornar un error 409 con un mensaje indicando que el correo ya está registrado.
3. IF algún campo obligatorio del registro está ausente o tiene formato inválido, THEN THE Auth_Service SHALL retornar un error 400 con los campos específicos que requieren corrección.
4. WHEN un usuario registrado envía credenciales válidas (correo y contraseña), THE Auth_Service SHALL autenticar al usuario, generar un token JWT con el rol y el identificador del usuario, y retornarlo en la respuesta.
5. IF las credenciales de inicio de sesión son incorrectas, THEN THE Auth_Service SHALL retornar un error 401 sin revelar cuál campo es incorrecto.
6. THE Auth_Service SHALL almacenar las contraseñas usando un algoritmo de hashing seguro (bcrypt con factor de costo ≥ 12) y nunca persistir ni retornar contraseñas en texto plano.
7. THE Auth_Service SHALL cifrar en reposo todos los campos PII del usuario (número de identificación, número de celular) conforme a la Ley 1581 de 2012.
8. WHEN un token JWT expira o es inválido, THE Auth_Service SHALL retornar un error 401 en cualquier endpoint protegido.
9. THE Sistema SHALL validar y sanitizar todos los datos de entrada en el boundary de la API para prevenir inyección SQL y XSS antes de procesarlos en cualquier módulo.
10. THE Auth_Service SHALL registrar en un log de auditoría cada intento de inicio de sesión fallido, incluyendo timestamp e IP de origen, sin exponer PII en los logs.

---

### Requisito 2: Gestión del Portafolio del Arrendador

**User Story:** Como arrendador, quiero gestionar mis inmuebles en un portafolio centralizado para tener control sobre los activos que administro dentro de la plataforma.

#### Criterios de Aceptación

1. WHEN un arrendador autenticado envía una solicitud para agregar un inmueble a su portafolio con los datos básicos requeridos (dirección, tipo de inmueble, número de habitaciones, número de baños, canon de arrendamiento), THE Portfolio_Service SHALL crear la unidad de portafolio asociada al arrendador y retornar el identificador de la nueva unidad.
2. IF un usuario con rol arrendatario intenta crear o modificar una unidad de portafolio, THEN THE Portfolio_Service SHALL rechazar la solicitud con un error 403.
3. WHEN un arrendador autenticado solicita la lista de sus unidades de portafolio, THE Portfolio_Service SHALL retornar únicamente las unidades que pertenecen a ese arrendador, sin exponer unidades de otros arrendadores.
4. WHEN un arrendador actualiza los datos de una unidad de portafolio que le pertenece, THE Portfolio_Service SHALL persistir los cambios y retornar la unidad actualizada.
5. IF un arrendador intenta modificar una unidad de portafolio que no le pertenece, THEN THE Portfolio_Service SHALL retornar un error 403 y registrar el intento en el log de auditoría.
6. THE Portfolio_Service SHALL persistir los datos de entrada de cada inmueble en una RAW_Table en formato JSON/JSONB antes de transformarlos a la Curated_Table mediante ETL_Job.
7. WHEN el ETL_Job se ejecuta, THE Sistema SHALL transformar los registros de la RAW_Table de portafolio a columnas tipadas en la Curated_Table correspondiente, manteniendo el registro RAW original intacto.

---

### Requisito 3: Publicación y Exploración de Inmuebles

**User Story:** Como arrendador, quiero publicar mis inmuebles con fotos obligatorias para ofrecerlos a arrendatarios; como arrendatario o usuario anónimo, quiero explorar la oferta disponible con filtros para encontrar opciones relevantes.

#### Criterios de Aceptación

1. WHEN un arrendador autenticado envía una solicitud de publicación con los datos básicos del inmueble y al menos una fotografía, THE Listing_Service SHALL crear la publicación en estado `PUBLISHED` y hacerla visible en el listado público.
2. IF un arrendador intenta publicar un inmueble sin adjuntar al menos una fotografía, THEN THE Listing_Service SHALL rechazar la solicitud con un error 422 y un mensaje indicando que se requiere al menos una fotografía.
3. THE Listing_Service SHALL almacenar las fotografías en el servicio de almacenamiento de objetos y persistir únicamente las URLs de referencia en la base de datos, no los archivos binarios.
4. WHEN un usuario (autenticado o anónimo) solicita el listado de inmuebles publicados, THE Listing_Service SHALL retornar únicamente publicaciones en estado `PUBLISHED` con al menos una fotografía asociada.
5. WHEN un usuario aplica un filtro por zona o barrio, THE Listing_Service SHALL retornar únicamente los inmuebles cuya dirección corresponde a la zona o barrio seleccionado.
6. WHEN un usuario solicita el detalle de un inmueble, THE Listing_Service SHALL retornar la información completa del inmueble incluyendo fotografías, fecha de publicación, canon, número de habitaciones, número de baños y datos de contacto del arrendador.
7. THE Listing_Service SHALL incluir la fecha de publicación en cada elemento del listado y en el detalle del inmueble.
8. WHILE una publicación está en estado `PUBLISHED`, THE Listing_Service SHALL mantenerla visible en el listado público y actualizar su estado a `UNPUBLISHED` únicamente cuando el arrendador lo solicite explícitamente o cuando el Lease asociado pase a estado activo.
9. THE Listing_Service SHALL servir el listado de inmuebles publicados desde caché Redis con un TTL de 5 minutos para reducir la carga en la base de datos en consultas frecuentes.
10. IF el caché Redis no está disponible, THEN THE Listing_Service SHALL consultar directamente la base de datos y retornar la respuesta sin degradar la funcionalidad.
11. WHEN un arrendador solicita despublicar un inmueble que le pertenece, THE Listing_Service SHALL cambiar el estado de la publicación a `UNPUBLISHED` y removerla del listado público.
12. IF un usuario intenta modificar o despublicar una publicación que no le pertenece, THEN THE Listing_Service SHALL retornar un error 403.

---

### Requisito 4: Contacto entre Arrendatario y Arrendador

**User Story:** Como arrendatario, quiero contactar al arrendador desde la plataforma para iniciar el proceso de arriendo de un inmueble de mi interés.

#### Criterios de Aceptación

1. WHEN un usuario autenticado envía un mensaje de contacto para un inmueble publicado, THE Listing_Service SHALL registrar el evento de contacto asociando el inmueble, el arrendatario y el timestamp del contacto.
2. WHEN se registra un evento de contacto, THE Notification_Service SHALL enviar una notificación al arrendador del inmueble indicando el nombre del interesado y el inmueble asociado.
3. IF el envío de la notificación al canal externo falla, THEN THE Notification_Service SHALL reintentar el envío hasta 2 veces con backoff exponencial antes de marcar la notificación como fallida, sin bloquear la respuesta al usuario.
4. THE Listing_Service SHALL retornar al menos una opción de contacto al usuario (formulario interno o redirección a WhatsApp) según la configuración del arrendador.
5. IF el registro del evento de contacto falla por error de base de datos, THEN THE Listing_Service SHALL retornar un error 500 al usuario con un mensaje claro y no registrar el contacto como exitoso.

---

### Requisito 5: Gestión de Contratos

**User Story:** Como arrendador, quiero cargar el contrato en la plataforma y como usuario (arrendador o arrendatario) quiero firmarlo digitalmente con validez jurídica para formalizar el acuerdo sin desplazamientos presenciales.

#### Criterios de Aceptación

1. WHEN un arrendador autenticado carga un archivo de contrato en formato PDF asociado a un Lease activo, THE Contract_Service SHALL almacenar el archivo en el servicio de almacenamiento de objetos, persistir la referencia en la base de datos y retornar el identificador del contrato creado.
2. IF el archivo cargado no es un PDF o supera el tamaño máximo permitido (10 MB), THEN THE Contract_Service SHALL rechazar la carga con un error 422 y un mensaje indicando el formato o tamaño requerido.
3. IF un arrendador intenta cargar un contrato en un Lease que no le pertenece, THEN THE Contract_Service SHALL retornar un error 403.
4. WHEN un usuario con acceso al contrato solicita su visualización, THE Contract_Service SHALL retornar un resumen con los campos clave extraídos (canon, duración, fecha de inicio, partes involucradas) y la URL del documento completo.
5. WHEN arrendador y arrendatario inician el proceso de firma digital, THE Contract_Service SHALL invocar al Proveedor_Firma externo a través del adaptador correspondiente, pasando el documento y los datos de las partes.
6. WHEN el Proveedor_Firma confirma la firma exitosa de todas las partes, THE Contract_Service SHALL actualizar el estado del contrato a `SIGNED`, registrar la fecha y hora de firma y el identificador de la transacción del proveedor.
7. IF el Proveedor_Firma retorna un error o timeout durante el proceso de firma, THEN THE Contract_Service SHALL activar el Circuit_Breaker, registrar el estado del contrato como `SIGNATURE_PENDING` y notificar al usuario que la firma no pudo completarse, ofreciendo la opción de reintentar.
8. WHEN el contrato pasa a estado `SIGNED`, THE Notification_Service SHALL enviar una notificación a arrendador y arrendatario confirmando la firma exitosa con la fecha y el identificador de la transacción.
9. THE Contract_Service SHALL registrar en un log de auditoría cada evento del proceso de firma (inicio, confirmación, error) con timestamp y datos de las partes involucradas.
10. WHILE un contrato está en estado `SIGNED`, THE Contract_Service SHALL permitir su consulta a arrendador y arrendatario pero no permitir modificaciones al documento.
11. THE Contract_Service SHALL garantizar que solo el arrendador del Lease y el arrendatario asociado puedan acceder al contrato, retornando error 403 para cualquier otro usuario autenticado.

---

### Requisito 6: Gestión de Pagos

**User Story:** Como arrendatario, quiero pagar el canon desde la plataforma de forma segura; como arrendador, quiero recibir confirmación del pago y consultar el historial de transacciones.

#### Criterios de Aceptación

1. WHEN un arrendatario autenticado inicia el pago de un Scheduled_Payment pendiente, THE Payment_Service SHALL generar una Idempotency_Key única para la transacción y redirigir al usuario al flujo de la Pasarela_Pagos externa.
2. THE Payment_Service SHALL incluir la Idempotency_Key en cada solicitud a la Pasarela_Pagos para garantizar que no se procesen transacciones duplicadas ante reintentos del cliente.
3. WHEN la Pasarela_Pagos confirma el pago exitoso, THE Payment_Service SHALL actualizar el estado del Scheduled_Payment a `PAID`, registrar el identificador de transacción externo, el monto y la fecha de pago.
4. IF la Pasarela_Pagos rechaza la transacción, THEN THE Payment_Service SHALL mantener el estado del Scheduled_Payment como `PENDING` y retornar al usuario un mensaje claro indicando que el pago fue rechazado.
5. IF la Pasarela_Pagos no responde dentro del timeout configurado (30 segundos), THEN THE Payment_Service SHALL activar el Circuit_Breaker, registrar el estado del pago como `PROCESSING` y notificar al usuario que el estado del pago está siendo verificado.
6. THE Payment_Service SHALL persistir cada evento de pago (inicio, confirmación, rechazo, error) en una tabla de logs con timestamp, estado y datos de la transacción para trazabilidad completa.
7. WHEN un pago es confirmado como exitoso, THE Notification_Service SHALL enviar una notificación al arrendador indicando el monto recibido, el periodo correspondiente y el inmueble asociado.
8. WHEN un usuario autenticado solicita el historial de pagos, THE Payment_Service SHALL retornar únicamente los pagos asociados a los contratos del usuario solicitante, ordenados por fecha descendente.
9. IF un arrendatario intenta consultar el historial de pagos de otro arrendatario, THEN THE Payment_Service SHALL retornar un error 403.
10. THE Payment_Service SHALL persistir los datos de cada transacción en una RAW_Table en formato JSON/JSONB antes de transformarlos a la Curated_Table mediante ETL_Job.
11. WHILE el Circuit_Breaker está en estado abierto para la Pasarela_Pagos, THE Payment_Service SHALL rechazar nuevas solicitudes de pago con un mensaje claro al usuario indicando que el servicio de pagos no está disponible temporalmente.

---

### Requisito 7: Reportes Contables del Arrendador

**User Story:** Como arrendador, quiero generar reportes mensuales de ingresos por arriendo para organizar mi gestión financiera.

#### Criterios de Aceptación

1. WHEN un arrendador autenticado solicita el reporte de ingresos de un mes específico, THE Accounting_Service SHALL retornar el total de ingresos recibidos en ese mes, desglosado por inmueble y contrato.
2. THE Accounting_Service SHALL calcular los reportes a partir de los pagos en estado `PAID` registrados en la Curated_Table del módulo de pagos.
3. IF un arrendador no tiene pagos registrados en el periodo solicitado, THEN THE Accounting_Service SHALL retornar un reporte con total cero y un mensaje indicando que no hay ingresos en ese periodo.
4. THE Accounting_Service SHALL servir los reportes de periodos históricos (más de 24 horas de antigüedad) desde caché Redis con un TTL de 1 hora para reducir recálculos innecesarios.
5. IF un usuario con rol arrendatario intenta acceder a los reportes contables de un arrendador, THEN THE Accounting_Service SHALL retornar un error 403.

---

### Requisito 8: Seguimiento del Ciclo de Arriendo

**User Story:** Como usuario (arrendador o arrendatario), quiero visualizar claramente el estado del proceso de arriendo para entender en qué etapa se encuentra y qué acciones están disponibles.

#### Criterios de Aceptación

1. THE Tracking_Service SHALL mantener un estado actual del Lease que refleje la etapa vigente del ciclo de arriendo, con los valores: `PUBLISHED`, `CONTACT_INITIATED`, `CONTRACT_UPLOADED`, `CONTRACT_SIGNED`, `PAYMENT_RECEIVED`.
2. WHEN el estado de un Lease cambia, THE Tracking_Service SHALL registrar la transición en el historial de estados con el estado anterior, el estado nuevo y el timestamp del cambio.
3. WHEN un usuario autenticado solicita el estado de un Lease, THE Tracking_Service SHALL retornar el estado actual y el historial de transiciones únicamente si el usuario es el arrendador o el arrendatario del Lease.
4. IF un usuario intenta consultar el estado de un Lease que no le pertenece, THEN THE Tracking_Service SHALL retornar un error 403.
5. WHEN el estado de un Lease cambia a `CONTRACT_SIGNED` o `PAYMENT_RECEIVED`, THE Notification_Service SHALL enviar una notificación a ambas partes del Lease indicando el nuevo estado y el inmueble asociado.
6. THE Tracking_Service SHALL exponer un endpoint que retorne el estado resumido de todos los Leases activos del usuario autenticado, incluyendo el nombre del inmueble, el estado actual y la fecha del último cambio de estado.
7. WHEN el ETL_Job procesa los estados del Lease, THE Sistema SHALL garantizar que el estado actual en la Curated_Table sea coherente con el último registro del historial de estados.

---

### Requisito 9: Sistema de Notificaciones

**User Story:** Como usuario, quiero recibir notificaciones sobre eventos importantes del proceso de arriendo para mantenerme informado sin necesidad de revisar constantemente la plataforma.

#### Criterios de Aceptación

1. THE Notification_Service SHALL soportar al menos dos canales de entrega: correo electrónico y WhatsApp (Canal_Mensajería externo).
2. WHEN se dispara un evento de notificación (nuevo interesado, contrato firmado, pago recibido, cambio de estado del Lease), THE Notification_Service SHALL determinar el canal preferido del usuario destinatario y enviar la notificación por ese canal.
3. IF el Canal_Mensajería externo no está disponible, THEN THE Notification_Service SHALL activar el Circuit_Breaker y reintentar el envío hasta 2 veces con backoff exponencial antes de marcar la notificación como fallida.
4. THE Notification_Service SHALL persistir cada notificación enviada con su estado (SENT, FAILED, PENDING), el canal utilizado, el timestamp y el evento que la originó.
5. IF una notificación falla definitivamente después de los reintentos, THEN THE Notification_Service SHALL registrar el fallo en el log de auditoría sin interrumpir el flujo principal del proceso que originó la notificación.
6. THE Notification_Service SHALL respetar las preferencias de notificación configuradas por cada usuario, permitiendo que un usuario desactive notificaciones por canal específico.
7. WHEN un usuario actualiza sus preferencias de notificación, THE Notification_Service SHALL aplicar los cambios a partir de la siguiente notificación generada, sin afectar notificaciones ya encoladas.

---

### Requisito 10: Persistencia Híbrida y ETL

**User Story:** Como sistema, necesito persistir datos de entrada en formato RAW y transformarlos a tablas curadas para garantizar trazabilidad histórica y eficiencia en consultas.

#### Criterios de Aceptación

1. THE Sistema SHALL persistir los datos de entrada de cada módulo en una RAW_Table con columna de tipo JSONB antes de cualquier transformación o validación de negocio.
2. WHEN el ETL_Job se ejecuta según su programación (cron), THE Sistema SHALL transformar los registros RAW no procesados a las columnas tipadas de la Curated_Table correspondiente.
3. THE ETL_Job SHALL marcar cada registro RAW como procesado después de una transformación exitosa, sin eliminar el registro original.
4. IF el ETL_Job encuentra un registro RAW con formato inválido o datos inconsistentes, THEN THE ETL_Job SHALL marcar el registro como `ETL_ERROR`, registrar el motivo del error y continuar procesando los demás registros sin interrumpir el job completo.
5. THE Sistema SHALL garantizar que las Curated_Tables sean la fuente de verdad para todas las consultas de lectura de los módulos, nunca consultando directamente las RAW_Tables en flujos de usuario.
6. FOR ALL registros procesados por el ETL_Job, THE Sistema SHALL garantizar que el contenido de la Curated_Table sea equivalente al contenido del registro RAW original (propiedad de round-trip de transformación).
7. THE Sistema SHALL separar los esquemas de base de datos por módulo en PostgreSQL, garantizando que ningún módulo realice joins directos sobre tablas de otro módulo.

---

### Requisito 11: Seguridad, RBAC y Auditoría

**User Story:** Como sistema, necesito garantizar que cada usuario solo acceda a los recursos que le pertenecen y que todas las acciones sensibles queden registradas para auditoría.

#### Criterios de Aceptación

1. THE Sistema SHALL implementar RBAC con al menos dos roles: `LANDLORD` (arrendador) y `TENANT` (arrendatario), aplicando los permisos correspondientes en cada endpoint de la API.
2. THE Sistema SHALL verificar la pertenencia del recurso en cada operación de lectura o escritura sobre entidades propias del usuario (portafolio, contratos, pagos, Leases), retornando error 403 si el recurso no pertenece al usuario autenticado.
3. THE Sistema SHALL bloquear y registrar en el log de auditoría el 100% de los intentos de acceso no autorizado a recursos de otros usuarios.
4. THE Sistema SHALL aplicar TLS 1.2 o superior en todas las comunicaciones en tránsito entre el cliente y el servidor, y entre el servidor y los servicios externos.
5. THE Sistema SHALL cifrar en reposo todos los campos PII (número de identificación, número de celular, datos bancarios) en la base de datos.
6. THE Sistema SHALL implementar un interceptor de validación en el boundary de la API que sanitice y valide todos los datos de entrada antes de que lleguen a la capa de aplicación.
7. WHEN se realiza una acción sensible (firma de contrato, pago, cambio de rol, acceso a PII), THE Sistema SHALL registrar en el log de auditoría el usuario, la acción, el recurso afectado y el timestamp.
8. THE Sistema SHALL garantizar que los logs de auditoría no contengan PII en texto plano, usando identificadores anonimizados cuando sea necesario.

---

### Requisito 12: Resiliencia e Integraciones Externas

**User Story:** Como sistema, necesito que los fallos de servicios externos (Pasarela_Pagos, Proveedor_Firma, Canal_Mensajería) no provoquen indisponibilidad general de la plataforma.

#### Criterios de Aceptación

1. THE Sistema SHALL implementar el patrón Circuit_Breaker con backoff exponencial en todos los adaptadores de integración con servicios externos (Pasarela_Pagos, Proveedor_Firma, Canal_Mensajería).
2. WHEN el Circuit_Breaker de un servicio externo está en estado abierto, THE Sistema SHALL retornar una respuesta de degradación controlada al usuario sin propagar el error como fallo general de la plataforma.
3. THE Sistema SHALL configurar un timeout máximo de 30 segundos para llamadas a la Pasarela_Pagos y de 15 segundos para llamadas al Proveedor_Firma y al Canal_Mensajería.
4. IF una llamada a un servicio externo supera el timeout configurado, THEN THE Sistema SHALL registrar el evento en el log de auditoría, activar el Circuit_Breaker si corresponde y retornar un estado intermedio al usuario.
5. THE Sistema SHALL garantizar una disponibilidad general ≥ 99.5%, de modo que la indisponibilidad de un servicio externo no cause caída completa de la plataforma.
6. THE Sistema SHALL retornar respuestas de la API en ≤ 800ms en el percentil 95 para endpoints que no dependan de servicios externos, consultando caché Redis cuando esté disponible.

---

### Requisito 13: Esquema de Base de Datos y Modelo de Datos

**User Story:** Como sistema, necesito un esquema de base de datos bien definido en Prisma que soporte todos los módulos del MVP con separación por esquema, integridad referencial y soporte para persistencia híbrida.

#### Criterios de Aceptación

1. THE Sistema SHALL definir el esquema de base de datos en Prisma con modelos separados por módulo, usando el campo `@@schema` de Prisma para separación lógica en PostgreSQL.
2. THE Sistema SHALL incluir en el esquema Prisma los modelos para los ocho módulos: `users`, `property_listings`, `landlord_portfolio`, `contracts`, `payments`, `accounting`, `rental_tracking` y `notifications`.
3. THE Sistema SHALL definir para cada módulo al menos una RAW_Table con campo `payload` de tipo `Json` y una o más Curated_Tables con columnas tipadas correspondientes.
4. THE Sistema SHALL definir restricciones de unicidad en el esquema Prisma para combinaciones que no deben duplicarse: correo de usuario, combinación usuario-rol, publicación activa por unidad de portafolio, y Lease activo por unidad de portafolio.
5. THE Sistema SHALL definir relaciones de clave foránea en Prisma entre entidades relacionadas dentro del mismo esquema de módulo, sin definir relaciones directas entre esquemas de módulos distintos.
6. THE Sistema SHALL incluir campos de auditoría (`created_at`, `updated_at`) en todos los modelos de Curated_Tables.
7. FOR ALL migraciones de base de datos generadas por Prisma, THE Sistema SHALL garantizar que sean aplicables de forma idempotente (ejecutar la misma migración dos veces no produce errores ni duplicados).

---

### Requisito 14: Tablas por Dominio (Modelo Físico de Referencia)

**User Story:** Como sistema, necesito que cada dominio implemente exactamente las tablas definidas en el ERD para garantizar coherencia entre el modelo de datos diseñado y la implementación en Prisma.

#### Criterios de Aceptación

1. THE Sistema SHALL implementar en el esquema `property_listings` las siguientes tablas curadas: `properties` (property_type, length, width, address, number_of_bathrooms, number_of_rooms, is_active), `addresses` (property_id, state, city, neighborhood, address, latitude, longitude), `listings` (portfolio_unit_id, title, description, listing_date, price, currency, is_active), `photos` (listing_id, file_url, is_main, tx_hash), `additional_features` (name, description), `property_additional_features` (property_id, additional_feature_id, value, order).

2. THE Sistema SHALL implementar en el esquema `landlord_portfolio` las siguientes tablas curadas: `landlord_portfolio` (user_id, name, creation_date), `portfolio_unit` (portfolio_id, property_id, conditions, lease_base_amount, lease_base_currency), `lease` (portfolio_unit_id, user_id, start_date, end_date, enc_blob).

3. THE Sistema SHALL implementar en el esquema `tracking_process` las siguientes tablas curadas: `lease_status` (name, description), `lease_status_history` (lease_id, lease_status_id, record_created_at), `lease_current_status` (lease_id, lease_status_history_id, lease_status_id), `listing_status` (name, description), `listing_status_history` (listing_id, listing_status_id, record_created_at), `listing_current_status` (listing_id, listing_status_history_id, listing_status_id).

4. THE Sistema SHALL implementar en el esquema `payments` las siguientes tablas curadas: `scheduled_payments` (lease_id, amount, currency, due_date), `payments` (scheduled_payment_id, amount, currency, payment_desc), `payment_status` (name, description), `payment_logs` (payment_id, payment_status_id, status, platform, data, creation_date).

5. THE Sistema SHALL implementar en el esquema `accounting` las siguientes tablas curadas: `aggregated_payment_reports` (portfolio_id, as_of_date, window_months, period_start, period_end, currency, number_of_units, total_amount, avg_amount, payment_count, min_amount, max_amount, last_payment_at, first_payment_at, expected_amount, overdue_count), `individual_payment_reports` (portfolio_unit_id, as_of_date, window_months, period_start, period_end, currency, total_amount, min_amount, max_amount, payment_count, last_payment_at, first_payment_at, expected_amount, overdue_count).

6. THE Sistema SHALL implementar en el esquema `users` las siguientes tablas curadas: `users` (doc_type, document_type, document_number, mail, hashed_password, phone_number, is_active, expiration_date), `legal_person_details` (user_id, business_name), `natural_person_details` (user_id, first_name, last_name, birth_date, pref_cl_type), `roles` (name, description), `permissions` (effect, action, resource), `users_roles` (user_id, role_id), `roles_permissions` (role_id, permission_id).

7. THE Sistema SHALL implementar en el esquema `notifications` las siguientes tablas curadas: `notification_preferences` (user_id, notification_type_id, channel, is_active), `notification_types` (name, description).

8. THE Sistema SHALL implementar en el esquema `contracts` las siguientes tablas curadas: `contracts` (lease_id, contract_status_id, start_date, end_date), `contract_status` (name, description), `contract_party` (user_id, contract_id, role_in_contract), `files` (contract_id, file_type_id, file_status_id, file_url), `file_types` (name, description), `files_status` (name, description), `signings` (contract_party_id, signing_status_id, signing_timestamp, document_hash), `signing_status` (name, description), `signing_logs` (signing_id, signing_status_id, platform, data, creation_date).

9. THE Sistema SHALL implementar para cada dominio que lo requiera una tabla RAW con campos `id`, `payload` (JSONB) y `created_at`, nombrada con el sufijo `_raw` (por ejemplo: `portfolio_unit_raw`, `payments_raw`).

10. THE Sistema SHALL garantizar que todas las claves foráneas entre tablas del mismo esquema estén definidas en Prisma, y que no existan relaciones directas de clave foránea entre tablas de esquemas distintos.
