# Funcionalidad: Alta de alumnos y cobro mensual

## Objetivo
Permitir que el personal dé de alta correctamente a un alumno nuevo y registre los pagos mensuales, asignando la tarifa en el momento del pago, tal como describe el cliente en sus audios (2026-11-11).

## Problema
- El alta asignaba una tarifa desde el inicio, usaba un único campo de nombre, no tenía foto y consideraba menores a los de menos de 16 años.
- La Caja no guardaba tarifa por pago, permitía pagos con tarjeta, no podía registrar pagos adelantados de varios meses y mostraba datos de ejemplo cuando las colecciones estaban vacías.
- No existía una lista de alumnos activos sin pagar el mes en curso.

## Por qué
Necesidad principal del cliente: "a primeros de mes llega una persona nueva, tengo que darla de alta y cobrarle", y dejar de perder el control de quién no ha pagado (unos 150 alumnos).

## Alcance (autorizado)
- Dominio: umbral de minoría de edad, métodos de pago, descuento de socio fundador, periodos de pago adelantado y consulta de alumnos sin pagar.
- Página de alta (`/admin/alta-alumno`) y `netlify/functions/admin-create-user.mjs`.
- Página de Caja (`/admin/caja`) y `firestore.rules` para los campos de `payments`/`users` afectados.
- Fuera de alcance (más adelante / baja prioridad): avisos de impago a los 7/15 días, bajas temporales, firma digital de consentimientos, contacto de emergencia en el perfil del alumno y reservas. Las funciones no mencionadas por el cliente son de baja prioridad; no se elimina nada sin aprobación explícita.

## Decisiones
- Menor = menos de 14 años (cliente: "por abajo de 14", coincide con la edad de consentimiento digital en España). Los de 14 años se dan de alta como adultos.
- El socio fundador es un indicador booleano en el alumno con un 10 % de descuento en todos los cobros; la tarifa SF existente no se toca.
- Un pago adelantado de N meses crea N documentos de pago, uno por periodo, para que la lógica de estado mensual siga funcionando.
- Métodos de pago: solo Metálico (CASH) y Bizum (BIZUM).

## Configuración
- TDD: desactivado (sin configuración en el proyecto ni en la sesión). Ejecutor: Vitest (`npm test`).
- Comprobaciones por tarea: `npm test` y `npm run build`.
- RDD: desactivado (por defecto). Estrategia de entrega: ask-on-risk.
- Rama: `feat/alta-cobro-mensual`. No incluir cambios ajenos del árbol de trabajo (AGENTS.md, skills-lock.json, verificar-fichas.mjs, audios/transcripciones).
- Toda la documentación se escribe en español (regla del usuario).

## Tareas
- [x] T1 Dominio: menores < 14 (minor.ts, firestore.rules, tests); PaymentMethod = CASH | BIZUM; `firstName`, `lastName`, campos de tutor e `isFoundingMember` en UserDomainModel; `tariffId` en PaymentDomainModel; funciones puras `applyFoundingDiscount`, `buildPrepaymentPeriods` y `findUnpaidStudents` con tests de Vitest. Ruta: delegada (disparador de escritor, 2+ archivos).
- [x] T2 Alta: nombre + apellidos, móvil obligatorio, fecha de nacimiento, email opcional, foto (captura/subida), bloque de tutor para menores de 14, casilla de socio fundador; sin tarifa en el alta. Ruta: delegada.
- [x] T3 Caja: sin datos de ejemplo ni tarjeta; tarifa elegida desde Firestore en el cobro y guardada como `tariffId`; periodo elegido en el formulario; 10 % de descuento a socios fundadores; pago adelantado de N meses; listas permitidas de las reglas actualizadas. Ruta: delegada.
- [x] T4 Vista "alumnos sin pagar" en Caja: alumnos activos sin pago aprobado en el periodo elegido, filtrable por tarifa. Ruta: delegada.

