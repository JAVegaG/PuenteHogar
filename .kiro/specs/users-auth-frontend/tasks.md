# Plan de Implementación: Usuarios (Autenticación y Perfil) Frontend

## Visión General

Implementación del módulo frontend de Usuarios (Autenticación y Perfil) que cubre: tipos e interfaces TypeScript, funciones de validación puras, servicio de autenticación (AuthService), contexto de autenticación (AuthProvider), componente de protección de rutas, página de login, página de registro multi-paso (3 pasos), página de perfil, integración con SideMenu existente y envolvimiento del layout raíz con AuthProvider.

El orden de implementación es: (1) tipos y validación, (2) AuthService, (3) AuthProvider y ProtectedRoute, (4) página de login, (5) página de registro, (6) página de perfil, (7) integración con SideMenu y layout, (8) verificación de accesibilidad.

## Tareas

- [ ] 1. Implementar tipos, interfaces y funciones de validación
  - [ ] 1.1 Crear interfaces TypeScript del módulo users (`types.ts`)
    - Definir: `AuthUser`, `LoginRequest`, `LoginResponse`, `NaturalDetails`, `LegalDetails`, `RegisterRequest`, `UserProfile`, `DocumentType`, `RegistrationFormData`, `AuthContextValue`
    - Archivo: `src/frontend/modules/users/types.ts`
    - _Requisitos: 1.1, 2.3, 4.3, 4.4, 4.5, 4.6, 4.8_

  - [ ] 1.2 Implementar funciones de validación (`validation.ts`)
    - Implementar: `validateEmail`, `validatePassword`, `validatePasswordMatch`, `validateRequired`, `validateOnlyLetters`, `validateAlphanumeric`, `validatePhone`, `validateDocumentType`
    - Implementar validación por paso: `validateStep1`, `validateStep2`, `validateStep3`, `validateLoginForm`
    - Todos los mensajes de error en español según la tabla de reglas del diseño
    - Archivo: `src/frontend/modules/users/validation.ts`
    - _Requisitos: 3.3, 3.4, 3.5, 4.5, 4.6, 4.8, 4.10, 4.11, 9.2_


- [ ] 2. Implementar servicio de autenticación (AuthService)
  - [ ] 2.1 Crear AuthService (`shared/services/auth.ts`)
    - Implementar `login(data: LoginRequest): Promise<LoginResponse>` — `POST /auth/login`
    - Implementar `register(data: RegisterRequest): Promise<void>` — `POST /auth/register`
    - Implementar `getProfile(token: string): Promise<UserProfile>` — `GET /auth/profile` con header `Authorization: Bearer <token>`
    - Implementar `getDocumentTypes(): Promise<DocumentType[]>` — `GET /auth/document-types`
    - Usar `fetch` nativo con `Content-Type: application/json`, consistente con `shared/services/api.ts`
    - Usar `NEXT_PUBLIC_API_URL` como URL base con fallback a `http://localhost:3001`
    - Manejo de errores: 401 → "Credenciales inválidas" / "Sesión expirada", 409 → "El correo electrónico ya está registrado", 5xx → "Error del servidor. Intenta de nuevo más tarde."
    - Archivo: `src/frontend/shared/services/auth.ts`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.1, 8.2, 8.3_

- [ ] 3. Checkpoint — Verificar tipos, validación y AuthService
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [ ] 4. Implementar contexto de autenticación y protección de rutas
  - [ ] 4.1 Implementar AuthProvider y hook useAuth (`context/AuthContext.tsx`)
    - Client Component (`'use client'`) con estado `{ user: AuthUser | null, isLoading: boolean }`
    - Al montar: leer `auth_token` y `auth_user` de `localStorage`, restaurar estado, establecer `isLoading = false`
    - Función `login(accessToken, userId, roles)`: almacenar token en `localStorage` bajo `auth_token`, datos de usuario bajo `auth_user` (JSON), actualizar estado
    - Función `logout()`: eliminar `auth_token` y `auth_user` de `localStorage`, restablecer estado a anónimo, redirigir a `/auth/login` con `router.push`
    - Exponer: `user`, `isAuthenticated`, `isLoading`, `login`, `logout`
    - Archivo: `src/frontend/modules/users/context/AuthContext.tsx`
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 4.2 Implementar componente ProtectedRoute
    - Client Component que consume `useAuth()`
    - Si `isLoading`: mostrar spinner/skeleton centrado
    - Si `!isAuthenticated` y `!isLoading`: redirigir a `/auth/login`
    - Si `isAuthenticated`: renderizar `children`
    - Archivo: `src/frontend/modules/users/components/ProtectedRoute.tsx`
    - _Requisitos: 6.1, 6.2, 6.3_


