# Plan de Implementación: Backend e Base de Datos

## Visión General

Implementación incremental del monolito modular NestJS con arquitectura hexagonal por módulo, PostgreSQL + Prisma, Redis y almacenamiento de objetos. Las tareas siguen el orden: infraestructura base → módulos de dominio → componentes transversales → ETL jobs → tests de propiedades.

## Tareas

- [x] 1. Configuración inicial del proyecto NestJS + Prisma + Redis
  - Inicializar proyecto NestJS con TypeScript en `src/backend/`
  - Configurar `ConfigModule` con variables de entorno (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)
  - Instalar y configurar Prisma (`prisma init`, `schema.prisma` con `previewFeatures = ["multiSchema"]`)
  - Configurar cliente Redis (`ioredis`) y `RedisService` en `src/backend/shared/`
  - Configurar `JwtModule` global con estrategia de validación de tokens
  - Añadir scripts npm: `migration:run`, `migration:generate`, `db:studio`
  - _Requirements: 13.1, 13.2_

- [x] 2. Schema Prisma completo — 8 esquemas PostgreSQL
  - [x] 2.1 Definir esquema `users` en `schema.prisma`
    - Modelos: `User`, `DocumentType`, `NaturalPersonDetail`, `LegalPersonDetail`, `Role`, `Permission`, `UserRole`, `RolePermission`, `UsersRaw`
    - `User.user_type` — desnormalización del rol para quick lookups (LANDLORD | TENANT)
    - `User.document_type_id` — FK hacia catálogo `DocumentType` (no string libre)
    - `DocumentType` — catálogo con `code` @unique, `description`, `is_active`
    - `NaturalPersonDetail` — `first_name`, `last_name`, `preferred_name?` (sin `birth_date` ni `pref_cl_type`)
    - `UserRole` — PK propia `id` (no clave compuesta)
    - `User.registration_date` @default(now()) (no `expiration_date`)
    - _Requirements: 13.1, 13.3, 13.4, 13.6, 14.6, 15.1_

  - [x] 2.2 Definir esquema `property_listings` en `schema.prisma`
    - Modelos: `Property`, `Address`, `Listing`, `Photo`, `AdditionalFeature`, `PropertyAdditionalFeature`, `PropertyListingsRaw`
    - `portfolio_unit_id` en `Listing` como cross-schema ref sin FK declarada
    - _Requirements: 13.1, 13.3, 13.5, 14.1_

  - [x] 2.3 Definir esquema `landlord_portfolio` en `schema.prisma`
    - Modelos: `LandlordPortfolio`, `PortfolioUnit`, `Lease`, `PortfolioRaw`
    - `user_id` en `LandlordPortfolio` y `Lease` como cross-schema refs sin FK
    - _Requirements: 13.1, 13.3, 13.5, 14.2_

  - [x] 2.4 Definir esquema `tracking_process` en `schema.prisma`
    - Modelos: `LeaseStatus`, `LeaseStatusHistory`, `LeaseCurrentStatus`, `ListingStatus`, `ListingStatusHistory`, `ListingCurrentStatus`, `TrackingRaw`
    - `lease_id` y `listing_id` como cross-schema refs sin FK
    - _Requirements: 13.1, 13.3, 13.5, 14.3_

  - [x] 2.5 Definir esquemas `payments`, `accounting`, `notifications`, `contracts` en `schema.prisma`
    - `payments`: `ScheduledPayment`, `Payment`, `PaymentStatus`, `PaymentLog`, `PaymentsRaw`
    - `accounting`: `AggregatedPaymentReport`, `IndividualPaymentReport`, `AccountingRaw`
    - `notifications`: `NotificationType`, `NotificationPreference`, `NotificationsRaw`
    - `contracts`: `ContractStatus`, `Contract`, `ContractParty`, `FileType`, `FileStatus`, `File`, `SigningStatus`, `Signing`, `SigningLog`, `ContractsRaw`
    - _Requirements: 13.1, 13.3, 13.5, 14.4, 14.5, 14.7, 14.8_

  - [ ]* 2.6 Test de propiedad: migraciones Prisma son idempotentes
    - **Propiedad 51: Migraciones Prisma son idempotentes**
    - **Validates: Requirements 13.7**

  - [ ]* 2.7 Test de propiedad: restricciones de unicidad previenen duplicados
    - **Propiedad 50: Restricciones de unicidad en BD previenen duplicados**
    - **Validates: Requirements 13.4**


