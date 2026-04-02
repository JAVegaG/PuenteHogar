# Backend — NestJS API

API REST del sistema de gestión de arriendo de vivienda. Implementada como monolito modular con arquitectura hexagonal por módulo.

## Stack

- **Framework**: NestJS + TypeScript
- **ORM**: Prisma (PostgreSQL)
- **Caché**: Redis (ioredis, cache-aside)
- **Autenticación**: JWT + Passport
- **Testing**: Jest + fast-check

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
│       └── redis/              # RedisService (cache-aside con fallback)
└── modules/
    ├── users/                  # Registro, login, RBAC
    ├── property-listings/      # Publicaciones, búsqueda, fotos
    ├── landlord-portfolio/     # Portafolio, unidades, leases
    ├── contracts/              # Contratos, firma electrónica
    ├── payments/               # Pagos, pasarela, idempotencia
    ├── accounting/             # Reportes financieros
    ├── rental-tracking/        # Máquina de estados del arriendo
    └── notifications/          # Notificaciones multicanal
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
| `PORT` | Puerto del servidor (default: `3000`) |
