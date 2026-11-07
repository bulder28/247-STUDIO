# Handoff Report: Survey Explorer 3 — R4 (Gym ERP & Lógica de Negocio) & R5 (UI/UX, Accesibilidad & Design System)

## 1. Observation

### R4: Unidad de Trabajo 1 (ERP & Lógica de Negocio Gym)

#### Tarea 1.1: Sustitución de modales y alertas por Radix Dialog
- **Componente `@/shared/ui/dialog`**:
  - Implementado en `src/shared/ui/dialog.tsx` utilizando `@radix-ui/react-dialog`. Exporta: `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogClose`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`.
- **Detección directa de `alert()`, `confirm()`, `prompt()` y divs de modal fijos**:
  1. `src/pages/admin-personal/PersonalPage.tsx`:
     - Línea 128: `const reason = prompt('Motivo de la pausa deportiva (ej: Esguince de rodilla, Viaje laboral):', 'Lesión deportiva');` en `handleFreezeUser`.
     - Línea 155: `if (!confirm('¿Seguro que deseas pasar este alumno a INACTIVE? Perderá acceso a la reserva de clases.')) { return; }` en `handleDeactivateUser`.
     - Nota: Ya importa `Dialog, DialogContent, DialogHeader, DialogTitle` en la línea 47 para el editor de stats/cinturón.
  2. `src/pages/admin-asistencia/AttendanceAdminPage.tsx`:
     - Línea 324: `const ok = confirm(\`Aviso: \${targetStudent.alias} tiene su cuenta en PAUSA POR LESIÓN. ¿Deseas registrar su asistencia como OBSERVADOR (0.5x)?\`);` en `handleAddStudentManual`.
     - Línea 380: `if (!confirm('¿Seguro que deseas eliminar esta reserva/asistencia?')) return;` en `handleRemoveBooking`.
     - Línea 445: `if (!confirm(\`¿Confirmas \${label} a \${student.alias}?\`)) { return; }` en `handlePromoteStudent`.
     - Línea 512: `alert('No hay datos de asistencia para exportar en el mes seleccionado.');` en `handleExportCsv`.
  3. `src/pages/admin-caja/CajaPage.tsx`:
     - Línea 234: `alert('Este alumno no tiene número de teléfono registrado.');` en `handleSendWhatsAppReminder`.
     - Líneas 639–811: modal custom con `<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">` (`showPosModal`, Cobro Mostrador TPV).
     - Líneas 814–845: modal custom con `<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">` (`rejectingPayment`, Rechazo de Pago).
  4. `src/pages/admin-horarios/SchedulesAdminPage.tsx`:
     - Línea 321: `if (!confirm(\`¿Seguro que deseas eliminar la clase de \${s.program} (\${s.startTime} - \${s.endTime})?\`)) { return; }` en `handleDeleteSchedule`.
  5. `src/pages/admin-tarifas/TariffsAdminPage.tsx`:
     - Línea 209: `if (!confirm('¿Deseas cargar las 6 tarifas oficiales de 247Studio (Estándar 75€, Fundador 60€, Familiar 55€, Bono 110€, Kids 50€, Drop-In 15€)?')) { return; }` en `handleRestoreOfficialTariffs`.

---

#### Tarea 1.2: Desactivación de Datos Mock por Defecto en Producción y Sincronización users ↔ kiosk_members
- **`src/pages/admin-personal/PersonalPage.tsx`**:
  - Línea 65: `const [includeMockAthletes, setIncludeMockAthletes] = useState(true);` — Inicializado en `true` por defecto.
  - Líneas 259–267 (`beltStatsData`):
    ```ts
    const beltStatsData: BeltStatsData = {
      profesorCount: profesorCount > 0 ? profesorCount : 1,
      blackCount: blackCount > 0 ? blackCount : 3,
      brownCount: brownCount > 0 ? brownCount : 3,
      purpleCount: purpleCount > 0 ? purpleCount : 5,
      blueCount: blueCount > 0 ? blueCount : 8,
      whiteCount: whiteCount > 0 ? whiteCount : 15,
      totalCount: effectiveUsers.length,
    };
    ```
    Presenta números artificiales forzados (`1, 3, 3, 5, 8, 15`) en lugar de reflejar los censos reales calculados cuando no hay atletas en esa categoría.
  - Líneas 40–70 en `src/widgets/BeltStatisticsCard.tsx`:
    `stats.profesorCount ?? 1`, `stats.blackCount ?? 3`, `stats.brownCount ?? 3`, `stats.purpleCount ?? 5`, `stats.blueCount ?? 8`, `stats.whiteCount ?? 15`. Fallbacks artificiales redundantes.
  - Líneas 195–213 en `handleSaveEditor`:
    Guarda `belt`, `stripes` y `stats` en `users/{uid}`, pero NO sincroniza `kiosk_members/{uid}`.
- **`src/widgets/KokoroAssistant.tsx`**:
  - Líneas 49–54:
    ```ts
    const [liveMetrics, setLiveMetrics] = useState<{ ... }>({
      totalActiveUsers: 24,
      frozenCount: 0,
      atRiskCount: 3,
      monthlyRevenueEstimateCents: 145000,
    });
    ```
    Métricas inicializadas con valores falsos de demo (24 activos, 3 en riesgo, 1450 €).
  - Líneas 77–82 en `loadLiveMetrics`:
    `totalActiveUsers: active > 0 ? active : 24`, `monthlyRevenueEstimateCents: revCents > 0 ? revCents : 145000`.
  - Línea 174:
    `currentUser: userData || SAMPLE_ATHLETES_20[0],`
    Inyecta a David Gómez (atleta mock) como usuario activo cuando `userData` es nulo.
- **Sincronización `kiosk_members` en graduación (`src/pages/admin-asistencia/AttendanceAdminPage.tsx`)**:
  - Líneas 451–456 en `handlePromoteStudent`:
    ```ts
    await updateDoc(doc(db, 'users', student.uid), {
      belt: promotion.nextBelt,
      stripes: promotion.nextStripes,
      beltDate: madridNow.dateStr,
      updatedAt: serverTimestamp(),
    });
    ```
    No actualiza `kiosk_members/{student.uid}`, dejando el quiosco desincronizado tras graduaciones de tatami.

---

#### Tarea 1.3: Graduación BJJ Acumulada desde beltDate
- **`src/shared/domain/graduation.ts`**:
  - Líneas 95–112: `export function calculateGraduationProgress(attendancesCount: number, targetClasses = 25): GraduationProgress`.
  - Devuelve `{ currentClasses, targetClasses, percentage, isReady, classesRemaining }`.
- **`src/pages/admin-asistencia/AttendanceAdminPage.tsx`**:
  - Líneas 53–62: `StudentDirectoryItem` omite `beltDate`.
  - Líneas 90–104: `fetchStudents` no almacena `data.beltDate` en el diccionario `students`.
  - Líneas 409–436 & 493–508: `fetchMonthlyReport` solo descarga `bookings` filtrados por `date.startsWith(reportMonth)` (mes actual, ej. `2026-11`).
  - Líneas 1120–1230: En la pestaña `GRADUATIONS`, se utiliza `studentMonthlyAggregates` (restringido al mes actual) y se calcula el progreso como `Math.min(100, Math.round((item.totalPoints / 25) * 100))`. Alumnos con 0 asistencias este mes pero con 24 acumuladas desde su último grado desaparecen del panel de evaluación.

---

#### Tarea 1.4: Conciliación Financiera CajaPage ↔ TariffsAdminPage, Bono PASS y Pausa FROZEN
- **`src/pages/admin-tarifas/TariffsAdminPage.tsx`**:
  - Líneas 27–82: `DEFAULT_OFFICIAL_TARIFFS` define el catálogo oficial:
    - STD (BJJ Adultos Ilimitado): 75,00 € (7500 céntimos, MONTHLY)
    - SF (Socios Fundadores & FFCCSE): 60,00 € (6000 céntimos, MONTHLY)
    - FAM (Familiar & Parejas): 55,00 € (5500 céntimos, MONTHLY)
    - PASS (Bono Tatami Pass 10 Clases): 110,00 € (11000 céntimos, PASS)
    - KIDS (BJJ Kids & Teens): 50,00 € (5000 céntimos, MONTHLY)
    - DROP_IN (Clase Suelta Tatami): 15,00 € (1500 céntimos, DROP_IN)
- **`src/pages/admin-caja/CajaPage.tsx`**:
  - Líneas 200–204:
    ```ts
    if (posBillingType === 'PASS') {
      newPaymentData.sessionsIncluded = 10;
      newPaymentData.sessionsRemaining = 10;
    }
    ```
    Guarda en `payments`, pero no sincroniza el estado de bono en el documento del alumno si es alumno existente.
  - Líneas 246–267 (`handleApproveFreeze`):
    ```ts
    await setDoc(doc(db, 'freezes', freezeDocId), { ... });
    await updateDoc(doc(db, 'freezeRequests', req.id), { status: 'APPROVED' });
    ```
    NO actualiza `users/{req.uid}` a `accountStatus: 'FROZEN'` ni `kiosk_members/{req.uid}` a `accountStatus: 'PAUSED'`. El alumno aprobado para pausa sigue figurando como `ACTIVE`.
- **`src/pages/admin-asistencia/AttendanceAdminPage.tsx`**:
  - Línea 281 en `handleToggleAttendance`:
    ```ts
    bookedCount: increment(newStatus === 'ATTENDED' ? 0 : 0),
    ```
    Tiene un valor inerte `0 : 0` hardcodeado en lugar de `increment(newStatus === 'ATTENDED' ? 1 : -1)`.

---

#### Tarea 1.5: Embudo de Leads y Validaciones de Kiosco
- **`src/pages/kiosk-checkin/KioskCheckinPage.tsx`**:
  - Líneas 228–230:
    ```ts
    const inProgress = sList.find((s) => isClassInProgress(s, eList, now));
    const sched = inProgress || sList[0] || null;
    setActiveSchedule(sched);
    ```
    Si no hay clase en curso, salta arbitrariamente a `sList[0]` (ej. lunes 07:00 en lugar de la siguiente clase del día/semana con `getNextClass`).
  - Líneas 280–286 (`handleSelectStudent`) y 297–300 (`handleQrDetected`):
    Solo validan `status === 'PAUSED' || status === 'SUSPENDED'`. Omiten validar cuentas con estado `'FROZEN'` o `'INACTIVE'`.
  - Líneas 470–478 (`handleExpressTrialSubmit`):
    Crea el documento en `leads`, pero no incluye el campo `source: 'KIOSK'`.
- **`src/pages/admin-leads/LeadsAdminPage.tsx` & `src/pages/admin-alta-alumno/StudentRegistrationPage.tsx`**:
  - `LeadsAdminPage.tsx` (líneas 406–411) pasa datos del lead solo por `query string`:
    `<Link to={\`/admin/alta-alumno?leadId=\${encodeURIComponent(lead.id)}&name=\${encodeURIComponent(lead.name)}...\`}>`.
  - `StudentRegistrationPage.tsx` (líneas 50–55) lee exclusivamente `searchParams = new URLSearchParams(location.search)`. Si se navega por `state`, se pierden los datos.
  - Al completar el alta (`StudentRegistrationPage.tsx` líneas 186–194), se actualiza el lead a `CONVERTED` buscando `searchParams.get('leadId')`. Debe garantizarse la compatibilidad dual (`location.state?.leadId || searchParams.get('leadId')`).

---

### R5: Unidad de Trabajo 2 (UI/UX, Accesibilidad & Design System)

#### Tarea 2.1: Navegación Móvil en AdminLayout, Herramientas de Tatami en AppLayout y Grid responsive
- **`src/widgets/AdminLayout.tsx`**:
  - Línea 61: `<aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r ...">`.
  - En pantallas `< 768px`, el panel lateral se apila ocupando la parte superior completa sin colapsar ni disponer de botón de hamburguesa (`Menu` / `X`).
- **`src/widgets/AppLayout.tsx`**:
  - Líneas 416–500: El drawer móvil (`mobileDrawerOpen`) renderiza únicamente las rutas de `navSections`.
  - Las 6 herramientas de tatami de la barra de escritorio (líneas 184–243: *Cronómetro Sparring*, *Calculadora IBJJF*, *Currículum BJJ*, *Diario de Sparring*, *Hoja de Ruta Cinturón*, *Primeros Auxilios*) están ausentes del menú móvil.
- **`src/widgets/BeltStatisticsCard.tsx`**:
  - Línea 102: `<div className="grid grid-cols-3 gap-y-8 gap-x-4 sm:gap-x-8">`.
  - Grid fijado rígidamente a 3 columnas. En dispositivos pequeños (< 375px) los anchos colisionan.

---

#### Tarea 2.2: Accesibilidad WCAG AA, Teclado y prefers-reduced-motion
- **`src/widgets/BeltStatisticsCard.tsx`**:
  - Líneas 106–115: Los elementos interactivos de cinturón son `div` planos con `onClick`. Carecen de `role="button"`, `tabIndex={0}`, `aria-pressed={isSelected}`, y evento `onKeyDown` para teclas `Enter` / `Space`.
- **`src/widgets/FifaFighterCard.tsx`**:
  - Línea 145: El contenedor interactivo `motion.div` carece de `role="button"`, `tabIndex={0}`, `aria-label` descriptivo y soporte de teclado.
  - No respeta la preferencia de accesibilidad `useReducedMotion()` de `framer-motion` para personas con sensibilidad vestibular.
- **`src/pages/app-perfil/ProfilePage.tsx`**:
  - Líneas 239–307: Los `<label>` no tienen atributo `htmlFor` y los `<input>` no tienen `id` asociado (ej. Alias, Email de contacto, Teléfono, Email de autenticación, Contacto de emergencia).
  - Líneas 203 y 220: Botones de iconos (cámara de foto, preview de carta) sin `aria-label`.
- **`src/pages/app-horario/SchedulePage.tsx`**:
  - Línea 428: Botón de cancelación de reserva `<button onClick={...}><X className="w-4 h-4" /></button>` sin `aria-label`.
  - Líneas 266–308: Botones selectores de día y disciplina sin `aria-pressed` ni etiquetas de accesibilidad completas.

---

#### Tarea 2.3: Skeletons Anti-CLS, Filtrado de Clases por Día Actual, Borde SVG y Toasts
- **`src/pages/app-home/HomePage.tsx`**:
  - Líneas 120–124: Estado de carga resuelto con un spinner solitario `animate-spin` centrado, provocando Cumulative Layout Shift (CLS) brusco al cargar las Bento cards.
  - Línea 256: `schedules.slice(1, 3).map((s) => ...)` bajo la cabecera *"Otras sesiones programadas hoy:"*. Muestra clases de otros días arbitrarios sin filtrar por el día de la semana actual.
  - Líneas 325–327: *"Horas de Tatami Este Mes"* computa `{bookings.length} clases` usando el histórico total vitalicio en lugar de las clases asistidas en el mes en curso.
- **`src/pages/app-horario/SchedulePage.tsx`**:
  - Líneas 325–328: Renderiza un spinner `<div className="w-8 h-8 border-3 border-slate-900 animate-spin" />` provocando CLS en la parrilla horaria.
- **`src/pages/public-landing/LandingPage.tsx`**:
  - Línea 329: `{activeSchedules.slice(0, 10).map((s) => ...}` trunca artificialmente la tabla pública de horarios semanales a 10 clases, ocultando los entrenamientos de finales de semana.
- **`src/pages/app-perfil/ProfilePage.tsx`**:
  - Líneas 454–470: El modal de `QrCodePassCard` envuelve el componente en un `DialogContent` con borde, cabecera redundante (`Pase QR de Acceso`) y botón exterior `Cerrar Pase`, duplicando la tarjeta interior.
- **`src/widgets/FifaFighterCard.tsx`**:
  - Líneas 156–160: El bisel FUT está cortado con `clipPath: 'polygon(14% 0%, 86% 0%, 100% 8%, 100% 90%, 50% 100%, 0% 90%, 0% 8%)'`, pero el borde CSS `border-2 border-[#E5C158]` se recorta en los ángulos. Requiere un elemento SVG con `<polygon />` y `vectorEffect="non-scaling-stroke"` para dibujar un contorno vectorial perimetral continuo.

---

## 2. Logic Chain

```
[Observación: Línea 128 PersonalPage prompt() / Línea 155 confirm()]
  ↳ Violan el Design System y generan bloqueos sincrónicos en navegadores móviles.
  ↳ Conclusión: Sustituir por estados React que disparen <Dialog> de @/shared/ui/dialog.

[Observación: Líneas 639-811 y 814-845 CajaPage divs 'fixed inset-0']
  ↳ Modales no accesibles con escape, trap focus ni portal Radix.
  ↳ Conclusión: Reemplazar por <Dialog open={...}> / <DialogContent> de Radix.

[Observación: Líneas 65 y 259-267 PersonalPage includeMockAthletes=true y números fake]
  ↳ En producción un club real ve cinturones inventados (3 negros, 15 blancos).
  ↳ Conclusión: includeMockAthletes=false por defecto; reportar conteos reales (profesorCount, blackCount...).

[Observación: KokoroAssistant métricas en 24/1450€ y SAMPLE_ATHLETES_20[0]]
  ↳ Kokoro responde consultas a alumnos/admin con datos alucinados de atletas de muestra.
  ↳ Conclusión: Inicializar en 0; fallback a null o usuario real sin mock.

[Observación: AttendanceAdminPage línea 451 y PersonalPage línea 195 solo update users]
  ↳ El quiosco lee kiosk_members. Al graduarse en tatami, el alumno sigue con cinturón desactualizado en tablet.
  ↳ Conclusión: En cada graduación o guardado de perfil, ejecutar updateDoc(kiosk_members/{uid}, {belt, stripes...}).

[Observación: AttendanceAdminPage pestaña GRADUATIONS solo evalúa mes actual y falta beltDate]
  ↳ Las rayas BJJ se obtienen acumulando clases desde la última graduación (beltDate), no en un único mes calendario.
  ↳ Conclusión: Indexar beltDate en el censo y acumular asistencias con calculateGraduationProgress desde beltDate.

[Observación: CajaPage handleApproveFreeze no altera accountStatus]
  ↳ Pausas de cuota aprobadas mantienen a los alumnos como ACTIVE, pudiendo reservar clases y acceder al quiosco.
  ↳ Conclusión: updateDoc users/{uid} a 'FROZEN' y kiosk_members/{uid} a 'PAUSED'.

[Observación: AttendanceAdminPage línea 281 increment(newStatus === 'ATTENDED' ? 0 : 0)]
  ↳ El contador de capacidad nunca cambia al alternar asistencias.
  ↳ Conclusión: Corregir a increment(newStatus === 'ATTENDED' ? 1 : -1).

[Observación: KioskCheckinPage línea 229 fallback a sList[0]]
  ↳ Si el quiosco se abre un viernes por la tarde, sList[0] (lunes mañana) se marca como clase actual.
  ↳ Conclusión: Fallback con getNextClass(sList, eList, now).

[Observación: KioskCheckinPage trial submit no incluye source: 'KIOSK']
  ↳ El lead generado en tablet no puede atribuirse en el embudo de captación.
  ↳ Conclusión: Añadir source: 'KIOSK' en el setDoc de leads.

[Observación: AdminLayout sin drawer móvil en < 768px]
  ↳ Barra lateral no responsiva inutiliza la gestión en iPad o smartphones.
  ↳ Conclusión: Añadir cabecera con botón hamburguesa y sheet/drawer colapsable.

[Observación: AppLayout drawer móvil omite tatami tools]
  ↳ Alumnos en móvil no pueden abrir cronómetro, calculadora, currículum ni botiquín.
  ↳ Conclusión: Añadir las 6 herramientas al drawer móvil.

[Observación: BeltStatisticsCard grid-cols-3 rígido y divs sin role/teclado]
  ↳ En pantallas < 375px colapsa y no cumple WCAG AA ni navegación por teclado.
  ↳ Conclusión: grid-cols-2 sm:grid-cols-3, role="button", tabIndex={0}, Enter/Space.

[Observación: FifaFighterCard clipPath corta bordes CSS]
  ↳ Estética de carta FIFA rota en los ángulos biselados.
  ↳ Conclusión: Añadir <svg><polygon /></svg> continuo alineado a la máscara.

[Observación: HomePage y SchedulePage usan spinners pantalla completa]
  ↳ CLS medido alto según Web Vitals.
  ↳ Conclusión: Skeletons Bento animados con animate-pulse.

[Observación: LandingPage slice(0, 10) en parrilla horaria]
  ↳ Horarios de viernes y fin de semana ocultos para prospectos web.
  ↳ Conclusión: Eliminar slice(0, 10).
```

---

## 3. Caveats
- **Modo Read-Only**: En cumplimiento estricto de las directivas de Explorer, no se modificó ningún archivo de código fuente del proyecto (`src/`).
- **Compatibilidad de esquemas**: `kiosk_members` usa campos públicos (`uid`, `alias`, `belt`, `stripes`, `beltSystem`, `accountStatus`, `photoUrl`). La sincronización debe protegerse siempre en bloques `try/catch` para evitar fallos si un documento de quiosco aún no existe para un usuario antiguo.
- **Rango de evaluación de graduación**: Al evaluar asistencias acumuladas desde `user.beltDate`, si un alumno no tiene registrado `beltDate`, se debe usar como fallback seguro `user.createdAt` o la fecha de su primera reserva registrada.
- **No ejecución de tests de Vitest**: Se respetó la directiva de no invocar `vitest` ni test runners automatizados. La compilación se validó con `npx vite build`.

---

## 4. Conclusion
El mapa de implementación para R4 y R5 está delimitado con precisión quirúrgica:
1. **R4 (ERP & Negocio)**:
   - Reemplazar 6 `confirm()`, 1 `prompt()`, 2 `alert()` y 2 modales `fixed inset-0` por `Dialog` de `@/shared/ui/dialog`.
   - Modificar defaults en `PersonalPage.tsx` (`includeMockAthletes: false`, eliminar números fijos) y en `KokoroAssistant.tsx` (métricas a 0, eliminar mock athlete).
   - Añadir sincronización `updateDoc(doc(db, 'kiosk_members', ...))` en `PersonalPage.tsx` (`handleSaveEditor`) y `AttendanceAdminPage.tsx` (`handlePromoteStudent`).
   - Ajustar la pestaña `GRADUATIONS` para utilizar `calculateGraduationProgress` sobre asistencias acumuladas desde `user.beltDate`.
   - Conciliar TPV en `CajaPage.tsx` con el catálogo oficial (75€, 60€, 55€, 110€, 50€, 15€), actualizar `users` (`FROZEN`) y `kiosk_members` (`PAUSED`) en `handleApproveFreeze`, y corregir `increment(newStatus === 'ATTENDED' ? 1 : -1)` en `AttendanceAdminPage.tsx`.
   - Enriquecer `KioskCheckinPage.tsx` con `getNextClass` como fallback, validar accesos bloqueados/congelados y añadir `source: 'KIOSK'`. Soportar navegación de leads a `/admin/alta-alumno` tanto por query como por state y marcar `CONVERTED`.
2. **R5 (UI/UX & Design System)**:
   - Crear drawer móvil en `AdminLayout.tsx` (< 768px), integrar las 6 tatami tools en el menú móvil de `AppLayout.tsx`, y transformar `BeltStatisticsCard.tsx` en `grid-cols-2 sm:grid-cols-3`.
   - Implementar WCAG AA (roles, `tabIndex={0}`, `aria-label`, `htmlFor`/`id`, Enter/Space) y `useReducedMotion()` en `FifaFighterCard.tsx` y `BeltStatisticsCard.tsx`.
   - Reemplazar spinners por Skeletons Bento en `HomePage.tsx` y `SchedulePage.tsx`, filtrar sesiones de hoy por día de la semana real, mostrar toda la parrilla en `LandingPage.tsx` (sin `slice(0, 10)`), limpiar el modal de `QrCodePassCard` en `ProfilePage.tsx` y añadir el borde SVG perimetral en `FifaFighterCard.tsx`.

---

## 5. Verification Method

### Comando de Verificación Oficial
Ejecutar desde el directorio raíz del proyecto:
```powershell
npx vite build
```
**Criterio de Aceptación**: Código de salida `0` sin errores de compilación de TypeScript ni paquetes desalineados.

### Puntos de Inspección para el Agente Worker
1. **Radix Dialogs**: Verificar que ningún archivo en `src/pages/` contenga `confirm(`, `prompt(` ni `alert(`, y que los modales utilicen `@/shared/ui/dialog`.
2. **Sincronización Kiosco**: Verificar que `handlePromoteStudent` y `handleSaveEditor` sincronicen `kiosk_members`.
3. **Pausa FROZEN**: Comprobar que `handleApproveFreeze` en `CajaPage.tsx` actualice `users/{uid}` con `accountStatus: 'FROZEN'` y `kiosk_members/{uid}` con `accountStatus: 'PAUSED'`.
4. **Contador Asistencia**: Verificar en `AttendanceAdminPage.tsx:281` que el incremento sea `increment(newStatus === 'ATTENDED' ? 1 : -1)`.
5. **Responsividad & Accesibilidad**:
   - `AdminLayout.tsx` oculta la barra en `< 768px` y abre drawer con botón hamburguesa.
   - `BeltStatisticsCard.tsx` tiene clase `grid-cols-2 sm:grid-cols-3` y atributos de teclado.
   - `FifaFighterCard.tsx` contiene `<svg><polygon ... /></svg>` y respeta `useReducedMotion()`.
   - `LandingPage.tsx` renderiza la parrilla horaria completa sin `.slice(0, 10)`.
   - `HomePage.tsx` y `SchedulePage.tsx` renderizan Bento skeletons mientras cargan en vez de spinners.