- [x] 3. Componentes transversales (`shared`)
  - [x] 3.1 Implementar `JwtAuthGuard` y `RBACGuard`
    - `JwtAuthGuard`: valida token JWT en todos los endpoints protegidos, retorna 401 si inválido/expirado
    - `RBACGuard`: verifica rol del usuario contra el endpoint, retorna 403 si rol incorrecto
    - Decoradores `@Roles()` y `@Public()` para configuración por endpoint
    - _Requirements: 1.8, 11.1_

  - [ ]* 3.2 Test de propiedad: token JWT inválido retorna 401
    - **Propiedad 8: Token JWT inválido o expirado retorna 401 en endpoints protegidos**
    - **Validates: Requirements 1.8**

  - [ ]* 3.3 Test de propiedad: rol incorrecto recibe 403
    - **Propiedad 11: RBAC — rol incorrecto recibe 403 en endpoints restringidos**
    - **Validates: Requirements 2.2, 7.5, 11.1**

  - [x] 3.4 Implementar `ValidationInterceptor`
    - Sanitización y validación de DTOs con `class-validator` + `class-transformer`
    - Rechazo de payloads con patrones SQL injection y XSS antes de llegar a la capa de aplicación
    - Formato de error consistente: `{ statusCode, message, errors? }`
    - _Requirements: 1.9, 11.6_

  - [ ]* 3.5 Test de propiedad: payloads maliciosos son sanitizados o rechazados
    - **Propiedad 9: Payloads maliciosos son sanitizados o rechazados en el boundary de la API**
    - Usar `arbitraryMaliciousPayload()` con patrones SQL injection y XSS
    - **Validates: Requirements 1.9, 11.6**

  - [x] 3.6 Implementar `AuditLoggerService`
    - Registro de acciones sensibles (firma, pago, cambio de rol, acceso a PII) con userId, acción, recurso y timestamp
    - Garantizar que los logs no contengan PII en texto plano (usar IDs anonimizados)
    - _Requirements: 11.7, 11.8_

  - [ ]* 3.7 Test de propiedad: acción sensible registrada en log de auditoría sin PII
    - **Propiedad 52: Acción sensible registrada en log de auditoría con usuario, acción, recurso y timestamp**
    - **Validates: Requirements 11.7, 11.8**

  - [x] 3.8 Implementar `CircuitBreakerFactory` y `RedisService`
    - `CircuitBreakerFactory`: factory para instanciar circuit breakers por adaptador externo (timeouts: 30s pagos, 15s firma/mensajería)
    - `RedisService`: cliente Redis compartido con patrón cache-aside y fallback a PostgreSQL
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 3.9 Test de propiedad: circuit breaker se abre ante fallos repetidos
    - **Propiedad 48: Circuit Breaker se abre ante fallos repetidos y retorna degradación controlada**
    - **Validates: Requirements 12.1, 12.2**

  - [ ]* 3.10 Test de propiedad: llamadas a servicios externos canceladas al superar timeout
    - **Propiedad 49: Llamadas a servicios externos son canceladas al superar el timeout configurado**
    - **Validates: Requirements 12.3**

- [x] 4. Checkpoint — Infraestructura base
  - Ensure all tests pass, ask the user if questions arise.


