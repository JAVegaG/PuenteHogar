# Backend — NestJS API

API REST del sistema de gestión de arriendo de vivienda. Implementada como monolito modular con arquitectura hexagonal por módulo.

## Stack

- **Framework**: NestJS + TypeScript (`module: NodeNext` in tsconfig)
- **Prisma config**: `prisma.config.ts` at `src/backend/` root — points schema to `./db/prisma/schema.prisma`
- **ORM**: Prisma (`@prisma/client`) + PostgreSQL
- **Caché**: Redis (`ioredis`, cache-aside)
- **Autenticación**: JWT (`@nestjs/jwt`, `passport-jwt`)
- **Validación**: `class-validator` + `class-transformer`
- **Scheduling**: `@nestjs/schedule` (ETL cron jobs)
- **HTTP Logging**: Morgan (piped through NestJS `Logger`)
- **Security Hardening**: Helmet (HTTP security headers)
- **Testing**: Jest + `ts-jest`

## Estructura

```
src/backend/
├── db/
│   ├── prisma/
│   │   ├── schema.prisma    # Schema Prisma completo (8 esquemas PostgreSQL)
│   │   └── migrations/      # Migraciones generadas por Prisma
│   └── seeds/
│       ├── seed.ts                          # Seed de catálogos (roles, tipos de documento, tipos de propiedad, departamentos, ciudades, estados)
│       └── states_citys_colombia.seed.csv   # Datos DANE: 33 departamentos, 1,122 municipios (delimitado por ;)
├── src/
│   ├── app.module.ts           # Módulo raíz
│   ├── main.ts                 # Bootstrap: NestExpressApplication, Helmet, trust proxy, ValidationPipe, Swagger, CORS, Morgan HTTP logging (format: 'dev' | 'combined' según NODE_ENV)
│   ├── config/
│   │   └── configuration.ts   # Variables de entorno tipadas
│   └── shared/                 # Componentes transversales
│       ├── audit/              # AuditLoggerService (sin PII en logs)
│       ├── circuit-breaker/    # CircuitBreaker + CircuitBreakerFactory
│       ├── decorators/         # @Roles(), @Public()
│       ├── etl/                # parsePayload<T>() helper para lectura backward-compatible de tablas RAW
│       ├── guards/             # JwtAuthGuard, RBACGuard
│       ├── interceptors/       # ValidationInterceptor (XSS/SQL sanitization)
│       │   └── validation-malicious-payload.spec.ts  # PBT Property 9: payloads maliciosos sanitizados
│       ├── prisma/             # PrismaModule + PrismaService + soft-delete utilities
│       │   ├── soft-delete.utils.ts          # Utilidades de soft delete: softDeleteFilter, softDeleteData(), withSoftDeleteFilter()
│       │   ├── soft-delete.utils.spec.ts     # Tests unitarios de soft-delete utilities
│       │   ├── prisma-migrations.spec.ts   # PBT Property 51: idempotencia de migraciones
│       │   └── prisma-uniqueness.spec.ts   # PBT Property 50: restricciones de unicidad
│       ├── redis/              # RedisService (cache-aside con fallback)
│       └── s3/                 # S3ClientFactory, object-key utils, custom exceptions (ObjectStorage*)
└── modules/
    ├── users/                  # Registro, login, RBAC
    ├── property-listings/      # Publicaciones, búsqueda con filtros extendidos (departamento, ciudad, barrio, características adicionales), fotos, gestión de publicaciones (editar, despublicar, consulta por unidad), catálogo de características adicionales activas (con metadata: type, element, active, main, required, error_message)
    ├── landlord-portfolio/     # Portafolios (CRUD completo: crear, listar, actualizar, eliminar), unidades enriquecidas (cross-schema Property+Address+PortfolioUnit, con unitStatus/hasActiveListing/tenantName/monthlyRent computados; crear, actualizar, eliminar con validación de arriendos activos), leases (listado por unidad, detalle con info de arrendatario descifrada via IPIIEncryptor, cancelación con cascada de contrato y transición de estado a Finalizado), catálogo geográfico (departamentos/ciudades DANE)
    ├── contracts/              # Contratos (CRUD: crear con upload S3 real, consultar con presigned URL, reemplazar PDF en PENDING, eliminar con guardas de estado), firma electrónica, almacenamiento de documentos en S3 (presigned URLs, 15 min TTL), listado de contratos por arrendador (cross-schema: Contract→Lease→PortfolioUnit→LandlordPortfolio), listado de contratos por arrendatario (cross-schema: ContractParty→Contract→Lease→PortfolioUnit, con resolución de nombre de unidad y arrendador via PII decryption), signing details por parte
    ├── payments/               # Pagos, pasarela, idempotencia (dominio, aplicación, infraestructura, controlador)
    ├── accounting/             # Reportes financieros (dominio, aplicación, infraestructura: PrismaAccountingRepository + RedisReportCache)
    ├── rental-tracking/        # Máquina de estados del arriendo (dominio, aplicación, infraestructura, controlador)
    ├── notifications/          # Notificaciones multicanal (dominio, aplicación, infraestructura, controlador)
    └── shared/                 # Helpers compartidos entre módulos de dominio
```

