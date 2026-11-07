import React, { useRef, useState } from 'react';
import { Camera, Check, Image as ImageIcon, Upload, X } from 'lucide-react';
import { triggerPromotionConfetti } from '@/shared/utils/confetti';

interface PhotoUploaderModalProps {
  currentPhotoUrl?: string;
  athleteAlias: string;
  onSave: (photoDataUrl: string) => Promise<void>;
  onClose: () => void;
}

export const PhotoUploaderModal: React.FC<PhotoUploaderModalProps> = ({
  currentPhotoUrl,
  athleteAlias,
  onSave,
  onClose,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(currentPhotoUrl || null);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSave = async () => {
    if (!selectedImage) return;
    try {
      setSaving(true);
      await onSave(selectedImage);
      triggerPromotionConfetti();
      onClose();
    } catch (err) {
      console.error('Error saving athlete photo:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <h3 className="font-headline text-lg uppercase tracking-wider font-bold">
              Foto del Atleta
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

        {/* Viewport de Previsualización para Carta FIFA */}
        <div className="p-6 bg-slate-50 flex flex-col items-center">
          <p className="text-xs text-slate-500 text-center mb-4">
            Sube un selfie o retrato de <strong className="text-slate-900 font-bold">{athleteAlias}</strong>. Se adaptará automáticamente a tu <span className="font-extrabold text-amber-600">Carta FIFA FUT</span>.
          </p>

          <div className="relative w-40 h-44 rounded-2xl overflow-hidden border-2 border-dashed border-amber-400 bg-slate-200 shadow-md flex items-center justify-center group">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt="Vista previa"
                className="w-full h-full object-cover object-top transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-slate-400 text-xs">
                <ImageIcon className="w-8 h-8" />
                <span>Sin foto</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition text-xs font-bold gap-1 cursor-pointer"
            >
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Cambiar imagen</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Control de Zoom */}
          {selectedImage && (
            <div className="w-full mt-4 flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase text-slate-500">Zoom:</span>
              <input
                type="range"
                min={1}
                max={1.8}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <span className="font-mono text-xs text-slate-700 font-bold">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Seleccionar de mi dispositivo</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || !selectedImage}
            onClick={handleConfirmSave}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Guardar Foto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
