import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAge, getLocalDateISO, getLocalMonthYear, isMinorAge } from '@/lib/dateUtils';
import { getDocumentCompliance, type DocSignature, type DocTemplate } from '@/lib/documents';

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

const BELT_STYLES: Record<string, { bar: string; tip: string; stripe: string }> = {
  Blanco: { bar: 'bg-slate-100 border border-slate-300', tip: 'bg-zinc-900', stripe: 'bg-white' },
  Azul: { bar: 'bg-blue-600 border border-blue-400/50', tip: 'bg-zinc-950', stripe: 'bg-white' },
  Morado: { bar: 'bg-purple-700 border border-purple-400/50', tip: 'bg-zinc-950', stripe: 'bg-white' },
  Marrón: { bar: 'bg-amber-900 border border-amber-700/60', tip: 'bg-zinc-950', stripe: 'bg-white' },
  Negro: { bar: 'bg-zinc-950 border border-zinc-700', tip: 'bg-red-700', stripe: 'bg-white' },
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
  const { user, profile, refreshProfile } = useAuth();
  const currentMonth = getLocalMonthYear();

  const [paymentRows, setPaymentRows] = useState<PaymentSummary[]>([]);
  const [stats, setStats] = useState<FighterStats | null>(null);
  const [events, setEvents] = useState<GymEvent[]>([]);
  const [docTemplates, setDocTemplates] = useState<DocTemplate[]>([]);
  const [docSignatures, setDocSignatures] = useState<DocSignature[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSubInfo | null>(null);
  const [attendances, setAttendances] = useState<AttendanceHistoryItem[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChildProfile[]>([]);
  const [goals, setGoals] = useState(profile?.personal_goals ?? '');
  const [savingGoals, setSavingGoals] = useState(false);

  useEffect(() => {
    setGoals(profile?.personal_goals ?? '');
  }, [profile?.personal_goals]);

  useEffect(() => {
    if (!user) return;
    const loadHome = async () => {
      const [payRes, statsRes, evRes, tplRes, sigRes, subRes, attRes, kidsRes] = await Promise.all([
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
        supabase.from('document_templates').select('*').eq('is_active', true),
        supabase
          .from('document_signatures')
          .select('template_id, template_version, signed_at')
          .eq('user_id', user.id),
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
      setStats((statsRes.data as FighterStats) ?? null);
      setEvents((evRes.data as GymEvent[]) ?? []);
      setDocTemplates((tplRes.data as DocTemplate[]) ?? []);
      setDocSignatures((sigRes.data as DocSignature[]) ?? []);
      setActiveSub((subRes.data as unknown as ActiveSubInfo) ?? null);
      setAttendances((attRes.data as unknown as AttendanceHistoryItem[]) ?? []);
      setLinkedChildren((kidsRes.data as LinkedChildProfile[]) ?? []);
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

  const age = calculateAge(profile?.birth_date);
  const isMinor = isMinorAge(profile?.birth_date);
  const docCompliance = getDocumentCompliance(docTemplates, docSignatures, profile?.birth_date);

  const beltKey = profile?.belt || 'Blanco';
  const beltStyle = BELT_STYLES[beltKey] ?? BELT_STYLES.Blanco;
  const beltStripes = Math.min(4, Math.max(0, profile?.belt_stripes ?? 0));

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
    <div className="space-y-6">
      {/* Aviso de documentación obligatoria pendiente */}
      {docCompliance.totalRequired > 0 && docCompliance.pending.length > 0 && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/15 text-amber-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileSignature className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="font-headline text-base uppercase tracking-wide">
                Documentación obligatoria pendiente ({docCompliance.signedCount}/
                {docCompliance.totalRequired})
              </p>
              <p className="text-xs opacity-90">
                Es imprescindible firmar: {docCompliance.pending.map((d) => d.title).join(', ')}.
              </p>
            </div>
          </div>
          <Link
            to="/app/perfil"
            className="inline-flex items-center justify-center rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2 text-xs font-semibold text-white shrink-0 transition"
          >
            Firmar ahora
          </Link>
        </div>
      )}
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

            {/* Cinturón visual con grados (0-4 tiras) */}
            <div className="mt-4 max-w-sm mx-auto sm:mx-0">
              <div className={`h-5 rounded-md overflow-hidden flex shadow-inner ${beltStyle.bar}`}>
                <div className="flex-1" />
                <div className={`w-16 h-full ${beltStyle.tip} flex items-center justify-end gap-1 px-1.5`}>
                  {Array.from({ length: beltStripes }).map((_, idx) => (
                    <span key={idx} className={`w-1.5 h-full ${beltStyle.stripe} opacity-95`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contador visual de Bono (Multipack / Bono 8 clases / Clase Suelta) */}
      {activeSub?.plans?.is_class_pack && (
        <section className="rounded-2xl bg-studio-navy border border-sky-400/30 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline text-lg uppercase tracking-wide text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-sky-400" />
              {activeSub.plans.name}
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-200">
              {activeSub.remaining_credits ?? 0} de{' '}
              {Math.max(activeSub.plans.pack_credits ?? 1, activeSub.remaining_credits ?? 0)}{' '}
              clases disponibles
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition ${
                    isUsed
                      ? 'bg-white/5 border-white/10 text-slate-500 line-through'
                      : 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                  }`}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Mi Progreso en el Tatami (Mat Time + Historial real) */}
      <section className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-headline text-lg uppercase tracking-wide text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-studio-red" />
            Mi Progreso en el Tatami
          </h2>
          <span className="text-xs text-slate-400">Historial real validado en clase</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-studio-navy-deep border border-white/5 p-3 text-center">
            <p className="font-headline text-2xl text-white">{classesThisMonth}</p>
            <p className="text-[11px] text-slate-400 uppercase mt-0.5">Este mes</p>
          </div>
          <div className="rounded-xl bg-studio-navy-deep border border-white/5 p-3 text-center">
            <p className="font-headline text-2xl text-studio-red">{attendances.length}</p>
            <p className="text-[11px] text-slate-400 uppercase mt-0.5">Clases totales</p>
          </div>
          <div className="rounded-xl bg-studio-navy-deep border border-white/5 p-3 text-center">
            <p className="font-headline text-2xl text-emerald-300">
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
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200"
              >
                {discName}: <strong className="text-white">{count}</strong>
              </span>
            ))}
          </div>
        )}

        {attendances.length === 0 ? (
          <p className="text-xs text-slate-400">
            Cuando el profesor pase lista en clase aparecerán aquí tus sesiones y horas acumuladas.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">
              Últimas sesiones registradas
            </p>
            <div className="divide-y divide-white/5 rounded-xl bg-studio-navy-deep border border-white/5">
              {attendances.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
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
        <section className="rounded-2xl bg-studio-navy border border-sky-400/25 p-5 space-y-3">
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
                    className="rounded-xl bg-studio-navy-deep border border-white/10 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{child.full_name}</p>
                      <p className="text-xs text-slate-400">
                        Cinturón {child.belt || 'Blanco'}
                        {child.belt_stripes ? ` · ${child.belt_stripes} grados` : ''}
                        {childAge !== null ? ` · ${childAge} años` : ''}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        child.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
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
              <div className="rounded-xl bg-studio-navy-deep border border-white/5 p-3">
                <p className="text-slate-400 uppercase">Padre / Tutor 1</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {profile?.father_name || 'Pendiente de completar en Perfil'}
                </p>
                {profile?.father_phone && <p className="text-slate-300">{profile.father_phone}</p>}
              </div>
              <div className="rounded-xl bg-studio-navy-deep border border-white/5 p-3">
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

          {/* Objetivos y Diario Técnico */}
          <section className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-3">
            <h2 className="font-headline text-lg uppercase tracking-wide text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-studio-red" />
              Objetivos y Diario Técnico
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => appendNoteTemplate('Técnica vista')}
                className="px-2.5 py-1 rounded-lg bg-studio-navy-deep border border-white/10 hover:bg-white/5 text-[11px] text-slate-200"
              >
                + Apunte técnico de hoy
              </button>
              <button
                type="button"
                onClick={() => appendNoteTemplate('Guardia / Pase')}
                className="px-2.5 py-1 rounded-lg bg-studio-navy-deep border border-white/10 hover:bg-white/5 text-[11px] text-slate-200"
              >
                + Objetivo guardia/pase
              </button>
              <button
                type="button"
                onClick={() => appendNoteTemplate('Meta torneo')}
                className="px-2.5 py-1 rounded-lg bg-studio-navy-deep border border-white/10 hover:bg-white/5 text-[11px] text-slate-200"
              >
                + Meta competición
              </button>
            </div>
            <textarea
              rows={4}
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Ej. [2026-11-14] Técnica vista: raspado tijera desde guardia cerrada..."
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
            <button
              onClick={handleSaveGoals}
              disabled={savingGoals}
              className="inline-flex items-center gap-1.5 rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2 text-xs font-semibold text-white"
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

