## 2026-11-07T12:00:54Z
You are Worker M1 for 247 STUDIO.
Your working directory is: c:\Desktop\247 STUDIO
Your state folder is: c:\Desktop\247 STUDIO\.agents\teamwork\worker_m1
Original request file: c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md
Project specification: c:\Desktop\247 STUDIO\.agents\teamwork\orchestrator\PROJECT.md
Explorer handoff report: c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_1\handoff.md

MANDATORY FIRST STEP: Read c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_1\handoff.md before implementing any changes.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SCOPE OF WORK: Unidad de Trabajo 3: Seguridad Cloud, Firebase, RGPD & Handover .com:
1. Tarea 3.1:
   - In `src/widgets/PhotoUploaderModal.tsx` and `src/pages/app-perfil/ProfilePage.tsx`: implement canvas resizing and JPEG compression to ensure generated photo data is lightweight (< 50KB). Ensure proper crop zoom handling.
   - In `firestore.rules`: update `isValidPhotoUrl` helper to accept base64 image data strings (< 70KB) and HTTPS URLs. Allow authenticated students to update their own `photoUrl` and `updatedAt` in `kiosk_members/{uid}` while keeping other fields protected.
   - In `firestore.rules`: protect `class_capacity` with rigorous schema validation (valid scheduleId, date regex YYYY-MM-DD, bookedCount >= 0, waitlistCount >= 0, updatedAt == request.time).
   - In `src/app/providers/AuthProvider.tsx`: align RBAC, do not inject phantom profiles with `accountStatus: 'ACTIVE'` on write error (default new students to `PENDING` and gracefully handle errors without fake active state in memory).
   - In `src/widgets/KokoroAssistant.tsx`: restrict mass reads of `users` and `payments` exclusively to users with `role === 'admin'`.
2. Tarea 3.2:
   - In `src/pages/admin-alta-alumno/StudentRegistrationPage.tsx`: add UI inputs for medical notes (`medicalNotes`), medical consent checkbox (`medicalConsent`), and record `medicalConsentAt: serverTimestamp()` when submitting with medical notes.
3. Tarea 3.3:
   - In `src/shared/ai/geminiClient.ts` and `src/widgets/KokoroAssistant.tsx`: hide the API Key settings button completely for non-admin users (`role !== 'admin'`).
   - Create `netlify/functions/kokoro-ai.mjs` (reading `process.env.GEMINI_API_KEY` in server context) and update `src/shared/ai/geminiClient.ts` to call `/.netlify/functions/kokoro-ai` with a secure fallback for local development.
4. Tarea 3.4:
   - In `src/pages/public-login/LoginPage.tsx` and `src/pages/kiosk-checkin/KioskCheckinPage.tsx`: replace hardcoded `247studio.netlify.app` with dynamic `window.location.hostname` / `window.location.origin`.
   - Update `.env.example` with documented environment variables for client handover (.com) and serverless functions.
   - Enhance `netlify.toml` with `functions = "netlify/functions"`, security headers (`Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`), and redirect rule for functions.

VERIFICATION REQUIREMENTS:
- DO NOT run vitest, npm test, or any automated test runners (strictly forbidden per R6).
- ONLY run `npx vite build` to verify compilation, chunk generation, and TypeScript checks pass with 0 errors.

OUTPUT:
- Write your comprehensive implementation report to `c:\Desktop\247 STUDIO\.agents\teamwork\worker_m1\handoff.md`.
- Include build verification command and output in your report.
- When done, send a message to the orchestrator summarizing the implemented changes.