- [ ] 5. Implementar página de inicio de sesión
  - [ ] 5.1 Crear página de login (`app/auth/login/page.tsx`)
    - Client Component con Header (título "Iniciar sesión", H1 32px Bold)
    - Renderizar componente `LoginForm`
    - Si usuario ya autenticado (`useAuth`), redirigir a `/explorar`
    - Archivo: `src/frontend/app/auth/login/page.tsx`
    - _Requisitos: 3.1, 3.2, 3.11, 3.12_

  - [ ] 5.2 Implementar componente LoginForm
    - Estado local: `{ mail, password, errors, serverError, isSubmitting }`
    - Validación client-side con `validateLoginForm` al submit: email (no vacío + formato) y contraseña (no vacía + ≥ 8 caracteres)
    - Mensajes de error en español debajo de cada campo (Caption 14px, color error), borde de error en campo afectado
    - Errores desaparecen al corregir el campo (`onChange`)
    - Submit: llamar `authService.login()`, en éxito invocar `login()` del AuthProvider y `router.push('/explorar')`
    - Error 401: mostrar "Correo electrónico o contraseña incorrectos" encima del formulario, sin borrar campos
    - Error de red: mostrar "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo."
    - Botón deshabilitado + spinner durante submit
    - Enlace "¿No tienes cuenta? Regístrate" → `/auth/registro`
    - Accesibilidad: labels con `htmlFor`, errores con `aria-describedby`, `aria-live="polite"` en zona de errores
    - Archivo: `src/frontend/modules/users/components/LoginForm.tsx`
    - _Requisitos: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 9.1, 9.2, 9.4, 9.7_

