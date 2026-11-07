# Informe Técnico y Levantamiento de Arquitectura: R3 (Unidad de Trabajo 4)

**Misión:** Levantamiento y mapeo técnico exhaustivo para la Unidad de Trabajo 4: *Arquitectura React & Rendimiento Firestore* (Tareas 4.1, 4.2, 4.3 y 4.4).
**Explorador:** Survey Explorer 2
**Estado:** Completo y Autocontenido para el Agente Worker.

---

## 1. Observation (Observaciones Directas de la Base de Código)

A continuación se detallan los hallazgos con rutas de archivo exactas, números de línea e implementaciones de código observadas directamente:

### Tarea 4.1: Eliminación de Waterfalls de Red en Firestore con Promise.all y writeBatch

1. **`src/pages/app-home/HomePage.tsx` (Líneas 65-107):**
   - **Observación directa:** La función `loadData()` realiza cinco consultas secuenciales dependientes de `await`:
     - Línea 70-71: `paymentsSnap = await getDocs(paymentsQuery);` (colección `payments`)
     - Línea 76-77: `bookingsSnap = await getDocs(bookingsQuery);` (colección `bookings`)
     - Línea 83-84: `freezesSnap = await getDocs(freezesQuery);` (colección `freezes`)
     - Línea 99: `schedSnap = await getDocs(query(collection(db, 'schedules'), where('active', '==', true)));`
     - Línea 104: `excSnap = await getDocs(collection(db, 'scheduleExceptions'));`
   - **Impacto:** Un cliente móvil sufre 5 latencias de ida y vuelta (RTT) sucesivas acumuladas antes de que la pantalla principal renderice el estado del alumno.

2. **`src/pages/app-horario/SchedulePage.tsx` (Líneas 79-115):**
   - **Observación directa:** En `fetchScheduleData()`, se ejecutan cuatro consultas en serie:
     - Línea 82: `schedSnap = await getDocs(schedQuery);`
     - Línea 88: `excSnap = await getDocs(collection(db, 'scheduleExceptions'));`
     - Línea 99: `if (user) { bSnap = await getDocs(bQuery); }`
     - Línea 106: `capSnap = await getDocs(capQuery);` (colección `class_capacity`)
   - **Impacto:** Cada cambio de día en la barra de horarios desencadena un waterfall de hasta 4 peticiones HTTP/2 en cascada.

3. **`src/pages/admin-caja/CajaPage.tsx` (Líneas 67-86):**
   - **Observación directa:** En `fetchCajaData()`, se ejecutan tres consultas completas en cascada:
     - Línea 70: `paySnap = await getDocs(collection(db, 'payments'));`
     - Línea 76: `uSnap = await getDocs(collection(db, 'users'));`
     - Línea 82: `frSnap = await getDocs(collection(db, 'freezeRequests'));`
   - **Impacto:** 3 idas y vueltas a Firestore bloquean la carga del panel de caja.

4. **`src/pages/admin-personal/PersonalPage.tsx` (Líneas 77-88):**
   - **Observación directa:** En `fetchUsersAndHistory()`:
     - Línea 79: `usersSnap = await getDocs(collection(db, 'users'));`
     - Línea 84: `bookingsSnap = await getDocs(collection(db, 'bookings'));`
   - **Impacto:** Descarga secuencial de dos colecciones principales.

5. **`src/pages/admin-asistencia/AttendanceAdminPage.tsx`:**
   - **Waterfall en carga (Líneas 88-125):** En `fetchStudents()`, consulta secuencialmente `users` (`line 91: await getDocs(collection(db, 'users'))`) y luego `kiosk_members` (`line 107: await getDocs(collection(db, 'kiosk_members'))`).
   - **Bucle secuencial en `handleCheckInAll` (Líneas 218-229):**
     ```typescript
     for (const booking of pendingBookings) {
       const student = students[booking.uid];
       const isFrozen = student?.accountStatus === 'FROZEN' || student?.accountStatus === 'PAUSED';
       const effectiveType: SessionType = isFrozen ? 'OBSERVER' : (booking.sessionType || 'PARTICIPANT');

       await updateDoc(doc(db, 'bookings', booking.id), {
         status: 'ATTENDED',
         checkInSource: 'ADMIN',
         sessionType: effectiveType,
         attendanceWeight: getAttendanceWeight(effectiveType),
       });
     }
     ```
     Seguido por `await setDoc(capRef, ...)` en línea 233.
   - **Impacto:** Si hay 25 alumnos apuntados a una clase, pulsar "Confirmar Todos" ejecuta 25 peticiones `updateDoc` secuenciales más 1 `setDoc`, demorando entre 4 y 10 segundos con alta probabilidad de fallos parciales no atómicos.

