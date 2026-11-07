import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Check, ArrowRight } from 'lucide-react';

const STORAGE_KEY = '247studio_privacy_acknowledged_v1';

export const PrivacyConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem(STORAGE_KEY);
      if (!acknowledged) {
        // Mostrar con un leve retraso para suavizar la entrada
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignorar errores si el acceso a localStorage está bloqueado
    }
  }, []);

  const handleAcknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Fallback
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Aviso de privacidad y cumplimiento RGPD"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      <div className="bg-[#0b1220]/95 backdrop-blur-md text-slate-100 border border-slate-700/80 rounded-2xl p-4 shadow-2xl shadow-black/40 ring-1 ring-white/10 space-y-3">
        {/* Cabecera de Cumplimiento */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white font-headline leading-none">
                Privacidad & Compliance RGPD
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5 block">
                IP Protegida · Fuentes Locales
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            UE 2016/679
          </span>
        </div>

        {/* Explicación transparente de datos */}
        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
          En <strong>247 STUDIO</strong> tus datos y tu dirección IP están seguros.
          No enviamos tu IP a Google para descargar fuentes y <strong>no usamos cookies de rastreo publicitario</strong>.
          Solo empleamos almacenamiento técnico cifrado para gestionar tu sesión y tu carnet de socio.
        </p>

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <Link
            to="/privacidad"
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline inline-flex items-center gap-1 transition-colors"
          >
            <span>Ver Política de Privacidad</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          <button
            type="button"
            onClick={handleAcknowledge}
            className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-black text-xs hover:bg-slate-200 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Entendido</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
