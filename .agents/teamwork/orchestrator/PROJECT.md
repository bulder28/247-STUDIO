# Project: 247 STUDIO Production Readiness & Handover

## Architecture
247 STUDIO is a martial arts academy management application built with React 19, TypeScript, Vite, Tailwind CSS, Radix UI, and Firebase (Firestore, Auth).
- **Core Layers**:
  - `src/app`: Application entry point, global providers (`AuthProvider`), router.
  - `src/pages`: Feature pages categorized into public (`public-login`, `public-landing`), student app (`app-home`, `app-horario`, `app-perfil`), kiosk (`kiosk-checkin`), and administration (`admin-*`).
  - `src/widgets`: Shared macro-components and layouts (`AdminLayout`, `AppLayout`, `KokoroAssistant`, `PhotoUploaderModal`, `FifaFighterCard`, `BeltStatisticsCard`).
  - `src/shared`: Domain logic (`domain/graduation.ts`, `domain/auth.ts`, `domain/models.ts`), Firebase configuration (`firebase.ts`), UI primitives (`ui/dialog.tsx`), and utility generators (`cardDownloader.ts`, `receiptGenerator.ts`, `diplomaGenerator.ts`, `attendanceSheetGenerator.ts`).
  - `netlify/functions`: Serverless functions (e.g., `kokoro-ai.mjs`) proxying secure backend capabilities (Gemini API).
  - `firestore.rules`: Declarative security rules governing Firestore access, RBAC, document validation, and rate limits.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Skills Setup & Verification | Verify GitHub and local agent skills | M0 | R1 |
| 2 | Photo Upload & Canvas Compression | Canvas compression <50KB, firestore.rules update for base64 photoUrl, student write in kiosk_members | M1 (U3) | R2.Tarea 3.1 |
| 3 | RBAC & class_capacity Security | Class capacity schema validation in firestore.rules, no phantom active in AuthProvider, restrict Kokoro mass reads | M1 (U3) | R2.Tarea 3.1 |
| 4 | RGPD Health & Minor Consent | Add medical notes form fields, consent checkbox, and `medicalConsentAt: serverTimestamp()` | M1 (U3) | R2.Tarea 3.2 |
| 5 | Gemini API Key Serverless Proxy | Hide settings for non-admin in KokoroAssistant, create `netlify/functions/kokoro-ai.mjs` with dev fallback | M1 (U3) | R2.Tarea 3.3 |
| 6 | Domain Decoupling & Handover .com | Dynamic hostnames in LoginPage & KioskCheckinPage, update .env.example & netlify.toml security headers | M1 (U3) | R2.Tarea 3.4 |
| 7 | Network Waterfall Elimination | Parallelize getDocs with Promise.all in 5 pages, atomic writeBatch in AttendanceAdminPage | M2 (U4) | R3.Tarea 4.1 |
| 8 | Full Collection Scans Elimination | Filter bookings by 60d in PersonalPage, local state updates in CajaPage, in-memory cache in KioskCheckinPage | M2 (U4) | R3.Tarea 4.2 |
| 9 | Dynamic Imports & Bundle Optimization | Dynamic import for jspdf/html2canvas, React.lazy for FighterCard/QrCameraScanner, drop firebase-admin, manual chunks | M2 (U4) | R3.Tarea 4.3 |
| 10 | Algorithmic Optimization O(U+B) | Pre-index bookings map with useMemo in PersonalPage to achieve O(1) lookups | M2 (U4) | R3.Tarea 4.4 |
| 11 | Radix Dialog Modal Migration | Replace window.alert/confirm/prompt and raw modal divs with Radix Dialog across 5 admin pages | M3 (U1) | R4.Tarea 1.1 |
| 12 | Mock Data Disabling & Kiosk Sync | Disable mock athletes default, zero Kokoro metrics, sync belt/stripes/fullName/accountStatus to kiosk_members | M3 (U1) | R4.Tarea 1.2 |
| 13 | Accumulated BJJ Graduation Progress | Calculate graduation progress from user.beltDate using evaluateGraduationProgress in AttendanceAdminPage | M3 (U1) | R4.Tarea 1.3 |
| 14 | Financial Reconciliation & FROZEN Status | Align CajaPage TPV with official tariffs, set accountStatus FROZEN in users and PAUSED in kiosk_members, fix bookedCount toggle | M3 (U1) | R4.Tarea 1.4 |
| 15 | Leads Funnel & Kiosk Validations | Fallback getNextClass in kiosk, pass lead query/state to StudentRegistrationPage and mark CONVERTED | M3 (U1) | R4.Tarea 1.5 |
| 16 | Responsive Mobile Navigation | Collapsible mobile drawer in AdminLayout, tatami tools in AppLayout drawer, responsive belt stats grid | M4 (U2) | R5.Tarea 2.1 |
| 17 | WCAG AA & Reduced Motion | Keyboard navigation and ARIA in BeltStatisticsCard & FifaFighterCard, respect reduced motion, form label bindings | M4 (U2) | R5.Tarea 2.2 |
| 18 | Skeletons Anti-CLS & Visual Polish | Bento skeletons in HomePage & SchedulePage, current day filtering, landing schedule un-truncate, SVG vector border | M4 (U2) | R5.Tarea 2.3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Skills Verification | Verify and load GitHub and local skills | none | DONE |
| M1 | Unidad 3: Seguridad Cloud, Firebase, RGPD & Handover .com | Tareas 3.1, 3.2, 3.3, 3.4 | M0 | DONE |
| M2 | Unidad 4: Arquitectura React & Rendimiento Firestore | Tareas 4.1, 4.2, 4.3, 4.4 | M1 | DONE |
| M3 | Unidad 1: ERP & Lógica de Negocio Gym | Tareas 1.1, 1.2, 1.3, 1.4, 1.5 | M2 | IN_PROGRESS |
| M4 | Unidad 2: UI/UX, Accesibilidad & Design System | Tareas 2.1, 2.2, 2.3 | M3 | PLANNED |
| M5 | Final Verification & Handover | Full project `npx vite build` verification & final delivery report | M4 | PLANNED |

