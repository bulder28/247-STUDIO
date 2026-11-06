import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';
import { UserDomainModel } from '@/shared/domain/types';

interface QrCodePassCardProps {
  user: UserDomainModel;
}

export const QrCodePassCard: React.FC<QrCodePassCardProps> = ({ user }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Payload seguro del QR para el kiosco
  const qrPayload = JSON.stringify({
    prefix: '247STUDIO',
    uid: user.uid,
    alias: user.alias,
    tier: user.pricingTier,
    tariff: user.activeTariffId,
  });

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        qrPayload,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#11152E',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, [qrPayload]);

  return (
    <div className="bg-gradient-to-b from-studio-navy-light to-studio-navy border border-white/15 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-studio-red/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-center gap-2 mb-3">
        <QrCode className="w-5 h-5 text-studio-red" />
        <span className="text-xs font-black uppercase tracking-widest text-studio-cream">
          Pase Digital de Check-in
        </span>
      </div>

      <p className="text-xs text-studio-cream/70 max-w-xs mx-auto mb-5 leading-relaxed">
        Muestra este código QR frente a la tablet del gimnasio para registrar tu asistencia automáticamente.
      </p>

      {/* QR Code Container */}
      <div className="inline-block p-4 bg-white rounded-2xl shadow-xl border-4 border-studio-cream/40 transition-transform duration-200 hover:scale-[1.02]">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>

      <div className="mt-5 flex items-center justify-center gap-3 text-xs text-studio-cream/80">
        <span className="font-bold text-white tracking-wide">{user.alias}</span>
        <span>•</span>
        <span className="px-2 py-0.5 rounded bg-white/10 font-semibold text-[11px] text-studio-cream">
          {user.belt} ({user.stripes} {user.stripes === 1 ? 'grado' : 'grados'})
        </span>
      </div>
    </div>
  );
};
