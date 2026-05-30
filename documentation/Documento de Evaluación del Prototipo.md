# Documento de Evaluación del Prototipo

# Introducción

## Propósito

El propósito de este documento es describir el diseño de evaluación del prototipo funcional de gestión digital de arriendos, documentando los perfiles seleccionados, la preparación del ambiente de prueba, el protocolo de interacción remota, las tareas solicitadas y el instrumento post-interacción. Este documento complementa el Documento de Especificación de Requisitos de Software, el Diseño Arquitectónico y Funcional y el Documento de Implementación del Prototipo, cerrando el ciclo documental asociado con el objetivo de evaluación.

El documento se concibe como fuente detallada para el capítulo de evaluación del informe LaTeX. Por tanto, conserva el nivel operativo necesario para replicar o ampliar la evaluación, mientras que el informe consolidado debe presentar una síntesis académica de los elementos más relevantes.

## Alcance

La evaluación documentada en esta versión corresponde a la preparación del protocolo y del instrumento post-interacción. No se incorporan todavía resultados agregados, conclusiones definitivas ni análisis estadístico de respuestas, dado que estos dependen de la ejecución y sistematización posterior del formulario.

La evaluación se orientó a validar percepciones iniciales sobre:

* Facilidad de uso del prototipo.
* Claridad de la exploración de oferta.
* Comprensión de la información de inmuebles.
* Percepción de confianza y riesgo.
* Utilidad del portafolio para arrendadores.
* Potencial de reducción de fricciones frente a procesos tradicionales.
* Emociones o apreciaciones generadas durante la interacción.

# Diseño de la evaluación

## Relación con las etapas previas

La evaluación se diseñó como continuidad de la etapa de obtención de requisitos. Para conservar trazabilidad entre necesidades identificadas y validación del prototipo, se seleccionó un subgrupo de personas que ya habían participado en las entrevistas iniciales. Esta decisión permitió contrastar la experiencia de uso con percepciones previamente expresadas sobre arriendo, confianza, digitalización y dificultad de los procesos tradicionales.

La evaluación también se apoyó en la implementación del prototipo y en el proceso de QA manual. Antes de exponer el sistema a sujetos de prueba, el implementador recorrió flujos funcionales, documentó hallazgos y aplicó correcciones. Esta validación interna no reemplaza la evaluación con usuarios, pero reduce el riesgo de que errores básicos de implementación interfieran con la percepción del prototipo.

## Participantes

La evaluación remota se diseñó con tres sujetos de prueba:

| Perfil | Origen | Rol dentro de la evaluación | Justificación |
| --- | --- | --- | --- |
| Arrendatario joven | Subgrupo de participantes de entrevistas iniciales | Evaluar exploración de oferta y detalle de inmueble | Representa usuarios digitalizados que buscan vivienda en canales digitales |
| Arrendador joven | Subgrupo de participantes de entrevistas iniciales | Evaluar exploración de oferta y portafolio de inmuebles | Permite contrastar la autogestión desde un perfil con mayor familiaridad tecnológica |
| Arrendador mayor | Subgrupo de participantes de entrevistas iniciales | Evaluar comprensión de exploración y portafolio | Representa el perfil prioritario de inclusión digital y baja carga cognitiva |

La muestra no busca representatividad estadística. Su propósito es obtener retroalimentación cualitativa temprana de perfiles contrastantes, especialmente frente a claridad, confianza, facilidad de uso y barreras de interacción.

# Preparación del ambiente de prueba

## Datos y perfil de prueba

Para preparar el ambiente de evaluación, el implementador creó un perfil de arrendador dentro del prototipo. Desde ese perfil se publicaron propiedades dummy, con el fin de que los sujetos de prueba pudieran interactuar con el flujo de exploración de inmuebles sin usar datos reales.

El uso de propiedades dummy permitió:

