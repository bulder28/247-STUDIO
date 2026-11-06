import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/oswald/index.css';
import '@fontsource/oswald/700.css';
import '@fontsource-variable/archivo/wdth.css';
import { App } from '@/app/App';
import '@/app/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

