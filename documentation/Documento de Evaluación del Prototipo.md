# Documento de Evaluación del Prototipo

# Introducción

## Propósito

El propósito de este documento es describir la evaluación inicial del prototipo funcional de gestión digital de arriendos, documentando los perfiles seleccionados, la preparación del ambiente de prueba, el protocolo de interacción remota, el instrumento post-interacción aplicado, las respuestas obtenidas y los hallazgos cualitativos derivados de entrevistas complementarias.

Este documento complementa el Documento de Especificación de Requisitos de Software, el Diseño Arquitectónico y Funcional y el Documento de Implementación del Prototipo, cerrando el ciclo documental asociado con el objetivo de evaluación. Se concibe como fuente detallada para el capítulo de evaluación del informe LaTeX. Por tanto, conserva el nivel operativo necesario para replicar o ampliar la evaluación, mientras que el informe consolidado debe presentar una síntesis académica de los elementos más relevantes.

## Alcance

La evaluación documentada en esta versión incorporó dieciséis respuestas post-interacción y dos entrevistas complementarias realizadas después de que los participantes interactuaron con el prototipo. La muestra no tuvo propósito estadístico ni buscó generalizar resultados al mercado de arriendos del Valle del Cauca. Su alcance fue cualitativo e inicial: contrastar si el prototipo permitía abrir una conversación más concreta con usuarios representativos, identificar percepciones tempranas de uso y reconocer oportunidades de mejora para iteraciones posteriores.

La evaluación se orientó a validar percepciones iniciales sobre:

* Facilidad de acceso remoto al prototipo.
* Claridad de la exploración de oferta.
* Comprensión de la información de inmuebles.
* Percepción de confianza y riesgo.
* Utilidad del portafolio para arrendadores.
* Potencial de reducción de fricciones frente a procesos tradicionales.
* Utilidad de videos de apoyo para flujos no recorridos completamente.
* Nuevos requerimientos o ajustes derivados de la interacción con un prototipo funcional.

# Diseño de la evaluación

## Relación con las etapas previas

La evaluación se diseñó como continuidad de la etapa de obtención de requisitos. Para conservar trazabilidad entre necesidades identificadas y validación del prototipo, se seleccionó un subgrupo de personas que ya habían participado en las entrevistas iniciales. Esta decisión permitió contrastar la experiencia de uso con percepciones previamente expresadas sobre arriendo, confianza, digitalización y dificultad de los procesos tradicionales.

La evaluación también se apoyó en la implementación del prototipo y en el proceso de QA manual. Antes de exponer el sistema a sujetos de prueba, el implementador recorrió flujos funcionales, documentó hallazgos y aplicó correcciones. Esta validación interna no reemplazó la evaluación con usuarios, pero redujo el riesgo de que errores básicos de implementación interfirieran con la percepción del prototipo.

## Participantes

La evaluación remota se ejecutó con dieciséis respuestas post-interacción y dos entrevistas complementarias. La fase de entrevistas complementarias conservó continuidad con personas vinculadas a la etapa inicial de obtención de requisitos, lo cual permitió contrastar necesidades previamente identificadas con la experiencia posterior de uso del prototipo.

| Perfil evaluado | Evidencia recopilada | Rol dentro de la evaluación | Justificación |
| --- | --- | --- | --- |
| Arrendatarios | Nueve respuestas post-interacción y una entrevista complementaria con participante de 26 años | Evaluar exploración de oferta, detalle de inmueble, claridad de información y confianza | Permite contrastar la experiencia desde usuarios que buscan vivienda y que presentan distintos niveles de experiencia en procesos de arriendo |
| Arrendadores | Siete respuestas post-interacción y una entrevista complementaria con arrendador de 55 años | Evaluar exploración de oferta, portafolio de inmuebles y necesidades de autogestión | Permite revisar la utilidad del prototipo desde perfiles que ponen vivienda en arriendo y requieren información, control y organización |

La muestra no buscó representatividad estadística. Su propósito fue obtener retroalimentación cualitativa temprana de perfiles contrastantes, especialmente frente a claridad, confianza, facilidad de uso y barreras de interacción.

# Preparación del ambiente de prueba

## Datos y perfil de prueba

