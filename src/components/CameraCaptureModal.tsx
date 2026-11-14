import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check } from 'lucide-react';

interface CameraCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

/**
 * Modal de captura de foto en vivo compatible con cámaras USB/WiFi en PC
 * y cámara trasera/frontal en móviles y tablets.
 */
export function CameraCaptureModal({ open, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
  };

  const startCamera = async (deviceId?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no soporta cámara en directo. Usa el botón de subir archivo.');
      return;
    }

    setStarting(true);
    setError(null);
    stopStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 1280 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      const activeTrack = stream.getVideoTracks()[0];
      const activeId = activeTrack?.getSettings().deviceId;
      if (activeId && !deviceId) {
        setSelectedDeviceId(activeId);
      }
    } catch {
      setError(
        'No se pudo acceder a la cámara. Comprueba los permisos del navegador o que la cámara USB/WiFi esté conectada.'
      );
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      stopStream();
      clearPreview();
      return;
    }

    startCamera(selectedDeviceId || undefined);

    return () => {
      stopStream();
    };
  }, [open]);

  const handleSwitchDevice = (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    clearPreview();
    startCamera(newDeviceId);
  };

  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const side = Math.min(video.videoWidth, video.videoHeight);
    const sx = Math.floor((video.videoWidth - side) / 2);
    const sy = Math.floor((video.videoHeight - side) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, sx, sy, side, side, 0, 0, 600, 600);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        clearPreview();
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
      },
      'image/webp',
      0.9
    );
  };

  const handleConfirm = () => {
    if (!previewBlob) return;
    const file = new File([previewBlob], `foto-alumno-${Date.now()}.webp`, {
      type: 'image/webp',
    });
    stopStream();
    clearPreview();
    onCapture(file);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-studio-navy border border-white/15 p-5 space-y-4 shadow-modal">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-lg uppercase text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-studio-red" /> Realizar Foto
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Cerrar cámara"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {devices.length > 1 && !previewUrl && (
          <div>
            <label className="block text-[11px] text-slate-400 uppercase mb-1">
              Cámara activa (USB / WiFi / Móvil)
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => handleSwitchDevice(e.target.value)}
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-xs text-white"
            >
              {devices.map((d, idx) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Cámara ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {error ? (
          <div className="rounded-xl bg-studio-red/20 border border-studio-red/40 p-4 text-xs text-red-200">
            {error}
          </div>
        ) : (
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black border border-white/10 flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-dashed border-white/40" />
                {starting && (
                  <span className="absolute text-xs text-slate-300 bg-black/60 px-3 py-1 rounded-full">
                    Iniciando cámara...
                  </span>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2.5">
          {previewUrl ? (
            <>
              <button
                type="button"
                onClick={() => {
                  clearPreview();
                  startCamera(selectedDeviceId || undefined);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Repetir
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
              >
                <Check className="w-4 h-4" /> Usar esta foto
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Boolean(error) || starting}
                onClick={handleTakePhoto}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-studio-red hover:bg-studio-red-dark disabled:opacity-50 text-xs font-semibold text-white"
              >
                <Camera className="w-4 h-4" /> Capturar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

