# Dispatch for Survey Explorer 2

Investigate R3 (Unidad de Trabajo 4: Arquitectura React & Rendimiento Firestore).
Original request: c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md
Working directory: c:\Desktop\247 STUDIO
State folder: c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_2


## 2026-11-07T11:50:14Z
You are Survey Explorer 2 for 247 STUDIO.
Your working directory is: c:\Desktop\247 STUDIO
Your state folder is: c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_2
Original request file: c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read the entire c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md before doing any work.

YOUR SCOPE:
Exclusively investigate and map the technical landscape for:
R3: Unidad de Trabajo 4 (Arquitectura React & Rendimiento Firestore):
- Tarea 4.1 (Eliminación de Waterfalls de Red en Firestore con Promise.all y writeBatch):
  - Examine queries in:
    - `src/pages/app-home/HomePage.tsx`
    - `src/pages/app-horario/SchedulePage.tsx`
    - `src/pages/admin-caja/CajaPage.tsx`
    - `src/pages/admin-personal/PersonalPage.tsx`
    - `src/pages/admin-asistencia/AttendanceAdminPage.tsx` (especially `handleCheckInAll` and loop updates vs `writeBatch(db)`).
- Tarea 4.2 (Eliminación de Escaneos Completos de Colección / Full Collection Scans):
  - `src/pages/admin-personal/PersonalPage.tsx`: examine `bookings` queries and how to filter by last 60 days (`where('date', '>=', ...)`).
  - `src/pages/admin-caja/CajaPage.tsx`: examine queries and state reload on payment approval/rejection; how to update local state without full reload.
  - `src/pages/kiosk-checkin/KioskCheckinPage.tsx`: examine `kiosk_members` reads and how in-memory caching during kiosk session avoids queries on each keystroke.
- Tarea 4.3 (Carga Dinámica await import() de Librerías Pesadas y Limpieza de package.json):
  - Examine imports of `jspdf` and `html2canvas` in:
    - `src/shared/utils/cardDownloader.ts`
    - `src/shared/utils/receiptGenerator.ts`
    - `src/shared/utils/diplomaGenerator.ts`
    - `src/shared/utils/attendanceSheetGenerator.ts`
  - Examine `FighterCard` in `src/pages/app-home/HomePage.tsx` and `QrCameraScanner` in `src/pages/kiosk-checkin/KioskCheckinPage.tsx` for `React.lazy` loading.
  - Inspect `package.json` for `"firebase-admin"` in dependencies.
  - Inspect `vite.config.ts` for manual chunks / chunk isolation.
- Tarea 4.4 (Optimización Algorítmica O(U + B) en PersonalPage.tsx):
  - In `src/pages/admin-personal/PersonalPage.tsx`, examine how bookings are currently matched to athletes/users, and how to pre-index bookings into a `Map<string, BookingDomainModel[]>` with `useMemo`.

CONSTRAINTS:
- You are read-only. NEVER write or modify application source code.
- Write your comprehensive survey report to `c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_2\handoff.md`.
- Provide exact file paths, line numbers, current implementations, and precise recommendations for the Worker.
- When finished, send a message to the orchestrator summarizing your findings and pointing to your handoff file.
