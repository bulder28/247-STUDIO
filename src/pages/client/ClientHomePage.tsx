import { useEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Target,
  User,
  Save,
  FileSignature,
  Ticket,
  Flame,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAge, getLocalDateISO, getLocalMonthYear, isMinorAge } from '@/lib/dateUtils';
import EmptyState from '@/components/EmptyState';
import { CalendarCheck } from 'lucide-react';
import { FighterRadarChart } from '@/components/FighterRadarChart';
import { usersWithBeltThisMonth } from '@/lib/belts';

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
  description: string | null;
}

interface ActiveSubInfo {
  remaining_credits: number | null;
  plans: {
    name: string;
    is_class_pack: boolean;
    pack_credits: number | null;
  } | null;
}

interface AttendanceHistoryItem {
  id: string;
  attendance_date: string;
  disciplines: { name: string } | null;
  schedule_classes: { title: string; start_time: string; end_time: string } | null;
}

interface LinkedChildProfile {
  id: string;
  full_name: string;
  belt: string | null;
  belt_stripes: number;
  status: string;
  birth_date: string | null;
}

const BELT_STYLES: Record<
  string,
  { bar: string; tip: string; stripe: string; aura: string; ring: string }
> = {
  Blanco: {
    bar: 'bg-gradient-to-b from-slate-50 to-slate-200 border border-slate-300',
    tip: 'bg-zinc-900',
    stripe: 'bg-white',
    aura: 'rgba(226, 232, 240, 0.14)',
    ring: 'border-slate-300/60',
  },
  Azul: {
    bar: 'bg-gradient-to-b from-blue-500 to-blue-700 border border-blue-400/60',
    tip: 'bg-zinc-950',
    stripe: 'bg-white',
    aura: 'rgba(59, 130, 246, 0.22)',
    ring: 'border-blue-400/70',
  },
  Morado: {
    bar: 'bg-gradient-to-b from-purple-600 to-purple-800 border border-purple-400/60',
    tip: 'bg-zinc-950',
    stripe: 'bg-white',
    aura: 'rgba(168, 85, 247, 0.22)',
    ring: 'border-purple-400/70',
  },
  Marrón: {
    bar: 'bg-gradient-to-b from-amber-800 to-amber-950 border border-amber-600/60',
    tip: 'bg-zinc-950',
    stripe: 'bg-white',
    aura: 'rgba(217, 119, 6, 0.22)',
    ring: 'border-amber-500/70',
  },
  Negro: {
    bar: 'bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-600',
    tip: 'bg-red-700',
    stripe: 'bg-white',
    aura: 'rgba(225, 29, 46, 0.24)',
    ring: 'border-studio-red/80',
  },
};

function calcSessionHours(start?: string, end?: string): number {
  if (!start || !end) return 1;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 1;
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : 1;
}

