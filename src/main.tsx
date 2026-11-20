import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Foco arena que sigue al puntero dentro de cada .studio-panel (solo ratón).
// Un único listener delegado: escribe --mx/--my en el panel bajo el cursor.
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let lit: HTMLElement | null = null;
  let frame = 0;
  document.addEventListener(
    'pointermove',
    (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const panel = (e.target as Element | null)?.closest?.<HTMLElement>('.studio-panel') ?? null;
        if (lit && lit !== panel) {
          lit.style.removeProperty('--mx');
          lit.style.removeProperty('--my');
        }
        if (panel) {
          const r = panel.getBoundingClientRect();
          panel.style.setProperty('--mx', `${e.clientX - r.left}px`);
          panel.style.setProperty('--my', `${e.clientY - r.top}px`);
        }
        lit = panel;
      });
    },
    { passive: true }
  );
}

// Modo app: sin menú contextual del navegador ni arrastre de imágenes/enlaces.
// Los campos de texto conservan su menú (copiar/pegar).
const isEditable = (t: EventTarget | null) =>
  t instanceof Element && !!t.closest('input, textarea, [contenteditable="true"], .allow-select');
document.addEventListener('contextmenu', (e) => {
  if (!isEditable(e.target)) e.preventDefault();
});
document.addEventListener('dragstart', (e) => {
  if (!isEditable(e.target)) e.preventDefault();
});
// Sin zoom por pellizco ni gesto de zoom de Safari
['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) =>
  document.addEventListener(ev, (e) => e.preventDefault())
);

// Actualización automática de la PWA: recarga limpia al activarse una nueva versión
// y comprueba actualizaciones cuando el alumno vuelve a abrir la app desde segundo plano.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {});
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