Para preparar el ambiente de evaluación, el implementador creó un perfil de arrendador dentro del prototipo. Desde ese perfil se publicaron propiedades dummy, con el fin de que los sujetos de prueba pudieran interactuar con el flujo de exploración de inmuebles sin usar datos reales.

El uso de propiedades dummy permitió:

* Presentar oferta visible para los participantes.
* Evitar tratamiento innecesario de información real o sensible.
* Mantener control sobre el contenido disponible durante la prueba.
* Facilitar una experiencia homogénea entre sujetos.

## Acceso remoto

Debido a la distancia geográfica entre los sujetos de prueba y el implementador, la evaluación se realizó de manera remota. A cada participante se le compartió un enlace de acceso al prototipo desplegado en internet. Esta estrategia permitió que los sujetos interactuaran desde sus propios dispositivos, sin depender de instalación local ni presencia física del implementador.

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
| Arrendadores | Revisar el portafolio de inmuebles | Evaluar comprensión de gestión, publicación y organización de propiedades |

## Videos de apoyo

Además de la interacción directa con el prototipo, se compartieron videos de apoyo para mostrar cómo se usarían o cómo quedarían algunos flujos más difíciles de probar de manera autónoma. Este recurso se planteó especialmente para funcionalidades que dependían de estados específicos, secuencias largas o integraciones simuladas, como firma, pagos o seguimiento del proceso.

Los videos no reemplazaron la interacción con el prototipo. Su función fue contextualizar partes del flujo que podían no ejecutarse completamente durante una prueba remota corta.

## Mensajes enviados por perfil

Para orientar la evaluación remota, se enviaron mensajes diferenciados por perfil. Ambos mensajes conservaron la misma intención metodológica: explicar que no se evaluaba el desempeño del participante, sino la claridad, facilidad de uso, confianza y utilidad percibida del prototipo frente a un proceso tradicional de arriendo.

### Mensaje para arrendatarios

```text
Hola, muchas gracias por apoyarme con la evaluación del prototipo de mi trabajo de grado.

El objetivo de esta prueba es conocer tu percepción al interactuar con una plataforma digital para la gestión de arriendos de vivienda. No se está evaluando si haces algo "bien" o "mal"; lo importante es identificar si el prototipo resulta claro, fácil de usar, confiable y útil frente a un proceso tradicional de arriendo.

Te pido seguir este orden:

1. Primero explora directamente la oferta de inmuebles

Ingresa al prototipo y revisa el flujo de exploración de oferta:

https://puentehogar.co

Durante la exploración:

Navega por los inmuebles disponibles.
Abre el detalle de uno o varios inmuebles.
Revisa si la información presentada es clara y suficiente.
Observa si la experiencia te genera confianza, dudas, interés o dificultad.
Ten presente qué tan fácil sería usar esta plataforma para iniciar un proceso de arriendo.

2. Luego revisa los videos guía

Después de explorar la oferta, revisa los videos asociados al rol de arrendatario. Estos muestran flujos que requieren cuenta, inicio de sesión o estados específicos del proceso.

Cómo crear una cuenta: https://youtu.be/OSebVbUBWcQ
Cómo iniciar sesión: https://youtu.be/I-2JEo1ek8o
Gestión de mis arriendos: https://youtu.be/UcJ__p-mP34
Gestión de contratos: https://youtu.be/RKs3Wmh6kro
Gestión de mis pagos: https://youtu.be/GXmSclB-jkg

3. Finalmente diligencia la encuesta

Cuando termines de explorar el prototipo y revisar los videos, por favor responde la encuesta post-interacción:

https://forms.cloud.microsoft/r/AXwbqVsupr

Muchas gracias por tu tiempo y por tus comentarios. Tu retroalimentación es muy valiosa para cerrar esta etapa del trabajo de grado.
```

### Mensaje para arrendadores