- [ ] 6. Checkpoint — Verificar login completo
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [ ] 7. Implementar página de registro multi-paso
  - [ ] 7.1 Crear página de registro (`app/auth/registro/page.tsx`)
    - Client Component con Header (título "Crear cuenta", H1 32px Bold, botón retorno)
    - Renderizar componente `RegistroWizard`
    - Si usuario ya autenticado (`useAuth`), redirigir a `/explorar`
    - Enlace "¿Ya tienes cuenta? Inicia sesión" → `/auth/login`
    - Archivo: `src/frontend/app/auth/registro/page.tsx`
    - _Requisitos: 4.1, 4.2, 4.19, 4.20, 4.21_

  - [ ] 7.2 Implementar componente StepIndicator
    - Props: `currentStep: number, totalSteps: number`
    - 3 círculos numerados conectados por líneas: paso actual con fondo primario, completados con check, pendientes con fondo neutral
    - Accesibilidad: `aria-current="step"` en paso actual, `aria-label="Paso X de Y"`
    - Archivo: `src/frontend/modules/users/components/StepIndicator.tsx`
    - _Requisitos: 4.1, 9.5_

  - [ ] 7.3 Implementar componente Step1UserType (Paso 1: Tipo de usuario)
    - Dos tarjetas seleccionables para rol: "Arrendador" (descripción: "Quiero publicar inmuebles en arriendo") y "Arrendatario" (descripción: "Busco un inmueble en arriendo") con icono, título y descripción
    - Selector de tipo de persona: "Persona natural" / "Persona jurídica"
    - Área táctil mínima 44×44px en tarjetas
    - Validación: tipo usuario y tipo persona seleccionados antes de avanzar
    - Archivo: `src/frontend/modules/users/components/Step1UserType.tsx`
    - _Requisitos: 4.3, 4.4, 9.3_

  - [ ] 7.4 Implementar componente Step2PersonalData (Paso 2: Datos personales)
    - Campos condicionales según `personType`: natural → firstName, lastName, preferredName (opcional); jurídica → businessName
    - Campos comunes: dropdown tipo documento (poblado desde `authService.getDocumentTypes()`), número de documento, teléfono (10 dígitos)
    - Validación: campos requeridos no vacíos, solo letras y espacios para nombres, solo alfanuméricos para documento, exactamente 10 dígitos para teléfono
    - Skeleton en dropdown mientras carga tipos de documento
    - Archivo: `src/frontend/modules/users/components/Step2PersonalData.tsx`
    - _Requisitos: 4.5, 4.6, 4.7, 4.10, 4.11, 9.1, 9.2_

  - [ ] 7.5 Implementar componente Step3Credentials (Paso 3: Credenciales)
    - Campos: email, contraseña (mínimo 8 caracteres), confirmación de contraseña
    - Validación de coincidencia en tiempo real al modificar cualquiera de los dos campos
    - Mensajes de error en español según tabla de reglas del diseño
    - Archivo: `src/frontend/modules/users/components/Step3Credentials.tsx`
    - _Requisitos: 4.8, 4.9, 4.10, 9.1, 9.2_

  - [ ] 7.6 Implementar componente RegistroWizard (orquestador multi-paso)
    - Estado local: `{ currentStep: 1|2|3, formData: RegistrationFormData, errors, serverError, isSubmitting }`
    - Navegación: botón "Continuar" valida paso actual antes de avanzar; botón retorno regresa al paso anterior o a `/auth/login` si está en paso 1
    - Preservar datos al navegar entre pasos (adelante y atrás)
    - Submit (Paso 3): construir payload `RegisterRequest` y llamar `authService.register()`
    - Éxito: mostrar mensaje de confirmación y redirigir a `/auth/login`
    - Error 409: mostrar "Este correo electrónico ya está registrado", preservar datos
    - Error 400: mostrar mensajes del backend en español
    - Error de red: mostrar mensaje de error preservando todos los datos
    - Botón "Crear cuenta" deshabilitado + spinner durante submit
    - Archivo: `src/frontend/modules/users/components/RegistroWizard.tsx`
    - _Requisitos: 4.1, 4.2, 4.10, 4.12, 4.13, 4.14, 4.15, 4.16, 4.17, 4.18, 9.7_


- [ ] 8. Checkpoint — Verificar registro completo
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [ ] 9. Implementar página de perfil
  - [ ] 9.1 Crear página de perfil (`app/mi-perfil/page.tsx`)
    - Client Component envuelto en `ProtectedRoute`
    - Header con título "Mi perfil" (H1 32px Bold), botón hamburguesa que abre SideMenu
    - Solicitar perfil al backend con `authService.getProfile(token)` usando token del AuthProvider
    - Renderizar `ProfileCard` con datos obtenidos
    - Skeleton loader mientras carga datos
    - Error de red: mostrar ErrorState con botón "Reintentar"
    - Error 401: invocar `logout()` del AuthProvider (redirige a login)
    - Archivo: `src/frontend/app/mi-perfil/page.tsx`
    - _Requisitos: 5.1, 5.2, 5.5, 5.6, 5.7_

  - [ ] 9.2 Implementar componente ProfileCard
    - Tarjeta con fondo blanco, borde `#d1d5db`, border-radius 6px
    - Avatar (64×64px, fondo `#f3f4f6`), correo electrónico (Body 16px), roles como badges (fondo `#f3f4f6`, border-radius 4px, Caption 14px), estado activo/inactivo
    - Botón "Cerrar sesión" (variante secundaria) que invoca `logout()` del AuthProvider
    - Archivo: `src/frontend/modules/users/components/ProfileCard.tsx`
    - _Requisitos: 5.3, 5.4_

