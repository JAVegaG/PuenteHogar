# Plataforma de Gestión de Arriendo de Vivienda

Plataforma web para la gestión del ciclo completo de arriendo de vivienda urbana en Colombia (Valle del Cauca). Orientada a la inclusión digital de arrendadores adultos mayores con baja alfabetización digital, mientras ofrece una experiencia eficiente para arrendatarios jóvenes.

## Descripción general

El sistema actúa como orquestador del proceso de arriendo: publicación de inmuebles, exploración de oferta, formalización contractual con firma electrónica y gestión de pagos. Integra servicios externos especializados (pasarela de pagos, proveedor de firma electrónica, WhatsApp) mediante un patrón de circuit breaker para garantizar resiliencia.

## Estructura del repositorio

```
├── src/
│   ├── backend/          # API NestJS — lógica de negocio y persistencia
│   │   └── db/           # Schema Prisma, migraciones y seeds (colocados con el backend)
│   └── frontend/         # Aplicación web Next.js (mobile-first)
├── documentation/        # SRS, diseño arquitectónico y funcional
└── .kiro/                # Specs, steering y configuración del agente
```

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS + TypeScript |
| Base de datos | PostgreSQL + Prisma ORM |
| Caché | Redis (cache-aside) |
| Frontend | Next.js (App Router) + Tailwind CSS |
| Almacenamiento | Object Storage (fotos, contratos, comprobantes) |
| Autenticación | JWT + Passport |
| Testing | Jest + fast-check (property-based testing) |

## Dominios de negocio

El backend está organizado en 8 módulos con esquemas PostgreSQL independientes:

| Módulo | Esquema | Responsabilidad |
|--------|---------|----------------|
| `users` | `users` | Registro, autenticación, RBAC |
| `property-listings` | `property_listings` | Publicación y exploración de inmuebles |
| `landlord-portfolio` | `landlord_portfolio` | Portafolio del arrendador, leases |
| `contracts` | `contracts` | Contratos, firma electrónica |
| `payments` | `payments` | Pagos, pasarela, historial |
| `accounting` | `accounting` | Reportes financieros |
| `rental-tracking` | `tracking_process` | Seguimiento del ciclo de arriendo |
| `notifications` | `notifications` | Notificaciones multicanal |

## Inicio rápido

### Requisitos previos
- Node.js ≥ 20
- PostgreSQL ≥ 15
- Redis ≥ 7

### Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

### Backend

```bash
cd src/backend
npm install
npm run migration:run   # aplica migraciones Prisma
npm run db:seed         # seed de catálogos (roles, tipos de documento, estados)
npm run start:dev       # servidor en modo desarrollo
```

### Base de datos

```bash
cd src/backend
npm run db:studio       # Prisma Studio (explorador visual)
npm run migration:generate -- --name <nombre>  # nueva migración
```

## Documentación

- [Especificación de Requisitos (SRS)](documentation/DOCUMENTO%20DE%20ESPECIFICACIÓN%20DE%20REQUISITOS%20DE%20SOFTWARE.md)
- [Diseño Arquitectónico y Funcional](documentation/Diseño%20Arquitectónico%20y%20Funcional.md)
- [Spec de implementación backend](.kiro/specs/backend-database-implementation/requirements.md)

## Contexto legal

- Ley 820 de 2003 — contratos de arrendamiento
- Ley 527 de 1999 / Decreto 2364 de 2012 — firma electrónica
- Ley 1581 de 2012 — protección de datos personales (Habeas Data)
