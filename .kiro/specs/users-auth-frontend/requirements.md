# Documento de Requisitos — Usuarios (Autenticación y Perfil) Frontend

## Introducción

Este documento especifica los requisitos para la implementación del módulo frontend de Usuarios (Autenticación y Perfil) de la plataforma de gestión de arriendo de vivienda urbana en Colombia (Valle del Cauca). El módulo permite a usuarios anónimos registrarse como arrendador o arrendatario, iniciar sesión con correo y contraseña, visualizar su perfil y gestionar su sesión JWT.

El frontend se implementa como parte de la aplicación Next.js (App Router) existente en `src/frontend/`, con Tailwind CSS y TypeScript, siguiendo un enfoque mobile-first y cumpliendo con los criterios de accesibilidad WCAG 2.1 AA. La interfaz se presenta en idioma español y consume los endpoints REST del backend NestJS existente (`POST /auth/login`, `POST /auth/register`, `GET /auth/profile`, `GET /auth/document-types`).

El módulo se integra con la estructura frontend ya implementada por el spec `explore-properties-frontend`, reutilizando el Sistema_Diseño (tokens de color, tipografía, espaciado), componentes compartidos (Header, SideMenu, Button) y la capa de servicios API.

El diseño visual de referencia se encuentra en Figma: `https://www.figma.com/design/Yw53CFbVdMWVX7bQ6MFefk/properties_rental_platform_design`

**Alcance:** Página de inicio de sesión, página de registro (formulario multi-paso), página de perfil (solo lectura), gestión de token JWT (almacenamiento, adjuntar a peticiones, cierre de sesión), contexto de autenticación (AuthProvider), integración con el Menú_Lateral existente, protección de rutas y catálogo de tipos de documento desde el backend.

**Fuera de alcance:** Recuperación de contraseña, verificación de correo electrónico, login social (Google, Facebook), rol de administrador, edición de perfil (post-MVP).

---

## Glosario

- **App_Frontend**: La aplicación Next.js (App Router) existente en `src/frontend/` que implementa la interfaz de usuario de la plataforma.
- **Módulo_Usuarios**: Conjunto de páginas, componentes, servicios y contexto de autenticación ubicados en `src/frontend/modules/users/` y `src/frontend/app/auth/`.
- **Página_Login**: Página de inicio de sesión accesible en la ruta `/auth/login` que permite autenticarse con correo electrónico y contraseña.
- **Página_Registro**: Página de registro accesible en la ruta `/auth/registro` que guía al usuario a través de un formulario multi-paso para crear una cuenta.
- **Página_Perfil**: Página protegida accesible en la ruta `/mi-perfil` que muestra la información del usuario autenticado.
- **Formulario_Registro**: Formulario multi-paso compuesto por tres pasos: selección de rol, datos personales y credenciales.
- **AuthProvider**: Componente React Context que gestiona el estado de autenticación global (usuario actual, token JWT, funciones de login/logout).
- **AuthService**: Capa de abstracción en `src/frontend/shared/services/` que encapsula las llamadas HTTP a los endpoints de autenticación del API_Backend.
- **API_Backend**: El servidor NestJS que expone los endpoints REST `/auth/login`, `/auth/register`, `/auth/profile` y `/auth/document-types`.
- **Token_JWT**: Token de acceso JSON Web Token retornado por el endpoint `POST /auth/login`, utilizado para autenticar peticiones protegidas.
- **Catálogo_Tipos_Documento**: Lista de tipos de documento válidos (CC, NIT, CE, PP, TI) retornada por `GET /auth/document-types`.
- **Menú_Lateral**: Componente SideMenu existente que muestra navegación contextual según el estado de autenticación del usuario.
- **Sistema_Diseño**: Tokens de diseño ya configurados en `tailwind.config.ts` (colores, tipografía, espaciado) y componentes compartidos (Button, Header, etc.).
- **Usuario_Anónimo**: Persona que navega la plataforma sin autenticación.
- **Usuario_Autenticado**: Persona que ha iniciado sesión y posee un Token_JWT válido.
- **Persona_Natural**: Tipo de persona física con campos firstName, lastName y preferredName opcional.
- **Persona_Jurídica**: Tipo de persona legal con campo businessName.
- **Mensaje_Error_Campo**: Texto de error en español que aparece debajo de un campo de formulario cuando la validación falla. Se muestra en tipografía Caption (14px Regular), color de estado error, asociado al campo mediante `aria-describedby`. Desaparece automáticamente cuando el usuario corrige el valor.