```text
Hola, muchas gracias por apoyarme con la evaluación del prototipo de mi trabajo de grado.

El objetivo de esta prueba es conocer tu percepción al interactuar con una plataforma digital para la gestión de arriendos de vivienda. No se está evaluando si haces algo "bien" o "mal"; lo importante es identificar si el prototipo resulta claro, fácil de usar, confiable y útil frente a un proceso tradicional de arriendo.

Te pido seguir este orden:

1. Primero explora directamente la oferta de inmuebles

Ingresa al prototipo y revisa el flujo de exploración de oferta:

https://puentehogar.co

Durante la exploración:

Navega por los inmuebles disponibles.
Abre el detalle de uno o varios inmuebles.
Revisa si la información presentada es clara y suficiente.
Observa si la experiencia te genera confianza, dudas, interés o dificultad.

2. Luego revisa los videos guía

Después de explorar la oferta, revisa los videos asociados al rol de arrendador. Estos muestran flujos que requieren cuenta, inicio de sesión o estados específicos del proceso.

Cómo crear una cuenta: https://youtu.be/OSebVbUBWcQ
Cómo iniciar sesión: https://youtu.be/I-2JEo1ek8o
Gestión del portafolio: https://youtu.be/BLr-0fYH5yE
Cómo publicar un inmueble: https://youtu.be/P0NmmxlFUu4
Gestión de mis ingresos: https://youtu.be/FjICYhJubRE
Gestión de contratos: https://youtu.be/hwA7KoAoVQA
Gestión de notificaciones: https://youtu.be/SMj0GyX3UHs

3. Finalmente diligencia la encuesta

Cuando termines de explorar el prototipo y revisar los videos, por favor responde la encuesta post-interacción:

https://forms.cloud.microsoft/r/AXwbqVsupr

Muchas gracias por tu tiempo y por tus comentarios. Tu retroalimentación es muy valiosa para cerrar esta etapa del trabajo de grado.
```

# Instrumento de evaluación post-interacción

## Objetivo del instrumento

El instrumento post-interacción se diseñó para contrastar la experiencia real de uso con emociones, percepciones y preocupaciones identificadas durante la etapa de requisitos. En particular, buscó revalidar dimensiones ya observadas en entrevistas y cuestionarios, como confianza, facilidad de uso, claridad del proceso, utilidad percibida y reducción de fricciones.

El formulario finalmente aplicado fue un subset del instrumento inicialmente propuesto. Se priorizaron preguntas de contexto, facilidad de acceso, claridad de exploración, utilidad de filtros, confianza, reducción de fricciones, portafolio del arrendador, utilidad del video de apoyo y comentarios abiertos.

## Instrumento aplicado

| Pregunta aplicada | Tipo de pregunta | Aplica a | Intención evaluativa |
| --- | --- | --- | --- |
| Rango de edad | Selección única | Todos | Caracterizar el grupo etario del participante |
| Experiencia en procesos de arriendo | Selección única | Todos | Identificar familiaridad previa con arriendos |
| Frecuencia de uso de herramientas digitales en su vida diaria | Selección única | Todos | Contextualizar apropiación digital cotidiana |
| Nivel de comodidad usando plataformas digitales | Selección única | Todos | Contrastar facilidad percibida con autopercepción digital |
| ¿Desde qué dispositivo accedió al prototipo? | Selección única | Todos | Verificar el contexto de uso y la pertinencia mobile-first |
| ¿Qué tan fácil fue ingresar al prototipo desde el enlace compartido? | Escala verbal | Todos | Evaluar fricción inicial de acceso remoto |
| ¿Qué emociones sintió al usar el prototipo? | Selección múltiple | Todos | Identificar reacciones emocionales frente a la interacción |
| ¿Qué tan útiles fueron los filtros o elementos de búsqueda disponibles? | Escala verbal | Todos | Validar utilidad de búsqueda y exploración |
| ¿Qué tan clara le pareció la pantalla de exploración de inmuebles? | Escala verbal | Todos | Evaluar comprensión del flujo de oferta |
| ¿Qué tan clara fue la información en el detalle del inmueble? | Escala verbal | Todos | Validar suficiencia y legibilidad del detalle |
| ¿Qué tanta confianza le generó el prototipo para iniciar un proceso de arriendo? | Escala verbal | Todos | Contrastar percepción de confianza frente al problema identificado |
| ¿Considera que este prototipo reduciría fricciones frente a un proceso tradicional de arriendo? | Escala de acuerdo | Todos | Evaluar percepción de valor frente al proceso tradicional |
| ¿Con qué perfil interactuó durante la prueba? | Selección única | Todos | Segmentar respuestas por rol evaluado |
| ¿Qué tan claro le pareció el portafolio de inmuebles? | Escala verbal | Arrendadores | Evaluar comprensión del módulo de autogestión |
| ¿Qué tan fácil le pareció identificar acciones de gestión sobre los inmuebles? | Escala verbal | Arrendadores | Validar visibilidad de acciones administrativas |
| ¿El portafolio le ayudaría a organizar mejor sus inmuebles en arriendo? | Escala de acuerdo | Arrendadores | Evaluar utilidad percibida del portafolio |
| ¿Los videos de apoyo ayudaron a entender flujos que no pudo probar completamente? | Escala de acuerdo | Todos | Evaluar utilidad del recurso complementario |
| ¿Qué comentario adicional tendría sobre el prototipo? | Respuesta abierta | Todos | Capturar observaciones no cubiertas por preguntas cerradas |

