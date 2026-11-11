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

---

## 👥 4. Roles de Agentes Especializados

El proyecto cuenta con 5 agentes especializados, cada uno con responsabilidades claras y permisos definidos. Los archivos de definición completos se encuentran en `.agents/roles/`.

### 4.1. 🛡️ Auditor de Cuentas
- **Archivo:** [`.agents/roles/auditor.md`](.agents/roles/auditor.md)
- **Responsabilidades:** Autenticación Google OAuth, reglas de Firestore, seguridad de credenciales, rutas protegidas, cabeceras de seguridad.
- **Archivos clave:** `firestore.rules`, `src/shared/api/firebase.ts`, `src/shared/api/auth.ts`, `.gitignore`, `netlify.toml`.
- **Prioridad:** Alta — debe validar antes de cualquier cambio en accesos o reglas.

### 4.2. 💰 Contable
- **Archivo:** [`.agents/roles/contable.md`](.agents/roles/contable.md)
- **Responsabilidades:** Lógica de pagos, registros de caja, menores de edad, tarifas y suscripciones, reportes financieros.
- **Archivos clave:** `src/shared/domain/payment.ts`, `src/shared/domain/minorGuardian.ts`, `src/shared/domain/tariff.ts`, `src/pages/admin-box/`.
- **Prioridad:** Media — coordina con Auditor antes de cambios en accesos a datos financieros.

### 4.3. 📊 Analista de Datos
- **Archivo:** [`.agents/roles/analista.md`](.agents/roles/analista.md)
- **Responsabilidades:** Datos de asistencia, sistema ELO, currículo y progreso, puntos Kokoro, insights de rendimiento.
- **Archivos clave:** `src/shared/domain/attendance.ts`, `src/shared/domain/eloCalculator.ts`, `src/shared/domain/curriculum.ts`, `src/shared/domain/kokoro.ts`.
- **Prioridad:** Media — proporciona insights para decisiones estratégicas.

### 4.4. 🎨 Gestor de Experiencia UX/UI
- **Archivo:** [`.agents/roles/ux-ui.md`](.agents/roles/ux-ui.md)
- **Responsabilidades:** Interfaz de usuario, sistema de diseño (Tailwind CSS), accesibilidad, experiencia móvil, animaciones, PWA para tatami.
- **Archivos clave:** `src/shared/ui/`, `src/widgets/`, `tailwind.config.js`, `vite.config.ts`.
- **Prioridad:** Media — mejora continua de la interfaz y accesibilidad.

### 4.5. ⚡ Experto en Desarrollo
- **Archivo:** [`.agents/roles/dev-expert.md`](.agents/roles/dev-expert.md)
- **Responsabilidades:** Stack tecnológico, rendimiento del bundle, nuevas funcionalidades, pruebas (vitest), despliegue en Netlify, Firebase backend.
- **Archivos clave:** `vite.config.ts`, `package.json`, `netlify.toml`, `src/shared/api/`, `src/shared/hooks/`, `scripts/`.
- **Prioridad:** Alta — responsable de la calidad técnica y el despliegue.

---

## 🔄 5. Reglas de Coordinación entre Agentes

### 5.1. Orden de Validación
1. **Auditor de Cuentas** valida primero cualquier cambio que afecte autenticación, permisos o reglas de Firestore.
2. **Contable** trabaja después de que el Auditor valide las reglas de acceso a datos financieros.
3. **Analista de Datos** coordina con Contable para reportes consolidados y con Experto en Dev para optimización de consultas.
4. **Gestor UX/UI** coordina con Experto en Dev para implementar mejoras visuales sin afectar rendimiento.
5. **Experto en Desarrollo** integra todos los cambios y valida la compilación final.

### 5.2. Reglas de Coordinación
- **Auditor → Contable:** El auditor debe validar que las reglas de Firestore permitan el acceso correcto a datos de pagos antes de que el Contable modifique lógica financiera.
- **Auditor → Experto en Dev:** Coordinar cambios en configuración de Firebase y despliegue.
- **Contable → Analista de Datos:** Compartir datos de ingresos para reportes consolidados.
- **Analista de Datos → Gestor UX/UI:** Proporcionar métricas de uso para mejorar la experiencia del usuario.
- **Gestor UX/UI → Experto en Dev:** Coordinar implementación de mejoras de rendimiento visual.

### 5.3. Política de Escalación de Conflictos
1. **Nivel 1 — Coordinación directa:** Los agentes involucrados intentan resolver el conflicto mediante coordinación directa según las reglas de coordinación.
2. **Nivel 2 — Mediación del Experto en Dev:** Si el conflicto no se resuelve, el Experto en Desarrollo actúa como mediador técnico.
3. **Nivel 3 — Escalación a los fundadores:** Si el conflicto afecta la arquitectura o requiere decisiones de negocio, se escala a Mario & David (fundadores).
4. **Regla de oro:** En caso de conflicto entre seguridad y funcionalidad, **la seguridad siempre prevalece** (decisión del Auditor).

---

## 📚 6. Skills Instaladas y Recomendadas

### 6.1. Skills Instaladas
El proyecto tiene skills instaladas en `.agents/skills/`:
- **`design-taste-frontend`** — Anti-slop frontend skill de Leonxlnx (~102k estrellas). Da dirección artística, imágenes reales y reglas estrictas de tipografía, espaciado, color y layout para evitar interfaces genéricas. Incluye componentes, backgrounds y referencias visuales.
- **`impeccable`** — Lenguaje de diseño de Paul Bakaus que mejora la calidad visual del UI generado por IA. Incluye comandos de audit, polish, critique, shape, animate, y más.
- **`frontend-design`** — Guía de diseño visual para UI distintiva.
- **`vercel-react-best-practices`** — Optimización de React/Next.js (Vercel).
- **`web-design-guidelines`** — Pautas de diseño web.
- **`webapp-testing`** — Testing con Playwright.
- **`tanstack-query`** — Patrones de optimización, caché y sincronización de TanStack Query v5.
- **`typescript-advanced-types`** — Tipos genéricos, utility types y patrones avanzados de TypeScript.
- **`tailwind-design-system`** — Sistema de diseño coherente con Tailwind CSS.
- **`pwa-development`** — Patrones de caché, service worker y offline para PWA.
- **`javascript-typescript-jest`** — Patrones de testing aplicables a vitest.
- **`node`** — Scripts de Firebase Admin y seed usan Node.js.
- **`better-auth-best-practices`** — Mejores prácticas de autenticación.

### 6.2. Estado
Todas las skills recomendadas están instaladas. El proyecto cuenta con **13 skills** en total en `.agents/skills/`.