---

## Requisitos

### Requisito 1: Contexto de Autenticación (AuthProvider)

**User Story:** Como desarrollador, quiero un contexto de autenticación global que gestione el estado de sesión del usuario, para que todos los componentes de la aplicación puedan acceder a la información del usuario autenticado y reaccionar a cambios de sesión.

#### Criterios de Aceptación

1. THE AuthProvider SHALL almacenar el estado de autenticación del usuario actual (userId, roles, accessToken) y exponerlo a todos los componentes hijos mediante React Context.
2. THE AuthProvider SHALL persistir el Token_JWT en `localStorage` bajo la clave `auth_token` para mantener la sesión entre recargas de página.
3. WHEN la App_Frontend se carga por primera vez, THE AuthProvider SHALL verificar si existe un Token_JWT almacenado en `localStorage` y restaurar el estado de autenticación a partir de los datos almacenados.
4. THE AuthProvider SHALL exponer una función `login` que reciba la respuesta del endpoint `POST /auth/login` (accessToken, userId, roles), almacene el Token_JWT en `localStorage` y actualice el estado de autenticación.
5. THE AuthProvider SHALL exponer una función `logout` que elimine el Token_JWT de `localStorage` y restablezca el estado de autenticación a anónimo.
6. WHEN la función `logout` es invocada, THE AuthProvider SHALL redirigir al usuario a la Página_Login (`/auth/login`).
7. THE AuthProvider SHALL envolver la aplicación en el layout raíz (`app/layout.tsx`) para que el estado de autenticación esté disponible en todas las páginas.

---

### Requisito 2: Servicio de Autenticación (AuthService)

**User Story:** Como desarrollador, quiero una capa de abstracción para las llamadas a los endpoints de autenticación del backend, para mantener el código organizado y facilitar el manejo de errores.

#### Criterios de Aceptación

1. THE AuthService SHALL encapsular las llamadas HTTP al API_Backend en funciones tipadas con TypeScript para los endpoints `POST /auth/login`, `POST /auth/register`, `GET /auth/profile` y `GET /auth/document-types`.
2. THE AuthService SHALL utilizar la variable de entorno `NEXT_PUBLIC_API_URL` como URL base para todas las solicitudes al API_Backend.
3. THE AuthService SHALL definir interfaces TypeScript que reflejen la estructura de las peticiones y respuestas: `LoginRequest` (mail, password), `LoginResponse` (accessToken, userId, roles), `RegisterRequest` (fullName, userType, documentTypeCode, documentNumber, mail, phoneNumber, password, role, personType, naturalDetails, legalDetails), `UserProfile` (id, mail, roles, isActive) y `DocumentType` (code, name).
4. THE AuthService SHALL adjuntar automáticamente el header `Authorization: Bearer <token>` en las peticiones a endpoints protegidos cuando exista un Token_JWT almacenado.
5. IF una solicitud HTTP al API_Backend falla con código 401, THEN THE AuthService SHALL propagar un error con el mensaje "Credenciales inválidas" para el endpoint de login, o "Sesión expirada" para endpoints protegidos.
6. IF una solicitud HTTP al API_Backend falla con código 409, THEN THE AuthService SHALL propagar un error con el mensaje "El correo electrónico ya está registrado".
7. IF una solicitud HTTP al API_Backend falla por error de red o error del servidor (5xx), THEN THE AuthService SHALL propagar un error con un mensaje descriptivo en español que permita a los componentes consumidores mostrar retroalimentación adecuada al usuario.
8. THE AuthService SHALL utilizar la API nativa `fetch` para las solicitudes HTTP, consistente con el patrón establecido en el Servicio_API existente.

---

### Requisito 3: Página de Inicio de Sesión

**User Story:** Como usuario anónimo, quiero iniciar sesión con mi correo electrónico y contraseña, para acceder a las funcionalidades protegidas de la plataforma.

#### Criterios de Aceptación