## Relación con requisitos previos

El instrumento retomó temas identificados en la etapa de requisitos:

* Confianza en procesos digitales.
* Claridad del flujo.
* Baja carga cognitiva.
* Utilidad de información visual y detalle del inmueble.
* Autogestión para arrendadores.
* Reducción de fricciones frente a procesos presenciales o tradicionales.

De esta manera, la evaluación no se planteó como una actividad aislada, sino como un mecanismo para contrastar si el prototipo respondió a las necesidades identificadas al inicio del proyecto.

# Resultados del formulario post-interacción

## Síntesis de respuestas

Se obtuvieron dieciséis respuestas post-interacción: nueve de personas que interactuaron como arrendatarias y siete de personas que interactuaron como arrendadoras. Quince participantes accedieron desde teléfono celular y uno desde computador, lo cual mantuvo la relevancia del enfoque mobile-first definido desde requisitos y diseño. Para facilitar la lectura en Markdown, los resultados se presentan en tablas complementarias en lugar de una única tabla extensa.

### Contexto de participantes

| Categoría | Resultado |
| --- | --- |
| Total de respuestas | 16 |
| Perfil arrendatario | 9 |
| Perfil arrendador | 7 |
| Rango 18 - 32 años | 5 |
| Rango 33 - 59 años | 11 |
| Acceso desde teléfono celular | 15 |
| Acceso desde computador | 1 |
| Comodidad digital muy cómoda o cómoda | 12 |
| Comodidad digital neutral | 4 |

### Acceso, búsqueda y claridad

| Dimensión | Resultado agregado |
| --- | --- |
| Facilidad de acceso | 11 respuestas indicaron "Muy fácil" y 5 "Fácil" |
| Utilidad de filtros | 7 respuestas indicaron "Muy útiles" y 9 "Útiles" |
| Claridad de exploración | 9 respuestas indicaron "Muy clara" y 7 "Clara" |
| Claridad del detalle del inmueble | 5 respuestas indicaron "Muy clara", 10 "Clara" y 1 "Neutral" |

### Confianza, fricciones y videos de apoyo

| Dimensión | Resultado agregado |
| --- | --- |
| Confianza para iniciar un proceso de arriendo | 5 respuestas indicaron "Mucha confianza", 8 "Confianza" y 3 "Neutral" |
| Reducción de fricciones frente al proceso tradicional | 4 respuestas indicaron "Totalmente de acuerdo", 11 "De acuerdo" y 1 "Neutral" |
| Utilidad de videos de apoyo | 8 respuestas indicaron "Totalmente de acuerdo", 6 "De acuerdo" y 2 "Neutral" |

### Portafolio del arrendador

| Dimensión | Resultado agregado en arrendadores |
| --- | --- |
| Claridad del portafolio | 4 respuestas indicaron "Muy claro" y 3 "Claro" |
| Facilidad para identificar acciones de gestión | 4 respuestas indicaron "Muy fácil", 2 "Fácil" y 1 "Neutral" |
| Utilidad del portafolio para organizar inmuebles | 4 respuestas indicaron "Totalmente de acuerdo" y 3 "De acuerdo" |

### Comentarios abiertos relevantes

