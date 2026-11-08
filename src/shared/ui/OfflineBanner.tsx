import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <aside
      aria-live="polite"
      className="bg-amber-600/90 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 backdrop-blur-md sticky top-0 z-50 shadow-md border-b border-amber-500/40 animate-pulse"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo sin conexión activo — Mostrando datos en caché. Se sincronizará al recuperar señal.</span>
    </aside>
  );
};

