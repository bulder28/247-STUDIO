import { useEffect, useRef, useState } from 'react';
import {
  PenTool,
  CheckCircle2,
  Lock,
  Save,
  RotateCcw,
  Camera,
  Upload,
  User,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { isMinorAge } from '@/lib/dateUtils';
import { uploadUserAvatar } from '@/lib/imageCompressor';
import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import {
  getDocumentCompliance,
  type DocSignature,
  type DocTemplate,
} from '@/lib/documents';
import { notifyDocsUpdated } from '@/lib/noticeRead';
import { PageHeader } from '@/components/PageHeader';

export function ClientProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [emergencyName, setEmergencyName] = useState(profile?.emergency_contact_name ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(profile?.emergency_contact_phone ?? '');
  const [fatherName, setFatherName] = useState(profile?.father_name ?? '');
  const [fatherPhone, setFatherPhone] = useState(profile?.father_phone ?? '');
  const [motherName, setMotherName] = useState(profile?.mother_name ?? '');
  const [motherPhone, setMotherPhone] = useState(profile?.mother_phone ?? '');
  const [medicalNotes, setMedicalNotes] = useState(profile?.medical_notes ?? '');
  const isMinor = isMinorAge(profile?.birth_date);
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Documentos y firma en pantalla
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [signatures, setSignatures] = useState<DocSignature[]>([]);
  const [signingDoc, setSigningDoc] = useState<DocTemplate | null>(null);
  const [signerName, setSignerName] = useState(
    isMinor ? (profile?.father_name || profile?.mother_name || '') : (profile?.full_name ?? '')
  );
  const [signerDni, setSignerDni] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const loadDocs = async () => {
    if (!user) return;
    const [tplRes, sigRes] = await Promise.all([
      supabase.from('document_templates').select('*').eq('is_active', true),
      supabase
        .from('document_signatures')
        .select('template_id, template_version, signed_at')
        .eq('user_id', user.id),
    ]);
    setTemplates((tplRes.data as DocTemplate[]) ?? []);
    setSignatures((sigRes.data as DocSignature[]) ?? []);
  };

  useEffect(() => {
    loadDocs();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({
        phone,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        father_name: fatherName.trim() || null,
        father_phone: fatherPhone.trim() || null,
        mother_name: motherName.trim() || null,
        mother_phone: motherPhone.trim() || null,
        medical_notes: medicalNotes,
      })
      .eq('id', user.id);
    await refreshProfile();
    setFeedback('Datos personales actualizados.');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setFeedback('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setFeedback('No se pudo cambiar la contraseña.');
    } else {
      setNewPassword('');
      setFeedback('Contraseña actualizada correctamente.');
    }
  };

  // Dibujo en Canvas (ratón y táctil)
  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    isDrawing.current = true;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const submitSignature = async () => {
    if (!user || !signingDoc || !canvasRef.current || !signerName.trim()) return;
    if (!hasDrawn) {
      setFeedback('Por favor, traza tu firma en el recuadro antes de confirmar.');
      return;
    }
    const dataUrl = canvasRef.current.toDataURL('image/png');

    await supabase.from('document_signatures').insert({
      user_id: user.id,
      template_id: signingDoc.id,
      template_version: signingDoc.version,
      signature_image_url: dataUrl,
      signer_name: signerName.trim(),
      signer_dni: signerDni.trim() || null,
    });

    setSigningDoc(null);
    setSignerDni('');
    setHasDrawn(false);
    setFeedback(`Documento "${signingDoc.title}" firmado y guardado.`);
    await loadDocs();
    notifyDocsUpdated();
  };

  const handlePhotoSelected = async (file: File) => {
    if (!user) return;
    setUploadingPhoto(true);
    setFeedback(null);
    try {
      const avatarUrl = await uploadUserAvatar(user.id, file);
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
      await refreshProfile();
      setFeedback('Foto de perfil actualizada correctamente.');
    } catch {
      setFeedback('No se pudo subir la foto. Comprueba tu conexión o el formato de imagen.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const docCompliance = getDocumentCompliance(templates, signatures, profile?.birth_date);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil y documentos"
      />

      {feedback && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-200">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos personales */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4"
        >
          <h2 className="font-headline text-lg uppercase text-white">Perfil del Atleta</h2>

          {/* Foto identificativa */}
          <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-white/10">
            <div className="w-14 h-14 rounded-full studio-panel-inset border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-slate-500" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => setCameraOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl studio-panel-inset border border-white/15 hover:bg-white/5 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Camera className="w-3.5 h-3.5 text-studio-red" />
                {uploadingPhoto ? 'Subiendo...' : 'Realizar foto'}
              </button>
              <label className="inline-flex items-center gap-1.5 rounded-xl studio-panel-inset border border-white/15 hover:bg-white/5 px-3 py-1.5 text-xs text-slate-200 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Subir archivo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoSelected(f);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Teléfono</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">
                Contacto Emergencia
              </label>
              <input
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Nombre"
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 uppercase mb-1">
                Teléfono Emergencia
              </label>
              <input
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>

            {isMinor && (
              <div className="sm:col-span-2 rounded-xl bg-sky-500/10 border border-sky-400/25 p-3.5 space-y-3">
                <p className="text-xs font-semibold text-sky-300 uppercase">
                  Datos de Padre y Madre (Menor ≤ 14 años)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-300 uppercase mb-1">
                      Nombre del padre
                    </label>
                    <input
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 uppercase mb-1">
                      Teléfono del padre
                    </label>
                    <input
                      value={fatherPhone}
                      onChange={(e) => setFatherPhone(e.target.value)}
                      className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 uppercase mb-1">
                      Nombre de la madre
                    </label>
                    <input
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 uppercase mb-1">
                      Teléfono de la madre
                    </label>
                    <input
                      value={motherPhone}
                      onChange={(e) => setMotherPhone(e.target.value)}
                      className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 uppercase mb-1">
                Otros datos / Lesiones / Alergias
              </label>
              <textarea
                rows={2}
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl studio-btn px-4 py-2 text-sm font-semibold text-white"
          >
            <Save className="w-4 h-4" /> Guardar Datos
          </button>
        </form>

        {/* Seguridad / Cambio de contraseña */}
        <form
          onSubmit={handleChangePassword}
          className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4 h-fit"
        >
          <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-studio-red" /> Cambiar Contraseña
          </h2>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-white/15 hover:bg-white/5 px-4 py-2 text-sm font-semibold text-white"
          >
            Actualizar Contraseña
          </button>
        </form>
      </div>

      {/* Documentación y Firmas en pantalla (Slide 5) */}
      <section className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-headline text-lg uppercase text-white">
              Documentación Obligatoria para Entrenar
            </h2>
            <p className="text-xs text-slate-400">
              Es imprescindible tener firmados todos los documentos para poder practicar en la academia.
            </p>
          </div>
          {docCompliance.totalRequired > 0 && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                docCompliance.isComplete
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-studio-red/20 text-red-200 border border-studio-red/40'
              }`}
            >
              {docCompliance.signedCount} / {docCompliance.totalRequired} firmados
            </span>
          )}
        </div>

        {!docCompliance.isComplete && docCompliance.totalRequired > 0 && (
          <div className="rounded-xl bg-studio-red/15 border border-studio-red/40 px-3.5 py-2.5 text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-studio-red shrink-0" />
            <span>
              Tienes <strong>{docCompliance.pending.length}</strong> documento(s) pendiente(s) de
              firma.
              {isMinor
                ? ' Al ser menor (≤ 14 años), debe firmarlos el padre, madre o tutor legal.'
                : ''}
            </span>
          </div>
        )}

        <div className="space-y-3">
          {docCompliance.required.map((doc) => {
            const signed = signatures.find(
              (s) => s.template_id === doc.id && s.template_version === doc.version
            );
            return (
              <div
                key={doc.id}
                className="rounded-xl studio-panel-inset border border-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">{doc.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{doc.body_text}</p>
                </div>
                {signed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold shrink-0">
                    <CheckCircle2 className="w-4 h-4" /> Firmado (
                    {new Date(signed.signed_at).toLocaleDateString('es-ES')})
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setHasDrawn(false);
                      setSignerName(
                        isMinor
                          ? profile?.father_name || profile?.mother_name || ''
                          : (profile?.full_name ?? '')
                      );
                      setSigningDoc(doc);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl studio-btn text-xs font-semibold text-white shrink-0"
                  >
                    <PenTool className="w-3.5 h-3.5" /> Firmar en pantalla
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handlePhotoSelected}
      />

      {/* Modal Firma Táctil */}
      {signingDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl studio-panel border border-white/15 p-6 space-y-4 shadow-modal">
            <h3 className="font-headline text-xl uppercase text-white">{signingDoc.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{signingDoc.body_text}</p>
            {isMinor && (
              <p className="rounded-xl bg-sky-500/15 border border-sky-400/30 px-3 py-2 text-xs text-sky-200">
                Alumno menor (≤ 14 años): este documento debe ser firmado por el padre, madre o
                tutor legal.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Nombre firmante (o tutor)
                </label>
                <input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  DNI (opcional / menores)
                </label>
                <input
                  value={signerDni}
                  onChange={(e) => setSignerDni(e.target.value)}
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 uppercase">Firma aquí con el dedo</span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
                >
                  <RotateCcw className="w-3 h-3" /> Limpiar
                </button>
              </div>
              <canvas
                aria-label="Área de firma: dibuja tu firma con el dedo o el ratón"
                ref={canvasRef}
                width={440}
                height={180}
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                className="w-full h-44 rounded-xl studio-panel-inset border border-white/20 touch-none cursor-crosshair"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSigningDoc(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitSignature}
                disabled={!hasDrawn}
                className="px-5 py-2 rounded-xl studio-btn disabled:opacity-45 text-sm font-semibold text-white"
              >
                Confirmar Firma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

