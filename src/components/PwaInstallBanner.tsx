import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = '247_pwa_banner_dismissed';

function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isWebKit = /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIos && isWebKit;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed || isStandaloneMode()) return;

    if (isIosSafari()) {
      setShowIosHint(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowIosHint(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [dismissed]);

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Sin almacenamiento disponible: ocultamos solo en esta sesión
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div
      role="region"
      aria-label="Instalar aplicación"
      className="md:hidden fixed bottom-[5.25rem] inset-x-3 z-30 rounded-2xl bg-[#272c35]/95 backdrop-blur-xl border border-white/15 shadow-modal px-3.5 py-2.5 flex items-center gap-3"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <img src="/logo.webp" alt="" className="w-9 h-9 rounded-xl object-contain shrink-0 bg-white/5 p-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white leading-tight">Instala 247 Studio</p>
        {deferredPrompt ? (
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
            Acceso directo desde tu pantalla de inicio
          </p>
        ) : (
          <p className="text-[11px] text-slate-300 leading-tight mt-0.5 flex items-center gap-1 flex-wrap">
            Pulsa <Share className="w-3 h-3 inline text-sky-400" /> y luego{' '}
            <strong className="text-white">Añadir a inicio</strong>
          </p>
        )}
      </div>
      {deferredPrompt && (
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex items-center gap-1 rounded-xl studio-btn px-3 py-1.5 text-xs font-semibold text-white shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso de instalación"
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