1. WHEN un usuario accede a la ruta `/auth/login`, THE Página_Login SHALL mostrar un formulario con dos campos: correo electrónico (tipo email) y contraseña (tipo password), y un botón primario "Iniciar sesión".
2. THE Página_Login SHALL incluir un encabezado con el título "Iniciar sesión" centrado, siguiendo la jerarquía tipográfica H1 (32px Bold, color `#111827`) del Sistema_Diseño.
3. THE Página_Login SHALL validar en el cliente que el campo de correo electrónico no esté vacío y contenga un formato de email válido (patrón con `@` y dominio) antes de enviar la solicitud al API_Backend; IF el campo está vacío, THEN SHALL mostrar el mensaje "El correo electrónico es obligatorio" debajo del campo; IF el formato es inválido, THEN SHALL mostrar "Ingresa un correo electrónico válido (ej. usuario@ejemplo.com)".
4. THE Página_Login SHALL validar en el cliente que el campo de contraseña no esté vacío y contenga al menos 8 caracteres antes de enviar la solicitud al API_Backend; IF el campo está vacío, THEN SHALL mostrar "La contraseña es obligatoria" debajo del campo; IF tiene menos de 8 caracteres, THEN SHALL mostrar "La contraseña debe tener al menos 8 caracteres".
5. IF el usuario envía el formulario con campos vacíos o inválidos, THEN THE Página_Login SHALL mostrar los mensajes de error correspondientes en español debajo de cada campo afectado (tipografía Caption 14px, color de estado error), resaltar visualmente el borde del campo con color de error, y NO enviar la solicitud al API_Backend. Los mensajes de error SHALL desaparecer cuando el usuario corrige el valor del campo correspondiente.
6. WHILE la solicitud de login se está procesando, THE Página_Login SHALL deshabilitar el botón "Iniciar sesión" y mostrar un indicador de carga para comunicar al usuario que la autenticación está en progreso.
7. WHEN el API_Backend retorna una respuesta exitosa con el Token_JWT, THE Página_Login SHALL invocar la función `login` del AuthProvider y redirigir al usuario a la ruta `/explorar`.
8. IF el API_Backend retorna un error 401 (credenciales inválidas), THEN THE Página_Login SHALL mostrar un mensaje de error "Correo electrónico o contraseña incorrectos" visible encima del formulario, sin borrar los campos del formulario.
9. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Login SHALL mostrar un mensaje de error comprensible en español indicando que no se pudo conectar con el servidor, con sugerencia de reintentar.
10. THE Página_Login SHALL incluir un enlace "¿No tienes cuenta? Regístrate" debajo del formulario que navegue a la Página_Registro (`/auth/registro`).
11. THE Página_Login SHALL ser accesible sin autenticación.
12. IF un Usuario_Autenticado accede a la ruta `/auth/login`, THEN THE Página_Login SHALL redirigir automáticamente a la ruta `/explorar`.

---

### Requisito 4: Página de Registro (Formulario Multi-Paso)

**User Story:** Como usuario anónimo, quiero registrarme en la plataforma proporcionando mi rol, datos personales y credenciales en un proceso guiado paso a paso, para crear una cuenta y acceder a las funcionalidades de la plataforma.

#### Criterios de Aceptación