- [ ] 10. Integración con SideMenu y layout raíz
  - [ ] 10.1 Integrar SideMenu con AuthProvider
    - Cuando usuario autenticado: pasar `{ name: user.userId, role: translateRole(user.roles[0]) }` al SideMenu donde `translateRole` mapea `LANDLORD` → "Arrendador", `TENANT` → "Arrendatario"
    - El enlace "Cerrar sesión" del SideMenu debe invocar `logout()` del AuthProvider en lugar de navegar directamente
    - Cuando usuario anónimo: SideMenu ya muestra enlaces de login/registro (sin cambios)
    - _Requisitos: 7.1, 7.2, 7.3, 7.4_

  - [ ] 10.2 Envolver layout raíz con AuthProvider
    - Modificar `app/layout.tsx` para envolver `{children}` con `<AuthProvider>`
    - Mantener la estructura existente (fuente Inter, idioma español, metadatos)
    - Archivo: `src/frontend/app/layout.tsx`
    - _Requisitos: 1.7, 6.4_

- [ ] 11. Verificación de accesibilidad
  - [ ] 11.1 Verificar accesibilidad en todos los componentes del módulo
    - Labels con `htmlFor` en todos los campos de formulario (login, registro)
    - Mensajes de error asociados con `aria-describedby` y anunciados con `aria-live="polite"`
    - Áreas táctiles mínimas 44×44px en botones, enlaces, tarjetas seleccionables
    - Navegación por teclado: Tab/Shift+Tab entre campos, Enter para submit, Escape para cerrar mensajes
    - StepIndicator con `aria-current="step"` y `aria-label="Paso X de Y"`
    - Contraste mínimo 4.5:1 texto/fondo para texto normal, 3:1 para texto grande
    - Atributos ARIA (`aria-live`, `aria-busy`, `role="alert"`) en estados dinámicos (carga, éxito, errores)
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 12. Auditar implementación existente del frontend (explore-properties)
  - [ ] 12.1 Revisar validación de datos en inputs existentes del módulo property-listings
    - Revisar `FilterPanel.tsx`: verificar que los campos numéricos (precio min/max, área min/max) validen tipo de dato (solo números, no letras ni caracteres especiales), que muestren mensajes de error inline cuando el valor es inválido (ej. "Solo se permiten números"), y que el borde del campo se resalte con color de error
    - Revisar que los campos de precio no acepten valores negativos y que min no sea mayor que max (mostrar mensaje "El mínimo no puede ser mayor al máximo")
    - Revisar que los campos de área no acepten valores negativos y apliquen la misma validación min ≤ max
    - Revisar que los dropdowns (ciudad, barrio, tipo propiedad, habitaciones, baños, fecha publicación) muestren un placeholder descriptivo y no envíen valores vacíos al backend
    - Aplicar correcciones donde falte validación de tipo de dato o mensajes de error inline
    - Archivos: `src/frontend/modules/property-listings/components/FilterPanel.tsx`

  - [ ] 12.2 Revisar protección contra saturación de API por keystrokes en inputs existentes
    - Verificar que los campos de texto libre en `FilterPanel` (precio min/max, área min/max) usen `useDebounce(400ms)` para evitar re-renders excesivos del estado local
    - Verificar que el patrón de acción explícita ("Aplicar filtros") esté correctamente implementado: ningún cambio individual de campo debe disparar una llamada API
    - Verificar que `useListings` use `AbortController` para cancelar requests en vuelo cuando los filtros cambian antes de que la respuesta anterior llegue
    - Verificar que el `Pagination` no dispare múltiples requests al hacer click rápido en botones de página
    - Documentar y aplicar correcciones si alguno de estos patrones no está implementado correctamente
    - Archivos: `src/frontend/modules/property-listings/components/FilterPanel.tsx`, `src/frontend/modules/property-listings/hooks/useListings.ts`, `src/frontend/modules/property-listings/hooks/useFilters.ts`

  - [ ] 12.3 Aplicar los mismos patrones de protección de API en el módulo users
    - Asegurar que los formularios de login y registro NO disparen llamadas API en cada keystroke — solo al submit explícito del formulario
    - Asegurar que el botón de submit se deshabilite durante el procesamiento para evitar doble envío
    - Asegurar que la carga de `documentTypes` en Step2 use un estado de carga y no se re-solicite innecesariamente al navegar entre pasos (cachear en el estado del RegistroWizard)
    - Asegurar que la página de perfil no re-solicite el perfil al backend en cada re-render (usar estado local o dependencia estable en el efecto)

