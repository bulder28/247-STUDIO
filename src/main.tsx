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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
