# DOCUMENTO DE ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE

# Introducción
## Propósito
El propósito del sistema es **proveer una plataforma para la gestión del proceso de arriendo de vivienda**, orientada principalmente en la inclusión digital de adultos mayores,  **pequeños propietarios del Valle del Cauca con bajo nivel de alfabetización digital**, mientras se ofrece una experiencia atractiva y eficiente para **arrendatarios jóvenes** **con alta adopción tecnológica**.
El sistema busca reducir las fricciones presentes en el ciclo de arriendo, enfocado en una primera fase en la publicación de inmuebles, formalización contractual y gestión de pagos, mediante **interfaces simplificadas**, **integraciones con servicios externos** (firma electrónica y pasarelas de pago) y un enfoque de **prototipado funcional iterativo**, que permita validar tempranamente la utilidad y facilidad de uso del producto.
## Glosario, siglas y abreviaciones

| Término / Sigla | Descripción |
| ---| --- |
| Arrendador | Persona natural o jurídica que concede el uso de un inmueble a cambio de un canon. |
| Arrendatario | Persona que recibe el uso del inmueble y paga el canon de arrendamiento. |
| Arrendamiento de vivienda | Contrato regulado por la Ley 820 de 2003 para el uso de vivienda urbana. |
| Brecha digital | Diferencia en acceso, uso y aprovechamiento efectivo de tecnologías digitales. |
| Firma electrónica | Mecanismo digital que permite identificar al firmante y garantizar integridad del documento (Decreto 2364 de 2012). |
| Low-code / No-code | Enfoques de desarrollo que reducen o eliminan la necesidad de programación manual. |
| Pasarela de pagos | Servicio externo que autoriza y procesa pagos electrónicos de forma segura. |
| Prototipo funcional | Versión operativa simplificada del sistema usada para validación temprana. |
| PropTech | Uso de tecnologías digitales para transformar procesos del sector inmobiliario. |

# Descripción General
## Descripción del contexto de dominio
El dominio del sistema corresponde al **proceso de arrendamiento de vivienda urbana en Colombia**, particularmente en el **Valle del Cauca**, donde existe una alta proporción de hogares en arriendo y una marcada **asimetría digital** entre oferentes y demandantes.
### Actores principales del dominio
*   **Propietarios/arrendadores**: mayoritariamente adultos mayores, con baja apropiación digital, que en gran medida dependen del ingreso por arriendo.
*   **Arrendatarios**: predominantemente jóvenes adultos con alta familiaridad con plataformas digitales.
*   **Proveedores externos**: servicios de firma electrónica y pasarelas de pago que soportan procesos críticos.
### Procesos del dominio
1. Publicación y consulta de inmuebles.
2. Contacto entre arrendador y arrendatario.
3. Formalización del contrato de arrendamiento.
4. Gestión de pagos periódicos.
5. Organización básica de ingresos para el propietario.
El sistema **no reemplaza** el marco legal ni asume responsabilidades jurídicas; actúa como **facilitador tecnológico** dentro de la normativa colombiana vigente (Ley 820 de 2003, Ley 527 de 1999, Ley 1581 de 2012).
## Perspectiva del producto
La plataforma a desarrollar es un **producto independiente**, pero **altamente integrado** con servicios externos especializados, así, actúa como **orquestador de procesos**, delegando funciones complejas a proveedores externos para reducir riesgos técnicos, legales y de implementación.
### Relación con otros sistemas
El sistema **no forma parte de un ecosistema corporativo mayor**, pero interactúa con:
*   Servicios externos de **firma electrónica**
*   Pasarelas externas de **pagos electrónicos**
*   Navegadores web y dispositivos móviles de los usuarios
## Características de los usuarios
Debido a la diferencia entre usuarios dependiendo de su rol en el sistema y de su edad, así mismo, se caracterizarán teniendo en consideración estos dos focos:
### Segmentación por grupos etarios

| Grupo | Rango de edad | Características relevantes |
| ---| ---| --- |
| Jóvenes | 18–32 años | Alta adopción digital, preferencia por interfaces rápidas y visuales |
| Adultos | 33–59 años | Uso funcional de tecnología, enfoque práctico |
| Adultos mayores | 60+ años | Baja alfabetización digital, necesidad de simplicidad y acompañamiento |

### Roles del sistema

| Rol | Descripción |
| ---| --- |
| Arrendador | Publica inmuebles, carga contratos, visualiza pagos |
| Arrendatario | Consulta oferta, interactúa con publicaciones |
| Administrador (prototipo) | Configuración básica y soporte |

## Restricciones de diseño e implementación
*   Uso de **herramientas de desarrollo rápido** (low-code / prototipado funcional / Agentes de IA para codificación).
*   Dependencia de **servicios externos** para pagos y firma electrónica.
*   Alcance geográfico limitado al **Valle del Cauca**.
*   No se desarrollan:
    *   Sistemas propios de pagos.
    *   Motores legales de contratos.
    *   Gestión de mora o cobranza.
*   Cumplimiento obligatorio de:
    *   Protección de datos personales (Ley 1581 de 2012).
    *   Normativa de firma electrónica vigente.
