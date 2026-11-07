# Handoff Report: Survey Explorer 1 (R1 & R2 / Unidad de Trabajo 3)

- **Date**: 2026-11-07
- **Explorer**: Survey Explorer 1 (`explorer_survey_1`)
- **Target Workstation**: 247 STUDIO
- **Scope**: R1 (Skills Status) and R2 (Unidad de Trabajo 3: Seguridad Cloud, Firebase, RGPD & Handover .com)

---

## 1. Observation

### 1.1. R1: Skills Status
- **Local Repository Skills** (`c:\Desktop\247 STUDIO\.agents\skills`):
  - `frontend-design` (`SKILL.md` present)
  - `vercel-react-best-practices` (`SKILL.md` and rules present)
  - `web-design-guidelines` (`SKILL.md` present)
  - `webapp-testing` (`SKILL.md`, scripts, examples present)
  - Result: All 4 GitHub skills requested in R1 (`vercel-labs/agent-skills` and `anthropics/skills`) are already installed locally in the project repository.
- **Global Config Skills** (`C:\Users\nagor\.gemini\config\skills`):
  - Verified directory listing: `sdd-spec`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `judgment-day`, `work-unit-commits`, `chained-pr` are all present.
- **`package.json`**:
  - Contains `"firebase-admin": "^14.5.0"` under `dependencies` (line 29), which will be addressed in UT4.
  - Test runner scripts: Vitest is installed, but per R6 constraints, test runners MUST NOT be executed.

---

### 1.2. Tarea 3.1: Subida de Fotos, Canvas Compression, firestore.rules y RBAC

#### A. Subida de Fotos & Compresión en Canvas
- **`src/widgets/PhotoUploaderModal.tsx`**:
  - Lines 23-34:
    ```tsx
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    };
    ```
  - Lines 36-48:
    ```tsx
    const handleConfirmSave = async () => {
      if (!selectedImage) return;
      try {
        setSaving(true);
        await onSave(selectedImage);
        triggerPromotionConfetti();
        onClose();
      } catch (err) {
        console.error('Error saving athlete photo:', err);
      } finally {
        setSaving(false);
      }
    };
    ```
  - Observation: `FileReader.readAsDataURL(file)` stores the raw uncompressed file directly in `selectedImage`. High-resolution mobile photos (3MB–10MB) produce base64 strings exceeding 4MB–13MB.
  - The zoom control (`zoom` state, lines 20, 110-125) is merely a CSS preview transform (`style={{ transform: scale(${zoom}) }}`) and is completely discarded on save.
- **`src/pages/app-perfil/ProfilePage.tsx`**:
  - Lines 129-149:
    ```tsx
    const handleSavePhoto = async (photoDataUrl: string) => {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        photoUrl: photoDataUrl,
        updatedAt: serverTimestamp(),
      });

      try {
        const kioskRef = doc(db, 'kiosk_members', user.uid);
        await updateDoc(kioskRef, { photoUrl: photoDataUrl });
      } catch {
        // Ignorar si el documento de kiosk no existe aún
      }

      await refreshProfile();
      setMessage({
        text: '¡Foto de atleta actualizada con éxito! Tu tarjeta FUT de luchador ya está lista.',
        type: 'success',
      });
    };
    ```

#### B. `firestore.rules` (users, photoUrl, kiosk_members y class_capacity)
- **`firestore.rules` (users match, lines 115-125)**:
  - Line 125:
    ```
    (!('photoUrl' in request.resource.data) || isValidHttpsUrl(request.resource.data.photoUrl)) &&
    ```
  - Line 42:
    ```
    function isValidHttpsUrl(url) {
      return url is string && url.size() <= 500 && url.matches('^https://.+');
    }
    ```
  - Observation: `isValidHttpsUrl` strictly mandates `url.size() <= 500` and `^https://.+`. Any data URL (`data:image/...`) or compressed base64 string fails this rule immediately, triggering `PERMISSION_DENIED` whenever an athlete attempts to save their photo.
- **`firestore.rules` (kiosk_members match, lines 331-335)**:
  - Lines 333-334:
    ```
    allow read: if isKiosk() || isAdmin() || isStudent();
    allow write: if isAdmin();
    ```
  - Observation: When a student calls `updateDoc(doc(db, 'kiosk_members', user.uid), { photoUrl: photoDataUrl })` from `ProfilePage.tsx` (line 138), Firestore rules deny write access (`allow write: if isAdmin()`). The exception is caught by the empty `catch {}` block, leaving `kiosk_members` unsynchronized.
