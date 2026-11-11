import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/oswald/index.css';
import '@fontsource/oswald/700.css';
import '@fontsource-variable/archivo/wdth.css';
import { App } from '@/app/App';
import '@/app/index.css';

// Registro automático del Service Worker para funcionamiento Offline y PWA instalable
registerSW({ immediate: true });

// Dev + emulator only: the whole block (and the dynamically imported module) is stripped from production builds.
if (import.meta.env.DEV) {
  void import('@/shared/api/devAutoLogin').then((m) => m.startDevAutoLogin());
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

