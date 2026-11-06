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
      ctx.strokeStyle = '#FFFFFF';
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
      setError('Por favor, estampa tu firma manuscrita antes de confirmar.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Generación de string SVG estricto para cumplimiento de reglas Firestore (size <= 8192 y match ^<svg)
      const pathData = points
        .map((p, idx) => (idx === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`))
        .join(' ');

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="400" height="160"><path d="${pathData}" fill="none" stroke="#11152E" stroke-width="3" stroke-linecap="round"/></svg>`;

      if (svgString.length > 8192) {
        throw new Error('La firma generada supera el límite máximo permitido (8 KB).');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-studio-navy-light border border-white/20 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-studio-cream">
            <ShieldCheck className="w-5 h-5 text-studio-red" />
            <h3 className="font-extrabold text-lg text-white">Firma de Waiver de Riesgos</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-studio-cream/60 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 text-xs text-studio-cream/80 max-h-36 overflow-y-auto p-3 bg-studio-navy rounded-xl border border-white/5 space-y-2">
          <p className="font-bold text-white uppercase tracking-wider">
            Exoneración y Términos de Seguridad ({waiverVersion})
          </p>
          <p>
            Reconozco que la práctica de Brazilian Jiu-Jitsu, Grappling y artes marciales involucra contacto físico,
            riesgo inherente de lesiones, luxaciones o contusiones. Declaro estar en condiciones psicofísicas idóneas
            para la actividad. Exonero a 247Studio, sus profesores y directiva de cualquier daño fortuito derivado de la
            práctica deportiva normal reglamentada.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-studio-cream/90 flex justify-between items-center">
            <span>Firma en el recuadro</span>
            <button
              onClick={clearCanvas}
              type="button"
              className="text-[11px] text-studio-cream/60 hover:text-studio-red flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" /> Limpiar lienzo
            </button>
          </label>

          <div className="border-2 border-dashed border-white/20 rounded-2xl bg-studio-navy overflow-hidden touch-none flex justify-center">
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
          <p className="mt-3 text-xs text-studio-red font-semibold bg-studio-red/10 p-2.5 rounded-lg border border-studio-red/30">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-studio-cream/80 hover:bg-white/5 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasDrawn}
            className="flex-1 py-3 px-4 rounded-xl bg-studio-red text-white text-xs font-bold uppercase tracking-wider hover:bg-studio-red-dark disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-studio-red/30 flex items-center justify-center gap-2 transition"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" /> Confirmar Firma
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