---

### Tarea 4.2: Eliminación de Escaneos Completos de Colección / Full Collection Scans

1. **`src/pages/admin-personal/PersonalPage.tsx` (Líneas 84-87):**
   - **Observación directa:**
     ```typescript
     const bookingsSnap = await getDocs(collection(db, 'bookings'));
     const bList: BookingDomainModel[] = [];
     bookingsSnap.forEach((d) => bList.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
     setBookings(bList);
     ```
   - **Análisis de consumo en dominio:** En `src/shared/domain/attendance.ts` (líneas 65-69), la función `deriveRetentionRisk` solo evalúa las últimas 8 semanas (ventana 1: últimos 28 días; ventana 2: 28 a 56 días atrás). Descargar reservas de años o meses anteriores es un desperdicio absoluto de cuota Firestore y memoria.

2. **`src/pages/admin-caja/CajaPage.tsx` (Líneas 138, 162, 223, 263, 274):**
   - **Observación directa:** Tras cualquier mutación sobre un pago o solicitud:
     - `handleApprovePayment` (Línea 138): `await fetchCajaData();`
     - `handleConfirmReject` (Línea 162): `await fetchCajaData();`
     - `handleCreatePosCharge` (Línea 223): `await fetchCajaData();`
     - `handleApproveFreeze` (Línea 263): `await fetchCajaData();`
     - `handleRejectFreeze` (Línea 274): `await fetchCajaData();`
   - **Impacto:** Cada vez que el administrador valida un Bizum o cobra 15 € en el TPV, el cliente vuelve a descargar por completo las 3 colecciones (`payments`, `users`, `freezeRequests`), multiplicando innecesariamente lecturas en Firestore y produciendo parpadeo en la UI.

3. **`src/pages/kiosk-checkin/KioskCheckinPage.tsx` (Líneas 243-264 y Línea 191):**
   - **Observación directa:**
     ```typescript
     useEffect(() => {
       if (searchTerm.trim().length < 2) {
         setSearchResults([]);
         return;
       }

       const searchMembers = async () => {
         try {
           const membersSnap = await getDocs(collection(db, 'kiosk_members'));
           const term = searchTerm.toLowerCase();
           ...
     ```
   - **Impacto crítico:** El efecto se dispara con la dependencia `[searchTerm]`. Cada pulsación de tecla ("M", "a", "r", "i", "o") lanza un `getDocs` que descarga la colección entera de miembros del kiosco. Asimismo, en `fetchTodayAttendees` (línea 191) se vuelve a descargar `kiosk_members`.

---

### Tarea 4.3: Carga Dinámica await import() de Librerías Pesadas y Limpieza de package.json

1. **Imports estáticos de `jspdf` y `html2canvas`:**
   - `src/shared/utils/cardDownloader.ts` (Línea 5): `import html2canvas from 'html2canvas';` (estático).
   - `src/shared/utils/receiptGenerator.ts` (Línea 5): `import { jsPDF } from 'jspdf';` (estático).
   - `src/shared/utils/diplomaGenerator.ts` (Línea 1): `import jsPDF from 'jspdf';` (estático).
   - `src/shared/utils/attendanceSheetGenerator.ts` (Línea 5): `import { jsPDF } from 'jspdf';` (estático).
   - **Impacto de bundle comprobado en build:**
     - `jspdf.es.min-*.js`: **390.16 kB** (gzip: 128.61 kB)
     - `html2canvas.esm-*.js`: **201.42 kB** (gzip: 48.03 kB)
     Ambas librerías suman casi 600 kB que actualmente se empaquetan estáticamente o se asocian a rutas tempranas.

