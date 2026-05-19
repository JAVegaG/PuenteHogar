# Documento de Implementación del Prototipo

# Introducción
## Propósito
El propósito de este documento es describir el proceso de implementación del prototipo funcional de la plataforma de gestión de arriendo de vivienda urbana, documentando la metodología de desarrollo utilizada, las herramientas empleadas, las decisiones tomadas durante la construcción y los mecanismos de automatización que permitieron acelerar y estandarizar el flujo de trabajo. Este documento complementa el Documento de Especificación de Requisitos de Software (SRS) y el Diseño Arquitectónico y Funcional, cerrando el ciclo documental del proyecto al cubrir la fase de construcción.
## Enfoque metodológico: Spec-Driven Development (SDD)
La implementación adoptó un enfoque de **Spec-Driven Development (SDD)**, una metodología de desarrollo asistida por agentes de IA donde cada funcionalidad se especifica formalmente antes de su implementación a través de tres artefactos estructurados:
1. [**requirements.md**](http://requirements.md) — Documento de requisitos con criterios de aceptación verificables
2. [**design.md**](http://design.md) — Documento de diseño técnico con decisiones de implementación
3. [**tasks.md**](http://tasks.md) — Lista de tareas ordenadas con checkpoints de verificación
Este flujo permite que el agente de IA trabaje de forma autónoma sobre tareas bien definidas, mientras el desarrollador mantiene control sobre el alcance, las decisiones de diseño y la calidad del resultado, bajo la hipótesis de reducir la subjetividad que queda por parte de la interpretación del agente, y por tanto la diferencia entre lo que se espera y lo que se obtiene. El ciclo SDD se repite iterativamente: se crea un spec, el agente implementa las tareas, se verifica el resultado y se documenta cualquier hallazgo post-implementación.
### Ventajas del enfoque SDD en este proyecto
*   **Trazabilidad**: cada línea de código puede rastrearse hasta un requisito específico
*   **Iteración controlada**: el desarrollador define el "qué" y el agente ejecuta el "cómo"
*   **Documentación viva**: los specs evolucionan con el proyecto y sirven como referencia técnica
*   **Calidad incremental**: los checkpoints de verificación (build + tests) garantizan estabilidad entre tareas
# Herramientas y Configuración del Entorno de Desarrollo
## IDE y Agente de IA
El desarrollo se realizó utilizando **Kiro**, un entorno de desarrollo creado por **AWS**, el cual está potenciado por IA y trae **nativamente integrado el flujo de Spec-Driven Development (SDD)** como una de sus capacidades principales. A diferencia de otros IDEs con asistentes de IA que operan exclusivamente en modo conversacional, o que para implementar SDD requiere de configuraciones adicionales o de extensiones, Kiro ofrece sesiones de tipo "Spec" donde el desarrollo se estructura formalmente a través de especificaciones, además de sesiones "Vibe" para exploración conversacional y correcciones puntuales.
La elección de Kiro como herramienta de desarrollo se fundamentó en:
*   **SDD nativo**: El flujo de especificaciones (requirements → design → tasks) está integrado directamente en la interfaz, no requiere configuración adicional ni plugins externos
*   **Steering files**: Soporte nativo para reglas de contexto que se inyectan automáticamente según patrones de archivos
*   **Hooks**: Sistema de automatización basado en eventos del IDE que permite ejecutar acciones del agente sin intervención manual
*   **Powers y MCPs**: Extensibilidad mediante Model Context Protocol para integrar herramientas externas
Kiro opera en dos modos de autonomía:
*   **Autopilot**: el agente trabaja de forma autónoma completando tareas end-to-end
*   **Supervised**: el agente solicita aprobación después de cada cambio
Para este proyecto se utilizó predominantemente el modo **Autopilot** durante la ejecución de tareas de specs, y el modo **Supervised** para correcciones puntuales y ajustes de diseño.
### Flujos de SDD en Kiro
Kiro ofrece **tres flujos distintos** para crear specs, cada uno adaptado a un escenario de desarrollo diferente:
#### Flujo basado en Requerimientos (Requirements-first)
El flujo más completo. El agente parte de una descripción funcional del usuario y genera secuencialmente:
1. [**requirements.md**](http://requirements.md) — Requisitos con criterios de aceptación verificables (formato WHEN/THEN/SHALL)
2. [**design.md**](http://design.md) — Diseño técnico con decisiones de implementación, estructura de archivos y contratos de API
3. [**tasks.md**](http://tasks.md) — Lista de tareas ordenadas con checkpoints de verificación (build + tests)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/0469da22-0d63-45b5-93dc-7a4067dc3412/image.png)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/f3ebf15d-ced7-4800-b878-4f99b43eba17/Screenshot%202026-04-01%20at%206.38.10%E2%80%AFPM.png)
Este flujo se utilizó para la mayoría de features del proyecto donde el punto de partida era una necesidad funcional del usuario ya identificada en las etapas previas del prototipo.
#### Flujo basado en Diseño Técnico (Design-first)
Un flujo abreviado donde el desarrollador ya tiene claro el diseño técnico y quiere saltar directamente a la implementación. El agente genera:
1. [**design.md**](http://design.md) — Diseño técnico detallado (proporcionado o co-creado con el agente)
2. **requirements.md** — _Opcionalmente_ — Requisitos con criterios de aceptación verificables (formato WHEN/THEN/SHALL)
3. [**tasks.md**](http://tasks.md) — Lista de tareas derivadas del diseño
![](https://t90132600355.p.clickup-attachments.com/t90132600355/c5901e49-d03d-4c4d-8cea-b69f4eb27077/image.png)
Se puede omitir el documento de requisitos porque el contexto técnico ya está definido. Este flujo se utilizó para specs donde la solución técnica era clara desde el inicio.
#### Flujo de Corrección de Bugs (Bugfix)
Un flujo especializado para resolver defectos. El agente analiza el bug, documenta las condiciones que lo producen, las propiedades que deben cumplirse y las preservaciones (comportamientos existentes que no deben romperse), y genera:
1. [**bugfix.md**](http://bugfix.md) — Análisis del bug con el estado actual, esperado y estado que debe conservarse sin cambio
2. [**design.md**](http://design.md) — Análisis del bug con Bug\_Condition, Property y Preservation
3. [**tasks.md**](http://tasks.md) — Tareas de corrección con tests de regresión
![](https://t90132600355.p.clickup-attachments.com/t90132600355/b4bb9fdd-075f-4a6d-833a-bd58accd958a/Screenshot%202026-05-19%20at%204.06.25%E2%80%AFPM.png)
No incluye `requirements.md` porque el "requisito" es implícito: el sistema debe comportarse correctamente según su especificación original.
### Clasificación de specs por flujo

| Flujo | Specs |
| ---| --- |
| Requirements-first | `backend-database-implementation`, `explore-properties-frontend`, `users-auth-frontend`, `landlord-portfolio-frontend`, `portfolio-figma-alignment`, `property-type-catalog`, `colombian-geo-catalog`, `landlord-modules-frontend`, `object-storage-implementation`, `portfolio-unit-listings-management`, `portfolio-contracts-management`, `contract-file-management`, `tenant-flows-frontend`, `platform-wide-improvements`, `multirole-notifications-frontend`, `listing-search-and-ux-enhancements`, `in-app-notifications-wiring` |
| Design-first | `aws-infrastructure-deployment` |
| Bugfix | `ux-polish-fixes`, `lease-lifecycle-status-sync` |

Los 17 specs de tipo **Requirements-first** siguieron el ciclo completo (requirements → design → tasks), generando documentación trazable desde la necesidad funcional hasta la implementación. Mientras que, los 2 specs de tipo **Bugfix** utilizaron el flujo especializado con análisis de condiciones de bug, propiedades esperadas y preservaciones, sin documento de requisitos separado. Por otro lado, solo se utilizó el flujo **Design-first** para la construcción de la infraestructura como código, dado que en gran medida este diseño ya estaba documentado.
## Model Context Protocol (MCP)
Se configuró un servidor MCP para integrar el flujo de desarrollo con herramientas externas:
### ClickUp MCP
**Propósito**: Integrar la gestión de proyecto en ClickUp directamente con el flujo de desarrollo. Permite al agente:
*   Consultar tareas y su estado (`clickup_get_task`, `clickup_search`)
*   Actualizar el progreso de implementación (`clickup_update_task`)
*   Documentar avances mediante comentarios (`clickup_create_task_comment`)
*   Leer comentarios existentes para evitar duplicados (`clickup_get_task_comments`)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/2840caaf-8fc4-4756-904b-9c0be8592c1b/image.png)

```json
{
  "mcpServers": {
    "clickup": {
      "type": "http",
      "url": "https://mcp.clickup.com/mcp"
    }
  }
}
```

**Configuración de seguridad**: Se deshabilitaron herramientas destructivas o de alto riesgo (crear/eliminar tareas, mover tareas, gestionar miembros, enviar mensajes de chat) y se habilitó auto-aprobación para operaciones de lectura y comentarios.
### Figma MCP (Power)
Se instaló el **Figma Power** como extensión de Kiro para validar la implementación frontend contra los diseños del sistema de diseño.
**Propósito**: Permitir al agente acceder a los archivos de Figma para:
*   Extraer tokens de diseño (tipografía, colores, espaciado, radios de borde)
*   Validar que los componentes implementados coincidan con las especificaciones visuales
*   Verificar consistencia entre el código y el prototipo de baja fidelidad
**Archivos de Figma referenciados**:
*   Librería del sistema de diseño (tokens, componentes base)
*   Diseños de pantallas del prototipo
# Steering Files (Reglas de Dirección)
Los steering files son documentos de contexto que se inyectan automáticamente en las interacciones con el agente de IA para guiar su comportamiento. Funcionan como "reglas del proyecto" que el agente debe seguir en toda ejecución, garantizando consistencia sin necesidad de repetir instrucciones manualmente.
## Steering iniciales
Estos tres archivos se crearon al inicio del proyecto junto con la documentación de requisitos y diseño:
### `tech.md` — Stack tecnológico y decisiones técnicas
Define el stack completo (TypeScript full-stack, NestJS, Next.js, PostgreSQL, Prisma, Redis), la arquitectura (monolito modular con hexagonal por módulo), los patrones de seguridad (RBAC, PII encryption, circuit breaker), las convenciones de frontend (tipografía con `font-size: 62.5%`, tokens de diseño, patrones de componentes) y los comandos de desarrollo.
**Impacto en SDD**: Garantiza que cada spec generado y cada tarea implementada siga las mismas convenciones técnicas sin necesidad de especificarlas repetidamente.
### `structure.md` — Estructura del proyecto y convenciones
Documenta la organización de carpetas, la estructura hexagonal por módulo (`domain/`, `application/`, `infrastructure/`), las convenciones de naming (código en inglés, rutas en español, UI en español), las relaciones cross-schema y los componentes compartidos.
**Impacto en SDD**: El agente genera código que respeta la estructura existente y ubica archivos en las carpetas correctas automáticamente.
### `product.md` — Contexto de producto y negocio
Describe los usuarios objetivo (arrendadores adultos mayores con baja alfabetización digital, arrendatarios jóvenes), el alcance del MVP, los estados del proceso de arriendo y el contexto legal colombiano.
**Impacto en SDD**: Permite al agente tomar decisiones de UX informadas (simplicidad, baja carga cognitiva) y respetar el alcance del MVP sin agregar funcionalidades fuera de scope.
## Steering agregados durante el desarrollo
### `cross-schema.md`
**Inclusión**: Condicional — se activa solo cuando se leen archivos en `src/backend/modules/**`.
**Objetivo**: Documentar los patrones de comunicación cross-schema que emergieron durante la implementación: resolución de nombres de usuario (nunca mostrar UUIDs), descifrado de PII, referencias entre esquemas como campos `String` planos, y el patrón fire-and-forget para notificaciones.
**Motivación**: Durante la implementación de los módulos de contratos y arriendos, se detectaron errores recurrentes donde el agente intentaba hacer joins directos entre esquemas o mostraba UUIDs crudos en el frontend. Este steering eliminó esos errores al establecer reglas explícitas.
### `frontend-patterns.md`
**Inclusión**: Condicional — se activa solo cuando se leen archivos en `src/frontend/**`.
**Objetivo**: Consolidar los patrones de componentes frontend que se establecieron durante las primeras iteraciones: tipografía con tokens personalizados (nunca usar `text-sm`, `text-lg` de Tailwind), estilo de botón primario, layout de páginas, navegación (hamburguesa vs. back arrow), y formato de moneda COP.
**Motivación**: El sistema de tipografía con `font-size: 62.5%` causaba que los tamaños por defecto de Tailwind resolvieran a valores incorrectos. Este steering previene ese error sistemáticamente.
### `soft-delete.md`
**Inclusión**: Condicional — se activa solo cuando se leen archivos en `src/backend/**`.
**Objetivo**: Garantizar que toda query de lectura incluya `deleted_at: null` en el WHERE clause, usando las utilidades compartidas (`softDeleteFilter`, `softDeleteData()`, `withSoftDeleteFilter()`).
**Motivación**: Se detectaron bugs donde contadores de arriendos activos incluían registros eliminados, o donde el estado de una unidad se derivaba incorrectamente de leases cancelados. Este steering eliminó toda una categoría de bugs al hacer explícita la regla.
### `spec-qa-stage.md`
**Inclusión**: Siempre (global).
**Objetivo**: Establecer que toda lista de tareas de un spec debe incluir una etapa final de QA manual donde el usuario prueba los flujos end-to-end y documenta hallazgos como nuevos requisitos en el mismo spec.
**Motivación**: Las primeras iteraciones de specs terminaban con "build passes" pero contenían problemas de UX no detectados (UUIDs visibles, traducciones faltantes, navegación inconsistente). Este steering formalizó el proceso de QA post-implementación.
**Impacto en SDD**: Transformó el flujo de un ciclo lineal (spec → implementar → done) a un ciclo con retroalimentación (spec → implementar → QA → documentar hallazgos → implementar fixes → done), mejorando significativamente la calidad del resultado final.
# Hooks (Automatizaciones del Agente)
Los hooks son automatizaciones que ejecutan acciones del agente en respuesta a eventos del IDE. Permiten mantener documentación actualizada, estandarizar commits y validar diseño sin intervención manual.
## Cronología de creación
### Hooks de documentación automática
Los primeros hooks creados fueron los de actualización automática de READMEs:

| Hook | Evento | Acción |
| ---| ---| --- |
| `update-backend-readme` | `fileEdited` en `src/backend/**/*.ts` o `*.json` | Revisa el estado del backend y actualiza `src/backend/README.md` |
| `update-db-readme` | `fileEdited` en `db/**/*.prisma`, `*.ts`, `*.sql` | Revisa el schema Prisma y actualiza `db/README.md` |
| `update-frontend-readme` | `fileEdited` en `src/frontend/**/*.ts`, `*.tsx`, `*.json` | Revisa el frontend y actualiza `src/frontend/README.md` |

**Objetivo**: Mantener la documentación técnica siempre sincronizada con el código sin esfuerzo manual. Cada vez que se edita un archivo de código, el agente revisa si el README correspondiente necesita actualizarse y lo hace automáticamente.
**Impacto**: Los READMEs del proyecto reflejan fielmente el estado actual del código en todo momento, sirviendo como documentación viva que no se desactualiza.
### Hook de commits convencionales

```json
{
  "name": "Auto Conventional Commit",
  "when": { "type": "postTaskExecution" },
  "then": {
    "type": "askAgent",
    "prompt": "Run git status, group changes by domain, create focused conventional commits, and push."
  }
}
```

**Objetivo**: Después de que el agente completa cada tarea de un spec, automáticamente agrupa los cambios por dominio/concern, crea commits con formato convencional (`feat/fix/chore/docs/refactor/test(scope): description`) y hace push al repositorio remoto.
**Impacto**: El historial de git es limpio, granular y trazable. Cada commit corresponde a un concern específico, facilitando la revisión y el rollback si es necesario.
### Hook de validación Figma

```json
{
  "name": "Figma Design Validation",
  "when": { "type": "userTriggered" },
  "then": {
    "type": "askAgent",
    "prompt": "Use Figma MCP to validate edited file against design system tokens..."
  }
}
```

**Objetivo**: Validar que los archivos frontend editados cumplan con el sistema de diseño definido en Figma. Verifica tipografía, colores, espaciado, radios de borde, sombras, targets táctiles y patrones de componentes.
**Activación**: Manual (el desarrollador lo ejecuta cuando quiere validar un componente contra Figma). Se eligió activación manual en lugar de automática para evitar llamadas excesivas al MCP de Figma durante iteraciones rápidas.
### Hook de sincronización con ClickUp

```json
{
  "name": "Sync Implementation Progress to ClickUp",
  "when": { "type": "userTriggered" },
  "then": {
    "type": "askAgent",
    "prompt": "Analyze codebase against ClickUp tasks in 'Implementar plataforma' milestone..."
  }
}
```

**Objetivo**: Analizar el estado actual del código y compararlo contra las tareas del milestone "Implementar plataforma" en ClickUp. Para cada historia de usuario (US) y requisito no funcional (NFR), determina si está implementado (✅), en progreso (🔧) o pendiente (⏳), y publica comentarios de progreso en cada tarea de ClickUp.
**Características avanzadas**:
*   Deduplicación de comentarios (no publica si el estado no ha cambiado)
*   Transiciones de estado unidireccionales (solo avanza, nunca retrocede)
*   Resumen consolidado en la tarea padre del milestone
**Impacto**: Permite mantener sincronizado el estado de implementación entre el código y la herramienta de gestión de proyecto sin esfuerzo manual, facilitando la visibilidad del progreso para stakeholders.
### Hook de infraestructura

```json
{
  "name": "Update Infra README",
  "when": { "type": "fileEdited", "patterns": ["src/infra/**/*.ts", "src/infra/**/*.json", "src/infra/docker/*"] },
  "then": {
    "type": "askAgent",
    "prompt": "Review CDK infrastructure and update src/infra/README.md..."
  }
}
```

**Objetivo**: Mantener actualizado el README de infraestructura cuando se modifican stacks CDK, configuraciones o Dockerfiles.
# Specs: Especificaciones de Implementación
## Resumen de specs creados
Se crearon **20 specs** a lo largo del proyecto, cada uno cubriendo una funcionalidad o conjunto de mejoras específico. A continuación se presenta el orden cronológico de ejecución basado en la última modificación de sus archivos de tareas:

| # | Spec | Fecha | Alcance |
| ---| ---| ---| --- |
| 1 | `backend-database-implementation` | 16 abr | Backend completo: 8 módulos NestJS, schema Prisma, ETL, circuit breaker, tests |
| 2 | `explore-properties-frontend` | 16 abr | Frontend de exploración: listado, filtros, detalle, galería de fotos |
| 3 | `users-auth-frontend` | 17 abr | Frontend de autenticación: login, registro multi-paso, perfil, protección de rutas |
| 4 | `landlord-portfolio-frontend` | 18 abr | Frontend del portafolio: listado, creación, edición, unidades |
| 5 | `portfolio-figma-alignment` | 18 abr | Alineación visual con Figma: tokens, componentes, consistencia |
| 6 | `property-type-catalog` | 18 abr | Catálogo de tipos de propiedad (backend + frontend) |
| 7 | `colombian-geo-catalog` | 18 abr | Catálogo geográfico DANE: departamentos y ciudades |
| 8 | `landlord-modules-frontend` | 19 abr | Módulos del arrendador: arriendos, contratos, publicación, contabilidad |
| 9 | `object-storage-implementation` | 19 abr | Almacenamiento real S3: upload de fotos y contratos con presigned URLs |
| 10 | `portfolio-unit-listings-management` | 23 abr | Gestión de publicaciones desde unidades del portafolio |
| 11 | `portfolio-contracts-management` | 23 abr | Gestión de contratos desde el portafolio (crear, firmar, consultar) |
| 12 | `contract-file-management` | 23 abr | Gestión de archivos de contrato: upload S3, reemplazo, eliminación |
| 13 | `tenant-flows-frontend` | 23 abr | Flujos del arrendatario: arriendos, pagos, contratos |
| 14 | `platform-wide-improvements` | 4 may | Mejoras transversales: soft delete, paginación, estadísticas |
| 15 | `multirole-notifications-frontend` | 4 may | Notificaciones in-app, preferencias, gestión de roles |
| 16 | `listing-search-and-ux-enhancements` | 4 may | Búsqueda por keywords, filtros backend-driven, landing page, rediseño |
| 17 | `in-app-notifications-wiring` | 4 may | Wiring de notificaciones: adaptadores por módulo, fire-and-forget |
| 18 | `ux-polish-fixes` | 5 may | Correcciones de UX post-QA: bugs, traducciones, navegación |
| 19 | `lease-lifecycle-status-sync` | 6 may | Sincronización del ciclo de vida: tracking status, cancelación, derivación |
| 20 | `aws-infrastructure-deployment` | 16 may | Infraestructura AWS: CDK, VPC, RDS, App Runner, CloudFront, WAF |

## Fases de implementación
### Fase 1: Fundación (16 de abril)
El spec `backend-database-implementation` fue el más extenso y ambicioso, cubriendo la implementación completa del backend:
*   Configuración del proyecto NestJS con Prisma, Redis y JWT
*   Schema de base de datos con 8 esquemas PostgreSQL
*   Implementación de los 8 módulos con arquitectura hexagonal
*   Componentes transversales (guards, interceptors, circuit breaker, audit logger)
*   Tests de propiedades (property-based testing) con fast-check
*   Stubs para integraciones externas (pagos, firma, mensajería)

### Fase 2: Frontend Core (16–18 de abril)
Tres specs construyeron la base del frontend:
*   Exploración de inmuebles con filtros y paginación
*   Autenticación con registro multi-paso y gestión de sesión JWT
*   Portafolio del arrendador con CRUD de unidades
### Fase 3: Catálogos y Alineación (18 de abril)
Specs de soporte que enriquecieron la experiencia:
*   Alineación visual con los diseños de Figma
*   Catálogo de tipos de propiedad para formularios
*   Catálogo geográfico colombiano (33 departamentos, 1.122 municipios)

### Fase 4: Módulos del Arrendador (19 de abril)
Implementación de los flujos completos del arrendador:
*   Gestión de arriendos (crear, cancelar, historial)
*   Gestión de contratos (wizard de 3 pasos, firma)
*   Publicación de unidades con fotos
*   Reportes contables con filtros de periodo

### Fase 5: Gestión Avanzada (23 de abril)
Specs que conectaron los módulos entre sí:
*   Publicaciones gestionadas desde las unidades del portafolio
*   Contratos con upload real a S3 y presigned URLs
*   Flujos completos del arrendatario (arriendos, pagos, contratos)

### Fase 6: Calidad y Polish (4–6 de mayo)
Specs enfocados en calidad, consistencia y corrección de bugs:
*   Soft delete transversal, paginación, estadísticas de portafolio
*   Notificaciones in-app con preferencias de canales
*   Búsqueda por keywords y filtros dinámicos
*   Wiring de notificaciones entre módulos
*   Correcciones de UX descubiertas en QA manual
*   Sincronización del ciclo de vida del arriendo

### Fase 7: Infraestructura (16 de mayo)
El spec final desplegó la infraestructura en AWS:
*   6 stacks CDK (Network, Data, CI, Compute, CDN, Monitoring)
*   VPC con subnets públicas, privadas y aisladas
*   RDS PostgreSQL + ElastiCache Redis + S3
*   ECS Fargate para backend y frontend (containerizado)
*   CloudFront + WAF para CDN y protección
*   Monitoreo con CloudWatch, alarmas y dashboards
# Estrategia de Testing
## Property-Based Testing (PBT)
El backend utiliza **property-based testing** con la librería `fast-check` para verificar propiedades invariantes del sistema. Cada test está vinculado a un requisito específico del spec mediante comentarios de trazabilidad.
**Áreas cubiertas**:
*   Sanitización de payloads maliciosos (XSS/SQL injection)
*   Idempotencia de migraciones Prisma
*   Restricciones de unicidad en la base de datos
*   Round-trip de transformación ETL (RAW → curado)
*   Invariantes de dominio por módulo (auth, portfolio, listings, contracts, payments, accounting, tracking, notifications)
## Tests unitarios
Cada módulo incluye tests unitarios para:
*   Funciones de validación puras (frontend y backend)
*   Componentes compartidos (ProtectedRoute, StepIndicator)
*   Helpers y utilidades (formatPrice, computePeriod, soft-delete utils)
# Integraciones Externas y Stubs del MVP
El MVP utiliza **adaptadores stub** para las tres integraciones externas que serán reemplazadas post-MVP:

| Integración | Stub | Comportamiento |
| ---| ---| --- |
| Firma electrónica | `ESignatureProviderAdapter` | Retorna un ID de firma mock; requiere webhook manual para completar |
| Pasarela de pagos | `PaymentGatewayAdapter` | Retorna `APPROVED` con URL de redirección mock; requiere webhook manual |
| Canal de mensajería | `MessagingChannelAdapter` | Registra notificaciones en consola del servidor |

Para avanzar el estado de la aplicación durante testing, se documentó una **guía de testing con stubs** (`documentation/MVP-STUB-TESTING-GUIDE.md`) que incluye los comandos curl necesarios para simular los webhooks de firma y pago.
# Patrones de Comunicación Inter-Módulo
## Cross-Module Query Ports
Los módulos exponen interfaces de consulta para evitar queries SQL directos entre esquemas:

| Token | Módulo | Métodos |
| ---| ---| --- |
| `PORTFOLIO_CROSS_MODULE_QUERY` | landlord-portfolio | `hasActiveLeases()`, `hasPortfoliosWithUnits()`, `hasActiveLeasesInPortfolios()` |
| `CONTRACTS_CROSS_MODULE_QUERY` | contracts | `hasActiveContractsAsRole()` |
| `PAYMENTS_CROSS_MODULE_QUERY` | payments | `hasPendingPayments()` |

## Cross-Module Service Ports
Ports donde un módulo define la interfaz y otro provee la implementación:

| Port | Define | Implementa | Propósito |
| ---| ---| ---| --- |
| `PAYMENT_SCHEDULING_PORT` | contracts | payments | Crea ScheduledPayment al completar firma |
| `LISTING_DEACTIVATION_PORT` | contracts | contracts (local) | Desactiva listing al firmar contrato |

## Notification Adapter Ports
Cada módulo que dispara notificaciones define un adaptador local que delega a `SendNotificationUseCase`:

| Módulo | Eventos |
| ---| --- |
| contracts | `CONTRACT_SIGNED`, `CONTRACT_UPLOADED`, signing failed |
| payments | `PAYMENT_RECEIVED` |
| landlord-portfolio | `LEASE_CREATED`, `LEASE_CANCELLED` |
| property-listings | `NEW_INTEREST` |
| rental-tracking | `CONTACT_INITIATED`, `CONTRACT_SIGNED`, `PAYMENT_RECEIVED` |

# Infraestructura de Despliegue
## Arquitectura AWS

La infraestructura se implementó con **AWS CDK** (Infrastructure as Code) organizada en 6 stacks modulares:

| Stack | Recursos |
| ---| --- |
| NetworkStack | VPC, subnets (3 tiers), NAT Gateway, Security Groups, EC2 Instance Connect Endpoint |
| DataStack | RDS PostgreSQL 16, ElastiCache Redis 7, S3 bucket, Secrets Manager |
| CiStack | ECR repositories, GitHub Actions IAM role |
| ComputeStack | App Runner (backend + frontend), VPC Connector, IAM roles |
| CdnStack | CloudFront distribution, WAF Web ACL, ACM certificate |
| MonitoringStack | CloudWatch alarms, dashboards, log groups, SNS notifications |

## Gestión de variables de entorno
Todas las variables de entorno son gestionadas por CDK — **cero configuración manual en la consola AWS**:
*   Variables no sensibles: inyectadas como `runtimeEnvironmentVariables` en App Runner
*   Secretos: almacenados en Secrets Manager y referenciados como `runtimeEnvironmentSecrets`
# Conclusiones

La implementación del prototipo demostró la viabilidad del enfoque **Spec-Driven Development** asistido por agentes de IA para la construcción de sistemas de complejidad media-alta. Los principales aprendizajes fueron:

1. **Los steering files son fundamentales**: Sin reglas explícitas de contexto, el agente comete errores recurrentes (tipografía incorrecta, soft delete omitido, UUIDs expuestos). Los steering eliminan categorías completas de bugs.
2. **La etapa de QA manual es indispensable**: A pesar de que el agente puede generar código funcional que pasa build y tests, los problemas de UX (traducciones, navegación, consistencia visual) solo se detectan con pruebas manuales.
3. **Los hooks multiplican la productividad**: La documentación automática, los commits convencionales y la sincronización con herramientas de gestión eliminan trabajo repetitivo y mantienen la calidad sin esfuerzo adicional.
4. **La arquitectura hexagonal facilita la evolución**: La separación por puertos y adaptadores permitió agregar funcionalidades (notificaciones, tracking, deactivación de listings) sin modificar la lógica de negocio existente.
5. **Los MCPs conectan el flujo de desarrollo con el ecosistema**: La integración con ClickUp y Figma permitió mantener sincronizados el código, la gestión de proyecto y el diseño visual en un solo flujo de trabajo.