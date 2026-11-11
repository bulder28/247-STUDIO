import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  MessageCircle,
  Trash2,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { invalidateLiveDocs } from '@/shared/api/liveReads';
import { calculateExactAge, isLegalMinor } from '@/shared/domain/minor';
import {
  buildEnrollmentPayload,
  ENROLLMENT_FIELD_ORDER,
  EnrollmentField,
  splitFullName,
  validateEnrollmentFields,
} from '@/shared/domain/enrollment';
import { Belt, BeltSystem } from '@/shared/domain/types';
import { compressImageToCanvas } from '@/shared/utils/imageCompressor';
import { fieldCls, labelCls } from '@/shared/ui/field-styles';
import { PageHeader } from '@/shared/ui/page-header';
import { SectionCard } from '@/shared/ui/section-card';

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSource, setPhotoSource] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<EnrollmentField, string>>>({});

  const fieldA11y = (field: EnrollmentField) => ({
    'aria-invalid': fieldErrors[field] ? (true as const) : undefined,
    'aria-describedby': fieldErrors[field] ? `enroll-${field}-error` : undefined,
  });
  const renderFieldError = (field: EnrollmentField) =>
    fieldErrors[field] ? (
      <p id={`enroll-${field}-error`} role="alert" className="mt-1.5 text-sm font-semibold text-rose-800">
        {fieldErrors[field]}
      </p>
    ) : null;

  const now = new Date();
  const isMinor = formData.birthDate ? isLegalMinor(formData.birthDate, now) : false;
  const age = formData.birthDate ? calculateExactAge(formData.birthDate, now) : null;
  const beltSystem: BeltSystem = isMinor ? 'KIDS' : 'ADULT';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name as EnrollmentField]) return prev;
      const next = { ...prev };
      delete next[name as EnrollmentField];
      return next;
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhotoWarning(null);

    const errors = validateEnrollmentFields(formData, isMinor);
    setFieldErrors(errors);
    const firstInvalid = ENROLLMENT_FIELD_ORDER.find((f) => errors[f]);
    if (firstInvalid) {
      setTimeout(() => document.getElementById(`enroll-${firstInvalid}`)?.focus(), 0);
      return;
    }

    setLoading(true);

    try {
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
      setSuccessUid(uid);
    } catch (err: any) {
      console.error('Error registrando alumno:', err);
      setError(err?.message || 'Error al dar de alta al alumno.');
    } finally {
      setLoading(false);
    }
  };


  const beltOptions = isMinor ? KIDS_BELTS : ADULT_BELTS;
  const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  const resetForm = () => {
    setSuccessUid(null);
    setFormData(EMPTY_FORM);
    clearPhoto();
    setPhotoWarning(null);
    setCreatedLink(null);
    setFieldErrors({});
    setError(null);
  };

  // Section numbers follow what is actually shown (the guardian block only exists for minors).
  const sectionNo = {
    photo: 2,
    guardian: 3,
    belt: isMinor ? 4 : 3,
    founding: isMinor ? 5 : 4,
  };

  const ageBadge =
    age !== null ? (
      <span
        aria-live="polite"
        className={`inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-bold ${
          isMinor
            ? 'border-amber-300 bg-amber-50 text-amber-900'
            : 'border-emerald-300 bg-emerald-50 text-emerald-900'
        }`}
      >
        <span className="tabular-nums">{age} años</span>
        <span aria-hidden="true">·</span>
        {isMinor ? 'Menor < 14' : 'Adulto'}
      </span>
    ) : null;

  const secondaryBtn =
    'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-studio-navy/15 bg-white px-5 text-base font-semibold text-studio-navy transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy';
  const primaryBtn =
    'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-studio-red px-6 text-base font-bold text-white shadow-sm transition-colors hover:bg-studio-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-navy focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

  const sectionTitle = (no: number, label: string) => (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-studio-navy text-sm font-bold tabular-nums text-white"
      >
        {no}
      </span>
      {label}
    </span>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <PageHeader
        title="Alta de alumno"
        description="Registro presencial en recepción: adultos y menores de 14 con tutor legal."
        actions={
          <Link to="/admin/personal" className={secondaryBtn}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Volver al censo
          </Link>
        }
      />

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {photoWarning && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {photoWarning}
        </p>
      )}

      {successUid ? (
        <SectionCard>
          <div className="mx-auto max-w-xl space-y-6 py-4 text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-studio-navy text-3xl font-bold text-white">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="h-full w-full object-cover object-top" />
              ) : (
                <span aria-hidden="true">{initials || <UserRound className="h-12 w-12" />}</span>
              )}
            </div>
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Alta completada
              </p>
              <h2 className="font-headline text-4xl uppercase leading-none tracking-tight text-studio-navy">
                {fullName || 'Alumno nuevo'}
              </h2>
              <p className="mx-auto max-w-md text-sm text-slate-600">
                La ficha ya está en el Kiosco de recepción para hacer check-in con su nombre o pase QR. La tarifa se
                asigna al registrar su primer cobro.
              </p>
            </div>

            {createdLink && (
              <div className="space-y-3 rounded-xl border border-studio-navy/10 bg-brand-sand-light p-4 text-left">
                <p className="flex items-center gap-2 text-sm font-bold text-studio-navy">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                  Enlace de activación y contraseña
                </p>
                <p className="select-all break-all rounded-lg border border-studio-navy/10 bg-white p-2.5 font-mono text-xs text-slate-700">
                  {createdLink}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 3000);
                    }}
                    className={`${secondaryBtn} min-h-11 px-4 text-sm`}
                  >
                    {copiedLink ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    {copiedLink ? 'Copiado' : 'Copiar enlace'}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Te damos la bienvenida a 247Studio. Aquí tienes tu enlace oficial para configurar tu contraseña y acceder a tu carnet de alumno: ${createdLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${secondaryBtn} min-h-11 px-4 text-sm`}
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Enviar por WhatsApp
                  </a>
                </div>
              </div>
            )}

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={`/admin/caja?cobrar=${encodeURIComponent(successUid)}`} className={primaryBtn}>
                <Banknote className="h-5 w-5" aria-hidden="true" />
                Cobrar primer mes
              </Link>
              <button type="button" onClick={resetForm} className={secondaryBtn}>
                <UserPlus className="h-5 w-5" aria-hidden="true" />
                Dar de alta a otro
              </button>
            </div>
            <Link
              to="/admin/personal"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-studio-navy underline underline-offset-4"
            >
              Ir al censo de alumnos
            </Link>
          </div>
        </SectionCard>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
            <div className="space-y-5">
              {/* 1. Personal data */}
              <SectionCard title={sectionTitle(1, 'Datos personales')} actions={ageBadge}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="enroll-firstName" className={labelCls}>
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
                      placeholder="Ej. Marcos"
                      className={fieldCls}
                      {...fieldA11y('firstName')}
                    />
                    {renderFieldError('firstName')}
                  </div>

                  <div>
                    <label htmlFor="enroll-lastName" className={labelCls}>
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
                      placeholder="Ej. Silva Pérez"
                      className={fieldCls}
                      {...fieldA11y('lastName')}
                    />
                    {renderFieldError('lastName')}
                  </div>

                  <div>
                    <label htmlFor="enroll-phone" className={labelCls}>
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
                      className={fieldCls}
                      {...fieldA11y('phone')}
                    />
                    {renderFieldError('phone')}
                  </div>

                  <div>
                    <label htmlFor="enroll-birthDate" className={labelCls}>
                      Fecha de nacimiento *
                    </label>
                    <input
                      id="enroll-birthDate"
                      type="date"
                      name="birthDate"
                      required
                      value={formData.birthDate}
                      onChange={handleChange}
                      className={`${fieldCls} tabular-nums`}
                      {...fieldA11y('birthDate')}
                    />
                    {renderFieldError('birthDate')}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="enroll-email" className={labelCls}>
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
                      className={fieldCls}
                      {...fieldA11y('contactEmail')}
                    />
                    {renderFieldError('contactEmail')}
                  </div>
                </div>
              </SectionCard>

              {/* 3. Legal guardian (under 14) */}
              {isMinor && (
                <SectionCard
                  title={sectionTitle(sectionNo.guardian, 'Tutor legal')}
                  description="Obligatorio: el alumno es menor de 14 años."
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="enroll-guardianName" className={labelCls}>
                        Nombre del tutor *
                      </label>
                      <input
                        id="enroll-guardianName"
                        type="text"
                        name="guardianName"
                        required
                        value={formData.guardianName}
                        onChange={handleChange}
                        placeholder="Nombre y apellidos"
                        className={fieldCls}
                        {...fieldA11y('guardianName')}
                      />
                      {renderFieldError('guardianName')}
                    </div>

                    <div>
                      <label htmlFor="enroll-guardianPhone" className={labelCls}>
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
                        className={fieldCls}
                        {...fieldA11y('guardianPhone')}
                      />
                      {renderFieldError('guardianPhone')}
                    </div>

                    <div>
                      <label htmlFor="enroll-guardianDni" className={labelCls}>
                        DNI / NIE del tutor (opcional)
                      </label>
                      <input
                        id="enroll-guardianDni"
                        type="text"
                        name="guardianDni"
                        value={formData.guardianDni}
                        onChange={handleChange}
                        placeholder="12345678Z"
                        className={fieldCls}
                      />
                    </div>

                    <div>
                      <label htmlFor="enroll-guardianEmail" className={labelCls}>
                        Email del tutor (opcional)
                      </label>
                      <input
                        id="enroll-guardianEmail"
                        type="email"
                        name="guardianEmail"
                        value={formData.guardianEmail}
                        onChange={handleChange}
                        placeholder="tutor@ejemplo.com"
                        className={fieldCls}
                      />
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* Belt */}
              <SectionCard
                title={sectionTitle(sectionNo.belt, 'Graduación')}
                description={isMinor ? 'Sistema infantil (Kids BJJ)' : 'Sistema de adultos'}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="enroll-belt" className={labelCls}>
                      Cinturón inicial
                    </label>
                    <select id="enroll-belt" name="belt" value={formData.belt} onChange={handleChange} className={fieldCls}>
                      {beltOptions.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="enroll-stripes" className={labelCls}>
                      Grados (stripes)
                    </label>
                    <select
                      id="enroll-stripes"
                      name="stripes"
                      value={formData.stripes}
                      onChange={handleChange}
                      className={fieldCls}
                    >
                      <option value={0}>0 grados</option>
                      <option value={1}>1 grado</option>
                      <option value={2}>2 grados</option>
                      <option value={3}>3 grados</option>
                      <option value={4}>4 grados</option>
                    </select>
                  </div>
                </div>
              </SectionCard>

              {/* Founding member */}
              <SectionCard title={sectionTitle(sectionNo.founding, 'Socio fundador')}>
                <label
                  htmlFor="enroll-founding"
                  className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border border-studio-navy/15 bg-white p-3.5 transition-colors hover:bg-brand-sand-light/60 has-[:checked]:border-studio-navy has-[:checked]:bg-brand-sand-light"
                >
                  <input
                    id="enroll-founding"
                    type="checkbox"
                    checked={formData.isFoundingMember}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isFoundingMember: e.target.checked }))}
                    className="h-6 w-6 shrink-0 cursor-pointer accent-studio-red"
                  />
                  <span>
                    <span className="block text-base font-bold text-studio-navy">Es socio fundador</span>
                    <span className="block text-sm text-slate-600">10 % de descuento en todos los cobros</span>
                  </span>
                </label>
              </SectionCard>
            </div>

            {/* 2. Photo */}
            <SectionCard title={sectionTitle(sectionNo.photo, 'Foto')} className="lg:sticky lg:top-4">
              <div className="space-y-4">
                <div className="mx-auto flex aspect-square w-full max-w-64 items-center justify-center overflow-hidden rounded-2xl bg-studio-navy/5 text-slate-500">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Vista previa de la foto del alumno"
                      className="h-full w-full object-cover object-top"
                    />
                  ) : initials ? (
                    <span
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center bg-studio-navy font-headline text-7xl text-white"
                    >
                      {initials}
                    </span>
                  ) : (
                    <UserRound className="h-24 w-24" aria-hidden="true" />
                  )}
                </div>
                <p className="text-center text-sm text-slate-600">
                  Recomendada para el check-in en el Kiosco. Si falla, el alta se completa igualmente.
                </p>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="enroll-photo"
                    className={`${photoPreview ? secondaryBtn : primaryBtn} focus-within:ring-2 focus-within:ring-studio-navy`}
                  >
                    <Camera className="h-5 w-5" aria-hidden="true" />
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
                    <button type="button" onClick={clearPhoto} className={secondaryBtn}>
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                      Quitar foto
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Action bar, sticky at the bottom of the viewport on tablet */}
          <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t border-studio-navy/10 bg-brand-sand-light px-4 py-3 sm:-mx-6 sm:px-6">
            <button type="button" onClick={() => navigate('/admin/personal')} className={secondaryBtn}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={`${primaryBtn} min-w-48`}>
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              {loading ? 'Guardando...' : 'Dar de alta'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