- [x] 5. Módulo `users` — Autenticación (US-AUT-01, US-AUT-02, US-AUT-03)
  - [x] 5.1 Implementar dominio y puertos del módulo `users`
    - Entidades: `UserEntity` (con `userType`, `documentTypeId`), `NaturalPersonDetail` (con `preferredName?`), `LegalPersonDetail`, `Role`, `Permission`
    - Puertos de salida: `IUserRepository` (incluye `findDocumentTypeByCode()` y `findAllDocumentTypes()`), `IPasswordHasher`, `IPIIEncryptor`, `IAuditLogger`
    - _Requirements: 1.1, 1.6, 1.7, 1.8, 15.1_

  - [x] 5.2 Implementar casos de uso: `RegisterUserUseCase`, `LoginUseCase`, `GetUserProfileUseCase`
    - `RegisterUserUseCase`: valida `documentTypeCode` contra catálogo (400 si no existe); crea cuenta con `user_type` como desnormalización del rol; rechaza correo duplicado con 409; cifra PII
    - `LoginUseCase`: autentica con bcrypt, genera JWT con rol e id; retorna 401 genérico ante credenciales incorrectas; registra intentos fallidos en audit log
    - `RegisterUserDto`: campos `userType`, `documentTypeCode`, `documentNumber`, `mail`, `phoneNumber` (10 dígitos), `password` (≥8 chars), `role`, `personType`, `naturalDetails?` (firstName, lastName, preferredName?), `legalDetails?`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.12, 1.13, 15.4_

  - [x] 5.3 Implementar adaptadores de infraestructura del módulo `users`
    - `PrismaUserRepository`: implementa todos los métodos del port incluyendo `findDocumentTypeByCode()` y `findAllDocumentTypes()`
    - `BcryptPasswordHasher`: bcrypt cost factor 12
    - `AES256PIIEncryptor`: AES-256-CBC con IV aleatorio, lee `PII_ENCRYPTION_KEY` del env
    - `JwtStrategy`: Passport JWT strategy con Bearer token
    - Endpoint `GET /auth/document-types` expuesto públicamente en `UsersController`
    - _Requirements: 1.6, 1.7, 1.10, 1.11, 15.3_

  - [ ]* 5.4 Test de propiedad: registro con datos válidos crea cuenta con rol asignado
    - **Propiedad 1: Registro de usuario con datos válidos crea cuenta con rol asignado**
    - Usar `arbitraryValidUser()` con 100 iteraciones
    - **Validates: Requirements 1.1**

  - [ ]* 5.5 Test de propiedad: correo duplicado rechazado con 409
    - **Propiedad 2: Correo duplicado es rechazado con 409**
    - **Validates: Requirements 1.2**

  - [ ]* 5.6 Test de propiedad: campos inválidos retornan 400 con detalle
    - **Propiedad 3: Campos inválidos o ausentes retornan 400 con detalle**
    - Usar `arbitraryInvalidRegistrationDto()`
    - **Validates: Requirements 1.3**

  - [ ]* 5.7 Test de propiedad: login con credenciales válidas retorna JWT con rol e id
    - **Propiedad 4: Login con credenciales válidas retorna JWT con rol e id**
    - **Validates: Requirements 1.4**

  - [ ]* 5.8 Test de propiedad: credenciales incorrectas retornan 401 con mensaje genérico
    - **Propiedad 5: Credenciales incorrectas retornan 401 con mensaje genérico**
    - **Validates: Requirements 1.5**

  - [ ]* 5.9 Test de propiedad: contraseñas almacenadas como hash bcrypt
    - **Propiedad 6: Contraseñas almacenadas como hash bcrypt, nunca en texto plano**
    - **Validates: Requirements 1.6**

  - [ ]* 5.10 Test de propiedad: campos PII cifrados en reposo
    - **Propiedad 7: Campos PII cifrados en reposo**
    - **Validates: Requirements 1.7, 11.5**

  - [ ]* 5.11 Test de propiedad: log de auditoría de login fallido sin PII
    - **Propiedad 10: Log de auditoría de login fallido contiene timestamp e IP sin PII**
    - **Validates: Requirements 1.10, 11.8**


- [x] 6. Módulo `landlord-portfolio` — Gestión de portafolio (US-06 a US-09)
  - [ ] 6.1 Implementar dominio y puertos del módulo `landlord-portfolio`
    - Entidades: `LandlordPortfolio`, `PortfolioUnit`, `Lease`
    - Puerto de salida: `IPortfolioRepository`, `IAuditLogger`
    - _Requirements: 2.1, 2.2_

  - [ ] 6.2 Implementar casos de uso: `CreatePortfolioUnitUseCase`, `GetPortfolioUseCase`, `UpdatePortfolioUnitUseCase`
    - `CreatePortfolioUnitUseCase`: crea unidad asociada al arrendador; rechaza con 403 si rol es TENANT
    - `GetPortfolioUseCase`: retorna solo unidades del arrendador autenticado
    - `UpdatePortfolioUnitUseCase`: persiste cambios; rechaza con 403 + audit log si el recurso no pertenece al usuario
    - Persistir datos de entrada en `PortfolioRaw` (JSONB) antes de transformación
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 6.3 Implementar `PrismaPortfolioRepository`
    - CRUD sobre esquema `landlord_portfolio`
    - _Requirements: 2.1, 2.4_

  - [ ]* 6.4 Test de propiedad: resource ownership — usuario solo accede a sus propios recursos
    - **Propiedad 12: Resource ownership — usuario solo accede a sus propios recursos**
    - Cubrir portafolio, contratos, pagos, leases
    - **Validates: Requirements 2.3, 2.5, 3.12, 5.3, 5.11, 6.9, 8.3, 8.4, 11.2, 11.3**

  - [ ]* 6.5 Test de propiedad: actualización de unidad de portafolio persiste cambios (round-trip)
    - **Propiedad 13: Actualización de unidad de portafolio persiste cambios (round-trip)**
    - **Validates: Requirements 2.4**

  - [ ]* 6.6 Test de propiedad: datos de entrada persisten en RAW_Table antes de transformación
    - **Propiedad 14: Datos de entrada se persisten en RAW_Table antes de transformación**
    - Usar `arbitraryRawPayload()`
    - **Validates: Requirements 2.6, 6.10, 10.1**


