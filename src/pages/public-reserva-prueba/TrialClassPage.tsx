import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, serverTimestamp, setDoc, where, doc } from 'firebase/firestore';
import { CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { ScheduleDomainModel } from '@/shared/domain/types';

export const TrialClassPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    scheduleId: '',
    honeypot: '',
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
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/95 border border-brand-text/15 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-emerald-500/15 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-headline uppercase text-brand-text mb-2 tracking-tight">
            ¡Reserva Confirmada!
          </h2>
          <p className="text-sm text-brand-text/80 leading-relaxed mb-6">
            Te hemos asignado tu plaza para la clase de prueba gratuita. Recuerda venir con ropa deportiva cómoda 10
            minutos antes del inicio.
          </p>
          <div className="p-4 bg-brand-text/5 rounded-2xl border border-brand-text/10 text-left mb-6 space-y-1">
            <p className="text-[11px] text-brand-text/60 uppercase tracking-wider font-headline font-bold">Ubicación</p>
            <p className="text-xs text-brand-text flex items-center gap-1.5 font-semibold">
              <MapPin className="w-4 h-4 text-brand-accent" /> c/ Sisones 2, Nave 30, Pinto (Madrid)
            </p>
          </div>
          <Link
            to="/"
            className="cta-button w-full text-center"
          >
            Volver a la Portada
          </Link>
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full px-4 py-3 bg-white border border-brand-text/25 rounded-xl text-sm text-brand-text placeholder-brand-text/40 focus:outline-none focus:border-brand-text';

  return (
    <div className="min-h-screen bg-brand-background flex flex-col justify-center items-center p-4 py-12">
      <div className="w-full max-w-lg bg-white/90 border border-brand-text/15 rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.webp" alt="247Studio" className="w-10 h-10 object-contain" />
            <span className="font-headline text-2xl uppercase tracking-tighter text-brand-text">
              247STUDIO
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-headline font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> 1ª Clase Gratuita · Sin Permanencia
          </div>

          <h1 className="text-3xl font-headline uppercase tracking-tight text-brand-text">
            Reserva tu Clase de Prueba
          </h1>
          <p className="text-sm text-brand-text/75 mt-1">
            Ven a rodar en el tatami de 247Studio en Pinto.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-brand-accent/15 border border-brand-accent/40 rounded-xl text-xs font-bold text-brand-accent">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-xs font-headline font-bold uppercase tracking-wider text-brand-text mb-1">
              Nombre y Apellidos *
            </label>
            <input
              type="text"
              name="name"
              required
              maxLength={100}
              placeholder="Ej. Mario Rodríguez"
              value={formData.name}
              onChange={handleChange}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-headline font-bold uppercase tracking-wider text-brand-text mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                name="email"
                required
                maxLength={120}
                placeholder="tu@correo.com"
                value={formData.email}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-headline font-bold uppercase tracking-wider text-brand-text mb-1">
                Teléfono Móvil *
              </label>
              <input
                type="tel"
                name="phone"
                required
                maxLength={25}
                placeholder="600 000 000"
                value={formData.phone}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-headline font-bold uppercase tracking-wider text-brand-text mb-1">
              Horario de Preferencia *
            </label>
            <select
              name="scheduleId"
              required
              value={formData.scheduleId}
              onChange={handleChange}
              className={`${inputCls} appearance-none cursor-pointer`}
            >
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {getDayName(s.dayOfWeek)} — {s.startTime} a {s.endTime} ({s.program})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 bg-brand-text/5 rounded-xl border border-brand-text/10 text-xs text-brand-text/80 leading-relaxed">
            ✦ La clase de prueba no compromete a ninguna cuota. Si decides continuar tras probar, te ayudaremos a elegir la tarifa adecuada.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cta-button w-full py-4 text-base mt-2"
          >
            {loading ? 'Confirmando...' : 'Confirmar Reserva de Plaza'}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-brand-text/10 text-center text-xs text-brand-text/70">
          ¿Ya tienes cuenta de alumno?{' '}
          <Link to="/login" className="text-brand-accent hover:underline font-bold">
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
};