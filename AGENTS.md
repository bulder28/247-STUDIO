# 🤖 AGENTS.md — Directrices Operativas de Agentes IA en 247 STUDIO

Este archivo define las reglas de acceso, permisos y directrices técnicas permanentes para todos los agentes de Inteligencia Artificial que operan en este repositorio.

---

## 🌐 1. Política de Acceso a GitHub (Vía Libre Autorizada)

* **Acceso Directo a GitHub:** El agente cuenta con **vía libre y acceso directo a GitHub** para interactuar con repositorios remotos, clonar dependencias, consultar patrones de código abierto, actualizar submódulos o apoyarse en soluciones de la comunidad.
* **Criterio de Seguridad Obligatorio:**
  * El acceso es libre **siempre que los repositorios sean seguros, legítimos y auditados**.
  * Se prohíbe clonar, ejecutar o importar dependencias de repositorios con vulnerabilidades críticas conocidas (*CVEs* activas), paquetes ofuscados o código malicioso.
  * Se mantiene la integridad estricta de secretos: jamás filtrar variables de entorno (`.env`), tokens de acceso personal ni credenciales privadas a GitHub.
* **Repositorio Oficial de Producción:**
  * URL: `https://github.com/bulder28/247-STUDIO.git`
  * Rama de despliegue continuo (Netlify): `main`

---

## 🥋 2. Identidad del Proyecto y Stack Tecnológico

* **Producto:** **247 STUDIO** — Plataforma web y PWA para academia de Brazilian Jiu-Jitsu, Grappling No-Gi, MMA y Lucha en Pinto (Madrid).
* **Fundadores / Directores:** Mario & David.
* **Stack Principal:**
  * **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS.
  * **Caché y Estado:** TanStack Query v5 (Server State) + Zustand (Client State).
  * **Backend / BaaS:** Google Firebase (Authentication, Cloud Firestore, Cloud Storage, Cloud Messaging FCM).
  * **Alojamiento:** Netlify (CDN Global, Functions, Redirecciones SPA y Cabeceras de Seguridad).
  * **PWA:** `vite-plugin-pwa` con Workbox para funcionamiento offline en el tatami y recepción.

---

## 🛡️ 3. Reglas Innegociables de Arquitectura

1. **Autenticación Google OAuth:**
   * La propiedad `authDomain` en [`src/shared/api/firebase.ts`](file:///c:/Desktop/247 STUDIO/src/shared/api/firebase.ts) **DEBE permanecer siempre como `studio-ff8d1.firebaseapp.com`**.
   * No modificarla a dominios Netlify ni dominios personalizados en el código cliente para evitar el bloqueo `Error 400: redirect_uri_mismatch` de Google. Los cambios de marca se realizan en la consola de Google Cloud OAuth Consent Screen.
2. **Separación Estricta de Estados:**
   * **Server State (TanStack Query):** Toda lectura y mutación de Firestore pasa por hooks de React Query (`useScheduleQueries`, etc.) con actualizaciones optimistas y reversión automática (*rollback*).
   * **Client State (Zustand):** Datos efímeros de UI, filtros de tatami y el temporizador global [`useSparringTimerStore.ts`](file:///c:/Desktop/247 STUDIO/src/shared/stores/useSparringTimerStore.ts) que debe seguir corriendo sin cortarse al cambiar de ruta.
3. **Control de Calidad Pre-Commit:**
   * Antes de cualquier commit o push a `main`, es obligatorio ejecutar y validar la compilación limpia con `npm run build` (`tsc && vite build`), garantizando cero errores de tipado TypeScript y cero advertencias de tamaño de bundle.
4. **Resiliencia Offline:**
   * Toda ruta debe mantener carga resiliente con [`lazyWithRetry.ts`](file:///c:/Desktop/247 STUDIO/src/shared/utils/lazyWithRetry.ts) y envolverse en [`RootErrorBoundary.tsx`](file:///c:/Desktop/247 STUDIO/src/shared/ui/RootErrorBoundary.tsx).