- [x] 7. Módulo `property-listings` — Exploración de oferta (US-01 a US-05)
  - [ ] 7.1 Implementar dominio y puertos del módulo `property-listings`
    - Entidades: `Property`, `Address`, `Listing`, `Photo`, `AdditionalFeature`
    - Puertos de salida: `IListingRepository`, `IObjectStorage`, `IListingCache`, `INotificationPort`
    - _Requirements: 3.1, 3.3_

  - [ ] 7.2 Implementar casos de uso de publicación y exploración
    - `CreateListingUseCase`: crea publicación en estado `PUBLISHED`; rechaza con 422 si no hay foto; almacena fotos en object storage, persiste solo URLs
    - `SearchListingsUseCase`: retorna solo publicaciones `PUBLISHED` con al menos una foto; aplica filtro por zona/barrio; sirve desde caché Redis (TTL 5 min) con fallback a PostgreSQL
    - `GetListingDetailUseCase`: retorna detalle completo (fotos, fecha, canon, habitaciones, baños, contacto arrendador)
    - `UnpublishListingUseCase`: cambia estado a `UNPUBLISHED`, invalida caché; rechaza con 403 si no es propietario
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12_

  - [ ] 7.3 Implementar `RegisterContactEventUseCase`
    - Registra evento de contacto con listing_id, tenant_id y timestamp
    - Dispara notificación al arrendador vía `INotificationPort`
    - Retorna 500 si falla la persistencia del evento
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [ ] 7.4 Implementar adaptadores: `PrismaListingRepository`, `RedisListingCache`, `ObjectStorageAdapter`
    - `RedisListingCache`: cache-aside con TTL 5 min, fallback transparente a PostgreSQL
    - `ObjectStorageAdapter`: upload de fotos, retorna URL de referencia
    - _Requirements: 3.3, 3.9, 3.10_

  - [ ]* 7.5 Test de propiedad: publicación sin foto rechazada con 422
    - **Propiedad 16: Publicación sin foto es rechazada con 422**
    - **Validates: Requirements 3.2**

  - [ ]* 7.6 Test de propiedad: fotos almacenadas en object storage — BD contiene solo URLs
    - **Propiedad 17: Fotos almacenadas en object storage — BD contiene solo URLs**
    - **Validates: Requirements 3.3**

  - [ ]* 7.7 Test de propiedad: listado público retorna solo PUBLISHED con al menos una foto
    - **Propiedad 18: Listado público retorna solo publicaciones PUBLISHED con al menos una foto**
    - Usar `fc.array(arbitraryListing())`
    - **Validates: Requirements 3.1, 3.4, 3.8**

  - [ ]* 7.8 Test de propiedad: filtro por zona retorna solo inmuebles de esa zona
    - **Propiedad 19: Filtro por zona retorna solo inmuebles de esa zona**
    - **Validates: Requirements 3.5**

  - [ ]* 7.9 Test de propiedad: detalle de inmueble contiene todos los campos requeridos
    - **Propiedad 20: Detalle de inmueble contiene todos los campos requeridos**
    - **Validates: Requirements 3.6, 3.7**

  - [ ]* 7.10 Test de propiedad: despublicar inmueble lo remueve del listado público
    - **Propiedad 21: Despublicar inmueble lo remueve del listado público (round-trip)**
    - **Validates: Requirements 3.11**

  - [ ]* 7.11 Test de propiedad: caché Redis sirve listado con TTL 5 minutos
    - **Propiedad 22: Caché Redis sirve listado con TTL 5 minutos**
    - **Validates: Requirements 3.9**

  - [ ]* 7.12 Test de propiedad: evento de contacto registra inmueble, arrendatario y timestamp
    - **Propiedad 23: Evento de contacto registra inmueble, arrendatario y timestamp**
    - **Validates: Requirements 4.1**

  - [ ]* 7.13 Test de propiedad: evento de contacto dispara notificación al arrendador
    - **Propiedad 24: Evento de contacto dispara notificación al arrendador**
    - **Validates: Requirements 4.2**