export function ClientHomePage() {
  const { user, profile, beltApplies, refreshProfile } = useAuth();
  const currentMonth = getLocalMonthYear();

  const [paymentRows, setPaymentRows] = useState<PaymentSummary[]>([]);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [stats, setStats] = useState<FighterStats | null>(null);
  const [events, setEvents] = useState<GymEvent[]>([]);
  const [pendingSignTitles, setPendingSignTitles] = useState<string[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSubInfo | null>(null);
  const [attendances, setAttendances] = useState<AttendanceHistoryItem[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChildProfile[]>([]);
  // Hijos vinculados cuya tarifa del mes tiene cinturón (BJJ y Grappling)
  const [childrenWithBelt, setChildrenWithBelt] = useState<Set<string>>(new Set());
  const [goals, setGoals] = useState(profile?.personal_goals ?? '');
  const [savingGoals, setSavingGoals] = useState(false);
  const [cardSpot, setCardSpot] = useState<{ x: number; y: number } | null>(null);

  const handleCardMove = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCardSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  useEffect(() => {
    setGoals(profile?.personal_goals ?? '');
  }, [profile?.personal_goals]);

  useEffect(() => {
    if (!user) return;
    const loadHome = async () => {
      const [payRes, statsRes, evRes, signRes, subRes, attRes, kidsRes] = await Promise.all([
        supabase
          .from('v_monthly_payment_status')
          .select('month_year, plan_name, price_eur, effective_status')
          .eq('user_id', user.id)
          .order('month_year', { ascending: true }),
        supabase.from('fighter_stats').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('events')
          .select('id, title, event_type, event_date, location, description')
          .eq('is_active', true)
          .gte('event_date', new Date().toISOString())
          .order('event_date')
          .limit(4),
        supabase
          .from('document_assignments')
          .select('academy_documents!inner(title, requires_signature)')
          .eq('user_id', user.id)
          .in('status', ['pending', 'rejected'])
          .eq('academy_documents.requires_signature', true),
        supabase
          .from('subscriptions')
          .select('remaining_credits, plans(name, is_class_pack, pack_credits)')
          .eq('user_id', user.id)
          .eq('month_year', currentMonth)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('attendances')
          .select('id, attendance_date, disciplines(name), schedule_classes(title, start_time, end_time)')
          .eq('user_id', user.id)
          .order('attendance_date', { ascending: false })
          .limit(200),
        supabase
          .from('profiles')
          .select('id, full_name, belt, belt_stripes, status, birth_date')
          .eq('guardian_user_id', user.id)
          .order('full_name'),
      ]);

      setPaymentRows((payRes.data as PaymentSummary[]) ?? []);
      setPaymentsLoaded(true);
      setStats((statsRes.data as FighterStats) ?? null);
      setEvents((evRes.data as GymEvent[]) ?? []);
      setPendingSignTitles(
        ((signRes.data as unknown as { academy_documents: { title: string } | null }[]) ?? [])
          .map((r) => r.academy_documents?.title)
          .filter((t): t is string => Boolean(t))
      );
      setActiveSub((subRes.data as unknown as ActiveSubInfo) ?? null);
      setAttendances((attRes.data as unknown as AttendanceHistoryItem[]) ?? []);
      const kids = (kidsRes.data as LinkedChildProfile[]) ?? [];
      setLinkedChildren(kids);
      setChildrenWithBelt(await usersWithBeltThisMonth(kids.map((k) => k.id), currentMonth));
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

  // Deuda unificada: meses anteriores sin pagar + el mes actual si no está pagado.
  const currentIsPaid =
    payment?.effective_status === 'OK' || payment?.effective_status === 'ADVANCE_OK';
  const debtRows = [
    ...pastDueRows,
    ...(payment && !currentIsPaid && payment.effective_status !== 'FUTURE_UPCOMING' ? [payment] : []),
  ];
  const debtTotal = debtRows.reduce((sum, r) => sum + Number(r.price_eur || 0), 0);
  const debtOverdue =
    pastDueRows.length > 0 ||
    payment?.effective_status === 'NOK_OVERDUE' ||
    payment?.effective_status === 'PAST_DUE';
  const hasNoPlan = paymentsLoaded && !payment && !coveredUntilMonth && pastDueRows.length === 0;

  const handleSaveGoals = async () => {
    if (!user) return;
    setSavingGoals(true);
    await supabase.from('profiles').update({ personal_goals: goals }).eq('id', user.id);
    await refreshProfile();
    setSavingGoals(false);
  };

  const appendNoteTemplate = (prefix: string) => {
    const today = getLocalDateISO();
    const line = `[${today}] ${prefix}: `;
    setGoals((prev) => (prev.trim() ? `${prev.trimEnd()}\n${line}` : line));
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

  // Sin fila o con todos los valores por defecto (50) = nadie lo ha evaluado aún.
  const radarEvaluated = Boolean(stats) && statItems.some(({ key }) => stats?.[key] !== 50);

  const age = calculateAge(profile?.birth_date);
  const isMinor = isMinorAge(profile?.birth_date);

  // Solo se muestra si su tarifa de este mes es de BJJ o Grappling; el cinturón sigue guardado en la BD
  const beltKey = beltApplies ? profile?.belt || null : null;
  const beltStyle = beltKey ? (BELT_STYLES[beltKey] ?? BELT_STYLES.Blanco) : null;
  const beltAura = beltStyle?.aura ?? 'rgba(220, 38, 38, 0.14)';
  const beltRing = beltStyle?.ring ?? 'border-white/15';
  const beltStripes = beltKey ? Math.min(4, Math.max(0, profile?.belt_stripes ?? 0)) : 0;

  const classesThisMonth = attendances.filter((a) => a.attendance_date.startsWith(currentMonth)).length;
  const totalMatHours = attendances.reduce(
    (sum, a) => sum + calcSessionHours(a.schedule_classes?.start_time, a.schedule_classes?.end_time),
    0
  );
  const byDiscipline = attendances.reduce<Record<string, number>>((acc, a) => {
    const dName = a.disciplines?.name ?? 'Tatami';
    acc[dName] = (acc[dName] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Aviso de documentación obligatoria pendiente */}
      {pendingSignTitles.length > 0 && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/15 text-amber-100 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileSignature className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="font-headline text-sm sm:text-base uppercase tracking-wide">
                {pendingSignTitles.length === 1
                  ? 'Tienes 1 documento por firmar'
                  : `Tienes ${pendingSignTitles.length} documentos por firmar`}
              </p>
              <p className="text-xs opacity-90">
                La academia te pide firmar: {pendingSignTitles.join(', ')}.
              </p>
            </div>
          </div>
          <Link
            to="/app/perfil"
            className="inline-flex items-center justify-center rounded-xl studio-btn px-4 py-2 text-xs font-semibold text-white shrink-0 transition"
          >
            Firmar ahora
          </Link>
        </div>
      )}
      {/* Cuotas pendientes: un único aviso con total, desglose y cómo pagar */}
      {debtRows.length > 0 && (
        <div
          className={`rounded-2xl border p-4 space-y-3 ${
            debtOverdue
              ? 'border-studio-red bg-studio-red/20 text-red-100'
              : 'border-amber-500/40 bg-amber-500/15 text-amber-100'
          }`}
        >
          <div className="flex items-start gap-3">
            {debtOverdue ? (
              <AlertTriangle className="w-6 h-6 text-studio-red shrink-0" />
            ) : (
              <Clock className="w-6 h-6 text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-headline text-base uppercase tracking-wide">
                Pendiente de pago: {debtTotal.toFixed(0)} €
              </p>
              <ul className="mt-1 text-xs space-y-0.5 opacity-90">
                {debtRows.map((r) => (
                  <li key={r.month_year} className="flex flex-wrap gap-x-2">
                    <span className="capitalize">{formatLongMonth(r.month_year)}</span>
                    <span>·</span>
                    <span>
                      {r.plan_name} · {Number(r.price_eur).toFixed(0)} €
                    </span>
                    {r.effective_status === 'GRACE_7_DAYS' && <span>(en plazo)</span>}
                  </li>
                ))}
              </ul>
              {profile?.is_founder && (
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase">
                  SF · -10% aplicado
                </span>
              )}
            </div>
          </div>
          <p className="text-xs opacity-90">
            Puedes abonarlo en recepción, en efectivo o por Bizum. Si ya lo has pagado o necesitas
            organizarlo de otra forma, escribe a dirección.
          </p>
          <Link
            to="/app/foro?tab=chat"
            className="inline-flex items-center justify-center min-h-11 rounded-xl bg-white/10 hover:bg-white/15 px-4 text-xs font-semibold text-white transition"
          >
            Escribir a dirección
          </Link>
        </div>
      )}

      {/* Sin tarifa este mes (p. ej. tras la clase de prueba) */}
      {hasNoPlan && (
        <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 text-sky-100 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Ticket className="w-6 h-6 text-sky-300 shrink-0" />
            <div>
              <p className="font-headline text-base uppercase tracking-wide">
                Aún no tienes tarifa este mes
              </p>
              <p className="text-xs opacity-90">
                Para seguir entrenando, elige la tarifa que mejor te encaje y abónala en recepción
                (efectivo o Bizum). Si tienes dudas, dirección te ayuda a elegir.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/app/tarifas"
              className="inline-flex items-center justify-center min-h-11 rounded-xl studio-btn px-4 text-xs font-semibold text-white"
            >
              Ver tarifas
            </Link>
            <Link
              to="/app/foro?tab=chat"
              className="inline-flex items-center justify-center min-h-11 rounded-xl bg-white/10 hover:bg-white/15 px-4 text-xs font-semibold text-white transition"
            >
              Preguntar a dirección
            </Link>
          </div>
        </div>
      )}

      {/* Pago al día / adelantado */}
      {debtRows.length === 0 && (currentIsPaid || (!payment && coveredUntilMonth)) && (
        <div
          className={`rounded-2xl border p-3 sm:p-4 flex items-center justify-between gap-3 ${payment?.effective_status === 'OK' ||
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
                    ? 'Cuota pendiente (+7 días)'
                    : payment?.effective_status === 'GRACE_7_DAYS'
                      ? 'Cuota en plazo (7 días)'
                      : 'Cuota pendiente'}
              </p>
              {payment && (
                <p className="text-xs opacity-85 flex flex-wrap items-center gap-1.5">
                  <span>
                    Plan: {payment.plan_name} ({Number(payment.price_eur).toFixed(0)} €/mes)
                  </span>
                  {profile?.is_founder && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase">
                      SF · -10%
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Carnet Oficial del Luchador */}
      <motion.section
        onMouseMove={handleCardMove}
        onMouseLeave={() => setCardSpot(null)}
        animate={{
          rotateX: cardSpot ? ((cardSpot.y - 140) / 140) * -2.8 : 0,
          rotateY: cardSpot ? ((cardSpot.x - 240) / 240) * 2.8 : 0,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{ transformPerspective: 1000 }}
        className="relative overflow-hidden rounded-3xl studio-panel border border-white/15 p-6 sm:p-7"
      >
        <img
          src="/herobackground.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.07] pointer-events-none"
        />
        <div className="absolute inset-0 tatami-weave opacity-50 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: cardSpot
              ? `radial-gradient(420px circle at ${cardSpot.x}px ${cardSpot.y}px, ${beltAura}, transparent 65%)`
              : `radial-gradient(500px circle at 15% 20%, ${beltAura}, transparent 70%)`,
          }}
        />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-studio-red to-transparent opacity-80 pointer-events-none" />

        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 border-b border-white/10 pb-3">
            <span className="inline-flex items-center gap-1.5 font-semibold tracking-wider uppercase text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-studio-red" />
              Carnet de Tatami · 247 STUDIO
            </span>
            <div className="flex items-center gap-2">
              {profile?.is_founder && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 font-semibold">
                  Socio Fundador · -10%
                </span>
              )}
              {payment && (
                <span className="px-2.5 py-0.5 rounded-full bg-studio-red/20 border border-studio-red/40 text-red-100 font-semibold">
                  {payment.plan_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div
              className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl studio-panel-inset border-2 ${beltRing} overflow-hidden flex items-center justify-center shrink-0 shadow-modal`}
            >
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

            <div className="flex-1 text-center sm:text-left min-w-0">
              <h1 className="font-headline text-2xl sm:text-3xl uppercase tracking-wide text-white truncate">
                {profile?.full_name}
              </h1>
              <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
                {beltKey && (
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white font-semibold">
                    Cinturón {beltKey}
                    {beltStripes > 0 ? ` · ${beltStripes} ${beltStripes === 1 ? 'grado' : 'grados'}` : ''}
                  </span>
                )}
                {age !== null && (
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200">
                    {age} años
                  </span>
                )}
                {profile?.weight_category && (
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200">
                    {profile.weight_category}
                  </span>
                )}
              </div>

              {/* Cinturón tejido BJJ realista con punta y grados (solo si aplica a su disciplina) */}
              {beltKey && beltStyle && (
                <div className="mt-4 max-w-md mx-auto sm:mx-0">
                  <div
                    className={`relative h-6 rounded-md overflow-hidden flex shadow-modal belt-weave ${beltStyle.bar}`}
                  >
                    <div className="w-7 h-full bg-studio-red/90 border-r border-black/30 flex items-center justify-center">
                      <span className="font-headline text-[9px] text-white tracking-tighter">247</span>
                    </div>
                    <div className="flex-1 shadow-inner" />
                    <div
                      className={`w-16 sm:w-20 h-full ${beltStyle.tip} border-l border-black/40 flex items-center justify-end gap-1.5 px-2`}
                    >
                      {Array.from({ length: beltStripes }).map((_, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-full ${beltStyle.stripe} shadow-sm opacity-95`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Contador visual de Bono (Multipack / Bono 8 clases / Clase Suelta) */}
      {activeSub?.plans?.is_class_pack && (
        <section className="rounded-3xl studio-panel border border-sky-400/30 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline text-lg uppercase tracking-wide text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-sky-400" />
              {activeSub.plans.name}
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 border border-sky-400/30 text-sky-200">
              {activeSub.remaining_credits ?? 0} de{' '}
              {Math.max(activeSub.plans.pack_credits ?? 1, activeSub.remaining_credits ?? 0)}{' '}
              clases disponibles
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {Array.from({
              length: Math.max(activeSub.plans.pack_credits ?? 1, activeSub.remaining_credits ?? 0),
            }).map((_, idx) => {
              const totalSlots = Math.max(
                activeSub.plans?.pack_credits ?? 1,
                activeSub.remaining_credits ?? 0
              );
              const usedCount = Math.max(0, totalSlots - (activeSub.remaining_credits ?? 0));
              const isUsed = idx < usedCount;
              return (
                <div
                  key={idx}
                  title={isUsed ? 'Sesión consumida' : 'Sesión disponible'}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border transition ${isUsed
                      ? 'studio-panel-inset border-white/10 text-slate-500 opacity-60'
                      : 'bg-sky-500/20 border-sky-400/60 text-sky-100 shadow-sm'
                    }`}
                >
                  {isUsed ? '✓' : idx + 1}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Mi Progreso en el Tatami (Mat Time + Historial real) */}
      <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-headline text-lg uppercase tracking-wide text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-studio-red" />
            Mi Progreso en el Tatami
          </h2>
          <span className="text-xs text-slate-400">Historial real validado en clase</span>
        </div>

        <div className="studio-stagger grid grid-cols-3 gap-3">
          <div className="relative overflow-hidden rounded-2xl studio-panel-inset border border-white/10 p-3.5 text-center">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-white/30" />
            <p className="font-headline text-2xl sm:text-3xl text-white">{classesThisMonth}</p>
            <p className="text-[11px] text-slate-400 uppercase mt-0.5">Este mes</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl studio-panel-inset border border-white/10 p-3.5 text-center">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-studio-cream" />
            <p className="font-headline text-2xl sm:text-3xl text-studio-cream">{attendances.length}</p>
            <p className="text-[11px] text-slate-400 uppercase mt-0.5">Clases totales</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl studio-panel-inset border border-white/10 p-3.5 text-center">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400" />
            <p className="font-headline text-2xl sm:text-3xl text-emerald-300">
              {totalMatHours.toFixed(1).replace(/\.0$/, '')} h
            </p>
            <p className="text-[11px] text-slate-400 uppercase mt-0.5">Mat Time</p>
          </div>
        </div>

        {Object.keys(byDiscipline).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(byDiscipline).map(([discName, count]) => (
              <span
                key={discName}
                className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200"
              >
                {discName}: <strong className="text-white">{count}</strong>
              </span>
            ))}
          </div>
        )}

        {attendances.length === 0 ? (
          <EmptyState icon={CalendarCheck} compact>
            Cuando el profesor pase lista en clase aparecerán aquí tus sesiones y horas acumuladas.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">
              Últimas sesiones registradas
            </p>
            <div className="divide-y divide-white/5 rounded-2xl studio-panel-inset border border-white/5">
              {attendances.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {a.schedule_classes?.title ?? a.disciplines?.name ?? 'Clase'}
                    </p>
                    <p className="text-slate-400">
                      {a.disciplines?.name}
                      {a.schedule_classes?.start_time
                        ? ` · ${a.schedule_classes.start_time.slice(0, 5)}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-slate-300 shrink-0">
                    {new Date(`${a.attendance_date}T12:00:00`).toLocaleDateString('es-ES')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Modo Familia / Menores vinculados */}
      {(linkedChildren.length > 0 || isMinor) && (
        <section className="rounded-3xl studio-panel border border-sky-400/25 p-5 space-y-3">
          <h2 className="font-headline text-lg uppercase tracking-wide text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            {linkedChildren.length > 0
              ? 'Ficha Familiar / Hijos Vinculados'
              : 'Contacto Familiar (Menor ≤ 14 años)'}
          </h2>
          {linkedChildren.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {linkedChildren.map((child) => {
                const childAge = calculateAge(child.birth_date);
                return (
                  <div
                    key={child.id}
                    className="rounded-2xl studio-panel-inset border border-white/10 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{child.full_name}</p>
                      <p className="text-xs text-slate-400">
                        {[
                          child.belt && childrenWithBelt.has(child.id)
                            ? `Cinturón ${child.belt}${child.belt_stripes ? ` · ${child.belt_stripes} grados` : ''}`
                            : null,
                          childAge !== null ? `${childAge} años` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Alumno activo'}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${child.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                    >
                      {child.status === 'active' ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
                <p className="text-slate-400 uppercase">Padre / Tutor 1</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {profile?.father_name || 'Pendiente de completar en Perfil'}
                </p>
                {profile?.father_phone && <p className="text-slate-300">{profile.father_phone}</p>}
              </div>
              <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
                <p className="text-slate-400 uppercase">Madre / Tutor 2</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {profile?.mother_name || 'Pendiente de completar en Perfil'}
                </p>
                {profile?.mother_phone && <p className="text-slate-300">{profile.mother_phone}</p>}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Radar interactivo de combate (8 atributos Slide 4) */}
        <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-lg uppercase tracking-wide text-white">
              Radar de Combate
            </h2>
            {radarEvaluated && (
              <span className="text-[11px] text-slate-400">Toca un eje para inspeccionar</span>
            )}
          </div>
          {radarEvaluated ? (
            <FighterRadarChart
              items={statItems.map(({ key, label }) => ({
                key,
                label,
                value: stats?.[key] ?? 50,
              }))}
            />
          ) : (
            <EmptyState icon={Target}>
              Tu radar aún está sin evaluar. Tu profesor lo completará cuando valore tu técnica,
              guardia, pases y el resto de atributos.
            </EmptyState>
          )}
        </section>

        <div className="space-y-6">
          {/* Próximos Eventos estilo cartelera */}
          <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6">
            <h2 className="font-headline text-lg uppercase tracking-wide text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-studio-red" />
              Próximos Eventos
            </h2>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">No hay seminarios ni competiciones próximas.</p>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => {
                  const d = new Date(ev.event_date);
                  const dayNum = Number.isNaN(d.getTime()) ? '--' : String(d.getDate()).padStart(2, '0');
                  const monthShort = Number.isNaN(d.getTime())
                    ? ''
                    : d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
                  return (
                    <div
                      key={ev.id}
                      className="rounded-2xl studio-panel-inset border border-white/10 p-3 flex items-center gap-3.5 hover:border-studio-red/40 transition"
                    >
                      <div className="w-12 h-12 rounded-xl bg-studio-red/15 border border-studio-red/35 flex flex-col items-center justify-center shrink-0">
                        <span className="font-headline text-lg text-white leading-none">{dayNum}</span>
                        <span className="text-[10px] uppercase font-bold text-studio-red-text leading-tight mt-0.5">
                          {monthShort}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="inline-block text-[10px] text-studio-red-text font-bold uppercase tracking-wider">
                          {ev.event_type}
                        </span>
                        <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
                        {ev.location && <p className="text-xs text-slate-400 truncate">{ev.location}</p>}
                        {ev.description && (
                          <p className="text-xs text-slate-300/90 mt-1 line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Objetivos y Diario Técnico */}
          <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 space-y-3">
            <h2 className="font-headline text-lg uppercase tracking-wide text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-studio-red" />
              Objetivos y Diario Técnico
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => appendNoteTemplate('Técnica vista')}
                className="px-2.5 py-1 rounded-xl studio-panel-inset border border-white/10 hover:border-studio-red/40 hover:text-white text-[11px] text-slate-300 transition"
              >
                + Apunte técnico de hoy
              </button>
              <button
                type="button"
                onClick={() => appendNoteTemplate('Guardia / Pase')}
                className="px-2.5 py-1 rounded-xl studio-panel-inset border border-white/10 hover:border-studio-red/40 hover:text-white text-[11px] text-slate-300 transition"
              >
                + Objetivo guardia/pase
              </button>
              <button
                type="button"
                onClick={() => appendNoteTemplate('Meta torneo')}
                className="px-2.5 py-1 rounded-xl studio-panel-inset border border-white/10 hover:border-studio-red/40 hover:text-white text-[11px] text-slate-300 transition"
              >
                + Meta competición
              </button>
            </div>
            <textarea
              rows={4}
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Ej. [2026-11-14] Técnica vista: raspado tijera desde guardia cerrada..."
              className="w-full rounded-2xl studio-panel-inset border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-studio-red transition"
            />
            <button
              onClick={handleSaveGoals}
              disabled={savingGoals}
              className="inline-flex items-center gap-1.5 rounded-xl studio-btn px-4 py-2.5 text-xs font-semibold text-white transition"
            >
              <Save className="w-3.5 h-3.5" />
              {savingGoals ? 'Guardando...' : 'Guardar Objetivos y Notas'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

