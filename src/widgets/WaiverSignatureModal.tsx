import React, { useRef, useState } from 'react';
import { Check, RotateCcw, ShieldCheck, X } from 'lucide-react';

interface WaiverSignatureModalProps {
  isOpen: boolean;
  waiverVersion: string;
  onClose: () => void;
  onConfirmSignature: (svgContent: string) => Promise<void>;
}

export const WaiverSignatureModal: React.FC<WaiverSignatureModalProps> = ({
  isOpen,
  waiverVersion,
  onClose,
  onConfirmSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    setIsDrawing(true);
    setHasDrawn(true);
    setPoints([coords]);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const coords = getCoordinates(e);
    setPoints((prev) => [...prev, coords]);

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setPoints([]);
    setHasDrawn(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!hasDrawn || points.length < 3) {
      setError('Por favor, estampa tu firma manuscrita en el recuadro antes de confirmar.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Generación de string SVG estricto para cumplimiento de reglas Firestore (size <= 8192 y match ^<svg)
      const pathData = points
        .map((p, idx) => (idx === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`))
        .join(' ');

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="400" height="160"><path d="${pathData}" fill="none" stroke="#0F172A" stroke-width="3" stroke-linecap="round"/></svg>`;

      if (svgString.length > 8192) {
        throw new Error('La firma generada supera el límite máximo permitido (8 KB). Por favor límpiala e inténtalo con trazos más breves.');
      }

      await onConfirmSignature(svgString);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar la firma del waiver');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-accent" />
            <h3 className="font-extrabold text-lg text-slate-900">Firma Legal de Waiver de Riesgos</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Términos legales resumidos */}
        <div className="text-xs text-slate-600 max-h-36 overflow-y-auto p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 leading-relaxed">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
            Exoneración y Condiciones de Seguridad ({waiverVersion})
          </p>
          <p>
            Reconozco que la práctica de Brazilian Jiu-Jitsu, Grappling y artes marciales involucra contacto físico,
            riesgo inherente de lesiones, luxaciones o contusiones. Declaro estar en condiciones psicofísicas idóneas
            para la actividad. Exonero a 247Studio, sus instructores y directiva de cualquier daño fortuito derivado de la
            práctica deportiva normal reglamentada.
          </p>
        </div>

        {/* Lienzo táctil de firma */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span>Firma con el dedo o ratón en el recuadro blanco:</span>
            <button
              onClick={clearCanvas}
              type="button"
              className="text-[11px] text-slate-500 hover:text-brand-accent flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Limpiar lienzo
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden touch-none flex justify-center shadow-inner">
            <canvas
              ref={canvasRef}
              width={400}
              height={160}
              className="cursor-crosshair w-full max-w-[400px] h-[160px]"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-700 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Confirmar y Firmar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