- [x] 8. Checkpoint — Módulos de exploración y portafolio
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 9. Módulo `contracts` — Gestión de contrato (US-10 a US-13)
  - [ ] 9.1 Implementar dominio y puertos del módulo `contracts`
    - Entidades: `Contract`, `ContractParty`, `File`, `Signing`, `SigningLog`
    - Puertos de salida: `IContractRepository`, `IObjectStorage`, `IESignatureProvider`, `INotificationPort`, `IAuditLogger`
    - Estados del contrato: `PENDING`, `SIGNATURE_PENDING`, `SIGNED`
    - _Requirements: 5.1, 5.5_

  - [ ] 9.2 Implementar casos de uso de contratos
    - `UploadContractUseCase`: almacena PDF en object storage, persiste referencia; rechaza con 422 si no es PDF o > 10 MB; rechaza con 403 si lease no pertenece al arrendador
    - `GetContractSummaryUseCase`: retorna resumen con campos clave + URL del documento; rechaza con 403 si usuario no es parte del lease
    - `InitiateSigningUseCase`: invoca `IESignatureProvider` con circuit breaker (timeout 15s); registra eventos en audit log
    - `HandleSigningWebhookUseCase`: actualiza estado a `SIGNED` con fecha y tx_id del proveedor; dispara notificación a ambas partes; bloquea modificaciones en estado `SIGNED`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [ ] 9.3 Implementar adaptador `ESignatureProviderAdapter`
    - Circuit breaker con timeout 15s y 2 reintentos con backoff exponencial
    - Estado intermedio `SIGNATURE_PENDING` ante circuit abierto
    - _Requirements: 5.7, 12.1, 12.3_

  - [ ]* 9.4 Test de propiedad: contrato PDF almacenado en object storage con referencia en BD
    - **Propiedad 25: Contrato PDF almacenado en object storage con referencia en BD (round-trip)**
    - **Validates: Requirements 5.1**

  - [ ]* 9.5 Test de propiedad: archivo inválido rechazado con 422
    - **Propiedad 26: Archivo inválido (no PDF o > 10MB) es rechazado con 422**
    - **Validates: Requirements 5.2**

  - [ ]* 9.6 Test de propiedad: resumen de contrato contiene campos clave y URL
    - **Propiedad 27: Resumen de contrato contiene campos clave y URL del documento**
    - **Validates: Requirements 5.4**

  - [ ]* 9.7 Test de propiedad: firma exitosa actualiza estado a SIGNED con metadatos
    - **Propiedad 28: Firma exitosa actualiza estado del contrato a SIGNED con metadatos**
    - **Validates: Requirements 5.6**

  - [ ]* 9.8 Test de propiedad: contrato SIGNED dispara notificación a ambas partes
    - **Propiedad 29: Contrato SIGNED dispara notificación a ambas partes**
    - **Validates: Requirements 5.8**

  - [ ]* 9.9 Test de propiedad: eventos de firma registrados en log de auditoría
    - **Propiedad 30: Eventos de firma registrados en log de auditoría**
    - **Validates: Requirements 5.9**

  - [ ]* 9.10 Test de propiedad: contrato SIGNED es inmutable
    - **Propiedad 31: Contrato SIGNED es inmutable — no permite modificaciones**
    - **Validates: Requirements 5.10**


- [ ] 10. Módulo `payments` — Gestión de pagos (US-14 a US-17)
  - [ ] 10.1 Implementar dominio y puertos del módulo `payments`
    - Entidades: `ScheduledPayment`, `Payment`, `PaymentStatus`, `PaymentLog`
    - Puertos de salida: `IPaymentRepository`, `IPaymentGateway`, `INotificationPort`, `IAuditLogger`
    - _Requirements: 6.1, 6.6_

  - [ ] 10.2 Implementar casos de uso de pagos
    - `InitiatePaymentUseCase`: genera `Idempotency_Key` única, redirige a pasarela; persiste evento en `PaymentsRaw` (JSONB); rechaza con 503 si circuit breaker está abierto
    - `HandlePaymentWebhookUseCase`: actualiza `ScheduledPayment` a `PAID` con tx_id, monto y fecha; mantiene `PENDING` si rechazado; registra estado `PROCESSING` si timeout
    - `GetPaymentHistoryUseCase`: retorna solo pagos del usuario autenticado, ordenados por fecha desc; rechaza con 403 si intenta acceder a pagos de otro usuario
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11_

  - [ ] 10.3 Implementar adaptador `PaymentGatewayAdapter`
    - Circuit breaker con timeout 30s y 2 reintentos con backoff exponencial
    - Idempotency Key incluida en cada solicitud a la pasarela
    - Estado intermedio `PROCESSING` ante circuit abierto
    - _Requirements: 6.1, 6.2, 6.5, 6.11, 12.1, 12.3_

  - [ ]* 10.4 Test de propiedad: idempotency key única previene transacciones duplicadas
    - **Propiedad 32: Idempotency Key única por transacción de pago previene duplicados**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 10.5 Test de propiedad: pago confirmado actualiza estado a PAID con metadatos
    - **Propiedad 33: Pago confirmado actualiza estado a PAID con metadatos completos**
    - Usar `arbitraryPaymentEvent()`
    - **Validates: Requirements 6.3**

  - [ ]* 10.6 Test de propiedad: pago rechazado mantiene estado PENDING
    - **Propiedad 34: Pago rechazado mantiene estado PENDING**
    - **Validates: Requirements 6.4**

  - [ ]* 10.7 Test de propiedad: cada evento de pago genera registro en payment_logs
    - **Propiedad 35: Cada evento de pago genera registro en payment_logs con campos requeridos**
    - **Validates: Requirements 6.6**

  - [ ]* 10.8 Test de propiedad: pago confirmado dispara notificación al arrendador
    - **Propiedad 36: Pago confirmado dispara notificación al arrendador**
    - **Validates: Requirements 6.7**

  - [ ]* 10.9 Test de propiedad: historial de pagos retorna solo pagos del usuario solicitante
    - **Propiedad 37: Historial de pagos retorna solo pagos del usuario solicitante, ordenados por fecha desc**
    - **Validates: Requirements 6.8**