2. **Componentes con importación estática en lugar de `React.lazy`:**
   - `src/pages/app-home/HomePage.tsx` (Línea 42): `import { FighterCard } from '@/widgets/FighterCard';`. Se usa solo en la pestaña `'entrenamiento'` (línea 410).
   - `src/pages/kiosk-checkin/KioskCheckinPage.tsx` (Línea 49): `import { QrCameraScanner } from '@/widgets/QrCameraScanner';`. Se usa solo cuando `scannerActive === true` (línea 713). Importa internamente `html5-qrcode`.
   - **Impacto:** `KioskCheckinPage` pesa actualmente **365.77 kB** en el bundle debido a que arrastra el código de cámara y QR en la carga inicial de la tablet.

3. **`package.json` (Línea 29):**
   - **Observación directa:** `"firebase-admin": "^14.5.0"` está declarado en `dependencies`.
   - **Verificación de uso:** `git grep -n "firebase-admin" src/` arrojó 0 coincidencias. Es un paquete server-side de Node.js totalmente innecesario e inadecuado para la SPA cliente.

4. **`vite.config.ts` (Líneas 21-25):**
   - **Observación directa:**
     ```typescript
     manualChunks: {
       'vendor-react': ['react', 'react-dom', 'react-router-dom'],
       'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
       'vendor-icons': ['lucide-react'],
     }
     ```
     Falta aislar librerías pesadas como `framer-motion` y los paquetes de QR (`qrcode`, `html5-qrcode`).

---

### Tarea 4.4: Optimización Algorítmica O(U + B) en PersonalPage.tsx

1. **`src/pages/admin-personal/PersonalPage.tsx`:**
   - Línea 99-105:
     ```typescript
     const getRetentionRiskForUser = (user: UserDomainModel): RetentionRisk => {
       if (user.accountStatus === 'FROZEN' || user.accountStatus === 'PAUSED') {
         return 'LOW';
       }
       const userBookings = bookings.filter((b) => b.uid === user.uid);
       return deriveRetentionRisk(userBookings, now);
     };
     ```
   - **Llamadas redundantes:**
     - Línea 231: Dentro de `retentionStats = React.useMemo(...)`, se recorre `effectiveUsers` (U usuarios) y por cada uno se invoca `getRetentionRiskForUser`, que a su vez filtra el array global `bookings` (B reservas) -> $O(U \times B)$.
     - Línea 277: Dentro de `filteredUsers = effectiveUsers.filter(...)`, se vuelve a llamar a `getRetentionRiskForUser` por cada usuario -> $O(U \times B)$.
     - Línea 588: En el renderizado de la tabla (`filteredUsers.map(...)`), se vuelve a llamar a `getRetentionRiskForUser` por cada fila -> $O(U \times B)$.
   - **Impacto:** Con 100 usuarios y 1.000 reservas, cada render ejecuta más de 300.000 operaciones de comparación de strings, degradando la respuesta de los filtros y el scroll.

---

## 2. Logic Chain (Cadena de Razonamiento y Soluciones)

1. **Paralelización con `Promise.all` (Tarea 4.1):**
   - En `HomePage.tsx`, las consultas de `payments`, `bookings`, `freezes`, `schedules` y `scheduleExceptions` no dependen entre sí; solo requieren `user.uid`. Agruparlas en un solo `await Promise.all([...])` reduce el tiempo total de espera al $\max(t_i)$ en lugar de $\sum t_i$.
   - Lo mismo aplica a `SchedulePage.tsx` (4 consultas simultáneas), `CajaPage.tsx` (3 consultas simultáneas) y `PersonalPage.tsx` (2 consultas simultáneas).
   - En `AttendanceAdminPage.tsx`, reemplazar el `for ... updateDoc` por `writeBatch(db)` reduce $N$ peticiones secuenciales de red a una única transacción HTTP/2 atómica, eliminando estados inconsistentes si la conexión se interrumpe a mitad del check-in.

