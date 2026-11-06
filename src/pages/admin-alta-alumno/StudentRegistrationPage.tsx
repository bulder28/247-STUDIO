import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Shield,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { calculateExactAge, isLegalMinor } from '@/shared/domain/minor';
import { Belt, BeltSystem, PricingTier } from '@/shared/domain/types';

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
    medicalNotes: '',
    medicalConsent: true,
    waiverMethod: 'PAPER', // 'PAPER' | 'DIGITAL_APP'
  });

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
      const isPaperWaiver = formData.waiverMethod === 'PAPER';
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

      if (isPaperWaiver) {
        userPayload.waiverVersion = 'PAPER_PRESENCIAL_V1';
        userPayload.waiverSignedAt = now.toISOString();
        userPayload.waiverSignedByUid = adminUid;
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Botón Volver */}
      <Link
        to="/admin/personal"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a BBDD Personal</span>
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-studio-red text-xs font-black uppercase tracking-wider mb-1">
          <UserPlus className="w-4 h-4" />
          <span>Gestión de Membresías</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">Alta de Nuevo Alumno</h1>
        <p className="text-xs text-slate-500 mt-1">
          Registro presencial de atletas adultos y menores con cálculo automático de categoría y sincronización segura con la tablet de recepción.
        </p>
      </div>

      {/* Mensaje de Éxito */}
      {successUid ? (
        <div className="p-8 rounded-3xl bg-white border border-emerald-500/30 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black uppercase text-slate-900">¡Alumno Registrado con Éxito!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            El perfil de <strong className="text-white">{formData.alias}</strong> ha sido dado de alta como <strong>ACTIVE</strong> y ya está sincronizado con la tablet de recepción para hacer check-in inmediato.
          </p>

          <div className="pt-4 flex justify-center gap-3">
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
                  medicalNotes: '',
                  medicalConsent: true,
                  waiverMethod: 'PAPER',
                });
              }}
              className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs uppercase tracking-wider rounded-xl transition"
            >
              Registrar Otro Alumno
            </button>
            <button
              onClick={() => navigate('/admin/personal')}
              className="py-2.5 px-5 bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/20"
            >
              Ir a BBDD Personal
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-studio-red/15 border border-studio-red/40 rounded-2xl text-xs text-studio-red font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bloque 1: Datos Personales */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-studio-red" />
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-studio-red"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-studio-red"
                />
                {age !== null && (
                  <span className="text-[11px] font-bold mt-1 block text-slate-500">
                    Edad calculada: <strong className="text-white">{age} años</strong> · Categoría:{' '}
                    <strong className={isMinor ? 'text-amber-400' : 'text-emerald-400'}>
                      {isMinor ? 'Menor (< 16 años)' : 'Adulto (≥ 16 años)'}
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-studio-red"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-studio-red"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Tutor Legal si es Menor de 16 */}
          {isMinor && (
            <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-4 animate-in fade-in duration-200">
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>2. Tutor Legal Responsable (Obligatorio para menores)</span>
              </h2>
              <p className="text-xs text-slate-600">
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400"
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400"
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400"
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bloque 3: Cinturón y Tarifa */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-studio-red" />
              <span>{isMinor ? '3' : '2'}. Graduación y Plan</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Cinturón Inicial
                </label>
                <select
                  name="belt"
                  value={formData.belt}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-studio-red"
                >
                  <option value="WHITE">Blanco</option>
                  <option value="BLUE">Azul</option>
                  <option value="PURPLE">Morado</option>
                  <option value="BROWN">Marrón</option>
                  <option value="BLACK">Negro</option>
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-studio-red"
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
                  Modalidad de Cuota (Pricing Tier)
                </label>
                <select
                  name="pricingTier"
                  value={formData.pricingTier}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-studio-red"
                >
                  <option value="STD">Estándar (STD)</option>
                  <option value="SF">Socio Fundador (SF)</option>
                  <option value="FAM">Familiar (FAM)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bloque 4: Exención de Responsabilidad (Waiver) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-studio-red" />
              <span>{isMinor ? '4' : '3'}. Exención de Responsabilidad (Waiver)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  formData.waiverMethod === 'PAPER'
                    ? 'bg-studio-red/15 border-studio-red text-white'
                    : 'bg-slate-50 border-slate-200/80 text-slate-500'
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
                  <span className="text-xs font-black uppercase block">Firmado en Papel en el Gym</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    El alumno ha firmado físicamente el documento en recepción. Quedará validado de inmediato.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  formData.waiverMethod === 'DIGITAL_APP'
                    ? 'bg-studio-red/15 border-studio-red text-white'
                    : 'bg-slate-50 border-slate-200/80 text-slate-500'
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
                  <span className="text-xs font-black uppercase block">Firma Digital en la App</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    El alumno firmará digitalmente con el dedo en su móvil al iniciar sesión en la PWA.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/personal')}
              className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs uppercase tracking-wider rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-8 bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-xl shadow-studio-red/25 disabled:opacity-50"
            >
              {loading ? 'Guardando Alumno...' : 'Dar de Alta Alumno'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