## Arquitectura por módulo

Cada módulo sigue la estructura hexagonal:

```
modules/{nombre}/
├── domain/           # Entidades, value objects, interfaces de puertos
├── application/      # Casos de uso (input ports), DTOs
├── infrastructure/   # Adaptadores: Prisma, Redis, APIs externas
└── {nombre}.module.ts
```

## Componentes transversales

| Componente | Descripción |
|-----------|-------------|
| `JwtAuthGuard` | Valida JWT en endpoints protegidos; omite con `@Public()` |
| `RBACGuard` | Verifica rol del usuario contra `@Roles()` |
| `ValidationInterceptor` | Sanitiza XSS y SQL injection en `request.body` |
| `AuditLoggerService` | Registra acciones sensibles sin PII en texto plano |
| `CircuitBreakerFactory` | Instancia circuit breakers por tipo de integración externa |
| `RedisService` | Cache-aside con fallback transparente a PostgreSQL |
| `PrismaService` | Cliente Prisma singleton compartido entre módulos (`@src/shared/prisma/`) |
| `softDeleteFilter` / `softDeleteData()` / `withSoftDeleteFilter()` | Utilidades de soft delete para queries Prisma. Prisma 6+ no soporta la API `$use` middleware, así que el soft delete se implementa como helpers que los repositorios usan al construir sus queries. `softDeleteFilter` filtra registros eliminados en lecturas, `softDeleteData()` genera el payload para marcar como eliminado, `withSoftDeleteFilter()` inyecta el filtro condicionalmente. No aplica a tablas RAW. (`@src/shared/prisma/soft-delete.utils.ts`) |
| `parsePayload<T>()` | Helper ETL para leer payloads de tablas RAW con compatibilidad hacia atrás (maneja tanto JSON propio como strings legacy). (`@src/shared/etl/parse-payload.ts`) |
| `S3ClientFactory` | Crea y cachea una instancia de `S3Client` (AWS SDK v3); soporta endpoint personalizado para LocalStack/MinIO |
| `@aws-sdk/s3-request-presigner` | Genera presigned URLs para descarga segura de archivos privados en S3 (usado por `ContractObjectStorageAdapter.getPresignedUrl()`) |

> Los módulos acceden a `shared/` mediante el alias `@src/shared/` (resuelto por `tsconfig.paths` como `@src/*` → `./src/*`).

## Dependencias inter-módulo

`UsersModule` exporta `JwtModule` y `PII_ENCRYPTOR` — los módulos que necesiten validar tokens JWT deben importar `UsersModule` o configurar `JwtModule` directamente. Los módulos que necesiten descifrar campos PII (e.g. `document_number`, `phone_number`) inyectan `IPIIEncryptor` via el token `PII_ENCRYPTOR` exportado por `UsersModule`.

### Cross-Module Query Ports

Los módulos exponen interfaces de consulta cross-module para evitar queries SQL directos entre esquemas:

| Token | Módulo fuente | Métodos |
|-------|---------------|---------|
| `PORTFOLIO_CROSS_MODULE_QUERY` | `landlord-portfolio` | `hasActiveLeases(userId)`, `hasPortfoliosWithUnits(userId)`, `hasActiveLeasesInPortfolios(userId)` |
| `CONTRACTS_CROSS_MODULE_QUERY` | `contracts` | `hasActiveContractsAsRole(userId, role)` |
| `PAYMENTS_CROSS_MODULE_QUERY` | `payments` | `hasPendingPayments(userId)` |

Estos ports se inyectan en módulos consumidores (e.g. `UsersModule`) via NestJS DI. Cada implementación consulta únicamente su propio esquema PostgreSQL.

## Soft Delete

Todas las tablas (excepto RAW) tienen una columna `deleted_at DateTime?`. Dado que Prisma 6+ no soporta la API `$use` middleware, el soft delete se implementa como **utilidades de query** que los repositorios y servicios usan explícitamente:

- **`softDeleteFilter`**: constante `{ deleted_at: null }` — spread en el `where` de lecturas para excluir registros eliminados
- **`softDeleteData()`**: retorna `{ deleted_at: new Date() }` — usar como `data` en `update`/`updateMany` en lugar de `delete`/`deleteMany`
- **`withSoftDeleteFilter(where?)`**: inyecta `deleted_at: null` en un objeto `where` si `deleted_at` no está ya presente (bypass automático)
- **Bypass**: no incluir `softDeleteFilter` en el `where`, o pasar `deleted_at: { not: null }` explícitamente
- **Excluidas**: tablas RAW (`UsersRaw`, `PortfolioRaw`, etc.) — usan flag `processed` en su lugar

```typescript
import { softDeleteFilter, softDeleteData, withSoftDeleteFilter } from '@src/shared/prisma/soft-delete.utils.js';

// Lectura (excluir eliminados):
const users = await prisma.user.findMany({ where: { ...softDeleteFilter, is_active: true } });

// Eliminación suave:
await prisma.user.update({ where: { id }, data: softDeleteData() });

// Inyección condicional:
const where = withSoftDeleteFilter({ is_active: true }); // => { is_active: true, deleted_at: null }
```

