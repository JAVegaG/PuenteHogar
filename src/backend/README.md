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
│       └── seed.ts          # Seed de catálogos (roles, tipos de documento, estados)
├── src/
│   ├── app.module.ts           # Módulo raíz
│   ├── main.ts                 # Bootstrap: NestExpressApplication, Helmet, trust proxy, ValidationPipe, Swagger, CORS, Morgan HTTP logging (format: 'dev' | 'combined' según NODE_ENV)
│   ├── config/
│   │   └── configuration.ts   # Variables de entorno tipadas
│   └── shared/                 # Componentes transversales
│       ├── audit/              # AuditLoggerService (sin PII en logs)
│       ├── circuit-breaker/    # CircuitBreaker + CircuitBreakerFactory
│       ├── decorators/         # @Roles(), @Public()
│       ├── guards/             # JwtAuthGuard, RBACGuard
│       ├── interceptors/       # ValidationInterceptor (XSS/SQL sanitization)
│       │   └── validation-malicious-payload.spec.ts  # PBT Property 9: payloads maliciosos sanitizados
│       ├── prisma/             # PrismaModule + PrismaService (singleton compartido)
│       │   ├── prisma-migrations.spec.ts  # PBT Property 51: idempotencia de migraciones
│       │   └── prisma-uniqueness.spec.ts  # PBT Property 50: restricciones de unicidad
│       └── redis/              # RedisService (cache-aside con fallback)
└── modules/
    ├── users/                  # Registro, login, RBAC
    ├── property-listings/      # Publicaciones, búsqueda, fotos
    ├── landlord-portfolio/     # Portafolio, unidades, leases
    ├── contracts/              # Contratos, firma electrónica, almacenamiento de documentos
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

> Los módulos acceden a `shared/` mediante el alias `@src/shared/` (resuelto por `tsconfig.paths` como `@src/*` → `./src/*`).

## Dependencias inter-módulo

`UsersModule` exporta `JwtModule` — los módulos que necesiten validar tokens JWT deben importar `UsersModule` o configurar `JwtModule` directamente.

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
| `@prisma-generated/*` | `./prisma/generated/*` |

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
- Path aliases: `@src/*` → `./src/*`, `@modules/*` → `./modules/*` (mirrors `tsconfig.json`)
- Transform: `ts-jest`
- Test pattern: `*.spec.ts`

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
npm run db:seed            # Seed de catálogos (roles, tipos de documento, estados)
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión PostgreSQL |
| `REDIS_URL` | URL de conexión Redis |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `JWT_EXPIRES_IN` | Expiración del token (ej. `1d`) |
| `OBJECT_STORAGE_BUCKET` | Bucket para fotos y contratos |
| `OBJECT_STORAGE_ENDPOINT` | Endpoint del servicio de almacenamiento |
| `PII_ENCRYPTION_KEY` | Clave AES-256 para cifrado de campos PII |
| `PORT` | Puerto del servidor (default: `3000`) |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`) |
| `CORS_ORIGINS` | Orígenes permitidos (separados por coma). Si no se define, acepta cualquier origen en desarrollo |
