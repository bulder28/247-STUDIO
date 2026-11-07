import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  Shield,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { calculateExactAge, isLegalMinor } from '@/shared/domain/minor';
import { Belt, BeltSystem, PricingTier } from '@/shared/domain/types';

const KIDS_BELTS: { value: Belt; label: string }[] = [
  { value: 'WHITE', label: 'Blanco' },
  { value: 'GREY_WHITE', label: 'Gris y Blanco' },
  { value: 'GREY', label: 'Gris' },
  { value: 'GREY_BLACK', label: 'Gris y Negro' },
  { value: 'YELLOW_WHITE', label: 'Amarillo y Blanco' },
  { value: 'YELLOW', label: 'Amarillo' },
  { value: 'YELLOW_BLACK', label: 'Amarillo y Negro' },
  { value: 'ORANGE_WHITE', label: 'Naranja y Blanco' },
  { value: 'ORANGE', label: 'Naranja' },
  { value: 'ORANGE_BLACK', label: 'Naranja y Negro' },
  { value: 'GREEN_WHITE', label: 'Verde y Blanco' },
  { value: 'GREEN', label: 'Verde' },
  { value: 'GREEN_BLACK', label: 'Verde y Negro' },
];

const ADULT_BELTS: { value: Belt; label: string }[] = [
  { value: 'WHITE', label: 'Blanco' },
  { value: 'BLUE', label: 'Azul' },
  { value: 'PURPLE', label: 'Morado' },
  { value: 'BROWN', label: 'Marrón' },
  { value: 'BLACK', label: 'Negro' },
];