2. **Scans y Estado Local (Tarea 4.2):**
   - En `PersonalPage.tsx`, como `deriveRetentionRisk` solo consulta los últimos 56 días, restringir la query con `where('date', '>=', minDateStr)` (calculando `minDateStr` a 60 días en el pasado en formato `YYYY-MM-DD`) reduce el volumen de descarga de reservas drásticamente conforme la academia acumula historial.
   - En `CajaPage.tsx`, tras actualizar un documento en Firestore (`updateDoc`), mutar el estado local `setPayments(prev => ...)` o `setFreezeRequests(prev => ...)` preserva la consistencia visual de inmediato sin disparar tres consultas masivas de recarga.
   - En `KioskCheckinPage.tsx`, cargar la colección `kiosk_members` una sola vez en memoria (o en un `kioskMembersCache`) al iniciar el componente permite que la búsqueda por alias sea instantánea ($O(1)$ red, filtrado local en microsegundos) y no genere peticiones en cada pulsación del teclado.

3. **Code Splitting Dinámico (Tarea 4.3):**
   - Cambiar `import html2canvas from 'html2canvas'` e `import { jsPDF } from 'jspdf'` por `await import(...)` dentro de las funciones exportadas de generación hace que Webpack/Vite empaquete estas librerías en chunks asíncronos bajo demanda. Solo se transferirán por la red si el usuario pulsa "Descargar Justificante", "Diploma" u "Hoja de Asistencia".
   - `FighterCard` y `QrCameraScanner` deben importarse mediante `React.lazy` y envolverse en `<React.Suspense>`. De este modo, la pantalla de inicio y la pantalla del kiosco no cargan los scripts de radar/cámara hasta que el usuario activa expresamente dichas secciones.
   - Eliminar `"firebase-admin"` de `package.json` reduce dependencias muertas y evita advertencias o inclusiones accidentales de módulos de Node en Vite.
   - Configurar `vendor-motion` y `vendor-qrcode` en `manualChunks` aísla los paquetes grandes para mejorar el cacheo en el navegador.

4. **Indexación $O(U + B)$ (Tarea 4.4):**
   - Pre-indexando `bookings` en un `Map<string, BookingDomainModel[]>` mediante `useMemo` con dependencia `[bookings]`, se invierte un único recorrido $O(B)$ al recibir los datos.
   - Las consultas por usuario dentro de filtros, estadísticas y renders se convierten en `map.get(user.uid) || []`, con coste $O(1)$.
   - La complejidad global de procesamiento pasa de $O(U \times B)$ a $O(U + B)$.

---

## 3. Caveats (Advertencias y Suposiciones Consideradas)

1. **Formato de fecha en `bookings`:**
   - En Firestore, el campo `date` en los documentos de `bookings` se almacena como string ISO corto: `YYYY-MM-DD` (ej: `2026-11-07`), como se constata en `SchedulePage.tsx` y `AttendanceAdminPage.tsx`. El filtro de 60 días debe usar `minDateStr = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)` para que la comparación lexicográfica de Firestore `where('date', '>=', minDateStr)` funcione de forma exacta sin requerir índice compuesto especial en igualdad.
2. **Límite de `writeBatch` en Firestore:**
   - La API de Firestore permite un máximo de 500 operaciones por batch. En `AttendanceAdminPage.tsx`, el aforo máximo de una clase es de 26 a 30 atletas, por lo que el batch en `handleCheckInAll` nunca superará el límite.
3. **Manejo de llamadas síncronas a PDFs:**
   - En `CajaPage.tsx` y `AttendanceAdminPage.tsx`, los botones de descarga de PDF que antes invocaban funciones síncronas deberán invocar las funciones asíncronas (`await downloadReceiptPdf(...)` o `.catch(...)`).
4. **Verificación única de build:**
   - Conforme a la restricción R6 del proyecto, no deben ejecutarse tests automáticos (`vitest`). La única verificación técnica obligatoria es `npx vite build`.

---

## 4. Conclusion (Plan de Implementación Concreto para el Worker)

A continuación se presenta la guía paso a paso y los snippets listos para ser implementados por el Worker:

