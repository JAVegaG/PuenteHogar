# Backend — NestJS API

API REST del sistema de gestión de arriendo de vivienda. Implementada como monolito modular con arquitectura hexagonal por módulo.

## Stack

- **Framework**: NestJS + TypeScript (`"type": "module"` — ESM package, `module: NodeNext`)
- **ORM**: Prisma (`@prisma/client`) + PostgreSQL
- **Caché**: Redis (`ioredis`, cache-aside)
- **Autenticación**: JWT (`@nestjs/jwt`, `passport-jwt`)
- **Validación**: `class-validator` + `class-transformer`
- **Scheduling**: `@nestjs/schedule` (ETL cron jobs)
- **Testing**: Jest + `ts-jest`

## Estructura

```
src/backend/
├── src/
│   ├── app.module.ts           # Módulo raíz
│   ├── main.ts                 # Bootstrap con ValidationPipe global
│   ├── config/
│   │   └── configuration.ts   # Variables de entorno tipadas
│   └── shared/                 # Componentes transversales
│       ├── audit/              # AuditLoggerService (sin PII en logs)
│       ├── circuit-breaker/    # CircuitBreaker + CircuitBreakerFactory
│       ├── decorators/         # @Roles(), @Public()
│       ├── guards/             # JwtAuthGuard, RBACGuard
│       ├── interceptors/       # ValidationInterceptor (XSS/SQL sanitization)
│       ├── prisma/             # PrismaModule + PrismaService (singleton compartido)
│       └── redis/              # RedisService (cache-aside con fallback)
└── modules/
    ├── users/                  # Registro, login, RBAC
    ├── property-listings/      # Publicaciones, búsqueda, fotos
    ├── landlord-portfolio/     # Portafolio, unidades, leases
    ├── contracts/              # Contratos, firma electrónica, almacenamiento de documentos
    ├── payments/               # Pagos, pasarela, idempotencia
    ├── accounting/             # Reportes financieros (dominio: entidades + puertos; sin capa application/infrastructure aún)
    ├── rental-tracking/        # Máquina de estados del arriendo (placeholder — solo index.ts)
    └── notifications/          # Notificaciones multicanal (placeholder — solo index.ts)
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

> **ESM / NodeNext import convention**: `"module": "NodeNext"` requires explicit file extensions on relative imports. Use `.js` for all relative imports (e.g. `'./contract.entity.js'`). Path-alias imports (`@src/...`) do **not** need the extension — TypeScript resolves them via `tsconfig.paths`.

> **`noImplicitAny`**: currently disabled in `tsconfig.json`. Parameters with implicit `any` types (e.g. Prisma transaction callbacks) are allowed but should be typed explicitly where possible.

> **`strictPropertyInitialization`**: enabled. All class properties must be explicitly initialized in the constructor or marked with the definite assignment assertion (`!`). DTOs use `!` on decorated fields (e.g. `name!: string`) since `class-validator` decorators guarantee runtime presence.

## Scripts

```bash
npm run start:dev          # Servidor en modo desarrollo (watch)
npm run build              # Build de producción
npm run test               # Tests unitarios y de propiedades
npm run lint               # ESLint
npm run migration:run      # Aplica migraciones Prisma
npm run migration:generate # Genera nueva migración
npm run db:studio          # Prisma Studio
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
