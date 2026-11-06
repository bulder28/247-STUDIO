import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  HeartPulse,
  Lock,
  PauseCircle,
  QrCode,
  Save,
  User,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { FreezeDomainModel } from '@/shared/domain/types';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';
import { WaiverSignatureModal } from '@/widgets/WaiverSignatureModal';

export const ProfilePage: React.FC = () => {
  const { user, userData, refreshProfile } = useAuth();
  const [formData, setFormData] = useState({
    alias: '',
    contactEmail: '',
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalNotes: '',
  });

  const [medicalConsentGiven, setMedicalConsentGiven] = useState(false);
  const [freezes, setFreezes] = useState<FreezeDomainModel[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        alias: userData.alias || '',
        contactEmail: userData.contactEmail || '',
        phone: userData.phone || '',
        emergencyContactName: userData.emergencyContactName || '',
        emergencyContactPhone: userData.emergencyContactPhone || '',
        medicalNotes: userData.medicalNotes || '',
      });
      setMedicalConsentGiven(Boolean(userData.medicalConsentAt));
    }
  }, [userData]);

  useEffect(() => {
    const fetchFreezes = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'freezes'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        const list: FreezeDomainModel[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<FreezeDomainModel, 'id'>) }));
        setFreezes(list);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFreezes();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const updatePayload: Record<string, any> = {
        alias: formData.alias,
        contactEmail: formData.contactEmail,
        phone: formData.phone,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        updatedAt: serverTimestamp(),
      };

      // Si otorgó consentimiento médico por primera vez (null -> request.time)
      if (medicalConsentGiven && !userData?.medicalConsentAt) {
        updatePayload.medicalConsentAt = serverTimestamp();
        updatePayload.medicalConsentVersion = 'v1.2';
      }

      // Si tiene consentimiento (previo o actual), se autoriza editar notas médicas
      if (medicalConsentGiven || userData?.medicalConsentAt) {
        updatePayload.medicalNotes = formData.medicalNotes;
      }

      await updateDoc(doc(db, 'users', user.uid), updatePayload);
      await refreshProfile();
      setMessage({ text: 'Perfil actualizado con éxito.', type: 'success' });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error al guardar los cambios.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleWaiverConfirmed = async (svgContent: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      waiverSignedAt: serverTimestamp(),
      waiverVersion: 'v2.0',
      waiverSignatureSvg: svgContent,
      waiverSignedByUid: user.uid,
      updatedAt: serverTimestamp(),
    });
    await refreshProfile();
    setMessage({ text: 'Waiver legal de riesgos firmado y registrado correctamente.', type: 'success' });
  };

  if (!userData) return null;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-white">Mi Perfil de Atleta</h1>
          <p className="text-xs text-studio-cream/70 mt-0.5">
            Gestión de datos de contacto, registros médicos y documentación legal.
          </p>
        </div>

        <button
          onClick={() => setShowQrModal(true)}
          className="px-4 py-2 bg-studio-navy-light hover:bg-white/10 text-studio-cream border border-white/15 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition"
        >
          <QrCode className="w-4 h-4 text-studio-red" />
          <span>Ver Mi Pase QR</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-studio-red/15 border-studio-red/30 text-studio-red'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Formulario Principal de Datos Editables */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
            <User className="w-4 h-4 text-studio-red" /> Datos Personales y Tatami
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Alias en el Tatami
              </label>
              <input
                type="text"
                name="alias"
                required
                value={formData.alias}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Correo de Contacto
              </label>
              <input
                type="email"
                name="contactEmail"
                required
                value={formData.contactEmail}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Teléfono Móvil
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream/60 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-studio-cream/40" /> Email de Autenticación (Inmutable)
              </label>
              <input
                type="text"
                disabled
                value={userData.authEmail}
                className="w-full px-3.5 py-2.5 bg-studio-navy/40 border border-white/5 rounded-xl text-xs text-studio-cream/50 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-studio-cream block mb-2">
              Contacto de Emergencia
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="emergencyContactName"
                placeholder="Nombre completo"
                value={formData.emergencyContactName}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
              <input
                type="tel"
                name="emergencyContactPhone"
                placeholder="Teléfono"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
            </div>
          </div>
        </div>

        {/* Sección de Salud y Consentimiento Médico (RGPD Art. 9) */}
        <div className="bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-studio-red" /> Notas Médicas y Lesiones (RGPD Art. 9)
            </h2>
            {userData.medicalConsentAt && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Consentimiento Activo
              </span>
            )}
          </div>

          <p className="text-xs text-studio-cream/70 leading-relaxed">
            Información crítica para tu seguridad en combate (alergias, luxaciones previas, prótesis o patologías).
            Visible únicamente por los profesores e instructores del centro.
          </p>

          {!userData.medicalConsentAt && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-studio-navy border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={medicalConsentGiven}
                onChange={(e) => setMedicalConsentGiven(e.target.checked)}
                className="mt-0.5 rounded border-white/20 text-studio-red focus:ring-studio-red"
              />
              <span className="text-xs text-studio-cream/90 leading-relaxed">
                Autorizo expresamente a 247Studio el tratamiento confidencial de mis datos médicos y de aptitud física
                para velar por mi integridad durante los entrenamientos (Art. 9.2.a RGPD).
              </span>
            </label>
          )}

          <div>
            <textarea
              name="medicalNotes"
              rows={3}
              maxLength={2000}
              disabled={!medicalConsentGiven && !userData.medicalConsentAt}
              value={formData.medicalNotes}
              onChange={handleChange}
              placeholder={
                medicalConsentGiven || userData.medicalConsentAt
                  ? 'Describe cualquier lesión, afección respiratoria o advertencia física...'
                  : 'Debes marcar la casilla de consentimiento para habilitar este campo.'
              }
              className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" /> Guardar Modificaciones del Perfil
            </>
          )}
        </button>
      </form>

      {/* Sección Legal: Waiver de Exoneración de Responsabilidad */}
      <div className="bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-studio-red" /> Waiver Legal de Responsabilidad
            </h2>
            <p className="text-xs text-studio-cream/70 mt-1">
              Documento obligatorio para tener autorización de combate en el tatami.
            </p>
          </div>

          <div>
            {userData.waiverSignedAt ? (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Firmado ({userData.waiverVersion || 'Vigente'})
              </span>
            ) : (
              <button
                onClick={() => setShowWaiverModal(true)}
                className="py-2.5 px-4 rounded-xl bg-studio-red hover:bg-studio-red-dark text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-studio-red/30 flex items-center gap-1.5"
              >
                <span>Firmar Digitalmente en App</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Congelaciones / Freezes (Solo Lectura) */}
      <div className="bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-white flex items-center gap-2 mb-3">
          <PauseCircle className="w-4 h-4 text-studio-red" /> Historial de Bajas Temporales (Freezes)
        </h2>

        {freezes.length === 0 ? (
          <p className="text-xs text-studio-cream/60">No tienes suspensiones temporales registradas.</p>
        ) : (
          <div className="space-y-2">
            {freezes.map((f) => (
              <div
                key={f.id}
                className="p-3 bg-studio-navy rounded-xl border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">
                    {f.reason === 'INJURY' ? 'Lesión deportiva' : 'Motivo laboral / viaje'}
                  </span>
                  <span className="text-[11px] text-studio-cream/60">
                    Desde {new Date(f.startDate).toLocaleDateString()} {f.openEnded ? '(Indefinido)' : `hasta ${f.endDate ? new Date(f.endDate).toLocaleDateString() : ''}`}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/10 text-studio-cream">
                  Registrado por Admin
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      <WaiverSignatureModal
        isOpen={showWaiverModal}
        waiverVersion="v2.0"
        onClose={() => setShowWaiverModal(false)}
        onConfirmSignature={handleWaiverConfirmed}
      />

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="max-w-sm w-full animate-in zoom-in-95 duration-200">
            <QrCodePassCard user={userData} />
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-4 w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition border border-white/10"
            >
              Cerrar Pase
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
