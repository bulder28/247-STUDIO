# Dispatch Messages

## 2026-11-07T11:48:16Z

Ejecutar las 4 Unidades de Trabajo completas en orden estricto (Unidad 3 → Unidad 4 → Unidad 1 → Unidad 2) e instalar y verificar las skills de GitHub y locales, preparando la aplicación 247 STUDIO para producción y el traspaso (handover) limpio de Firebase y Netlify al cliente final con dominio .com.

Working directory: c:\Desktop\247 STUDIO
Teamwork state folder: c:\Desktop\247 STUDIO\.agents\teamwork\orchestrator
Original request file: c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md
Integrity mode: development

## Requirements

### R1. Skills de GitHub y Locales
- Instalar y verificar desde GitHub las skills necesarias para la ejecución:
  - `npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices`
  - `npx skills add vercel-labs/agent-skills --skill web-design-guidelines`
  - `npx skills add anthropics/skills --skill frontend-design`
  - `npx skills add anthropics/skills --skill webapp-testing`
- Disponer y utilizar las skills locales disponibles en `C:\Users\nagor\.gemini\config\skills\`: `sdd-spec`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `judgment-day`, `work-unit-commits`, `chained-pr`.

### R2. Unidad de Trabajo 3: Seguridad Cloud, Firebase, RGPD & Handover .com
- **Tarea 3.1 (Compatibilidad de subida de fotos con firestore.rules y RBAC):**
  - En `src/widgets/PhotoUploaderModal.tsx` y `src/pages/app-perfil/ProfilePage.tsx`, redimensionar y comprimir fotos en canvas a un tamaño ligero (< 50KB). Ajustar `firestore.rules` y la sincronización segura para permitir que tanto alumnos como administradores puedan actualizar su foto sin incurrir en `PERMISSION_DENIED` ni exceder el límite de 1 MiB de Firestore.
  - Alinear RBAC entre `src/app/providers/AuthProvider.tsx` y `firestore.rules`, eliminar la inyección de perfiles fantasma en memoria con `accountStatus: 'ACTIVE'` en caso de fallo de escritura, proteger `class_capacity` en `firestore.rules`, y restringir las lecturas masivas de `users` y `payments` en `src/widgets/KokoroAssistant.tsx` exclusivamente a usuarios con `role === 'admin'`.
- **Tarea 3.2 (Cumplimiento RGPD Menores Art. 8 y Salud Art. 9):**
  - En `src/app/providers/AuthProvider.tsx`, no inyectar `accountStatus: 'ACTIVE'` falso en memoria.
  - En `src/pages/admin-alta-alumno/StudentRegistrationPage.tsx`, registrar `medicalConsentAt: serverTimestamp()` cuando se introduzcan notas médicas (`medicalNotes`).
- **Tarea 3.3 (Protección de API Key de Gemini en KokoroAssistant y Proxy Serverless):**
  - En `src/shared/ai/geminiClient.ts` y `src/widgets/KokoroAssistant.tsx`, ocultar el botón de configuración de API Key (`Settings`) para que nunca sea visible para alumnos (`role !== 'admin'`).
  - Añadir soporte para invocar el endpoint serverless `/.netlify/functions/kokoro-ai` creando `netlify/functions/kokoro-ai.mjs` (que lea `process.env.GEMINI_API_KEY` en el servidor) con fallback seguro en desarrollo.
- **Tarea 3.4 (Desacoplamiento de Dominios y Preparación para Handover .com en Firebase + Netlify):**
  - Reemplazar las referencias hardcodeadas a `247studio.netlify.app` en `src/pages/public-login/LoginPage.tsx` y `src/pages/kiosk-checkin/KioskCheckinPage.tsx` por `window.location.hostname` / `window.location.origin`.
  - Alinear `.env.example` con las variables documentadas para el traspaso al cliente final y reforzar `netlify.toml` con cabeceras de seguridad (`Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`) y redirecciones para funciones serverless.

### R3. Unidad de Trabajo 4: Arquitectura React & Rendimiento Firestore
- **Tarea 4.1 (Eliminación de Waterfalls de Red en Firestore con Promise.all y writeBatch):**
  - Paralelizar con `Promise.all` las consultas independientes `getDocs` en:
    - `src/pages/app-home/HomePage.tsx`
    - `src/pages/app-horario/SchedulePage.tsx`
    - `src/pages/admin-caja/CajaPage.tsx`
    - `src/pages/admin-personal/PersonalPage.tsx`
    - `src/pages/admin-asistencia/AttendanceAdminPage.tsx`, y utilizar `writeBatch(db)` en `handleCheckInAll` en lugar de `await updateDoc` secuencial dentro de bucle.
- **Tarea 4.2 (Eliminación de Escaneos Completos de Colección / Full Collection Scans):**
  - En `src/pages/admin-personal/PersonalPage.tsx`, filtrar `bookings` por ventana temporal reciente (últimos 60 días con `where('date', '>=', ...)`) en lugar de descargar todo el historial.
  - En `src/pages/admin-caja/CajaPage.tsx`, filtrar o limitar lecturas y actualizar el estado local tras aprobar o rechazar pagos sin recargar las 3 colecciones completas.
  - En `src/pages/kiosk-checkin/KioskCheckinPage.tsx`, cachear en memoria el directorio de `kiosk_members` durante la sesión del kiosco en lugar de invocar `getDocs` en cada pulsación del buscador.
- **Tarea 4.3 (Carga Dinámica await import() de Librerías Pesadas y Limpieza de package.json):**
  - Convertir a `await import('jspdf')` y `await import('html2canvas')` bajo demanda en `src/shared/utils/cardDownloader.ts`, `src/shared/utils/receiptGenerator.ts`, `src/shared/utils/diplomaGenerator.ts` y `src/shared/utils/attendanceSheetGenerator.ts`.
  - Cargar `FighterCard` con `React.lazy` en `src/pages/app-home/HomePage.tsx` y `QrCameraScanner` con `React.lazy` en `src/pages/kiosk-checkin/KioskCheckinPage.tsx`.
  - Eliminar `"firebase-admin"` de `dependencies` en `package.json` y configurar chunk isolation en `vite.config.ts`.
- **Tarea 4.4 (Optimización Algorítmica O(U + B) en PersonalPage.tsx):**
  - En `src/pages/admin-personal/PersonalPage.tsx`, pre-indexar las reservas por usuario en un `Map<string, BookingDomainModel[]>` con `useMemo` para evitar filtrar repetidamente el array global de reservas por cada usuario.

### R4. Unidad de Trabajo 1: ERP & Lógica de Negocio Gym
- **Tarea 1.1 (Sustitución de modales y alertas por Radix Dialog):**
  - Reemplazar todos los `alert()`, `confirm()`, `prompt()` y modales `div fixed` por el componente `Dialog` de `@/shared/ui/dialog` en:
    - `src/pages/admin-personal/PersonalPage.tsx` (`handleFreezeUser`, `handleDeactivateUser`).
    - `src/pages/admin-asistencia/AttendanceAdminPage.tsx`.
    - `src/pages/admin-caja/CajaPage.tsx` (modales TPV y Rechazo).
    - `src/pages/admin-horarios/SchedulesAdminPage.tsx` y `src/pages/admin-tarifas/TariffsAdminPage.tsx`.
- **Tarea 1.2 (Desactivación de Datos Mock por Defecto en Producción y Sincronización users ↔ kiosk_members):**
  - En `src/pages/admin-personal/PersonalPage.tsx`, configurar `includeMockAthletes` a `false` por defecto y eliminar los números artificiales de cinturones cuando el modo demo no esté activo.
  - En `src/widgets/KokoroAssistant.tsx`, inicializar métricas en 0 y no utilizar `SAMPLE_ATHLETES_20[0]` como usuario real.
  - Sincronizar campos de `kiosk_members` (`belt`, `stripes`, `fullName`, `accountStatus`) cuando se actualice o gradúe un alumno en `src/pages/admin-personal/PersonalPage.tsx` y `src/pages/admin-asistencia/AttendanceAdminPage.tsx`.
- **Tarea 1.3 (Graduación BJJ Acumulada desde beltDate):**
  - En `src/pages/admin-asistencia/AttendanceAdminPage.tsx`, calcular el progreso hacia el siguiente grado en la pestaña `GRADUATIONS` computando las asistencias acumuladas desde `user.beltDate` utilizando `evaluateGraduationProgress` de `src/shared/domain/graduation.ts`.
- **Tarea 1.4 (Conciliación Financiera CajaPage ↔ TariffsAdminPage, Bono PASS y Pausa FROZEN):**
  - En `src/pages/admin-caja/CajaPage.tsx`, alinear precios sugeridos y opciones TPV con el catálogo de tarifas oficiales (`DEFAULT_OFFICIAL_TARIFFS` / colección `tariffs`: STD 75 €, SF 60 €, FAM 55 €, Bono 10 sesiones 110 €).
  - En `handleApproveFreeze` (`src/pages/admin-caja/CajaPage.tsx`), actualizar `accountStatus: 'FROZEN'` en `users/{uid}` y `accountStatus: 'PAUSED'` en `kiosk_members/{uid}`.
  - En `src/pages/admin-asistencia/AttendanceAdminPage.tsx`, corregir el incremento de `bookedCount` (`increment(newStatus === 'ATTENDED' ? 1 : -1)`) al alternar asistencia.
- **Tarea 1.5 (Embudo de Leads y Validaciones de Kiosco):**
  - En `src/pages/kiosk-checkin/KioskCheckinPage.tsx`, usar `getNextClass()` como fallback de clase activa, validar acceso y registrar `source: 'KIOSK'` en alta rápida de prueba.
  - En `src/pages/admin-leads/LeadsAdminPage.tsx`, pasar los datos del lead por query/state al navegar a `/admin/alta-alumno` (`src/pages/admin-alta-alumno/StudentRegistrationPage.tsx`) para autocompletar el formulario y marcar el lead como `CONVERTED` al completar el alta.

### R5. Unidad de Trabajo 2: UI/UX, Accesibilidad & Design System
- **Tarea 2.1 (Navegación Móvil en AdminLayout, Herramientas de Tatami en AppLayout y Grid responsive):**
  - Añadir un drawer/menú móvil colapsable (< 768px) en `src/widgets/AdminLayout.tsx`.
  - Añadir las 6 herramientas de tatami (*Currículum BJJ*, *Diario de Sparring*, *Hoja de Ruta*, *Primeros Auxilios*, etc.) al drawer móvil de `src/widgets/AppLayout.tsx`.
  - Ajustar `src/widgets/BeltStatisticsCard.tsx` a `grid-cols-2 sm:grid-cols-3` para pantallas < 375px.
- **Tarea 2.2 (Accesibilidad WCAG AA, Teclado y prefers-reduced-motion):**
  - Añadir `role="button"`, `tabIndex={0}`, `aria-pressed` y soporte de teclado (`Enter`/`Space`) en las tarjetas de `src/widgets/BeltStatisticsCard.tsx` y en `src/widgets/FifaFighterCard.tsx`, respetando `useReducedMotion()` en el giro 3D.
  - Añadir `aria-label` a los botones de iconos y vincular `htmlFor`/`id` en `src/pages/app-perfil/ProfilePage.tsx` y `src/pages/app-horario/SchedulePage.tsx`.
- **Tarea 2.3 (Skeletons Anti-CLS, Filtrado de Clases por Día Actual, Borde SVG y Toasts):**
  - Reemplazar spinners de carga de pantalla completa por Skeletons Bento en `src/pages/app-home/HomePage.tsx` y `src/pages/app-horario/SchedulePage.tsx`.
  - En `src/pages/app-home/HomePage.tsx`, filtrar `"Otras sesiones programadas hoy"` por el día de la semana actual y mostrar contadores dinámicos reales.
  - En `src/pages/public-landing/LandingPage.tsx`, mostrar todas las clases activas de la semana sin truncar con `.slice(0, 10)`.
  - En `src/pages/app-perfil/ProfilePage.tsx`, unificar el modal de `QrCodePassCard` sin contenedor blanco redundante.
  - En `src/widgets/FifaFighterCard.tsx`, añadir un borde vectorial `<svg><polygon /></svg>` continuo que acompañe el bisel `clipPath`.

### R6. Restricciones de Verificación, Secuencia y Alcance
- **Secuencia estricta de ejecución:** Completar las unidades en orden secuencial obligatorio: Unidad 3 → Unidad 4 → Unidad 1 → Unidad 2.
- **Exclusión total de tests:** NO ejecutar `vitest`, `npm test` ni ningún test runner automatizado.
- **Verificación técnica única:** La verificación debe realizarse exclusivamente ejecutando `npx vite build`.
- **Backlog:** El módulo de Power BI (`.pbip` con `powerbi-report-authoring`) se mantiene en el Backlog y NO debe implementarse en esta iteración.