import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Shield,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { invalidateLiveDocs } from '@/shared/api/liveReads';
import { calculateExactAge, isLegalMinor } from '@/shared/domain/minor';
import { buildEnrollmentPayload, splitFullName, validateEnrollment } from '@/shared/domain/enrollment';
import { Belt, BeltSystem } from '@/shared/domain/types';
import { compressImageToCanvas } from '@/shared/utils/imageCompressor';

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

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  contactEmail: '',
  phone: '',
  birthDate: '',
  belt: 'WHITE' as Belt,
  stripes: 0,
  isFoundingMember: false,
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianDni: '',
  guardianUid: '',
};

const INPUT_CLASS =
  'w-full min-h-11 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition';
const GUARDIAN_INPUT_CLASS =
  'w-full min-h-11 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400';
const LABEL_CLASS = 'block text-[11px] sm:text-xs font-bold uppercase text-slate-700 mb-1';

export const StudentRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: adminAuthUser } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const locationState = (location.state as Record<string, any>) || {};

  const [formData, setFormData] = useState(() => {
    const prefilled = splitFullName(
      searchParams.get('name') || locationState.name || searchParams.get('alias') || locationState.alias || ''
    );
    return {
      ...EMPTY_FORM,
      firstName: searchParams.get('firstName') || locationState.firstName || prefilled.firstName,
      lastName: searchParams.get('lastName') || locationState.lastName || prefilled.lastName,
      contactEmail: searchParams.get('email') || locationState.email || '',
      phone: searchParams.get('phone') || locationState.phone || '',
      guardianUid: searchParams.get('guardianUid') || locationState.guardianUid || '',
    };
  });

  const [loading, setLoading] = useState(false);
  const [successUid, setSuccessUid] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSource, setPhotoSource] = useState<File | null>(null);

  const now = new Date();
  const isMinor = formData.birthDate ? isLegalMinor(formData.birthDate, now) : false;
  const age = formData.birthDate ? calculateExactAge(formData.birthDate, now) : null;
  const beltSystem: BeltSystem = isMinor ? 'KIDS' : 'ADULT';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoSource(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoSource(null);
    setPhotoPreview(null);
  };

  /**
   * Photo is recommended but never blocks the enrollment. Following the project convention
   * (PhotoUploaderModal / firestore.rules isValidPhotoUrl) the compressed JPEG (<50 KB) is stored
   * as a data URL in `photoUrl`; no Firebase Storage bucket is configured in this project.
   */
  const savePhoto = async (uid: string) => {
    if (!photoSource) return;
    try {
      const compressed = await compressImageToCanvas(photoSource);
      await updateDoc(doc(db, 'users', uid), { photoUrl: compressed, updatedAt: serverTimestamp() });
      await setDoc(doc(db, 'kiosk_members', uid), { photoUrl: compressed, updatedAt: serverTimestamp() }, { merge: true });
    } catch (photoErr) {
      console.warn('No se pudo guardar la foto del alumno:', photoErr);
      setPhotoWarning('El alumno se ha dado de alta, pero no se pudo guardar la foto. Puedes añadirla después desde el censo.');
    }
  };

  const markLeadConverted = async () => {
    const effectiveLeadId = searchParams.get('leadId') || locationState.leadId;
    if (!effectiveLeadId) return;
    try {
      await updateDoc(doc(db, 'leads', effectiveLeadId), { status: 'CONVERTED' });
    } catch (leadErr) {
      console.warn('No se pudo actualizar el estado del lead:', leadErr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhotoWarning(null);
    setLoading(true);

    try {
      const validationError = validateEnrollment(formData, isMinor);
      if (validationError) throw new Error(validationError);
      const payload = buildEnrollmentPayload(formData, isMinor);

      // 1. Official enrollment in Firebase Auth + Firestore through the Netlify function
      const token = await adminAuthUser?.getIdToken().catch(() => null);
      if (token) {
        try {
          const res = await fetch('/.netlify/functions/admin-create-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...payload,
              email: payload.contactEmail,
              targetRole: 'student',
            }),
          });
          invalidateLiveDocs(['users', 'kiosk_members']);

          if (res.ok) {
            const data = await res.json();
            setCreatedLink(data.resetLink || null);
            await savePhoto(data.uid);
            await markLeadConverted();
            setSuccessUid(data.uid);
            return;
          }
        } catch (fnErr) {
          console.warn('Aviso: endpoint serverless no disponible, procediendo vía Firestore cliente:', fnErr);
        }
      }

      // Direct Firestore fallback (local / offline mode)
      let uid = searchParams.get('uid') || locationState.uid || '';
      if (!uid && payload.contactEmail) {
        try {
          const qEmail = query(collection(db, 'users'), where('authEmail', '==', payload.contactEmail));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            uid = snapEmail.docs[0].id;
          }
        } catch (searchErr) {
          console.warn('Aviso buscando UID de usuario previo por email:', searchErr);
        }
      }
      if (!uid) {
        uid = `usr_${Date.now()}`;
      }
      const adminUid = adminAuthUser?.uid || 'admin_presencial';

      // pricingTier is a required field of the user model; no tariff is assigned at enrollment
      // (activeTariffId is intentionally not written: the tariff is chosen when the first payment is registered).
      const userPayload: Record<string, any> = {
        uid,
        authEmail: payload.contactEmail || `alumno_${uid}@247studiobjj.com`,
        contactEmail: payload.contactEmail,
        firstName: payload.firstName,
        lastName: payload.lastName,
        alias: payload.alias,
        phone: payload.phone,
        emergencyContactName: isMinor ? payload.guardianName || null : null,
        emergencyContactPhone: isMinor ? payload.guardianPhone || null : null,
        birthDate: payload.birthDate,
        isMinor,
        guardianName: payload.guardianName || null,
        guardianPhone: payload.guardianPhone || null,
        guardianDni: payload.guardianDni || null,
        guardianEmail: payload.guardianEmail || null,
        guardianUid: payload.guardianUid || null,
        isFoundingMember: payload.isFoundingMember,
        beltSystem,
        belt: payload.belt,
        stripes: payload.stripes,
        beltDate: now.toISOString().slice(0, 10),
        pricingTier: 'STD',
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

      const cleanUserPayload = Object.fromEntries(
        Object.entries(userPayload).filter(([_, v]) => v !== undefined)
      );

      await setDoc(doc(db, 'users', uid), cleanUserPayload);

      // Public, safe projection for the Kiosk (no medical notes or private phones)
      await setDoc(doc(db, 'kiosk_members', uid), {
        uid,
        alias: payload.alias,
        belt: payload.belt,
        stripes: payload.stripes,
        beltSystem,
        accountStatus: 'ACTIVE',
        photoUrl: '',
        updatedAt: serverTimestamp(),
      });

      await savePhoto(uid);
      await markLeadConverted();
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
            Registro de nuevo miembro en recepción (adultos o menores de 14 con tutor legal).
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
        <div role="alert" className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {photoWarning && (
        <div role="alert" className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{photoWarning}</span>
        </div>
      )}

      {successUid ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">¡Alumno dado de alta con éxito!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Se ha creado la ficha y se ha sincronizado con el Kiosco de recepción para que pueda hacer check-in con su nombre o pase QR. La tarifa se asigna al registrar su primer cobro en Caja.
          </p>

          {createdLink && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl max-w-lg mx-auto text-left space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                🔑 Enlace oficial de activación y contraseña:
              </span>
              <p className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-200 break-all select-all">
                {createdLink}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  className="py-1.5 px-3 bg-brand-accent text-white font-bold text-xs rounded-lg hover:opacity-90 transition cursor-pointer"
                >
                  {copiedLink ? '✓ Copiado' : 'Copiar Enlace'}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Te damos la bienvenida a 247Studio. Aquí tienes tu enlace oficial para configurar tu contraseña y acceder a tu carnet de alumno: ${createdLink}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-3 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition"
                >
                  Enviar por WhatsApp
                </a>
              </div>
            </div>
          )}
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setSuccessUid(null);
                setFormData(EMPTY_FORM);
                clearPhoto();
                setPhotoWarning(null);
                setCreatedLink(null);
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
          <div className="md:hidden grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
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
              <span>2. Graduación</span>
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
              <span>1. Datos personales</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="enroll-firstName" className={LABEL_CLASS}>
                  Nombre *
                </label>
                <input
                  id="enroll-firstName"
                  type="text"
                  name="firstName"
                  required
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ej: Marcos"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="enroll-lastName" className={LABEL_CLASS}>
                  Apellidos *
                </label>
                <input
                  id="enroll-lastName"
                  type="text"
                  name="lastName"
                  required
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Ej: Silva Pérez"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="enroll-phone" className={LABEL_CLASS}>
                  Teléfono móvil *
                </label>
                <input
                  id="enroll-phone"
                  type="tel"
                  name="phone"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+34 600 000 000"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="enroll-birthDate" className={LABEL_CLASS}>
                  Fecha de nacimiento *
                </label>
                <input
                  id="enroll-birthDate"
                  type="date"
                  name="birthDate"
                  required
                  value={formData.birthDate}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                />
                {age !== null && (
                  <span className="text-[11px] font-semibold mt-1 block text-slate-500" aria-live="polite">
                    Edad: <strong className="text-slate-900 font-bold">{age} años</strong> ·{' '}
                    <strong className={isMinor ? 'text-amber-700' : 'text-emerald-700'}>
                      {isMinor ? 'Menor (< 14)' : 'Adulto (≥ 14)'}
                    </strong>
                  </span>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="enroll-email" className={LABEL_CLASS}>
                  Correo electrónico (opcional)
                </label>
                <input
                  id="enroll-email"
                  type="email"
                  name="contactEmail"
                  autoComplete="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="alumno@ejemplo.com"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Foto */}
          <div
            className={`${
              mobileStep === 1 ? 'block' : 'hidden md:block'
            } p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 space-y-3 shadow-sm`}
          >
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-accent" />
              <span>Foto del alumno</span>
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                {photoPreview ? (
                  <img src={photoPreview} alt="Vista previa de la foto del alumno" className="w-full h-full object-cover object-top" />
                ) : (
                  <Camera className="w-6 h-6" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Recomendada para el check-in en el Kiosco. Si falla, el alta se completa igualmente.
                </p>
                <div className="flex flex-wrap gap-2">
                  <label
                    htmlFor="enroll-photo"
                    className="inline-flex items-center justify-center min-h-11 px-4 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer hover:opacity-90 transition focus-within:ring-2 focus-within:ring-brand-accent"
                  >
                    {photoPreview ? 'Cambiar foto' : 'Hacer o elegir foto'}
                  </label>
                  <input
                    id="enroll-photo"
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="min-h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 3: Tutor legal (menores de 14) */}
          {isMinor && (
            <div
              className={`${
                mobileStep === 1 ? 'block' : 'hidden md:block'
              } p-4 sm:p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-3 sm:space-y-4 animate-in fade-in duration-200 shadow-sm`}
            >
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Tutor legal (menor de 14 años)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="enroll-guardianName" className={LABEL_CLASS}>
                    Nombre del tutor *
                  </label>
                  <input
                    id="enroll-guardianName"
                    type="text"
                    name="guardianName"
                    required
                    value={formData.guardianName}
                    onChange={handleChange}
                    placeholder="Nombre y apellidos del padre/madre"
                    className={GUARDIAN_INPUT_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="enroll-guardianPhone" className={LABEL_CLASS}>
                    Teléfono del tutor *
                  </label>
                  <input
                    id="enroll-guardianPhone"
                    type="tel"
                    name="guardianPhone"
                    required
                    inputMode="tel"
                    value={formData.guardianPhone}
                    onChange={handleChange}
                    placeholder="+34 600 000 000"
                    className={GUARDIAN_INPUT_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="enroll-guardianDni" className={LABEL_CLASS}>
                    DNI / NIE del tutor (opcional)
                  </label>
                  <input
                    id="enroll-guardianDni"
                    type="text"
                    name="guardianDni"
                    value={formData.guardianDni}
                    onChange={handleChange}
                    placeholder="12345678Z"
                    className={GUARDIAN_INPUT_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="enroll-guardianEmail" className={LABEL_CLASS}>
                    Email del tutor (opcional)
                  </label>
                  <input
                    id="enroll-guardianEmail"
                    type="email"
                    name="guardianEmail"
                    value={formData.guardianEmail}
                    onChange={handleChange}
                    placeholder="tutor@ejemplo.com"
                    className={GUARDIAN_INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bloque 4: Graduación y socio fundador */}
          <div
            className={`${
              mobileStep === 2 ? 'block' : 'hidden md:block'
            } p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 space-y-3 sm:space-y-4 shadow-sm`}
          >
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-accent" />
              <span>2. Graduación ({isMinor ? 'Sistema infantil Kids' : 'Sistema adultos'})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="enroll-belt" className={LABEL_CLASS}>
                  Cinturón inicial {isMinor ? '(Kids BJJ)' : '(Adultos)'}
                </label>
                <select id="enroll-belt" name="belt" value={formData.belt} onChange={handleChange} className={INPUT_CLASS}>
                  {beltOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="enroll-stripes" className={LABEL_CLASS}>
                  Grados (stripes)
                </label>
                <select id="enroll-stripes" name="stripes" value={formData.stripes} onChange={handleChange} className={INPUT_CLASS}>
                  <option value={0}>0 grados</option>
                  <option value={1}>1 grado</option>
                  <option value={2}>2 grados</option>
                  <option value={3}>3 grados</option>
                  <option value={4}>4 grados</option>
                </select>
              </div>
            </div>

            <label
              htmlFor="enroll-founding"
              className="flex items-start gap-3 min-h-11 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
            >
              <input
                id="enroll-founding"
                type="checkbox"
                checked={formData.isFoundingMember}
                onChange={(e) => setFormData((prev) => ({ ...prev, isFoundingMember: e.target.checked }))}
                className="mt-0.5 w-5 h-5 accent-brand-accent shrink-0"
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">Socio fundador</span>
                <span className="block text-xs text-slate-600">10 % de descuento en todos los cobros</span>
              </span>
            </label>
          </div>

          {/* Botones de navegación de paso móvil / Guardar */}
          <div className="flex items-center justify-between md:justify-end gap-2 pt-1 sm:pt-4">
            <div className="flex md:hidden gap-1.5">
              {mobileStep > 1 && (
                <button
                  type="button"
                  onClick={() => setMobileStep(1)}
                  className="py-2.5 px-3.5 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ← Anterior
                </button>
              )}
              {mobileStep < 2 && (
                <button
                  type="button"
                  onClick={() => setMobileStep(2)}
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