- **`firestore.rules` (class_capacity match, lines 364-368)**:
  - Lines 365-367:
    ```
    allow read: if isAuthenticated();
    allow create, update: if isAuthenticated();
    allow delete: if isAdmin();
    ```
  - Observation: `class_capacity` has no schema validation, key restriction, or value bounds. Any authenticated user can modify arbitrary fields or overwrite counters with malicious/negative values.

#### C. `src/app/providers/AuthProvider.tsx` (RBAC & Phantom Profile Injection)
- **Lines 33-51 (RBAC Token Claims vs Firestore Document)**:
  - Lines 40-48:
    ```tsx
    if (!userRole) {
      if (
        docData?.role === 'admin' ||
        docData?.permissions?.includes('ADMIN') ||
        docData?.permissions?.includes('admin')
      ) {
        userRole = 'admin';
      }
    }
    ```
  - Observation: `AuthProvider` grants client-side `role = 'admin'` if `docData?.role === 'admin'` in the Firestore document. However, `firestore.rules` line 18 evaluates `isAdmin()` solely via `request.auth.token.role == 'admin'` (custom claims). Without the custom claim, the client behaves as admin in the UI while all Firestore admin operations fail with `PERMISSION_DENIED`.
- **Lines 54-86 & 114-118 (Phantom Profile Injection)**:
  - Line 70:
    ```tsx
    const initialProfile: UserDomainModel = {
      ...
      accountStatus: 'ACTIVE',
      ...
    };
    ```
  - Lines 114-117:
    ```tsx
    } catch {
      // Si las reglas rechazan la escritura cliente, mantenemos el perfil en memoria
    }
    setUserData(initialProfile);
    ```
  - Observation: If `snap.exists()` is false, `studentDoc` is created with `accountStatus: 'PENDING'`. But `initialProfile` is created with `accountStatus: 'ACTIVE'`. In all cases (and especially when write fails in `catch`), line 117 executes `setUserData(initialProfile)`. A newly registered student or one whose write failed is granted an in-memory active status profile (`accountStatus: 'ACTIVE'`), bypassing the `PENDING` state and gate checks.

#### D. `src/widgets/KokoroAssistant.tsx` (Mass Queries by Non-Admin)
- **Lines 57-88**:
  - `loadLiveMetrics` executes whenever `isOpen === true`:
    - Line 61: `const usersSnap = await getDocs(collection(db, 'users'));`
    - Line 70: `const paySnap = await getDocs(collection(db, 'payments'));`
  - Observation: When a student opens Kokoro, these two queries execute without checking user role. In `firestore.rules`, students are denied access to collection-wide queries on `users` and `payments`. This generates `PERMISSION_DENIED` errors in the browser console.

---

### 1.3. Tarea 3.2: Cumplimiento RGPD Menores Art. 8 y Salud Art. 9

#### A. RGPD Menores y Status en `AuthProvider.tsx`
- Corroborated above: in `AuthProvider.tsx`, `accountStatus` must never default to `ACTIVE` in memory for pending student accounts.

#### B. Registro de Consentimiento Médico en `src/pages/admin-alta-alumno/StudentRegistrationPage.tsx`
- **Lines 68-69 & 153-157**:
  - Form state defines:
    ```tsx
    medicalNotes: '',
    medicalConsent: true,
    ```
  - Submit handler prepares payload:
    ```tsx
    if (formData.medicalNotes.trim() && formData.medicalConsent) {
      userPayload.medicalNotes = formData.medicalNotes.trim();
      userPayload.medicalConsentAt = serverTimestamp();
      userPayload.medicalConsentVersion = 'v1.0';
    }
    ```
  - **Lines 288-637 (Form JSX)**:
    - Observation: There are **NO inputs or textareas for `medicalNotes` and NO checkbox for `medicalConsent` anywhere in the form JSX**!
    - The admin registration form collects name, birth date, guardian (if minor), belt, and waiver method, but lacks the medical section entirely.

---

### 1.4. Tarea 3.3: Protección de API Key de Gemini y Proxy Serverless

#### A. Settings Button en `src/widgets/KokoroAssistant.tsx`
- **Lines 274-283**:
  ```tsx
  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={() => setShowSettings(!showSettings)}
      title="Configuración de IA Gemini"
      className={`p-1.5 rounded-full transition cursor-pointer ${
        apiKey ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-white/10'
      }`}
    >
      <Settings className="w-4 h-4" />
    </button>
  ```