1. WHEN un usuario accede a la ruta `/auth/registro`, THE Página_Registro SHALL mostrar el Formulario_Registro como un proceso de tres pasos con un indicador de progreso visual que muestre el paso actual (1, 2 o 3) y los pasos restantes.
2. THE Página_Registro SHALL incluir un encabezado con el título "Crear cuenta" centrado, siguiendo la jerarquía tipográfica H1 (32px Bold, color `#111827`) del Sistema_Diseño, y un botón de retorno (flecha izquierda) que regrese al paso anterior o a la Página_Login si el usuario está en el paso 1.
3. THE Formulario_Registro SHALL presentar en el Paso 1 ("Tipo de usuario") dos opciones de selección visual: "Arrendador" (descripción: "Quiero publicar inmuebles en arriendo") y "Arrendatario" (descripción: "Busco un inmueble en arriendo"), cada una como una tarjeta seleccionable con icono, título y descripción. IF el usuario intenta avanzar al Paso 2 sin seleccionar un tipo de usuario, THEN SHALL mostrar el mensaje "Selecciona un tipo de usuario para continuar".
4. THE Formulario_Registro SHALL presentar en el Paso 1 un selector de tipo de persona con dos opciones: "Persona natural" y "Persona jurídica", visible después de seleccionar el tipo de usuario. IF el usuario intenta avanzar al Paso 2 sin seleccionar un tipo de persona, THEN SHALL mostrar el mensaje "Selecciona un tipo de persona para continuar".
5. THE Formulario_Registro SHALL presentar en el Paso 2 ("Datos personales") los campos correspondientes al tipo de persona seleccionado: para Persona_Natural los campos nombre (firstName), apellido (lastName) y nombre preferido (preferredName, opcional); para Persona_Jurídica el campo razón social (businessName). Cada campo requerido SHALL validar que no esté vacío y que contenga solo caracteres alfabéticos y espacios; IF el campo está vacío, THEN SHALL mostrar "Este campo es obligatorio"; IF contiene caracteres no permitidos (números, símbolos), THEN SHALL mostrar "Este campo solo admite letras y espacios".
6. THE Formulario_Registro SHALL presentar en el Paso 2 los campos comunes: tipo de documento (dropdown poblado desde el Catálogo_Tipos_Documento), número de documento y número de teléfono (10 dígitos). El campo tipo de documento SHALL validar que se haya seleccionado una opción; IF no se selecciona, THEN SHALL mostrar "Selecciona un tipo de documento". El campo número de documento SHALL validar que no esté vacío y contenga solo caracteres alfanuméricos; IF está vacío, THEN SHALL mostrar "El número de documento es obligatorio"; IF contiene caracteres no permitidos, THEN SHALL mostrar "El número de documento solo admite letras y números".
7. THE Formulario_Registro SHALL solicitar el Catálogo_Tipos_Documento al API_Backend mediante `GET /auth/document-types` al cargar el Paso 2 y poblar el dropdown de tipo de documento con las opciones retornadas.
8. THE Formulario_Registro SHALL presentar en el Paso 3 ("Credenciales") los campos: correo electrónico (tipo email), contraseña (tipo password, mínimo 8 caracteres) y confirmación de contraseña. El campo correo electrónico SHALL validar formato de email válido; IF está vacío, THEN SHALL mostrar "El correo electrónico es obligatorio"; IF el formato es inválido, THEN SHALL mostrar "Ingresa un correo electrónico válido (ej. usuario@ejemplo.com)". El campo contraseña SHALL validar longitud mínima de 8 caracteres; IF está vacío, THEN SHALL mostrar "La contraseña es obligatoria"; IF tiene menos de 8 caracteres, THEN SHALL mostrar "La contraseña debe tener al menos 8 caracteres". El campo confirmación de contraseña SHALL validar que coincida con el campo contraseña; IF no coincide, THEN SHALL mostrar "Las contraseñas no coinciden".
9. THE Formulario_Registro SHALL validar en el cliente que la contraseña y la confirmación de contraseña coincidan antes de permitir el envío del formulario; el mensaje de error de coincidencia SHALL actualizarse en tiempo real cuando el usuario modifica cualquiera de los dos campos.
10. THE Formulario_Registro SHALL validar en el cliente todos los campos requeridos de cada paso antes de permitir avanzar al siguiente paso, mostrando mensajes de error descriptivos en español debajo de cada campo afectado (tipografía Caption 14px, color de estado error), resaltando visualmente el borde del campo con color de error. Los mensajes de error SHALL desaparecer cuando el usuario corrige el valor del campo correspondiente.
11. THE Formulario_Registro SHALL validar en el cliente que el número de teléfono no esté vacío, contenga exactamente 10 dígitos numéricos y no contenga letras ni caracteres especiales; IF está vacío, THEN SHALL mostrar "El número de teléfono es obligatorio"; IF contiene caracteres no numéricos, THEN SHALL mostrar "El teléfono solo admite números"; IF no tiene exactamente 10 dígitos, THEN SHALL mostrar "El teléfono debe tener exactamente 10 dígitos".
12. THE Formulario_Registro SHALL preservar los datos ingresados por el usuario al navegar entre pasos (adelante y atrás) sin perder información.
13. WHEN el usuario completa el Paso 3 y presiona "Crear cuenta", THE Formulario_Registro SHALL enviar todos los datos recopilados al API_Backend mediante `POST /auth/register`.
14. WHILE la solicitud de registro se está procesando, THE Formulario_Registro SHALL deshabilitar el botón "Crear cuenta" y mostrar un indicador de carga.
15. WHEN el API_Backend retorna una respuesta exitosa de registro, THE Página_Registro SHALL mostrar un mensaje de confirmación en español y redirigir al usuario a la Página_Login.
16. IF el API_Backend retorna un error 409 (correo duplicado), THEN THE Página_Registro SHALL mostrar un mensaje de error "Este correo electrónico ya está registrado" y permitir al usuario corregir el dato sin perder los demás campos.
17. IF el API_Backend retorna un error 400 (datos inválidos), THEN THE Página_Registro SHALL mostrar los mensajes de error retornados por el backend de forma comprensible en español.
18. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Registro SHALL mostrar un mensaje de error comprensible en español indicando que no se pudo completar el registro, preservando todos los datos ingresados.
19. THE Página_Registro SHALL incluir un enlace "¿Ya tienes cuenta? Inicia sesión" debajo del formulario que navegue a la Página_Login (`/auth/login`).
20. THE Página_Registro SHALL ser accesible sin autenticación.
21. IF un Usuario_Autenticado accede a la ruta `/auth/registro`, THEN THE Página_Registro SHALL redirigir automáticamente a la ruta `/explorar`.

