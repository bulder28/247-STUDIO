# Challenger 2 Review Report: Milestone 2 (Unidad de Trabajo 4)

**Agente:** Challenger 2 (Empirical Challenger / Specialist)  
**Milestone:** Milestone 2 — Unidad de Trabajo 4: Arquitectura React & Rendimiento Firestore  
**Veredicto Oficial:** `APPROVE`

---

## 1. Observation

A través de inspección estática profunda y pruebas empíricas ejecutadas localmente, se verificaron los siguientes elementos:

### 1.1 Tarea 4.1: Concurrencia Promise.all y Operaciones writeBatch
- **`src/pages/app-home/HomePage.tsx` (l. 78-84):**
  ```typescript
  const [paymentsSnap, bookingsSnap, freezesSnap, schedSnap, excSnap] = await Promise.all([
    getDocs(paymentsQuery),
    getDocs(bookingsQuery),
    getDocs(freezesQuery),
    getDocs(schedQuery),
    getDocs(excQuery),
  ]);
  ```
  Las 5 consultas se ejecutan de manera concurrente sobre HTTP/2 sin dependencias cruzadas en la fase de resolución.
- **`src/pages/app-horario/SchedulePage.tsx` (l. 92-97):**
  ```typescript
  const [schedSnap, excSnap, bSnap, capSnap] = await Promise.all([
    getDocs(schedQuery),
    getDocs(excQuery),
    bQuery ? getDocs(bQuery) : Promise.resolve(null),
    getDocs(capQuery),
  ]);
  ```
  El condicional `bQuery ? getDocs(bQuery) : Promise.resolve(null)` garantiza la paralelización segura sin fallar cuando `user` no está autenticado o es nulo.
- **`src/pages/admin-caja/CajaPage.tsx` (l. 69-73):**
  `Promise.all` agrupa las descargas independientes de `payments`, `users` y `freezeRequests`.
- **`src/pages/admin-personal/PersonalPage.tsx` (l. 86-89):**
  `Promise.all` agrupa concurrentemente `users` y la consulta filtrada de `bookings`.
- **`src/pages/admin-asistencia/AttendanceAdminPage.tsx` (l. 92-95 y l. 215-248):**
  - Carga concurrente con `Promise.all` de `users` y `kiosk_members`.
  - En `handleCheckInAll`:
    ```typescript
    if (pendingBookings.length === 0) return;
    ...
    const batch = writeBatch(db);
    for (const booking of pendingBookings) {
      batch.update(doc(db, 'bookings', booking.id), ...);
    }
    batch.set(capRef, { ... }, { merge: true });
    await batch.commit();
    ```
    Si `pendingBookings` está vacío (`length === 0`), se aborta inmediatamente con `return` temprano sin crear el batch. Si contiene un único elemento (`length === 1`), emite exactamente 2 operaciones atómicas (`update` en booking y `set` en capacity) dentro del límite de 500 escrituras de Firestore.

### 1.2 Tarea 4.2: Ventana Temporal de 60 Días y Sincronización de Estado en Caja
- **Filtro de 60 días en `PersonalPage.tsx` (l. 81-85):**
  Calcula `sixtyDaysAgo` y filtra con `where('date', '>=', minDateStr)`.
  - En `src/shared/domain/attendance.ts`, la función pura `deriveRetentionRisk` computa métricas sobre dos ventanas fijas: ventana 1 (últimos 28 días) y ventana 2 (de 28 a 56 días atrás).
  - Mediante el arnés empírico `fuzz_retention.cjs` se ejecutaron **14.641 combinaciones de prueba** comparando `deriveRetentionRisk(fullHistory, now)` frente a `deriveRetentionRisk(filteredHistory, now)`. Se obtuvieron **0 discrepancias** (100% de paridad).
  - Cuando un atleta no registra asistencia en más de 60 días, el historial filtrado retorna `[]`, evaluando a `attendedBookings.length === 0` que deriva a `'HIGH'`, coincidiendo idénticamente con la regla `daysSinceLastAttended >= 21 => 'HIGH'` del historial completo.
- **Sincronización de Estado Local en `CajaPage.tsx` (l. 138-140, l. 163-174, l. 236-239):**
  Las mutaciones locales utilizan functional updaters inmutables `setPayments((prev) => prev.map(...))` y `setFreezeRequests((prev) => prev.map(...))`.
  - Mediante el test empírico `test_caja_state.cjs`, se verificó que la transición entre estados (`PENDING_APPROVAL` → `APPROVED` / `REJECTED`) actualiza de inmediato `periodPayments`, `approvedPayments`, `pendingPayments`, y los acumuladores financieros (`totalRecaudadoCents`, `totalCashCents`, `totalBizumCents`), sin drift de estado al cambiar entre selectores y pestañas.

### 1.3 Tarea 4.3: Eliminación de firebase-admin y Aislamiento de Chunks en Vite
- **Búsqueda global de `firebase-admin`:**
  - `package.json`: Eliminado de `dependencies` (0 apariciones).
  - `src/`: 0 coincidencias en toda la base de código.
- **Generación de Chunks Limpios:**
  Ejecución verificada de `npx vite build`:
  - `dist/assets/KioskCheckinPage-BgxWW5z8.js`: 24.27 kB (reducción dramática de 365 kB).
  - `dist/assets/QrCameraScanner-Co7Lb8eJ.js`: 2.89 kB (Lazy chunk).
  - `dist/assets/FighterCard-DpDR-lwy.js`: 9.56 kB (Lazy chunk).
  - `dist/assets/jspdf.es.min-BIkcR7Af.js`: 390.63 kB (Dynamic import bajo demanda).
  - `dist/assets/html2canvas.esm-CBrSDip1.js`: 201.42 kB (Dynamic import bajo demanda).
  - Chunks vendor aislados: `vendor-react` (206.38 kB), `vendor-firebase` (599.25 kB), `vendor-motion` (148.67 kB), `vendor-icons` (36.79 kB), `vendor-qrcode` (358.77 kB).