Estas restricciones son **intencionales** considerando el alcance de esta primer versión del producto, eventualmente se podría revaluar su madurez y deseabilidad para modificar estas decisiones.
## Suposiciones y dependencias
### Suposiciones
*   Los usuarios cuentan con acceso básico a internet.
*   Los arrendadores están dispuestos a recibir acompañamiento mínimo.
*   Los servicios externos ofrecen entornos sandbox para pruebas.
*   El prototipo se valida con un número limitado de usuarios reales.
### Dependencias
*   Disponibilidad y estabilidad de APIs externas.
*   Acceso a usuarios para entrevistas y pruebas piloto.
*   Aprobación ética y académica del enfoque metodológico.
*   Continuidad del marco normativo colombiano vigente.
## Visión conceptual
A continuación se agrega el contexto del sistema y los límites de este:
![](https://t90132600355.p.clickup-attachments.com/t90132600355/29ae667e-6f2d-4073-984f-5418e7a58173/image.png)
Desde el punto de vista arquitectónico se plantea este primer acercamiento a la vista de contexto del modelo C4:
![](https://t90132600355.p.clickup-attachments.com/t90132600355/59641356-4ff8-4a8d-bf49-258bab60af27/image.png)
# Estrategia de obtención de requisitos
El objetivo de esta sección es documentar de los métodos utilizados para la obtención de requisitos funcionales del sistema, justificando su selección y describiendo cómo se aplican en el contexto del proyecto.
## Revisión documental y benchmarking
Private ([https://app.clickup.com/t/86aefdhru](https://app.clickup.com/t/86aefdhru))
### Objetivo de la actividad
Esta estrategia busca a través de la literatura y del acercamiento a las soluciones similares, Identificar prácticas existentes, detectar vacíos en las propuestas actuales, reconocer patrones funcionales recurrentes y caracterizar con mayor detalle los tipos de usuarios de la plataforma y sus necesidades desde el punto de vista tecnológico.
### Alcance de la revisión
Para la revisión se consideran plataformas similares desde el punto de vista de gestión comercial de viviendas independientemente del foco de arrendamiento o venta, literatura asociada a la inclusion digital y niveles de adopción/apropiación digital, tanto en Colombia como a nivel internacional para usarlo como referencia, así, la revisión será de:
*   Plataformas PropTech (clasificados, SaaS, proptech integrales)
*   Apropiación digital en el contexto colombiano y referentes internacionales
*   Iniciativas de inclusión digital (no solo inmobiliarias)
### Criterios de análisis
#### Caracterización de usuarios
En este ítem se busca identificar y caracterizar las necesidades de los distintos usuarios según su grupo etario, con el propósito de utilizarlas como insumo para la estructuración de la experiencia de interacción con el sistema, tanto desde el punto de vista funcional como no funcional. Para ello, el análisis se fundamenta en tres criterios principales: el nivel de apropiación digital, las aplicaciones y herramientas digitales utilizadas por los usuarios, y las características asociadas a dichos usos, entendidas como patrones de comportamiento, expectativas y limitaciones frente a los entornos digitales.
De acuerdo con los indicadores básicos de tenencia y uso de Tecnologías de la Información y las Comunicaciones publicados por el DANE (2023), "para el total nacional, el rango de edad con mayor porcentaje de personas que reportaron haber usado Internet fue entre 12 y 24 años (90,6%). Le siguieron, en orden de importancia, el grupo de edad entre 25 y 54 años (86,0%) y entre 5 y 11 años (63,3%)". Adicionalmente, el mismo boletín señala que los niveles educativos con mayor proporción de uso de Internet corresponden al nivel superior incompleto y superior completo, con un 98,2% y 97,6% respectivamente, mientras que la menor proporción se presenta en la población sin ningún nivel educativo, con un 24,4%.
Complementando lo anterior, otro hallazgo relevante del boletín indica que, a nivel nacional, el 96,1% de las personas de 5 y más años que utilizaron Internet lo hicieron a través de un teléfono celular, consolidándose este dispositivo como el principal canal de acceso. Este dato resulta especialmente significativo, ya que no solo evidencia una alta penetración del acceso móvil, sino que también condiciona la forma en que los usuarios interactúan con los servicios digitales, influyendo directamente en aspectos como usabilidad, diseño de interfaces, tiempos de interacción y expectativas frente a la experiencia del sistema.
Además, una investigación realizada por Pragma (2018) aporta una visión complementaria al analizar el uso de Internet en Colombia desde una perspectiva etaria y conductual. A partir de este análisis, se identifican cinco arquetipos digitales que permiten caracterizar a los usuarios no solo por su edad, sino también por su nivel de adopción digital, sus motivaciones y su relación con los entornos tecnológicos:

| Arquetipo | Rango de edad | características |
| ---| ---| --- |
| Entry Digital: jóvenes digitales | <24 | Muy digitales, buscan mantenerse actualizados |
| El Adopter: común digital | 25-45 | Adopción digital media, muy enfocado a lo social |
| El High Digital: el hiper-digital | 25-45 | Adopción digital alta, muy exigentes frente a los servicios digitales esperando innovación y personalización |
| Mixto: el adulto digital | \>45 | Adoption digital media-alta, enfocado en lo corporativo buscan atención personalizada y servicios privados y confiables |
| El Tradicional: el escéptico digital | \>60 | Adopción baja, enfocado en telecomunicaciones, prefiere las llamadas o la atención personal del mundo físico |

Con el fin de complementar la caracterización, se incorporan como referente comparativo los resultados de investigaciones realizadas en España sobre los tipos de uso de Internet y de plataformas digitales según la edad. Si bien estos estudios no corresponden al contexto colombiano, permiten identificar patrones transversales de comportamiento digital asociados al ciclo de vida, tales como un uso predominantemente recreativo y social en los grupos más jóvenes, una adopción funcional y orientada a la eficiencia en la adultez, y un uso instrumental, cauteloso y centrado en la comunicación en la vejez. A continuación se entra en detalle de las características de cada grupo excluyendo aquellos de infancia y adolescencia debido a que no son usuarios de interés de la plataforma.
Así, en la juventud, el uso de Internet evoluciona hacia un modelo mixto que combina el ocio con funciones instrumentales y transaccionales. Los jóvenes utilizan activamente las redes sociales no solo para la interacción social, sino también como fuente de información, canal de consumo, búsqueda de oportunidades laborales y acceso a servicios digitales. Este grupo muestra una alta disposición a adoptar plataformas de economía digital y bajo demanda, valora la personalización de los servicios y prioriza experiencias digitales rápidas, integradas y centradas en el usuario. La baja preocupación por la privacidad y la alta expectativa frente a la experiencia digital son rasgos distintivos de este segmento (SmartCommerce21, 2022; ORH, 2018; Lertxundi, 2019).
Por otro lado, en la adultez, el uso de Internet tiende a volverse más selectivo, pragmático y orientado a la eficiencia. Los adultos utilizan las plataformas digitales principalmente para mantener relaciones existentes, informarse, realizar trámites, comparar servicios y efectuar compras, mostrando una mayor conciencia sobre la privacidad y la seguridad de la información. Aunque existe una aceptación generalizada de los procesos digitalizados, se observa una preferencia por la interacción humana en aquellos contextos percibidos como complejos o de alto impacto, lo que refleja una adopción condicionada por la confianza y la utilidad percibida del servicio (SmartCommerce21, 2022; ORH, 2018; Lertxundi, 2019).
Finalmente, en los adultos mayores, el uso de Internet se concentra en funciones instrumentales básicas, especialmente la comunicación con familiares y la reducción del aislamiento social. Si bien este grupo participa en redes sociales como Facebook o Twitter, su nivel de adopción de procesos digitales complejos, como el comercio electrónico o los trámites en línea, es significativamente menor. La desconfianza frente a fraudes, la preferencia por canales tradicionales y la dependencia de terceros para realizar gestiones digitales son rasgos recurrentes. (SmartCommerce21, 2022; ORH, 2018; Lertxundi, 2019).
Estos hallazgos permiten concluir que el sistema a desarrollar debe contemplar una experiencia de interacción flexible y progresiva, capaz de adaptarse a distintos niveles de alfabetización digital, utilizando el canal móvil como medio principal de acceso y priorizando decisiones de diseño que reduzcan la carga cognitiva, fortalezcan la confianza y faciliten la comprensión del proceso de arriendo. A partir de esta caracterización se puede iniciar con el planteamiento de un borrador de requerimientos funcionales y no funcionales orientados a la inclusión digital y a la adopción efectiva del prototipo por parte de los distintos perfiles de usuario.

| Requerimiento | Descripción | Justificación |
| ---| ---| --- |
| Acceso prioritario desde dispositivos móviles | El sistema debe permitir el acceso y uso funcional completo desde dispositivos móviles, considerando que el teléfono celular es el principal canal de acceso a Internet para la mayoría de los usuarios. | Uso predominante de Internet vía celular reportado por DANE (2023). |
| Exploración de la oferta sin autenticación previa | El sistema debe permitir a los usuarios consultar la oferta de inmuebles sin necesidad de registro o autenticación obligatoria. | Necesidad de reducir barreras de entrada, especialmente para usuarios con baja apropiación digital. |
| Presentación visual simplificada de la información | El sistema debe presentar la información de los inmuebles utilizando elementos visuales predominantes (imágenes, iconos, etiquetas breves), minimizando el uso de texto extenso. | Usuarios tradicionales y mixtos presentan limitaciones frente a interfaces densas en texto. |
| Progresividad en la interacción | El sistema debe estructurar la interacción en pasos progresivos, permitiendo que los usuarios accedan inicialmente a información básica y profundicen gradualmente según su necesidad. | Reducción de carga cognitiva para adultos y adultos mayores. |
| Visualización clara del estado del proceso | El sistema debe permitir a los usuarios identificar fácilmente el estado del proceso de arriendo (publicado, en contacto, contrato cargado, contrato firmado, pago realizado). | Necesidad de orientación y confianza en usuarios con adopción digital media o baja. |
| Integración guiada de procesos complejos | El sistema debe ofrecer flujos guiados para procesos complejos como la firma electrónica y el pago digital, explicando de forma clara qué se espera del usuario en cada paso. | Desconfianza y baja adopción de procesos transaccionales en adultos mayores. |
| Soporte a la gestión básica del arriendo para el arrendador | El sistema debe permitir al arrendador gestionar de forma centralizada la publicación del inmueble, el contrato y los pagos, sin requerir conocimientos técnicos avanzados. | Perfil del arrendador tradicional con baja alfabetización digital. |
| Usabilidad diferenciada por nivel de adopción digital | El sistema debe priorizar una experiencia de usuario que sea comprensible para usuarios con baja alfabetización digital, sin limitar la eficiencia para usuarios con mayor experiencia tecnológica. | Diseño que considere los diferentes niveles de adopción. |
| Baja carga cognitiva | El sistema debe minimizar la cantidad de información y decisiones presentadas simultáneamente al usuario, priorizando claridad y simplicidad. | Si bien la carga cognitiva podría ser abordada por usuarios con mayor adopción digital, al resto de usuarios podría afectarlos. |
| Diseño mobile-first | El sistema debe adoptar un enfoque de diseño mobile-first, optimizando tiempos de carga, legibilidad y navegación en pantallas pequeñas. | El canal de acceso más usado es el dispositivo móvil. |
| Refuerzo de confianza en procesos digitales | El sistema debe incorporar mensajes explicativos, confirmaciones visibles y retroalimentación clara para reforzar la confianza del usuario en procesos como pagos y firma electrónica. | En línea con las reglas heurísticas de Nielsen (usabilidad), se espera que estas características reduzcan la brecha de adopción. |
| Consistencia en la experiencia de interacción | El sistema debe mantener consistencia en iconografía, colores, tipografías y patrones de navegación para facilitar el aprendizaje y la recordación. | En línea con las reglas heurísticas de Nielsen (usabilidad), se espera que estas características reduzcan la brecha de adopción. |
| Tolerancia al error y recuperación sencilla | El sistema debe permitir que los usuarios se recuperen fácilmente de errores comunes (cancelación involuntaria, pasos incompletos, navegación incorrecta), sin pérdida de información crítica. | En línea con las reglas heurísticas de Nielsen (usabilidad), se espera que estas características reduzcan la brecha de adopción. |
| Accesibilidad básica | El sistema debe considerar principios básicos de accesibilidad, como tamaños de fuente adecuados, contraste suficiente y controles interactivos claramente identificables. | Los usuarios mayores suelen tener menor capacidad visual, por tanto el sistema no debe sumar a ese deterioro o aumentaría la brecha de adopción. |

#### Benchmark de plataformas similares
En este caso se busca entender qué han hecho las plataformas similares en el entorno colombiano desde el punto de vista de las funcionalidades que ofrecen, la cobertura del proceso de arrendamiento, estrategias para la inclusión digital, para sintetizar esta información en hallazgos/conclusiones que puedan eventualmente consolidarse como requerimientos del sistema.

| Plataforma | URL | Funcionalidades ofrecidas | Hallazgos asociados a la inclusión digital |
| ---| ---| ---| --- |
| [Arriendo.com](http://Arriendo.com) | [https://arriendo.com/co/](https://arriendo.com/co/)<br> | Usuario anónimo:<br>Búsqueda de inmuebles<br>Filtro y ordenamiento básico de inmuebles<br>Suscripción a notificaciones de inmuebles<br>Mosaico de inmuebles, cada uno con vista previa de las fotos y características principales<br>Detalle de cada inmueble con secciones que dividen temas concretos de interés<br>Formulario de datos de contacto para poder comunicarse con el arrendador<br>Sugerencias de propiedades similares<br>Análisis de mercado para comparar el precio del inmueble con sus similares<br>Registro de usuario para arrendadores<br>Usuario arrendador:<br>crear método de contacto preferido entre número de celular y WhatsApp<br>Panel para consulta de interesados<br>Publicar inmueble a través de 3 pasos: datos básicos, características, y fotos | Positivo:<br>Vista previa de fotos y datos principales de cada inmueble<br>Secciones para mostrar el detalle del inmueble<br>Iconos para reforzar/omitir palabras<br>Página web responsiva<br>Negativo:<br>No hay suficiente contraste de color entre el texto en primer plano y el color de fondo.<br>Algunas secciones podrían dividirse más en diferentes páginas para evitar sobre carga cognitiva o la sensación de no terminar en un scroll infinito.<br>Distintas formas de ingresar campos numéricos<br>Demasiadas opciones para agregar a la publicación de un inmueble |
| FincaRaíz | [https://www.fincaraiz.com.co](https://www.fincaraiz.com.co)<br> | Usuario anónimo:<br>Búsqueda de inmuebles<br>Filtro y ordenamiento avanzado de inmuebles<br>Mosaico de inmuebles, cada uno con vista previa de las fotos, características principales y "call to action" para contactar al arrendador<br>Detalle de cada inmueble con secciones que dividen temas concretos de interés<br>Formulario de datos de contacto para poder comunicarse con el arrendador<br>Registro de usuario para arrendadores<br>Usuario arrendador:<br>Panel para administrar publicaciones<br>Panel de estadísticas<br>Publicar inmueble a través en una sola página | Positivo:<br>Vista previa de fotos y datos principales de cada inmueble<br>"Call to action" para contactar al arrendador desde la vista previa.<br>Secciones para mostrar el detalle del inmueble<br>Iconos para reforzar/omitir palabras<br>Consistencia en los tipos de input para datos similares<br>Opciones para agregar detalle a la publicación de un inmueble, filtradas según el tipo de inmueble<br>Página web responsiva<br>Negativo:<br>No hay suficiente contraste de color entre el texto en primer plano y el color de fondo.<br>Algunas secciones podrían dividirse más en diferentes páginas para evitar sobre carga cognitiva o la sensación de no terminar en un scroll infinito |
| MercadoLibre<br>Inmuebles | [https://www.mercadolibre.com.co/c/inmuebles](https://www.mercadolibre.com.co/c/inmuebles)<br> | Usuario anónimo:<br>Búsqueda de inmuebles<br>Filtro y ordenamiento avanzado de inmuebles<br>Guardar búsqueda + filtro<br>Mosaico de inmuebles, cada uno con vista previa de las fotos, y características principales<br>Detalle de cada inmueble con secciones que dividen temas concretos de interés<br>Se requiere inicio de sesión para acceder a los datos de contacto del arrendador<br>Registro de usuario para arrendadores<br>Usuario arrendador:<br>Requiere de validación de identidad<br>Panel para administrar publicaciones<br>Panel de estadísticas<br>Publicar inmueble a través en una sola página | Positivo:<br>Vista previa de fotos y datos principales de cada inmueble<br>Secciones para mostrar el detalle del inmueble<br>Iconos para reforzar/omitir palabras<br>Consistencia en los tipos de input para datos similares<br>Opciones para agregar detalle a la publicación de un inmueble, filtradas según el tipo de inmueble<br>Secciones bien divididas pequeñas con baja carga cognitiva, gracias a que cada sección se va revelando cuando se termina de diligenciar la anterior y se hace scroll automático a la nueva sección<br>Se determina la ubicación (departamento, ciudad, y barrio) solicitando la dirección del inmueble<br>La validación de identidad enfoca automáticamente el marco de la cédula de la persona<br>Página web responsiva<br>Negativo:<br>No hay suficiente contraste de color entre el texto en primer plano y el color de fondo.<br>Todos los campos de características del inmueble se pueden ingresar sin un valor máximo, lo que podría ocasionar ingreso inadecuado de datos o complejidad cuando se quiera filtrar publicaciones |
| Aptuno | [https://www.aptuno.com](https://www.aptuno.com)<br> | Usuario anónimo:<br>Búsqueda de inmuebles<br>Filtro y ordenamiento avanzado de inmuebles<br>Mosaico de inmuebles, cada uno con vista previa de las fotos, características principales y "call to action" para solicitar una cita al arrendador<br>Detalle de cada inmueble con secciones que dividen temas concretos de interés<br>Sección que indica un aproximado al costo de vivienda en la zona, incluyendo costo de servicios públicos<br>Formulario de datos de contacto para poder agendar la cita con el arrendador<br>Para solicitar postularse como arrendatario debe iniciar sesión<br>Registro de usuario para arrendadores<br>Usuario arrendador:<br>Panel para administrar publicaciones<br>Panel de estadísticas<br>Publicar inmueble en guía paso a paso<br>Panel de consulta de pagos<br>Panel de contratos<br>Validación de postulantes con información crediticia, capacidad de ingreso y gestión de riesgo<br>Usuario arrendatario:<br>Panel de consulta de pagos<br>Panel de contratos<br> | Positivo:<br>Vista previa de fotos y datos principales de cada inmueble<br>Secciones para mostrar el detalle del inmueble<br>Posibilidad de agenda citas con el arrendador desde la página web<br>Iconos para reforzar/omitir palabras<br>Consistencia en los tipos de input para datos similares<br>Opciones para agregar detalle a la publicación de un inmueble, filtradas según el tipo de inmueble<br>Secciones bien divididas en páginas pequeñas con baja carga cognitiva<br>Creación de cuenta validando número de WhatsApp<br>Página web responsiva<br>Negativo:<br>No hay suficiente contraste de color entre el texto en primer plano y el color de fondo. |
| Houm | [https://houm.com/co](https://houm.com/co)<br> | Usuario anónimo:<br>Búsqueda de inmuebles<br>Filtro y ordenamiento avanzado de inmuebles<br>Mosaico de inmuebles, cada uno con vista previa de las fotos, y características principales<br>Detalle de cada inmueble con secciones que dividen temas concretos de interés<br>Formulario de datos de contacto para poder agendar la cita presenciales o virtuales con el arrendador<br>Mapa no solo con la ubicación del inmueble sino también con sitios de interés como supermercados cercanos<br>Simulador de precios aproximados de arriendo basado en características de la vivienda<br>Usuario arrendador:<br>Para crear un usuario arrendador/propietario se debe diligenciar un formulario para contactarse con el equipo comercial<br>Usuario arrendatario:<br>Panel para pago del arriendo | Positivo:<br>Vista previa de fotos y datos principales de cada inmueble<br>Secciones para mostrar el detalle del inmueble<br>Iconos para reforzar/omitir palabras<br>Consistencia en los tipos de input para datos similares<br>Opciones limitadas en los input<br>Página web responsiva<br>Negativo:<br>No hay suficiente contraste de color entre el texto en primer plano y el color de fondo.<br>No se puede hacer el proceso de publicar un inmueble solo creando un usuario en la plataforma<br> |
| Nurent | [https://www.nurent.co](https://www.nurent.co)<br> | Usuario anónimo:<br>Búsqueda de inmuebles<br>Filtro y ordenamiento avanzado de inmuebles<br>Mosaico de inmuebles, cada uno con vista previa de las fotos, y características principales<br>Detalle de cada inmueble con secciones que dividen temas concretos de interés<br>"Call to action" en los detalles del inmueble para iniciar el proceso de solicitar ser arrendatario<br>Formulario de datos de contacto para poder agendar la cita presenciales o virtuales con el arrendador<br>Panel para pagos de arriendo<br>Usuario arrendador:<br>Para crear un usuario arrendador/propietario se debe contactar a través de WhatsApp con el equipo comercial | Positivo:<br>Vista previa de fotos y datos principales de cada inmueble<br>Secciones para mostrar el detalle del inmueble<br>Iconos para reforzar/omitir palabras<br>Consistencia en los tipos de input para datos similares<br>Opciones limitadas en los input<br>Apalanca varios de sus procesos en WhatsApp<br>Página web responsiva<br>Negativo:<br>No hay suficiente contraste de color entre el texto en primer plano y el color de fondo.<br>No se puede hacer el proceso de publicar un inmueble solo creando un usuario en la plataforma |
| Alquilando | [https://alquilando.com](https://alquilando.com)<br> | Usuario anónimo:<br>Búsqueda de inmuebles<br>Filtro ordenamiento avanzado de inmuebles<br>Mosaico de inmuebles, cada uno con vista previa de las fotos, y características principales<br>Detalle de cada inmueble con secciones que dividen temas concretos de interés<br>Formulario de datos de contacto para poder agendar la cita presenciales o virtuales con el arrendador<br>Formulario de datos de contacto para contactarse con un asesor<br>Usuario arrendador:<br>Para crear un usuario arrendador/propietario se debe diligenciar un formulario de datos para contactarse con el equipo comercial<br>Usuario arrendatario:<br>Panel para pagos de arriendo | Positivo:<br>Vista previa de fotos y datos principales de cada inmueble<br>Secciones para mostrar el detalle del inmueble<br>Iconos para reforzar/omitir palabras<br>Consistencia en los tipos de input para datos similares<br>Opciones limitadas en los input<br>Página web responsiva<br>Negativo:<br>No hay suficiente contraste de color entre el texto en primer plano y el color de fondo.<br>No se puede hacer el proceso de publicar un inmueble solo creando un usuario en la plataforma |
| Uhomie | [https://uhomie.co](https://uhomie.co)<br> | Usuario anónimo:<br>Búsqueda de inmuebles<br>Filtro ordenamiento avanzado de inmuebles<br>Mosaico de inmuebles, cada uno con vista previa de las fotos, y características principales<br>Detalle de cada inmueble con secciones que dividen temas concretos de interés<br>Formulario de datos de contacto para poder agendar un tour virtual al inmueble<br>Sección que indica los requisitos para solicitar el arrendamiento<br>Sección que indica la cantidad de sitios de interés como supermercados de la zona<br>Usuario arrendador:<br>Para crear un usuario arrendador/propietario se debe diligenciar un formulario de datos para contactarse con el equipo comercial | Positivo:<br>Vista previa de fotos y datos principales de cada inmueble<br>Secciones para mostrar el detalle del inmueble<br>Iconos para reforzar/omitir palabras<br>Consistencia en los tipos de input para datos similares<br>Opciones limitadas en los input<br>Página web responsiva<br>Negativo:<br>No hay suficiente contraste de color entre el texto en primer plano y el color de fondo.<br>No se puede hacer el proceso de publicar un inmueble solo creando un usuario en la plataforma<br>Requiere cargar documentos de soporte para la solicitud<br> |
| Dora | [https://holadora.co](https://holadora.co)<br> | Para acceder a las funcionalidades se debe primero contactar con el equipo comercial a través de WhatsApp.<br>Sin embargo, desde el punto de vista funcional, permite:<br>pagar el arriendo<br>Gestionar contratos de arrendamiento con firma electrónica y validación de identidad de los firmantes<br>Estudio de riesgo sobre los postulantes a arrendatario | Positivo:<br>Apalanca el proceso en WhatsApp<br>Negativo:<br>No hay suficiente contraste de color entre el texto en primer plano y el color de fondo.<br>No se puede hacer nada sin contactarse con una persona a través de WhatsApp |
| MisPropiedades | [https://mispropiedades.co](https://mispropiedades.co)<br> | Usuario arrendador:<br>Panel para gestión de cuentas de cobro<br>Panel de reportes<br>Panel de pagos, gastos e impuestos<br>Panel para gestión de contratos<br>Panel para gestión de propiedades<br>Panel para incidentes reportados por los arrendatarios | Positivo:<br>Buen contraste entre el texto en primer plano y el color de fondo<br>Página web responsiva<br>Iconos para reforzar/omitir palabras |

De este modo, el análisis de plataformas similares permite identificar que a pesar de la amplia oferta de soluciones para la publicación y consulta de inmuebles, la mayoría de estas prioriza a usuarios con niveles medios o altos de alfabetización digital, ofreciendo interfaces densas en información, flujos poco guiados y escaso acompañamiento contextual. Sin embargo, se identifican prácticas relevantes desde el punto de vista de la experiencia de usuario que aportan a la inclusión digital, como lo son el uso de navegación visual basada en mosaicos, iconografía que refuerza o reemplaza texto, estructuras de interacción simplificadas para usuarios anónimos y diseños responsivos adaptados a distintos dispositivos. Asimismo, se observa una tendencia a fragmentar el proceso de arrendamiento, cubriendo principalmente la exposición de la oferta y delegando etapas críticas como la formalización contractual y la gestión de pagos a procesos externos o manuales.
Así, a partir de estos hallazgos se reafirma que existe una oportunidad clara para consolidar, en una única plataforma, funcionalidades básicas del ciclo de arriendo acompañadas de decisiones de diseño orientadas a reducir la carga cognitiva y facilitar la adopción por parte de usuarios con baja alfabetización digital, sin sacrificar la experiencia de usuarios más familiarizados con entornos digitales, lo que permite ir construyendo un insumo base de requerimientos tanto funcionales como no funcionales para etapas posteriores del proceso de consolidación de estos.

| Requerimiento | Descripción | Justificación |
| ---| ---| --- |
| Publicación y visualización básica de inmuebles | El sistema debe permitir a los arrendadores publicar inmuebles en arriendo y a los arrendatarios visualizar la oferta mediante un formato predominantemente visual (mosaico de inmuebles), mostrando información clave de manera resumida. | Uso generalizado de mosaicos con vista previa y datos principales como estrategia para reducir fricción inicial y facilitar exploración. |
| Búsqueda y filtrado simplificado de inmuebles | El sistema debe permitir la búsqueda y el filtrado básico de inmuebles mediante criterios esenciales (ubicación, precio, tipo de inmueble), evitando configuraciones complejas o excesivas. | Las plataformas analizadas priorizan filtros simples como punto de entrada, especialmente para usuarios no expertos. |
| Acceso a información detallada del inmueble | El sistema debe permitir acceder a una vista de detalle del inmueble que presente la información de forma estructurada, clara y progresiva. | Separar vista resumida y vista detallada reduce sobrecarga cognitiva en etapas tempranas de exploración. |
| Uso de iconografía como refuerzo informativo | El sistema debe incorporar iconos y elementos visuales que refuercen o sustituyan texto en la presentación de información relevante del inmueble. | Se identificó el uso de iconos como mecanismo recurrente para mejorar comprensión en usuarios con menor alfabetización digital. |
| Acceso a la oferta sin autenticación obligatoria | El sistema debe permitir a los usuarios explorar la oferta de inmuebles sin requerir registro o autenticación previa. | El acceso anónimo es una práctica común que reduce barreras de entrada y facilita la adopción inicial. |
| Diseño responsivo multiplataforma | El sistema debe permitir el acceso y uso funcional desde dispositivos móviles, tabletas y equipos de escritorio. | Las plataformas similares privilegian el acceso móvil como canal principal de interacción. |
| Gestión básica del proceso de arriendo | El sistema debe permitir al arrendador gestionar etapas básicas del proceso de arriendo (publicación, contrato y pagos), aun cuando dichas etapas se apoyen en servicios externos. | El benchmarking evidencia la fragmentación del proceso como una debilidad recurrente del ecosistema actual. |
| Usabilidad orientada a usuarios con baja alfabetización digital | El sistema debe priorizar interfaces simples, navegación clara y reducción de texto innecesario, orientadas a usuarios con experiencia digital limitada. | Hallazgos de inclusión digital en plataformas analizadas. |
| Baja carga cognitiva | El sistema debe evitar pantallas saturadas de información, priorizando la presentación progresiva de contenidos y decisiones. | Hallazgos de inclusión digital en plataformas analizadas. |
| Consistencia visual y de interacción | El sistema debe mantener consistencia en iconografía, colores y patrones de navegación para facilitar el aprendizaje y la recordación. | Hallazgos de inclusión digital en plataformas analizadas. |
| Accesibilidad básica | El sistema debe considerar principios básicos de accesibilidad (tamaños de fuente legibles, contraste adecuado, navegación simple), sin requerir certificación formal. | Hallazgos de inclusión digital en plataformas analizadas. |
| Dependencia controlada de servicios externos | El sistema debe integrar servicios externos (firma electrónica, pagos) de forma desacoplada, de modo que fallas externas no comprometan la estabilidad general del prototipo. | Hallazgos de inclusión digital en plataformas analizadas. |

## Entrevistas semiestructuradas
Private ([https://app.clickup.com/t/86aefdr6a](https://app.clickup.com/t/86aefdr6a))
### Objetivo de la actividad
Esta estrategia busca a través del conocimiento abordar a los usuarios potenciales de la aplicación y a partir de su conocimiento consciente y subconsciente Identificar necesidades, fricciones y expectativas reales de los usuarios, diferenciadas por grupo etario.
### Selección de participantes
Los participantes de las entrevistas deben aportar información valiosa para la obtención de requerimientos del sistema, por tanto, se espera que se tengan al menos 2 personas por cada grupo etario y que en los grupos de adultos haya al menos 2 arrendadores. Esta selección de la muestra busca profundizar cualitativamente en el proceso, sin embargo, se espera complementar con información cualitativa en una muestra mayor abordada en actividades posteriores.
### Diseño del instrumento
La entrevista se plantea como semiestructurada, con un conjunto de preguntas fijas orientadas a garantizar comparabilidad entre participantes, complementadas con profundizaciones flexibles según el grupo etario y el nivel de adopción digital del entrevistado. El objetivo es comprender el proceso actual de arriendo, las herramientas utilizadas, las dificultades percibidas y los factores que influyen en la confianza y aceptación de soluciones digitales.
De este modo, a un alto nivel el flujo de conversación que se quiere abordar es este:
**Fase 0 – Apertura y preparación (2–3 min)**
Objetivo: generar confianza y bajar ansiedad.
*   Presentación breve del entrevistador.
*   Propósito del estudio sin involucrar una solución concreta.
*   Aclarar que no hay respuestas correctas.
*   Permiso para tomar notas / grabar.
**Fase 1 – Contexto personal y rol (calentamiento)**
Objetivo: ubicar al entrevistado en el dominio sin hablar aún de tecnología.
*   ¿Quién es?
*   ¿Qué rol tiene en el proceso de arriendo de vivienda?
*   Nivel de experiencia en el proceso de arriendo de vivienda
**Fase 2 – Proceso actual de arriendo (pasado y presente)**
Objetivo: entender cómo lo hace hoy, no cómo "cree" que debería ser.
**Fase 3 – Uso de tecnología (real, no aspiracional)**
Objetivo: identificar qué usa realmente, no lo que "sabe que existe".
**Fase 4 – Dificultades, fricciones y emociones**
Objetivo: detectar puntos de dolor, miedos, dependencia de terceros.
**Fase 5 – Confianza y percepción de riesgo**
Objetivo: entender qué genera rechazo o tranquilidad en procesos digitales.
**Fase 6 – Expectativas y cierre**
Objetivo: recoger señales para requisitos, sin pedir diseño.
#### Parte "estructurada"
Para esto, la parte "fija" o estructurada de la entrevista, es decir, las preguntas que se espera que sí o sí se aborden son:
**Contexto personal y rol**
1. ¿Podrías contarme brevemente que papel tienes en el proceso de arriendo de vivienda? (arrendador/arrendatario/ambos)
2. ¿Desde hace cuánto tiempo estás involucrado en procesos de arriendo?
3. ¿Cuántos inmuebles arriendas actualmente?/¿En cuántas viviendas ha vivido en arriendo?
**Proceso actual de arriendo**
1. Cuéntame paso a paso cómo realizas hoy el proceso de arriendo, desde que decides arrendar hasta que el inmueble queda ocupado.
2. ¿Qué partes de ese proceso haces tú directamente y cuáles delegas en otras personas o empresas?
3. ¿Qué herramientas utilizas actualmente para apoyar ese proceso? (WhatsApp, llamadas, portales, documentos físicos, etc.)
**Uso de tecnología**
1. ¿Qué aplicaciones o herramientas digitales usas con mayor frecuencia en tu día a día?
2. Cuando necesitas hacer un trámite importante (pagos, documentos, contratos), prefieres hacerlo de forma digital o presencial? ¿Por qué?
3. ¿Desde qué dispositivo usas más Internet: celular, computador o ambos?
**Dificultades, fricciones y emociones**
1. ¿Qué parte del proceso de arriendo te resulta más complicada o incómoda?
2. ¿Has tenido alguna mala experiencia usando herramientas digitales en procesos similares?
3. Cuando tienes dificultades con tecnología, ¿cómo sueles resolverlas? (pides ayuda, evitas el proceso, buscas alternativas)
**Confianza y percepción de riesgo**
1. ¿Qué tan seguro/a te sientes usando plataformas digitales para temas como pagos o documentos?
2. ¿Qué es lo que más te genera desconfianza en estos procesos?
3. ¿Qué te haría sentir más tranquilo/a al usar una plataforma digital?
**Expectativas y cierre**
1. Si existiera una herramienta que te ayudara con el proceso de arriendo, ¿qué te gustaría que te facilitara principalmente?
2. ¿Hay algo que definitivamente no te gustaría que fuera digital en este proceso?
#### Parte "semi"
Para profundizar en temas potencialmente valiosos según las respuestas y el perfil del entrevistado se espera tener libertad en el flujo planteado anteriormente. Algunos temas de profundización son:
**Para usuarios jóvenes (alta adopción)**
*   Expectativas de velocidad
*   Comparación con otras plataformas
*   Tolerancia a fricciones
Preguntas como:
*   Mencionaste que usas muchas apps, ¿qué te molesta cuando una plataforma es lenta o confusa?
*   ¿En qué punto abandonarías una plataforma?
**Para adultos (adopción funcional)**
*   Confianza
*   Claridad del proceso
*   Punto de quiebre entre digital y humano
Por ejemplo:
*   ¿En qué momento preferirías hablar con una persona?
*   ¿Qué información necesitas tener clara antes de confiar?
**Para adultos mayores (baja adopción)**
*   Miedo, dependencia, comprensión
*   Barreras invisibles (lenguaje, símbolos, pasos)
Ejemplos:
*   ¿Qué es lo que más le cuesta entender cuando usa una aplicación?
*   ¿Qué le haría sentir que no se va a equivocar?
### Proceso de aplicación
Se espera que algunas entrevistas se lleven a cabo de forma presencial, sin embargo, debido a la ubicación geográfica del entrevistador y los entrevistados existe la posibilidad de realizar algunas virtuales, para las cuales en pro de generar confianza y promover un ambiente cercano se realizarían con cámara encendida. Por otro lado, desde el punto de vista del registro y consolidación de la información, para todas las entrevistas se llevaran notas, pero adicionalmente se consultara a los entrevistados si es posible grabar, en caso tal se usara este insumo para transcribir y consolidar datos clave. De igual modo, se consultara a los entrevistados si desea compartir su información para ser contactado nuevamente en etapas posteriores del proceso de diseño de la plataforma o si prefiere permanecer anónimo y no ser contactado en un futuro.
### Síntesis de hallazgos
Para consolidar la información obtenida y transformar las respuestas de los entrevistados en insights que eventualmente se puedan convertir en hipótesis de requerimientos funcionales y no funcionales, se plantea la siguiente plantilla de síntesis.
#### Plantilla

| Información general de la entrevista |
| --- |
| Código de entrevista | E-n |
| Fecha |  |
| Rol del entrevistado | Arrendador / Arrendatario |
| Grupo etario | Joven / Adulto / Adulto mayor |
| Experiencia en procesos de arriendo | Baja / Media / Alta |
| Modalidad | Presencial / Virtual |
| Duración aproximada |  |
| Resumen narrativo |
| Resumen: | Ejemplo: "El entrevistado es un arrendador con más de 10 años de experiencia en el arriendo de un único inmueble. Realiza la mayoría del proceso de forma presencial, apoyándose en llamadas telefónicas y WhatsApp. Manifiesta dificultad para comprender plataformas digitales complejas y desconfianza frente a pagos en línea, aunque reconoce beneficios en reducir desplazamientos." |
| Síntesis por ejes de análisis |
| Proceso actual de arriendo |
| Cómo lo hace hoy |  |
| Herramientas utilizadas |  |
| Uso de tecnología |
| Nivel percibido de adopción | Bajo / Medio / Alto |
| Dispositivos predominantes | Celular / Computador / Ambos |
| Aplicaciones mencionadas espontáneamente |  |
| Dificultades y fricciones |
| Fricciones explícitas |  |
| Fricciones implícitas (inferidas por el entrevistador) |  |
| Confianza y percepción de riesgo |
| Qué genera desconfianza |  |
| Qué genera tranquilidad |  |
| Canales preferidos cuando hay riesgo | Digital / Presencial / Telefónico |
| Expectativas y necesidades percibidas |
| Necesidades expresadas |  |
| Necesidades latentes (no dichas directamente) |  |
| Insights derivados (interpretación) |
| Insight 1 |  |
| Insight 2 |  |
| Insight n |  |

Después, usando esta síntesis como insumo, se interpreta la información y se lleva a partir de los insights a hipótesis de requerimientos como se muestra en el ejemplo a continuación:

| Insight | Tipo | Hipótesis de requerimiento |
| ---| ---| --- |
| Insight 1 | Funcional | El sistema debería mostrar el estado del proceso de arriendo de forma clara y visible |
| Insight 2 | No funcional | El sistema debería reducir la carga cognitiva en flujos críticos |

#### Desarrollo

| Información general de la entrevista |
| --- |
| Código de entrevista | E-01 |
| Fecha | 31/01/2026 |
| Rol del entrevistado | Arrendatario |
| Grupo etario | Joven (27 años) |
| Experiencia en procesos de arriendo | Alta |
| Modalidad | Presencial |
| Duración aproximada | 30 minutos |
| Resumen narrativo |
| Resumen | El entrevistado es un arrendatario con más de 4 años de experiencia en el arriendo de 5 inmuebles, 4 de ellos en la ciudad de Cali y uno en Medellín. Ha realizado procesos de arriendo en su mayoría híbridos, apoyándose en páginas web, llamadas telefónicas y WhatsApp. Manifiesta comodidad y tranquilidad frente a los procesos digitales, sin embargo nunca dejaría de visitar la vivienda de forma presencial. |
| Síntesis por ejes de análisis |
| Proceso actual de arriendo |
| Cómo lo hace hoy | Para la etapa de búsqueda utiliza su computador porque le brinda facilidad de uso y una percepción de mayor velocidad, en este punto, aplica filtros avanzados para encontrar inmuebles publicados recientemente en la zona de interés y con las características que desea. Luego, para entra al detalle de cada uno de los inmuebles que le interesan, revisa el mapa para conocer su ubicación e identificar por su propia cuenta los sitios de interés a su alrededor. Después, nuevamente por su propia cuenta realiza una lista de las viviendas de preliminares y se pone en contacto con sus arrendadores, tomando notas con datos relevantes de cada una, y en caso de querer profundizar programa una cita presencial para conocer en persona el inmueble. Posteriormente, para la toma del inmueble manifiesta que debe entregar documentos de soporte sea en persona o vía WhatsApp, y en caso de ser elegido, firmar el contrato la mayoría de veces de forma presencial. Por último, ya habiendo tomado posesión de la vivienda, indica que suele realizar los pagos electrónicamente. |
| Herramientas utilizadas | Portales de búsqueda, llamadas y WhatsApp. Transferencias bancarias |
| Uso de tecnología |
| Nivel percibido de adopción | Alto |
| Dispositivos predominantes | Ambos |
| Aplicaciones mencionadas espontáneamente | Fincaraíz, Metrocuadrado, Facebook Marketplace, WhatsApp, PSE |
| Dificultades y fricciones |
| Fricciones explícitas | Desde el dispositivo móvil no es sencillo interactuar con el mapa.<br>Algunas plataformas no permiten filtrar por publicaciones recientes o aún disponibles. |
| Fricciones implícitas (inferidas por el entrevistador) | Si el arrendador no le recuerda, a veces olvida la fecha de pago del canon de arrendamiento, lo que lo arriesga a entrar en mora |
| Confianza y percepción de riesgo |
| Qué genera desconfianza | Debido a su madurez en el proceso digital, no hay algo que le genere desconfianza particularmente |
| Qué genera tranquilidad | Contactarse con el arrendador y poder visitar en persona el inmueble |
| Canales preferidos cuando hay riesgo | Presencial |
| Expectativas y necesidades percibidas |
| Necesidades expresadas | Poder gestionar listas de inmuebles que le interesan y con lo que se ha contactado. |
| Necesidades latentes (no dichas directamente) | Saber que sitios de interés hay al rededor del inmueble |
| Insights derivados (interpretación) |
| Insight 1 | El entrevistado manifiesta que es importante para el poder visualizar la fecha de publicación de un inmueble. |
| Insight 2 | El entrevistado indica que le gusta poder filtrar las publicaciones por fecha de publicación. |
| Insight 3 | El entrevistado expresa que para él es muy relevante poder filtrar las publicaciones por zona/barrio de los inmuebles |
| Insight 4 | El entrevistado considera clave en su proceso de búsqueda de vivienda poder ver en el mapa su ubicación exacta |
| Insight 5 | El entrevistado manifiesta que le gusta poder interactuar con el mapa para identificar qué sitios de interés como supermercados, hay alrededor del inmueble |
| Insight 6 | El entrevistado indica que le gustaría poder crear listas en la plataforma con las viviendas que para él son de interés, agregar notas a cada una y eliminar las descartadas. |

| Insight | Tipo | Hipótesis de requerimiento |
| ---| ---| --- |
| Insight 1 | Funcional | El sistema debería mostrar la fecha de publicación de los inmuebles |
| Insight 2 | Funcional | El sistema debería permitir filtrar las publicaciones por fecha de publicación |
| Insight 3 | Funcional | El sistema debería permitir filtrar las publicaciones por zona/barrio de los inmuebles |
| Insight 4 | Funcional | El sistema debería permitir visualizar en el mapa la ubicación del inmueble |
| Insight 5 | Funcional | El sistema debería permitir al usuario interactuar con el mapa para identificar sitios de interés alrededor del inmueble |
| Insight 6 | Funcional | El sistema debería permitir al usuario gestionar listas de inmuebles de interés |

| Información general de la entrevista |
| --- |
| Código de entrevista | E-02 |
| Fecha | 02/02/2026 |
| Rol del entrevistado | Arrendador y Arrendatario |
| Grupo etario | Joven (30 años) |
| Experiencia en procesos de arriendo | Media |
| Modalidad | Virtual |
| Duración aproximada | 30 minutos |
| Resumen narrativo |
| Resumen | El entrevistado en el último año ha experimentado el proceso de arrendamiento de vivienda tanto en el rol de arrendador en la ciudad de Yumbo como el de arrendatario en la Cali. Ha realizado procesos de arriendo en su mayoría híbridos, apoyándose en Facebook Marketplace, llamadas telefónicas y WhatsApp. En el proceso de firma de contratos los ha abordado tanto presencial como digital, mientras que el proceso de pago siempre de forma digital. Manifiesta comodidad y tranquilidad frente a los procesos digitales, sin embargo nunca dejaría de visitar la vivienda de forma presencial. |
| Síntesis por ejes de análisis |
| Proceso actual de arriendo |
| Cómo lo hace hoy | En general para el proceso de arrendamiento prefiere hacer uso de su celular. En la etapa de búsqueda utiliza como herramienta principal Facebook Marketplace porque le permite un contacto directo con los interesados, en este punto, aplica filtros avanzados para encontrar inmuebles publicados en la zona de interés, aunque indica que le gusta ir al barrio a ver si hay viviendas disponibles con aviso. En el proceso digital, entra al detalle de cada uno de los inmuebles que le interesan, revisa las fotos y si le gustan se pone en contacto con el vendedor. Después, en caso de querer profundizar programa una cita presencial para conocer en persona el inmueble. Posteriormente, para la toma del inmueble manifiesta que debe entregar documentos vía WhatsApp, y en caso de ser elegido, firmar el contrato algunas veces de forma presencial y otras digital. Por último, ya habiendo tomado posesión de la vivienda, indica que suele realizar los pagos electrónicamente. |
| Herramientas utilizadas | Facebook Marketplace, llamadas, WhatsApp, transferencias bancarias y firma digital |
| Uso de tecnología |
| Nivel percibido de adopción | Alto |
| Dispositivos predominantes | Celular |
| Aplicaciones mencionadas espontáneamente | Facebook Marketplace, WhatsApp, Bre-B |
| Dificultades y fricciones |
| Fricciones explícitas | Algunas plataformas no garantizan que el inmueble o el vendedor sean legítimos. |
| Fricciones implícitas (inferidas por el entrevistador) | Determinar si el tomador de la vivienda es adecuado |
| Confianza y percepción de riesgo |
| Qué genera desconfianza | Debido a su madurez en el proceso digital, no hay algo que le genere desconfianza particularmente |
| Qué genera tranquilidad | Contactarse con el arrendador y poder visitar en persona el inmueble |
| Canales preferidos cuando hay riesgo | Digital |
| Expectativas y necesidades percibidas |
| Necesidades expresadas | Poder ver en el mapa la ubicación del inmueble.<br>Poder gestionar reclamaciones sobre el estado de la vivienda una vez ya se tiene en poder del arrendatario. |
| Necesidades latentes (no dichas directamente) | Le gustaría una mejor gestión del riesgo para determinar la viabilidad de los postulados a arrendatarios |
| Insights derivados (interpretación) |
| Insight 1 | El entrevistado manifiesta que es importante poder filtrar los inmuebles por zona/barrio. |
| Insight 2 | El entrevistado indica que le interesa que las publicaciones de inmueble tengan la mayor cantidad de fotos posibles. |
| Insight 3 | El entrevistado expresa que le gustaría tener un mapa en el detalle de los inmuebles para determinar su ubicación exacta |
| Insight 4 | El entrevistado considera que sería bueno que se hiciera un estudio de riesgo sobre los interesados a tomar la vivienda para filtrar anticipadamente aquellos no viables. |

| Insight | Tipo | Hipótesis de requerimiento |
| ---| ---| --- |
| Insight 1 | Funcional | El sistema debería permitir filtrar las publicaciones por zona/barrio de los inmuebles |
| Insight 2 | Funcional | El sistema no debería permitir publicaciones sin fotos |
| Insight 3 | Funcional | El sistema debería permitir visualizar en el mapa la ubicación del inmueble |
| Insight 4 | Funcional | El sistema debería realizar un análisis de riesgo para filtrar postulantes a arrendatario |

| Información general de la entrevista |
| --- |
| Código de entrevista | E-03 |
| Fecha | 02/02/2026 |
| Rol del entrevistado | Arrendador |
| Grupo etario | Joven (27 años) |
| Experiencia en procesos de arriendo | Alta |
| Modalidad | Virtual |
| Duración aproximada | 50 minutos |
| Resumen narrativo |
| Resumen | El entrevistado lleva los últimos 5 años experimentando el proceso de arrendamiento de vivienda asumiendo el rol de arrendador en la ciudad de Cali. Ha realizado procesos de arriendo en su mayoría presenciales. Manifiesta comodidad y tranquilidad frente a los procesos digitales, e incluso indica posibles mejoras pero no es la realidad de su proceso de gestión. |
| Síntesis por ejes de análisis |
| Proceso actual de arriendo |
| Cómo lo hace hoy | En general para el proceso de arrendamiento prefiere hacer uso de su celular. Para publicar la vivienda coloca un letrero con teléfono de contacto en la fachada de esta, se apoya con abogados para la elaboración de contratos y a pesar de que los envía vía WhatsApp, requiere que se lo entreguen firmado y autenticado, y para el pago del canon de arrendamiento recibe tanto físico como a través de transferencias. |
| Herramientas utilizadas | WhatsApp y transferencias bancarias |
| Uso de tecnología |
| Nivel percibido de adopción | Alto |
| Dispositivos predominantes | Celular |
| Aplicaciones mencionadas espontáneamente | WhatsApp, PSE |
| Dificultades y fricciones |
| Fricciones explícitas | Escoger adecuadamente a los arrendatarios y finalizar los contratos. |
| Fricciones implícitas (inferidas por el entrevistador) | Determinar si el tomador de la vivienda es adecuado. |
| Confianza y percepción de riesgo |
| Qué genera desconfianza | Debido a que trabaja en tecnología, no hay algo digital que le genere desconfianza particularmente. |
| Qué genera tranquilidad | Contactarse con los que se postulan a arrendatario. |
| Canales preferidos cuando hay riesgo | Presencial |
| Expectativas y necesidades percibidas |
| Necesidades expresadas | Le gustaría que a los postulados a arrendatarios se les hiciera un filtrado previo considerando un perfilamiento psicológico y capacidad de pago. |
| Necesidades latentes (no dichas directamente) | Le gustaría una mejor gestión del riesgo para determinar la viabilidad de los postulados a arrendatarios. |
| Insights derivados (interpretación) |
| Insight 1 | El entrevistado manifiesta que para él es importante poder acceder tanto desde dispositivo celular como de computador. |
| Insight 2 | El entrevistado indica que le gusta cuando las páginas son interactiva y se sienten livianas. |
| Insight 3 | El entrevistado expresa que le gustaría que se pudiera hacer un estudio de riesgo para filtrar posibles candidatos a arrendatarios. |
| Insight 4 | El entrevistado considera que sería bueno que desde la misma plataforma se pudieran gestionar los pagos. |
| Insight 5 | El entrevistado manifiesta que le gustaría desde la plataforma ver los comprobantes de pago de sus arrendatarios. |
| Insight 6 | El entrevistado indica que le gustaría poder desde la plataforma consultar los contratos que tiene con los arrendatarios. |

| Insight | Tipo | Hipótesis de requerimiento |
| ---| ---| --- |
| Insight 1 | No funcional | El sistema debería ser multiplataforma o con una vista responsiva para funcionar tanto en dispositivo celular como computador. |
| Insight 2 | No funcional | El sistema debería tener una carga cognitiva pequeña para que la interacción por parte del usuario sea simple. |
| Insight 3 | Funcional | El sistema debería solicitar información cualitativa y cuantitativa al arrendatario y filtrar a los viables considerando esto. |
| Insight 4 | Funcional | El sistema debería permitir a arrendatarios pagar el canon del arrendamiento desde la plataforma. |
| Insight 5 | Funcional | El sistema debería permitir al arrendador consultar el historial y comprobantes de pago del arriendo. |
| Insight 6 | Funcional | El sistema debería permitir tanto a arrendador como a arrendatarios consultar los contratos que tienen. |

| Información general de la entrevista |
| --- |
| Código de entrevista | E-04 |
| Fecha | 03/02/2026 |
| Rol del entrevistado | Arrendador |
| Grupo etario | Adulto (55 años) |
| Experiencia en procesos de arriendo | Alta |
| Modalidad | Presencial |
| Duración aproximada | 45 minutos |
| Resumen narrativo |
| Resumen | El entrevistado lleva 20 años como arrendador de más de 15 viviendas en la ciudad de Cali. Debido a su basta experiencia ha realizado procesos de arriendo tanto presenciales como híbridos. El proceso que siempre maneja presencial es el primer contacto con los interesados, y la gestión del contrato. Manifiesta que nunca ha tenido malas experiencias con los pagos digitales y eso le hace sentir comodidad y tranquilidad frente a ellos a pesar de también recibir el dinero en efectivo. |
| Síntesis por ejes de análisis |
| Proceso actual de arriendo |
| Cómo lo hace hoy | En general para el proceso de arrendamiento prefiere hacer uso de su celular por familiaridad con el dispositivo en su día a día, mientras que indica percibir mayor dificultad para el uso de computador. Para publicar la vivienda tiene preferencia por el canal que mayor exposición tenga, sin embargo, también considera un factor importante el costo asociado, por tal motivo elige Facebook Marketplace que le permite exposición a costo cero en publicaciones básicas. Para evaluar a los interesados siempre concreta una cita en persona que le permita hacer un filtro inicial basado en las sensaciones que surgen y después solicita documentos a través de WhatsApp, correo electrónico o en persona dependiendo de la preferencia del interesado, y procede a revisar su autenticidad buscando la empresa en internet y tratando de contactarse para confirmar datos o a través de los extractos bancarios. Luego, para la elaboración de lo contratos se apoya con abogados y a pesar de que los envía vía WhatsApp, requiere que se lo entreguen firmado y autenticado. Por último, para el pago del canon de arrendamiento recibe tanto físico como a través de transferencias. |
| Herramientas utilizadas | Facebook Marketplace, portales de búsqueda, WhatsApp y transferencias bancarias |
| Uso de tecnología |
| Nivel percibido de adopción | Medio |
| Dispositivos predominantes | Celular |
| Aplicaciones mencionadas espontáneamente | Facebook Marketplace, WhatsApp, PSE, Bancolombia, Fincaraiz, metrocuadrado |
| Dificultades y fricciones |
| Fricciones explícitas | Plataformas que lo obliguen a hacer uso del computador para algunas funcionalidades. |
| Fricciones implícitas (inferidas por el entrevistador) | Hacer cumplir el contrato o tener un seguro para imprevistos de los inquilinos que no les permitan cumplir sus obligaciones |
| Confianza y percepción de riesgo |
| Qué genera desconfianza | La validez de los contratos firmados digitalmente. |
| Qué genera tranquilidad | Contactarse con los que se postulan a arrendatario. |
| Canales preferidos cuando hay riesgo | Presencial |
| Expectativas y necesidades percibidas |
| Necesidades expresadas | Le gustaría aumentar la visibilidad o exposición a la oferta de sus inmuebles disponibles. |
| Necesidades latentes (no dichas directamente) | Le gustaría poder llevar las cuentas de los pagos que le realizan más fácilmente. |
| Insights derivados (interpretación) |
| Insight 1 | El entrevistado manifiesta que se deberían ofrecer las mismas funcionalidades tanto desde celular como de computador, privilegiando el celular. |
| Insight 2 | El entrevistado indica que cuando usa una página le gustaría que se le brinde ayuda para lograr el funcionamiento esperado o indicar claramente los errores. |
| Insight 3 | El entrevistado expresa que le gustaría que la publicación básica (sin destacados o configuraciones de mayor visibilidad) fuera gratuita. |
| Insight 4 | El entrevistado considera que sería bueno que se hicieran notificaciones periódicas a los arrendadores para garantizar un contacto oportuno con los interesados. |
| Insight 5 | El entrevistado manifiesta que le gustaría desde la plataforma ver reportes de los pagos para la contabilidad que realiza. |

| Insight | Tipo | Hipótesis de requerimiento |
| ---| ---| --- |
| Insight 1 | No funcional | El sistema debería ser multiplataforma o con una vista responsiva para funcionar tanto en dispositivo celular como computador. |
| Insight 2 | Funcional + No funcional | El sistema debería permitir guiar al usuario en casos de uso fortuitos y errores de la plataforma. |
| Insight 3 | No funcional | El sistema debería permitir publicación básica de inmuebles en su capa gratuita |
| Insight 4 | Funcional | El sistema debería notificar periódicamente al arrendador sobre interesados que buscan contactarse con él, para evitar contactos inoportunos y mejorar la eficiencia en el contacto. |
| Insight 5 | Funcional | El sistema debería permitir generar reportes contables básicos sobre sus viviendas al arrendador. |

| Información general de la entrevista |
| --- |
| Código de entrevista | E-05 |
| Fecha | 03/03/2026 |
| Rol del entrevistado | Arrendador |
| Grupo etario | Adulto Mayor (60 años) |
| Experiencia en procesos de arriendo | Alta |
| Modalidad | Virtual |
| Duración aproximada | 20 minutos |
| Resumen narrativo |
| Resumen | El entrevistado lleva 10 años como arrendador de más de 15 apartamentos en la ciudad de Cali. Durante su experiencia siempre ha realizado procesos mayoritariamente presenciales. Del proceso las únicas etapas que maneja digital es la recepción de los documentos y pagos. Manifiesta que confía en los pagos digitales pero siempre verifica que el dinero le llegué a la cuenta, y no se cierra a también recibir el dinero en efectivo. |
| Síntesis por ejes de análisis |
| Proceso actual de arriendo |
| Cómo lo hace hoy | En su día a día manifiesta utilizar principalmente su dispositivo celular pero para el proceso de arrendamiento prefiere el canal presencial. Para dar a conocer la disponibilidad de la vivienda pone un cartel con la fachada de esta con su información de contacto. En la medida de lo posible para evaluar anticipadamente les solicita documentos por WhatsApp, y después concreta una cita en persona para filtrar también basado en las sensaciones que surgen y procede a revisar su tratando de contactarse con los empleadores para confirmar datos o a través de los extractos bancarios. Luego, para la elaboración de lo contratos se apoya con abogados y a pesar de que los envía vía WhatsApp, requiere que se lo entreguen firmado y autenticado. Por último, para el pago del canon de arrendamiento recibe tanto físico como a través de transferencias. |
| Herramientas utilizadas | WhatsApp y transferencias bancarias |
| Uso de tecnología |
| Nivel percibido de adopción | Bajo |
| Dispositivos predominantes | Celular |
| Aplicaciones mencionadas espontáneamente | WhatsApp |
| Dificultades y fricciones |
| Fricciones explícitas | Verificar que el dinero si ingrese a su cuenta cuando el pago es por transferencia |
| Fricciones implícitas (inferidas por el entrevistador) | Hacer cumplir el contrato o tener un seguro para imprevistos de los inquilinos que no les permitan cumplir sus obligaciones |
| Confianza y percepción de riesgo |
| Qué genera desconfianza | La validez de los contratos firmados digitalmente. |
| Qué genera tranquilidad | Contactarse con los que se postulan a arrendatario. |
| Canales preferidos cuando hay riesgo | Presencial |
| Expectativas y necesidades percibidas |
| Necesidades expresadas | Le gustaría poder conocer los antecedentes o realizar un estudio previo de los postulantes a arrendatario |
| Necesidades latentes (no dichas directamente) | Le gustaría poder contactarse más eficientemente con los interesados porque algunas veces la cantidad de llamadas se volvía excesiva. |
| Insights derivados (interpretación) |
| Insight 1 | El entrevistado manifiesta que le gustaría tener una herramienta para verificar antecedentes o el riesgo/viabilidad de los que se postulan a arrendatarios. |
| Insight 2 | El entrevistado indica que le gusta cuando las plataformas digitales son claras y explican lo que está sucediendo. |
| Insight 3 | El entrevistado expresa que le preocupa la validez de los contratos firmados en el canal digital. |
| Insight 4 | El entrevistado considera que sería bueno que se priorizara el canal de WhatsApp para la comunicación entre arrendador e interesados a arrendatarios. |

| Insight | Tipo | Hipótesis de requerimiento |
| ---| ---| --- |
| Insight 1 | No funcional | El sistema debería permitir determinar la viabilidad de los interesados en la vivienda para descartar anticipadamente a quienes no sean aptos. |
| Insight 2 | No funcional | El sistema debería ser explicativo, de modo tal que el usuario sepa exactamente qué está haciendo y por qué. |
| Insight 3 | Funcional + No funcional | El sistema debería explicar al usuario la validez legal de los contratos con firmas digitales o electrónicas. |
| Insight 4 | Funcional | El sistema debería priorizar el canal de WhatsApp para poder gestionar el contacto entre arrendador e interesados para permitir un mejor manejo del tiempo comparado con llamadas directas. |

| Información general de la entrevista |
| --- |
| Código de entrevista | E-06 |
| Fecha | 03/03/2026 |
| Rol del entrevistado | Arrendatario |
| Grupo etario | Joven (25 años) |
| Experiencia en procesos de arriendo | Media |
| Modalidad | Presencial |
| Duración aproximada | 25 minutos |
| Resumen narrativo |
| Resumen | La entrevistada lleva 2 años como arrendataria de tres inmuebles entre ellos apartaestudios y apartamentos tanto en la ciudad de Cali como en Pasto. Durante su experiencia siempre ha realizado procesos híbridos. Del proceso las únicas etapas que maneja presencial son conocer la vivienda y autenticar el contrato. Manifiesta que confía en los prefiere los procesos digitales por la facilidad que le brindan. |
| Síntesis por ejes de análisis |
| Proceso actual de arriendo |
| Cómo lo hace hoy | En su día a día manifiesta utilizar principalmente su dispositivo celular pero por su trabajo también usa frecuentemente el computador. Para la búsqueda de vivienda utiliza páginas que encuentra en internet y lo primero que hace es aplicar filtros según la zona en la que quiere vivir, las características básicas de la vivienda y el presupuesto que ella dispone, luego se pone en contacto con los arrendadores para verificar o complementar la información de la publicación y posteriormente concreta una cita para conocer la vivienda en persona. Una vez confirmado el interés por el inmueble normalmente debe enviar los documentos para la solicitud por WhatsApp, y en caso de ser aceptada, por ese mismo medio le envían el contrato, el cual debe revisar con su abogado, firmar, autenticar y entregar en persona a los arrendadores. Por último, para el pago del canon de arrendamiento siempre lo ha hecho a través de transferencias. |
| Herramientas utilizadas | WhatsApp, portales de búsqueda y transferencias bancarias |
| Uso de tecnología |
| Nivel percibido de adopción | Alto |
| Dispositivos predominantes | Celular |
| Aplicaciones mencionadas espontáneamente | WhatsApp, Facebook Marketplace y FincaRaíz |
| Dificultades y fricciones |
| Fricciones explícitas | Cuando una página no aplica correctamente un filtro o de entrada no dispone de filtros.<br>Cuando una publicación no tiene suficiente detalle o no tiene fotos.<br>Algunas páginas le dificultan su interacción por los colores que usan. |
| Fricciones implícitas (inferidas por el entrevistador) | Tener que autenticar documentos físicos en notaria porque la notaria funciona en el mismo horario en el que ella labora. |
| Confianza y percepción de riesgo |
| Qué genera desconfianza | Por su experiencia en procesos digitales, no hay nada que particularmente le genere desconfianza. |
| Qué genera tranquilidad | Conocer el inmueble en persona. |
| Canales preferidos cuando hay riesgo | Digital |
| Expectativas y necesidades percibidas |
| Necesidades expresadas | Le gustaría que se le resumieran los puntos clave del contrato para identificar posibles inconformidades antes de leerlo completamente de forma detallada. |
| Necesidades latentes (no dichas directamente) | Le gustaría que la plataforma se sintiera sencilla de utilizar y fuera explicita en lo que se debería hacer. |
| Insights derivados (interpretación) |
| Insight 1 | La entrevistada manifiesta que le gustaría poder filtrar las publicaciones principalmente por las características básicas de la vivienda, la zona en la que se encuentra ubicada y su presupuesto. |
| Insight 2 | La entrevistada indica que le gusta cuando un inmueble tiene fotos porque le permite identificar más fácilmente un interés inicial. |
| Insight 3 | La entrevistada expresa que se le dificulta cuando las páginas no consideran una paleta de colores amigable para personas con dificultades visuales. |
| Insight 4 | La entrevistada considera que sería bueno no tener que sacar tiempo de otros compromisos o de su trabajo para poder tener que ir a un sitio a firmar y autenticar el contrato |
| Insight 5 | La entrevistada manifiesta que le gustaría poder ver un resumen de los puntos claves del contrato antes de leerlo a detalle |
| Insight 6 | La entrevistada indica que le gusta cuando una plataforma digital se siente sencilla de utilizar y es explicita para guiar al usuario. |

| Insight | Tipo | Hipótesis de requerimiento |
| ---| ---| --- |
| Insight 1 | Funcional | El sistema debería permitir filtrar las publicaciones principalmente por las características básicas de la vivienda como número de habitaciones y baños, la zona en la que se encuentra ubicada y su costo. |
| Insight 2 | Funcional | El sistema debería evitar que se publiquen inmuebles sin fotos. |
| Insight 3 | No funcional | El sistema debería utilizar una paleta de colores amigable para personas con dificultades visuales. |
| Insight 4 | Funcional | El sistema debería permitir la firma de los contratos con validez jurídica. |
| Insight 5 | Funcional | El sistema debería mostrar un resumen de los puntos claves del contrato. (IA) |
| Insight 6 | No funcional | El sistema debería tener una carga cognitiva baja y proveer una guía al usuario constante para dar la sensación de ser sencillo de utilizar. |

#### Conclusión y requerimientos
El proceso permitió entender las principales fricciones, expectativas y condicionantes asociados al uso de plataformas digitales, e identificar a partir de estos, patrones consistentes y transversales en la forma en que arrendadores y arrendatarios de distintos grupos etarios enfrentan el proceso de arriendo de vivienda.
De este modo, la síntesis de estas entrevistas evidencian que, independientemente del nivel de adopción tecnológica, los usuarios tienden a mantener etapas presenciales en el proceso, especialmente en el primer contacto con la contraparte durante la visita al inmueble y, en algunos casos, la firma contractual, mientras, valoran positivamente la digitalización de etapas como la búsqueda, la comunicación y los pagos.
Asimismo, se identificó una alta sensibilidad frente a la claridad del proceso, la legitimidad de la información publicada, la validez legal de los contratos digitales y la gestión del riesgo asociado a la selección de arrendatarios. En los adultos y adultos mayores, estas preocupaciones se acentúan, manifestándose en una preferencia por interfaces simples, explicativas y con bajo nivel de carga cognitiva.
Al tomar los diferentes insights obtenidos y simplificando según los patrones identificados, se logra consolidar un conjunto de hipótesis de requerimientos funcionales y no funcionales que orientan el diseño del sistema hacia una experiencia flexible, mobile-first, centrada en la confianza, la transparencia y la inclusión digital:

| Requerimiento | Descripción | Justificación |
| ---| ---| --- |
| Visualización de fecha de publicación | El sistema debería mostrar de forma visible la fecha de publicación de los inmuebles. | Usuarios jóvenes priorizan publicaciones recientes para evitar inmuebles no disponibles. |
| Filtros por zona/barrio | El sistema debería permitir filtrar inmuebles por zona o barrio. | Requerimiento recurrente en arrendatarios y arrendadores para acotar búsquedas relevantes. |
| Filtros por características básicas | El sistema debería permitir filtrar inmuebles por precio, número de habitaciones y baños. | Facilita búsquedas eficientes y reduce fricción inicial en usuarios digitales. |
| Visualización de ubicación en mapa | El sistema debería permitir visualizar la ubicación exacta del inmueble en un mapa. | Permite evaluar contexto urbano y cercanía a sitios de interés. |
| Interacción con el mapa | El sistema debería permitir interactuar con el mapa para identificar sitios de interés cercanos. | Necesidad latente en arrendatarios jóvenes para toma de decisiones informada. |
| Publicaciones con fotos obligatorias | El sistema no debería permitir publicar inmuebles sin fotografías. | La ausencia de fotos genera desconfianza y desinterés inicial. |
| Gestión de listas de inmuebles | El sistema debería permitir crear y gestionar listas de inmuebles de interés con notas. | Apoya procesos de comparación y decisión en búsquedas activas. |
| Acceso multiplataforma | El sistema debería ser responsivo y funcional tanto en celular como en computador, priorizando móvil. | Uso predominante de celular, pero con necesidad ocasional de escritorio. |
| Baja carga cognitiva | El sistema debería minimizar la complejidad visual y cognitiva en la interacción. | Especialmente crítico para adultos y adultos mayores. |
| Guía y mensajes explicativos | El sistema debería guiar al usuario y explicar claramente errores y estados del proceso. | Aumenta confianza y reduce abandono en usuarios con adopción media o baja. |
| Firma digital con validez jurídica | El sistema debería permitir la firma digital de contratos con validez legal. | Reduce fricción asociada a trámites presenciales y notariales. |
| Explicación de validez legal | El sistema debería explicar al usuario la validez jurídica de la firma digital. | Persisten dudas legales, especialmente en adultos y adultos mayores. |
| Resumen de puntos clave del contrato | El sistema debería mostrar un resumen de los puntos clave del contrato antes de su lectura completa. | Facilita comprensión y detección temprana de inconformidades. |
| Gestión de pagos desde la plataforma | El sistema debería permitir realizar pagos del canon de arrendamiento desde la plataforma. | Los pagos digitales ya son aceptados y valorados por la mayoría de usuarios. |
| Historial y comprobantes de pago | El sistema debería permitir consultar historial y comprobantes de pago. | Necesidad contable y de verificación para arrendadores. |
| Reportes contables básicos | El sistema debería generar reportes simples de ingresos por arriendo. | Apoya la gestión financiera de arrendadores con múltiples inmuebles. |
| Notificaciones de interesados | El sistema debería notificar oportunamente al arrendador sobre interesados. | Evita pérdida de contactos y mejora eficiencia del proceso. |
| Priorización de WhatsApp | El sistema debería priorizar WhatsApp como canal de contacto. | Canal dominante y familiar, especialmente en adultos mayores. |
| Evaluación de riesgo de arrendatarios | El sistema debería permitir evaluar la viabilidad o riesgo de los postulantes. | Preocupación transversal en arrendadores sobre selección adecuada. |
| Claridad visual y accesibilidad | El sistema debería usar colores y contrastes amigables para personas con dificultades visuales. | Identificado como barrera en algunas plataformas actuales. |

## Cuestionarios rápidos y sintesis
Private ([https://app.clickup.com/t/86aefdrfy](https://app.clickup.com/t/86aefdrfy))
### Objetivo de la actividad
Validar y reforzar los hallazgos de las entrevistas mediante datos estructurados y comparables que se puedan llevar al mundo cuantitativo para obtener estadísticas.
### Diseño del instrumento
Para lograr efectivamente traducir estos datos en información estadística cuantificables se debe hacer uso de preguntas cerradas, y para obtener información valiosa más allá de un "sí/no" se plantea la construcción de estas preguntas utilizando opción múltiple cerrada y la escala de Likert.
#### Plantilla
En general el instrumento se divide en las siguientes secciones que segmentan el cuestionario según temática alienado con los hallazgos de secciones anteriores:
*   Perfil y clasificación del encuestado
*   Uso de tecnología y canal dominante
*   Confianza y percepción de riesgo
*   Dificultades y fricciones
*   Preferencias funcionales (validación de hipótesis)
**Preguntas**
1. **Rol principal en procesos de arriendo**
    _Tipo: Opción múltiple cerrada (una opción)_
    1. Arrendador
    2. Arrendatario
    3. Ambos
2. **Rango de edad**
    _Tipo_**_:_** _Opción múltiple cerrada_
    1. 18 – 32 años
    2. 33 – 59 años
    3. 60 años o más
3. **Experiencia en procesos de arriendo**
    _Tipo: Opción múltiple cerrada_
    1. Primera vez / muy poca experiencia
    2. Experiencia ocasional
    3. Experiencia frecuente
    4. Experiencia alta (varios años o múltiples inmuebles)
4. **Dispositivo que utiliza con mayor frecuencia para trámites digitales**
    _Tipo: Opción múltiple cerrada_
    1. Teléfono celular
    2. Computador
    3. Ambos por igual
5. **Frecuencia de uso de herramientas digitales en su vida diaria**
    _Tipo: Escala Likert (5 puntos)_
    1. Nunca
    2. Rara vez
    3. Algunas veces
    4. Frecuentemente
    5. Siempre
6. **Nivel de comodidad usando plataformas digitales**
    _Tipo: Escala Likert_
    1. Muy incómodo
    2. Incómodo
    3. Neutral
    4. Cómodo
    5. Muy cómodo
7. **Nivel de confianza al usar plataformas digitales para pagos**
    _Tipo: Escala Likert_
    1. Nada confiable
    2. Poco confiable
    3. Neutral
    4. Confiable
    5. Muy confiable
8. **Nivel de confianza en la firma digital de contratos**
    _Tipo: Escala Likert_
    1. Nada confiable
    2. Poco confiable
    3. Neutral
    4. Confiable
    5. Muy confiable
9. **Canal que prefiere cuando el proceso es importante o genera dudas**
    _Tipo: Opción múltiple cerrada_
    1. Presencial
    2. Llamada telefónica
    3. Mensajería (WhatsApp)
    4. Plataforma digital
10. **Grado de dificultad al usar plataformas digitales con muchos pasos**
    _Tipo: Escala Likert_
    1. Muy difícil
    2. Difícil
    3. Neutral
    4. Fácil
    5. Muy fácil
11. **Qué tan problemático considera lo siguiente en plataformas actuales**
    _Tipo: Matriz Likert_

| Aspecto | Nada problemático | Poco | Neutral | Bastante | Muy problemático |
| ---| ---| ---| ---| ---| --- |
| Falta de claridad en el proceso |  |  |  |  |  |
| Exceso de información |  |  |  |  |  |
| Uso de lenguaje técnico |  |  |  |  |  |
| Falta de confirmaciones claras |  |  |  |  |  |
| Dificultad para saber qué sigue |  |  |  |  |  |

1. **Importancia de las siguientes funcionalidades**
    _Tipo: Matriz Likert_

| Funcionalidad | Nada importante | Poco | Neutral | Importante | Muy importante |
| ---| ---| ---| ---| ---| --- |
| Ver fecha de publicación del inmueble |  |  |  |  |  |
| Filtrar por zona/barrio |  |  |  |  |  |
| Ver ubicación en mapa |  |  |  |  |  |
| Ver fotos obligatorias |  |  |  |  |  |
| Crear listas de inmuebles |  |  |  |  |  |

1. **Importancia de apoyo y guía durante el uso de la plataforma**
    _Tipo: Escala Likert_
    1. Nada importante
    2. Poco importante
    3. Neutral
    4. Importante
    5. Muy importante
2. **Importancia de recibir notificaciones del proceso**
    _Tipo: Escala Likert_
    1. Nada importante
    2. Poco importante
    3. Neutral
    4. Importante
    5. Muy importante
3. **Preferencia de canal para notificaciones**
    _Tipo: Opción múltiple cerrada_
    1. WhatsApp
    2. Correo electrónico
    3. Notificación dentro de la plataforma
    4. No deseo notificaciones
4. **Importancia de poder gestionar pagos desde la plataforma**
    _Tipo: Escala Likert_
    1. Nada importante
    2. Poco importante
    3. Neutral
    4. Importante
    5. Muy importante
5. **Importancia de poder consultar contratos y comprobantes**
    _Tipo: Escala Likert_
    1. Nada importante
    2. Poco importante
    3. Neutral
    4. Importante
    5. Muy importante
### Síntesis de hallazgos
![](https://t90132600355.p.clickup-attachments.com/t90132600355/c7a04392-9ea8-4992-b57d-20df5bc54b75/image.png)
El cuestionario se realizo a 115 personas anónimas, las cuales podían vivir o no en Colombia, en el para las del ultimo caso se preguntó el departamento de residencia para poder filtrar los resultados en caso de que se quisiera entender cómo las respuestas podían variar según la región del encuestado. Los resultados obtenidos confirman y refuerzan los patrones identificados previamente en las entrevistas semiestructuradas, evidenciando una alta consistencia entre las percepciones cualitativas y los datos estructurados recolectados.
![](https://t90132600355.p.clickup-attachments.com/t90132600355/6eed5c0e-cbe1-4383-aa24-fe277c7b93fc/image.png)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/9765c47f-0a67-4783-8511-03206649dcea/image.png)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/63008471-0b41-4d81-850c-0721323d3501/image.png)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/aa91c0f4-2b44-4140-9176-eb42c7b9df61/image.png)
En términos generales, los encuestados manifiestan una percepción significativa de dificultad frente a plataformas con flujos poco claros, múltiples pasos o falta de retroalimentación, lo que refuerza la necesidad de diseñar una experiencia de interacción progresiva y con bajo nivel de carga cognitiva.
![](https://t90132600355.p.clickup-attachments.com/t90132600355/dd684905-9e45-4dd0-b5ed-a9b825f0e2ff/image.png)
Por otro lado, se observa una fuerte valoración de funcionalidades orientadas a la claridad, la transparencia y la eficiencia del proceso de arriendo, tales como la visualización de información clave del inmueble, el uso de filtros por ubicación y características básicas, y el acceso a fotografías obligatorias.
![](https://t90132600355.p.clickup-attachments.com/t90132600355/8b3b1cd7-bfcd-4599-8ee3-42c9118c4dee/image.png)
En relación con los procesos transaccionales, los resultados muestran una aceptación mayoritaria del uso de pagos digitales y de la consulta de contratos y comprobantes desde la plataforma, aunque persisten matices en los niveles de confianza, especialmente en usuarios de mayor edad o menor experiencia en procesos de arriendo.
![](https://t90132600355.p.clickup-attachments.com/t90132600355/a5d5a1b7-4711-48a3-aa0d-7f95c5584f57/image.png)
Así, estos hallazgos permiten consolidar un conjunto de hipótesis de requerimientos funcionales y no funcionales que validan la pertinencia de una plataforma mobile-first, centrada en la usabilidad, la orientación al usuario y el fortalecimiento de la confianza, sirviendo como insumo directo para la actividad de user story mapping y la construcción del backlog funcional del sistema.

| Requerimiento | Descripción | Justificación |
| ---| ---| --- |
| Visualización de fecha de publicación | El sistema debería mostrar claramente la fecha de publicación de cada inmueble. | Alta valoración de esta funcionalidad para identificar inmuebles vigentes y evitar búsquedas ineficientes. |
| Filtros por zona o barrio | El sistema debería permitir filtrar inmuebles por zona o barrio. | Funcionalidad catalogada como muy importante por la mayoría de los encuestados. |
| Filtros por características básicas | El sistema debería permitir filtrar inmuebles por precio, número de habitaciones y baños. | Necesidad recurrente para acotar búsquedas y facilitar la toma de decisiones. |
| Visualización de ubicación en mapa | El sistema debería mostrar la ubicación del inmueble en un mapa interactivo. | Los usuarios valoran la posibilidad de contextualizar el inmueble geográficamente. |
| Publicaciones con fotografías obligatorias | El sistema debería exigir fotografías para publicar un inmueble. | La ausencia de imágenes se percibe como un factor de desconfianza. |
| Acceso multiplataforma mobile-first | El sistema debería funcionar de forma óptima en dispositivos móviles, sin excluir el uso en computador. | Uso predominante del celular como canal principal de acceso. |
| Baja carga cognitiva en la interfaz | El sistema debería minimizar la complejidad visual y el número de pasos en los flujos principales. | Se identifica como problemática la dificultad para saber “qué sigue” en plataformas actuales. |
| Guía y retroalimentación durante el proceso | El sistema debería ofrecer mensajes claros que orienten al usuario durante el uso de la plataforma. | Alta importancia asignada al acompañamiento y a la claridad del proceso. |
| Visualización del estado del proceso | El sistema debería mostrar de forma clara el estado de las acciones realizadas (contacto, contrato, pago). | Reduce incertidumbre y aumenta la confianza en el uso del sistema. |
| Gestión de pagos desde la plataforma | El sistema debería permitir realizar y gestionar pagos del canon de arrendamiento desde la plataforma. | Los pagos digitales son ampliamente aceptados y valorados como funcionalidad clave. |
| Consulta de contratos y comprobantes | El sistema debería permitir consultar contratos y comprobantes de pago en cualquier momento. | Funcionalidad considerada importante para control y trazabilidad. |
| Historial y registro de pagos | El sistema debería almacenar un historial de pagos accesible para arrendadores y arrendatarios. | Necesidad de respaldo y verificación de transacciones realizadas. |
| Notificaciones del proceso | El sistema debería notificar eventos relevantes del proceso de arriendo. | Valoración positiva de la recepción de notificaciones oportunas. |
| Preferencia por canales familiares | El sistema debería priorizar canales de notificación familiares (ej. WhatsApp) cuando sea posible. | Preferencia explícita por canales ya incorporados en el uso cotidiano. |
| Consistencia visual y accesibilidad básica | El sistema debería usar contrastes adecuados, tipografías legibles y patrones consistentes. | Identificado como factor clave para usuarios con menor adopción digital. |

# Consolidación y refinamiento de requisitos
A partir de las diferentes estrategias detalladas en la sección anterior, se pueden agrupar los resultados obtenidos para consolidar requerimientos concretos. Luego estos se refinan según la información que cada estrategia proporciono y por último, se construye el backlog del producto sobre el cual se priorizan los requerimientos más relevantes y se estructura un producto con diferentes versiones increméntales basadas en esta priorización.
## User Story Mapping y Backlog
Private ([https://app.clickup.com/t/86aefdtp5](https://app.clickup.com/t/86aefdtp5))
### User Story Mapping
El user story mapping es una técnica visual que permite estructurar y planificar el desarrollo de un producto de software centrado en el usuario y en su flujo real de interacción. La técnica parte de la identificación de las actividades principales que el usuario realiza dentro del sistema, luego, estas actividades se descomponen en pasos más específicos que representan la secuencia lógica del proceso. Finalmente, para cada paso se agregan verticalmente las funcionalidades o alternativas que permiten ejecutarlo, formuladas como historias de usuario lo que permite obtener priorizarlas según su facilidad de implementación y relevancia en el flujo del usuario. De este modo, de aplicar esta técnica se obtienen las funcionalidades del producto mínimo viable (MVP) pero también un backlog de funcionalidades para el futuro del software.
Link al diagrama completo: [https://javerianacaliedu-my.sharepoint.com/:u:/g/personal/javegag\_javerianacali\_edu\_co/IQCA3UNpexfLToOheE77QAXcAZFMi72GKUMZBqv9xZ4K3GE?e=xMAlsx](https://javerianacaliedu-my.sharepoint.com/:u:/g/personal/javegag_javerianacali_edu_co/IQCA3UNpexfLToOheE77QAXcAZFMi72GKUMZBqv9xZ4K3GE?e=xMAlsx)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/06be23ce-2429-452e-90ff-4cd8fb516bba/image.png)

A continuación se muestran en detalle los diferentes bloques del user story mapping:
![](https://t90132600355.p.clickup-attachments.com/t90132600355/872f444e-89eb-46eb-9056-525903e9a291/image.png)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/8e95ce9c-ec14-44fa-89d9-0fd3d645d3e2/image.png)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/446348fc-1939-4a85-90fc-024bb7766edd/image.png)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/7eacba9f-df95-4390-84dd-43fdc90a0aed/image.png)
![](https://t90132600355.p.clickup-attachments.com/t90132600355/f661645b-7ce9-4f00-ae9e-dde276c56956/image.png)
### Alcance de roles en el MVP
Para el alcance del **MVP** no se considera el rol de **administrador de la plataforma** como usuario funcional final, debido a que se entiende como un rol técnico/operativo, propio de la operación interna de la solución, y no como un actor del proceso de arriendo descrito en este documento. Así, las funcionalidades asociadas a administración técnica de la plataforma (gestión de catálogos globales, monitoreo técnico, configuración de parámetros de sistema, etc.) quedan **fuera de alcance** del presente SRS y se podrán modelar en fases posteriores.
### Supuestos sobre identidad en el mundo físico vs. digital
En el análisis previo se ha partido de los **roles existentes en el mundo tradicional/físico** (arrendador y arrendatario), asumiendo que las personas ya tienen identidad y relaciones de confianza preexistentes. Sin embargo, para que estos roles puedan operar en la plataforma digital, es necesario definir requisitos explícitos de **registro, autenticación y autorización** que permitan identificar a las personas y limitar lo que cada rol puede hacer.
A continuación se documentan los requisitos funcionales y las historias de usuario mínimas de autenticación y autorización.

| Requerimiento | Descripción |
| ---| --- |
| Registro de usuario arrendatario | El sistema debe permitir que una persona que actúa como arrendatario cree una cuenta con datos básicos (nombre completo o razón social, número de identificación/NIT, correo electrónico, número de celular y contraseña), aceptando los términos y condiciones del servicio. |
| Registro de usuario arrendador | El sistema debe permitir que una persona que actúa como arrendador cree una cuenta con datos básicos (nombre completo o razón social, número de identificación/NIT, correo electrónico, número de celular y contraseña), aceptando los términos y condiciones del servicio. |
| Inicio de sesión seguro | El sistema debe permitir que usuarios registrados (arrendadores y arrendatarios) inicien sesión mediante correo electrónico y contraseña válidos, validando sus credenciales antes de conceder acceso a las funcionalidades asociadas a su rol. |
| Recuperación y restablecimiento de contraseña | El sistema debería ofrecer un mecanismo para que un usuario que ha olvidado su contraseña pueda solicitar su restablecimiento y definir una nueva contraseña de forma segura, usando un canal de verificación (por ejemplo, enlace enviado al correo registrado). |
| Cierre de sesión y gestión básica de sesión | El sistema debería permitir que el usuario cierre sesión de forma explícita y debe expirar automáticamente sesiones inactivas tras un periodo de tiempo razonable. |

### Backlog
A partir del user story mapping anterior, se consolidó el backlog del producto como instrumento formal de planificación y gestión del desarrollo, el cual organiza las historias de usuario estructurándolas por épicas funcionales y priorizándolas según su aporte de valor y su viabilidad técnica. La construcción del backlog permite traducir el mapa visual de interacción del usuario en un conjunto ordenado de elementos implementables, definiendo claramente el alcance del Producto Mínimo Viable (MVP) y los incrementos posteriores del sistema.

| ID | Historia de Usuario | Prioridad (MoSCoW) | Tipo | Complejidad |
| ---| ---| ---| ---| --- |
| Release 1 - MVP |
| Requerimientos No Funcionales Transversales |
| NFR-01 | Mobile-first y correcto funcionamiento en celular | Must | No Funcional | Media |
| NFR-02 | Baja carga cognitiva en la interfaz | Must | No Funcional | Baja |
| NFR-03 | Claridad explicativa en cada paso | Must | No Funcional | Media |
| NFR-04 | Retroalimentación visible ante errores | Must | No Funcional | Media |
| NFR-05 | Diseño accesible y legible | Must | No Funcional | Media |
| NFR-06 | Generar confianza en pagos y firma digital | Must | No Funcional | Alta |
| US-AUT-01 | Como potencial arrendatario quiero crear una cuenta en la plataforma con mis datos básicos y una contraseña para poder postularme a inmuebles, gestionar mis solicitudes y hacer seguimiento a mi proceso de arriendo. | Must | Funcional | Baja |
| US-AUT-02 | Como arrendador quiero crear una cuenta en la plataforma con mis datos básicos y una contraseña para poder publicar mis inmuebles, recibir postulaciones y gestionar el proceso de selección de arrendatarios. | Must | Funcional | Baja |
| US-AUT-03 | Como arrendador o arrendatario quiero ingresar a la plataforma usando mi correo y contraseña para acceder a las funcionalidades y al estado actualizado de mis procesos de arriendo. | Must | Funcional | Baja |
| ÉPICA 1 – Exploración de Oferta |
| US-01 | Como arrendatario quiero buscar inmuebles para iniciar el proceso de selección. | Must | Funcional | Media |
| US-02 | Como arrendatario quiero filtrar por zona/barrio para encontrar opciones relevantes. | Must | Funcional | Media |
| US-03 | Como arrendatario quiero ver fotos obligatorias para evaluar interés inicial. | Must | Funcional | Baja |
| US-04 | Como arrendatario quiero ver la fecha de publicación para identificar inmuebles vigentes. | Must | Funcional | Baja |
| US-05 | Como arrendatario quiero contactar al arrendador desde la plataforma para agilizar el proceso. | Must | Funcional | Media |
| ÉPICA 2 – Gestión de Publicación |
| US-06 | Como arrendador quiero crear una publicación ingresando la información básica del inmueble para ofrecerlo formalmente a posibles arrendatarios. | Must | Funcional | Media |
| US-07 | Como arrendador quiero cargar fotos obligatorias antes de publicar para generar confianza y aumentar el interés en el inmueble. | Must | Funcional | Baja |
| US-08 | Como arrendador quiero publicar el inmueble desde el celular sin depender del computador para gestionar el proceso de manera práctica y desde cualquier lugar. | Must | Funcional | Media |
| US-09 | Como arrendador quiero recibir notificaciones cuando haya interesados para responder oportunamente y no perder oportunidades de arriendo. | Should | Funcional | Baja |
| ÉPICA 3 – Gestión de Contrato |
| US-10 | Como arrendador quiero cargar el contrato en la plataforma para centralizar el proceso y evitar trámites físicos innecesarios. | Must | Funcional | Media |
| US-11 | Como arrendatario quiero ver un resumen de los puntos clave del contrato antes de leerlo completo para comprender rápidamente las condiciones principales del arriendo. | Must | Funcional | Baja |
| US-12 | Como usuario quiero firmar digitalmente el contrato con validez jurídica para formalizar el acuerdo sin desplazamientos presenciales. | Must | Funcional | Alta |
| US-13 | Como usuario quiero recibir confirmación clara cuando el contrato esté firmado para tener certeza de que el proceso fue exitoso. | Must | Funcional | Baja |
| ÉPICA 4 – Gestión de Pagos |
| US-14 | Como arrendatario quiero pagar el canon desde la plataforma para realizar el pago de forma rápida y segura. | Must | Funcional | Alta |
| US-15 | Como arrendador quiero recibir confirmación cuando el pago se realice para verificar oportunamente el cumplimiento del pago. | Must | Funcional | Media |
| US-16 | Como usuario quiero consultar el historial de pagos para llevar control y seguimiento de las transacciones realizadas. | Must | Funcional | Media |
| US-17 | Como arrendador quiero generar reportes mensuales de ingresos para organizar mi gestión financiera. | Should | Funcional | Media |
| ÉPICA 5 – Seguimiento del Proceso |
| US-18 | Como usuario quiero visualizar claramente el estado del arriendo (publicado, contrato firmado, pago realizado) para entender en qué etapa se encuentra el proceso. | Must | Funcional | Media |
| US-19 | Como usuario quiero recibir notificaciones sobre eventos importantes del proceso para mantenerme informado sin necesidad de revisar constantemente la plataforma. | Must | Funcional | Baja |
| Release 2 |
| ÉPICA 6 – Optimización de Experiencia |
| US-AUT-04 | Como arrendador o arrendatario quiero restablecer mi contraseña mediante un proceso guiado y seguro para recuperar el acceso a mi cuenta sin depender de un tercero. | Should | Funcional | Media |
| US-AUT-05 | Como arrendador o arrendatario autenticado quiero poder cerrar mi sesión y que esta expire automáticamente tras un tiempo de inactividad para reducir el riesgo de que otras personas usen mi cuenta cuando comparto dispositivo o dejo la sesión abierta. | Should | Funcional | Media |
| US-20 | Como arrendatario quiero filtrar por precio y características básicas para ajustar la búsqueda a mi presupuesto y necesidades. | Should | Funcional | Media |
| US-21 | Como arrendatario quiero crear listas de inmuebles favoritos para compararlos. | Should | Funcional | Baja |
| US-22 | Como arrendatario quiero visualizar la ubicación exacta en un mapa para contextualizar el inmueble. | Should | Funcional | Media |
| US-23 | Como usuario quiero priorizar WhatsApp como canal de comunicación con interesados para usar un medio familiar y de uso cotidiano. | Should | Funcional | Media |
| US-24 | Como usuario quiero consultar versiones históricas de contratos firmados para tener trazabilidad y respaldo documental. | Could | Funcional | Media |
| US-25 | Como usuario quiero descargar comprobantes de pago cuando lo necesite para contar con soporte documental ante cualquier eventualidad. | Should | Funcional | Baja |
| US-26 | Como arrendador quiero visualizar resúmenes contables básicos para tener una visión clara de mis ingresos por arriendo. | Should | Funcional | Alta |
| Release 3 |
| ÉPICA 7 – Gestión Avanzada |
| US-29 | Como arrendatario quiero agregar notas a los inmuebles guardados para poder compararlos y tomar una decisión informada. | Could | Funcional | Baja |
| US-30 | Como arrendador quiero ver estadísticas de visualización del inmueble para entender el nivel de interés que está generando la publicación. | Could | Funcional | Media |
| US-31 | Como arrendador quiero evaluar la viabilidad o riesgo de los postulantes antes de aceptar el contrato para reducir el riesgo de incumplimientos futuros. | Should | Funcional | Alta |

### Criterios de Aceptación en Gherkin

La siguiente sección propone criterios de aceptación en formato Gherkin para los requerimientos consolidados en el backlog (NFR-01–NFR-06 y US-01–US-31). El objetivo es:
*   Definir comportamientos observables y verificables en lenguaje natural.
*   Alinear a negocio, diseño, desarrollo y QA en un entendimiento común de cada funcionalidad.
*   Facilitar la validación posterior de que el prototipo cumple con lo acordado, especialmente en flujos críticos (publicación, contrato y pagos), manteniendo el enfoque de inclusión digital y baja carga cognitiva.
#### Épica 0 - Requerimientos transversales

**NFR-01 – Mobile-first y correcto funcionamiento en celular**

**Característica:** NFR-01 Mobile-first en dispositivos móviles

**Escenario:** Visualización correcta del flujo principal en celular
**Dado** que un usuario accede a la plataforma desde un teléfono celular con conexión 4G
**Cuando** navega por las pantallas principales de exploración de oferta, publicación de inmueble, firma de contrato y pagos
**Entonces** no aparece barra de desplazamiento horizontal en ninguna de estas pantallas
**Y** todos los textos principales tienen un tamaño de fuente legible sin necesidad de zoom manual
**Y** los botones de acción principales son seleccionables cómodamente con el pulgar

**Escenario:** Rendimiento aceptable en redes móviles
**Dado** que un usuario accede desde un teléfono celular con conexión 4G promedio
**Cuando** abre por primera vez la página de inicio de la plataforma
**Entonces** la página carga completamente en menos de 3 segundos en al menos el 90% de las pruebas realizadas

**NFR-02 – Baja carga cognitiva en la interfaz**

**Característica:** NFR-02 Baja carga cognitiva

**Escenario:** Pantallas sin sobrecarga de información
**Dado** que un usuario se encuentra en cualquier paso del flujo de exploración de inmuebles
**Cuando** visualiza la pantalla correspondiente a ese paso
**Entonces** se muestran como máximo tres bloques de información o acciones principales simultáneas
**Y** los textos explicativos no superan tres líneas por bloque
**Y** no se muestran más de dos llamadas a la acción destacadas simultáneamente

**Escenario:** Pasos progresivos en flujos complejos
**Dado** que un usuario inicia el flujo de publicación de un inmueble
**Cuando** avanza entre los pasos del formulario
**Entonces** en cada paso se solicitan únicamente datos relacionados con un mismo tema (por ejemplo, "datos básicos", "características", "fotos")
**Y** el usuario ve un indicador claro del progreso (por ejemplo, "Paso 1 de 3")

**NFR-03 – Claridad explicativa en cada paso**

**Característica:** NFR-03 Mensajes explicativos

**Escenario:** Explicación de propósito de la pantalla
**Dado** que un usuario accede a una pantalla que forma parte de un flujo (búsqueda, publicación, contrato o pagos)
**Cuando** la pantalla se carga
**Entonces** se muestra en la parte superior un texto breve que indique qué acción se está realizando (por ejemplo, "Publicar inmueble", "Firmar contrato")
**Y** el usuario puede entender el propósito de la pantalla leyendo como máximo dos frases

**Escenario:** Mensajes de error comprensibles
**Dado** que se produce un error de validación en un formulario
**Cuando** el usuario intenta continuar sin completar un campo obligatorio o con un dato inválido
**Entonces** se muestra un mensaje junto al campo afectado en lenguaje no técnico
**Y** el mensaje indica claramente qué debe corregir el usuario (por ejemplo, "Ingresa un número de teléfono de 10 dígitos")

**NFR-04 – Retroalimentación visible ante errores**

**Característica:** NFR-04 Retroalimentación ante errores

**Escenario:** Indicación de error en acciones críticas
**Dado** que un usuario intenta confirmar el pago del canon de arrendamiento
**Cuando** se produce un fallo en la comunicación con la pasarela de pagos
**Entonces** la plataforma muestra un mensaje de error visible en la pantalla
**Y** el mensaje indica si el pago fue rechazado o se desconoce el estado
**Y** se ofrece una acción clara para reintentar o contactar soporte

**NFR-05 – Diseño accesible y legible**

**Característica:** NFR-05 Accesibilidad básica

**Escenario:** Contraste mínimo en textos
**Dado** que un usuario con dificultades visuales navega por la plataforma
**Cuando** visualiza textos sobre fondos de color
**Entonces** la combinación de colores cumple con un contraste mínimo equivalente a nivel AA de WCAG para texto normal

**Escenario:** Controles táctiles accesibles
**Dado** que un usuario interactúa con botones y enlaces en un dispositivo móvil
**Cuando** intenta presionar un botón o enlace
**Entonces** cada elemento interactivo tiene un área táctil mínima de 44x44 píxeles o equivalente

**NFR-06 – Generar confianza en pagos y firma digital**

**Característica:** NFR-06 Confianza en procesos críticos

**Escenario:** Explicación del uso de pasarelas y firma
**Dado** que un usuario va a realizar un pago o firmar un contrato desde la plataforma
**Cuando** llega a la pantalla previa a la acción crítica
**Entonces** se muestra un texto breve que indique qué servicio externo se usará (por ejemplo, nombre de la pasarela o proveedor de firma)
**Y** se aclara que la transacción se realiza de forma segura y bajo la normativa vigente

**Escenario:** Confirmación clara de operación exitosa
**Dado** que un usuario completa un pago o firma un contrato digitalmente
**Cuando** la operación ha sido confirmada por el servicio externo
**Entonces** la plataforma muestra una pantalla de confirmación con un resumen de la operación
**Y** se genera un identificador único de la transacción visible para el usuario

**US-AUT-01 – Registro de arrendatario**

**Escenario:** Registro exitoso de arrendatario
**Dado** que soy una persona interesada en arrendar vivienda y no tengo cuenta en la plataforma
**Y** estoy en el formulario de registro para arrendatario
**Cuando** ingreso mi nombre completo, número de identificación colombiano, correo válido, número de celular y una contraseña que cumple las reglas definidas
**Y** acepto los términos y condiciones
**Entonces** la plataforma crea mi cuenta de arrendatario
**Y** me muestra un mensaje de confirmación de registro exitoso
**Y** quedo autenticado en la plataforma como arrendatario.

**Escenario:** Registro de arrendatario con datos incompletos
**Dado** que estoy en el formulario de registro para arrendatario
**Cuando** intento enviar el formulario sin diligenciar todos los campos obligatorios
**Entonces** la plataforma me muestra mensajes de error indicando los campos faltantes
**Y** no crea la cuenta hasta que complete la información requerida.

**US-AUT-02 – Registro de arrendador**

**Escenario:** Registro exitoso de arrendador
**Dado** que soy propietario y no tengo cuenta en la plataforma
**Y** estoy en el formulario de registro para arrendador
**Cuando** ingreso mi nombre completo o razón social, número de identificación/NIT, correo válido, número de celular y una contraseña que cumple las reglas definidas
**Y** acepto los términos y condiciones
**Entonces** la plataforma crea mi cuenta de arrendador
**Y** me muestra un mensaje de confirmación de registro exitoso
**Y** quedo autenticado en la plataforma como arrendador.

**Escenario**: Registro con correo ya utilizado
**Dado** que existe una cuenta registrada con un determinado correo electrónico
**Y** estoy intentando registrar un nuevo usuario con el mismo correo
**Cuando** envío el formulario de registro
**Entonces** la plataforma rechaza el registro
**Y** me muestra un mensaje indicando que el correo ya está asociado a una cuenta existente
**Y** me sugiere iniciar sesión o recuperar la contraseña.

**US-AUT-03 – Inicio de sesión**

**Escenario:** Inicio de sesión exitoso
**Dado** que tengo una cuenta registrada en la plataforma
**Y** estoy en la pantalla de inicio de sesión
**Cuando** ingreso mi correo y contraseña correctos
**Entonces** la plataforma me autentica
**Y** me redirige a la vista inicial correspondiente a mi rol principal (arrendador o arrendatario).

**Escenario:** Inicio de sesión con credenciales inválidas
**Dado** que estoy en la pantalla de inicio de sesión
**Cuando** ingreso un correo o contraseña incorrectos
**Entonces** la plataforma no me autentica
**Y** me muestra un mensaje indicando que las credenciales son inválidas
**Y** me ofrece la opción de intentar nuevamente o recuperar mi contraseña.

#### ÉPICA 1 – Exploración de oferta (US-01 a US-05)

**US-01 – Buscar inmuebles**

**Característica:** US-01 Búsqueda de inmuebles

**Escenario:** Búsqueda sin autenticación previa
**Dado** que una persona accede a la plataforma sin haber iniciado sesión
**Cuando** abre la pantalla principal de búsqueda e ingresa al menos un criterio (por ejemplo, ciudad o barrio)
**Entonces** el sistema muestra un listado de inmuebles que cumplen el criterio
**Y** no se le exige registrarse ni autenticarse antes de ver los resultados

**Escenario:** Búsqueda sin resultados
**Dado** que un usuario ingresa criterios de búsqueda muy restrictivos
**Cuando** ejecuta la búsqueda
**Entonces** el sistema indica claramente que no se encontraron inmuebles
**Y** ofrece opciones para ajustar los filtros (por ejemplo, ampliar rango de precios o zonas)

**US-02 – Filtrar por zona/barrio**

**Característica:** US-02 Filtros por zona/barrio

**Escenario:** Filtrar por barrio específico
**Dado** que un usuario se encuentra en la pantalla de resultados de búsqueda
**Cuando** selecciona un barrio específico dentro de la ciudad elegida
**Entonces** la lista de inmuebles se actualiza mostrando solo aquellos ubicados en ese barrio
**Y** el filtro aplicado se visualiza claramente en la interfaz

**US-03 – Ver fotos obligatorias**

**Característica:** US-03 Fotografías obligatorias

**Escenario:** Publicaciones sin fotos no visibles en la lista
**Dado** que existen inmuebles publicados en la plataforma
**Cuando** un usuario navega por el listado de resultados
**Entonces** todas las tarjetas de inmuebles muestran al menos una fotografía
**Y** no aparecen inmuebles sin fotografías en el listado público

**US-04 – Ver fecha de publicación**

**Característica:** US-04 Visualización de fecha de publicación

**Escenario:** Fecha visible en la tarjeta del inmueble
**Dado** que un usuario visualiza el listado de inmuebles
**Cuando** observa cada tarjeta de inmueble
**Entonces** en cada tarjeta se muestra la fecha de publicación en un formato legible (por ejemplo, "Publicado el 12 Feb 2026")

**US-05 – Contactar al arrendador desde la plataforma**

**Característica:** US-05 Contacto con el arrendador

**Escenario:** Contacto inicial desde la plataforma
**Dado** que un usuario ha encontrado un inmueble de interés
**Cuando** selecciona la opción "Contactar" desde la tarjeta o el detalle del inmueble
**Entonces** el sistema ofrece al menos una opción de contacto (por ejemplo, formulario dentro de la plataforma o redirección controlada a WhatsApp)
**Y** registra internamente que se inició un contacto para ese inmueble

**Escenario:** Falla en el envío de mensaje
**Dado** que el usuario envía un mensaje al arrendador desde la plataforma
**Cuando** se produce un error de conexión al intentar entregar el mensaje
**Entonces** la plataforma informa claramente que el mensaje no fue enviado
**Y** permite reintentar el envío sin perder el texto redactado

#### ÉPICA 2 – Gestión de publicación (US-06 a US-09)

**US-06 – Crear publicación con información básica**

**Característica:** US-06 Publicación de inmueble

**Escenario:** Publicación básica exitosa
**Dado** que un arrendador ha iniciado sesión en la plataforma
**Cuando** completa los campos obligatorios de un formulario de publicación (dirección general, tipo de inmueble, canon, número de habitaciones y baños)
**Y** carga al menos una fotografía del inmueble
**Entonces** el sistema crea una nueva publicación en estado "publicado" o equivalente
**Y** la publicación aparece en el listado de exploración de oferta

**US-07 – Cargar fotos obligatorias**

**Característica:** US-07 Carga de fotografías

**Escenario:** Impedir publicación sin fotos
**Dado** que un arrendador está diligenciando el formulario de publicación
**Cuando** intenta guardar la publicación sin haber cargado ninguna fotografía
**Entonces** el sistema bloquea la acción de publicar
**Y** muestra un mensaje explicando que se requiere al menos una foto para generar confianza en la oferta

**US-08 – Publicar desde el celular**

**Característica:** US-08 Publicación desde dispositivo móvil

**Escenario:** Flujo completo de publicación en celular
**Dado** que un arrendador accede a la plataforma desde su teléfono celular
**Cuando** completa todos los pasos del flujo de publicación de un inmueble
**Entonces** puede finalizar la publicación sin necesidad de usar un computador de escritorio
**Y** todas las validaciones de campos y mensajes se muestran correctamente en pantalla móvil

**US-09 – Notificaciones de interesados al arrendador**

**Característica:** US-09 Notificaciones de interesados

**Escenario:** Notificación cuando hay un nuevo interesado
**Dado** que un arrendador tiene un inmueble publicado
**Y** un arrendatario envía un mensaje de interés desde la plataforma
**Cuando** el mensaje es recibido correctamente por el sistema
**Entonces** el arrendador recibe una notificación en el canal configurado (por ejemplo, correo electrónico o WhatsApp)
**Y** la notificación incluye al menos el inmueble asociado y el nombre o identificador del interesado

#### ÉPICA 3 – Gestión de contrato (US-10 a US-13)

**US-10 – Cargar contrato en la plataforma**

**Característica:** US-10 Carga de contrato

**Escenario:** Carga exitosa de contrato
**Dado** que un arrendador tiene un inmueble con un proceso de arriendo en curso
**Cuando** carga un archivo de contrato en el formato permitido (por ejemplo, PDF)
**Entonces** el sistema asocia el contrato al inmueble y al arrendatario seleccionado
**Y** el contrato queda disponible para consulta posterior por ambas partes según sus permisos

**US-11 – Resumen de puntos clave del contrato**

**Característica:** US-11 Resumen del contrato

**Escenario:** Visualización de resumen antes de la lectura completa
**Dado** que un usuario va a revisar un contrato cargado en la plataforma
**Cuando** abre el contrato desde la interfaz
**Entonces** el sistema muestra primero un resumen legible con los puntos clave (canon, duración, fecha de inicio, obligaciones principales)
**Y** ofrece un enlace o botón claro para acceder al documento completo

**US-12 – Firma digital con validez jurídica**

**Característica:** US-12 Firma digital de contrato

**Escenario:** Firma digital exitosa
**Dado** que arrendador y arrendatario han revisado el contrato en la plataforma
**Cuando** ambos aceptan firmar digitalmente a través del proveedor de firma integrado
**Entonces** el sistema redirige o presenta el flujo de firma del proveedor externo
**Y** al finalizar recibe una confirmación de firma exitosa para ambas partes
**Y** el contrato queda marcado con un estado "Firmado digitalmente" y una fecha de firma

**Escenario:** Firma interrumpida
**Dado** que un usuario inicia el proceso de firma digital
**Cuando** cierra la ventana o pestaña antes de completar la firma
**Entonces** el sistema registra que la firma no fue completada
**Y** al reingresar al contrato se informa claramente que la firma está pendiente

**US-13 – Confirmación clara de contrato firmado**

**Característica:** US-13 Confirmación de contrato firmado

**Escenario:** Notificación de contrato firmado a ambas partes
**Dado** que el contrato ha sido firmado digitalmente por arrendador y arrendatario
**Cuando** el sistema recibe la confirmación del proveedor de firma
**Entonces** envía una notificación a ambas partes indicando que el contrato ha sido firmado
**Y** en la interfaz del contrato se muestra el estado "Firmado" junto con la fecha y hora de firma

#### ÉPICA 4 – Gestión de pagos (US-14 a US-17)

**US-14 – Pagar el canon desde la plataforma**

**Característica:** US-14 Pago de canon

**Escenario:** Pago exitoso del canon
**Dado** que un arrendatario tiene un contrato activo en la plataforma
**Y** existe un canon de arrendamiento pendiente de pago
**Cuando** selecciona la opción "Pagar canon" y completa los datos requeridos por la pasarela de pagos
**Entonces** la pasarela confirma el pago exitoso
**Y** la plataforma registra el pago asociado al contrato y al periodo correspondiente

**Escenario:** Pago rechazado
**Dado** que un arrendatario intenta pagar el canon desde la plataforma
**Cuando** la pasarela rechaza la transacción (por fondos insuficientes u otro motivo)
**Entonces** la plataforma muestra un mensaje claro indicando que el pago fue rechazado
**Y** el estado del canon pendiente no se marca como pagado

**US-15 – Confirmación de pago al arrendador**

**Característica:** US-15 Confirmación de pago al arrendador

**Escenario:** Notificación de pago recibido
**Dado** que un pago de canon se ha registrado como exitoso en la plataforma
**Cuando** el sistema actualiza el estado de ese pago
**Entonces** el arrendador recibe una notificación indicando que el canon correspondiente ha sido pagado
**Y** en el panel del arrendador el periodo aparece como "Pagado"

**US-16 – Consultar historial de pagos**

**Característica:** US-16 Historial de pagos

**Escenario:** Consulta de historial por parte del arrendador
**Dado** que un arrendador tiene uno o más contratos activos o históricos
**Cuando** accede a la sección de historial de pagos
**Entonces** puede ver una tabla con todos los pagos realizados, incluyendo fecha, monto, contrato asociado y estado

**US-17 – Reportes mensuales de ingresos**

**Característica:** US-17 Reportes contables básicos

**Escenario:** Generación de reporte mensual
**Dado** que un arrendador tiene al menos un pago registrado en un mes dado
**Cuando** selecciona el mes a consultar en la sección de reportes
**Entonces** la plataforma muestra el total de ingresos por arriendo de ese mes
**Y** permite exportar o descargar un resumen en formato estándar (por ejemplo, PDF o CSV)

#### ÉPICA 5 – Seguimiento del proceso (US-18 a US-19)

**US-18 – Visualizar el estado del arriendo**

**Característica:** US-18 Estado del proceso

**Escenario:** Visualización clara del estado principal
**Dado** que un usuario tiene al menos un contrato o publicación en la plataforma
**Cuando** accede al panel principal de seguimiento
**Entonces** para cada inmueble se muestra un estado resumido (por ejemplo, "Publicado", "En contacto", "Contrato cargado", "Contrato firmado", "Pago realizado")

**US-19 – Notificaciones sobre eventos importantes**

**Característica:** US-19 Notificaciones de eventos

**Escenario:** Notificación de cambio de estado relevante
**Dado** que el estado de un contrato o publicación cambia (por ejemplo, contrato firmado, pago recibido)
**Cuando** el cambio se registra en la plataforma
**Entonces** se envía una notificación al usuario correspondiente en el canal configurado
**Y** la notificación incluye el nuevo estado y el inmueble/contrato afectado

#### ÉPICA 6 – Optimización de experiencia (US-20 a US-26)

**US-AUT-04 – Recuperación de contraseña**

**Escenario:** Solicitud de restablecimiento de contraseña
**Dado** que estoy en la pantalla de inicio de sesión
**Y** he olvidado mi contraseña
**Cuando** selecciono la opción "Olvidé mi contraseña"
**Y** ingreso el correo electrónico con el que estoy registrado
**Entonces** la plataforma me muestra un mensaje indicando que ha enviado instrucciones de restablecimiento al correo registrado.

**Escenario:** Restablecimiento exitoso de contraseña
**Dado** que he recibido un correo con un enlace válido para restablecer mi contraseña
**Cuando** accedo al enlace dentro del tiempo de validez definido
**Y** defino una nueva contraseña que cumple las reglas establecidas
**Entonces** la plataforma actualiza mi contraseña

**US-AUT-05 - Cierre de sesión y gestión básica de sesión**

**Escenario:** Cierre de sesión manual exitoso
**Dado** que estoy autenticado en la plataforma como arrendador o arrendatario
**Y** estoy navegando por las funcionalidades de mi rol
**Cuando** selecciono la opción "Cerrar sesión" desde el menú o encabezado
**Entonces** el sistema finaliza mi sesión actual
**Y** me redirige a la pantalla de inicio o de inicio de sesión
**Y** deja de mostrar funcionalidades restringidas a usuarios autenticados

**Escenario:** Expiración de sesión por inactividad
**Dado** que estoy autenticado en la plataforma como arrendador o arrendatario
**Y** no realizo ninguna acción en la plataforma durante el periodo máximo de inactividad configurado
**Cuando** intento realizar una nueva acción (por ejemplo, cambiar de pantalla o actualizar la página)
**Entonces** el sistema detecta que mi sesión ha expirado por inactividad
**Y** me redirige a la pantalla de inicio de sesión
**Y** muestra un mensaje indicando que la sesión expiró por inactividad y que debo volver a autenticarme

**Escenario:** Protección al usar un dispositivo compartido
**Dado** que estoy autenticado en la plataforma desde un dispositivo compartido
**Y** selecciono la opción "Cerrar sesión" desde el menú o encabezado
**Cuando** otra persona intenta volver a las pantallas anteriores usando el historial o el botón "Atrás" del navegador
**Entonces** el sistema no le permite acceder directamente a las funcionalidades restringidas
**Y** exige que se inicie sesión nuevamente antes de mostrar información asociada a mi cuenta

**US-20 – Filtrar por precio y características básicas**

**Característica:** US-20 Filtros detallados de búsqueda

**Escenario:** Búsqueda con filtros combinados
**Dado** que un usuario desea ajustar la búsqueda a su presupuesto y necesidades
**Cuando** aplica filtros simultáneos de zona, precio máximo y número de habitaciones
**Entonces** el sistema muestra solo inmuebles que cumplen todos los criterios seleccionados

**US-21 – Listas de inmuebles favoritos**

**Característica:** US-21 Listas de favoritos

**Escenario:** Guardar inmueble en lista
**Dado** que un usuario autenticado está viendo el detalle de un inmueble
**Cuando** selecciona la opción "Agregar a favoritos" o equivalente
**Entonces** el inmueble se agrega a una lista personal de inmuebles guardados

**US-22 – Visualizar ubicación exacta en mapa**

**Característica:** US-22 Ubicación en mapa

**Escenario:** Ver ubicación y entorno del inmueble
**Dado** que un usuario abre el detalle de un inmueble publicado
**Cuando** accede a la sección de mapa
**Entonces** el mapa muestra la ubicación aproximada del inmueble
**Y** el usuario puede hacer zoom y desplazarse para ver el entorno

**US-23 – Priorizar WhatsApp como canal de comunicación**

**Característica:** US-23 Canal WhatsApp

**Escenario:** Iniciar conversación por WhatsApp
**Dado** que un usuario autenticado desea contactar al arrendador
**Y** el arrendador ha configurado WhatsApp como canal preferido
**Cuando** el usuario selecciona la opción de contacto vía WhatsApp
**Entonces** la plataforma abre o redirige a una conversación de WhatsApp con el número configurado
**Y** registra internamente que el contacto se realizó por este canal

**US-24 – Consultar versiones históricas de contratos**

**Característica:** US-24 Versiones de contrato

**Escenario:** Ver historial de versiones de un contrato
**Dado** que existe un contrato que ha tenido al menos una modificación
**Cuando** el usuario con permiso de acceso abre el historial de versiones del contrato
**Entonces** puede ver una lista de versiones con fecha y breve descripción del cambio

**US-25 – Descargar comprobantes de pago**

**Característica:** US-25 Descarga de comprobantes

**Escenario:** Descargar comprobante en PDF
**Dado** que un usuario tiene un pago registrado en la plataforma
**Cuando** selecciona la opción de descargar comprobante para ese pago
**Entonces** el sistema genera o muestra un archivo descargable con los datos básicos de la transacción

**US-26 – Resúmenes contables para arrendador**

**Característica:** US-26 Resumen contable

**Escenario:** Ver resumen agregado de ingresos
**Dado** que un arrendador tiene varios contratos activos
**Cuando** accede al resumen contable
**Entonces** la plataforma muestra el total de ingresos por periodo (mensual o anual) y permite desglosar por inmueble

#### ÉPICA 7 – Gestión avanzada (US-29 a US-31)

**US-29 – Notas sobre inmuebles guardados**

**Característica:** US-29 Notas en inmuebles favoritos

**Escenario:** Agregar nota a un inmueble favorito
**Dado** que un arrendatario tiene un inmueble guardado en una lista de favoritos
**Cuando** edita la entrada y escribe una nota textual (por ejemplo, "visitar el sábado" o "negociar canon")
**Entonces** la nota queda guardada asociada a ese inmueble y solo visible para ese usuario

**US-30 – Estadísticas de visualización del inmueble**

**Característica:** US-30 Estadísticas de visualización

**Escenario:** Consultar número de visualizaciones
**Dado** que un arrendador tiene un inmueble publicado
**Cuando** accede a la sección de estadísticas del inmueble
**Entonces** puede ver al menos el número de visualizaciones en un periodo reciente (por ejemplo, últimos 30 días)

**US-31 – Evaluar viabilidad o riesgo de postulantes**

**Característica:** US-31 Evaluación de riesgo de postulantes

**Escenario:** Evaluación básica de requisitos mínimos
**Dado** que uno o más arrendatarios se han postulado a un inmueble
**Cuando** el arrendador consulta la evaluación de viabilidad
**Entonces** la plataforma muestra si cada postulante cumple o no con un conjunto de criterios mínimos configurados (por ejemplo, ingreso mínimo, documentación completa)

**Escenario:** Resultado condicionado a integración externa
**Dado** que la evaluación de riesgo depende de un servicio externo de scoring
**Cuando** el servicio externo no está disponible
**Entonces** la plataforma informa al arrendador que la evaluación avanzada no pudo completarse
**Y** sigue permitiendo ver los datos básicos del postulante para una decisión manual

# Decisiones de gestión de datos y persistencia

Esta sección documenta las decisiones técnicas adoptadas para la gestión del ciclo de vida de los datos, la persistencia de información y la comunicación entre módulos del sistema. Estas decisiones son transversales a todos los dominios funcionales y complementan los requerimientos funcionales y no funcionales previamente descritos.

## Eliminación lógica (Soft Delete)

El sistema implementa una estrategia de **eliminación lógica** para todas las tablas del modelo de datos (excepto las tablas de ingestión RAW). Los registros nunca se eliminan físicamente de la base de datos; en su lugar, se marcan como eliminados mediante una columna `deleted_at` de tipo `DateTime?` (nullable).

### Justificación

- **Auditoría y trazabilidad:** permite reconstruir el historial completo de datos del sistema sin pérdida de información.
- **Recuperación:** facilita la restauración de registros eliminados por error.
- **Integridad referencial:** evita problemas de cascada al eliminar registros que son referenciados por otras entidades.
- **Cumplimiento normativo:** alineado con los requisitos de protección de datos y trazabilidad documental del sistema (Ley 1581 de 2012).

### Comportamiento

| Operación | Comportamiento |
| --- | --- |
| Eliminación de un registro | Se establece `deleted_at = timestamp_UTC_actual` en lugar de eliminar la fila |
| Consulta de registros (por defecto) | Solo retorna registros donde `deleted_at IS NULL` |
| Consulta con bypass (auditoría) | Retorna todos los registros independientemente del valor de `deleted_at` |

### Distinción con `is_active` en tablas de catálogo

Las tablas de catálogo (`DocumentType`, `PropertyType`, `Role`, `Permission`, `ContractStatus`, `PaymentStatus`, `LeaseStatus`, `ListingStatus`, `NotificationType`, entre otras) conservan su campo `is_active` existente. Ambos campos coexisten con propósitos distintos:

- `is_active`: controla la **disponibilidad de negocio** del ítem (por ejemplo, un tipo de documento que ya no se acepta pero cuyos registros históricos deben mantenerse).
- `deleted_at`: controla el **ciclo de vida del registro** en el sistema (eliminación lógica completa).

## Persistencia híbrida RAW/ETL

El sistema adopta un patrón de **persistencia híbrida** donde cada módulo de dominio almacena el payload completo de cada operación de escritura en una tabla RAW (JSON/JSONB) y posteriormente un proceso ETL programado (cron) descompone ese payload en las tablas curadas tipadas del módulo.

### Flujo de materialización

1. **Ingesta:** el módulo recibe una petición de escritura y persiste el payload completo como un objeto JSON/JSONB en su tabla RAW correspondiente (por ejemplo, `UsersRaw`, `PortfolioRaw`, `ContractsRaw`).
2. **ETL (Materialización):** un cron job lee los registros no procesados de la tabla RAW y los descompone en filas de las tablas curadas con columnas tipadas.
3. **Marcado:** el registro RAW se marca como procesado (`processed: true`) una vez materializado exitosamente.

### Reglas de implementación

- **Nunca se utiliza `JSON.stringify()`** al escribir en tablas RAW. El objeto se pasa directamente al campo de tipo JSON de Prisma.
- Un solo registro RAW puede generar múltiples filas en distintas tablas curadas (por ejemplo, un `UsersRaw` se materializa en `User`, `UserRole` y `NaturalPersonDetail`).
- Los servicios ETL utilizan un helper `parsePayload<T>()` para manejar tanto payloads JSON nativos como payloads legacy almacenados como cadenas de texto.

## Comunicación interna entre módulos

El sistema sigue una arquitectura de monolito modular donde cada módulo opera dentro de su propio esquema PostgreSQL. La comunicación entre módulos se realiza exclusivamente a través de **interfaces de puerto** (port interfaces) definidas en la capa de dominio de cada módulo e inyectadas mediante el sistema de dependencias de NestJS.

### Principios

- **No se permiten consultas SQL directas** que crucen los límites de esquema de otro módulo.
- Cada módulo que expone datos para consumo externo define una **interfaz de puerto** en `domain/ports/`.
- La implementación concreta reside en la capa de infraestructura del módulo proveedor, utilizando consultas exclusivamente contra su propio esquema.
- Los módulos consumidores acceden a los datos inyectando el token de la interfaz correspondiente.
- Las llamadas son **invocaciones síncronas de métodos de servicio** dentro del monolito (no llamadas HTTP), preservando el rendimiento mientras se mantienen los límites de módulo.

### Ejemplo

El módulo de usuarios necesita verificar si un usuario tiene arriendos activos. En lugar de ejecutar una consulta SQL contra el esquema `landlord_portfolio`, el módulo de usuarios inyecta la interfaz `IPortfolioCrossModuleQuery` expuesta por el módulo `landlord-portfolio`, que internamente ejecuta la consulta contra su propio esquema y retorna el resultado.