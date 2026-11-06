import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, FileCheck2, Shield, User, UserPlus } from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { calculateExactAge, isLegalMinor } from '@/shared/domain/minor';
import { AdultBelt, BeltSystem, PricingTier } from '@/shared/domain/types';

export const MinorRegistrationPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    alias: '',
    contactEmail: '',
    phone: '',
    birthDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    belt: 'WHITE' as AdultBelt,
    stripes: 0,
    pricingTier: 'STD' as PricingTier,
    activeTariffId: 'tariff_monthly_unlimited',
    guardianUid: '',
    guardianName: '',
    waiverMethod: 'PAPER', // 'PAPER' | 'DIGITAL_APP'
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isMinor = formData.birthDate ? isLegalMinor(formData.birthDate, now) : false;
  const age = formData.birthDate ? calculateExactAge(formData.birthDate, now) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isMinor && (!formData.guardianName || !formData.guardianUid)) {
        throw new Error('Para un atleta menor de 16 años es obligatorio registrar el tutor legal.');
      }

      const uid = `usr_${Date.now()}`;
      const isPaperWaiver = formData.waiverMethod === 'PAPER';

      await setDoc(doc(db, 'users', uid), {
        authEmail: formData.contactEmail,
        contactEmail: formData.contactEmail,
        alias: formData.alias,
        phone: formData.phone,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        birthDate: formData.birthDate,
        isMinor,
        guardianUid: isMinor ? formData.guardianUid : null,
        beltSystem: isMinor ? ('KIDS' as BeltSystem) : ('ADULT' as BeltSystem),
        belt: formData.belt,
        stripes: formData.stripes,
        beltDate: new Date().toISOString().split('T')[0],
        pricingTier: formData.pricingTier,
        activeTariffId: formData.activeTariffId,
        accountStatus: 'ACTIVE',
        permissions: [],
        waiverVersion: isPaperWaiver ? 'v2.0' : null,
        waiverSignedAt: isPaperWaiver ? serverTimestamp() : null,
        waiverSignedByUid: isPaperWaiver ? (isMinor ? formData.guardianUid : uid) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => navigate('/admin/personal'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar el alumno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">Alta Presencial de Alumno</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Formalización del registro en el gimnasio tras la reunión inicial de funcionamiento.
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>¡Alumno dado de alta con éxito en estado ACTIVE! Redirigiendo a BBDD Personal...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-studio-red/20 border border-studio-red/40 rounded-2xl text-studio-red text-xs font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200/80 pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-studio-red" /> Identificación del Atleta
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Alias en el Tatami *
              </label>
              <input
                type="text"
                name="alias"
                required
                placeholder="Nombre o apodo deportivo"
                value={formData.alias}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-studio-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                name="birthDate"
                required
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-studio-red"
              />
              {age !== null && (
                <span className="text-[11px] text-slate-500 block mt-1">
                  Edad calculada: <strong>{age} años</strong> ({isMinor ? 'Menor tutelado < 16' : 'Mayor de 16'})
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                name="contactEmail"
                required
                placeholder="correo@ejemplo.com"
                value={formData.contactEmail}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-studio-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Teléfono de Contacto *
              </label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="+34 600 000 000"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-studio-red"
              />
            </div>
          </div>
        </div>

        {/* Sección de Menor de 16 Años */}
        {isMinor && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-amber-500/40 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
              <Shield className="w-4 h-4 text-studio-red" />
              <span>Registro de Tutor Legal (Menor de 16 Años)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre del Tutor / Padre / Madre *
                </label>
                <input
                  type="text"
                  name="guardianName"
                  required={isMinor}
                  placeholder="Nombre completo del tutor"
                  value={formData.guardianName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-studio-red"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  DNI / UID del Tutor *
                </label>
                <input
                  type="text"
                  name="guardianUid"
                  required={isMinor}
                  placeholder="DNI o UID del tutor en 247Studio"
                  value={formData.guardianUid}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-studio-red"
                />
              </div>
            </div>
          </div>
        )}

        {/* Graduación y Tarifa */}
        <div className="space-y-4 pt-3 border-t border-slate-200/80">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Graduación Inicial y Tarifa
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Cinturón
              </label>
              <select
                name="belt"
                value={formData.belt}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-studio-red"
              >
                <option value="WHITE">Blanco (WHITE)</option>
                <option value="BLUE">Azul (BLUE)</option>
                <option value="PURPLE">Morado (PURPLE)</option>
                <option value="BROWN">Marrón (BROWN)</option>
                <option value="BLACK">Negro (BLACK)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Grados (0-4)
              </label>
              <input
                type="number"
                name="stripes"
                min={0}
                max={4}
                value={formData.stripes}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-studio-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Segmento Tarifa
              </label>
              <select
                name="pricingTier"
                value={formData.pricingTier}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-studio-red"
              >
                <option value="STD">Estándar (STD)</option>
                <option value="SF">Socio Fundador (SF)</option>
                <option value="FAM">Familiar (FAM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modalidad de Firma de Waiver (Pregunta 2) */}
        <div className="space-y-3 pt-3 border-t border-slate-200/80">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-studio-red" /> Modalidad de Firma del Waiver Legal
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
              <input
                type="radio"
                name="waiverMethod"
                value="PAPER"
                checked={formData.waiverMethod === 'PAPER'}
                onChange={handleChange}
                className="text-studio-red focus:ring-studio-red"
              />
              <div>
                <span className="font-bold text-xs text-white block">Firmado en Papel en el Centro</span>
                <span className="text-[11px] text-slate-400">Recogido físicamente hoy en recepción</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
              <input
                type="radio"
                name="waiverMethod"
                value="DIGITAL_APP"
                checked={formData.waiverMethod === 'DIGITAL_APP'}
                onChange={handleChange}
                className="text-studio-red focus:ring-studio-red"
              />
              <div>
                <span className="font-bold text-xs text-white block">Firma Digital Pendiente en App</span>
                <span className="text-[11px] text-slate-400">El alumno firmará desde su móvil</span>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-xl shadow-studio-red/30 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <UserPlus className="w-5 h-5" /> Dar de Alta Alumno en 247Studio
            </>
          )}
        </button>
      </form>
    </div>
  );
};

