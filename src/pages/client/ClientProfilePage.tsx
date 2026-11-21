import { useState } from 'react';
import { Lock, Save, Camera, Upload, User, ChevronDown, Mail } from 'lucide-react';
import { isProvisionalEmail } from '@/lib/provisionalEmail';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { isMinorAge } from '@/lib/dateUtils';
import { uploadUserAvatar } from '@/lib/imageCompressor';
import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import { PageHeader } from '@/components/PageHeader';
import { StudentDocumentsSection } from '@/components/StudentDocumentsSection';

export function ClientProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [gender, setGender] = useState<'hombre' | 'mujer' | ''>(profile?.gender ?? '');
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
  const [showExtraDetails, setShowExtraDetails] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || profile?.full_name,
        birth_date: birthDate || null,
        gender: gender || null,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil y documentos"
      />

      {isProvisionalEmail(profile?.email) && (
        <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 text-sky-100 px-4 py-3 flex items-start gap-3">
          <Mail className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm">
            <strong>Tu cuenta no tiene un email real.</strong> Si olvidas la contraseña no podremos
            enviarte un enlace. Pide a dirección que añada tu email, o que te genere una contraseña
            temporal si la necesitas.
          </p>
        </div>
      )}

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
                className="inline-flex items-center gap-1.5 min-h-11 rounded-xl studio-panel-inset border border-white/15 hover:bg-white/5 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Camera className="w-3.5 h-3.5 text-studio-red" />
                {uploadingPhoto ? 'Subiendo...' : 'Realizar foto'}
              </button>
              <label className="inline-flex items-center gap-1.5 min-h-11 rounded-xl studio-panel-inset border border-white/15 hover:bg-white/5 px-3 py-1.5 text-xs text-slate-200 cursor-pointer">
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
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 uppercase mb-1" htmlFor="pf-1">
                Nombre y apellidos
              </label>
              <input id="pf-1"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Tu nombre y apellidos completos"
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 uppercase mb-1" htmlFor="pf-2">
                Fecha de nacimiento
              </label>
              <input id="pf-2"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 uppercase mb-1" htmlFor="pf-3">Sexo</label>
              <select id="pf-3"
                value={gender}
                onChange={(e) => setGender(e.target.value as 'hombre' | 'mujer' | '')}
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              >
                <option value="">— Seleccionar —</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 uppercase mb-1" htmlFor="pf-4">Teléfono</label>
              <input id="pf-4"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                    <label className="block text-[11px] text-slate-300 uppercase mb-1" htmlFor="pf-5">
                      Nombre del padre
                    </label>
                    <input id="pf-5"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 uppercase mb-1" htmlFor="pf-6">
                      Teléfono del padre
                    </label>
                    <input id="pf-6"
                      value={fatherPhone}
                      onChange={(e) => setFatherPhone(e.target.value)}
                      className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 uppercase mb-1" htmlFor="pf-7">
                      Nombre de la madre
                    </label>
                    <input id="pf-7"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 uppercase mb-1" htmlFor="pf-8">
                      Teléfono de la madre
                    </label>
                    <input id="pf-8"
                      value={motherPhone}
                      onChange={(e) => setMotherPhone(e.target.value)}
                      className="w-full rounded-lg studio-field px-2.5 py-1.5 text-sm text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="sm:col-span-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExtraDetails((v) => !v)}
                aria-expanded={showExtraDetails}
                className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition"
              >
                <span>Contacto de emergencia y datos médicos (opcional)</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    showExtraDetails ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {showExtraDetails && (
              <>
                <div>
                  <label className="block text-xs text-slate-300 uppercase mb-1" htmlFor="pf-9">
                    Contacto Emergencia
                  </label>
                  <input id="pf-9"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Nombre"
                    className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 uppercase mb-1" htmlFor="pf-10">
                    Teléfono Emergencia
                  </label>
                  <input id="pf-10"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-300 uppercase mb-1" htmlFor="pf-11">
                    Otros datos / Lesiones / Alergias
                  </label>
                  <textarea id="pf-11"
                    rows={2}
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                  />
                </div>
              </>
            )}
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
            <label className="block text-xs text-slate-300 uppercase mb-1" htmlFor="pf-12">Nueva contraseña</label>
            <input id="pf-12"
              type="password"
              autoComplete="new-password"
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

      {user && (
        <StudentDocumentsSection
          userId={user.id}
          fullName={profile?.full_name ?? ''}
          isMinor={isMinor}
        />
      )}

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handlePhotoSelected}
      />

    </div>
  );
}