## Criterios de aceptación
- El alta guarda nombre, apellidos, teléfono, fecha de nacimiento, email opcional y foto; los menores de 14 requieren nombre y teléfono del tutor; no se asigna tarifa en el alta.
- Un cobro registra método (metálico/Bizum), tarifa, periodo y fecha automática; los socios fundadores tienen un 10 % de descuento; pagar N meses por adelantado crea N pagos por periodo.
- El personal puede ver quién no ha pagado el mes elegido y filtrar por tarifa.
- `npm test` y `npm run build` pasan.

## Progreso
- 2026-11-11: Código mapeado (alta, caja, tarifas, roles). Rama y documento creados.
- T1 hecha (escritor delegado). `npm test`: 14 archivos / 113 tests pasan (re-ejecutado por el orquestador). `npm run build`: pasa. `npm run test:rules` no se pudo ejecutar al principio porque el emulador no estaba disponible. Se revisó el diff de `firestore.rules`: nueva regla de creación de pagos solo para admin (CASH/BIZUM, APPROVED/PENDING_APPROVAL, lista de campos permitidos); autorregistro desde 14 años. Commit: 9e6f8ba.
- T2 hecha (escritor delegado, skill `impeccable`). `npm test`: 15 archivos / 120 tests pasan. `npm run build`: pasa. Foto guardada como data URL JPEG comprimida en `photoUrl` (convención existente; el proyecto no usa Firebase Storage). Email opcional: la función crea un acceso interno `alumno_…@247studiobjj.com` sin enlace de contraseña. Los alumnos nuevos reciben `pricingTier: 'STD'` y no tienen `activeTariffId`. Commit: 369340a.
- T3 hecha (escritor delegado, `impeccable`). Cobros con tarifa desde Firestore, periodo en el modal, 10 % para socios fundadores, pago adelantado de 1 a 12 meses en un único `writeBatch` (un documento por periodo), sin datos de ejemplo, el bono PASS ya no escribe `pricingTier`. Commit: 28ebd4c.
- T4 hecha (escritor delegado, `impeccable`). Sección "Alumnos sin pagar" en Caja: lista del periodo, filtro por tarifa (+ "Sin tarifa"), recuento de pagados/total, chips por tarifa y botón "Cobrar" con alumno y periodo preseleccionados. `npm test`: 15 archivos / 131 tests. `npm run build`: pasa. Commit: d7b49f6.
- Tests de reglas con JDK 21 + emulador: 11 pasan y 4 fallan; los mismos 4 fallan en `main` (85d5237), por lo que son previos (autorregistro de adulto, creación de reserva desde el kiosco, creación anónima de lead y el test de inmutabilidad de pagos aprobados).
- Prueba en navegador contra emuladores: 22 capturas en `docs/capturas/alta-cobro-mensual`. Se observó funcionando el guardado alternativo del alta y el pago adelantado de 3 meses (3 documentos, 10 % de descuento).
- Correcciones de interfaz 5142547 (selector de mes en español, mensajes de validación propios); auto-login de desarrollo solo con emulador 50fb76f (ausente del build de producción).
- `npm run build` limpio antes de fusionar en `main`. Publicado en `main` (69b5740 y 96bb44f).
- Pendientes: `sessionsRemaining` falta en la lista permitida de actualización de pagos (aprobar bonos PASS puede fallar); `handleApprovePayment` sigue estimando importes con precios fijos; quedan textos "Efectivo" en PersonalPage/ProgramsPage y una rama CARD en receiptGenerator; no hay test de reglas para la creación de pagos por admin.

## Siguiente paso
Desplegar `firestore.rules` en producción (necesario para los cobros del admin; lo debe ejecutar el usuario: `npx firebase deploy --only firestore:rules --project studio-ff8d1`). Después, prueba manual en la tablet y los puntos fuera de alcance (avisos de impago, bajas temporales, consentimientos) si el cliente los confirma.
