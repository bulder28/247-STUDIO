import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, X } from 'lucide-react';

interface QrCameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({
  onScanSuccess,
  onClose,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'qr-reader-container';

  useEffect(() => {
    const scanner = new Html5Qrcode(regionId);
    html5QrCodeRef.current = scanner;

    const config = {
      fps: 15,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    scanner
      .start(
        { facingMode: 'user' }, // Cámara frontal (tablet o selfie)
        config,
        (decodedText) => {
          // Éxito al detectar QR
          onScanSuccess(decodedText);
          scanner.stop().catch(() => {});
        },
        () => {
          // Error de frame continuo (ignorable mientras busca QR)
        }
      )
      .then(() => {
        setIsScanning(true);
      })
      .catch((err) => {
        // Si la cámara frontal falla, intentar con la trasera / default
        scanner
          .start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              onScanSuccess(decodedText);
              scanner.stop().catch(() => {});
            },
            () => {}
          )
          .then(() => setIsScanning(true))
          .catch((e) => {
            setError('No se pudo acceder a la cámara. Por favor concede permisos en el navegador.');
            console.error('Error starting camera scanner:', e || err);
          });
      });

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-accent" />
            <h3 className="font-headline text-lg uppercase tracking-wider font-bold">
              Escáner de Pase QR
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport de Cámara */}
        <div className="p-6 bg-slate-50 flex flex-col items-center justify-center">
          <div
            id={regionId}
            className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-amber-400 bg-black shadow-inner flex items-center justify-center relative"
          >
            {!isScanning && !error && (
              <div className="flex flex-col items-center gap-2 text-white/70 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                <span>Iniciando cámara...</span>
              </div>
            )}
          </div>

          {error ? (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <CameraOff className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center mt-4">
              Muestra el código QR de tu pase frente a la cámara de la tablet para registrar tu entrada.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Cerrar Escáner
          </button>
        </div>
      </div>
    </div>
  );
};