* Presentar oferta visible para los participantes.
* Evitar tratamiento innecesario de información real o sensible.
* Mantener control sobre el contenido disponible durante la prueba.
* Facilitar una experiencia homogénea entre sujetos.

## Acceso remoto

Debido a la distancia geográfica entre los sujetos de prueba y el implementador, la evaluación se planteó de manera remota. A cada participante se le compartió un enlace de acceso al prototipo desplegado en internet. Esta estrategia permitió que los sujetos interactuaran desde sus propios dispositivos, sin depender de instalación local ni presencia física del implementador.

El despliegue utilizado para esta evaluación debe entenderse como un habilitador operativo de la prueba, no como una infraestructura productiva definitiva. El detalle técnico de esta infraestructura se conserva en el Documento de Implementación del Prototipo.

# Protocolo de interacción

## Instrucciones generales

Antes de iniciar la interacción, se compartieron instrucciones simples sobre el propósito de la prueba. Se explicó que el objetivo no era evaluar al participante, sino observar la claridad y utilidad del prototipo. También se indicó que podían registrar dudas, dificultades o comentarios espontáneos para reportarlos posteriormente en el formulario.

## Tareas por perfil

| Perfil | Tarea | Objetivo de observación |
| --- | --- | --- |
| Todos los participantes | Ingresar al enlace compartido y revisar la exploración de oferta | Verificar acceso remoto, primera impresión y comprensión general |
| Todos los participantes | Explorar propiedades dummy publicadas | Evaluar claridad de tarjetas, filtros, información disponible y navegación |
| Todos los participantes | Abrir el detalle de un inmueble | Revisar suficiencia de información, confianza y facilidad para entender el inmueble |
| Arrendador joven | Revisar el portafolio de inmuebles | Evaluar comprensión de gestión, publicación y organización de propiedades |
| Arrendador mayor | Revisar el portafolio de inmuebles | Evaluar claridad del flujo para un perfil con menor apropiación digital |

## Video de apoyo

Además de la interacción directa con el prototipo, se compartió un video de apoyo para mostrar cómo se usarían o cómo quedarían algunos flujos más difíciles de probar de manera autónoma. Este recurso se planteó especialmente para funcionalidades que dependían de estados específicos, secuencias largas o integraciones simuladas, como firma, pagos o seguimiento del proceso.

El video no reemplaza la interacción con el prototipo. Su función es contextualizar partes del flujo que podrían no ejecutarse completamente durante una prueba remota corta.

# Instrumento de evaluación post-interacción

## Objetivo del instrumento

El instrumento post-interacción se diseñó para contrastar la experiencia real de uso con emociones, percepciones y preocupaciones identificadas durante la etapa de requisitos. En particular, busca revalidar dimensiones ya observadas en entrevistas y cuestionarios, como confianza, facilidad de uso, claridad del proceso, utilidad percibida y reducción de fricciones.

El formulario combina preguntas cerradas y abiertas. Las preguntas cerradas permiten comparar respuestas entre perfiles, mientras que las abiertas permiten capturar hallazgos no anticipados.

## Estructura propuesta del instrumento

