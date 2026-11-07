# BRIEFING — 2026-11-07T12:11:00Z

## Mission
Implement Unidad de Trabajo 3: Seguridad Cloud, Firebase, RGPD & Handover .com for 247 STUDIO.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Desktop\247 STUDIO
- State folder: c:\Desktop\247 STUDIO\.agents\teamwork\worker_m1
- Original parent: b07d2e77-5606-4925-8dbb-0eb2943d1d38
- Milestone: M1 (Unidad de Trabajo 3)

## 🔒 Key Constraints
- DO NOT CHEAT. All implementations must be genuine.
- DO NOT run vitest, npm test, or any automated test runners (strictly forbidden per R6).
- ONLY run `npx vite build` to verify compilation, chunk generation, and TypeScript checks pass with 0 errors.
- Keep .agents/teamwork/ purely metadata.

## Current Parent
- Conversation ID: b07d2e77-5606-4925-8dbb-0eb2943d1d38
- Updated: 2026-11-07T12:01:00Z

## Task Summary
- **What to build**:
  - Tarea 3.1: Canvas resizing (<50KB), crop zoom handling, firestore.rules photoUrl & kiosk_members update permissions, class_capacity validation, AuthProvider RBAC phantom profile removal, KokoroAssistant mass read restriction.
  - Tarea 3.2: RGPD compliance: medical notes, medical consent checkbox, medicalConsentAt serverTimestamp in StudentRegistrationPage.
  - Tarea 3.3: Hide API Key settings button for non-admin, create netlify/functions/kokoro-ai.mjs with server-side GEMINI_API_KEY, update geminiClient.ts with fallback.
  - Tarea 3.4: Dynamic hostname/origin in LoginPage & KioskCheckinPage, .env.example updates, netlify.toml security headers & functions configuration.
- **Success criteria**: Vite build passes with 0 errors, all 4 subtasks completely and genuinely implemented.

## Key Decisions Made
- Extracted canvas image processing to `src/shared/utils/imageCompressor.ts` with iterative JPEG quality downscaling to guarantee strict compliance with `< 50KB` limit while preserving face cropping (object-cover object-top).
- In `firestore.rules`, defined `isValidPhotoUrl` helper allowing HTTPS URLs (<= 500 chars) and optimized Base64 data URLs (<= 70000 chars).
- Extended `kiosk_members/{memberId}` update rule so authenticated athletes can update their own `photoUrl` and `updatedAt` without admin escalation.
- Hardened `class_capacity/{capacityId}` with strict schema validation enforcing scheduleId, date regex, non-negative counters, and updatedAt == request.time.
- Defaulted new students in `AuthProvider.tsx` to `accountStatus: 'PENDING'` and ensured write failures set `userData = null` to avoid phantom active profiles in memory.
- Enforced admin-only mass Firestore reads and Gemini API key configuration in `KokoroAssistant.tsx`.
- Implemented `netlify/functions/kokoro-ai.mjs` supporting both Netlify v1 and v2 standard handlers, delegating Gemini AI execution to server context.
- Replaced hardcoded `247studio.netlify.app` with `window.location.hostname` and `window.location.host` in login error handlers and kiosk trial QR captions.
- Enforced HSTS, X-Frame-Options, Permissions-Policy, and API function proxy rewrite in `netlify.toml`.

## Artifact Index
- c:\Desktop\247 STUDIO\.agents\teamwork\worker_m1\DISPATCH.md — Dispatch instructions
- c:\Desktop\247 STUDIO\.agents\teamwork\worker_m1\progress.md — Progress log
- c:\Desktop\247 STUDIO\.agents\teamwork\worker_m1\handoff.md — Final handoff report

## Change Tracker
- **Files modified**:
  - `src/shared/utils/imageCompressor.ts` (created) — Canvas crop, zoom, and JPEG compression < 50KB
  - `src/widgets/PhotoUploaderModal.tsx` — Canvas compression integration on save
  - `src/pages/app-perfil/ProfilePage.tsx` — Defensive compression & kiosk_members update sync
  - `firestore.rules` — `isValidPhotoUrl`, student `kiosk_members` update, `class_capacity` schema
  - `src/app/providers/AuthProvider.tsx` — Default new students to PENDING, no phantom active profile
  - `src/widgets/KokoroAssistant.tsx` — Admin-only mass queries & API key settings panel
  - `src/pages/admin-alta-alumno/StudentRegistrationPage.tsx` — Medical notes & RGPD Art. 9 consent
  - `netlify/functions/kokoro-ai.mjs` (created) — Netlify serverless proxy for Gemini API
  - `src/shared/ai/geminiClient.ts` — Serverless proxy caller with dev fallback
  - `src/pages/public-login/LoginPage.tsx` — Dynamic hostname in unauthorized domain error
  - `src/pages/kiosk-checkin/KioskCheckinPage.tsx` — Dynamic host in kiosk express checkin label
  - `netlify.toml` — Functions path, HSTS header, security headers, API redirect
  - `.env.example` — Documented production environment variables & .com handover guide
- **Build status**: PASS (`npx vite build` completed in 16.19s with 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (Vite build 0 errors)
- **Lint status**: PASS
- **Tests added/modified**: N/A (vitest strictly forbidden per R6)

## Loaded Skills
- None