## Interface Contracts
### Client ↔ Serverless Proxy (`/.netlify/functions/kokoro-ai`)
- Request: POST JSON `{ prompt: string, history?: Array<{ role: string, parts: Array<{ text: string }> }>, role?: string }`
- Response: JSON `{ text: string }` or `{ error: string }`
- Dev Fallback: If function unavailable or in local dev without netlify functions server, fallback directly to `geminiClient` if `VITE_GEMINI_API_KEY` is present.

### Firestore Rules & Photo Storage
- Photo URL: supports HTTPS URLs (`isValidHttpsUrl`) OR Base64 image data URIs up to 70KB (`isValidPhotoUrl`).
- Kiosk Members Sync: Students can update their own `photoUrl`, `updatedAt` in `kiosk_members/{uid}` when authenticated. Admins have full access.
- Class Capacity: Write requires valid `scheduleId`, `date` (YYYY-MM-DD), `bookedCount` >= 0, `waitlistCount` >= 0, `updatedAt == request.time`.

### Lead Conversion Contract (`LeadsAdminPage` → `StudentRegistrationPage`)
- Navigation State / Query Params: `{ leadId, fullName, email, phone, notes }`.
- On successful student creation in `StudentRegistrationPage`, update `leads/{leadId}` with `{ status: 'CONVERTED', convertedAt: serverTimestamp(), studentUid: newUid }`.

### User ↔ Kiosk Member Sync Contract
- Whenever user belt, stripes, fullName, or accountStatus changes:
  - In `users/{uid}`: update fields.
  - In `kiosk_members/{uid}`: update corresponding fields (`belt`, `stripes`, `fullName`, `accountStatus` where FROZEN in users maps to PAUSED in kiosk_members).

## Code Layout
- `src/widgets/PhotoUploaderModal.tsx` — Canvas photo compression
- `src/pages/app-perfil/ProfilePage.tsx` — Profile photo upload & QR modal
- `firestore.rules` — Security rules and schema constraints
- `src/app/providers/AuthProvider.tsx` — Authentication & RBAC state
- `src/widgets/KokoroAssistant.tsx` — AI Assistant security & mock metrics
- `src/shared/ai/geminiClient.ts` — Gemini API client & proxy caller
- `netlify/functions/kokoro-ai.mjs` — Serverless Gemini proxy
- `netlify.toml` — Netlify configuration & security headers
- `.env.example` — Environment variable documentation
- `src/pages/public-login/LoginPage.tsx` — Login dynamic host
- `src/pages/kiosk-checkin/KioskCheckinPage.tsx` — Kiosk checkin dynamic host, caching, class fallback
- `src/pages/admin-alta-alumno/StudentRegistrationPage.tsx` — RGPD medical consent & lead pre-fill
- `src/pages/admin-personal/PersonalPage.tsx` — User management, Radix dialogs, mock athlete flag, O(U+B)
- `src/pages/admin-asistencia/AttendanceAdminPage.tsx` — Attendance batch check-in, Radix dialogs, graduation computation
- `src/pages/admin-caja/CajaPage.tsx` — Cash register, official tariffs, local state mutation, Radix dialogs
- `src/pages/admin-horarios/SchedulesAdminPage.tsx` — Schedules admin Radix dialogs
- `src/pages/admin-tarifas/TariffsAdminPage.tsx` — Tariffs admin Radix dialogs
- `src/pages/admin-leads/LeadsAdminPage.tsx` — Leads conversion flow
- `src/pages/app-home/HomePage.tsx` — Home page lazy loading, skeletons, day filtering
- `src/pages/app-horario/SchedulePage.tsx` — Schedule skeletons & accessibility
- `src/pages/public-landing/LandingPage.tsx` — Landing full schedule list
- `src/widgets/AdminLayout.tsx` — Mobile admin navigation drawer
- `src/widgets/AppLayout.tsx` — Mobile app navigation drawer & tatami tools
- `src/widgets/BeltStatisticsCard.tsx` — Belt stats accessibility & responsive grid
- `src/widgets/FifaFighterCard.tsx` — Card accessibility & vector SVG border
- `src/shared/utils/*.ts` — Dynamic imports for jspdf & html2canvas
- `package.json` & `vite.config.ts` — Dependencies and build configuration
