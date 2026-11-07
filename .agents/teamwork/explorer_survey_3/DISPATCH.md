## 2026-11-07T11:50:25Z
You are Survey Explorer 3 for 247 STUDIO.
Your working directory is: c:\Desktop\247 STUDIO
Your state folder is: c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_3
Original request file: c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read the entire c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md before doing any work.

YOUR SCOPE:
Exclusively investigate and map the technical landscape for:
1. R4: Unidad de Trabajo 1 (ERP & Lógica de Negocio Gym):
   - Tarea 1.1 (Sustitución de modales y alertas por Radix Dialog):
     - Check `@/shared/ui/dialog` implementation and usage.
     - Inspect `alert()`, `confirm()`, `prompt()` and custom `fixed inset-0` modal divs in:
       - `src/pages/admin-personal/PersonalPage.tsx` (`handleFreezeUser`, `handleDeactivateUser`)
       - `src/pages/admin-asistencia/AttendanceAdminPage.tsx`
       - `src/pages/admin-caja/CajaPage.tsx` (TPV modal, rejection modal)
       - `src/pages/admin-horarios/SchedulesAdminPage.tsx` and `src/pages/admin-tarifas/TariffsAdminPage.tsx`
   - Tarea 1.2 (Desactivación de Datos Mock por Defecto en Producción y Sincronización users ↔ kiosk_members):
     - `src/pages/admin-personal/PersonalPage.tsx`: examine `includeMockAthletes` (set default to false) and artificial belt numbers.
     - `src/widgets/KokoroAssistant.tsx`: examine metric initialization (set to 0, remove `SAMPLE_ATHLETES_20[0]`).
     - Sincronización `kiosk_members` (`belt`, `stripes`, `fullName`, `accountStatus`) on student update/graduation in `src/pages/admin-personal/PersonalPage.tsx` and `src/pages/admin-asistencia/AttendanceAdminPage.tsx`.
   - Tarea 1.3 (Graduación BJJ Acumulada desde beltDate):
     - `src/pages/admin-asistencia/AttendanceAdminPage.tsx`: examine GRADUATIONS tab, compute accumulated attendances from `user.beltDate` using `evaluateGraduationProgress` in `src/shared/domain/graduation.ts`.
   - Tarea 1.4 (Conciliación Financiera CajaPage ↔ TariffsAdminPage, Bono PASS y Pausa FROZEN):
     - `src/pages/admin-caja/CajaPage.tsx`: suggested prices and TPV options aligned with official tariffs catalog (`DEFAULT_OFFICIAL_TARIFFS` / `tariffs` collection: STD 75 €, SF 60 €, FAM 55 €, Bono 10 sesiones 110 €).
     - `handleApproveFreeze` in `src/pages/admin-caja/CajaPage.tsx`: set `accountStatus: 'FROZEN'` in `users/{uid}` and `accountStatus: 'PAUSED'` in `kiosk_members/{uid}`.
     - `src/pages/admin-asistencia/AttendanceAdminPage.tsx`: fix `bookedCount` toggle (`increment(newStatus === 'ATTENDED' ? 1 : -1)`).
   - Tarea 1.5 (Embudo de Leads y Validaciones de Kiosco):
     - `src/pages/kiosk-checkin/KioskCheckinPage.tsx`: `getNextClass()` fallback for active class, access validation, `source: 'KIOSK'` on quick test trial.
     - `src/pages/admin-leads/LeadsAdminPage.tsx`: navigation state/query to `/admin/alta-alumno` (`src/pages/admin-alta-alumno/StudentRegistrationPage.tsx`) to auto-fill form, and mark lead as `CONVERTED` upon completion.

2. R5: Unidad de Trabajo 2 (UI/UX, Accesibilidad & Design System):
   - Tarea 2.1 (Navegación Móvil en AdminLayout, Herramientas de Tatami en AppLayout y Grid responsive):
     - `src/widgets/AdminLayout.tsx`: collapsible mobile drawer (< 768px).
     - `src/widgets/AppLayout.tsx`: 6 tatami tools in mobile drawer (*Currículum BJJ*, *Diario de Sparring*, *Hoja de Ruta*, *Primeros Auxilios*, etc.).
     - `src/widgets/BeltStatisticsCard.tsx`: responsive grid `grid-cols-2 sm:grid-cols-3` for < 375px.
   - Tarea 2.2 (Accesibilidad WCAG AA, Teclado y prefers-reduced-motion):
     - `src/widgets/BeltStatisticsCard.tsx` and `src/widgets/FifaFighterCard.tsx`: `role="button"`, `tabIndex={0}`, `aria-pressed`, keyboard (`Enter`/`Space`), `useReducedMotion()` in 3D flip.
     - `src/pages/app-perfil/ProfilePage.tsx` and `src/pages/app-horario/SchedulePage.tsx`: `aria-label` for icon buttons, `htmlFor`/`id` labels.
   - Tarea 2.3 (Skeletons Anti-CLS, Filtrado de Clases por Día Actual, Borde SVG y Toasts):
     - `src/pages/app-home/HomePage.tsx` and `src/pages/app-horario/SchedulePage.tsx`: Bento skeletons replacing full spinners.
     - `src/pages/app-home/HomePage.tsx`: filter "Otras sesiones programadas hoy" by current day of week and dynamic real counters.
     - `src/pages/public-landing/LandingPage.tsx`: show all active classes of the week without `.slice(0, 10)`.
     - `src/pages/app-perfil/ProfilePage.tsx`: clean unified modal for `QrCodePassCard` without redundant white box.
     - `src/widgets/FifaFighterCard.tsx`: continuous vector border `<svg><polygon /></svg>` matching clipPath.

CONSTRAINTS:
- You are read-only. NEVER write or modify application source code.
- Write your comprehensive survey report to `c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_3\handoff.md`.
- Provide exact file paths, line numbers, current implementations, and precise recommendations for the Worker.
- When finished, send a message to the orchestrator summarizing your findings and pointing to your handoff file.
