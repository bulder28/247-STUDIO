import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
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
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { PhotoUploaderModal } from '@/widgets/PhotoUploaderModal';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';
import { compressImageToCanvas } from '@/shared/utils/imageCompressor';

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
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<'datos' | 'salud' | 'pausas'>('datos');

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

  const handleSavePhoto = async (photoDataUrl: string) => {
    if (!user) return;
    try {
      // Garantizar compresión a JPEG ligero (< 50KB) antes de escribir en Firestore
      const finalPhotoUrl = photoDataUrl.startsWith('data:')
        ? await compressImageToCanvas(photoDataUrl, {
            targetWidth: 400,
            targetHeight: 440,
            quality: 0.72,
            maxSizeBytes: 49152,
          })
        : photoDataUrl;

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        photoUrl: finalPhotoUrl,
        updatedAt: serverTimestamp(),
      });

      try {
        const kioskRef = doc(db, 'kiosk_members', user.uid);
        await updateDoc(kioskRef, {
          photoUrl: finalPhotoUrl,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignorar si el documento de kiosk no existe aún
      }

      await refreshProfile();
      setMessage({
        text: '¡Foto de atleta actualizada con éxito! Tu tarjeta FUT de luchador ya está lista.',
        type: 'success',
      });
    } catch (err) {
      console.error('Error al guardar foto de atleta:', err);
      setMessage({
        text: 'Error al optimizar o guardar la foto de perfil en Firestore.',
        type: 'error',
      });
    }
  };

  if (!userData) return null;

  const inputCls =
    'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition';

  return (
    <div className="space-y-3 md:space-y-6 pb-2 md:pb-12 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">Mi Perfil de Atleta</h1>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Gestión de datos de contacto y registros médicos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowQrModal(true)}
          aria-label="Ver mi Pase QR de Acceso"
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm shrink-0 cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-brand-accent" />
          <span>Pase QR</span>
        </button>
      </div>

      {/* Selector de sub-pestañas móvil sin scroll vertical */}
      <div className="md:hidden grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab('datos')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            mobileTab === 'datos' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Mis Datos</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('salud')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            mobileTab === 'salud' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Salud & SOS</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('pausas')}
          className={`py-2 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            mobileTab === 'pausas' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
          }`}
        >
          <PauseCircle className="w-3.5 h-3.5" />
          <span>Pausas</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tarjeta de Foto de Atleta / FIFA FUT Card (Visible en pestaña Mis Datos en móvil) */}
      <div
        className={`${
          mobileTab === 'datos' ? 'flex' : 'hidden md:flex'
        } bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex-row items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {userData.photoUrl ? (
              <img
                src={userData.photoUrl}
                alt={userData.alias}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-brand-accent shadow-md"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border-2 border-brand-accent/50 flex items-center justify-center text-amber-400 font-extrabold text-base sm:text-xl shadow-md">
                {userData.alias?.slice(0, 2).toUpperCase() || '247'}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="absolute -bottom-1 -right-1 p-1 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-full shadow-md transition cursor-pointer"
              title="Cambiar foto de atleta"
              aria-label="Cambiar foto de atleta"
            >
              <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Foto de Atleta (FUT Card)</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Personaliza tu imagen para la tarjeta de luchador.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPhotoModal(true)}
          aria-label={userData.photoUrl ? 'Cambiar Foto de Atleta' : 'Subir Mi Foto de Atleta'}
          className="px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-brand-accent" />
          <span>{userData.photoUrl ? 'Cambiar' : 'Subir Foto'}</span>
        </button>
      </div>

      {/* Formulario Principal de Datos Editables */}
      <form
        onSubmit={handleSaveProfile}
        className={`${mobileTab === 'pausas' ? 'hidden md:block' : 'block'} space-y-3 md:space-y-6`}
      >
        <div
          className={`${
            mobileTab === 'datos' ? 'block' : 'hidden md:block'
          } bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 shadow-sm space-y-3 sm:space-y-5`}
        >
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 sm:pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-slate-500" /> Datos Personales y Tatami
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="profile-alias" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                Alias en el Tatami
              </label>
              <input
                id="profile-alias"
                type="text"
                name="alias"
                required
                value={formData.alias}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="profile-contact-email" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                Correo de Contacto
              </label>
              <input
                id="profile-contact-email"
                type="email"
                name="contactEmail"
                required
                value={formData.contactEmail}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="profile-phone" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                Teléfono Móvil
              </label>
              <input
                id="profile-phone"
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="profile-auth-email" className="block text-[11px] sm:text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Email de Autenticación (Inmutable)
              </label>
              <input
                id="profile-auth-email"
                type="text"
                disabled
                value={userData.authEmail}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Sección de Salud y Contacto de Emergencia (RGPD Art. 9) */}
        <div
          className={`${
            mobileTab === 'salud' ? 'block' : 'hidden md:block'
          } bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 shadow-sm space-y-3 sm:space-y-4`}
        >
          <div>
            <span className="text-xs font-bold text-slate-800 block mb-2.5">
              Contacto de Emergencia (SOS)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pb-3 border-b border-slate-100">
              <div>
                <label htmlFor="profile-emergency-name" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  Nombre del Contacto
                </label>
                <input
                  id="profile-emergency-name"
                  type="text"
                  name="emergencyContactName"
                  placeholder="Nombre completo"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="profile-emergency-phone" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  Teléfono de Emergencia
                </label>
                <input
                  id="profile-emergency-phone"
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

          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-brand-accent" /> Notas Médicas y Lesiones (RGPD Art. 9)
            </h2>
            {userData.medicalConsentAt && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Consentimiento Activo
              </span>
            )}
          </div>

          {!userData.medicalConsentAt && (
            <label htmlFor="profile-medical-consent" className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                id="profile-medical-consent"
                type="checkbox"
                checked={medicalConsentGiven}
                onChange={(e) => setMedicalConsentGiven(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-[11px] sm:text-xs text-slate-700 leading-snug">
                Autorizo expresamente a 247Studio el tratamiento confidencial de mis datos médicos y de aptitud física (Art. 9.2.a RGPD).
              </span>
            </label>
          )}

          <div>
            <label htmlFor="profile-medical-notes" className="sr-only">
              Notas médicas y lesiones (RGPD Art. 9)
            </label>
            <textarea
              id="profile-medical-notes"
              name="medicalNotes"
              rows={2}
              maxLength={2000}
              disabled={!medicalConsentGiven && !userData.medicalConsentAt}
              value={formData.medicalNotes}
              onChange={handleChange}
              placeholder={
                medicalConsentGiven || userData.medicalConsentAt
                  ? 'Describe cualquier lesión, afección respiratoria o advertencia física...'
                  : 'Debes marcar la casilla de consentimiento para habilitar este campo.'
              }
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 sm:py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

      {/* Historial de Congelaciones / Freezes */}
      <div
        className={`${
          mobileTab === 'pausas' ? 'block' : 'hidden md:block'
        } bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-sm`}
      >
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

      {/* Modal Pase QR (Radix UI Dialog) */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-sm p-0 bg-transparent border-0 shadow-none">
          <DialogTitle className="sr-only">Pase QR de Acceso</DialogTitle>
          <QrCodePassCard user={userData} onClose={() => setShowQrModal(false)} />
        </DialogContent>
      </Dialog>

      {showPhotoModal && (
        <PhotoUploaderModal
          currentPhotoUrl={userData.photoUrl}
          athleteAlias={userData.alias}
          onSave={handleSavePhoto}
          onClose={() => setShowPhotoModal(false)}
        />
      )}
    </div>
  );
};