import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  PenTool,
  Shield,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { calculateExactAge, isLegalMinor } from '@/shared/domain/minor';
import { Belt, BeltSystem, PricingTier } from '@/shared/domain/types';
import { WaiverSignatureModal } from '@/widgets/WaiverSignatureModal';

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

  const [formData, setFormData] = useState({
    alias: searchParams.get('name') || '',
    contactEmail: searchParams.get('email') || '',
    phone: searchParams.get('phone') || '',
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
    guardianUid: searchParams.get('guardianUid') || '',
    medicalNotes: '',
    medicalConsent: true,
    waiverMethod: 'PAPER' as 'PAPER' | 'DIGITAL_APP' | 'DIGITAL_TABLET',
  });

  const [tabletWaiverSvg, setTabletWaiverSvg] = useState<string | null>(null);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successUid, setSuccessUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const isMinor = formData.birthDate ? isLegalMinor(formData.birthDate, now) : false;
  const age = formData.birthDate ? calculateExactAge(formData.birthDate, now) : null;
  const beltSystem: BeltSystem = isMinor ? 'KIDS' : 'ADULT';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTabletWaiverConfirmed = async (svgContent: string) => {
    setTabletWaiverSvg(svgContent);
    setFormData((prev) => ({ ...prev, waiverMethod: 'DIGITAL_TABLET' }));
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

      if (formData.waiverMethod === 'DIGITAL_TABLET' && !tabletWaiverSvg) {
        throw new Error('Has seleccionado firmar en tablet, pero aún no se ha estampado la firma. Pulsa en "Estampar Firma Ahora".');
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

      if (formData.medicalNotes.trim() && formData.medicalConsent) {
        userPayload.medicalNotes = formData.medicalNotes.trim();
        userPayload.medicalConsentAt = serverTimestamp();
        userPayload.medicalConsentVersion = 'v1.0';
      }

      if (formData.waiverMethod === 'PAPER') {
        userPayload.waiverVersion = 'PAPER_PRESENCIAL_V1';
        userPayload.waiverSignedAt = now.toISOString();
        userPayload.waiverSignedByUid = adminUid;
      } else if (formData.waiverMethod === 'DIGITAL_TABLET' && tabletWaiverSvg) {
        userPayload.waiverVersion = 'TABLET_PRESENCIAL_V1';
        userPayload.waiverSignedAt = now.toISOString();
        userPayload.waiverSignatureSvg = tabletWaiverSvg;
        userPayload.waiverSignedByUid = isMinor ? (formData.guardianUid || adminUid) : adminUid;
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
      const leadId = searchParams.get('leadId');
      if (leadId) {
        try {
          const { updateDoc: updateLeadDoc } = await import('firebase/firestore');
          await updateLeadDoc(doc(db, 'leads', leadId), { status: 'CONVERTED' });
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Botón Volver */}
      <Link
        to="/admin/personal"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a BBDD Personal</span>
      </Link>

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-brand-accent" />
            <span>Alta Presencial de Alumno</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Registro de nuevo miembro en recepción (Adultos o Menores con tutor legal según RGPD).
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successUid ? (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">¡Alumno dado de alta con éxito!</h2>
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
                  waiverMethod: 'PAPER',
                });
                setTabletWaiverSvg(null);
              }}
              className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bloque 1: Datos Personales */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-accent" />
              <span>1. Datos del Atleta</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nombre Completo / Alias *
                </label>
                <input
                  type="text"
                  name="alias"
                  required
                  value={formData.alias}
                  onChange={handleChange}
                  placeholder="Ej: Marcos Silva"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  name="birthDate"
                  required
                  value={formData.birthDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                />
                {age !== null && (
                  <span className="text-[11px] font-semibold mt-1 block text-slate-500">
                    Edad calculada: <strong className="text-slate-900 font-bold">{age} años</strong> · Categoría:{' '}
                    <strong className={isMinor ? 'text-amber-700' : 'text-emerald-700'}>
                      {isMinor ? 'Menor formativo (< 16 años)' : 'Adulto (≥ 16 años)'}
                    </strong>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+34 600 000 000"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="alumno@ejemplo.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Tutor Legal si es Menor de 16 */}
          {isMinor && (
            <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-4 animate-in fade-in duration-200 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>2. Tutor Legal Responsable (Obligatorio para menores de 16)</span>
              </h2>
              <p className="text-xs text-amber-800 leading-relaxed">
                Por normativa RGPD y responsabilidad deportiva, los datos del padre, madre o tutor legal son obligatorios para el acceso a tatami.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Nombre del Tutor *
                  </label>
                  <input
                    type="text"
                    name="guardianName"
                    required={isMinor}
                    value={formData.guardianName}
                    onChange={handleChange}
                    placeholder="Nombre y apellidos del padre/madre"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Teléfono del Tutor *
                  </label>
                  <input
                    type="tel"
                    name="guardianPhone"
                    required={isMinor}
                    value={formData.guardianPhone}
                    onChange={handleChange}
                    placeholder="+34 600 000 000"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    DNI / NIE del Tutor
                  </label>
                  <input
                    type="text"
                    name="guardianDni"
                    value={formData.guardianDni}
                    onChange={handleChange}
                    placeholder="12345678Z"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Email del Tutor
                  </label>
                  <input
                    type="email"
                    name="guardianEmail"
                    value={formData.guardianEmail}
                    onChange={handleChange}
                    placeholder="tutor@ejemplo.com"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    ID de Usuario del Tutor en la App (Opcional, si el tutor ya está registrado como alumno)
                  </label>
                  <input
                    type="text"
                    name="guardianUid"
                    value={formData.guardianUid}
                    onChange={handleChange}
                    placeholder="usr_123456789"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bloque 3: Cinturón y Tarifa */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-accent" />
              <span>{isMinor ? '3' : '2'}. Graduación y Plan ({isMinor ? 'Sistema Infantil Kids' : 'Sistema Adultos'})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Cinturón Inicial {isMinor ? '(Kids BJJ)' : '(Adultos)'}
                </label>
                <select
                  name="belt"
                  value={formData.belt}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                >
                  {beltOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Grados (Stripes)
                </label>
                <select
                  name="stripes"
                  value={formData.stripes}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                >
                  <option value={0}>0 grados</option>
                  <option value={1}>1 grado</option>
                  <option value={2}>2 grados</option>
                  <option value={3}>3 grados</option>
                  <option value={4}>4 grados</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Tarifa / Modalidad
                </label>
                <select
                  name="pricingTier"
                  value={formData.pricingTier}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                >
                  <option value="STD">Estándar (STD)</option>
                  <option value="SF">Socio Fundador (SF)</option>
                  <option value="FAM">Familiar (FAM)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bloque 4: Exención de Responsabilidad (Waiver) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-brand-accent" />
              <span>{isMinor ? '4' : '3'}. Exención de Responsabilidad (Waiver Legal)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <label
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  formData.waiverMethod === 'PAPER'
                    ? 'bg-rose-50 border-brand-accent text-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="waiverMethod"
                  value="PAPER"
                  checked={formData.waiverMethod === 'PAPER'}
                  onChange={handleChange}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-bold uppercase block">Firmado en Papel</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Ha firmado físicamente en recepción.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  formData.waiverMethod === 'DIGITAL_TABLET'
                    ? 'bg-rose-50 border-brand-accent text-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="waiverMethod"
                  value="DIGITAL_TABLET"
                  checked={formData.waiverMethod === 'DIGITAL_TABLET'}
                  onChange={handleChange}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-bold uppercase block">Firma en Tablet Ahora</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    El {isMinor ? 'tutor' : 'alumno'} estampa su firma manuscrita in situ.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  formData.waiverMethod === 'DIGITAL_APP'
                    ? 'bg-rose-50 border-brand-accent text-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="waiverMethod"
                  value="DIGITAL_APP"
                  checked={formData.waiverMethod === 'DIGITAL_APP'}
                  onChange={handleChange}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-bold uppercase block">Firma en la PWA</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Firmará desde su móvil al iniciar sesión.
                  </p>
                </div>
              </label>
            </div>

            {/* Accionador de firma táctil si se elige firma en tablet */}
            {formData.waiverMethod === 'DIGITAL_TABLET' && (
              <div className="pt-2">
                {tabletWaiverSvg ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Firma manuscrita capturada correctamente en tablet</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWaiverModal(true)}
                      className="text-xs font-bold text-emerald-700 underline cursor-pointer"
                    >
                      Volver a firmar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowWaiverModal(true)}
                    className="py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Abrir Lienzo para Firmar en Tablet Ahora</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Botón Guardar */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/personal')}
              className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-8 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-brand-accent/25 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando Alumno...' : 'Dar de Alta Alumno'}
            </button>
          </div>
        </form>
      )}

      {/* Modal de Firma para Tablet */}
      <WaiverSignatureModal
        isOpen={showWaiverModal}
        waiverVersion="v2.0"
        onClose={() => setShowWaiverModal(false)}
        onConfirmSignature={handleTabletWaiverConfirmed}
      />
    </div>
  );
};
