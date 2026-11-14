import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Ticket,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLocalDateISO, getLocalMonthYear, isMinorAge } from '@/lib/dateUtils';
import { getDocumentCompliance, type DocSignature, type DocTemplate } from '@/lib/documents';

interface DisciplineItem {
  id: string;
  name: string;
}

interface PaymentRow {
  user_id: string;
  month_year: string;
  plan_name: string;
  price_eur: number;
  paid_amount_eur: number | null;
  payment_method: string | null;
  effective_status: string;
}

interface AttendanceRaw {
  user_id: string | null;
  guest_name: string | null;
  attendance_date: string;
  discipline_id: string | null;
  schedule_class_id: string;
  schedule_classes:
    | {
        id: string;
        title: string;
        day_of_week: number;
        start_time: string;
        coach_name: string;
        discipline_id: string | null;
      }
    | {
        id: string;
        title: string;
        day_of_week: number;
        start_time: string;
        coach_name: string;
        discipline_id: string | null;
      }[]
    | null;
}

interface ClientProfile {
  id: string;
  status: string;
  belt: string | null;
  birth_date: string | null;
  is_founder: boolean;
  created_at: string;
  first_training_at: string | null;
}

interface PackSubRow {
  id: string;
  user_id: string;
  remaining_credits: number | null;
  plans: { name: string; pack_credits: number | null } | { name: string; pack_credits: number | null }[];
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_SHORT: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

const BELT_ORDER = ['Blanco', 'Azul', 'Morado', 'Marrón', 'Negro'];
const BELT_COLORS: Record<string, string> = {
  Blanco: 'bg-slate-200',
  Azul: 'bg-blue-500',
  Morado: 'bg-purple-500',
  Marrón: 'bg-amber-700',
  Negro: 'bg-zinc-900 border border-zinc-600',
};

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getMonthRangeBounds(startYm: string, endYm: string): { start: string; nextEnd: string } {
  const [ey, em] = endYm.split('-').map(Number);
  const nextEnd =
    !ey || !em
      ? `${endYm}-31`
      : em === 12
        ? `${ey + 1}-01-01`
        : `${ey}-${String(em + 1).padStart(2, '0')}-01`;
  return { start: `${startYm}-01`, nextEnd };
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTH_SHORT[m - 1]} ${String(y).slice(2)}`;
}

function daysBetweenISO(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = toISO.slice(0, 10).split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  return Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function PowerDonut({
  title,
  centerTop,
  centerSub,
  segments,
  unit = '',
}: {
  title: string;
  centerTop: string;
  centerSub: string;
  segments: DonutSegment[];
  unit?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = 36;
  const c = 2 * Math.PI * r;
  let accumulated = 0;

  return (
    <div className="rounded-3xl studio-panel border border-white/10 p-5 flex flex-col justify-between gap-4">
      <h3 className="font-headline text-base uppercase tracking-wide text-white">{title}</h3>
      <div className="flex items-center gap-5">
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
            {total > 0 &&
              segments.map((seg) => {
                if (seg.value <= 0) return null;
                const segLen = (seg.value / total) * c;
                const offset = -accumulated;
                accumulated += segLen;
                return (
                  <circle
                    key={seg.label}
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="12"
                    strokeDasharray={`${segLen} ${c - segLen}`}
                    strokeDashoffset={offset}
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="font-headline text-lg text-white leading-none">{centerTop}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{centerSub}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {segments.map((seg) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={seg.label} className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-300 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate">{seg.label}</span>
                </span>
                <span className="font-semibold text-white shrink-0">
                  {seg.value.toFixed(0)}
                  {unit} <span className="text-slate-400 font-normal">({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdminKpisPage() {
  const currentMonth = getLocalMonthYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [disciplines, setDisciplines] = useState<DisciplineItem[]>([]);
  const [payments6M, setPayments6M] = useState<PaymentRow[]>([]);
  const [pastDueAll, setPastDueAll] = useState<PaymentRow[]>([]);
  const [attendances6M, setAttendances6M] = useState<AttendanceRaw[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [signatures, setSignatures] = useState<(DocSignature & { user_id: string })[]>([]);
  const [packSubs, setPackSubs] = useState<PackSubRow[]>([]);

  const sixMonths = useMemo(
    () => Array.from({ length: 6 }, (_, i) => shiftMonth(selectedMonth, i - 5)),
    [selectedMonth]
  );

  useEffect(() => {
    const loadBI = async () => {
      setLoading(true);
      const startMonth = sixMonths[0];
      const { start, nextEnd } = getMonthRangeBounds(startMonth, selectedMonth);

      const [discRes, payRes, pastDueRes, attRes, cliRes, tplRes, sigRes, packRes] =
        await Promise.all([
          supabase.from('disciplines').select('id, name').eq('is_active', true).order('sort_order'),
          supabase
            .from('v_monthly_payment_status')
            .select('user_id, month_year, plan_name, price_eur, paid_amount_eur, payment_method, effective_status')
            .in('month_year', sixMonths),
          supabase
            .from('v_monthly_payment_status')
            .select('user_id, month_year, plan_name, price_eur, paid_amount_eur, payment_method, effective_status')
            .eq('effective_status', 'PAST_DUE')
            .lt('month_year', currentMonth),
          supabase
            .from('attendances')
            .select(
              'user_id, guest_name, attendance_date, discipline_id, schedule_class_id, schedule_classes(id, title, day_of_week, start_time, coach_name, discipline_id)'
            )
            .gte('attendance_date', start)
            .lt('attendance_date', nextEnd),
          supabase
            .from('profiles')
            .select('id, status, belt, birth_date, is_founder, created_at, first_training_at')
            .eq('role', 'client'),
          supabase.from('document_templates').select('*').eq('is_active', true),
          supabase
            .from('document_signatures')
            .select('user_id, template_id, template_version, signed_at'),
          supabase
            .from('subscriptions')
            .select('id, user_id, remaining_credits, plans!inner(name, is_class_pack, pack_credits)')
            .eq('month_year', selectedMonth)
            .eq('status', 'active')
            .eq('plans.is_class_pack', true),
        ]);

      setDisciplines((discRes.data as DisciplineItem[]) ?? []);
      setPayments6M((payRes.data as PaymentRow[]) ?? []);
      setPastDueAll((pastDueRes.data as PaymentRow[]) ?? []);
      setAttendances6M((attRes.data as unknown as AttendanceRaw[]) ?? []);
      setClients((cliRes.data as ClientProfile[]) ?? []);
      setTemplates((tplRes.data as DocTemplate[]) ?? []);
      setSignatures((sigRes.data as (DocSignature & { user_id: string })[]) ?? []);
      setPackSubs((packRes.data as unknown as PackSubRow[]) ?? []);
      setLoading(false);
    };

    loadBI();
  }, [selectedMonth, currentMonth, sixMonths]);

  const filteredAttendances6M = useMemo(() => {
    if (selectedDiscipline === 'all') return attendances6M;
    return attendances6M.filter((a) => {
      const sc = Array.isArray(a.schedule_classes) ? a.schedule_classes[0] : a.schedule_classes;
      const dId = a.discipline_id ?? sc?.discipline_id ?? null;
      return dId === selectedDiscipline;
    });
  }, [attendances6M, selectedDiscipline]);

  const prevMonth = shiftMonth(selectedMonth, -1);
  const { start: selStart, nextEnd: selNextEnd } = getMonthRangeBounds(selectedMonth, selectedMonth);

  const monthPayments = payments6M.filter((p) => p.month_year === selectedMonth);
  const prevPayments = payments6M.filter((p) => p.month_year === prevMonth);

  const paidMonth = monthPayments.filter(
    (p) => p.effective_status === 'OK' || p.effective_status === 'ADVANCE_OK'
  );
  const pendingMonth = monthPayments.filter(
    (p) =>
      p.effective_status !== 'OK' &&
      p.effective_status !== 'ADVANCE_OK' &&
      p.effective_status !== 'FUTURE_UPCOMING'
  );
  const graceMonth = monthPayments.filter((p) => p.effective_status === 'GRACE_7_DAYS');
  const overdueMonth = monthPayments.filter(
    (p) => p.effective_status === 'NOK_OVERDUE' || p.effective_status === 'PAST_DUE'
  );

  const totalCollected = paidMonth.reduce(
    (s, r) => s + Number(r.paid_amount_eur ?? r.price_eur ?? 0),
    0
  );
  const totalPending = pendingMonth.reduce((s, r) => s + Number(r.price_eur || 0), 0);
  const prevCollected = prevPayments
    .filter((p) => p.effective_status === 'OK' || p.effective_status === 'ADVANCE_OK')
    .reduce((s, r) => s + Number(r.paid_amount_eur ?? r.price_eur ?? 0), 0);

  const revenueMoM =
    prevCollected > 0 ? Math.round(((totalCollected - prevCollected) / prevCollected) * 100) : null;
  const arpu = paidMonth.length > 0 ? totalCollected / paidMonth.length : 0;
  const collectionRate =
    totalCollected + totalPending > 0
      ? Math.round((totalCollected / (totalCollected + totalPending)) * 100)
      : 0;
  const historicalDebt = pastDueAll.reduce((s, r) => s + Number(r.price_eur || 0), 0);

  const monthAtt = filteredAttendances6M.filter((a) => a.attendance_date.startsWith(selectedMonth));
  const prevMonthAttCount = filteredAttendances6M.filter((a) =>
    a.attendance_date.startsWith(prevMonth)
  ).length;
  const attMoM =
    prevMonthAttCount > 0
      ? Math.round(((monthAtt.length - prevMonthAttCount) / prevMonthAttCount) * 100)
      : null;

  const activeClients = clients.filter((c) => c.status === 'active');
  const avgClassesPerStudent =
    activeClients.length > 0 ? (monthAtt.length / activeClients.length).toFixed(1) : '0';

  const guestTrials = monthAtt.filter((a) => !a.user_id && a.guest_name).length;
  const newSignups = clients.filter((c) => {
    const d = c.created_at.slice(0, 10);
    return d >= selStart && d < selNextEnd;
  }).length;

  // Inactividad +15 días (sobre la ventana de 6 meses cargada)
  const todayStr = getLocalDateISO();
  const lastAttByUser: Record<string, string> = {};
  attendances6M.forEach((a) => {
    if (!a.user_id) return;
    if (!lastAttByUser[a.user_id] || a.attendance_date > lastAttByUser[a.user_id]) {
      lastAttByUser[a.user_id] = a.attendance_date;
    }
  });
  const inactive15Count = activeClients.filter((c) => {
    const ref = lastAttByUser[c.id] ?? (c.first_training_at ?? c.created_at).slice(0, 10);
    return daysBetweenISO(ref, todayStr) > 15;
  }).length;

  // Método de pago
  let cashSum = 0;
  let bizumSum = 0;
  let otherSum = 0;
  paidMonth.forEach((r) => {
    const amt = Number(r.paid_amount_eur ?? r.price_eur ?? 0);
    const m = (r.payment_method ?? '').toLowerCase();
    if (m.includes('efectivo') || m.includes('cash')) cashSum += amt;
    else if (m.includes('bizum')) bizumSum += amt;
    else otherSum += amt;
  });

  // Serie 6 meses para gráfico combinado Power BI
  const trendData = sixMonths.map((ym) => {
    const pRows = payments6M.filter((p) => p.month_year === ym);
    const collected = pRows
      .filter((p) => p.effective_status === 'OK' || p.effective_status === 'ADVANCE_OK')
      .reduce((s, r) => s + Number(r.paid_amount_eur ?? r.price_eur ?? 0), 0);
    const pending = pRows
      .filter(
        (p) =>
          p.effective_status !== 'OK' &&
          p.effective_status !== 'ADVANCE_OK' &&
          p.effective_status !== 'FUTURE_UPCOMING'
      )
      .reduce((s, r) => s + Number(r.price_eur || 0), 0);
    const attCount = filteredAttendances6M.filter((a) => a.attendance_date.startsWith(ym)).length;
    return { ym, label: formatMonthLabel(ym), collected, pending, attCount };
  });

  const maxRev = Math.max(100, ...trendData.map((d) => d.collected + d.pending));
  const maxAtt = Math.max(10, ...trendData.map((d) => d.attCount));
  const activeTrend = trendData.find((d) => d.ym === (hoveredMonth ?? selectedMonth)) ?? trendData[5];

  // Cumplimiento documental
  const sigByUser: Record<string, DocSignature[]> = {};
  signatures.forEach((s) => {
    if (!sigByUser[s.user_id]) sigByUser[s.user_id] = [];
    sigByUser[s.user_id].push(s);
  });
  const compliantUsers = clients.filter(
    (c) =>
      (c.status === 'active' || c.status === 'paused') &&
      getDocumentCompliance(templates, sigByUser[c.id] ?? [], c.birth_date).pending.length === 0
  ).length;
  const totalManagedClients = clients.filter(
    (c) => c.status === 'active' || c.status === 'paused'
  ).length;
  const docCompliancePct =
    totalManagedClients > 0 ? Math.round((compliantUsers / totalManagedClients) * 100) : 100;

  // Demografía y cinturones
  const kidsCount = activeClients.filter((c) => isMinorAge(c.birth_date)).length;
  const foundersCount = activeClients.filter((c) => c.is_founder).length;
  const beltCounts = BELT_ORDER.map((belt) => ({
    belt,
    count: activeClients.filter((c) => (c.belt || 'Blanco').toLowerCase() === belt.toLowerCase()).length,
  }));

  // Bonos
  const lowCreditPacks = packSubs.filter((s) => (s.remaining_credits ?? 0) <= 2).length;
  const avgRemainingCredits =
    packSubs.length > 0
      ? (packSubs.reduce((s, p) => s + (p.remaining_credits ?? 0), 0) / packSubs.length).toFixed(1)
      : '0';

  // Matriz semanal Día × Franja + Top Clases
  const matrixBuckets: Record<string, number> = {};
  const classPerfMap: Record<
    string,
    { title: string; day: number; time: string; coach: string; count: number; dates: Set<string> }
  > = {};
  monthAtt.forEach((a) => {
    const sc = Array.isArray(a.schedule_classes) ? a.schedule_classes[0] : a.schedule_classes;
    if (!sc) return;
    const hour = Number(sc.start_time.slice(0, 2));
    const slot = hour < 14 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const key = `${sc.day_of_week}-${slot}`;
    matrixBuckets[key] = (matrixBuckets[key] ?? 0) + 1;

    if (!classPerfMap[sc.id]) {
      classPerfMap[sc.id] = {
        title: sc.title,
        day: sc.day_of_week,
        time: sc.start_time.slice(0, 5),
        coach: sc.coach_name,
        count: 0,
        dates: new Set(),
      };
    }
    classPerfMap[sc.id].count += 1;
    classPerfMap[sc.id].dates.add(a.attendance_date);
  });
  const maxBucket = Math.max(1, ...Object.values(matrixBuckets));
  const topClasses = Object.values(classPerfMap).sort((a, b) => b.count - a.count);

  const linePoints = trendData
    .map((d, idx) => {
      const x = 52 + idx * 82;
      const y = 165 - (d.attCount / maxAtt) * 125;
      return `${x},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Barra superior Power BI + Segmentadores */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-studio-red">
            <BarChart3 className="w-3.5 h-3.5" /> Business Intelligence · 247 STUDIO
          </span>
          <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white mt-0.5">
            Panel de KPIs ({formatMonthLabel(selectedMonth)})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl studio-panel-inset border border-white/10 px-3 py-2">
            <Calendar className="w-4 h-4 text-studio-red shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              aria-label="Mes de análisis"
              className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl studio-panel-inset border border-white/10 px-3 py-2">
            <Filter className="w-4 h-4 text-sky-400 shrink-0" />
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              aria-label="Filtrar por disciplina"
              className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              <option value="all" className="bg-slate-900">
                Todas las disciplinas
              </option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900">
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {(selectedMonth !== currentMonth || selectedDiscipline !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedMonth(currentMonth);
                setSelectedDiscipline('all');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Fila 1: 5 Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="relative overflow-hidden rounded-3xl studio-panel border border-white/10 p-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>Ingresos Cobrados</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="font-headline text-3xl text-white">{totalCollected.toFixed(0)} €</p>
            {revenueMoM !== null && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                  revenueMoM >= 0 ? 'text-emerald-400' : 'text-studio-red'
                }`}
              >
                {revenueMoM >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {revenueMoM >= 0 ? `+${revenueMoM}%` : `${revenueMoM}%`}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ARPU {arpu.toFixed(0)} € · {paidMonth.length} cuotas</p>
        </div>

        <div className="relative overflow-hidden rounded-3xl studio-panel border border-white/10 p-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-transparent" />
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>Pendiente + Deuda</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="mt-2 font-headline text-3xl text-amber-300">{totalPending.toFixed(0)} €</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Deuda previa: <strong className="text-slate-200">{historicalDebt.toFixed(0)} €</strong>
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl studio-panel border border-white/10 p-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-transparent" />
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>Tasa de Cobro</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <p className="mt-2 font-headline text-3xl text-white">{collectionRate}%</p>
          <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl studio-panel border border-white/10 p-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-studio-red to-transparent" />
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>Asistencias Mes</span>
            <Flame className="w-4 h-4 text-studio-red" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="font-headline text-3xl text-white">{monthAtt.length}</p>
            {attMoM !== null && (
              <span
                className={`text-[11px] font-bold ${
                  attMoM >= 0 ? 'text-emerald-400' : 'text-studio-red'
                }`}
              >
                {attMoM >= 0 ? `+${attMoM}%` : `${attMoM}%`}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{avgClassesPerStudent} clases/alumno activo</p>
        </div>

        <div className="relative overflow-hidden rounded-3xl studio-panel border border-white/10 p-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-transparent" />
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>Captación y Riesgo</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="mt-2 font-headline text-3xl text-white">+{newSignups}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {guestTrials} pruebas · <strong className="text-amber-300">{inactive15Count}</strong> inactivos +15d
          </p>
        </div>
      </div>

      {/* Fila 2: Tendencia 6 Meses (Barras + Línea SVG) y 2 Donuts Power BI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-headline text-lg uppercase text-white">
                Tendencia 6 Meses: Ingresos (€) vs Asistencias
              </h2>
              <p className="text-xs text-slate-400">
                Pasa el ratón por cualquier mes para inspeccionar el detalle
              </p>
            </div>
            {activeTrend && (
              <div className="rounded-xl studio-panel-inset border border-white/10 px-3 py-1.5 text-xs flex items-center gap-3">
                <span className="font-bold text-white">{activeTrend.label}</span>
                <span className="text-emerald-400">{activeTrend.collected.toFixed(0)} € ok</span>
                <span className="text-amber-300">{activeTrend.pending.toFixed(0)} € pend.</span>
                <span className="text-sky-300">{activeTrend.attCount} asist.</span>
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-slate-400 py-16 text-center">Cargando serie histórica...</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 510 205" className="w-full min-w-[420px] h-auto select-none">
                {/* Líneas guía horizontales */}
                {[0.25, 0.5, 0.75, 1].map((step) => {
                  const y = 165 - step * 125;
                  return (
                    <line
                      key={step}
                      x1="20"
                      y1={y}
                      x2="495"
                      y2={y}
                      stroke="rgba(255,255,255,0.07)"
                      strokeDasharray="3 3"
                    />
                  );
                })}

                {/* Barras apiladas Cobrado + Pendiente por mes */}
                {trendData.map((d, idx) => {
                  const x = 34 + idx * 82;
                  const colH = (d.collected / maxRev) * 125;
                  const penH = (d.pending / maxRev) * 125;
                  const isActive = (hoveredMonth ?? selectedMonth) === d.ym;
                  return (
                    <g
                      key={d.ym}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMonth(d.ym)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      onClick={() => setSelectedMonth(d.ym)}
                    >
                      <rect
                        x={x - 10}
                        y={20}
                        width={56}
                        height={165}
                        rx={8}
                        fill={isActive ? 'rgba(255,255,255,0.04)' : 'transparent'}
                      />
                      <rect
                        x={x}
                        y={165 - colH}
                        width={36}
                        height={Math.max(colH, 2)}
                        rx={4}
                        fill="#10B981"
                        opacity={isActive ? 1 : 0.85}
                      />
                      {penH > 0 && (
                        <rect
                          x={x}
                          y={165 - colH - penH}
                          width={36}
                          height={penH}
                          rx={4}
                          fill="#F59E0B"
                          opacity={isActive ? 1 : 0.8}
                        />
                      )}
                      <text
                        x={x + 18}
                        y={188}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight={isActive ? '700' : '500'}
                        fill={isActive ? '#FFFFFF' : '#94A3B8'}
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}

                {/* Línea superpuesta de asistencias */}
                <polyline
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  points={linePoints}
                />
                {trendData.map((d, idx) => {
                  const cx = 52 + idx * 82;
                  const cy = 165 - (d.attCount / maxAtt) * 125;
                  const isActive = (hoveredMonth ?? selectedMonth) === d.ym;
                  return (
                    <circle
                      key={`pt-${d.ym}`}
                      cx={cx}
                      cy={cy}
                      r={isActive ? 5.5 : 3.8}
                      fill={isActive ? '#FFFFFF' : '#38BDF8'}
                      stroke="#0F172A"
                      strokeWidth="1.5"
                      className="pointer-events-none"
                    />
                  );
                })}
              </svg>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-white/5">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Cobrado (€)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Pendiente (€)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400" /> Asistencias Tatami
            </span>
          </div>
        </section>

        <div className="lg:col-span-5 space-y-6">
          <PowerDonut
            title="Arqueo de Caja (Método)"
            centerTop={`${totalCollected.toFixed(0)} €`}
            centerSub="Cobrado"
            unit=" €"
            segments={[
              { label: 'Efectivo', value: cashSum, color: '#10B981' },
              { label: 'Bizum', value: bizumSum, color: '#38BDF8' },
              { label: 'Otros / Sin esp.', value: otherSum, color: '#64748B' },
            ]}
          />
          <PowerDonut
            title="Cartera del Mes (Estado)"
            centerTop={String(monthPayments.length)}
            centerSub="Suscripciones"
            segments={[
              { label: 'Cobrado (OK)', value: paidMonth.length, color: '#10B981' },
              { label: 'En plazo 7d', value: graceMonth.length, color: '#F59E0B' },
              { label: 'Vencido / Pend.', value: overdueMonth.length + pendingMonth.filter((p) => p.effective_status === 'PENDING').length, color: '#E11D2E' },
            ]}
          />
        </div>
      </div>

      {/* Fila 3: Radiografía Cinturones, Embudo Legal/Captación y Bonos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cinturones y Segmentos */}
        <section className="rounded-3xl studio-panel border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-base uppercase text-white">Cinturones Activos</h3>
            <span className="text-xs text-slate-400">{activeClients.length} alumnos</span>
          </div>
          <div className="space-y-2.5">
            {beltCounts.map((b) => {
              const pct =
                activeClients.length > 0 ? Math.round((b.count / activeClients.length) * 100) : 0;
              return (
                <div key={b.belt} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-200 font-medium">{b.belt}</span>
                    <span className="text-slate-400">
                      {b.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full studio-panel-inset overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BELT_COLORS[b.belt] ?? 'bg-slate-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-200 border border-sky-400/25">
              Kids ≤14: <strong>{kidsCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-400/25">
              Socios Fundadores: <strong>{foundersCount}</strong>
            </span>
          </div>
        </section>

        {/* Salud Legal y Embudo */}
        <section className="rounded-3xl studio-panel border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-base uppercase text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Salud Legal y Altas
            </h3>
            <Link to="/admin/alumnos" className="text-xs text-studio-red hover:underline">
              Ver alumnos
            </Link>
          </div>

          <div className="rounded-2xl studio-panel-inset border border-white/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Firmas obligatorias al día</span>
              <span className="font-headline text-base text-emerald-300">{docCompliancePct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                style={{ width: `${docCompliancePct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {compliantUsers} de {totalManagedClients} alumnos activos/pausados conformes
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-center">
            <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
              <p className="font-headline text-2xl text-white">{guestTrials}</p>
              <p className="text-[11px] text-slate-400">Invitados / Pruebas</p>
            </div>
            <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
              <p className="font-headline text-2xl text-studio-red">{newSignups}</p>
              <p className="text-[11px] text-slate-400">Altas del mes</p>
            </div>
          </div>
        </section>

        {/* Estado de Bonos */}
        <section className="rounded-3xl studio-panel border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-base uppercase text-white flex items-center gap-2">
              <Ticket className="w-4 h-4 text-sky-400" /> Bonos de Clases
            </h3>
            <Link to="/admin/seguimiento" className="text-xs text-studio-red hover:underline">
              Gestionar
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
              <p className="font-headline text-2xl text-white">{packSubs.length}</p>
              <p className="text-[10px] uppercase text-slate-400">Activos</p>
            </div>
            <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
              <p className="font-headline text-2xl text-sky-300">{avgRemainingCredits}</p>
              <p className="text-[10px] uppercase text-slate-400">Media créd.</p>
            </div>
            <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
              <p className="font-headline text-2xl text-amber-300">{lowCreditPacks}</p>
              <p className="text-[10px] uppercase text-slate-400">≤ 2 créd.</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Controla en tiempo real los alumnos con bono de 8 clases o clase suelta próximos a
            renovación durante <strong className="text-slate-200">{formatMonthLabel(selectedMonth)}</strong>.
          </p>
        </section>
      </div>

      {/* Fila 4: Matriz de Calor Semanal + Top Clases */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-headline text-lg uppercase text-white">
              Mapa de Calor Semanal (Asistencias)
            </h2>
            <p className="text-xs text-slate-400">
              Concentración por día y franja horaria en {formatMonthLabel(selectedMonth)}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-1.5">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left font-medium py-1">Franja</th>
                  {[1, 2, 3, 4, 5, 6].map((d) => (
                    <th key={d} className="text-center font-medium py-1">
                      {DAY_SHORT[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'morning', label: 'Mañana (<14h)' },
                  { key: 'afternoon', label: 'Tarde (14-18h)' },
                  { key: 'evening', label: 'Noche (18h+)' },
                ].map((slot) => (
                  <tr key={slot.key}>
                    <td className="text-slate-300 font-medium pr-2 whitespace-nowrap">{slot.label}</td>
                    {[1, 2, 3, 4, 5, 6].map((d) => {
                      const val = matrixBuckets[`${d}-${slot.key}`] ?? 0;
                      const intensity = val / maxBucket;
                      return (
                        <td
                          key={d}
                          className="rounded-xl text-center py-3 font-headline text-sm border border-white/5 transition"
                          style={{
                            backgroundColor:
                              val === 0
                                ? 'rgba(15, 23, 42, 0.7)'
                                : `rgba(225, 29, 46, ${(0.18 + intensity * 0.72).toFixed(2)})`,
                            color: val === 0 ? '#64748B' : '#FFFFFF',
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-6 rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-lg uppercase text-white">
              Detalle de Ocupación por Clase
            </h2>
            <span className="text-xs text-slate-400">{topClasses.length} clases activas</span>
          </div>

          {topClasses.length === 0 ? (
            <p className="text-sm text-slate-400">Sin asistencias para el filtro seleccionado.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {topClasses.map((cls, i) => {
                const avg = cls.dates.size > 0 ? (cls.count / cls.dates.size).toFixed(1) : '0';
                return (
                  <div
                    key={`${cls.title}-${cls.day}-${cls.time}`}
                    className="rounded-2xl studio-panel-inset border border-white/5 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        <span className="text-studio-red mr-1.5">#{i + 1}</span>
                        {cls.title}
                      </p>
                      <p className="text-slate-400">
                        {DAY_SHORT[cls.day] ?? ''} {cls.time} · Prof. {cls.coach}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-white">{cls.count} asist.</p>
                      <p className="text-[11px] text-slate-400">{avg} / sesión</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

