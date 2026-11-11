# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Mario y David** (fundadores y directores): usan el panel de administración (`/admin/*`) en la recepción, con una tablet (tamaños de referencia 820x1180 y 1024x768), entre clase y clase, con prisa y a menudo con una sola mano. Sus tareas diarias son cobrar cuotas, dar de alta alumnos, consultar alumnos y controlar la asistencia.
- **Profesores** (rol coach): solo ven Asistencia y Horarios; pasan lista y consultan quién asiste a sus clases.
- **Alumnos** (unos 150): usan la app (PWA) para ver clases, pagos, avisos, su perfil y el foro, y fichan en el kiosco.
- **Padres o tutores** de los menores de 14 años: gestionan el acceso a la app en nombre de sus hijos.

## Product Purpose
Plataforma web y PWA de 247 STUDIO, academia de Brazilian Jiu-Jitsu, Grappling No-Gi, MMA y Lucha en Pinto (Madrid). Su prioridad actual es tener una base de datos limpia de alumnos y acabar con el descontrol de pagos: saber quién ha venido, quién ha pagado y quién no. El éxito es que a primeros de mes se pueda dar de alta y cobrar a un alumno nuevo en un momento, y ver de un vistazo quién falta por pagar.

## Positioning
Varias disciplinas bajo un mismo techo, con buen ambiente. Los alumnos combinan y cambian de disciplina de un mes a otro (por ejemplo, Jiu-Jitsu y MMA un mes, solo Lucha al siguiente), y la comunidad y el trato cercano son parte esencial de la academia.

## Operating Context
- La tarifa y la disciplina no se fijan en el alta: se asignan en cada cobro mensual, porque cambian de un mes a otro.
- Los cobros se concentran en la primera semana de cada mes, en metálico o Bizum, registrados a mano por el personal en la tablet. No hay pasarela de pagos.
- Hay pagos por adelantado (varios meses o el plan anual que algunos alumnos tienen subvencionado).
- Los alumnos fichan en el kiosco (QR) y esa asistencia se cruza con los pagos.
- Los consentimientos (derechos de imagen, buena conducta, responsabilidad por lesiones al no estar federados) se firman hoy en papel; está previsto firmarlos en la tablet.
- La contabilidad y el IVA los lleva el cliente fuera de la app.

## Capabilities and Constraints
- Stack: React 18 + TypeScript + Vite + Tailwind, TanStack Query, Zustand, Firebase (Auth, Firestore, Storage, FCM), Netlify, PWA con modo offline.
- Roles: alumno, profesor (coach), administrador y kiosco.
- Menores: los menores de 14 años necesitan datos de contacto del padre, madre o tutor.
- Socios fundadores: grupo cerrado con un 10 % de descuento en todos los cobros.
- Planes: tarifa ilimitada (Jiu-Jitsu y Grappling), plan familiar (55 €), tarifas por disciplina.
- Sin reservas ni cupo por ahora: solo un calendario de clases.
- Sin IVA en la app.
- Pendiente de decidir: avisos de impago (a los 7 o 15 días), bajas temporales autorizadas por el administrador, firma digital de consentimientos, contacto de emergencia en el perfil del alumno.

## Brand Commitments
- Nombre: 247 STUDIO. Web comercial oficial: 247studiobjj.com.
- Voz: español neutro, directo y cercano; verbos de acción ("Cobrar", "Dar de alta").
- Los cinturones y graduaciones forman parte de la identidad de la academia.
- El foro es importante para el cliente (comunidad).

## Evidence on Hand
- Audios del cliente del 2026-11-11 (transcritos localmente; no se versionan).
- No hay fotografías reales de la academia ni testimonios en el repositorio: no se deben inventar.

## Product Principles
1. Lo más usado, primero: cobrar, dar de alta, consultar alumnos y pasar lista.
2. Control antes que adorno: cada pantalla del panel responde a "quién ha venido, quién ha pagado y quién no".
3. Lo que cambia cada mes se decide en el cobro, no en el alta.
4. Varias disciplinas sin fricción: combinar o cambiar de disciplina no debe complicar nada.
5. Comunidad y buen ambiente también en la app: el foro y los avisos acercan a la academia.