| Tema | Comentarios asociados |
| --- | --- |
| Detalle del inmueble | Se solicitó ampliar ubicación, barrio, parqueaderos, piscina y características del inmueble. |
| Fotos e información visual | Se pidió publicar fotos de cada espacio para que el posible arrendatario conozca mejor el inmueble. |
| Valor percibido por arrendadores | Se señaló que la herramienta podía ayudar a ofertar bienes y llegar a clientes potenciales con confianza e información clara. |
| Diferenciación frente a otras plataformas | Se preguntó qué podría ofrecer el prototipo para diferenciarse de otras aplicaciones. |
| Confianza en virtualidad completa | Una participante indicó que no se sentiría cómoda con un proceso 100 % virtual y que aún preferiría ver a las personas antes de avanzar. |
| Nomenclatura de ciudad | Se observó una fricción menor al buscar "Santiago de Cali", dado que algunos usuarios están más habituados a buscar "Cali". |

## Lectura de resultados

Los resultados mostraron que el acceso remoto fue viable para los participantes: todas las respuestas calificaron el ingreso como fácil o muy fácil. Este hallazgo fue relevante porque el despliegue en internet se había configurado como habilitador de evaluación, no como infraestructura productiva definitiva.

La exploración de oferta fue evaluada como clara o muy clara en todas las respuestas, y los filtros o elementos de búsqueda fueron considerados útiles o muy útiles por todos los participantes. El detalle del inmueble también tuvo una lectura favorable, aunque una respuesta neutral evidenció que la suficiencia de información todavía podía fortalecerse. Estas valoraciones sugieren que el prototipo permitió recorrer los flujos básicos de búsqueda y revisión de oferta sin generar barreras evidentes de comprensión.

La confianza presentó una lectura mayoritariamente positiva, aunque no uniforme: trece respuestas indicaron confianza o mucha confianza y tres se mantuvieron neutrales. Esta diferencia fue importante porque mostró que la claridad de interfaz no basta por sí sola para resolver la confianza en un proceso de arriendo; también se requieren mecanismos de información, evidencia, requisitos y control que reduzcan la percepción de riesgo.

La reducción de fricciones fue valorada de forma favorable: quince respuestas estuvieron de acuerdo o totalmente de acuerdo con que el prototipo podría reducir fricciones frente a un proceso tradicional, mientras que una respuesta se mantuvo neutral. Asimismo, los videos de apoyo fueron considerados útiles por la mayoría de participantes para entender flujos que no pudieron probarse completamente, especialmente aquellos dependientes de estados, firma, pagos, publicación o seguimiento.

En el caso de los arrendadores, el portafolio fue comprendido como claro o muy claro por todas las personas que respondieron ese bloque. También se observó una percepción favorable sobre su utilidad para organizar inmuebles en arriendo. Sin embargo, la respuesta neutral frente a la facilidad para identificar acciones de gestión indicó que este módulo todavía requería refinamiento de jerarquía visual, acciones disponibles y acompañamiento contextual.

# Entrevistas complementarias

Además del formulario, se realizaron entrevistas complementarias con un arrendador de 55 años y un arrendatario de 26 años. Estas conversaciones permitieron profundizar en hallazgos que difícilmente emergen solo desde preguntas cerradas.

## Hallazgos compartidos

Tener un prototipo materializado permitió reafirmar historias de usuario y funcionalidades que ya se habían planteado para releases posteriores en el User Story Mapping de la etapa de requisitos. Un ejemplo fue el mapa como herramienta para identificar la ubicación del inmueble. Aunque esta funcionalidad no hacía parte del flujo principal implementado, la interacción con el prototipo reforzó su valor para orientar la decisión del arrendatario.

También surgieron nuevos requerimientos asociados con el detalle de cada inmueble. Los participantes esperaban características más explícitas sobre la estructura de la vivienda y sus comodidades, como ascensor, piscina, parqueadero, barrio y otros elementos de ubicación o habitabilidad. Asimismo, se identificó la necesidad de reforzar que las fotos publicadas representen las características declaradas. Por ejemplo, si una publicación indica que el inmueble tiene cocina integral, se esperaría cargar una foto que valide visualmente esa característica.

