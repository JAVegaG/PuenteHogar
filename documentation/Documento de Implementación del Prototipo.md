# Documento de Implementación del Prototipo

# Introducción
## Propósito
El propósito de este documento es describir el proceso de implementación del prototipo funcional de la plataforma de gestión de arriendo de vivienda urbana, documentando la metodología de desarrollo utilizada, las herramientas empleadas, las decisiones tomadas durante la construcción y los mecanismos de automatización que permitieron acelerar y estandarizar el flujo de trabajo. Este documento complementa el Documento de Especificación de Requisitos de Software (SRS) y el Diseño Arquitectónico y Funcional, cerrando el ciclo documental del proyecto al cubrir la fase de construcción.
## Enfoque metodológico: Spec-Driven Development (SDD)
La implementación adoptó un enfoque de **Spec-Driven Development (SDD)**, una metodología de desarrollo asistida por agentes de IA donde cada funcionalidad se especifica formalmente antes de su implementación a través de tres artefactos estructurados:
1. **requirements.md:** Documento de requisitos con criterios de aceptación verificables
2. **design.md:** Documento de diseño técnico con decisiones de implementación
3. **tasks.md:** Lista de tareas ordenadas con checkpoints de verificación
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
1. **requirements.md**:** Requisitos con criterios de aceptación verificables (formato WHEN/THEN/SHALL)
2. **design.md:** Diseño técnico con decisiones de implementación, estructura de archivos y contratos de API
3. **tasks.md**:** Lista de tareas ordenadas con checkpoints de verificación (build + tests)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/0469da22-0d63-45b5-93dc-7a4067dc3412/image.png)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/f3ebf15d-ced7-4800-b878-4f99b43eba17/Screenshot%202026-04-01%20at%206.38.10%E2%80%AFPM.png)
Este flujo se utilizó para la mayoría de features del proyecto donde el punto de partida era una necesidad funcional del usuario ya identificada en las etapas previas del prototipo.
#### Flujo basado en Diseño Técnico (Design-first)
Un flujo abreviado donde el desarrollador ya tiene claro el diseño técnico y quiere saltar directamente a la implementación. El agente genera:
1. **design.md:** Diseño técnico detallado (proporcionado o co-creado con el agente)
2. **requirements.md** _(Opcionalmente):_ Requisitos con criterios de aceptación verificables (formato WHEN/THEN/SHALL)
3. **tasks.md:** Lista de tareas derivadas del diseño
![](https://t90132600355.p.clickup-attachments.com/t90132600355/c5901e49-d03d-4c4d-8cea-b69f4eb27077/image.png)Se puede omitir el documento de requisitos porque el contexto técnico ya está definido. Este flujo se utilizó para specs donde la solución técnica era clara desde el inicio.
#### Flujo de Corrección de Bugs (Bugfix)
Un flujo especializado para resolver defectos. El agente analiza el bug, documenta las condiciones que lo producen, las propiedades que deben cumplirse y las preservaciones (comportamientos existentes que no deben romperse), y genera:
1. **bugfix.md:** Análisis del bug con el estado actual, esperado y estado que debe conservarse sin cambio
2. **design.md:** Análisis del bug con Bug\_Condition, Property y Preservation
3. **tasks.md:** Tareas de corrección con tests de regresión
![](https://t90132600355.p.clickup-attachments.com/t90132600355/b4bb9fdd-075f-4a6d-833a-bd58accd958a/Screenshot%202026-05-19%20at%204.06.25%E2%80%AFPM.png)
No incluye `requirements.md` porque el "requisito" es implícito: el sistema debe comportarse correctamente según su especificación original.
### Clasificación de specs por flujo

| Flujo | Specs |
| ---| --- |
| Requirements-first | `backend-database-implementation`, `explore-properties-frontend`, `users-auth-frontend`, `landlord-portfolio-frontend`, `portfolio-figma-alignment`, `property-type-catalog`, `colombian-geo-catalog`, `landlord-modules-frontend`, `object-storage-implementation`, `portfolio-unit-listings-management`, `portfolio-contracts-management`, `contract-file-management`, `tenant-flows-frontend`, `platform-wide-improvements`, `multirole-notifications-frontend`, `listing-search-and-ux-enhancements`, `in-app-notifications-wiring` |
| Design-first | `aws-infrastructure-deployment` |
| Bugfix | `ux-polish-fixes`, `lease-lifecycle-status-sync`, `deployment-fixes` |

Los 17 specs de tipo **Requirements-first** siguieron el ciclo completo (requirements → design → tasks), generando documentación trazable desde la necesidad funcional hasta la implementación. Mientras que, los 3 specs de tipo **Bugfix** utilizaron el flujo especializado con análisis de condiciones de bug, propiedades esperadas y preservaciones, sin documento de requisitos separado. Por otro lado, solo se utilizó el flujo **Design-first** para la construcción de la infraestructura como código, dado que en gran medida este diseño ya estaba documentado y su propósito principal era habilitar el acceso por internet al prototipo para la evaluación.
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
### Stack tecnológico y decisiones técnicas (`tech.md`)
Define el stack completo (TypeScript full-stack, NestJS, Next.js, PostgreSQL, Prisma, Redis), la arquitectura (monolito modular con hexagonal por módulo), los patrones de seguridad (RBAC, PII encryption, circuit breaker), las convenciones de frontend (tipografía con `font-size: 62.5%`, tokens de diseño, patrones de componentes) y los comandos de desarrollo.
**Impacto en SDD**: Garantiza que cada spec generado y cada tarea implementada siga las mismas convenciones técnicas sin necesidad de especificarlas repetidamente.
### Estructura del proyecto y convenciones (`structure.md`)
Documenta la organización de carpetas, la estructura hexagonal por módulo (`domain/`, `application/`, `infrastructure/`), las convenciones de naming (código en inglés, rutas en español, UI en español), las relaciones cross-schema y los componentes compartidos.
**Impacto en SDD**: El agente genera código que respeta la estructura existente y ubica archivos en las carpetas correctas automáticamente.
### Contexto de producto y negocio (`product.md`)
Describe los usuarios objetivo (arrendadores adultos mayores con baja alfabetización digital, arrendatarios jóvenes), el alcance del prototipo, los estados del proceso de arriendo y el contexto legal colombiano.
**Impacto en SDD**: Permite al agente tomar decisiones de UX informadas (simplicidad, baja carga cognitiva) y respetar el alcance del prototipo sin agregar funcionalidades fuera de scope.
## Steering agregados durante el desarrollo
### `cross-schema.md`
**Inclusión**: Condicional, se activa solo cuando se leen archivos en `src/backend/modules/**`.
**Objetivo**: Documentar los patrones de comunicación cross-schema que emergieron durante la implementación: resolución de nombres de usuario (nunca mostrar UUIDs), descifrado de PII, referencias entre esquemas como campos `String` planos, y el patrón fire-and-forget para notificaciones.
**Motivación**: Durante la implementación de los módulos de contratos y arriendos, se detectaron errores recurrentes donde el agente intentaba hacer joins directos entre esquemas o mostraba UUIDs crudos en el frontend. Este steering eliminó esos errores al establecer reglas explícitas.
### `frontend-patterns.md`
**Inclusión**: Condicional, se activa solo cuando se leen archivos en `src/frontend/**`.
**Objetivo**: Consolidar los patrones de componentes frontend que se establecieron durante las primeras iteraciones: tipografía con tokens personalizados (nunca usar `text-sm`, `text-lg` de Tailwind), estilo de botón primario, layout de páginas, navegación (hamburguesa vs. back arrow), y formato de moneda COP.
**Motivación**: El sistema de tipografía con `font-size: 62.5%` causaba que los tamaños por defecto de Tailwind resolvieran a valores incorrectos. Este steering previene ese error sistemáticamente.
### `soft-delete.md`
**Inclusión**: Condicional, se activa solo cuando se leen archivos en `src/backend/**`.
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
| `update-infra-readme` | `fileEdited` en `src/infra/**/*.ts`, `*.json`, `docker/*` | Revisa CDK y actualiza `src/infra/README.md` |

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

## Comparación entre diseño Figma e implementación funcional

Durante la implementación del prototipo se realizó una comparación cualitativa entre las pantallas diseñadas en Figma y las pantallas implementadas mediante SDD con apoyo del Figma MCP. Esta revisión permitió observar que la existencia de un sistema de diseño y de un prototipo navegable no garantizaba una equivalencia exacta entre diseño e implementación, especialmente cuando el software comenzaba a operar con datos, estados funcionales, reglas de negocio y flujos integrados entre módulos.

La comparación se enfocó en tres pantallas representativas del prototipo:

1. **Exploración de oferta**: pantalla orientada al arrendatario para consultar inmuebles disponibles, aplicar filtros y acceder a una vista de detalle.
2. **Detalle de inmueble en arriendo**: pantalla del dominio de exploración de oferta, orientada a presentar información ampliada del inmueble, fotografías, características y acciones posteriores.
3. **Portafolio del arrendador**: pantalla orientada al propietario para administrar inmuebles, unidades y acciones relacionadas con publicación, contratos y seguimiento.

Estas pantallas fueron seleccionadas porque conectan los dos perfiles centrales del producto: arrendatarios que buscan vivienda y arrendadores que autogestionan su oferta. Además, representan puntos donde el diseño visual debía convivir con reglas funcionales del prototipo, como estados de publicación, disponibilidad de unidades, relación con contratos, seguimiento del proceso y acciones administrativas.

| Pantalla | Propuesta en Figma | Implementación con SDD + Figma MCP | Drift observado | Acciones de control |
| --- | --- | --- | --- | --- |
| Exploración de oferta | Vista simple de inmuebles disponibles, con tarjetas, filtros básicos y navegación hacia detalle. | Se implementó una experiencia conectada a datos funcionales, con filtros dinámicos, estados de publicación y navegación real hacia la vista ampliada. | El diseño original cubría la intención visual, pero no todos los estados derivados de datos reales ni la lógica de disponibilidad. | Se usaron tokens y patrones del sistema de diseño, además de revisión manual para ajustar jerarquía, estados y claridad de filtros. |
| Detalle de inmueble en arriendo | Presentación ampliada de información, fotografías, características principales y acciones de interés. | Se ajustó para integrar datos complementarios, señales de estado, rutas de navegación y acciones coherentes con el flujo funcional. | El detalle requirió más estructura informativa que la prevista inicialmente, porque el usuario necesitaba entender disponibilidad, condiciones y continuidad del proceso. | Se validó contra el sistema de diseño mediante Figma MCP y se revisó manualmente la comprensión de información y acciones visibles. |
| Portafolio del arrendador | Vista administrativa para que el propietario consultara y gestionara sus inmuebles. | Se implementó con acciones adicionales para publicación, edición, seguimiento, relación con contratos y estados administrativos. | Fue la pantalla con mayor drift funcional, porque durante la implementación emergieron reglas de administración no completamente representadas en Figma. | Se aplicaron steering files de producto y frontend, se documentaron hallazgos en QA manual y se ajustaron tareas posteriores del spec. |

### Tipos de drift identificados

El drift entre diseño e implementación no se limitó a diferencias visuales. Se identificaron al menos cuatro tipos:

* **Drift funcional**: aparecieron acciones y estados no previstos inicialmente en Figma, por ejemplo estados de publicación, relación entre unidad y contrato, y cambios derivados de la disponibilidad del inmueble.
* **Drift de información**: algunas pantallas necesitaron mostrar datos adicionales para que el usuario comprendiera mejor el estado del proceso, especialmente en detalle de inmueble y portafolio.
* **Drift de navegación**: la implementación obligó a resolver rutas reales entre exploración, detalle, autenticación, portafolio y flujos administrativos que en el prototipo visual estaban representadas de forma más abstracta.
* **Drift de prioridad visual**: algunas acciones que parecían secundarias en el diseño se volvieron más relevantes al probar el flujo funcional, por lo que fue necesario ajustar jerarquía, ubicación o énfasis.

### Rol del Figma MCP

El Figma MCP permitió reducir el drift visual al darle al agente acceso al sistema de diseño y a las pantallas de referencia. En la práctica, esto ayudó a:

* Consultar tokens de color, tipografía, espaciado, radios y sombras.
* Mantener consistencia entre componentes implementados y patrones visuales definidos.
* Validar que los cambios frontend no se alejaran completamente del manual de marca.
* Contrastar componentes editados contra la intención visual del prototipo.

Sin embargo, el MCP no eliminó por completo las diferencias entre diseño e implementación, porque muchas variaciones no provenían de desconocimiento visual, sino de reglas funcionales emergentes. Por esta razón, el MCP funcionó como mecanismo de alineación visual, pero no como sustituto del criterio de producto ni de la validación manual.

### Relación con steering files

Los steering files fueron relevantes para controlar el drift porque aportaron reglas que el diseño visual por sí solo no contenía. En particular:

* `product.md` ayudó a recordar el alcance del prototipo, los perfiles de usuario y el principio de baja carga cognitiva.
* `frontend-patterns.md` permitió sostener convenciones de componentes, tipografía, botones, navegación y formato de moneda.
* `structure.md` ayudó a ubicar cambios en los módulos y carpetas correctas.
* `spec-qa-stage.md` formalizó la revisión manual posterior a cada spec, evitando cerrar una implementación solo porque compilaba o pasaba tests.

De este modo, Figma MCP y los steering files cumplieron roles complementarios. Figma aportó referencia visual y sistema de diseño, mientras que los steering aportaron reglas de producto, arquitectura, estructura y QA. Esta combinación permitió que las pantallas implementadas variaran cuando era necesario por razones funcionales, pero sin perder coherencia general con la guía de estilos y el manual de marca.

### Relación con QA manual

La comparación entre Figma e implementación reforzó la necesidad del QA manual. Aunque el agente podía implementar una pantalla funcional, la revisión humana permitió identificar si esa pantalla comunicaba correctamente el estado del proceso, si las acciones estaban visibles, si el lenguaje era claro y si las variaciones frente al diseño estaban justificadas por una necesidad funcional real.

Por ello, los hallazgos de drift no se trataron como simples errores visuales. Cuando la variación respondía a una regla emergente del dominio, se documentaba como ajuste funcional o de experiencia. Cuando la variación se debía a pérdida de consistencia visual, se corregía usando el sistema de diseño, el hook de validación Figma y los patrones definidos en `frontend-patterns.md`.

### Aprendizaje principal

La experiencia permitió concluir que el uso de IA, Figma MCP y steering files no elimina la brecha entre diseño e implementación, pero sí ofrece mecanismos para gestionarla de forma controlada. El drift fue especialmente visible cuando el prototipo dejó de ser una representación visual y comenzó a operar como software funcional, con datos, estados, reglas y navegación real. En ese contexto, la combinación de sistema de diseño, reglas de dirección y QA manual permitió mantener coherencia visual y de marca mientras se incorporaban necesidades funcionales descubiertas durante la construcción.

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
Se crearon **21 specs** a lo largo del proyecto, cada uno cubriendo una funcionalidad o conjunto de mejoras específico. A continuación se presenta el orden cronológico de ejecución basado en la última modificación de sus archivos de tareas:

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
| 20 | `aws-infrastructure-deployment` | 16 may | Infraestructura AWS: CDK, VPC, RDS, ECS Fargate, CloudFront, WAF |
| 21 | `deployment-fixes` | 19 may | Estabilización post-despliegue: routing ALB, PrismaService, costos staging, SSM Bastion |

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
### Fase 7: Infraestructura y Estabilización del Despliegue (16–19 de mayo)
La infraestructura se implementó como habilitador operativo para compartir el prototipo por internet con los sujetos de prueba de la etapa de evaluación (posterior a la implementación), eliminando la distancia geográfica como barrera para la validación. Se requería que los evaluadores pudieran acceder al prototipo funcional desde sus propios dispositivos sin depender de la presencia física del implementador.

El spec `aws-infrastructure-deployment` desplegó la infraestructura inicial en AWS:
*   6 stacks CDK (Network, Data, CI, Compute, CDN, Monitoring)
*   VPC con subnets públicas, privadas y aisladas
*   RDS PostgreSQL + ElastiCache Redis + S3
*   ECS Fargate para backend y frontend (containerizado)
*   CloudFront + WAF para CDN y protección
*   Monitoreo con CloudWatch, alarmas y dashboards

Para esta fase se otorgó mayor libertad operativa al agente de IA que en las fases funcionales, dado que el objetivo era pragmático (habilitar acceso remoto) y no un diseño de infraestructura definitivo. No obstante, dicha libertad permaneció acotada por los steering files técnicos y de producto, el diseño arquitectónico previamente definido y las restricciones del prototipo.

El spec `deployment-fixes` (tipo Bugfix) estabilizó el despliegue tras el primer intento en ECS Fargate, corrigiendo:
*   Mecanismo de acceso a RDS (EIC Endpoint → SSM Bastion con port forwarding)
*   Construcción interna de `DATABASE_URL` en PrismaService (eliminación del entrypoint bash)
*   Routing frontend→backend (prefijo `/api` en todas las llamadas fetch)
*   Optimización de costos de staging (eliminación de NAT Gateway y ElastiCache, reemplazo por VPC Endpoints y cache no-op)
*   7 hallazgos post-implementación adicionales: Docker ARM en Fargate, Prisma 7 breaking change, SSL en RDS, Redis no-op en staging, Swagger paths tras ALB, ECS image caching, y aislamiento de env en execSync

Este spec es otro ejemplo directo del patrón QA → hallazgos → corrección que caracteriza al flujo SDD con retroalimentación: el primer despliegue reveló condiciones que no eran detectables en desarrollo local, y el flujo de bugfix permitió documentarlas y resolverlas de forma trazable.

Aunque la infraestructura fue modelada con una separación conceptual `stg`/`prod` que permitiría evolucionar hacia ambientes más formales, durante esta etapa se utilizó exclusivamente el entorno `stg`, considerando que su único propósito era habilitar la evaluación remota del prototipo. En línea con el trabajo futuro, vale la pena dedicar iteraciones adicionales y esfuerzo de diseño a plantear una infraestructura de despliegue adecuada según el diseño arquitectónico ya elaborado, los objetivos de negocio, el nivel de riesgo, el volumen esperado de usuarios y las restricciones de cumplimiento del proyecto.
# Estrategia de Testing
## Property-Based Testing (PBT)
El backend utiliza **property-based testing** con la librería `fast-check` para verificar propiedades invariantes del sistema. Cada test está vinculado a un requisito específico del spec mediante comentarios de trazabilidad.
**Áreas cubiertas**:
*   Sanitización de payloads maliciosos (XSS/SQL injection)
*   Idempotencia de migraciones Prisma
*   Restricciones de unicidad en la base de datos
*   Round-trip de transformación ETL (RAW → curado)
*   Invariantes de dominio por módulo (auth, portfolio, listings, contracts, payments, accounting, tracking, notifications)
*   Invariantes de infraestructura y configuración (routing ALB, global prefix `/api`, `NEXT_PUBLIC_API_URL`) — surgidos del spec `deployment-fixes`
## Tests unitarios
Cada módulo incluye tests unitarios para:
*   Funciones de validación puras (frontend y backend)
*   Componentes compartidos (ProtectedRoute, StepIndicator)
*   Helpers y utilidades (formatPrice, computePeriod, soft-delete utils)
## Tests de infraestructura (CDK)
El proyecto de infraestructura (`src/infra/test/`) incluye tests de assertion y snapshot sobre los templates CloudFormation generados por CDK, validando que los stacks producen los recursos esperados sin necesidad de desplegar.
## Pruebas Funcionales y Validación Manual
### La brecha entre especificación y resultado
A pesar de que la hipótesis central del proyecto es que el enfoque SDD entrega mejores resultados que el "vibe coding" (desarrollo conversacional sin estructura formal), la experiencia de implementación demostró que **sigue existiendo una brecha entre lo que se especifica y lo que se obtiene**. El agente de IA puede generar código que compila, pasa tests y cumple los criterios de aceptación formales, pero esto no garantiza que la experiencia del usuario sea la esperada.
Esta brecha se manifiesta principalmente en:
*   **Aspectos visuales**: tipografía inconsistente, colores que no coinciden con el sistema de diseño, espaciados incorrectos, componentes que no se ven bien en ciertos tamaños de pantalla
*   **Aspectos funcionales**: flujos que técnicamente funcionan pero resultan confusos para el usuario, información relevante que no se muestra en el momento adecuado, acciones importantes que quedan enterradas en la interfaz
*   **Aspectos de contenido**: UUIDs crudos visibles al usuario, textos sin traducir al español, mensajes de error poco claros, estados sin etiqueta legible
### Responsabilidad del desarrollador como usuario
Por esta razón, **sigue siendo responsabilidad del desarrollador revisar cada flujo como si fuera un usuario final**, interactuando con la aplicación de forma funcional después de cada ciclo de implementación. Esta revisión manual permite percibir oportunidades de mejora que ningún test automatizado puede detectar, porque se trata de juicios cualitativos sobre la experiencia de uso.
El proceso de validación manual seguido en este proyecto consistió en:
1. Completar la implementación de un spec (todas las tareas marcadas como done, build y tests passing)
2. Ejecutar la aplicación localmente y recorrer los flujos implementados como usuario final
3. Documentar cada hallazgo (bug visual, funcionalidad faltante, UX confusa) como un nuevo requisito
4. Agregar los hallazgos al spec existente en una sección "Post-Implementation Findings"
5. Implementar las correcciones como tareas adicionales del mismo spec
### Origen del steering de QA
Fue precisamente a raíz de esta práctica recurrente de validación manual que surgió el steering `spec-qa-stage.md` (4 de mayo de 2026). Después de varias iteraciones donde los hallazgos post-implementación se documentaban de forma ad-hoc, se formalizó el proceso como una convención obligatoria: **toda lista de tareas de un spec debe incluir una etapa final de QA manual**.
Este steering transformó el flujo SDD de un ciclo lineal a un ciclo con retroalimentación explícita:

```bash
Sin QA stage:  spec → implementar → build passes → done ✗
Con QA stage:  spec → implementar → build passes → QA manual → documentar hallazgos → implementar fixes → done ✓
```

Los specs `ux-polish-fixes`, `lease-lifecycle-status-sync` y `deployment-fixes` son ejemplos directos de este proceso: los dos primeros surgieron como resultado de la validación manual de flujos previamente implementados, donde se detectaron defectos que no eran visibles en los tests automatizados; el tercero surgió del primer despliegue en infraestructura de nube, donde se detectaron condiciones operativas no reproducibles en desarrollo local.
# Integraciones Externas y Stubs del Prototipo
El prototipo utiliza **adaptadores stub** para tres integraciones externas que serán reemplazadas en una etapa posterior. Cabe señalar que el almacenamiento de objetos (S3) **ya fue implementado con integración real** mediante AWS SDK v3 en el spec `object-storage-implementation` (presigned URLs, upload de fotos y contratos), por lo que no se considera un stub pendiente.

| Integración | Stub | Comportamiento |
| ---| ---| --- |
| Firma electrónica | `ESignatureProviderAdapter` | Retorna un ID de firma mock; requiere webhook manual para completar |
| Pasarela de pagos | `PaymentGatewayAdapter` | Retorna `APPROVED` con URL de redirección mock; requiere webhook manual |
| Canal de mensajería | `MessagingChannelAdapter` | Registra notificaciones en consola del servidor |

Para avanzar el estado de la aplicación durante testing, se documentó una **guía de testing con stubs** (`documentation/MVP-STUB-TESTING-GUIDE.md`) que incluye los comandos curl necesarios para simular los webhooks de firma y pago. El nombre del archivo conserva la convención técnica usada durante la implementación, aunque en el informe consolidado se prefirió hablar de prototipo funcional.
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
La infraestructura de despliegue se implementó como un habilitador operativo para compartir el prototipo por internet durante la evaluación del objetivo 4. La necesidad surgió de que los sujetos de prueba de la etapa de evaluación (posterior a la implementación) se encontraban a distancia del implementador, y se requería que pudieran acceder al prototipo funcional desde sus propios dispositivos a través de un enlace web, sin depender de presencia física ni de configuraciones locales. No debe interpretarse como una arquitectura productiva definitiva ni como una propuesta completa de operación comercial.

En esta parte se otorgó mayor libertad operativa al agente de IA que en otras fases funcionales, dado que el objetivo era pragmático y acotado: habilitar acceso remoto para evaluación. No obstante, dicha libertad permaneció acotada por los steering files técnicos y de producto, el diseño arquitectónico previamente definido, las restricciones del prototipo y la necesidad concreta de habilitar evaluación remota. La selección de AWS respondió a una decisión pragmática: el implementador tenía familiaridad con esta nube, contaba con una cuenta activa y configurada, y podía realizar troubleshooting y gestión de accesos con menor fricción.

Aunque la infraestructura fue modelada con una separación conceptual que permitiría evolucionar hacia ambientes más formales (`stg` y `prod`), durante esta etapa se utilizó exclusivamente el entorno `stg`. No se ejecutó un proceso formal de operación multi-ambiente; el despliegue debe entenderse como una base temporal y suficiente para la evaluación, no como cierre de diseño de infraestructura.

## Arquitectura AWS
La infraestructura se implementó con **AWS CDK** (Infrastructure as Code) organizada en 6 stacks modulares. La capa de cómputo utiliza **Amazon ECS Fargate** — un servicio de orquestación de contenedores serverless — con un **Application Load Balancer (ALB)** en subnets públicas para enrutamiento basado en path. CloudFront se ubica al frente para caching, protección WAF y terminación TLS.

| Stack | Recursos |
| ---| --- |
| NetworkStack | VPC, subnets (3 tiers: públicas, privadas, aisladas), NAT Gateway, Security Groups (ECS, ALB, Data, EIC), EC2 Instance Connect Endpoint |
| DataStack | RDS PostgreSQL 16, ElastiCache Redis 7, S3 bucket, Secrets Manager |
| CiStack | ECR repositories, GitHub Actions IAM role |
| ComputeStack | ECS Cluster, ALB con path-based routing, Fargate services (backend + frontend), task definitions, IAM roles, auto-scaling |
| CdnStack | CloudFront distribution (ALB + S3 origins via OAC), WAF Web ACL, ACM certificate |
| MonitoringStack | CloudWatch alarms (ALB/ECS metrics), dashboards, log groups, SNS notifications |

### Flujo de requests

```sql
User → CloudFront (TLS) → WAF → ALB (HTTP, port 80)
  /api/*    → Backend Target Group → ECS Backend Service (private subnet)
  /assets/* → S3 (via Origin Access Control)
  default   → Frontend Target Group → ECS Frontend Service (private subnet)
```

## Gestión de variables de entorno
Todas las variables de entorno son gestionadas por CDK — **cero configuración manual en la consola AWS**:
*   Variables no sensibles: inyectadas en las task definitions de ECS como environment variables
*   Secretos: almacenados en Secrets Manager y referenciados en las task definitions como secrets (resueltos en runtime por ECS)

## Aclaración de alcance y trabajo futuro en infraestructura

El despliegue descrito fue suficiente para publicar el prototipo y habilitar su evaluación por internet, eliminando la distancia geográfica como barrera entre el implementador y los sujetos de prueba; sin embargo, no reemplaza una iteración específica de diseño de infraestructura orientada a operación sostenida.

En la práctica, solo se desplegó y utilizó el entorno `stg` — la configuración de `prod` existe como modelo conceptual en el código CDK pero no fue instanciada, dado que el único propósito del despliegue era habilitar la evaluación remota del prototipo. Por tanto, la infraestructura actual no representa un proceso formal de diseño o implementación a nivel de infraestructura, sino un habilitador temporal.

Para una evolución posterior, la recomendación es dedicar iteraciones adicionales y esfuerzo de diseño específico a plantear una infraestructura de despliegue adecuada según el diseño arquitectónico ya elaborado, los objetivos de negocio, el nivel de riesgo, el volumen esperado de usuarios y las restricciones de cumplimiento del proyecto. Esto incluiría revisar: arquitectura de ambientes, estrategia formal de `stg` y `prod`, costos, observabilidad, seguridad, respaldo, recuperación ante fallos, gestión de secretos, dominios, certificados, políticas de acceso y procesos de despliegue continuo.

En ese sentido, la infraestructura debe leerse como una solución pragmática y trazable para la etapa de evaluación, no como una decisión final de arquitectura cloud.
# Descubrimiento de requisitos emergentes
Un hallazgo significativo del proceso de implementación fue que **la interacción funcional con el prototipo ya concebido reveló oportunidades de mejora y flujos funcionales que no se habían considerado durante las fases de obtención de requisitos ni de diseño de la solución**.
Ejemplos concretos de requisitos emergentes descubiertos durante la implementación:
*   La necesidad de **desactivar automáticamente un listing cuando se firma el contrato** (no contemplado en el SRS original)
*   La necesidad de **crear automáticamente un pago programado al completar la firma** (descubierto al probar el flujo end-to-end)
*   La necesidad de **sincronizar el estado de tracking cuando se sube un contrato** (gap entre módulos no detectado en diseño)
*   La necesidad de **derivar el estado "Ocupado" de una unidad solo cuando el contrato está firmado** (regla de negocio refinada por uso real)
*   La necesidad de **mostrar información de contacto del arrendatario en la notificación de interés** (UX descubierta al usar la app como arrendador)
Estos descubrimientos son inherentes a cualquier proceso de desarrollo de software, pero el flujo acelerado mediante IA y en la medida que el desarrollador tenga contexto no solamente funcional sino también de la visión del negocio o estrategia, permite **detectarlos tempranamente**, en días o semanas en lugar de meses, gracias a que el prototipo funcional se materializa mucho antes de lo que permitiría un proceso tradicional.

De manera análoga, el primer despliegue en infraestructura de nube reveló **requisitos emergentes operativos** que no eran detectables en desarrollo local:
*   La necesidad de que Docker construya imágenes `linux/amd64` explícitamente cuando el desarrollador trabaja en Apple Silicon (ARM)
*   La necesidad de que `PrismaService` construya `DATABASE_URL` internamente con `sslmode=no-verify` para conexiones TLS a RDS
*   La necesidad de eliminar componentes costosos (NAT Gateway, ElastiCache) en staging y reemplazarlos por VPC Endpoints y cache no-op
*   La necesidad de que el frontend prefije todas las llamadas fetch con `/api` para alinearse con el routing del ALB
*   La incompatibilidad de Prisma 7 con `url` en `schema.prisma` (breaking change no documentado en la migración)

Estos hallazgos operativos refuerzan la misma tesis: el prototipado temprano — incluyendo el despliegue — permite descubrir condiciones que solo se manifiestan en entornos reales, y el flujo SDD permite documentarlas y resolverlas de forma trazable dentro del mismo ciclo de desarrollo.
## Ventaja frente a metodologías tradicionales
En un flujo en cascada tradicional, estos requisitos emergentes se descubrirían típicamente en las fases de testing de integración o de aceptación del usuario, cuando el cronograma ya está comprometido y los cambios representan un **riesgo alto de incumplimiento**. La rigidez del proceso hace que cada hallazgo tardío se convierta en un cambio costoso que compite con la fecha de entrega.
En contraste, el flujo SDD asistido por IA permite:
1. **Materializar el prototipo funcional en días**, no en meses
2. **Descubrir gaps funcionales tempranamente** al interactuar con software real
3. **Iterar rápidamente** sobre los hallazgos sin comprometer el cronograma
4. **Documentar formalmente** cada descubrimiento como parte del spec (trazabilidad)
5. **Implementar correcciones** en el mismo ciclo de desarrollo, no como "deuda técnica"
Esta capacidad de descubrimiento temprano y corrección ágil es uno de los beneficios más significativos del enfoque adoptado, y refuerza la importancia de los procesos iterativos frente a los enfoques lineales para el desarrollo de productos digitales.
# Conclusiones
*   La implementación del prototipo permitió evidenciar la viabilidad del enfoque _Spec-Driven Development (SDD)_ asistido por agentes de inteligencia artificial para el desarrollo de sistemas de complejidad media-alta, demostrando que el uso de especificaciones estructuradas y automatización puede acelerar significativamente la construcción de software manteniendo coherencia arquitectónica y funcional.
*   Los resultados obtenidos demostraron que los _steering files_ son un componente fundamental dentro del flujo SDD, debido a que permiten transferir reglas arquitectónicas, restricciones técnicas y convenciones de diseño al agente de IA. Gracias a ello fue posible reducir errores recurrentes relacionados con consistencia visual, manejo de identificadores y reglas de persistencia, evidenciando que la calidad del resultado depende en gran medida de la claridad y precisión de las especificaciones entregadas.
*   La experiencia de desarrollo permitió confirmar que la efectividad del enfoque SDD depende también de la calidad de las etapas previas de obtención de requerimientos y diseño arquitectónico. El trabajo realizado en el SRS y en el documento de diseño proporcionó un insumo sólido para la construcción de especificaciones y _steering files_, reduciendo la brecha entre el “qué” se debía construir y el “cómo” debía implementarse. Esto evidenció que el uso de IA sin un proceso previo riguroso de análisis y diseño puede incrementar el reproceso y las inconsistencias, mientras que una base documental clara potencia considerablemente la calidad y efectividad del desarrollo asistido por IA.
*   La implementación permitió comprobar que, aunque los agentes de IA pueden generar código funcional y técnicamente válido, la etapa de validación manual continúa siendo indispensable para identificar problemas asociados a experiencia de usuario, navegación, consistencia visual y comportamiento funcional. Esto evidenció que el enfoque SDD no elimina la necesidad de QA humano, sino que transforma su rol hacia actividades de validación, refinamiento y aseguramiento de calidad orientadas al usuario final.
*   A partir de las automatizaciones incorporadas mediante hooks y herramientas auxiliares, se evidenció una mejora significativa en la productividad del proceso de desarrollo, reduciendo trabajo repetitivo relacionado con documentación, validación de convenciones, estructuración de commits y sincronización con herramientas externas. Esto permitió mantener mayor consistencia y trazabilidad durante el desarrollo sin incrementar significativamente la carga operativa del proyecto.
*   La arquitectura hexagonal implementada permitió validar la importancia de mantener separación entre dominio, puertos y adaptadores incluso en un contexto de prototipo, facilitando la incorporación progresiva de nuevas funcionalidades sin afectar considerablemente la lógica de negocio existente. Este resultado confirma que una arquitectura desacoplada favorece la mantenibilidad y evolución futura del sistema.
*   La integración de MCPs con herramientas como ClickUp y Figma permitió mantener sincronización entre gestión del proyecto, diseño visual y desarrollo técnico dentro de un mismo flujo de trabajo, fortaleciendo la trazabilidad entre requerimientos, prototipos y funcionalidades implementadas. Esto evidenció el potencial de los ecosistemas integrados para reducir fricción entre las diferentes etapas del ciclo de desarrollo de software.
*   El desarrollo temprano de un prototipo funcional permitió descubrir requerimientos, reglas de negocio y necesidades de interacción que no habían emergido durante las etapas iniciales de levantamiento de requisitos y diseño arquitectónico. Esto demostró que los ciclos acelerados de iteración asistidos por IA facilitan la detección temprana de vacíos funcionales y reducen el riesgo de desviaciones significativas en cronograma y alcance frente a enfoques tradicionales.
*   En conjunto, la experiencia obtenida permitió concluir que el enfoque SDD asistido por agentes de inteligencia artificial no reemplaza el criterio humano dentro del desarrollo de software, sino que redefine el rol del desarrollador hacia actividades de supervisión, validación y toma de decisiones estratégicas. En consecuencia, el conocimiento de dominio, la capacidad de análisis y la comprensión de las necesidades del usuario continúan siendo factores fundamentales para garantizar la calidad y pertinencia de la solución desarrollada.