export const StudentRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: adminAuthUser } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const locationState = (location.state as Record<string, any>) || {};

  const [formData, setFormData] = useState({
    alias: searchParams.get('name') || locationState.name || '',
    contactEmail: searchParams.get('email') || locationState.email || '',
    phone: searchParams.get('phone') || locationState.phone || '',
    birthDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    belt: 'WHITE' as Belt,
    stripes: 0,
    pricingTier: 'STD' as PricingTier,
    activeTariffId: 'tariff_monthly_unlimited',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianDni: '',
    guardianUid: searchParams.get('guardianUid') || locationState.guardianUid || '',
    medicalNotes: '',
    medicalConsent: true,
  });

  const [loading, setLoading] = useState(false);
  const [successUid, setSuccessUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);

  const now = new Date();
  const isMinor = formData.birthDate ? isLegalMinor(formData.birthDate, now) : false;
  const age = formData.birthDate ? calculateExactAge(formData.birthDate, now) : null;
  const beltSystem: BeltSystem = isMinor ? 'KIDS' : 'ADULT';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.alias.trim()) throw new Error('El nombre o alias del alumno es obligatorio.');
      if (!formData.birthDate) throw new Error('La fecha de nacimiento es obligatoria.');

      if (isMinor && (!formData.guardianName.trim() || !formData.guardianPhone.trim())) {
        throw new Error('Para atletas menores de 16 años es obligatorio registrar el tutor legal (nombre y teléfono).');
      }

      const uid = `usr_${Date.now()}`;
      const adminUid = adminAuthUser?.uid || 'admin_presencial';

      // 1. Guardar documento maestro en users/{uid}
      const userPayload: any = {
        uid,
        authEmail: formData.contactEmail || `alumno_${uid}@247studiobjj.com`,
        contactEmail: formData.contactEmail,
        alias: formData.alias.trim(),
        phone: formData.phone.trim(),
        emergencyContactName: isMinor ? formData.guardianName : formData.emergencyContactName,
        emergencyContactPhone: isMinor ? formData.guardianPhone : formData.emergencyContactPhone,
        birthDate: formData.birthDate,
        isMinor,
        guardianName: isMinor ? formData.guardianName : undefined,
        guardianPhone: isMinor ? formData.guardianPhone : undefined,
        guardianDni: isMinor ? formData.guardianDni : undefined,
        guardianEmail: isMinor ? formData.guardianEmail : undefined,
        guardianUid: isMinor ? (formData.guardianUid?.trim() || undefined) : undefined,
        beltSystem,
        belt: formData.belt,
        stripes: Number(formData.stripes),
        beltDate: now.toISOString().slice(0, 10),
        pricingTier: formData.pricingTier,
        activeTariffId: formData.activeTariffId,
        accountStatus: 'ACTIVE',
        paymentStatusCache: 'OK',
        permissions: ['student'],
        waiverVersion: 'PRESENCIAL_V1',
        waiverSignedAt: now.toISOString(),
        waiverSignedByUid: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        stats: {
          tecnica: 65,
          fuerza: 60,
          elasticidad: 60,
          guardia: 65,
          pase: 65,
          derribos: 55,
          leglocks: 50,
          finalizacion: 60,
        },
      };

      if (formData.medicalNotes.trim() && !formData.medicalConsent) {
        setError('Debe marcar la casilla de consentimiento explícito (RGPD Art. 9) para registrar información médica o lesiones del alumno.');
        setLoading(false);
        return;
      }

      if (formData.medicalNotes.trim() && formData.medicalConsent) {
        userPayload.medicalNotes = formData.medicalNotes.trim();
        userPayload.medicalConsentAt = serverTimestamp();
        userPayload.medicalConsentVersion = 'v1.0';
      }

      await setDoc(doc(db, 'users', uid), userPayload);

      // 2. Guardar proyección pública y segura para Kiosco (sin notas médicas ni teléfonos privados)
      await setDoc(doc(db, 'kiosk_members', uid), {
        uid,
        alias: formData.alias.trim(),
        belt: formData.belt,
        stripes: Number(formData.stripes),
        beltSystem,
        accountStatus: 'ACTIVE',
        activeTariffId: formData.activeTariffId,
        photoUrl: '',
        updatedAt: serverTimestamp(),
      });

      // 3. Si procede de un lead del embudo, marcarlo automáticamente como CONVERTED
      const effectiveLeadId = searchParams.get('leadId') || locationState.leadId;
      if (effectiveLeadId) {
        try {
          const { updateDoc: updateLeadDoc } = await import('firebase/firestore');
          await updateLeadDoc(doc(db, 'leads', effectiveLeadId), { status: 'CONVERTED' });
        } catch (leadErr) {
          console.warn('No se pudo actualizar el estado del lead:', leadErr);
        }
      }

      setSuccessUid(uid);
    } catch (err: any) {
      console.error('Error registrando alumno:', err);
      setError(err?.message || 'Error al dar de alta al alumno.');
    } finally {
      setLoading(false);
    }
  };

  const beltOptions = isMinor ? KIDS_BELTS : ADULT_BELTS;

  return (
    <div className="max-w-4xl mx-auto space-y-3 md:space-y-6 pb-2 md:pb-12 animate-in fade-in duration-200">
      {/* Cabecera compacta */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-5 h-5 sm:w-7 sm:h-7 text-brand-accent" />
            <span>Alta Presencial de Alumno</span>
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Registro de nuevo miembro en recepción (Adultos o Menores con tutor legal según RGPD).
          </p>
        </div>
        <Link
          to="/admin/personal"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 transition shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver</span>
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successUid ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">¡Alumno dado de alta con éxito!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Se ha creado la ficha en la BBDD, asignado su plan y sincronizado con el Kiosco de recepción para que pueda hacer check-in con su nombre o pase QR.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setSuccessUid(null);
                setFormData({
                  alias: '',
                  contactEmail: '',
                  phone: '',
                  birthDate: '',
                  emergencyContactName: '',
                  emergencyContactPhone: '',
                  belt: 'WHITE',
                  stripes: 0,
                  pricingTier: 'STD',
                  activeTariffId: 'tariff_monthly_unlimited',
                  guardianName: '',
                  guardianPhone: '',
                  guardianEmail: '',
                  guardianDni: '',
                  guardianUid: '',
                  medicalNotes: '',
                  medicalConsent: true,
                });
                setMobileStep(1);
              }}
              className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Dar de alta a otro alumno
            </button>
            <Link
              to="/admin/personal"
              className="py-2.5 px-6 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs rounded-xl transition shadow-sm inline-block"
            >
              Ir al Censo de Alumnos →
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
          {/* Selector de pasos móvil sin scroll vertical */}
          <div className="md:hidden grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMobileStep(1)}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                mobileStep === 1 ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Datos</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileStep(2)}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                mobileStep === 2 ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>2. Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileStep(3)}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                mobileStep === 3 ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>3. Salud</span>
            </button>
          </div>

          {/* Bloque 1: Datos Personales */}
          <div
            className={`${
              mobileStep === 1 ? 'block' : 'hidden md:block'
            } p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 space-y-3 sm:space-y-4 shadow-sm`}
          >
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-accent" />
              <span>1. Datos del Atleta</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                  Nombre Completo / Alias *
                </label>
                <input
                  type="text"
                  name="alias"
                  required
                  value={formData.alias}
                  onChange={handleChange}
                  placeholder="Ej: Marcos Silva"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  name="birthDate"
                  required
                  value={formData.birthDate}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                />
                {age !== null && (
                  <span className="text-[11px] font-semibold mt-1 block text-slate-500">
                    Edad: <strong className="text-slate-900 font-bold">{age} años</strong> ·{' '}
                    <strong className={isMinor ? 'text-amber-700' : 'text-emerald-700'}>
                      {isMinor ? 'Menor (< 16)' : 'Adulto (≥ 16)'}
                    </strong>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+34 600 000 000"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="alumno@ejemplo.com"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Tutor Legal si es Menor de 16 */}
          {isMinor && (
            <div
              className={`${
                mobileStep === 1 ? 'block' : 'hidden md:block'
              } p-4 sm:p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-3 sm:space-y-4 animate-in fade-in duration-200 shadow-sm`}
            >
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Tutor Legal Responsable (Menor de 16)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                    Nombre del Tutor *
                  </label>
                  <input
                    type="text"
                    name="guardianName"
                    required={isMinor}
                    value={formData.guardianName}
                    onChange={handleChange}
                    placeholder="Nombre y apellidos del padre/madre"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                    Teléfono del Tutor *
                  </label>
                  <input
                    type="tel"
                    name="guardianPhone"
                    required={isMinor}
                    value={formData.guardianPhone}
                    onChange={handleChange}
                    placeholder="+34 600 000 000"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                    DNI / NIE del Tutor
                  </label>
                  <input
                    type="text"
                    name="guardianDni"
                    value={formData.guardianDni}
                    onChange={handleChange}
                    placeholder="12345678Z"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                    Email del Tutor
                  </label>
                  <input
                    type="email"
                    name="guardianEmail"
                    value={formData.guardianEmail}
                    onChange={handleChange}
                    placeholder="tutor@ejemplo.com"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bloque 3: Cinturón y Tarifa */}
          <div
            className={`${
              mobileStep === 2 ? 'block' : 'hidden md:block'
            } p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 space-y-3 sm:space-y-4 shadow-sm`}
          >
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-accent" />
              <span>2. Graduación y Plan ({isMinor ? 'Sistema Infantil Kids' : 'Sistema Adultos'})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                  Cinturón Inicial {isMinor ? '(Kids BJJ)' : '(Adultos)'}
                </label>
                <select
                  name="belt"
                  value={formData.belt}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                >
                  {beltOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                  Grados (Stripes)
                </label>
                <select
                  name="stripes"
                  value={formData.stripes}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                >
                  <option value={0}>0 grados</option>
                  <option value={1}>1 grado</option>
                  <option value={2}>2 grados</option>
                  <option value={3}>3 grados</option>
                  <option value={4}>4 grados</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1">
                  Tarifa / Modalidad
                </label>
                <select
                  name="pricingTier"
                  value={formData.pricingTier}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                >
                  <option value="STD">Estándar (STD)</option>
                  <option value="SF">Socio Fundador (SF)</option>
                  <option value="FAM">Familiar (FAM)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bloque: Salud y Consentimiento Médico (RGPD Art. 9) */}
          <div
            className={`${
              mobileStep === 3 ? 'block' : 'hidden md:block'
            } p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 space-y-3 sm:space-y-4 shadow-sm`}
          >
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>3. Salud, Lesiones y Consentimiento Médico (RGPD Art. 9)</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="reg-medicalNotes"
                  className="text-[11px] sm:text-xs font-bold uppercase text-slate-600 block mb-1"
                >
                  Lesiones Previas, Patologías o Alergias Relevantes (Opcional)
                </label>
                <textarea
                  id="reg-medicalNotes"
                  name="medicalNotes"
                  value={formData.medicalNotes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Ej: Cirugía de menisco en rodilla derecha (2023), asmático con inhalador..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-accent focus:bg-white transition resize-none"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 p-3 bg-amber-50/60 border border-amber-200/70 rounded-2xl cursor-pointer hover:bg-amber-50/80 transition">
                  <input
                    type="checkbox"
                    id="reg-medicalConsent"
                    name="medicalConsent"
                    checked={formData.medicalConsent}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, medicalConsent: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded text-brand-accent focus:ring-brand-accent border-slate-300"
                  />
                  <div className="text-[11px] sm:text-xs text-slate-700 leading-snug">
                    <span className="font-bold block text-slate-900 mb-0.5">
                      Consentimiento Explícito de Datos de Salud (RGPD Art. 9)
                    </span>
                    El {isMinor ? 'tutor legal' : 'alumno'} autoriza expresamente a 247Studio a tratar sus datos de salud con la única finalidad de velar por su seguridad en el tatami.
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Botones de navegación de paso móvil / Guardar */}
          <div className="flex items-center justify-between md:justify-end gap-2 pt-1 sm:pt-4">
            <div className="flex md:hidden gap-1.5">
              {mobileStep > 1 && (
                <button
                  type="button"
                  onClick={() => setMobileStep((prev) => (prev - 1) as 1 | 2 | 3)}
                  className="py-2.5 px-3.5 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ← Anterior
                </button>
              )}
              {mobileStep < 3 && (
                <button
                  type="button"
                  onClick={() => setMobileStep((prev) => (prev + 1) as 1 | 2 | 3)}
                  className="py-2.5 px-4 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Siguiente →
                </button>
              )}
            </div>

            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => navigate('/admin/personal')}
                className="hidden sm:inline-block py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-2.5 sm:py-3 px-5 sm:px-8 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-brand-accent/25 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Guardando...' : 'Dar de Alta Alumno'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
