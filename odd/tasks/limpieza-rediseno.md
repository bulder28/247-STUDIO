# Funcionalidad: Limpieza de funciones no pedidas y rediseño visual

## Objetivo
Eliminar las funciones que el cliente no pidió y rediseñar las pantallas de administración de uso diario para que el cambio sea visible y útil en la tablet de recepción.

## Problema
- La app incluye funciones que no aparecen en los audios del cliente (embudo de leads, reserva de clase de prueba, fotos y vídeos, preguntas frecuentes, progreso con radar/cartas FIFA/ELO, asistente IA Kokoro) y que añaden ruido.
- La iteración anterior (alta-cobro-mensual) cambió la funcionalidad pero mantuvo el estilo visual; el usuario no percibió mejora visible.

## Por qué
El usuario (2026-11-11) se mostró decepcionado porque no cambió nada visualmente y no se quitaron las pestañas no pedidas. Confirmó la lista de eliminación.

## Alcance (autorizado)
Eliminar:
- Admin: Embudo de Leads (`/admin/leads`).
- Público: página de reserva de clase de prueba y su captación de leads.
- App del alumno: Fotos y vídeos, Preguntas frecuentes, Progreso (radar, cartas FIFA, ELO) y el asistente IA Kokoro.

Se mantiene: Alumnos, Asistencia, Caja, Horarios (calendario sin reservas), Tarifas, Alta, Equipo y roles; en la app del alumno: Hoy, Clases, Pagos, Yo, Avisos y Foro. El Foro se mantiene porque, según el usuario, el cliente dijo que es importante; no aparece en las transcripciones de Whisper `small`, por lo que se están re-transcribiendo los cuatro audios con `medium` para confirmar requisitos.

Rediseñar (skill `impeccable`): estructura y navegación del admin, Caja, Alta y Alumnos.

## Decisiones
- El código eliminado se puede recuperar desde el historial de git.
- Las reglas de Firestore de las colecciones eliminadas se mantienen por ahora (quitarlas exige volver a desplegar las reglas); queda como tarea pendiente.

## Configuración
- TDD: desactivado (sin configuración). Ejecutor de tests: Vitest. Comprobaciones por tarea: `npm test` y `npm run build` (debe compilar limpio; AGENTS.md lo exige antes de `main`).
- RDD: desactivado. Rama: `feat/limpieza-rediseno`, creada desde `main` (96bb44f).
- No incluir en commits `docs/Microsoft.PowerShell_profile.ps1` ni `docs/whatsapp/`.
- Toda la documentación se escribe en español (regla del usuario).

## Tareas
- [x] R1 Eliminar funciones no pedidas (rutas, páginas, menús, prefetch, widgets, módulos de dominio usados solo por ellas, tests y enlaces de la landing). Ruta: delegada (disparador de escritor).
- [x] R2 Rediseñar estructura/navegación del admin y la Caja. Ruta: delegada.
- [ ] R3 Rediseñar el Alta. Ruta: delegada.
- [ ] R4 Rediseñar Alumnos (PersonalPage). Ruta: delegada.

## Criterios de aceptación
- Las funciones eliminadas no son accesibles ni aparecen en la navegación ni en el bundle; no quedan imports muertos.
- Las pantallas rediseñadas se ven claramente distintas, son coherentes, pensadas primero para tablet, accesibles y conservan toda la funcionalidad.
- `npm test` y `npm run build` pasan; capturas de antes y después.

## Progreso
- 2026-11-11: Rama y documento creados; lista de eliminación confirmada por el usuario. El Foro se excluyó de la eliminación a petición del usuario.
- R1 hecha (escritor delegado). Eliminado: Leads, reserva de prueba, Fotos y vídeos, Preguntas frecuentes, Progreso (página de historial), radar, cartas FIFA, ELO, historial de combates, métricas de asistencia, Kokoro (widget, dominio, cliente Gemini y función Netlify `kokoro-ai`), QR de prueba exprés del kiosco y la conversión de leads en Alta y Alumnos. Los enlaces a la reserva de prueba ahora abren WhatsApp. El Foro se restauró intacto (sin diferencias respecto a `main`). Cinturones y graduaciones se mantienen. `npm test`: 13 archivos pasan (re-ejecutado por el orquestador). `npm run build`: pasa (escritor).
- Pendiente: colecciones `leads` y `media` sin uso en la app (sus reglas siguen en `firestore.rules`); `GEMINI_API_KEY` ya no se usa en Netlify; imports sin usar de `getLiveDocs` en Caja y Alumnos; el tipo `FighterStats` y el campo `stats` siguen en los usuarios.

- R1 commit: c083618.
- R2 hecha (escritor delegado, skill `impeccable`). Dirección visual "Tatami de noche": menú lateral azul marino con un único acento rojo, fondo arena y superficies blancas, cifras grandes en Oswald, objetivos táctiles de 44 px o más. Menú reordenado por uso diario ("Día a día": Caja, Alta, Alumnos, Asistencia; "Gestión": Horarios, Tarifas, Equipo). Caja: banda de KPIs del mes, pestaña "Sin pagar" por defecto con botón "Cobrar", modal de cobro con total fijo y botón "Cobrar X €". Componentes compartidos `page-header`, `kpi-card`, `section-card`. Contexto de diseño en `PRODUCT.md` y `DESIGN.md` (español). `npm test`: 13 archivos pasan (re-ejecutado por el orquestador). `npm run build`: limpio (escritor). Capturas en `docs/capturas/rediseno/`, revisadas por el orquestador.
- Pendiente de R2: los diálogos de rechazo de pago y aviso por teléfono solo recibieron botones más grandes; la X de cierre del diálogo se ve poco sobre la cabecera azul.

## Siguiente paso
R3 (Alta).
