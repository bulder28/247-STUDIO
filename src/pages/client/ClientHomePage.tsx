import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Calendar, Target, User, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentSummary {
  month_year: string;
  plan_name: string;
  price_eur: number;
  effective_status:
    | 'OK'
    | 'ADVANCE_OK'
    | 'FUTURE_UPCOMING'
    | 'PAST_DUE'
    | 'NOK_OVERDUE'
    | 'GRACE_7_DAYS'
    | 'PENDING';
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function formatLongMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

interface FighterStats {
  tecnica: number;
  fuerza: number;
  elasticidad: number;
  guardia: number;
  pase: number;
  derribos: number;
  leglocks: number;
  finalizacion: number;
}

interface GymEvent {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  location: string | null;
}

export function ClientHomePage() {
  const { user, profile, refreshProfile } = useAuth();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [paymentRows, setPaymentRows] = useState<PaymentSummary[]>([]);
  const [stats, setStats] = useState<FighterStats | null>(null);
  const [events, setEvents] = useState<GymEvent[]>([]);
  const [goals, setGoals] = useState(profile?.personal_goals ?? '');
  const [savingGoals, setSavingGoals] = useState(false);

  useEffect(() => {
    setGoals(profile?.personal_goals ?? '');
  }, [profile?.personal_goals]);

  useEffect(() => {
    if (!user) return;
    const loadHome = async () => {
      const [payRes, statsRes, evRes] = await Promise.all([
        supabase
          .from('v_monthly_payment_status')
          .select('month_year, plan_name, price_eur, effective_status')
          .eq('user_id', user.id)
          .order('month_year', { ascending: true }),
        supabase.from('fighter_stats').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('events')
          .select('id, title, event_type, event_date, location')
          .eq('is_active', true)
          .gte('event_date', new Date().toISOString())
          .order('event_date')
          .limit(4),
      ]);

      setPaymentRows((payRes.data as PaymentSummary[]) ?? []);
      setStats((statsRes.data as FighterStats) ?? null);
      setEvents((evRes.data as GymEvent[]) ?? []);
    };
    loadHome();
  }, [user, currentMonth]);

  const payment = paymentRows.find((r) => r.month_year === currentMonth) ?? null;
  const pastDueRows = paymentRows.filter(
    (r) =>
      r.month_year < currentMonth &&
      r.effective_status !== 'OK' &&
      r.effective_status !== 'ADVANCE_OK'
  );
  const advancePaidRows = paymentRows.filter(
    (r) => r.month_year > currentMonth && r.effective_status === 'ADVANCE_OK'
  );
  const coveredUntilMonth =
    advancePaidRows.length > 0 ? advancePaidRows[advancePaidRows.length - 1].month_year : null;

  const calcAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const handleSaveGoals = async () => {
    if (!user) return;
    setSavingGoals(true);
    await supabase.from('profiles').update({ personal_goals: goals }).eq('id', user.id);
    await refreshProfile();
    setSavingGoals(false);
  };

  const statItems: { key: keyof FighterStats; label: string }[] = [
    { key: 'tecnica', label: 'Técnica' },
    { key: 'fuerza', label: 'Fuerza' },
    { key: 'elasticidad', label: 'Elasticidad' },
    { key: 'guardia', label: 'Guardia' },
    { key: 'pase', label: 'Pase' },
    { key: 'derribos', label: 'Derribos' },
    { key: 'leglocks', label: 'Leglocks' },
    { key: 'finalizacion', label: 'Finalización' },
  ];

  const age = calcAge(profile?.birth_date ?? null);

  return (
    <div className="space-y-6">
      {/* Aviso de facturas pendientes anteriores si existieran */}
      {pastDueRows.length > 0 && (
        <div className="rounded-2xl border border-studio-red bg-studio-red/20 text-red-100 p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-studio-red shrink-0" />
          <div>
            <p className="font-headline text-base uppercase tracking-wide">
              {pastDueRows.length === 1
                ? 'Tienes 1 factura pendiente anterior'
                : `Tienes ${pastDueRows.length} facturas pendientes anteriores`}
            </p>
            <p className="text-xs opacity-85">
              Meses pendientes: {pastDueRows.map((r) => formatLongMonth(r.month_year)).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Indicador visual de Pago OK / Factura pendiente / Pago adelantado */}
      {(payment || coveredUntilMonth) && (
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
            payment?.effective_status === 'OK' ||
            payment?.effective_status === 'ADVANCE_OK' ||
            (!payment && coveredUntilMonth)
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : payment?.effective_status === 'NOK_OVERDUE' ||
                  payment?.effective_status === 'PAST_DUE'
                ? 'bg-studio-red/20 border-studio-red text-red-100'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {payment?.effective_status === 'OK' ||
            payment?.effective_status === 'ADVANCE_OK' ||
            (!payment && coveredUntilMonth) ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : payment?.effective_status === 'NOK_OVERDUE' ||
              payment?.effective_status === 'PAST_DUE' ? (
              <AlertTriangle className="w-6 h-6 text-studio-red shrink-0" />
            ) : (
              <Clock className="w-6 h-6 text-amber-400 shrink-0" />
            )}
            <div>
              <p className="font-headline text-base uppercase tracking-wide">
                {payment?.effective_status === 'OK' ||
                payment?.effective_status === 'ADVANCE_OK' ||
                (!payment && coveredUntilMonth)
                  ? coveredUntilMonth
                    ? `Pago mensual OK · Cubierto hasta ${formatLongMonth(coveredUntilMonth)}`
                    : 'Pago mensual OK'
                  : payment?.effective_status === 'NOK_OVERDUE'
                    ? 'Factura pendiente (+7 días)'
                    : payment?.effective_status === 'GRACE_7_DAYS'
                      ? 'Cuota en plazo (7 días)'
                      : 'Factura pendiente'}
              </p>
              {payment && (
                <p className="text-xs opacity-85">
                  Plan: {payment.plan_name} ({Number(payment.price_eur).toFixed(0)} €/mes)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta resumen del atleta */}
      <section className="relative overflow-hidden rounded-2xl bg-studio-navy border border-white/10 p-6">
        <img
          src="/herobackground.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
        />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-24 h-24 rounded-2xl bg-studio-navy-deep border-2 border-studio-red/60 overflow-hidden flex items-center justify-center shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-slate-500" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
              {profile?.full_name}
            </h1>
            <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-white/10 text-white font-semibold">
                Cinturón {profile?.belt || 'Blanco'}
                {profile?.belt_stripes ? ` · ${profile.belt_stripes} grados` : ''}
              </span>
              {age !== null && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-slate-300">{age} años</span>
              )}
              {profile?.weight_category && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-slate-300">
                  {profile.weight_category}
                </span>
              )}
              {payment && (
                <span className="px-3 py-1 rounded-full bg-studio-red/20 text-red-200 font-medium">
                  {payment.plan_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ficha resumen del luchador (8 atributos Slide 4) */}
        <section className="rounded-2xl bg-studio-navy border border-white/10 p-5">
          <h2 className="font-headline text-lg uppercase tracking-wide text-white mb-4">
            Ficha del Luchador
          </h2>
          <div className="space-y-3">
            {statItems.map(({ key, label }) => {
              const val = stats?.[key] ?? 50;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{label}</span>
                    <span className="text-white font-semibold">{val}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-studio-navy-deep overflow-hidden">
                    <div
                      className="h-full bg-studio-red rounded-full transition-all"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          {/* Próximos Eventos */}
          <section className="rounded-2xl bg-studio-navy border border-white/10 p-5">
            <h2 className="font-headline text-lg uppercase tracking-wide text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-studio-red" />
              Próximos Eventos
            </h2>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">No hay seminarios ni competiciones próximas.</p>
            ) : (
              <div className="space-y-2.5">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl bg-studio-navy-deep px-3.5 py-2.5 border border-white/5"
                  >
                    <p className="text-xs text-studio-red font-semibold uppercase">
                      {ev.event_type} · {new Date(ev.event_date).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-sm font-medium text-white">{ev.title}</p>
                    {ev.location && <p className="text-xs text-slate-400">{ev.location}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Objetivos Personales */}
          <section className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-3">
            <h2 className="font-headline text-lg uppercase tracking-wide text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-studio-red" />
              Objetivos Personales
            </h2>
            <textarea
              rows={3}
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Ej. Mejorar pase de guardia, competir en marzo..."
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
            <button
              onClick={handleSaveGoals}
              disabled={savingGoals}
              className="inline-flex items-center gap-1.5 rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2 text-xs font-semibold text-white"
            >
              <Save className="w-3.5 h-3.5" />
              {savingGoals ? 'Guardando...' : 'Guardar Objetivos'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

