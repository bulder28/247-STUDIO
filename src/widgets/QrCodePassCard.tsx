import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Sun, CheckCircle2, X } from 'lucide-react';
import { UserDomainModel } from '@/shared/domain/types';
import { Belt, beltLabelEs } from '@/widgets/Belt';

interface QrCodePassCardProps {
  user: UserDomainModel;
  onClose?: () => void;
}

export const QrCodePassCard: React.FC<QrCodePassCardProps> = ({ user, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Payload seguro del QR para el kiosco
  const qrPayload = JSON.stringify({
    prefix: '247STUDIO',
    uid: user.uid,
    alias: user.alias,
    tier: user.pricingTier,
    tariff: user.activeTariffId,
  });

  // Guardar en caché local para disponibilidad 100% offline en la nave
  useEffect(() => {
    try {
      localStorage.setItem('247studio_cached_qr_payload', qrPayload);
      localStorage.setItem('247studio_cached_user_alias', user.alias);
      localStorage.setItem('247studio_cached_user_belt', user.belt);
      localStorage.setItem('247studio_cached_user_stripes', String(user.stripes || 0));
    } catch {
      // Ignorar errores de localStorage en modo incógnito estricto
    }
  }, [qrPayload, user]);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        qrPayload,
        {
          width: 220,
          margin: 1,
          color: {
            dark: '#0F172A', // Slate 900 de alto contraste
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) console.error('Error generando código QR:', error);
        }
      );
    }
  }, [qrPayload]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    try {
      const link = document.createElement('a');
      link.download = `pase-247studio-${user.alias.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Error descargando el pase QR:', err);
    }
  };

  const getTierLabel = (tier: string) => {
    if (tier === 'SF') return 'Socio Fundador (SF)';
    if (tier === 'FAM') return 'Tarifa Familiar';
    return 'Tarifa Estándar';
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* 1. Cabecera de Marca & Estado de Acceso con botón de cierre */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2">
          <img src="/logo.webp" alt="247Studio" className="w-6 h-6 object-contain" />
          <span className="font-headline text-lg font-bold tracking-tight text-slate-900 uppercase">
            247STUDIO
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ACCESO ACTIVO
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Identidad del Alumno & Cinturón */}
      <div className="mb-5 space-y-1">
        <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
          {user.alias}
        </h4>

        {/* Cinturón Gráfico Oficial */}
        <div className="py-1 max-w-[210px] mx-auto">
          <Belt belt={user.belt} stripes={user.stripes || 0} className="h-5 mx-auto drop-shadow-sm" />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-semibold">
          <span>{beltLabelEs(user.belt)}</span>
          <span className="text-slate-300">•</span>
          <span>{user.stripes || 0} {user.stripes === 1 ? 'grado' : 'grados'}</span>
        </div>

        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md mt-1">
          {getTierLabel(user.pricingTier)}
        </span>
      </div>

      {/* 3. Contenedor de Alta Legibilidad para el QR */}
      <div className="inline-block p-3.5 bg-white rounded-2xl border-2 border-slate-200 shadow-sm relative group">
        <canvas ref={canvasRef} className="rounded-lg block mx-auto" />
      </div>

      {/* 4. Sugerencia de Brillo y Asistencia */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-amber-700 font-medium bg-amber-50/80 border border-amber-200/60 py-2 px-3 rounded-xl max-w-xs mx-auto">
        <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>Sube el brillo del móvil para lectura inmediata</span>
      </div>

      {/* 5. Acciones: Descargar en Galería */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition active:scale-95 cursor-pointer"
        >
          {downloadSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">¡Guardado en descargas!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Guardar pase en imagen</span>
            </>
          )}
        </button>
      </div>

      <p className="text-[10px] text-slate-400 mt-3 font-medium">
        Válido para entrada en la tablet de recepción · 247Studio Pinto
      </p>
    </div>
  );
};