- [ ] 11. Checkpoint — Módulos de contrato y pagos
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 12. Módulo `accounting` — Reportes contables (US-17)
  - [ ] 12.1 Implementar casos de uso de contabilidad
    - `GetAggregatedReportUseCase`: calcula ingresos del periodo desde pagos `PAID` en Curated_Table; retorna total cero con mensaje si no hay pagos; sirve reportes históricos (> 24h) desde caché Redis (TTL 1h)
    - `GetIndividualReportUseCase`: reporte por unidad de portafolio; rechaza con 403 si rol es TENANT
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 12.2 Implementar `PrismaAccountingRepository` y `RedisReportCache`
    - Lectura exclusiva de tablas curadas del esquema `accounting`
    - Cache-aside con TTL 1h para reportes históricos
    - _Requirements: 7.2, 7.4_

  - [ ]* 12.3 Test de propiedad: reporte contable agrega correctamente pagos PAID del periodo
    - **Propiedad 38: Reporte contable agrega correctamente pagos PAID del periodo**
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 12.4 Test de propiedad: reportes históricos servidos desde caché Redis con TTL 1 hora
    - **Propiedad 39: Reportes históricos servidos desde caché Redis con TTL 1 hora**
    - **Validates: Requirements 7.4**

- [ ] 13. Módulo `rental-tracking` — Seguimiento del proceso (US-18 a US-19)
  - [ ] 13.1 Implementar dominio y puertos del módulo `rental-tracking`
    - Máquina de estados: `PUBLISHED → CONTACT_INITIATED → CONTRACT_UPLOADED → CONTRACT_SIGNED → PAYMENT_RECEIVED`
    - Puerto de salida: `ITrackingRepository`, `INotificationPort`
    - _Requirements: 8.1, 8.2_

  - [ ] 13.2 Implementar casos de uso de tracking
    - `TransitionLeaseStateUseCase`: registra transición en `LeaseStatusHistory` con estado anterior, nuevo y timestamp; dispara notificación a ambas partes al transicionar a `CONTRACT_SIGNED` o `PAYMENT_RECEIVED`
    - `GetLeaseStatusUseCase`: retorna estado actual e historial; rechaza con 403 si usuario no es arrendador ni arrendatario del lease
    - `GetActiveLeasesSummaryUseCase`: retorna estado resumido de todos los leases activos del usuario (nombre inmueble, estado actual, fecha último cambio)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 13.3 Test de propiedad: estado actual del Lease siempre es un valor válido del enum
    - **Propiedad 40: Estado actual del Lease siempre es un valor válido del enum**
    - Usar `arbitraryLeaseState()`
    - **Validates: Requirements 8.1**

  - [ ]* 13.4 Test de propiedad: transición de estado registra estado anterior, nuevo y timestamp
    - **Propiedad 41: Transición de estado del Lease registra estado anterior, nuevo y timestamp**
    - **Validates: Requirements 8.2**

  - [ ]* 13.5 Test de propiedad: transición a CONTRACT_SIGNED o PAYMENT_RECEIVED dispara notificación
    - **Propiedad 42: Transición a CONTRACT_SIGNED o PAYMENT_RECEIVED dispara notificación a ambas partes**
    - **Validates: Requirements 8.5**

  - [ ]* 13.6 Test de propiedad: estado curado del Lease coherente con último registro del historial
    - **Propiedad 43: Estado curado del Lease es coherente con el último registro del historial**
    - **Validates: Requirements 8.7**


