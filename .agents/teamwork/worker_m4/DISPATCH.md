## 2026-11-07T13:11:34Z
You are Worker M4 for Milestone 4 (Unidad de Trabajo 2: UI/UX, Accesibilidad & Design System) in 247 STUDIO.

Working directory: c:\Desktop\247 STUDIO
Your state folder: c:\Desktop\247 STUDIO\.agents\teamwork\worker_m4
Project specification: c:\Desktop\247 STUDIO\.agents\teamwork\orchestrator_gen1\PROJECT.md
Original request: c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md
Survey report: c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_3\handoff.md

Domain skills to consult and apply:
- c:\Desktop\247 STUDIO\.agents\skills\frontend-design\SKILL.md
- c:\Desktop\247 STUDIO\.agents\skills\web-design-guidelines\SKILL.md
- c:\Desktop\247 STUDIO\.agents\skills\vercel-react-best-practices\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement all tasks of Unidad de Trabajo 2 (Tareas 2.1, 2.2, 2.3) in strict detail:

1. Tarea 2.1: Navegación Móvil en AdminLayout, Herramientas de Tatami en AppLayout y Grid responsive:
   - `src/widgets/AdminLayout.tsx`:
     - Implement a collapsible mobile drawer for screens < 768px (`md:`).
     - Add a top mobile header with hamburger menu button (`Menu` / `X` icon from `lucide-react`) to toggle the admin navigation sheet/drawer.
     - On desktop (>= 768px), keep the standard desktop sidebar intact.
   - `src/widgets/AppLayout.tsx`:
     - In the mobile drawer (`mobileDrawerOpen`), integrate the 6 tatami tools that are currently only visible on desktop (Cronómetro Sparring, Calculadora IBJJF, Currículum BJJ, Diario de Sparring, Hoja de Ruta Cinturón, Primeros Auxilios). Ensure mobile users can open and use each of these tools.
   - `src/widgets/BeltStatisticsCard.tsx`:
     - Change the belt grid from rigid `grid-cols-3` to responsive `grid-cols-2 sm:grid-cols-3` so it renders gracefully without overlapping text or breaking on narrow screens (< 375px).

2. Tarea 2.2: Accesibilidad WCAG AA, Teclado y prefers-reduced-motion:
   - `src/widgets/BeltStatisticsCard.tsx`:
     - Make belt items accessible interactive elements: add `role="button"`, `tabIndex={0}`, `aria-pressed={selectedBelt === belt}`, `aria-label={...}`, and `onKeyDown` handler supporting `Enter` and `Space` keys to select the belt.
   - `src/widgets/FifaFighterCard.tsx`:
     - Make the interactive card container accessible: add `role="button"`, `tabIndex={0}`, descriptive `aria-label`, and `onKeyDown` handler for `Enter` and `Space` to flip/interact with the card.
     - Respect user motion preference: import `useReducedMotion` from `framer-motion`. When `shouldReduceMotion` is true, disable or simplify the continuous 3D card tilt/flip animations to protect users with vestibular sensitivity.
   - `src/pages/app-perfil/ProfilePage.tsx`:
     - Add clear `aria-label` attributes to icon-only buttons (camera upload button, card preview button, etc.).
     - Ensure all `<label>` elements have `htmlFor` matching the `id` of their corresponding form `<input>` (Alias, Email de contacto, Teléfono, Email de autenticación, Contacto de emergencia, etc.).
   - `src/pages/app-horario/SchedulePage.tsx`:
     - Add `aria-label` to the booking cancellation button (`X`).
     - Add `aria-pressed` and accessible labels to the day and discipline filter buttons.

3. Tarea 2.3: Skeletons Anti-CLS, Filtrado de Clases por Día Actual, Borde SVG y Toasts:
   - `src/pages/app-home/HomePage.tsx`:
     - Replace the full-page centered spinner with animated Bento Skeletons (`animate-pulse`) that mimic the shape and layout of the real cards (Schedule Bento, Stats Bento, Card Bento) to eliminate Cumulative Layout Shift (CLS).
     - In "Otras sesiones programadas hoy": filter schedules strictly by the current day of the week (using current date/weekday in Madrid time) instead of arbitrary `schedules.slice(1, 3)`.
     - In "Horas de Tatami Este Mes": calculate attended classes for the current calendar month only (matching `reportMonth`), rather than total lifetime `bookings.length`.
   - `src/pages/app-horario/SchedulePage.tsx`:
     - Replace the timetable loading spinner with a responsive skeleton grid of class cards to eliminate timetable CLS.
   - `src/pages/public-landing/LandingPage.tsx`:
     - In the weekly schedule section, remove the artificial `.slice(0, 10)` limit so that all active classes for the entire week are displayed without hiding Thursday/Friday/weekend sessions.
   - `src/pages/app-perfil/ProfilePage.tsx`:
     - Clean and unify the `QrCodePassCard` modal: remove the redundant outer white container/borders/duplicate close buttons around `QrCodePassCard` so it renders cleanly and seamlessly inside `DialogContent`.
   - `src/widgets/FifaFighterCard.tsx`:
     - Add a continuous SVG perimeter vector border `<svg className="absolute inset-0 pointer-events-none w-full h-full"><polygon points="..." vectorEffect="non-scaling-stroke" ... /></svg>` that exactly matches the angled bevel of `clipPath: 'polygon(14% 0%, 86% 0%, 100% 8%, 100% 90%, 50% 100%, 0% 90%, 0% 8%)'`, solving cut-off CSS border corners.

VERIFICATION CONSTRAINT:
- Run `npx vite build` to ensure the entire application compiles cleanly with exit code 0.
- STRICTLY FORBIDDEN: DO NOT run vitest, npm test, or any automated test runners.

Write your handoff report to `c:\Desktop\247 STUDIO\.agents\teamwork\worker_m4\handoff.md`.
Send a message when you are done.
