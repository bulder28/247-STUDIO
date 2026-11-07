## 2026-11-07T12:19:48Z
You are Worker M2 for 247 STUDIO.
Your working directory is: c:\Desktop\247 STUDIO
Your state folder is: c:\Desktop\247 STUDIO\.agents\teamwork\worker_m2
Original request file: c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md
Project specification: c:\Desktop\247 STUDIO\.agents\teamwork\orchestrator\PROJECT.md
Explorer handoff report: c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_2\handoff.md

MANDATORY FIRST STEP: Read c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_2\handoff.md before implementing any changes.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SCOPE OF WORK: Unidad de Trabajo 4: Arquitectura React & Rendimiento Firestore:
1. Tarea 4.1 (Eliminación de Waterfalls de Red en Firestore con Promise.all y writeBatch):
   - Parallelize with `Promise.all` independent `getDocs` queries in:
     - `src/pages/app-home/HomePage.tsx`
     - `src/pages/app-horario/SchedulePage.tsx`
     - `src/pages/admin-caja/CajaPage.tsx`
     - `src/pages/admin-personal/PersonalPage.tsx`
     - `src/pages/admin-asistencia/AttendanceAdminPage.tsx`
   - In `src/pages/admin-asistencia/AttendanceAdminPage.tsx` (`handleCheckInAll`), replace the sequential loop `await updateDoc` with atomic `writeBatch(db)`.
2. Tarea 4.2 (Eliminación de Escaneos Completos de Colección / Full Collection Scans):
   - In `src/pages/admin-personal/PersonalPage.tsx`: filter `bookings` query by recent time window (last 60 days with `where('date', '>=', minDateStr)`), ensuring compatibility with retention risk calculations.
   - In `src/pages/admin-caja/CajaPage.tsx`: update local React state directly upon payment approval/rejection without re-fetching all 3 full collections.
   - In `src/pages/kiosk-checkin/KioskCheckinPage.tsx`: cache in memory the `kiosk_members` directory during the kiosk session instead of invoking `getDocs` on every keystroke in search.
3. Tarea 4.3 (Carga Dinámica await import() de Librerías Pesadas y Limpieza de package.json):
   - Convert `jspdf` and `html2canvas` to on-demand `await import('jspdf')` and `await import('html2canvas')` in:
     - `src/shared/utils/cardDownloader.ts`
     - `src/shared/utils/receiptGenerator.ts`
     - `src/shared/utils/diplomaGenerator.ts`
     - `src/shared/utils/attendanceSheetGenerator.ts`
   - Use `React.lazy` with `<Suspense>` for:
     - `FighterCard` in `src/pages/app-home/HomePage.tsx`
     - `QrCameraScanner` in `src/pages/kiosk-checkin/KioskCheckinPage.tsx`
   - Remove `"firebase-admin"` from `package.json` dependencies.
   - Configure chunk isolation in `vite.config.ts` (e.g. `vendor-motion`, `vendor-qrcode`).
4. Tarea 4.4 (Optimización Algorítmica O(U + B) en PersonalPage.tsx):
   - In `src/pages/admin-personal/PersonalPage.tsx`: pre-index `bookings` by athlete UID in a `Map<string, BookingDomainModel[]>` using `useMemo`, achieving O(1) lookups and avoiding redundant O(U * B) array filtering.

VERIFICATION REQUIREMENTS:
- DO NOT run vitest, npm test, or any automated test runners (strictly forbidden per R6).
- ONLY run `npx vite build` to verify compilation, chunk generation, and TypeScript checks pass with 0 errors.

OUTPUT:
- Write your comprehensive implementation report to `c:\Desktop\247 STUDIO\.agents\teamwork\worker_m2\handoff.md`.
- Include build verification command and output in your report.
- When done, send a message to the orchestrator summarizing the implemented changes.