- [ ] 14. Módulo `notifications` — Sistema de notificaciones
  - [ ] 14.1 Implementar dominio y puertos del módulo `notifications`
    - Entidades: `NotificationType`, `NotificationPreference`
    - Puerto de salida: `INotificationRepository`, `IMessagingChannel`, `IAuditLogger`
    - Canales soportados: EMAIL, WHATSAPP
    - _Requirements: 9.1, 9.4_

  - [ ] 14.2 Implementar casos de uso de notificaciones
    - `SendNotificationUseCase`: determina canal preferido del usuario; envía por canal preferido; reintenta hasta 2 veces con backoff exponencial ante fallo del canal externo; persiste notificación con estado (SENT, FAILED, PENDING), canal, timestamp y evento origen; registra fallo definitivo en audit log sin interrumpir flujo principal
    - `UpdateNotificationPreferencesUseCase`: actualiza preferencias; aplica a notificaciones futuras sin afectar las ya encoladas
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ] 14.3 Implementar `MessagingChannelAdapter`
    - Circuit breaker con timeout 15s y 2 reintentos con backoff exponencial
    - Soporte para EMAIL y WHATSAPP
    - _Requirements: 9.3, 12.1, 12.3_

  - [ ]* 14.4 Test de propiedad: notificación enviada por el canal preferido del usuario
    - **Propiedad 44: Notificación enviada por el canal preferido del usuario**
    - **Validates: Requirements 9.2**

  - [ ]* 14.5 Test de propiedad: notificación persistida con estado, canal, timestamp y evento origen
    - **Propiedad 45: Notificación persistida con estado, canal, timestamp y evento origen**
    - **Validates: Requirements 9.4**

  - [ ]* 14.6 Test de propiedad: preferencias desactivadas previenen envío por ese canal
    - **Propiedad 46: Preferencias de notificación desactivadas previenen envío por ese canal**
    - **Validates: Requirements 9.6**

  - [ ]* 14.7 Test de propiedad: cambio de preferencias aplica a notificaciones futuras
    - **Propiedad 47: Cambio de preferencias aplica a notificaciones futuras**
    - **Validates: Requirements 9.7**

- [ ] 15. Checkpoint — Módulos de tracking y notificaciones
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 16. ETL Cron Jobs — Transformación RAW → Curated por módulo
  - [ ] 16.1 Implementar ETL job para módulo `users`
    - Cron job que selecciona registros `UsersRaw` con `processed = false`
    - Transforma payload JSONB a columnas tipadas en tablas curadas del esquema `users`
    - Marca registro como `processed = true` tras transformación exitosa; marca como `ETL_ERROR` con motivo si payload inválido
    - Continúa procesando demás registros ante errores individuales
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 16.2 Implementar ETL jobs para módulos `property-listings` y `landlord-portfolio`
    - Misma lógica de transformación RAW → Curated para `PropertyListingsRaw` y `PortfolioRaw`
    - Garantizar que Curated_Tables sean la fuente de verdad para consultas de lectura
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 16.3 Implementar ETL jobs para módulos `payments`, `contracts`, `tracking_process`, `notifications`, `accounting`
    - ETL jobs para `PaymentsRaw`, `ContractsRaw`, `TrackingRaw`, `NotificationsRaw`, `AccountingRaw`
    - Garantizar separación de esquemas: ningún ETL realiza joins cross-schema
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 13.7_

  - [ ]* 16.4 Test de propiedad: ETL round-trip — contenido curado equivalente al RAW original
    - **Propiedad 15: ETL round-trip — contenido curado es equivalente al RAW original**
    - Usar `arbitraryRawPayload()` con 100 iteraciones por módulo
    - **Validates: Requirements 2.7, 10.2, 10.3, 10.6**

- [ ] 17. Integración y cableado de módulos
  - [ ] 17.1 Registrar todos los módulos en `AppModule` y configurar dependencias inter-módulo
    - Registrar `UsersModule`, `PropertyListingsModule`, `LandlordPortfolioModule`, `ContractsModule`, `PaymentsModule`, `AccountingModule`, `RentalTrackingModule`, `NotificationsModule`
    - Configurar `INotificationPort` como adaptador compartido entre módulos que disparan notificaciones
    - Aplicar `JwtAuthGuard` y `ValidationInterceptor` globalmente
    - _Requirements: 11.1, 11.6_

  - [ ] 17.2 Configurar controladores REST por módulo
    - Controladores con decoradores `@UseGuards(JwtAuthGuard, RBACGuard)` por endpoint
    - Rutas: `/auth/*`, `/listings/*`, `/portfolio/*`, `/contracts/*`, `/payments/*`, `/accounting/*`, `/tracking/*`, `/notifications/*`
    - _Requirements: 11.1, 11.2_

  - [ ] 17.3 Configurar seeds de base de datos
    - Seeds para roles (`LANDLORD`, `TENANT`), permisos por rol
    - Seeds para tipos de documento: `CC` (Cédula de Ciudadanía), `NIT` (Número de Identificación Tributaria), `CE` (Cédula de Extranjería), `PP` (Pasaporte), `TI` (Tarjeta de Identidad)
    - Seeds para estados de lease: `PUBLISHED`, `CONTACT_INITIATED`, `CONTRACT_UPLOADED`, `CONTRACT_SIGNED`, `PAYMENT_RECEIVED`
    - Seeds para estados de contrato: `PENDING`, `SIGNATURE_PENDING`, `SIGNED`
    - Seeds para estados de pago: `PENDING`, `PROCESSING`, `PAID`, `REJECTED`
    - Seeds para tipos de notificación: `NEW_INTEREST`, `CONTRACT_SIGNED`, `PAYMENT_RECEIVED`, `PAYMENT_DUE`
    - Archivo en `db/seeds/`
    - _Requirements: 11.1, 8.1, 15.2_

