import { useEffect, useRef, useState } from 'react';
import { PenTool, CheckCircle2, Lock, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DocTemplate {
  id: string;
  title: string;
  body_text: string;
  version: number;
}

interface DocSignature {
  template_id: string;
  template_version: number;
  signed_at: string;
}

export function ClientProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [emergencyName, setEmergencyName] = useState(profile?.emergency_contact_name ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(profile?.emergency_contact_phone ?? '');
  const [medicalNotes, setMedicalNotes] = useState(profile?.medical_notes ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Documentos y firma en pantalla
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [signatures, setSignatures] = useState<DocSignature[]>([]);
  const [signingDoc, setSigningDoc] = useState<DocTemplate | null>(null);
  const [signerName, setSignerName] = useState(profile?.full_name ?? '');
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
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
          Personal Info y Documentación
        </h1>
        <p className="text-sm text-slate-400">
          Tus datos de contacto, contraseña y firma de documentos de la academia.
        </p>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-200">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos personales */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-4"
        >
          <h2 className="font-headline text-lg uppercase text-white">Perfil del Atleta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Teléfono</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
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
                className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 uppercase mb-1">
                Teléfono Emergencia
              </label>
              <input
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 uppercase mb-1">
                Otros datos / Lesiones / Alergias
              </label>
              <textarea
                rows={2}
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2 text-sm font-semibold text-white"
          >
            <Save className="w-4 h-4" /> Guardar Datos
          </button>
        </form>

        {/* Seguridad / Cambio de contraseña */}
        <form
          onSubmit={handleChangePassword}
          className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-4 h-fit"
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
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
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
      <section className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-4">
        <h2 className="font-headline text-lg uppercase text-white">
          Formularios y Documentación
        </h2>
        <div className="space-y-3">
          {templates.map((doc) => {
            const signed = signatures.find(
              (s) => s.template_id === doc.id && s.template_version === doc.version
            );
            return (
              <div
                key={doc.id}
                className="rounded-xl bg-studio-navy-deep border border-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                      setSigningDoc(doc);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-studio-red hover:bg-studio-red-dark text-xs font-semibold text-white shrink-0"
                  >
                    <PenTool className="w-3.5 h-3.5" /> Firmar en pantalla
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal Firma Táctil */}
      {signingDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-studio-navy border border-white/15 p-6 space-y-4 shadow-modal">
            <h3 className="font-headline text-xl uppercase text-white">{signingDoc.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{signingDoc.body_text}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Nombre firmante (o tutor)
                </label>
                <input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  DNI (opcional / menores)
                </label>
                <input
                  value={signerDni}
                  onChange={(e) => setSignerDni(e.target.value)}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
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
                ref={canvasRef}
                width={440}
                height={180}
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                className="w-full h-44 rounded-xl bg-studio-navy-deep border border-white/20 touch-none cursor-crosshair"
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
                className="px-5 py-2 rounded-xl bg-studio-red hover:bg-studio-red-dark disabled:opacity-45 text-sm font-semibold text-white"
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