- [ ] 13. Checkpoint final — Verificar implementación completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.
  - Confirmar que login, registro, perfil, protección de rutas e integración con SideMenu funcionan correctamente.
  - Confirmar que la auditoría del módulo explore-properties no dejó regresiones.

- [ ]* 14. Tests de propiedades (Property-Based Tests)
  - [ ]* 14.1 Escribir test de propiedad para round-trip de estado de autenticación
    - **Propiedad 1: Round-trip de estado de autenticación**
    - Para cualquier tripleta válida (accessToken, userId, roles), invocar `login()` y luego restaurar desde `localStorage` debe producir un `AuthUser` equivalente
    - Archivo: `src/frontend/modules/users/__tests__/auth-context.property.test.ts`
    - **Valida: Requisitos 1.2, 1.3, 1.4**

  - [ ]* 14.2 Escribir test de propiedad para logout limpia estado
    - **Propiedad 2: Logout limpia completamente el estado de autenticación**
    - Para cualquier estado autenticado, invocar `logout()` debe resultar en `user === null`, `isAuthenticated === false`, y `localStorage` sin claves `auth_token` ni `auth_user`
    - Archivo: `src/frontend/modules/users/__tests__/auth-context.property.test.ts`
    - **Valida: Requisito 1.5**

  - [ ]* 14.3 Escribir test de propiedad para validación de email
    - **Propiedad 3: Validación de correo electrónico**
    - Para cualquier cadena, `validateEmail` retorna `null` si y solo si no está vacía y tiene formato válido; retorna mensaje apropiado en caso contrario
    - Archivo: `src/frontend/modules/users/__tests__/validation.property.test.ts`
    - **Valida: Requisitos 3.3, 4.8**

  - [ ]* 14.4 Escribir test de propiedad para validación de contraseña
    - **Propiedad 4: Validación de contraseña**
    - Para cualquier cadena, `validatePassword` retorna `null` si y solo si tiene ≥ 8 caracteres; retorna mensaje apropiado si vacía o corta
    - Archivo: `src/frontend/modules/users/__tests__/validation.property.test.ts`
    - **Valida: Requisitos 3.4, 4.8**

  - [ ]* 14.5 Escribir test de propiedad para coincidencia de contraseñas
    - **Propiedad 5: Validación de coincidencia de contraseñas**
    - Para cualquier par de cadenas, `validatePasswordMatch` retorna `null` si y solo si son idénticas
    - Archivo: `src/frontend/modules/users/__tests__/validation.property.test.ts`
    - **Valida: Requisito 4.9**

  - [ ]* 14.6 Escribir test de propiedad para validación de teléfono
    - **Propiedad 6: Validación de número de teléfono**
    - Para cualquier cadena, `validatePhone` retorna `null` si y solo si consiste exactamente en 10 dígitos numéricos
    - Archivo: `src/frontend/modules/users/__tests__/validation.property.test.ts`
    - **Valida: Requisito 4.11**

  - [ ]* 14.7 Escribir test de propiedad para header de autorización
    - **Propiedad 7: Header de autorización en peticiones protegidas**
    - Para cualquier token no vacío, las peticiones a `getProfile` deben incluir `Authorization: Bearer <token>`
    - Archivo: `src/frontend/shared/services/__tests__/auth.property.test.ts`
    - **Valida: Requisitos 2.4, 8.1**

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia requisitos específicos del documento de requisitos para trazabilidad.
- Los checkpoints permiten validación incremental del progreso.
- Los tests de propiedades validan propiedades universales de correctitud definidas en el documento de diseño.
- Los tests unitarios validan escenarios específicos y edge cases.
- Los componentes compartidos existentes (Header, SideMenu, Button, Skeleton, EmptyState, ErrorState) se reutilizan sin modificación excepto la integración del SideMenu con AuthProvider.
- Los endpoints del backend (`POST /auth/login`, `POST /auth/register`, `GET /auth/profile`, `GET /auth/document-types`) ya están implementados.
