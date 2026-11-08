import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { ScheduleDomainModel } from '@/shared/domain/types';
import { DEFAULT_OFFICIAL_SCHEDULES } from '@/shared/domain/schedule';

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const TrialClassPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>(DEFAULT_OFFICIAL_SCHEDULES);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    scheduleId: DEFAULT_OFFICIAL_SCHEDULES[0]?.id || '',
    honeypot: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedScheduleText, setSubmittedScheduleText] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchSchedules = async () => {
      try {
        const q = query(collection(db, 'schedules'), where('active', '==', true));
        const snap = await getDocs(q);
        const list: ScheduleDomainModel[] = [];
        snap.forEach((d) =>
          list.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) })
        );

        if (isMounted) {
          const finalList = list.length > 0 ? list : DEFAULT_OFFICIAL_SCHEDULES;
          setSchedules(finalList);
          setFormData((prev) => ({
            ...prev,
            scheduleId: prev.scheduleId || finalList[0]?.id || '',
          }));
        }
      } catch (err) {
        console.error('Error fetching schedules (usando horario oficial predeterminado):', err);
        if (isMounted) {
          setSchedules(DEFAULT_OFFICIAL_SCHEDULES);
        }
      }
    };

    fetchSchedules();
    return () => {
      isMounted = false;
    };
  }, []);

  // Agrupación estructurada de horarios por día de la semana
  const groupedSchedules = useMemo(() => {
    return [1, 2, 3, 4, 5]
      .map((dayNum) => {
        return {
          dayNum,
          dayName: DAY_NAMES[dayNum] || `Día ${dayNum}`,
          items: schedules
            .filter((s) => s.dayOfWeek === dayNum && s.active !== false)
            .sort((a, b) => a.startTime.localeCompare(b.startTime)),
        };
      })
      .filter((g) => g.items.length > 0);
  }, [schedules]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Protección anti-spam honeypot
    if (formData.honeypot !== '') {
      console.warn('Bot detectado vía honeypot');
      return;
    }

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPhone = formData.phone.trim();

    if (!cleanName || !cleanEmail || !cleanPhone) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    setLoading(true);

    try {
      const selectedSchedule =
        schedules.find((s) => s.id === formData.scheduleId) || schedules[0];
      const scheduleText = selectedSchedule
        ? `${DAY_NAMES[selectedSchedule.dayOfWeek]} · ${selectedSchedule.startTime} a ${selectedSchedule.endTime} — ${selectedSchedule.program}`
        : 'Clase de Prueba';

      // 1. Guardar prospecto en colección 'leads'
      const leadId = `lead_${Date.now()}`;
      await setDoc(doc(db, 'leads', leadId), {
        id: leadId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        scheduleId: selectedSchedule?.id || '',
        programInterest: selectedSchedule?.program || 'Clase de Prueba',
        scheduleDetails: scheduleText,
        status: 'NEW',
        source: 'WEB_TRIAL',
        honeypot: '',
        createdAt: serverTimestamp(),
      });

      setSubmittedEmail(cleanEmail);
      setSubmittedScheduleText(scheduleText);
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Error procesando reserva de prueba:', err);
      setError('No se pudo procesar tu reserva. Por favor inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de confirmación con flujo Madrid Deportes
  if (success) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-4 py-12">
        <div className="max-w-lg w-full bg-white/95 border border-brand-text/15 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          {/* Cabecera */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-500/15 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-headline font-bold uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Plaza Reservada con Éxito
            </div>
            <h2 className="text-2xl sm:text-3xl font-headline uppercase text-brand-text tracking-tight">
              ¡Te Esperamos en el Tatami!
            </h2>
            <p className="text-xs sm:text-sm text-brand-text/80 mt-1">
              Hemos guardado tu plaza de clase de prueba gratuita para el correo:
            </p>
            <p className="font-mono text-xs sm:text-sm font-bold text-brand-text bg-brand-text/5 px-3 py-1.5 rounded-xl inline-block mt-2 border border-brand-text/10">
              {submittedEmail}
            </p>
          </div>

          {/* Pasos para el día de la clase de prueba */}
          <div className="space-y-3 mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <p className="text-[11px] font-headline font-bold uppercase tracking-wider text-slate-500 mb-2">
              Próximos pasos para tu clase:
            </p>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                1
              </div>
              <div className="text-xs leading-relaxed text-slate-700">
                <span className="font-bold text-slate-900 block">Llega 10-15 minutos antes:</span>
                Trae ropa deportiva cómoda (camiseta/lycra y pantalón corto sin bolsillos ni cremalleras), chanclas y botella de agua.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                2
              </div>
              <div className="text-xs leading-relaxed text-slate-700">
                <span className="font-bold text-slate-900 block">Bienvenida en recepción:</span>
                Mario o David te recibirán en la nave para conocer tus objetivos, explicarte las normas del tatami y presentarte al grupo.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                3
              </div>
              <div className="text-xs leading-relaxed text-slate-700">
                <span className="font-bold text-slate-900 block">Alta oficial y carnet virtual:</span>
                Si te gusta la clase y decides unirte a la academia, completaremos tu ficha de socio y activaremos tu carnet virtual con tu acceso web.
              </div>
            </div>
          </div>

          {/* Resumen de la reserva */}
          <div className="p-4 bg-brand-text/5 rounded-2xl border border-brand-text/10 text-left mb-6 space-y-2">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
              <div className="text-xs text-brand-text">
                <span className="font-bold block">Horario Reservado:</span>
                {submittedScheduleText}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
              <div className="text-xs text-brand-text">
                <span className="font-bold block">Ubicación:</span>
                c/ Sisones 2, Nave 30, 28320 Pinto (Madrid)
              </div>
            </div>

            <div className="pt-2 border-t border-brand-text/10 text-[11px] text-brand-text/75 leading-relaxed">
              🥋 <strong>Higiene y seguridad:</strong> Chanclas obligatorias siempre al bajar del tatami, uñas cortas y respeto absoluto a tus compañeros.
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-2.5">
            <Link
              to="/registro"
              className="cta-button w-full text-center flex items-center justify-center gap-2 py-3.5"
            >
              <ArrowRight className="w-4 h-4" />
              <span>¿Quieres darte de alta como socio ahora? → Registro</span>
            </Link>

            <a
              href="https://maps.google.com/?q=calle+sisones+2+nave+30+pinto+madrid"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-brand-text/20 bg-white text-xs font-bold text-brand-text hover:bg-brand-text/5 transition shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-accent" />
              <span>Cómo llegar a la Nave en Pinto (Google Maps)</span>
              <ExternalLink className="w-3 h-3 text-brand-text/40" />
            </a>

            <div className="text-center pt-2">
              <Link to="/" className="text-xs text-brand-text/60 hover:text-brand-text">
                ← Volver a la portada principal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full px-4 py-3 bg-white border border-brand-text/25 rounded-xl text-sm text-brand-text placeholder-brand-text/40 focus:outline-none focus:border-brand-text transition';

  return (
    <div className="min-h-screen bg-brand-background flex flex-col justify-center items-center p-4 py-12">
      <div className="w-full max-w-lg bg-white/95 border border-brand-text/15 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
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
            <label
              htmlFor="trial-schedule-select"
              className="block text-xs font-headline font-bold uppercase tracking-wider text-brand-text mb-1"
            >
              Horario de Preferencia *
            </label>
            <div className="relative">
              <select
                id="trial-schedule-select"
                name="scheduleId"
                required
                value={formData.scheduleId}
                onChange={handleChange}
                className={`${inputCls} appearance-none cursor-pointer pr-10 font-medium`}
              >
                {groupedSchedules.map((group) => (
                  <optgroup key={group.dayNum} label={`🥋 ${group.dayName}`}>
                    {group.items.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.startTime} a {s.endTime} · {s.program} ({s.professor || 'Profesor 247'} — {s.room || 'Tatami'})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-text/50">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-brand-text/60 mt-1">
              Selecciona el día y la franja horaria que mejor se adapte a ti.
            </p>
          </div>

          <div className="p-4 bg-brand-text/5 rounded-2xl border border-brand-text/10 text-xs text-brand-text/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-brand-text">
              <ShieldCheck className="w-4 h-4 text-brand-accent" />
              <span>Reserva presencial de clase de prueba gratuita</span>
            </div>
            <p className="text-[11px] leading-relaxed text-brand-text/75">
              Al confirmar, guardamos tu plaza en el horario seleccionado. Te esperamos directamente en la academia en c/ Sisones 2, Nave 30 (Pinto). Sin compromiso ni pagos por adelantado.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cta-button w-full py-4 text-base mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando Reserva de Plaza...</span>
              </>
            ) : (
              <>
                <span>Confirmar Mi Clase de Prueba Gratuita</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
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
