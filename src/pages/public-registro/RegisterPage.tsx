import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { auth, db } from '@/shared/api/firebase';
import { isLegalMinor } from '@/shared/domain/minor';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    alias: '',
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    birthDate: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minorBlocked, setMinorBlocked] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === 'birthDate') {
      setError(null);
      setMinorBlocked(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!formData.birthDate) {
      setError('Por favor indica tu fecha de nacimiento.');
      return;
    }

    // Validación de edad en Madrid con función de dominio puro
    const now = new Date();
    if (isLegalMinor(formData.birthDate, now)) {
      setMinorBlocked(true);
      return;
    }

    setLoading(true);

    try {
      // 1. Crear usuario en Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = cred.user.uid;

      // 2. Crear documento de perfil en Firestore según reglas estrictas (PENDING, isMinor=false, stripes=0)
      await setDoc(doc(db, 'users', uid), {
        authEmail: formData.email,
        contactEmail: formData.email,
        alias: formData.alias,
        phone: formData.phone,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        birthDate: formData.birthDate,
        isMinor: false,
        beltSystem: 'ADULT',
        belt: 'WHITE',
        stripes: 0,
        beltDate: new Date().toISOString().split('T')[0],
        pricingTier: 'STD',
        activeTariffId: 'tariff_default',
        accountStatus: 'PENDING',
        permissions: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate('/app/home');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error durante el registro. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (minorBlocked) {
    return (
      <div className="min-h-screen bg-studio-navy flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-studio-navy-light/95 border border-studio-red/40 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-studio-red/20 text-studio-red rounded-2xl flex items-center justify-center mx-auto mb-4 border border-studio-red/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black uppercase text-white mb-2 tracking-wide">
            Registro Tutelado Requerido
          </h2>
          <p className="text-xs text-studio-cream/80 leading-relaxed mb-6">
            Por imperativo legal (LOPDGDD) y normas de seguridad deportiva de 247Studio, los atletas menores de 16
            años no pueden auto-registrarse de forma autónoma.
          </p>
          <div className="p-4 bg-studio-navy rounded-2xl border border-white/5 text-left mb-6 space-y-2">
            <p className="text-xs text-studio-cream font-bold">¿Cómo inscribirse?</p>
            <p className="text-xs text-studio-cream/70">
              El alta definitiva la formaliza el administrador presencialmente junto al tutor legal en el gimnasio.
            </p>
          </div>
          <button
            onClick={() => navigate('/reserva-prueba')}
            className="w-full py-3.5 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 flex items-center justify-center gap-2"
          >
            <span>Reservar Clase de Prueba Infantil</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-studio-navy flex flex-col justify-center items-center p-4 py-10">
      <div className="w-full max-w-xl bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="247Studio" className="w-12 h-12 mx-auto mb-2 rounded-2xl shadow-lg" />
          <h1 className="text-xl font-black uppercase tracking-wider text-white">Registro de Alumno</h1>
          <p className="text-xs text-studio-cream/70">Mayores de 16 años (247Studio BJJ)</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-studio-red/15 border border-studio-red/40 rounded-xl text-xs text-studio-red font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Alias en el Tatami *
              </label>
              <input
                type="text"
                name="alias"
                required
                placeholder="Nombre o apodo deportivo"
                value={formData.alias}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Fecha de Nacimiento *
              </label>
              <input
                type="date"
                name="birthDate"
                required
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Teléfono Móvil *
              </label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="+34 600 000 000"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
            </div>
          </div>

          <div className="p-3 bg-studio-navy/60 rounded-xl border border-white/5 space-y-3">
            <span className="text-[11px] font-bold text-studio-cream uppercase tracking-wider block">
              Contacto de Emergencia
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                name="emergencyContactName"
                required
                placeholder="Nombre del contacto"
                value={formData.emergencyContactName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-studio-navy border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
              <input
                type="tel"
                name="emergencyContactPhone"
                required
                placeholder="Teléfono de emergencia"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-studio-navy border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Contraseña *
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                placeholder="Repite la contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 disabled:opacity-50 mt-4"
          >
            {loading ? 'Creando cuenta...' : 'Completar Registro'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-studio-cream/70">
          ¿Ya tienes cuenta activa?{' '}
          <Link to="/login" className="text-studio-red hover:underline font-bold">
            Inicia Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};