- **Lines 296-346**: The Gemini API key settings panel is displayed to any user who clicks Settings, allowing students to view, change, or delete the key.

#### B. Cliente de Gemini y Proxy Serverless
- **`src/shared/ai/geminiClient.ts`**:
  - Lines 21-76: Calls `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}` directly from the client.
  - Reads `apiKey` from parameter, `localStorage.getItem('kokoro_gemini_key')`, or `import.meta.env.VITE_GEMINI_API_KEY`.
- **Netlify Directory**:
  - The `netlify/` directory does not exist on disk (`Test-Path "netlify"` returned `False`).

---

### 1.5. Tarea 3.4: Desacoplamiento de Dominios y Handover .com

#### A. Referencias Hardcodeadas a `247studio.netlify.app`
- **`src/pages/public-login/LoginPage.tsx`**:
  - Line 142:
    ```tsx
    if (firebaseError?.code === 'auth/unauthorized-domain') {
      setError('El dominio "247studio.netlify.app" debe agregarse a "Dominios autorizados" en la consola de Firebase Authentication.');
    }
    ```
- **`src/pages/kiosk-checkin/KioskCheckinPage.tsx`**:
  - Line 980:
    ```tsx
    <span className="text-[10px] text-slate-400 block font-mono">
      247studio.netlify.app/reserva-prueba
    </span>
    ```
  - Note: In line 143, QR code generation already uses `window.location.origin`, but the textual label is hardcoded.

#### B. `netlify.toml`
- Lines 1-16:
  ```toml
  [build]
    command = "npm run build"
    publish = "dist"

  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200

  [[headers]]
    for = "/*"
    [headers.values]
      X-Frame-Options = "DENY"
      X-Content-Type-Options = "nosniff"
      Referrer-Policy = "strict-origin-when-cross-origin"
      Permissions-Policy = "camera=(self), microphone=(), geolocation=()"
  ```
- Observations:
  - `functions = "netlify/functions"` is missing in `[build]`.
  - `Strict-Transport-Security` is missing in `[headers.values]`.
  - An explicit API redirect (`/api/*` -> `/.netlify/functions/:splat`) before the wildcard SPA rewrite is missing.

#### C. `.env.example`
- Lines 1-7: Only contains 7 rudimentary dev variables without serverless variables, production handover documentation, or custom domain guidance.

---

## 2. Logic Chain

```
[Observation 1.2.A: Raw FileReader DataURL]
  + [Observation 1.2.B: firestore.rules isValidHttpsUrl only allows https and size <= 500]
  --> Any user photo upload (> 500 chars or data URL) fails with PERMISSION_DENIED.
  --> Large camera photos (3MB-10MB) also threaten the Firestore 1 MiB document limit.
  --> CONCLUSION & FIX:
      1) In PhotoUploaderModal, render image to a 400x400 canvas applying zoom crop,
         and export as image/jpeg (quality 0.7) to guarantee size < 50KB.
      2) In firestore.rules, create isValidPhotoUrl(url) allowing https:// and
         data:image/(jpeg|png|webp);base64,... up to 70,000 bytes.
      3) In firestore.rules match /kiosk_members/{memberId}, allow isUser(memberId)
         to update photoUrl so student photo sync succeeds.

[Observation 1.2.B: class_capacity has allow create, update: if isAuthenticated()]
  + [Search of codebase shows SchedulePage, AttendanceAdminPage, KioskCheckinPage write:
     scheduleId, date, bookedCount, waitlistCount (optional), updatedAt]
  --> Any authenticated user could corrupt or inject arbitrary fields in class_capacity.
  --> CONCLUSION & FIX:
      Enforce schema validation in firestore.rules: scheduleId string, date regex YYYY-MM-DD,
      bookedCount int >= 0, waitlistCount int >= 0, updatedAt == request.time, and hasOnly expected keys.

[Observation 1.2.C: initialProfile has accountStatus: 'ACTIVE' and fallback assigns it unconditionally]
  --> Newly self-registered students or rejected writes get in-memory ACTIVE status.
  --> Violates RGPD and club access rules.
  --> CONCLUSION & FIX:
      In AuthProvider.tsx, default initial student accountStatus to 'PENDING'.
      On write catch, do not grant in-memory ACTIVE status.

[Observation 1.2.D: KokoroAssistant queries users and payments collections unconditionally]
  + [firestore.rules forbids non-admin from reading collection-wide users/payments]
  --> Opening Kokoro as a student triggers 2 unhandled PERMISSION_DENIED errors.
  --> CONCLUSION & FIX:
      Guard loadLiveMetrics with `if (kokoroRole !== 'admin') return;`.

[Observation 1.3.B: StudentRegistrationPage has state and submit logic for medicalNotes but NO JSX]
  --> Admin cannot input medicalNotes or consent during reception registration.
  --> CONCLUSION & FIX:
      Add a form section in StudentRegistrationPage with a medicalNotes textarea and
      medicalConsent checkbox, and attach medicalConsentAt: serverTimestamp() upon save.

[Observation 1.4.A & B: Settings button visible to students; Gemini API key exposed client-side]
  --> Students can view or change API key; no serverless proxy exists.
  --> CONCLUSION & FIX:
      1) In KokoroAssistant, wrap Settings button and modal in `{kokoroRole === 'admin' && ...}`.
      2) Create netlify/functions/kokoro-ai.mjs using process.env.GEMINI_API_KEY.
      3) In geminiClient.ts, attempt serverless fetch to /.netlify/functions/kokoro-ai,
         falling back to local client call during dev.

[Observation 1.5.A & B: 247studio.netlify.app hardcoded in LoginPage and KioskCheckinPage]
  + [netlify.toml missing HSTS and functions directory]
  + [.env.example incomplete]
  --> Domain changes to client .com break error messages and QR captions.
  --> CONCLUSION & FIX:
      1) Replace hardcoded domain strings with window.location.hostname / window.location.host.
      2) Update netlify.toml with functions dir, HSTS header, and API proxy redirects.
      3) Document complete handover configuration in .env.example.
```

