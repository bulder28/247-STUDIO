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
        console.error('Error fetching student freezes:', err);
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
      const userRef = doc(db, 'users', user.uid);
      const updates: Record<string, unknown> = {
        alias: formData.alias.trim(),
        contactEmail: formData.contactEmail.trim(),
        phone: formData.phone.trim(),
        emergencyContactName: formData.emergencyContactName.trim(),
        emergencyContactPhone: formData.emergencyContactPhone.trim(),
        medicalNotes: formData.medicalNotes.trim(),
        updatedAt: serverTimestamp(),
      };

      if (medicalConsentGiven && !userData?.medicalConsentAt) {
        updates.medicalConsentAt = serverTimestamp();
      }

      await updateDoc(userRef, updates);
      await refreshProfile();
      setMessage({ text: 'Perfil actualizado con éxito.', type: 'success' });
    } catch (err: unknown) {
      console.error(err);
      setMessage({
        text: err instanceof Error ? err.message : 'Error al guardar los datos del perfil.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleWaiverConfirmed = async (signatureDataUrl: string) => {
    if (!user) return;
    setShowWaiverModal(false);
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      waiverSignedAt: serverTimestamp(),
      waiverVersion: 'v2.0',
      waiverSignatureData: signatureDataUrl,
      updatedAt: serverTimestamp(),
    });
    await refreshProfile();
    setMessage({ text: 'Waiver legal de riesgos firmado y registrado correctamente.', type: 'success' });
  };

  if (!userData) return null;

  const inputCls =
    'w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Mi Perfil de Atleta</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Gestión de datos de contacto, registros médicos y documentación legal.
          </p>
        </div>

        <button
          onClick={() => setShowQrModal(true)}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-sm self-start sm:self-auto"
        >
          <QrCode className="w-4 h-4 text-brand-accent" />
          <span>Ver Mi Pase QR</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Formulario Principal de Datos Editables */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-slate-500" /> Datos Personales y Tatami
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alias en el Tatami
              </label>
              <input
                type="text"
                name="alias"
                required
                value={formData.alias}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo de Contacto
              </label>
              <input
                type="email"
                name="contactEmail"
                required
                value={formData.contactEmail}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono Móvil
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Email de Autenticación (Inmutable)
              </label>
              <input
                type="text"
                disabled
                value={userData.authEmail}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 block mb-3">
              Contacto de Emergencia
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="emergencyContactName"
                placeholder="Nombre completo"
                value={formData.emergencyContactName}
                onChange={handleChange}
                className={inputCls}
              />
              <input
                type="tel"
                name="emergencyContactPhone"
                placeholder="Teléfono de contacto"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Sección de Salud y Consentimiento Médico (RGPD Art. 9) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-brand-accent" /> Notas Médicas y Lesiones (RGPD Art. 9)
            </h2>
            {userData.medicalConsentAt && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Consentimiento Activo
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Información crítica para tu seguridad en combate (alergias, luxaciones previas, prótesis o patologías).
            Visible únicamente por los profesores e instructores del centro.
          </p>

          {!userData.medicalConsentAt && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={medicalConsentGiven}
                onChange={(e) => setMedicalConsentGiven(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
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
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
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
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-slate-500" /> Waiver Legal de Responsabilidad
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Documento obligatorio para tener autorización de combate en el tatami.
            </p>
          </div>

          <div>
            {userData.waiverSignedAt ? (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Firmado ({userData.waiverVersion || 'Vigente'})
              </span>
            ) : (
              <button
                onClick={() => setShowWaiverModal(true)}
                className="py-2 px-4 rounded-xl bg-brand-accent hover:bg-brand-accent-dark text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <span>Firmar Digitalmente en App</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Congelaciones / Freezes */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
          <PauseCircle className="w-4 h-4 text-slate-500" /> Historial de Bajas Temporales (Freezes)
        </h2>

        {freezes.length === 0 ? (
          <p className="text-xs text-slate-500">No tienes suspensiones temporales registradas.</p>
        ) : (
          <div className="space-y-2">
            {freezes.map((f) => (
              <div
                key={f.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">
                    {f.reason === 'INJURY' ? 'Lesión deportiva' : 'Motivo laboral / viaje'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Desde {new Date(f.startDate).toLocaleDateString()} {f.openEnded ? '(Indefinido)' : `hasta ${f.endDate ? new Date(f.endDate).toLocaleDateString() : ''}`}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 relative shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <QrCodePassCard user={userData} />
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition"
            >
              Cerrar Pase
            </button>
          </div>
        </div>
      )}
    </div>
  );
};