## Seguridad

- **Helmet**: cabeceras HTTP de seguridad habilitadas por defecto (`helmet()`)
- **`x-powered-by` deshabilitado**: `app.disable('x-powered-by')`
- **Trust proxy**: configurado como `'linklocal'` para entornos con proxy reverso en red local
- **RBAC + resource ownership**: cada usuario solo accede a sus propios recursos
- **PII cifrado en reposo**: `document_number` y `phone_number` con AES-256
- **Contraseñas**: bcrypt con cost factor ≥ 12
- **Audit log**: todas las acciones sensibles registradas con userId, acción, recurso y timestamp

## Circuit Breaker

| Integración | Timeout | Umbral de fallos |
|------------|---------|-----------------|
| Pasarela de pagos | 30s | 3 fallos |
| Proveedor de firma | 15s | 3 fallos |
| Canal de mensajería | 15s | 3 fallos |

## Path Aliases (tsconfig)

| Alias | Resolves to |
|-------|-------------|
| `@src/*` | `./src/*` |
| `@modules/*` | `./modules/*` |
| `@prisma-generated/*` | `./db/prisma/src/*` |

> **NodeNext import convention**: `"module": "NodeNext"` is set in `tsconfig.json` and the package has `"type": "module"`, so it runs as ESM. Relative imports **must** use `.js` extensions (e.g. `import './foo.js'`). Path-alias imports (`@src/...`, `@modules/...`) are resolved via `tsconfig.paths` as usual.

> **`types`**: restricted to `["node", "jest"]` — only Node.js and Jest type definitions are included globally. This prevents ambient type pollution from other `@types/*` packages.

> **`noImplicitAny`**: currently disabled in `tsconfig.json`. Parameters with implicit `any` types (e.g. Prisma transaction callbacks) are allowed but should be typed explicitly where possible.

> **`strictPropertyInitialization`**: enabled. All class properties must be explicitly initialized in the constructor or marked with the definite assignment assertion (`!`). DTOs use `!` on decorated fields (e.g. `name!: string`) since `class-validator` decorators guarantee runtime presence.

## API Documentation (Swagger)

Disponible en `http://localhost:{PORT}/api/docs` cuando el servidor está corriendo.

- Autenticación: JWT Bearer token via el botón "Authorize" en Swagger UI
- Todos los endpoints protegidos requieren `@ApiBearerAuth('JWT')`
- Todos los controladores tienen `@ApiTags`, `@ApiOperation` y decoradores de respuesta por ruta

## Testing

Jest is configured in `jest.config.ts` with:
- Roots: `src/` and `modules/`
- Path aliases: `@src/*` → `./src/*`, `@modules/*` → `./modules/*`
- Transform: `ts-jest`
- Test pattern: `*.spec.ts`

> **Note**: The `@prisma-generated/*` alias is **not** mapped in Jest's `moduleNameMapper`. Tests that depend on Prisma types must mock `@prisma-generated/client` (e.g. via `jest.mock()`) rather than resolving it directly. This avoids pulling the full Prisma client into the test environment.

Property-based tests use `fast-check` with `numRuns: 100` and traceability comments linking to spec requirements.

## Scripts

```bash
npm run start:dev          # Servidor en modo desarrollo (watch)
npm run build              # Build de producción
npm run test               # Tests unitarios y de propiedades (Jest)
npm run lint               # ESLint
npm run migration:run      # Aplica migraciones Prisma (desde src/backend/)
npm run migration:generate # Genera nueva migración (desde src/backend/)
npm run db:studio          # Prisma Studio
npm run db:seed            # Seed de catálogos (roles, tipos de documento, tipos de propiedad, departamentos/ciudades DANE, estados)
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión PostgreSQL |
| `REDIS_URL` | URL de conexión Redis |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `JWT_EXPIRES_IN` | Expiración del token (ej. `1d`) |
| `OBJECT_STORAGE_BUCKET` | Bucket para fotos y contratos |
| `OBJECT_STORAGE_ENDPOINT` | Endpoint del servicio de almacenamiento (opcional; para LocalStack/MinIO) |
| `OBJECT_STORAGE_REGION` | Región del servicio S3 (default: `us-east-1`) |
| `PII_ENCRYPTION_KEY` | Clave AES-256 para cifrado de campos PII |
| `PORT` | Puerto del servidor (default: `3000`) |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`) |
| `CORS_ORIGINS` | Orígenes permitidos (separados por coma). Si no se define, acepta cualquier origen en desarrollo |
| `AWS_ACCESS_KEY_ID` | Clave de acceso AWS (opcional; el SDK la resuelve automáticamente en entornos AWS. Definir explícitamente para desarrollo local con LocalStack/MinIO) |
| `AWS_SECRET_ACCESS_KEY` | Secreto de acceso AWS (misma nota que `AWS_ACCESS_KEY_ID`) |
