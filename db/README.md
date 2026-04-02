# Base de Datos

Configuración de PostgreSQL con Prisma ORM. El modelo de datos está organizado en 8 esquemas independientes, uno por dominio de negocio.

## Estructura

```
db/
├── prisma/
│   ├── schema.prisma    # Schema Prisma completo (8 esquemas PostgreSQL)
│   └── migrations/      # Migraciones generadas automáticamente por Prisma
└── seeds/               # Scripts de datos semilla para desarrollo
```

## Esquemas y modelos

| Esquema | Modelos principales | Descripción |
|---------|-------------------|-------------|
| `users` | User, Role, Permission, UserRole, RolePermission | Identidad, autenticación y RBAC |
| `property_listings` | Property, Address, Listing, Photo, AdditionalFeature | Oferta de inmuebles |
| `landlord_portfolio` | LandlordPortfolio, PortfolioUnit, Lease | Portafolio del arrendador |
| `tracking_process` | LeaseStatus, LeaseStatusHistory, LeaseCurrentStatus, ListingStatus | Seguimiento de estados |
| `payments` | ScheduledPayment, Payment, PaymentStatus, PaymentLog | Gestión de pagos |
| `accounting` | AggregatedPaymentReport, IndividualPaymentReport | Reportes financieros |
| `notifications` | NotificationType, NotificationPreference | Configuración de notificaciones |
| `contracts` | Contract, ContractParty, File, Signing, SigningLog | Formalización contractual |

Cada esquema incluye además una tabla `*Raw` con campo `payload` (JSONB) para persistencia híbrida.

## Persistencia híbrida (RAW → Curated)

El sistema usa una estrategia de doble capa:

1. **Tablas RAW**: almacenan el payload de entrada en JSONB sin transformar (`processed = false`)
2. **Tablas curadas**: columnas tipadas optimizadas para lectura, pobladas por ETL cron jobs
3. **ETL jobs**: transforman RAW → curado, marcan `processed = true`, preservan el RAW original

Esto permite reprocesar datos históricos ante cambios de esquema sin pérdida de información.

## Referencias cross-schema

Las relaciones entre esquemas distintos se resuelven por ID (campo `String` plano) sin FK declarada en Prisma. Esto garantiza el desacoplamiento entre módulos y facilita la evolución hacia bases de datos independientes por módulo.

## Comandos

Ejecutar desde `src/backend/`:

```bash
npm run migration:run       # Aplica migraciones en producción (prisma migrate deploy)
npm run migration:generate  # Genera nueva migración en desarrollo (prisma migrate dev)
npm run db:studio           # Abre Prisma Studio (explorador visual de la BD)
```

## Seeds

Los seeds en `db/seeds/` inicializan los catálogos necesarios para el funcionamiento del sistema:

- Roles: `LANDLORD`, `TENANT`
- Permisos por rol
- Estados de lease: `PUBLISHED`, `CONTACT_INITIATED`, `CONTRACT_UPLOADED`, `CONTRACT_SIGNED`, `PAYMENT_RECEIVED`
- Estados de contrato: `PENDING`, `SIGNATURE_PENDING`, `SIGNED`
- Estados de pago: `PENDING`, `PROCESSING`, `PAID`, `REJECTED`
- Tipos de notificación