### Paso 1: Tarea 4.1 (Waterfalls & writeBatch)
- **`src/pages/app-home/HomePage.tsx`:**
  Reemplazar las líneas 69-107 por:
  ```typescript
  const now = new Date();
  const paymentsQuery = query(collection(db, 'payments'), where('uid', '==', user.uid));
  const bookingsQuery = query(collection(db, 'bookings'), where('uid', '==', user.uid));
  const freezesQuery = query(collection(db, 'freezes'), where('uid', '==', user.uid));
  const schedQuery = query(collection(db, 'schedules'), where('active', '==', true));
  const excQuery = collection(db, 'scheduleExceptions');

  const [paymentsSnap, bookingsSnap, freezesSnap, schedSnap, excSnap] = await Promise.all([
    getDocs(paymentsQuery),
    getDocs(bookingsQuery),
    getDocs(freezesQuery),
    getDocs(schedQuery),
    getDocs(excQuery),
  ]);

  const payments: PaymentDomainModel[] = [];
  paymentsSnap.forEach((d) => payments.push({ id: d.id, ...(d.data() as Omit<PaymentDomainModel, 'id'>) }));

  const userBookings: BookingDomainModel[] = [];
  bookingsSnap.forEach((d) => userBookings.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
  setBookings(userBookings);

  const freezes: FreezeDomainModel[] = [];
  freezesSnap.forEach((d) => freezes.push({ id: d.id, ...(d.data() as Omit<FreezeDomainModel, 'id'>) }));

  const status = derivePaymentStatus({ billingType: 'MONTHLY', payments, bookings: userBookings, freezes, now });
  setDerivedStatus(status);

  const schedList: ScheduleDomainModel[] = [];
  schedSnap.forEach((d) => schedList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
  setSchedules(schedList.length > 0 ? schedList : DEFAULT_OFFICIAL_SCHEDULES);

  const excList: ScheduleExceptionDomainModel[] = [];
  excSnap.forEach((d) => excList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) }));
  setExceptions(excList);
  ```

- **`src/pages/app-horario/SchedulePage.tsx`:**
  En `fetchScheduleData()`, paralelizar las 4 queries con `Promise.all`:
  ```typescript
  const schedQuery = query(collection(db, 'schedules'), where('active', '==', true));
  const excQuery = collection(db, 'scheduleExceptions');
  const bQuery = user
    ? query(collection(db, 'bookings'), where('uid', '==', user.uid), where('date', '==', selectedDateStr))
    : null;
  const capQuery = query(collection(db, 'class_capacity'), where('date', '==', selectedDateStr));

  const [schedSnap, excSnap, bSnap, capSnap] = await Promise.all([
    getDocs(schedQuery),
    getDocs(excQuery),
    bQuery ? getDocs(bQuery) : Promise.resolve(null),
    getDocs(capQuery),
  ]);
  ```

- **`src/pages/admin-caja/CajaPage.tsx`:**
  En `fetchCajaData()`, paralelizar:
  ```typescript
  const [paySnap, uSnap, frSnap] = await Promise.all([
    getDocs(collection(db, 'payments')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'freezeRequests')),
  ]);
  ```

- **`src/pages/admin-personal/PersonalPage.tsx`:**
  En `fetchUsersAndHistory()`, paralelizar users y bookings (aplicando el filtro de 60 días):
  ```typescript
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const minDateStr = sixtyDaysAgo.toISOString().slice(0, 10);

  const bookingsQuery = query(collection(db, 'bookings'), where('date', '>=', minDateStr));
  const [usersSnap, bookingsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(bookingsQuery),
  ]);
  ```