- [ ] 18. Checkpoint final — Integración completa
  - Ensure all tests pass, ask the user if questions arise.


## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad completa
- Los tests de propiedades usan **fast-check** con `numRuns: 100` y comentario de trazabilidad:
  `// Feature: backend-database-implementation, Property N: <texto>`
- Los generadores `arbitraryValidUser()`, `arbitraryInvalidRegistrationDto()`, `arbitraryListing()`, `arbitraryLeaseState()`, `arbitraryRawPayload()`, `arbitraryMaliciousPayload()` y `arbitraryPaymentEvent()` deben implementarse en `src/backend/shared/test/arbitraries.ts` antes de los tests de propiedades
- Las referencias cross-schema (e.g. `user_id` en `LandlordPortfolio`) se resuelven por ID sin FK declarada en Prisma — nunca joins directos entre esquemas
- El orden de implementación garantiza que cada módulo se integra sobre infraestructura ya validada

## Decisiones de diseño aplicadas durante la implementación

Las siguientes decisiones surgieron durante la implementación y están reflejadas en el código y en los documentos de requisitos y diseño:

### Esquema `users` — ajustes al modelo físico
- **`user_type`** es una desnormalización del rol (`LANDLORD`/`TENANT`) almacenada directamente en `User` para permitir lookups rápidos sin join con `users_roles`.
- **`DocumentType`** es un catálogo normalizado (tabla separada) en lugar de un string libre en `User`. Centraliza los tipos válidos (CC, NIT, CE, PP, TI) y permite que el backend exponga `GET /auth/document-types` para que el frontend pueble sus dropdowns.
- **`NaturalPersonDetail`** no incluye `birth_date` ni `pref_cl_type`. Incluye `preferred_name?` para comunicaciones cercanas con el usuario.
- **`UserRole`** tiene PK propia (`id UUID`) en lugar de clave compuesta `(user_id, role_id)`, alineado con el ERD del diseño.
- **`User.registration_date`** reemplaza `expiration_date` — registra cuándo se creó la cuenta.

### Escenarios Gherkin de ClickUp incorporados
Los escenarios Gherkin extraídos de la lista "Implementación del Prototipo" en ClickUp fueron incorporados como criterios de aceptación adicionales en los requisitos y como guía para los casos de uso implementados:
- **US-01**: búsqueda básica por texto con mensaje claro si no hay resultados
- **US-02**: filtro por zona actualiza el listado mostrando solo inmuebles de esa zona
- **US-03**: cada tarjeta del listado muestra al menos una foto representativa
- **US-04**: fecha de publicación visible en el detalle del inmueble
- **US-05**: botón "contactar" desde el detalle registra la solicitud para el arrendador
- **US-06**: publicación con campos básicos queda visible en el listado
- **US-07**: bloquear publicación sin fotos con mensaje explicativo
- **US-08**: flujo completo de publicación funcional desde celular
- **US-09**: notificación al arrendador cuando hay nuevo interesado
- **US-10**: contrato subido queda asociado al arriendo y disponible para el arrendatario
- **US-11**: resumen de puntos clave (canon, duración, reajustes, penalidades) antes del texto completo
- **US-12**: firma digital por ambas partes, contrato firmado disponible para consulta
- **US-13**: notificación de confirmación al completar la firma de todas las partes
- **US-14**: pago exitoso vía pasarela registrado para el periodo correspondiente
- **US-15**: notificación al arrendador tras pago exitoso
- **US-16**: historial con fecha, valor y estado de cada pago
- **US-17**: reporte mensual de ingresos por arriendo
- **US-18**: estado consolidado visible: publicado / contrato firmado / pago al día
- **US-19**: notificaciones en eventos clave: contrato firmado, pago registrado, pago próximo a vencer
