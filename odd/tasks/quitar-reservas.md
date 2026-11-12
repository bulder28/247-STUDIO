# quitar-reservas

## Objetivo
Eliminar toda la lógica de reservas de clases (reservar, anular, lista de espera, "Mis reservas", plazas libres) y el aforo. El horario pasa a ser un calendario de consulta. La asistencia no cambia.

## Problema / por qué
La academia no gestiona reservas de clases. El usuario pidió: "no se hacen reservas de clases, elimina toda esa lógica, botones etc." y "aforo fuera".

## Hallazgo clave (mapeo)
La colección Firestore `bookings` es a la vez reserva y registro de asistencia. Pagos, graduaciones y riesgo de abandono cuentan filas `status === 'ATTENDED'`. Se eliminan los flujos y estados de reserva, NO la colección ni la asistencia.

## Decisiones (usuario y por defecto)
- Aforo/capacidad: ELIMINAR del todo (decisión del usuario): `schedules.capacity`, `defaultCapacity`, `class_capacity`, "X/Y plazas", "Aforo Máximo", "Plazas Totales", pie del PDF de asistencia.
- `BookingStatus` queda solo en `ATTENDED` (se retiran BOOKED, WAITLISTED, CANCELLED y NO_SHOW). Por defecto, revisable.
- Horario (`/horario`): calendario de consulta, sin botones de reserva.
- Panel de asistencia: se mantiene "Añadir alumno" manual (crea ATTENDED); se quita "Check In All", "pendientes" y "lista de espera".
- Kiosk: solo flujo de creación ATTENDED; sin sincronizar `class_capacity`.
- `payments.bookingId` (DROP_IN) se mantiene.
- CTAs de "clase de prueba" por WhatsApp se mantienen (captación, no reserva).
- Datos históricos: las lecturas de asistencia filtran `status === 'ATTENDED'` en vez de purgar.

## Alcance autorizado
Código en `src/`, `firestore.rules`, `scripts/`. Sin tocar `authDomain`, ni `.env`.

## Checklist
- [x] Q1 Capa de dominio y datos: `types.ts` (BookingStatus, capacity), `schedule.ts` (canCancel, totalCapacity, seeds), `useScheduleStore.ts` (RESERVAR/MIS_RESERVAS, onlyMyBookings), `useScheduleQueries.ts` (mutaciones muertas, class_capacity), `firestore.rules` (create/cancel de alumno, class_capacity). Ruta: delegada.
- [x] Q2 `SchedulePage.tsx` a calendario de consulta (sin reservar/anular/plazas/mis reservas/aforo). Ruta: delegada.
- [x] Q3 HomePage, AppLayout (todayBooking), QrCodePassCard (cotejo de reserva). Ruta: delegada.
- [x] Q4 AttendanceAdminPage, KioskCheckinPage, PersonalPage (filtrar ATTENDED), `attendance.ts` (NO_SHOW). Ruta: delegada.
- [x] Q5 SchedulesAdminPage (aforo, "pausar reservas"), generador PDF de asistencia, scripts (seed, verificar-fichas), copy (LoginPage, PrivacyPage, AvisosPage). Ruta: delegada.
- [x] Q6 `npm run build` limpio y comprobación manual en la app. Ruta: inline. (build y tsc verificados; la comprobación visual queda para el usuario)

## Criterios de aceptación
- No quedan en la UI botones ni textos de reserva, anulación, lista de espera, plazas ni aforo.
- Kiosk, asistencia admin, pagos por sesiones y graduaciones siguen funcionando.
- `npm run build` sin errores TypeScript ni avisos de bundle.

## Checks aplicables
`npx tsc --noEmit`, `npm run build`, búsqueda de restos (`rg -i "reserv|aforo|plazas|waitlist|class_capacity"`). TDD: sin tests en `src`; no aplica.