- **Análisis de Dependencias Circulares:**
  - El escáner DFS sobre el grafo de importaciones de los 88 módulos de `src/` confirmó **0 dependencias circulares**.

### 1.4 Tarea 4.4: Reducción Algorítmica O(U + B) en PersonalPage.tsx
- **`PersonalPage.tsx` (l. 110-121):**
  ```typescript
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
  ```
  Las reservas se pre-indexan en un único pase lineal $O(B)$ cuando se actualiza el estado de `bookings`.
  En cada consulta por usuario, `getRetentionRiskForUser` extrae las reservas mediante `bookingsByUid.get(user.uid)` en tiempo $O(1)$.
  La complejidad agregada de procesar $U$ atletas sobre $B$ reservas se reduce efectivamente de $O(U \times B)$ a $O(U + B)$.

---

## 2. Logic Chain

1. **Paralelización en Red:**
   - Al pasar de llamadas `await` consecutivas a `Promise.all` en las 5 páginas auditadas, el tiempo de carga ya no escala con la suma acumulada $\sum t_i$, sino con el cuello de botella de la petición individual más lenta $\max(t_i)$.
2. **Robustez de Batch:**
   - La comprobación `if (pendingBookings.length === 0) return;` previene llamadas no operativas a Firestore. El payload emite 1 `setDoc` adicional para consistencia de aforo, cumpliendo tanto atomicidad como idempotencia.
3. **Invarianza de Retención ante Filtrado Temporal:**
   - Dado que el algoritmo `deriveRetentionRisk` solo evalúa una ventana histórica máxima de 56 días ($56 \times 86.400.000\text{ ms}$), filtrar a nivel de Firestore por los últimos 60 días garantiza que ningún dato relevante para la fórmula sea truncado. Los alumnos sin reservas recientes reciben la clasificación `'HIGH'` de forma equivalente tanto con el historial completo como con el filtrado.
4. **Optimización de Memoria y Ciclos:**
   - El uso de `Map<string, BookingDomainModel[]>` garantiza un tiempo de acceso $O(1)$ por clave UID.

---

## 3. Caveats

1. **Observación no bloqueante en ciclos de render (`PersonalPage.tsx`):**
   - En `PersonalPage.tsx` (l. 77), la declaración `const now = new Date();` se ejecuta en el cuerpo del componente en cada ciclo de render.
   - Como consecuencia, el objeto `now` tiene una referencia nueva en cada render, invalidando el hook `getRetentionRiskForUser = React.useCallback(..., [bookingsByUid, now])`.
   - Esto provoca que `retentionStats = React.useMemo(..., [effectiveUsers, getRetentionRiskForUser])` se re-ejecute en cada render (por ejemplo al teclear en el buscador `searchTerm`).
   - **Evaluación de impacto:** No afecta la corrección de datos ni revierte la complejidad a $O(U \times B)$ (la consulta interna sigue siendo $O(1)$ gracias a `bookingsByUid`, manteniendo un coste ligero $O(U)$). Se documenta como recomendación de optimización para futuras iteraciones (estabilizar `now` con `useMemo` o `useRef`).
2. **Restricción R6 respetada:**
   - En estricto cumplimiento de R6, no se ejecutó ningún runner de tests (`vitest`, `npm test`). Todas las pruebas empíricas se ejecutaron mediante arneses ad-hoc de Node.js y `npx vite build`.

---

## 4. Conclusion

**Veredicto:** `APPROVE`

El trabajo realizado por Worker M2 para la Unidad de Trabajo 4 (Milestone 2) cumple exhaustivamente con todos los criterios de aceptación técnicos y arquitectónicos:
- Waterfalls de red eliminados con `Promise.all`.
- `writeBatch` maneja casos vacíos y unitarios de forma robusta y atómica.
- El filtrado de 60 días en `PersonalPage` preserva al 100% la exactitud del cálculo de riesgo de abandono.
- `CajaPage` mantiene sincronización completa del estado local entre vistas sin degradación ni re-peticiones innecesarias.
- Eliminación limpia de `firebase-admin` y chunks aislados verificados sin dependencias circulares.
- Reducción algorítmica $O(U + B)$ consolidada y funcional.

---

## 5. Verification Method

Para reproducir independientemente todas las comprobaciones de este informe:

1. **Compilación de Producción:**
   ```powershell
   npx vite build
   ```
   *Salida esperada:* Código de salida 0, 0 errores, chunks aislados generados.

2. **Fuzzing de Retención (14.641 escenarios):**
   ```powershell
   node .agents/teamwork/challenger_m2_2/fuzz_retention.cjs
   ```
   *Salida esperada:* `Fuzzing complete: 14641 scenarios tested. Discrepancies: 0`

3. **Sincronización de Estado en Caja:**
   ```powershell
   node .agents/teamwork/challenger_m2_2/test_caja_state.cjs
   ```
   *Salida esperada:* `CajaPage state transitions and tab synchronization verified cleanly! 0 state drift.`

4. **Detección de Dependencias Circulares:**
   ```powershell
   node .agents/teamwork/challenger_m2_2/check_circular.cjs
   ```
   *Salida esperada:* `0 circular dependencies detected among 88 source files!`
