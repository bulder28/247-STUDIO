# Feature: Enrollment and monthly payment (alta + cobro mensual)

## Objective
Let staff enroll a new student correctly and register monthly payments, assigning the tariff at payment time, as described in the client's voice notes (2026-11-11).

## Problem
- Enrollment assigns a tariff up front, uses a single name field, has no photo, and treats minors as under 16.
- Caja has no tariff per payment, allows card payments, cannot register prepayment for several months, and falls back to demo data when collections are empty.
- There is no list of active students who have not paid the current month.

## Why
Client's main need: "at the start of the month a new person arrives, I need to enroll them and charge them", and to stop losing track of who has not paid (~150 students).

## Scope (authorized)
- Domain: minor threshold, payment methods, founding-member discount, prepayment periods, unpaid-students query.
- Enrollment page (`/admin/alta-alumno`) and `netlify/functions/admin-create-user.mjs`.
- Caja page (`/admin/caja`) and `firestore.rules` for `payments`/`users` fields touched.
- Out of scope (later / low priority): unpaid reminders after 7/15 days, temporary leave requests, digital consent signatures, emergency contact in student profile, bookings. Features not mentioned by the client are low priority; nothing is deleted without explicit approval.

## Decisions
- Minor = under 14 (client: "por abajo de 14", matches Spain's digital consent age of 14). 14-year-olds enroll as adults.
- Founding member ("socio fundador") is a boolean flag on the student with a 10% discount on every charge; the existing SF tariff tier is left untouched.
- Prepayment of N months creates N payment docs, one per period, so existing period-based status logic keeps working.
- Payment methods: CASH ("Metálico") and BIZUM only.

## Configuration
- TDD: off (no project/session TDD configuration found). Runner: Vitest (`npm test`).
- Checks per task: `npm test`, `npm run build`.
- RDD: off (decided by default). Delivery strategy: ask-on-risk.
- Branch: `feat/alta-cobro-mensual`. Do not stage unrelated working-tree changes (AGENTS.md, skills-lock.json, verificar-fichas.mjs, audio/transcript files).

## Tasks
- [x] T1 Domain: minor threshold < 14 (minor.ts, firestore.rules, tests); PaymentMethod = CASH | BIZUM; `firstName`, `lastName`, guardian fields and `isFoundingMember` on UserDomainModel; `tariffId` on PaymentDomainModel; pure helpers `applyFoundingDiscount`, `buildPrepaymentPeriods`, `findUnpaidStudents` with Vitest tests. Route: delegated (writer trigger, 2+ files).
- [x] T2 Enrollment: first name + surnames, required mobile phone, birth date, optional email, photo capture/upload, guardian block for under-14, founding-member checkbox; no tariff at enrollment. Route: delegated.
- [x] T3 Caja: remove demo-data fallback and CARD; tariff picked from Firestore tariffs in the charge modal and stored as `tariffId`; period chosen in the form; founding-member 10% discount; prepay N months; rules allowlists updated. Route: delegated.
- [ ] T4 Caja "unpaid this month" view: active students without an approved payment for the selected period, filterable by tariff. Route: delegated.

## Acceptance criteria
- Enrollment saves full name, surnames, phone, birth date, optional email and photo; minors under 14 require guardian name and phone; no tariff is set at enrollment.
- A charge records method (cash/Bizum), tariff, period and automatic date; founding members get 10% off; prepaying N months creates N period payments.
- Staff can see who has not paid the selected month and filter by tariff.
- `npm test` and `npm run build` pass.

## Progress
- 2026-11-11: Code mapped (enrollment, caja, tariffs, roles). Branch created. Feature document created.

- T1 done (delegated writer). `npm test`: 14 files / 113 tests passed (parent re-ran). `npm run build`: passed (writer). `npm run test:rules`: not run, Firestore emulator unavailable (pending). Risk assessment returned no tier, treated as high; parent reviewed the `firestore.rules` diff: new admin-only payment create rule (CASH/BIZUM, APPROVED/PENDING_APPROVAL, key allowlist), self-registration age now 14+.
- Follow-ups (not in scope): `sessionsRemaining` missing from the payments admin update allowlist (pre-existing; PASS approval may be denied); no rules test for the admin create rule; "Efectivo" labels remain in PersonalPage/ProgramsPage and a CARD branch in receiptGenerator.

- T1 commit: 9e6f8ba.
- T2 done (delegated writer, impeccable skill applied). `npm test`: 15 files / 120 tests passed (parent re-ran). `npm run build`: passed (writer). Not run: browser check of the page, Netlify function (pending manual check). Photo stored as compressed JPEG data URL in `photoUrl` (existing project convention; no Firebase Storage in the project). Email optional: the function creates a placeholder login `alumno_…@247studiobjj.com` without a reset link. New students get `pricingTier: 'STD'` and no `activeTariffId`.
- Follow-up: make `activeTariffId` optional in `UserDomainModel` (T3).

- T2 commit: 369340a.
- T3 done (delegated writer, impeccable applied). `npm test`: 15 files passed (parent re-ran; writer reported 126 tests). `npm run build`: passed (writer). Not run: browser check, rules tests (emulator unavailable). Charges: tariff from Firestore, period in modal, founding 10% discount, prepay 1-12 months as one writeBatch (one doc per period), no demo fallback, PASS no longer writes pricingTier.
- Follow-up: `handleApprovePayment` still estimates amounts from hardcoded tiers and does not write `sessionsRemaining`.

## Next step
T4.