---

### Requisito 5: Página de Perfil de Usuario

**User Story:** Como usuario autenticado, quiero ver la información de mi perfil, para verificar mis datos de cuenta.

#### Criterios de Aceptación

1. WHEN un Usuario_Autenticado accede a la ruta `/mi-perfil`, THE Página_Perfil SHALL solicitar la información del perfil al API_Backend mediante `GET /auth/profile` con el Token_JWT en el header de autorización y mostrar los datos obtenidos.
2. THE Página_Perfil SHALL incluir un encabezado con el título "Mi perfil" centrado, siguiendo la jerarquía tipográfica H1 (32px Bold, color `#111827`) del Sistema_Diseño, y un botón de menú hamburguesa a la izquierda.
3. THE Página_Perfil SHALL mostrar la información del usuario en una tarjeta con fondo blanco, borde `#d1d5db` y border-radius 6px: un icono de avatar (64x64px, fondo `#f3f4f6`), el correo electrónico del usuario en tipografía Body (16px Regular), los roles del usuario como badges (fondo `#f3f4f6`, border-radius 4px, tipografía Caption 14px) y el estado de la cuenta (activo/inactivo).
4. THE Página_Perfil SHALL incluir un botón "Cerrar sesión" (variante secundaria) que invoque la función `logout` del AuthProvider.
5. WHILE los datos del perfil se están cargando desde el API_Backend, THE Página_Perfil SHALL mostrar un indicador de carga visual (skeleton) que comunique al usuario que los datos están siendo obtenidos.
6. IF la solicitud al API_Backend falla por error de red o error del servidor, THEN THE Página_Perfil SHALL mostrar un mensaje de error comprensible en español con una opción para reintentar la carga.
7. IF el Token_JWT es inválido o ha expirado (error 401), THEN THE Página_Perfil SHALL invocar la función `logout` del AuthProvider, lo cual redirigirá al usuario a la Página_Login.

---

### Requisito 6: Protección de Rutas

**User Story:** Como plataforma, quiero que las páginas protegidas solo sean accesibles para usuarios autenticados, para garantizar la seguridad de la información y funcionalidades restringidas.

#### Criterios de Aceptación

1. WHEN un Usuario_Anónimo intenta acceder a la ruta `/mi-perfil`, THE App_Frontend SHALL redirigir automáticamente a la Página_Login (`/auth/login`).
2. THE App_Frontend SHALL implementar un componente o mecanismo de protección de rutas reutilizable que verifique la existencia de un Token_JWT válido en el AuthProvider antes de renderizar el contenido de una página protegida.
3. WHILE el AuthProvider está verificando el estado de autenticación durante la carga inicial, THE App_Frontend SHALL mostrar un indicador de carga en las rutas protegidas en lugar de redirigir prematuramente a la Página_Login.
4. THE App_Frontend SHALL permitir el acceso sin autenticación a las rutas públicas: `/explorar`, `/explorar/[id]`, `/auth/login` y `/auth/registro`.