Este hallazgo resultó especialmente relevante porque evolucionó una necesidad identificada en la etapa de requisitos. Inicialmente se había reconocido que las fotos eran importantes, lo que llevó a incluir tres fotos obligatorias en el prototipo. Después de interactuar con una versión funcional, la expectativa cambió: no bastaba con exigir fotos, sino que estas debían representar de forma verificable las características anunciadas.

## Hallazgos específicos del arrendador

El arrendador entrevistado manifestó la necesidad de contar con un reporte de control por inmueble que permitiera consultar quién era el arrendatario, cuál era el valor del arriendo, cuál era la fecha de pago, si el último pago había sido realizado y hasta qué fecha se encontraba vigente el contrato.

También indicó que el detalle de una publicación debería mostrar requisitos para tomar la vivienda, como certificados de ingresos u otros documentos configurables por el arrendador. Esta necesidad permitiría que los arrendatarios revisaran si cumplían condiciones mínimas antes de iniciar un proceso, reduciendo fricciones posteriores y evitando contactos poco viables.

## Observaciones de UX/UI

Las entrevistas también permitieron identificar una tensión relevante entre simplicidad y percepción de completitud. Por un lado, la interfaz simple facilitó la navegación y redujo la carga cognitiva. Por otro lado, al compararse con plataformas estables y existentes, algunos participantes percibieron que el prototipo se sentía básico por la cantidad limitada de funcionalidades disponibles y por una interfaz visual menos densa o llamativa.

Este hallazgo no invalida el principio de accesibilidad, pero sí muestra que el diseño debe equilibrar claridad con riqueza funcional y visual. Una plataforma simple puede favorecer la inclusión digital, pero si se percibe demasiado básica puede transmitir una sensación de producto en construcción o de menor capacidad para suplir necesidades reales.

# Conclusiones de la evaluación

La evaluación inicial se ejecutó mediante interacción remota, formulario post-interacción y entrevistas complementarias. La prueba se apoyó en datos dummy, un perfil de arrendador preparado por el implementador, enlaces compartidos por internet y videos de apoyo para flujos difíciles de recorrer completamente. Este esquema permitió contrastar la experiencia del prototipo con usuarios provenientes de la etapa de requisitos, conservando trazabilidad entre necesidades identificadas y percepción posterior de uso.

Los resultados mostraron que el prototipo fue accesible principalmente desde teléfono celular, que los flujos de exploración y detalle resultaron claros, que los filtros fueron percibidos como útiles y que la mayoría de participantes consideró que la solución podría reducir fricciones frente al proceso tradicional de arriendo. Al mismo tiempo, la confianza no fue uniforme y surgieron requerimientos adicionales sobre mapa, detalle del inmueble, fotos representativas, reportes de control, requisitos configurables y diferenciación frente a plataformas existentes.

A partir de estos hallazgos, se concluyó que el prototipo funcional permitió validar propuestas de valor de manera más concreta que una especificación o un diseño visual aislado. Al interactuar con software materializado, los usuarios no solo evaluaron lo existente, sino que también formularon nuevas necesidades. Esto confirmó el valor del prototipado temprano como mecanismo para continuar descubriendo historias de usuario y ajustar prioridades.

El principal aprendizaje de la evaluación fue que la simplicidad de interfaz debe gestionarse como una decisión de equilibrio. La baja carga cognitiva favorece la navegación y la inclusión digital, pero una experiencia demasiado simple puede percibirse como básica frente a plataformas consolidadas. Por tanto, el diseño futuro debe conservar claridad sin sacrificar riqueza funcional, confianza visual ni suficiencia de información.

La evaluación mantuvo una muestra acotada y no permitió establecer conclusiones estadísticas. También faltó observar sesiones completas de uso, ampliar perfiles de participantes, probar flujos dependientes de firma, pagos y publicación con mayor profundidad, y contrastar la experiencia con métricas más específicas de accesibilidad, confianza y carga cognitiva.

Las siguientes iteraciones deberían ampliar la muestra, incorporar mapa, enriquecer el detalle de inmueble, validar fotos representativas de características, fortalecer el portafolio del arrendador con reportes de control y requisitos configurables, y refinar la interfaz para equilibrar simplicidad accesible con una percepción visual más completa y confiable.
