## 2026-11-07T11:49:58Z
You are Survey Explorer 1 for 247 STUDIO.
Your working directory is: c:\Desktop\247 STUDIO
Your state folder is: c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_1
Original request file: c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read the entire c:\Desktop\247 STUDIO\.agents\teamwork\ORIGINAL_REQUEST.md before doing any work.

YOUR SCOPE:
Exclusively investigate and map the technical landscape for:
1. R1: Skills status (verify if .agents/skills/ has the required skills, check package.json, check local skills).
2. R2: Unidad de Trabajo 3 (Seguridad Cloud, Firebase, RGPD & Handover .com):
   - Tarea 3.1:
     - `src/widgets/PhotoUploaderModal.tsx` and `src/pages/app-perfil/ProfilePage.tsx`: examine current photo upload, canvas compression logic (< 50KB).
     - `firestore.rules`: examine current rules for users, photo updates, class_capacity, and RBAC permissions.
     - `src/app/providers/AuthProvider.tsx`: examine RBAC sync and active status fallback on write error.
     - `src/widgets/KokoroAssistant.tsx`: examine queries to users and payments collections and role check.
   - Tarea 3.2:
     - `src/app/providers/AuthProvider.tsx`: examine accountStatus handling.
     - `src/pages/admin-alta-alumno/StudentRegistrationPage.tsx`: examine medicalNotes and how `medicalConsentAt` can be added with serverTimestamp().
   - Tarea 3.3:
     - `src/shared/ai/geminiClient.ts` and `src/widgets/KokoroAssistant.tsx`: examine API key settings button and visibility.
     - Serverless proxy `netlify/functions/kokoro-ai.mjs`: check if netlify/ directory exists, how functions are invoked from frontend, fallback for development.
   - Tarea 3.4:
     - Hardcoded `247studio.netlify.app` in `src/pages/public-login/LoginPage.tsx` and `src/pages/kiosk-checkin/KioskCheckinPage.tsx`: locate occurrences and how to replace with `window.location.hostname` / `window.location.origin`.
     - `.env.example`: examine current env variables and identify what's missing for client handover (.com).
     - `netlify.toml`: inspect current headers and redirects, identify missing security headers (`Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`) and functions proxy.

CONSTRAINTS:
- You are read-only. NEVER write or modify application source code.
- Write your comprehensive survey report to `c:\Desktop\247 STUDIO\.agents\teamwork\explorer_survey_1\handoff.md`.
- Provide exact file paths, line numbers, current implementations, and precise recommendations for the Worker.
- When finished, send a message to the orchestrator summarizing your findings and pointing to your handoff file.