---

### Requisito 7: Integración con Menú Lateral

**User Story:** Como usuario, quiero que el menú lateral refleje mi estado de autenticación, para ver mis opciones de navegación relevantes y poder cerrar sesión.

#### Criterios de Aceptación

1. WHEN un Usuario_Autenticado abre el Menú_Lateral, THE Menú_Lateral SHALL mostrar el nombre del usuario y su rol (traducido a español: "Arrendador" para LANDLORD, "Arrendatario" para TENANT) en la sección de información de usuario.
2. WHEN un Usuario_Autenticado presiona "Cerrar sesión" en el Menú_Lateral, THE Menú_Lateral SHALL invocar la función `logout` del AuthProvider.
3. WHEN un Usuario_Anónimo abre el Menú_Lateral, THE Menú_Lateral SHALL mostrar los enlaces "Iniciar sesión" (navega a `/auth/login`) y "Registrarse" (navega a `/auth/registro`) en lugar de la información de usuario y el enlace de cerrar sesión.
4. THE Menú_Lateral SHALL consumir el estado de autenticación del AuthProvider para determinar dinámicamente qué contenido mostrar.

---

### Requisito 8: Gestión de Token JWT en Peticiones HTTP

**User Story:** Como plataforma, quiero que el token JWT se adjunte automáticamente a las peticiones HTTP protegidas, para autenticar al usuario sin intervención manual en cada llamada.

#### Criterios de Aceptación

1. THE AuthService SHALL adjuntar el header `Authorization: Bearer <accessToken>` en todas las peticiones HTTP dirigidas a endpoints protegidos del API_Backend cuando exista un Token_JWT almacenado en el AuthProvider.
2. IF una petición HTTP a un endpoint protegido retorna un error 401, THEN THE AuthService SHALL invocar la función `logout` del AuthProvider para limpiar la sesión expirada y redirigir al usuario a la Página_Login.
3. THE AuthService SHALL utilizar el Token_JWT almacenado en `localStorage` como fuente de verdad para el header de autorización, garantizando consistencia entre pestañas del navegador.

---

### Requisito 9: Accesibilidad WCAG 2.1 AA en Módulo de Usuarios

**User Story:** Como usuario con diversas capacidades, quiero que las páginas de autenticación y perfil sean accesibles, para poder registrarme, iniciar sesión y ver mi perfil sin barreras de interacción.

#### Criterios de Aceptación

1. THE Módulo_Usuarios SHALL garantizar que todos los campos de formulario (login, registro) tengan etiquetas (`label`) asociadas programáticamente mediante el atributo `htmlFor` o `aria-label`.
2. THE Módulo_Usuarios SHALL garantizar que todos los mensajes de error de validación estén asociados a sus campos correspondientes mediante `aria-describedby` y sean anunciados a tecnologías asistivas mediante `aria-live="polite"`.
3. THE Módulo_Usuarios SHALL garantizar que todos los elementos interactivos (botones, enlaces, campos de formulario, tarjetas seleccionables) tengan un área táctil mínima de 44x44 píxeles.
4. THE Módulo_Usuarios SHALL garantizar que la navegación por teclado funcione correctamente en todos los formularios: Tab para avanzar entre campos, Shift+Tab para retroceder, Enter para enviar el formulario y Escape para cerrar mensajes de error.
5. THE Módulo_Usuarios SHALL garantizar que el indicador de progreso del Formulario_Registro sea accesible, comunicando el paso actual y el total de pasos a tecnologías asistivas mediante atributos `aria-current` y `aria-label`.
6. THE Módulo_Usuarios SHALL aplicar la paleta de colores del Sistema_Diseño garantizando un contraste mínimo de 4.5:1 entre texto y fondo para texto normal, y de 3:1 para texto grande.
7. THE Módulo_Usuarios SHALL utilizar atributos ARIA (`aria-live`, `aria-busy`, `role="alert"`) para comunicar estados dinámicos como la carga de datos, mensajes de éxito de registro y errores de autenticación a tecnologías asistivas.
