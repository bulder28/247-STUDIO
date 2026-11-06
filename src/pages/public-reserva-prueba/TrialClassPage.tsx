import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, serverTimestamp, setDoc, where, doc } from 'firebase/firestore';
import { CheckCircle2, Flame, MapPin, Sparkles } from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { ScheduleDomainModel } from '@/shared/domain/types';

export const TrialClassPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    scheduleId: '',
    honeypot: '', // Campo trampa anti-spam
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const q = query(collection(db, 'schedules'), where('active', '==', true));
        const snap = await getDocs(q);
        const list: ScheduleDomainModel[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
        setSchedules(list);
        if (list.length > 0) {
          setFormData((prev) => ({ ...prev, scheduleId: list[0].id }));
        }
      } catch (err) {
        console.error('Error fetching schedules:', err);
      }
    };

    fetchSchedules();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Si el bot rellenó el honeypot, abortar silenciosamente
    if (formData.honeypot !== '') {
      console.warn('Bot detected via honeypot');
      return;
    }

    setLoading(true);

    try {
      const leadId = `lead_${Date.now()}`;
      await setDoc(doc(db, 'leads', leadId), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        scheduleId: formData.scheduleId,
        status: 'NEW',
        honeypot: '',
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      setError('No se pudo procesar la reserva. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[dayOfWeek] || '';
  };

  if (success) {
    return (
      <div className="min-h-screen bg-studio-navy flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-studio-navy-light border border-emerald-500/40 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black uppercase text-white mb-2 tracking-wide">
            ¡Reserva Confirmada!
          </h2>
          <p className="text-xs text-studio-cream/80 leading-relaxed mb-6">
            Te hemos asignado tu plaza para la clase de prueba gratuita. Recuerda venir con ropa deportiva cómoda 10
            minutos antes del inicio.
          </p>
          <div className="p-4 bg-studio-navy rounded-2xl border border-white/5 text-left mb-6 space-y-1">
            <p className="text-[11px] text-studio-cream/60 uppercase tracking-wider font-bold">Ubicación</p>
            <p className="text-xs text-white flex items-center gap-1.5 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-studio-red" /> 247Studio BJJ Academy
            </p>
          </div>
          <Link
            to="/login"
            className="block w-full py-3 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-studio-navy flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-lg bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-red/20 text-studio-red text-xs font-black uppercase tracking-wider mb-2 border border-studio-red/30">
            <Sparkles className="w-3.5 h-3.5" /> 100% Gratuita y sin compromiso
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-white">Reserva tu Clase de Prueba</h1>
          <p className="text-xs text-studio-cream/70 mt-1">Conoce el tatami de 247Studio BJJ</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-studio-red/15 border border-studio-red/40 rounded-xl text-xs text-studio-red font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot anti-spam oculto */}
          <input
            type="text"
            name="honeypot"
            value={formData.honeypot}
            onChange={handleChange}
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
          />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
              Nombre y Apellidos *
            </label>
            <input
              type="text"
              name="name"
              required
              maxLength={100}
              placeholder="Ej. David Garcia"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                required
                maxLength={120}
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
                maxLength={25}
                placeholder="+34 600 000 000"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-1">
              Selecciona tu Horario de Preferencia *
            </label>
            <div className="relative">
              <select
                name="scheduleId"
                required
                value={formData.scheduleId}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-studio-red appearance-none"
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id} className="bg-studio-navy text-white">
                    {getDayName(s.dayOfWeek)} - {s.startTime} a {s.endTime} ({s.program}) - Prof. {s.professor}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-studio-navy/60 rounded-xl border border-white/5 text-[11px] text-studio-cream/80 flex items-start gap-2">
            <Flame className="w-4 h-4 text-studio-red shrink-0 mt-0.5" />
            <span>
              La clase de prueba no genera cobro alguno. Si decides continuar, te ayudaremos a activar tu tarifa en el centro.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 disabled:opacity-50 mt-2"
          >
            {loading ? 'Reservando plaza...' : 'Confirmar Reserva Gratuita'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-studio-cream/60">
          ¿Ya eres alumno registrado?{' '}
          <Link to="/login" className="text-studio-cream hover:text-white underline font-bold">
            Inicia Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};