- **`src/pages/admin-asistencia/AttendanceAdminPage.tsx`:**
  - En `fetchStudents()`, paralelizar `users` y `kiosk_members` con `Promise.all`.
  - Importar `writeBatch` desde `'firebase/firestore'`.
  - En `handleCheckInAll()`, sustituir el bucle secuencial por:
    ```typescript
    const batch = writeBatch(db);
    for (const booking of pendingBookings) {
      const student = students[booking.uid];
      const isFrozen = student?.accountStatus === 'FROZEN' || student?.accountStatus === 'PAUSED';
      const effectiveType: SessionType = isFrozen ? 'OBSERVER' : (booking.sessionType || 'PARTICIPANT');

      batch.update(doc(db, 'bookings', booking.id), {
        status: 'ATTENDED',
        checkInSource: 'ADMIN',
        sessionType: effectiveType,
        attendanceWeight: getAttendanceWeight(effectiveType),
      });
    }

    const capRef = doc(db, 'class_capacity', `cap_${selectedScheduleId}_${selectedDateStr}`);
    batch.set(
      capRef,
      {
        scheduleId: selectedScheduleId,
        date: selectedDateStr,
        bookedCount: attendedBookings.length + pendingBookings.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
    ```

### Paso 2: Tarea 4.2 (Full Scans & Estado Local)
- **`src/pages/admin-caja/CajaPage.tsx`:**
  Reemplazar las llamadas a `await fetchCajaData()` tras acciones de cobro/aprobación por actualizaciones del estado React local:
  - En `handleApprovePayment`:
    ```typescript
    await updateDoc(doc(db, 'payments', payment.id), updateData);
    setPayments((prev) => prev.map((p) => (p.id === payment.id ? { ...p, ...updateData } : p)));
    ```
  - En `handleConfirmReject`:
    ```typescript
    await updateDoc(doc(db, 'payments', rejectingPayment.id), {
      status: 'REJECTED',
      rejectedReason: rejectReason,
      validatedBy: user.uid,
      validatedAt: serverTimestamp(),
    });
    setPayments((prev) =>
      prev.map((p) =>
        p.id === rejectingPayment.id ? { ...p, status: 'REJECTED', rejectedReason: rejectReason } : p
      )
    );
    setRejectingPayment(null);
    ```
  - En `handleCreatePosCharge`:
    ```typescript
    await setDoc(doc(db, 'payments', paymentId), newPaymentData);
    setPayments((prev) => [{ id: paymentId, ...newPaymentData } as PaymentDomainModel, ...prev]);
    setShowPosModal(false);
    ```
  - En `handleApproveFreeze`:
    ```typescript
    setFreezeRequests((prev) => prev.map((f) => (f.id === req.id ? { ...f, status: 'APPROVED' } : f)));
    ```
  - En `handleRejectFreeze`:
    ```typescript
    setFreezeRequests((prev) => prev.map((f) => (f.id === req.id ? { ...f, status: 'REJECTED' } : f)));
    ```

- **`src/pages/kiosk-checkin/KioskCheckinPage.tsx`:**
  - Cargar `kiosk_members` una sola vez en un estado `membersCache: KioskMember[]` al montar el componente.
  - El `useEffect` que escucha `searchTerm` solo filtra sobre `membersCache` en memoria sin invocar `getDocs`.
  - Reutilizar `membersCache` dentro de `fetchTodayAttendees` en vez de llamar a `getDocs(collection(db, 'kiosk_members'))`.

### Paso 3: Tarea 4.3 (Dynamic Imports, React.lazy, package.json y Vite)
- **`src/shared/utils/cardDownloader.ts`:**
  Eliminar import estático de `html2canvas` y usar:
  ```typescript
  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default || html2canvasModule;
  const canvas = await html2canvas(element, { ... });
  ```
- **`src/shared/utils/receiptGenerator.ts`:**
  Eliminar import estático de `jsPDF`:
  ```typescript
  export async function generatePosReceiptPdf(data: ReceiptData): Promise<any> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ ... });
    ...
    return doc;
  }
  export async function downloadReceiptPdf(data: ReceiptData): Promise<void> {
    const doc = await generatePosReceiptPdf(data);
    doc.save(`Recibo_247_${data.receiptNumber}.pdf`);
  }
  ```
- **`src/shared/utils/diplomaGenerator.ts`:**
  ```typescript
  export async function generateGraduationDiplomaPdf(athlete: UserDomainModel, dateStr?: string): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ ... });
    ...
  }
  ```