---

## 3. Caveats

1. **Firebase Auth Custom Claims**: In `firestore.rules`, `isAdmin()` checks `request.auth.token.role == 'admin'`. Setting `docData.role = 'admin'` in Firestore does not automatically grant Firestore rules privileges unless Firebase Admin SDK / Cloud Function sets custom claims on the user token. The Worker and handover documentation must make this explicit.
2. **Kiosk Members Document Creation**: If an athlete has not had a `kiosk_members/{uid}` document created by an admin yet, `updateDoc` will fail. `ProfilePage.tsx` already wraps this in a `try...catch`, which is appropriate, but the rule must allow `update` when the document exists.
3. **No Test Runner Allowed**: Per R6 instructions, Vitest cannot be run. All validation must be performed via `npx vite build`.

---

## 4. Conclusion & Actionable Implementation Plan for Worker

### Action Items for Unidad de Trabajo 3:

#### 1. Canvas Compression in `src/widgets/PhotoUploaderModal.tsx`
- Replace direct `reader.readAsDataURL` save with off-screen canvas rendering:
  - Create helper `compressImageToCanvas(dataUrl: string, zoom: number, maxDim = 400, quality = 0.7): Promise<string>`.
  - Draw to a 400x400 canvas with `ctx.drawImage` centered and scaled by `zoom`.
  - Export via `canvas.toDataURL('image/jpeg', 0.7)` (size is ~20KB–35KB, safely under 50KB).
  - Pass the compressed data URL to `onSave`.

#### 2. Update `firestore.rules`
- Add helper:
  ```
  function isValidPhotoUrl(url) {
    return url is string && (
      (url.size() <= 500 && url.matches('^https://.+')) ||
      (url.size() <= 70000 && url.matches('^data:image/(jpeg|jpg|png|webp);base64,.+'))
    );
  }
  ```
- In `/users/{userId}` update rule:
  Replace `(!('photoUrl' in request.resource.data) || isValidHttpsUrl(request.resource.data.photoUrl))`
  with `(!('photoUrl' in request.resource.data) || isValidPhotoUrl(request.resource.data.photoUrl))`.
- In `/kiosk_members/{memberId}`:
  Add:
  ```
  allow update: if isUser(memberId) &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['photoUrl']) &&
    (!('photoUrl' in request.resource.data) || isValidPhotoUrl(request.resource.data.photoUrl));
  ```
- In `/class_capacity/{capacityId}`:
  Replace permissive write rule with:
  ```
  allow create, update: if isAuthenticated() &&
    request.resource.data.scheduleId is string &&
    request.resource.data.date is string &&
    request.resource.data.date.matches('^\\d{4}-\\d{2}-\\d{2}$') &&
    request.resource.data.bookedCount is int &&
    request.resource.data.bookedCount >= 0 &&
    (!('waitlistCount' in request.resource.data) || (request.resource.data.waitlistCount is int && request.resource.data.waitlistCount >= 0)) &&
    request.resource.data.updatedAt == request.time &&
    request.resource.data.keys().hasOnly(['scheduleId', 'date', 'bookedCount', 'waitlistCount', 'updatedAt']);
  ```

