# Frontend — Next.js App

Aplicación web responsive mobile-first para la plataforma de gestión de arriendo de vivienda.

## Stack

- **Framework**: Next.js (App Router)
- **Estilos**: Tailwind CSS
- **Lenguaje**: TypeScript
- **Accesibilidad**: WCAG 2.1 AA (contraste ≥ 4.5:1, touch targets ≥ 44px)

## Estructura (planificada)

```
src/frontend/
├── app/                    # App Router — páginas y layouts
├── modules/
│   ├── users/              # Registro, login, perfil
│   ├── property-listings/  # Exploración, búsqueda, detalle
│   ├── landlord-portfolio/ # Gestión de portafolio
│   ├── contracts/          # Contratos y firma digital
│   ├── payments/           # Pagos y historial
│   ├── accounting/         # Reportes financieros
│   ├── rental-tracking/    # Seguimiento del proceso
│   └── notifications/      # Preferencias de notificación
└── shared/                 # Componentes UI, hooks, utils, tipos
```

## Principios de diseño

- **Mobile-first**: diseño optimizado para celular como canal principal
- **Baja carga cognitiva**: máximo 3 bloques de información por pantalla
- **Accesibilidad**: contraste ≥ 4.5:1, áreas táctiles ≥ 44px
- **Confianza**: mensajes explicativos en procesos críticos (pagos, firma)

## Estado

> En planificación. La implementación del frontend comenzará después de completar el backend MVP.

## Scripts (cuando esté implementado)

```bash
npm run dev    # Servidor de desarrollo Next.js
npm run build  # Build de producción
npm run lint   # ESLint
```