- **`src/shared/utils/attendanceSheetGenerator.ts`:**
  ```typescript
  export async function generateAttendanceSheetPdf(data: AttendanceSheetData): Promise<any> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ ... });
    ...
    return doc;
  }
  export async function downloadAttendanceSheetPdf(data: AttendanceSheetData): Promise<void> {
    const doc = await generateAttendanceSheetPdf(data);
    doc.save(...);
  }
  ```
- **`src/pages/app-home/HomePage.tsx`:**
  ```typescript
  const FighterCard = React.lazy(() =>
    import('@/widgets/FighterCard').then((m) => ({ default: m.FighterCard }))
  );
  ```
  Envolver `<FighterCard ... />` en `<React.Suspense fallback={<div className="h-64 flex items-center justify-center text-slate-400">Cargando ficha...</div>}>`.
- **`src/pages/kiosk-checkin/KioskCheckinPage.tsx`:**
  ```typescript
  const QrCameraScanner = React.lazy(() =>
    import('@/widgets/QrCameraScanner').then((m) => ({ default: m.QrCameraScanner }))
  );
  ```
  Envolver `<QrCameraScanner ... />` en `<React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Iniciando cámara QR...</div>}>`.
- **`package.json`:**
  Eliminar `"firebase-admin": "^14.5.0",` de `dependencies`.
- **`vite.config.ts`:**
  Aislar chunks manuales:
  ```typescript
  manualChunks: {
    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
    'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
    'vendor-motion': ['framer-motion'],
    'vendor-icons': ['lucide-react'],
    'vendor-qrcode': ['qrcode', 'html5-qrcode'],
  }
  ```

### Paso 4: Tarea 4.4 (Optimización O(U + B) en PersonalPage.tsx)
- En `src/pages/admin-personal/PersonalPage.tsx`:
  ```typescript
  // Indexación O(B) en memoria con useMemo
  const bookingsByUid = React.useMemo(() => {
    const map = new Map<string, BookingDomainModel[]>();
    for (const b of bookings) {
      const list = map.get(b.uid);
      if (list) {
        list.push(b);
      } else {
        map.set(b.uid, [b]);
      }
    }
    return map;
  }, [bookings]);

  // Consulta O(1) por usuario
  const getRetentionRiskForUser = React.useCallback(
    (user: UserDomainModel): RetentionRisk => {
      if (user.accountStatus === 'FROZEN' || user.accountStatus === 'PAUSED') {
        return 'LOW';
      }
      const userBookings = bookingsByUid.get(user.uid) || [];
      return deriveRetentionRisk(userBookings, now);
    },
    [bookingsByUid, now]
  );
  ```
  Con esto, tanto `retentionStats`, `filteredUsers` como la tabla renderizan en tiempo estrictamente lineal $O(U + B)$.

---

## 5. Verification Method (Método de Verificación Independiente)

1. **Comando de verificación único (Restricción R6):**
   ```powershell
   npx vite build
   ```
   - Debe finalizar con código de salida `0`.
   - Verificar la lista de chunks generados en `dist/assets/`:
     - `jspdf` y `html2canvas` deben aparecer como chunks independientes generados bajo demanda.
     - `KioskCheckinPage` debe reducir su tamaño inicial al desacoplarse `QrCameraScanner` y `html5-qrcode`.
     - `package.json` no debe incluir `firebase-admin`.
2. **Revisión estática de código (Spot-checks):**
   - Verificar que no queden `for` loops llamando a `await updateDoc` en `AttendanceAdminPage.tsx`.
   - Verificar que no queden consultas `getDocs(collection(db, 'kiosk_members'))` disparadas por eventos de teclado `[searchTerm]` en `KioskCheckinPage.tsx`.
   - Comprobar que `PersonalPage.tsx` tiene el `useMemo` del `Map<string, BookingDomainModel[]>`.
   - Comprobar que `PersonalPage.tsx` filtra `bookings` con `where('date', '>=', minDateStr)`.
3. **Condiciones de invalidación:**
   - Si `npx vite build` produce error de tipos en llamadas asíncronas de PDF o en `writeBatch`, corregir los tipos o los retornos de las promesas.
   - Si se detecta algún archivo fuera de `.agents/teamwork/explorer_survey_2/` modificado por el explorador (se mantuvo modo lectura estricto).