#### 3. Update `src/app/providers/AuthProvider.tsx`
- In `initialProfile`:
  Set `accountStatus: 'PENDING'`.
- In student creation:
  Ensure `accountStatus: 'PENDING'` is consistently maintained.
- In `catch`:
  Do not inject active profile in memory. Set `userData` to `null` or a restricted pending profile.

#### 4. Update `src/widgets/KokoroAssistant.tsx`
- In `loadLiveMetrics`:
  Add `if (kokoroRole !== 'admin') return;` at the beginning of the effect (line 58).
- Wrap the `<Settings>` button (lines 274-283) and settings panel (lines 296-346) with:
  `{kokoroRole === 'admin' && ( ... )}`.

#### 5. Update `src/pages/admin-alta-alumno/StudentRegistrationPage.tsx`
- Insert a JSX block for "Salud y Notas Médicas (RGPD Art. 9)" containing:
  - Textarea for `medicalNotes` (`name="medicalNotes"`, `value={formData.medicalNotes}`, `onChange={handleChange}`).
  - Checkbox for `medicalConsent` (`name="medicalConsent"`, `checked={formData.medicalConsent}`, `onChange={e => setFormData(prev => ({ ...prev, medicalConsent: e.target.checked }))}`).
  - Verification that `medicalConsentAt: serverTimestamp()` and `medicalConsentVersion: 'v1.0'` are stored when notes are present and consent is checked.

#### 6. Create `netlify/functions/kokoro-ai.mjs` & Update `src/shared/ai/geminiClient.ts`
- Create `netlify/functions/kokoro-ai.mjs` reading `process.env.GEMINI_API_KEY`, supporting both POST and CORS preflight.
- In `geminiClient.ts`:
  - Attempt `fetch('/.netlify/functions/kokoro-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, role }) })`.
  - If successful, return `data.text`.
  - Fall back to existing direct Google Gemini call for offline/local development.

#### 7. Decouple Domains & Update Configs
- In `src/pages/public-login/LoginPage.tsx` (line 142):
  Replace `'El dominio "247studio.netlify.app"'` with `` `El dominio "${window.location.hostname}"` ``.
- In `src/pages/kiosk-checkin/KioskCheckinPage.tsx` (line 980):
  Replace `'247studio.netlify.app/reserva-prueba'` with `` `{window.location.host}/reserva-prueba` ``.
- In `netlify.toml`:
  - Under `[build]`, add `functions = "netlify/functions"`.
  - Under `[headers.values]`, add `Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"`.
  - Add redirect `from = "/api/*"` to `to = "/.netlify/functions/:splat"` status = 200.
- In `.env.example`:
  - Document all production variables, Netlify secrets (`GEMINI_API_KEY`), and domain handover instructions.

---

## 5. Verification Method

To independently verify the implementation:
1. **Source Inspection**:
   - Inspect `firestore.rules`: verify `isValidPhotoUrl`, `class_capacity` validation, and `kiosk_members` update rule.
   - Inspect `src/widgets/PhotoUploaderModal.tsx`: verify canvas resize and JPEG compression < 50KB.
   - Inspect `src/app/providers/AuthProvider.tsx`: verify absence of false `accountStatus: 'ACTIVE'` injection.
   - Inspect `src/widgets/KokoroAssistant.tsx`: verify `kokoroRole === 'admin'` guards on metrics and settings button.
   - Inspect `src/pages/admin-alta-alumno/StudentRegistrationPage.tsx`: verify medical notes UI and `medicalConsentAt`.
   - Inspect `netlify/functions/kokoro-ai.mjs` and `src/shared/ai/geminiClient.ts`.
   - Inspect `src/pages/public-login/LoginPage.tsx` and `src/pages/kiosk-checkin/KioskCheckinPage.tsx` for `window.location`.
   - Inspect `netlify.toml` and `.env.example`.
2. **Build Verification**:
   - Run command: `npx vite build`
   - Verification succeeds if `npx vite build` finishes with exit code 0 and no TypeScript/build errors.
3. **Invalidation Conditions**:
   - If `npx vite build` fails with type or bundling errors.
   - If tests are run (violation of R6).