## Evidencia / progreso
- Q2 hecho (commit ae77558, ruta delegada): `SchedulePage.tsx` es ahora un horario de consulta (sin reservar/anular/plazas/mis reservas/aforo; `defaultCapacity` retirado). Incluye el selector fijo Lunes-Viernes (5 columnas, flechas de semana, "Volver a Hoy") en lugar de la tira de 14 dias.
- Q2 checks: `npx tsc --noEmit` exit 0; `npm run build` OK sin avisos de bundle; `rg -i "reserv|aforo|plaza|waitlist|class_capacity|booking|capacity"` sobre SchedulePage.tsx: sin resultados.
- Pendiente para tareas posteriores: `useScheduleData` aun devuelve `myBookings`/`classCapacities`; el store conserva `mobileSectionTab`/`onlyMyBookings`; `QrCodePassCard` aun acepta `todayBookingText` (ya no se le pasa).

- Q3 hecho (commit dcdc151, ruta delegada): HomePage sin reservas (enlace a horario, copy de cuota neutro), AppLayout sin `fetchTodayBooking`/`todayBookingSummary`, QrCodePassCard sin `todayBookingText` ni bloque de cotejo (el QR se mantiene). `npx tsc --noEmit` exit 0; `npm run build` OK sin avisos; `rg` de restos sobre los 3 ficheros: sin resultados.
- Q4 hecho (commit sobre Q3, ruta delegada): AttendanceAdminPage (lista = solo ATTENDED, sin pendientes/espera/Check In All/aforo/class_capacity, quitar asistencia con `deleteDoc`), KioskCheckinPage (solo crea fila ATTENDED, sin class_capacity), PersonalPage (solo cuenta ATTENDED, filtro en cliente), `deriveRetentionRisk` sin NO_SHOW. `npx tsc --noEmit` exit 0; `--noUnusedLocals` sin errores en los ficheros tocados; `npm run build` OK. Restos `rg`: solo 2 comentarios en ingles que explican el filtro ATTENDED.
- Atencion para Q1: `deleteDoc` sobre `bookings` desde el admin requiere que `firestore.rules` permita delete al admin; el kiosk hace `setDoc` completo (con `createdAt`) y ya no actualiza filas BOOKED previas.

- Q5 hecho (commit 7ec8df3, ruta delegada): SchedulesAdminPage sin aforo (campo, columnas, tarjeta "Plazas Totales"; texto de excepcion pasa a "Pausar o cancelar las clases de una fecha determinada"), pie del PDF de asistencia ("control de asistencia"), scripts (seed solo ATTENDED/TABLET, nota de prueba neutra; verificar-fichas con texto de asistencias), copy en LoginPage, PrivacyPage y AvisosPage. `npx tsc --noEmit` exit 0; `npm run build` OK.
- Q1 hecho (commit sobre Q5, ruta delegada): `BookingStatus = 'ATTENDED'`; sin `capacity`/`cancelledAt`/`canCancel`/`totalCapacity`; store sin RESERVAR/MIS_RESERVAS/onlyMyBookings; `useScheduleData` solo lee schedules + scheduleExceptions (mutaciones de reserva eliminadas); `firestore.rules`: sin create/cancel de alumno, sin class_capacity, sin NO_SHOW; coach puede crear/actualizar/borrar asistencia (la ruta /admin/asistencia es admin+coach); admin create/update/delete; kiosco puede sobrescribir (setDoc) una fila heredada no ATTENDED. `tsc` exit 0, `--noUnusedLocals` limpio, build OK.
- Reglas validadas con el emulador (localhost:8080, 17 casos, todos PASS): alumno no crea/cancela/borra, lee solo lo suyo; kiosco crea ATTENDED/TABLET; coach/admin crean, cambian modalidad y borran; class_capacity denegado.
- Hallazgo: la regla antigua `attendanceWeight in [0.5, 1.0, 3.0]` rechazaba el entero 1 (JS envia 1.0 como entero), es decir el check-in de kiosco de un PARTICIPANT fallaba; ahora se valida como numero entre 0.5 y 3.

## Siguiente paso
Que el usuario revise en http://127.0.0.1:5174/ el horario, Home, asistencia y kiosk. Commits: ae77558, dcdc151, 8be9fec, 7ec8df3, 65f7427, 279ec97.

Q6: `npx tsc --noEmit` exit 0; `npm run build` OK (8.47s) sin avisos; RegisterPage sin "aforo" (commit 279ec97).
