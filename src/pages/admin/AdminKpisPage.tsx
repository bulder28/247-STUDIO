import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Filter,
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
import { getLocalDateISO, getLocalMonthYear } from '@/lib/dateUtils';
import { getDocumentCompliance, type DocSignature, type DocTemplate } from '@/lib/documents';
import { formatEUR, formatInt, formatMonthLong } from '@/lib/format';
import { DeltaBadge, KpiCard, Skeleton } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';

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

/** Redondea el máximo del eje a un valor "limpio" (1, 2, 2.5, 5 × 10^n). */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const n = value / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * exp;
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
  formatValue = (v) => formatInt(v),
  loading = false,
  emptyLabel = 'Sin datos',
}: {
  title: string;
  centerTop: string;
  centerSub: string;
  segments: DonutSegment[];
  formatValue?: (v: number) => string;
  loading?: boolean;
  emptyLabel?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = 36;
  const c = 2 * Math.PI * r;
  // Pequeño hueco entre segmentos para que se lean como piezas separadas
  const visibleCount = segments.filter((s) => s.value > 0).length;
  const gap = visibleCount > 1 ? 1.6 : 0;
  let accumulated = 0;
  const hoveredSeg = segments.find((s) => s.label === hovered) ?? null;

  return (
    <div className="rounded-3xl studio-panel border border-white/10 p-5 flex flex-col justify-between gap-4">
      <h3 className="font-headline text-base uppercase tracking-wide text-white">{title}</h3>
      <div className="flex items-center gap-5">
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          {loading ? (
            <Skeleton className="w-28 h-28 !rounded-full" />
          ) : (
            <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
              {total > 0 &&
                segments.map((seg) => {
                  if (seg.value <= 0) return null;
                  const segLen = (seg.value / total) * c;
                  const drawLen = Math.max(segLen - gap, 0.5);
                  const offset = -accumulated;
                  accumulated += segLen;
                  const dim = hovered !== null && hovered !== seg.label;
                  return (
                    <circle
                      key={seg.label}
                      cx="50"
                      cy="50"
                      r={r}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={hovered === seg.label ? 14 : 12}
                      strokeDasharray={`${drawLen} ${c - drawLen}`}
                      strokeDashoffset={offset}
                      opacity={dim ? 0.3 : 1}
                      className="transition-all duration-200"
                    />
                  );
                })}
            </svg>
          )}
          {!loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
              <span className="font-headline text-lg text-white leading-none tabular-nums">
                {total === 0 ? '—' : hoveredSeg ? formatValue(hoveredSeg.value) : centerTop}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                {total === 0 ? emptyLabel : hoveredSeg ? hoveredSeg.label : centerSub}
              </span>
            </div>
          )}
        </div>

        <ul className="flex-1 space-y-1 min-w-0">
          {segments.map((seg) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <li
                key={seg.label}
                onMouseEnter={() => setHovered(seg.label)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1.5 -mx-2 transition ${
                  hovered === seg.label ? 'bg-white/[0.06]' : ''
                }`}
              >
                <span className="inline-flex items-center gap-2 text-slate-300 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate">{seg.label}</span>
                </span>
                {loading ? (
                  <Skeleton className="h-3 w-14" />
                ) : (
                  <span className="font-semibold text-white shrink-0 tabular-nums">
                    {formatValue(seg.value)}{' '}
                    <span className="text-slate-500 font-normal">{pct}%</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function AdminKpisPage() {
  const currentMonth = getLocalMonthYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const [pinnedMonth, setPinnedMonth] = useState<string | null>(null);
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
      setPinnedMonth(null);
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
    const signups = clients.filter((c) => c.created_at.startsWith(ym)).length;
    const rate =
      collected + pending > 0 ? Math.round((collected / (collected + pending)) * 100) : 0;
    return { ym, label: formatMonthLabel(ym), collected, pending, attCount, signups, rate };
  });

  const maxRev = niceCeil(Math.max(100, ...trendData.map((d) => d.collected + d.pending)));
  const maxAtt = niceCeil(Math.max(10, ...trendData.map((d) => d.attCount)));
  const focusMonth = hoveredMonth ?? pinnedMonth ?? selectedMonth;
  const activeTrend = trendData.find((d) => d.ym === focusMonth) ?? trendData[5];

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
    const slot = hour < 14 ? 'morning' : 'afternoon';
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

  const maxClassCount = topClasses[0]?.count ?? 1;

  // Geometría del gráfico combinado (coordenadas del viewBox)
  const CH = { left: 50, right: 470, top: 22, base: 168, width: 520, height: 200 };
  const plotH = CH.base - CH.top;
  const colW = (CH.right - CH.left) / trendData.length;
  const barW = Math.min(38, colW * 0.5);
  const colCenter = (idx: number) => CH.left + colW * idx + colW / 2;
  const yRev = (v: number) => CH.base - (v / maxRev) * plotH;
  const yAtt = (v: number) => CH.base - (v / maxAtt) * plotH;
  const linePoints = trendData
    .map((d, idx) => `${colCenter(idx).toFixed(1)},${yAtt(d.attCount).toFixed(1)}`)
    .join(' ');
  const areaPoints = `${colCenter(0).toFixed(1)},${CH.base} ${linePoints} ${colCenter(
    trendData.length - 1
  ).toFixed(1)},${CH.base}`;
  const fmtAxisEur = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${v}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de KPIs"
        subtitle={
          <>
            {formatMonthLong(selectedMonth)}
            {selectedDiscipline !== 'all' && (
              <span className="text-sky-300">
                {', '}
                {disciplines.find((d) => d.id === selectedDiscipline)?.name ?? 'Disciplina'}
              </span>
            )}
          </>
        }
        actions={
          <>
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
          </>
        }
      />

      {/* Fila 1: 5 Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <KpiCard
          label="Ingresos cobrados"
          icon={Wallet}
          accent="emerald"
          loading={loading}
          value={formatEUR(totalCollected)}
          delta={<DeltaBadge value={revenueMoM} suffix="" />}
          footnote={`ARPU ${formatEUR(arpu)} · ${paidMonth.length} cuotas`}
          trend={trendData.map((d) => d.collected)}
          trendLabel="Evolución de ingresos cobrados en 6 meses"
        />
        <KpiCard
          label="Pendiente del mes"
          icon={AlertTriangle}
          accent="amber"
          loading={loading}
          value={formatEUR(totalPending)}
          valueClassName={totalPending > 0 ? 'text-amber-300' : 'text-white'}
          footnote={
            <>
              Deuda meses previos:{' '}
              <strong className={historicalDebt > 0 ? 'text-rose-300' : 'text-slate-200'}>
                {formatEUR(historicalDebt)}
              </strong>
            </>
          }
          trend={trendData.map((d) => d.pending)}
          trendLabel="Evolución del importe pendiente en 6 meses"
        />
        <KpiCard
          label="Tasa de cobro"
          icon={CheckCircle2}
          accent="sky"
          loading={loading}
          value={`${collectionRate}%`}
          valueClassName={
            collectionRate >= 90 ? 'text-emerald-300' : collectionRate >= 70 ? 'text-white' : 'text-amber-300'
          }
          trend={trendData.map((d) => d.rate)}
          trendLabel="Evolución de la tasa de cobro en 6 meses"
        >
          <div
            className="w-full h-1.5 rounded-full bg-slate-950/70 overflow-hidden mt-1"
            role="progressbar"
            aria-valuenow={collectionRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tasa de cobro"
          >
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </KpiCard>
        <KpiCard
          label="Asistencias"
          icon={Flame}
          accent="red"
          loading={loading}
          value={formatInt(monthAtt.length)}
          delta={<DeltaBadge value={attMoM} suffix="" />}
          footnote={`${avgClassesPerStudent} clases por alumno activo`}
          trend={trendData.map((d) => d.attCount)}
          trendLabel="Evolución de asistencias en 6 meses"
        />
        <KpiCard
          label="Captación y riesgo"
          icon={Users}
          accent="purple"
          loading={loading}
          value={`+${newSignups}`}
          footnote={
            <>
              {guestTrials} pruebas ·{' '}
              <strong className={inactive15Count > 0 ? 'text-amber-300' : 'text-slate-200'}>
                {inactive15Count}
              </strong>{' '}
              inactivos +15 d
            </>
          }
          trend={trendData.map((d) => d.signups)}
          trendLabel="Altas nuevas por mes en 6 meses"
        />
      </div>

      {/* Fila 2: Tendencia 6 Meses (Barras + Línea SVG) y 2 Donuts Power BI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-headline text-lg uppercase text-white">Tendencia 6 meses</h2>
              <p className="text-xs text-slate-400">
                <span className="hidden sm:inline">Ingresos (€, eje izq.) frente a asistencias (eje dcho.) · </span>
                Toca un mes para fijarlo
              </p>
            </div>
            {activeTrend && !loading && (
              <div className="rounded-xl studio-panel-inset border border-white/10 px-3 py-2 text-xs flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                <span className="font-bold text-white inline-flex items-center gap-1.5">
                  {activeTrend.label}
                  {pinnedMonth === activeTrend.ym && (
                    <span className="text-[9px] uppercase tracking-wider text-sky-300 bg-sky-500/15 rounded px-1 py-px">
                      fijado
                    </span>
                  )}
                </span>
                <span className="text-emerald-300">{formatEUR(activeTrend.collected)}</span>
                <span className="text-amber-300">{formatEUR(activeTrend.pending)} pend.</span>
                <span className="text-sky-300">{formatInt(activeTrend.attCount)} asist.</span>
                {activeTrend.ym !== selectedMonth && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(activeTrend.ym)}
                    className="text-studio-red font-semibold hover:underline"
                  >
                    Analizar mes →
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <Skeleton className="w-full h-52 !rounded-2xl" />
          ) : (
            <>
            {/* Móvil: lista vertical por mes (sin scroll horizontal) */}
            <ul className="sm:hidden space-y-1.5" aria-label="Ingresos y asistencias de los últimos 6 meses">
              {[...trendData].reverse().map((d) => {
                const isActive = focusMonth === d.ym;
                const colPct = (d.collected / maxRev) * 100;
                const penPct = (d.pending / maxRev) * 100;
                const attPct = (d.attCount / maxAtt) * 100;
                return (
                  <li key={`m-${d.ym}`}>
                    <button
                      type="button"
                      onClick={() => setPinnedMonth((prev) => (prev === d.ym ? null : d.ym))}
                      aria-pressed={pinnedMonth === d.ym}
                      className={`w-full text-left rounded-xl px-3 py-2 transition border ${
                        isActive
                          ? 'bg-white/[0.06] border-white/15'
                          : 'border-transparent hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className={`font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {d.label}
                        </span>
                        <span className="text-slate-400">
                          <span className="text-emerald-300">{formatEUR(d.collected)}</span>
                          {d.pending > 0 && (
                            <span className="text-amber-300"> + {formatEUR(d.pending)}</span>
                          )}
                          <span className="text-sky-300 ml-2">{d.attCount} asist.</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full rounded-full bg-slate-950/70 overflow-hidden flex">
                        <span className="h-full bg-emerald-500" style={{ width: `${colPct}%` }} />
                        <span className="h-full bg-amber-500" style={{ width: `${penPct}%` }} />
                      </div>
                      <div className="mt-1 h-1 w-full rounded-full bg-slate-950/70 overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-sky-400"
                          style={{ width: `${attPct}%` }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="hidden sm:block w-full overflow-x-auto -mx-1 px-1">
              <svg
                viewBox={`0 0 ${CH.width} ${CH.height}`}
                className="w-full min-w-[440px] h-auto select-none"
                role="group"
                aria-label="Gráfico combinado de ingresos y asistencias de los últimos 6 meses"
              >
                <defs>
                  <linearGradient id="kpiAttArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                  </linearGradient>
                  {trendData.map((d, idx) => {
                    const total = d.collected + d.pending;
                    const h = Math.max((total / maxRev) * plotH, 2);
                    return (
                      <clipPath key={`clip-${d.ym}`} id={`kpiBar-${d.ym}`}>
                        <rect x={colCenter(idx) - barW / 2} y={CH.base - h} width={barW} height={h} rx={5} />
                      </clipPath>
                    );
                  })}
                </defs>

                {/* Rejilla + etiquetas de ejes */}
                {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                  const y = CH.base - step * plotH;
                  return (
                    <g key={step}>
                      <line
                        x1={CH.left}
                        y1={y}
                        x2={CH.right}
                        y2={y}
                        stroke={step === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
                        strokeDasharray={step === 0 ? undefined : '3 4'}
                      />
                      <text x={CH.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748B">
                        {fmtAxisEur(maxRev * step)}
                      </text>
                      <text x={CH.right + 8} y={y + 4} textAnchor="start" fontSize="11" fill="#38BDF8" opacity={0.7}>
                        {Math.round(maxAtt * step)}
                      </text>
                    </g>
                  );
                })}

                {/* Barras apiladas Cobrado + Pendiente */}
                {trendData.map((d, idx) => {
                  const cx = colCenter(idx);
                  const isActive = focusMonth === d.ym;
                  const yCol = yRev(d.collected);
                  const yTop = yRev(d.collected + d.pending);
                  const toggle = () => setPinnedMonth((prev) => (prev === d.ym ? null : d.ym));
                  return (
                    <g
                      key={d.ym}
                      className="cursor-pointer outline-none"
                      tabIndex={0}
                      role="button"
                      aria-pressed={pinnedMonth === d.ym}
                      aria-label={`${formatMonthLong(d.ym)}: ${formatEUR(d.collected)} cobrado, ${formatEUR(
                        d.pending
                      )} pendiente, ${d.attCount} asistencias`}
                      onMouseEnter={() => setHoveredMonth(d.ym)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      onFocus={() => setHoveredMonth(d.ym)}
                      onBlur={() => setHoveredMonth(null)}
                      onClick={toggle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle();
                        }
                      }}
                    >
                      <rect
                        x={cx - colW / 2 + 3}
                        y={CH.top - 8}
                        width={colW - 6}
                        height={CH.base - CH.top + 30}
                        rx={10}
                        fill={isActive ? 'rgba(255,255,255,0.05)' : 'transparent'}
                        stroke={pinnedMonth === d.ym ? 'rgba(56,189,248,0.35)' : 'transparent'}
                      />
                      <g clipPath={`url(#kpiBar-${d.ym})`} opacity={isActive ? 1 : 0.78}>
                        <rect
                          x={cx - barW / 2}
                          y={yCol}
                          width={barW}
                          height={Math.max(CH.base - yCol, 2)}
                          fill="#10B981"
                        />
                        {d.pending > 0 && (
                          <rect x={cx - barW / 2} y={yTop} width={barW} height={yCol - yTop} fill="#F59E0B" />
                        )}
                      </g>
                      <text
                        x={cx}
                        y={CH.base + 20}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight={isActive ? '700' : '500'}
                        fill={isActive ? '#FFFFFF' : '#94A3B8'}
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}

                {/* Línea de asistencias con área */}
                <polygon points={areaPoints} fill="url(#kpiAttArea)" className="pointer-events-none" />
                <polyline
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={linePoints}
                  className="pointer-events-none"
                />
                {trendData.map((d, idx) => {
                  const isActive = focusMonth === d.ym;
                  return (
                    <circle
                      key={`pt-${d.ym}`}
                      cx={colCenter(idx)}
                      cy={yAtt(d.attCount)}
                      r={isActive ? 5.5 : 3.5}
                      fill={isActive ? '#FFFFFF' : '#38BDF8'}
                      stroke="#0F172A"
                      strokeWidth="2"
                      className="pointer-events-none transition-all duration-200"
                    />
                  );
                })}
              </svg>
            </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-3 border-t border-white/5">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Cobrado (€)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Pendiente (€)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-[3px] rounded-full bg-sky-400" /> Asistencias
            </span>
          </div>
        </section>

        <div className="lg:col-span-5 space-y-6">
          <PowerDonut
            title="Cobros por método de pago"
            centerTop={formatEUR(totalCollected)}
            centerSub="Cobrado"
            loading={loading}
            emptyLabel="Sin cobros"
            formatValue={formatEUR}
            segments={[
              { label: 'Efectivo', value: cashSum, color: '#10B981' },
              { label: 'Bizum', value: bizumSum, color: '#38BDF8' },
              { label: 'Otros / sin especificar', value: otherSum, color: '#64748B' },
            ]}
          />
          <PowerDonut
            title="Cartera del mes por estado"
            centerTop={formatInt(monthPayments.length)}
            centerSub="Suscripciones"
            loading={loading}
            emptyLabel="Sin cuotas"
            segments={[
              { label: 'Cobrado', value: paidMonth.length, color: '#10B981' },
              { label: 'En plazo (7 días)', value: graceMonth.length, color: '#F59E0B' },
              {
                label: 'Vencido / pendiente',
                value:
                  overdueMonth.length +
                  pendingMonth.filter((p) => p.effective_status === 'PENDING').length,
                color: '#E11D2E',
              },
            ]}
          />
        </div>
      </div>

      {/* Fila 3: Embudo Legal/Captación y Bonos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Bonos a punto de agotarse</span>
              <span className="tabular-nums">
                {lowCreditPacks} / {packSubs.length}
              </span>
            </div>
            <div className="w-full h-2 rounded-full studio-panel-inset overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-700"
                style={{
                  width: `${packSubs.length > 0 ? Math.round((lowCreditPacks / packSubs.length) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Candidatos a renovación en {formatMonthLong(selectedMonth)}.
            </p>
          </div>
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
              Concentración por día y franja horaria en {formatMonthLong(selectedMonth)}
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
                  { key: 'morning', label: 'Mañana', hint: '< 14 h' },
                  { key: 'afternoon', label: 'Tarde', hint: '≥ 14 h' },
                ].map((slot) => (
                  <tr key={slot.key}>
                    <th scope="row" className="text-left font-medium pr-2 whitespace-nowrap">
                      <span className="block text-slate-200">{slot.label}</span>
                      <span className="block text-[10px] text-slate-500 font-normal">{slot.hint}</span>
                    </th>
                    {[1, 2, 3, 4, 5, 6].map((d) => {
                      const val = matrixBuckets[`${d}-${slot.key}`] ?? 0;
                      const intensity = val / maxBucket;
                      const isPeak = val > 0 && val === maxBucket;
                      return (
                        <td
                          key={d}
                          title={`${DAY_SHORT[d]} · ${slot.label}: ${val} asistencias`}
                          className={`rounded-xl text-center py-3 font-headline text-sm tabular-nums transition hover:scale-105 ${
                            isPeak ? 'ring-1 ring-white/60' : 'ring-1 ring-white/5'
                          }`}
                          style={{
                            backgroundColor:
                              val === 0
                                ? 'rgba(15, 23, 42, 0.55)'
                                : `rgba(225, 29, 46, ${(0.16 + intensity * 0.74).toFixed(2)})`,
                            color: val === 0 ? '#475569' : intensity > 0.35 ? '#FFFFFF' : '#FECDD3',
                          }}
                        >
                          {val === 0 ? '·' : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 text-[10px] text-slate-500">
            <span>Menos</span>
            <span className="flex gap-0.5" aria-hidden>
              {[0.16, 0.34, 0.53, 0.71, 0.9].map((o) => (
                <span
                  key={o}
                  className="w-4 h-2.5 rounded-sm"
                  style={{ backgroundColor: `rgba(225, 29, 46, ${o})` }}
                />
              ))}
            </span>
            <span>Más</span>
          </div>
        </section>

        <section className="lg:col-span-6 rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-lg uppercase text-white">
              Detalle de Ocupación por Clase
            </h2>
            <span className="text-xs text-slate-400">{topClasses.length} clases activas</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full !rounded-2xl" />
              ))}
            </div>
          ) : topClasses.length === 0 ? (
            <p className="text-sm text-slate-400 rounded-2xl studio-panel-inset border border-white/5 px-4 py-6 text-center">
              Sin asistencias para el filtro seleccionado.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {topClasses.map((cls, i) => {
                const avg = cls.dates.size > 0 ? (cls.count / cls.dates.size).toFixed(1) : '0';
                const barPct = Math.round((cls.count / maxClassCount) * 100);
                return (
                  <div
                    key={`${cls.title}-${cls.day}-${cls.time}`}
                    className="relative overflow-hidden rounded-2xl studio-panel-inset border border-white/5 px-3.5 py-2.5 text-xs"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-studio-cream/15 to-studio-cream/[0.03] pointer-events-none"
                      style={{ width: `${barPct}%` }}
                      aria-hidden
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <span
                          className={`grid place-items-center w-7 h-7 shrink-0 rounded-lg font-headline text-sm ${
                            i < 3 ? 'bg-studio-cream text-slate-950' : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{cls.title}</p>
                          <p className="text-slate-400 truncate">
                            {DAY_SHORT[cls.day] ?? ''} {cls.time} · Prof. {cls.coach}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p className="font-bold text-white">{cls.count} asist.</p>
                        <p className="text-[11px] text-slate-400">{avg} / sesión</p>
                      </div>
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