| Pregunta | Tipo de pregunta | Aplica a | Intención evaluativa |
| --- | --- | --- | --- |
| ¿Con qué perfil interactuó durante la prueba? | Selección única | Todos | Segmentar respuestas entre arrendatario joven, arrendador joven y arrendador mayor |
| ¿Desde qué dispositivo accedió al prototipo? | Selección única | Todos | Identificar contexto de uso y posible relación con experiencia mobile-first |
| ¿Qué tan fácil fue ingresar al prototipo desde el enlace compartido? | Escala Likert 1-5 | Todos | Evaluar si el acceso remoto fue claro y no generó fricción inicial |
| ¿Qué tan clara le pareció la pantalla de exploración de inmuebles? | Escala Likert 1-5 | Todos | Medir comprensión inicial del flujo de oferta |
| ¿Qué tan útiles fueron los filtros o elementos de búsqueda disponibles? | Escala Likert 1-5 | Todos | Validar utilidad de mecanismos de exploración |
| ¿La información mostrada en las tarjetas de inmuebles fue suficiente para decidir si quería ver más detalles? | Escala Likert 1-5 | Todos | Evaluar suficiencia de información resumida |
| ¿Qué tan clara fue la información en el detalle del inmueble? | Escala Likert 1-5 | Todos | Validar comprensión de fotografías, características y datos ampliados |
| ¿Qué emociones sintió al usar el prototipo? | Selección múltiple | Todos | Identificar confianza, tranquilidad, confusión, inseguridad, frustración o interés |
| ¿El prototipo le generó confianza para iniciar un proceso de arriendo? | Escala Likert 1-5 | Todos | Contrastar percepción de confianza frente a hallazgos de requisitos |
| ¿Qué aspecto le generó más confianza o más duda? | Respuesta abierta | Todos | Capturar razones cualitativas detrás de la percepción de confianza |
| ¿Considera que este prototipo reduciría fricciones frente a un proceso tradicional de arriendo? | Escala Likert 1-5 | Todos | Evaluar percepción de valor frente al problema de negocio |
| ¿Qué parte del flujo le pareció más fácil de entender? | Respuesta abierta | Todos | Identificar fortalezas de experiencia |
| ¿Qué parte del flujo le pareció más confusa o difícil? | Respuesta abierta | Todos | Identificar oportunidades de mejora |
| ¿Qué tan claro le pareció el portafolio de inmuebles? | Escala Likert 1-5 | Arrendadores | Evaluar comprensión del módulo de autogestión |
| ¿Qué tan fácil le pareció identificar acciones de gestión sobre los inmuebles? | Escala Likert 1-5 | Arrendadores | Validar visibilidad de acciones administrativas |
| ¿El portafolio le ayudaría a organizar mejor sus inmuebles en arriendo? | Escala Likert 1-5 | Arrendadores | Evaluar utilidad percibida del módulo para autogestión |
| ¿El video de apoyo ayudó a entender flujos que no pudo probar completamente? | Escala Likert 1-5 | Todos | Evaluar utilidad del recurso complementario |
| ¿Qué funcionalidad considera más importante para una siguiente versión? | Respuesta abierta | Todos | Priorizar mejoras futuras desde la percepción del usuario |
| ¿Qué comentario adicional tendría sobre el prototipo? | Respuesta abierta | Todos | Capturar hallazgos no cubiertos por preguntas previas |

## Relación con requisitos previos

El instrumento retoma temas identificados en la etapa de requisitos:

* Confianza en procesos digitales.
* Claridad del flujo.
* Baja carga cognitiva.
* Utilidad de información visual y detalle del inmueble.
* Autogestión para arrendadores.
* Reducción de fricciones frente a procesos presenciales o tradicionales.

De esta manera, la evaluación no se plantea como una actividad aislada, sino como un mecanismo para contrastar si el prototipo respondió a las necesidades identificadas al inicio del proyecto.

# Análisis esperado

Una vez se recopilen las respuestas, el análisis deberá organizarse por perfil y dimensión evaluada. Se recomienda:

* Comparar percepciones entre arrendatario joven, arrendador joven y arrendador mayor.
* Identificar coincidencias y diferencias frente a las entrevistas iniciales.
* Agrupar respuestas abiertas por temas recurrentes.
* Señalar barreras de comprensión, confianza o navegación.
* Priorizar oportunidades de mejora según frecuencia, severidad y relación con los objetivos del proyecto.

# Estado de resultados

En esta versión del documento no se presentan resultados definitivos, dado que el instrumento quedó preparado para aplicación y posterior sistematización. Los resultados deberán incorporarse cuando existan respuestas completas de los sujetos de prueba, evitando inferir conclusiones sin evidencia.

