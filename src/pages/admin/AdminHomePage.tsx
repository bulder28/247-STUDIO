import { useEffect, useState } from 'react';
import CollapsibleCard from '@/components/CollapsibleCard';
import { Link } from 'react-router-dom';
import {
  Users,
  CreditCard,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
  FileWarning,
  BarChart3,
  Clock,
  Wallet,
  TrendingUp,
  Ticket,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLocalDateISO, getLocalMonthYear, isMinorAge } from '@/lib/dateUtils';
import { countPendingSignatures, fetchSignatureTasksByUser } from '@/lib/studentDocuments';
import { formatEUR, formatEURExact, formatMonthLong } from '@/lib/format';
import { getCashMonth, type CashMonth } from '@/lib/finance';
import { usersWithBeltThisMonth } from '@/lib/belts';
import { DeltaBadge, KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';

interface DisciplineStat {
  id: string;
  name: string;
  attendances: number;
  uniqueStudents: number;
}

interface ClassRanking {
  id: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  coachName: string;
  attendances: number;
  sessions: number;
}

interface InactiveStudent {
  id: string;
  full_name: string;
  belt: string | null;
  lastAttendance: string | null;
  daysInactive: number;
}

interface LowCreditSub {
  id: string;
  userName: string;
  planName: string;
  remaining: number;
  total: number;
}

interface ComplianceAlert {
  id: string;
  fullName: string;
  reasons: string[];
}

interface PastDueRow {
  user_id: string;
  full_name: string;
  month_year: string;
  plan_name: string;
  price_eur: number;
}

const DAY_LABELS: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

function getPrevMonthYear(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

function getMonthBounds(ym: string): { start: string; nextStart: string } {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return { start: `${ym}-01`, nextStart: `${ym}-31` };
  const nextStart =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { start: `${ym}-01`, nextStart };
}

function daysBetweenISO(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = toISO.slice(0, 10).split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  return Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

interface MonthlyRow {
  user_id: string;
  full_name: string;
  plan_name: string;
  price_eur: number;
  paid_amount_eur: number | null;
  payment_method: string | null;
  effective_status:
    | 'OK'
    | 'ADVANCE_OK'
    | 'FUTURE_UPCOMING'
    | 'PAST_DUE'
    | 'NOK_OVERDUE'
    | 'GRACE_7_DAYS'
    | 'PENDING';
}

interface PrevMonthlyRow {
  price_eur: number;
  paid_amount_eur: number | null;
  effective_status: string;
}

interface TodayAttendance {
  id: string;
  guest_name: string | null;
  profiles: { full_name: string; avatar_url: string | null } | null;
  schedule_classes: { title: string; start_time: string } | null;
}

export function AdminHomePage() {
  const currentMonth = getLocalMonthYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [prevRows, setPrevRows] = useState<PrevMonthlyRow[]>([]);
  const [pastDueHistory, setPastDueHistory] = useState<PastDueRow[]>([]);
  const [todayList, setTodayList] = useState<TodayAttendance[]>([]);
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);
  const [disciplineStats, setDisciplineStats] = useState<DisciplineStat[]>([]);
  const [classRankings, setClassRankings] = useState<ClassRanking[]>([]);
  const [guestsThisMonth, setGuestsThisMonth] = useState(0);
  const [newSignupsThisMonth, setNewSignupsThisMonth] = useState(0);
  const [inactiveStudents, setInactiveStudents] = useState<InactiveStudent[]>([]);
  const [lowCreditSubs, setLowCreditSubs] = useState<LowCreditSub[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [alertTab, setAlertTab] = useState<'inactive' | 'credits' | 'grace' | 'legal'>('inactive');
  const [loading, setLoading] = useState(true);
  // Cobrado en el mes (criterio de caja, hora de Madrid): definición única en src/lib/finance.ts
  const [cashMonth, setCashMonth] = useState<CashMonth | null>(null);
  const [cashError, setCashError] = useState(false);

  useEffect(() => {
    let alive = true;
    setCashMonth(null);
    setCashError(false);
    getCashMonth(selectedMonth).then(
      (c) => alive && setCashMonth(c),
      () => alive && setCashError(true)
    );
    return () => {
      alive = false;
    };
  }, [selectedMonth]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      const todayStr = getLocalDateISO();
      const prevMonth = getPrevMonthYear(selectedMonth);
      const { start: monthStart, nextStart: nextMonthStart } = getMonthBounds(selectedMonth);

      const [
        monthlyRes,
        prevMonthlyRes,
        pastDueRes,
        studentsRes,
        attendanceRes,
        clientsRes,
        signTasks,
        discRes,
        monthAttRes,
        lastAttRes,
        lowCreditRes,
      ] = await Promise.all([
        supabase
          .from('v_monthly_payment_status')
          .select('user_id, full_name, plan_name, price_eur, paid_amount_eur, payment_method, effective_status')
          .eq('month_year', selectedMonth),
        supabase
          .from('v_monthly_payment_status')
          .select('price_eur, paid_amount_eur, effective_status')
          .eq('month_year', prevMonth),
        supabase
          .from('v_monthly_payment_status')
          .select('user_id, full_name, month_year, plan_name, price_eur')
          .eq('effective_status', 'PAST_DUE')
          .lt('month_year', currentMonth)
          .order('month_year', { ascending: false }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'client')
          .eq('status', 'active'),
        supabase
          .from('attendances')
          .select('id, guest_name, profiles:user_id(full_name, avatar_url), schedule_classes(title, start_time)')
          .eq('attendance_date', todayStr)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select(
            'id, full_name, belt, status, birth_date, created_at, first_training_at, father_name, mother_name, emergency_contact_phone'
          )
          .eq('role', 'client')
          .in('status', ['active', 'paused']),
        fetchSignatureTasksByUser(),
        supabase
          .from('disciplines')
          .select('id, name')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('attendances')
          .select(
            'user_id, guest_name, attendance_date, discipline_id, schedule_class_id, schedule_classes(id, title, day_of_week, start_time, coach_name, discipline_id)'
          )
          .gte('attendance_date', monthStart)
          .lt('attendance_date', nextMonthStart),
        supabase
          .from('attendances')
          .select('user_id, attendance_date')
          .not('user_id', 'is', null)
          .order('attendance_date', { ascending: false })
          .limit(2000),
        supabase
          .from('subscriptions')
          .select('id, remaining_credits, profiles:user_id(full_name), plans!inner(name, is_class_pack, pack_credits)')
          .eq('month_year', selectedMonth)
          .eq('status', 'active')
          .eq('plans.is_class_pack', true)
          .lte('remaining_credits', 2),
      ]);

      setRows((monthlyRes.data as MonthlyRow[]) ?? []);
      setPrevRows((prevMonthlyRes.data as PrevMonthlyRow[]) ?? []);
      setPastDueHistory((pastDueRes.data as PastDueRow[]) ?? []);
      setActiveStudentsCount(studentsRes.count ?? 0);
      setTodayList((attendanceRes.data as unknown as TodayAttendance[]) ?? []);

      const clients =
        (clientsRes.data as {
          id: string;
          full_name: string;
          belt: string | null;
          status: string;
          birth_date: string | null;
          created_at: string;
          first_training_at: string | null;
          father_name: string | null;
          mother_name: string | null;
          emergency_contact_phone: string | null;
        }[]) ?? [];

      const legalList: ComplianceAlert[] = [];
      let pendingDocUsers = 0;
      clients.forEach((c) => {
        const reasons: string[] = [];
        const pendingSign = countPendingSignatures(signTasks[c.id]);
        if (pendingSign > 0) {
          pendingDocUsers += 1;
          reasons.push(`${pendingSign} firma(s) pendiente(s)`);
        }
        if (isMinorAge(c.birth_date)) {
          const hasParent = Boolean(c.father_name?.trim() || c.mother_name?.trim());
          if (!hasParent) reasons.push('Menor sin nombre de padre/madre');
          if (!c.emergency_contact_phone?.trim()) reasons.push('Sin teléfono emergencia');
        }
        if (reasons.length > 0) {
          legalList.push({ id: c.id, fullName: c.full_name, reasons });
        }
      });
      setPendingDocsCount(pendingDocUsers);
      setComplianceAlerts(legalList);

      const signupsCount = clients.filter((c) => {
        const createdDay = c.created_at.slice(0, 10);
        return createdDay >= monthStart && createdDay < nextMonthStart;
      }).length;
      setNewSignupsThisMonth(signupsCount);

      const discList = (discRes.data as { id: string; name: string }[]) ?? [];
      const discCountMap: Record<string, { attendances: number; users: Set<string> }> = {};
      discList.forEach((d) => {
        discCountMap[d.id] = { attendances: 0, users: new Set() };
      });
      const classMap: Record<
        string,
        {
          id: string;
          title: string;
          dayOfWeek: number;
          startTime: string;
          coachName: string;
          attendances: number;
          dates: Set<string>;
        }
      > = {};
      let guestCount = 0;

      type MonthAttRow = {
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
      };
      ((monthAttRes.data as unknown as MonthAttRow[]) ?? []).forEach((a) => {
        if (!a.user_id && a.guest_name) guestCount += 1;
        const sc = Array.isArray(a.schedule_classes) ? a.schedule_classes[0] : a.schedule_classes;
        const discId = a.discipline_id ?? sc?.discipline_id ?? null;
        if (discId && discCountMap[discId]) {
          discCountMap[discId].attendances += 1;
          if (a.user_id) discCountMap[discId].users.add(a.user_id);
        }
        if (sc) {
          if (!classMap[sc.id]) {
            classMap[sc.id] = {
              id: sc.id,
              title: sc.title,
              dayOfWeek: sc.day_of_week,
              startTime: sc.start_time,
              coachName: sc.coach_name,
              attendances: 0,
              dates: new Set(),
            };
          }
          classMap[sc.id].attendances += 1;
          classMap[sc.id].dates.add(a.attendance_date);
        }
      });

      setGuestsThisMonth(guestCount);
      setDisciplineStats(
        discList
          .map((d) => ({
            id: d.id,
            name: d.name,
            attendances: discCountMap[d.id]?.attendances ?? 0,
            uniqueStudents: discCountMap[d.id]?.users.size ?? 0,
          }))
          .sort((a, b) => b.attendances - a.attendances)
      );
      setClassRankings(
        Object.values(classMap)
          .map((c) => ({
            id: c.id,
            title: c.title,
            dayOfWeek: c.dayOfWeek,
            startTime: c.startTime,
            coachName: c.coachName,
            attendances: c.attendances,
            sessions: c.dates.size,
          }))
          .sort((a, b) => b.attendances - a.attendances)
      );

      const lastAttMap: Record<string, string> = {};
      ((lastAttRes.data as { user_id: string | null; attendance_date: string }[]) ?? []).forEach((a) => {
        if (!a.user_id || lastAttMap[a.user_id]) return;
        lastAttMap[a.user_id] = a.attendance_date;
      });
      const inactive = clients
        .filter((c) => c.status === 'active')
        .map((c) => {
          const lastAtt = lastAttMap[c.id] ?? null;
          const refDate = lastAtt ?? (c.first_training_at ?? c.created_at).slice(0, 10);
          const daysInactive = daysBetweenISO(refDate, todayStr);
          return {
            id: c.id,
            full_name: c.full_name,
            belt: c.belt ?? null,
            lastAttendance: lastAtt,
            daysInactive,
          };
        })
        .filter((item) => item.daysInactive > 15)
        .sort((a, b) => b.daysInactive - a.daysInactive);
      // El cinturón solo se muestra si su tarifa de este mes es de BJJ o Grappling
      const withBelt = await usersWithBeltThisMonth(
        inactive.map((i) => i.id),
        currentMonth
      );
      setInactiveStudents(inactive.map((i) => ({ ...i, belt: withBelt.has(i.id) ? i.belt : null })));

      type LowCreditRow = {
        id: string;
        remaining_credits: number | null;
        profiles: { full_name: string } | { full_name: string }[] | null;
        plans: { name: string; pack_credits: number | null } | { name: string; pack_credits: number | null }[];
      };
      const lowSubs: LowCreditSub[] = ((lowCreditRes.data as unknown as LowCreditRow[]) ?? []).map(
        (row) => {
          const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
          return {
            id: row.id,
            userName: prof?.full_name ?? 'Alumno',
            planName: plan?.name ?? 'Bono',
            remaining: row.remaining_credits ?? 0,
            total: plan?.pack_credits ?? 8,
          };
        }
      );
      setLowCreditSubs(lowSubs);

      setLoading(false);
    };

    loadDashboard();
  }, [selectedMonth, currentMonth]);

  const paidRows = rows.filter(
    (r) => r.effective_status === 'OK' || r.effective_status === 'ADVANCE_OK'
  );
  const pendingRows = rows.filter(
    (r) =>
      r.effective_status !== 'OK' &&
      r.effective_status !== 'ADVANCE_OK' &&
      r.effective_status !== 'FUTURE_UPCOMING'
  );
  const overdueRows = rows.filter(
    (r) => r.effective_status === 'NOK_OVERDUE' || r.effective_status === 'PAST_DUE'
  );
  const graceRows = rows.filter((r) => r.effective_status === 'GRACE_7_DAYS');

  const totalCollected = paidRows.reduce(
    (sum, r) => sum + Number(r.paid_amount_eur ?? r.price_eur ?? 0),
    0
  );
  const totalPending = pendingRows.reduce((sum, r) => sum + Number(r.price_eur || 0), 0);

  const prevPaidRows = prevRows.filter(
    (r) => r.effective_status === 'OK' || r.effective_status === 'ADVANCE_OK'
  );
  const prevCollected = prevPaidRows.reduce(
    (sum, r) => sum + Number(r.paid_amount_eur ?? r.price_eur ?? 0),
    0
  );
  const momPct =
    prevCollected > 0 ? Math.round(((totalCollected - prevCollected) / prevCollected) * 100) : null;
  const arpu = paidRows.length > 0 ? totalCollected / paidRows.length : 0;

  // Desglose por método de lo cobrado en el mes (por fecha de cobro, no por mes de la cuota)
  const cashCollected = cashMonth?.total ?? 0;
  const cashTotal = cashMonth?.cash ?? 0;
  const bizumTotal = cashMonth?.bizum ?? 0;
  const otherMethodTotal = cashMonth?.other ?? 0;
  const historicalDebtTotal = pastDueHistory.reduce((sum, r) => sum + Number(r.price_eur || 0), 0);
  // Moroso = alumno que debe el mes actual fuera de plazo O algún mes anterior (mismo criterio que el alumno ve).
  const debtorCount = new Set([
    ...overdueRows.map((r) => r.user_id),
    ...pastDueHistory.map((r) => r.user_id),
  ]).size;
  const overdueThisMonthTotal = overdueRows.reduce((sum, r) => sum + Number(r.price_eur || 0), 0);

  // Agrupación de cuotas por programa
  const byProgram = rows.reduce<Record<string, { total: number; paid: number }>>((acc, r) => {
    if (!acc[r.plan_name]) acc[r.plan_name] = { total: 0, paid: 0 };
    acc[r.plan_name].total += 1;
    if (r.effective_status === 'OK' || r.effective_status === 'ADVANCE_OK') {
      acc[r.plan_name].paid += 1;
    }
    return acc;
  }, {});

  const totalMonthAttendances = disciplineStats.reduce((sum, d) => sum + d.attendances, 0);
  const totalExpected = totalCollected + totalPending;
  const collectionRate =
    totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const ringRadius = 24;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (collectionRate / 100) * ringCircumference;

  return (
    <div className="space-y-6">
      <PageHeader
        title={formatMonthLong(selectedMonth)}
        actions={
          <>
          <div className="flex items-center gap-2 rounded-xl studio-panel-inset border border-white/10 px-3 py-1.5">
            <Calendar className="w-4 h-4 text-studio-red shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              aria-label="Seleccionar mes"
              className="bg-transparent text-xs font-semibold text-white rounded"
            />
            {selectedMonth !== currentMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonth)}
                className="text-[11px] text-studio-red-text hover:underline ml-1"
              >
                Hoy
              </button>
            )}
          </div>
          <Link
            to="/admin/seguimiento"
            className="inline-flex items-center justify-center rounded-xl studio-btn px-4 py-2.5 text-sm font-semibold text-white transition"
          >
            Ir a Cobros
          </Link>
          </>
        }
      />

      {pendingDocsCount > 0 && (
        <div className="rounded-3xl border border-amber-500/40 bg-amber-500/15 text-amber-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileWarning className="w-5 h-5 text-amber-300 shrink-0" />
            <p className="text-xs sm:text-sm">
              <strong>{pendingDocsCount}</strong> alumno(s) con documentos de la academia pendientes
              de firma.
            </p>
          </div>
          <Link
            to="/admin/alumnos"
            className="inline-flex items-center justify-center rounded-xl studio-panel-inset border border-amber-400/30 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-amber-200 shrink-0 transition"
          >
            Revisar en BBDD Personal
          </Link>
        </div>
      )}

      {/* 4 KPIs Principales con MoM, ARPU y Deuda */}
      <div className="studio-stagger grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Cuotas cobradas"
          icon={CheckCircle2}
          accent="emerald"
          loading={loading}
          value={formatEUR(totalCollected)}
          delta={<DeltaBadge value={momPct} />}
          footnote={`${paidRows.length} cobradas · ARPU ${formatEUR(arpu)}`}
        />
        <KpiCard
          label="Pendiente del mes"
          icon={CreditCard}
          accent="amber"
          loading={loading}
          value={formatEUR(totalPending)}
          valueClassName={totalPending > 0 ? 'text-amber-300' : 'text-white'}
          footnote={`${pendingRows.length} alumnos · ${graceRows.length} en plazo 7 d`}
        />
        <KpiCard
          label="Morosos"
          icon={AlertTriangle}
          accent="red"
          loading={loading}
          value={debtorCount}
          valueClassName={debtorCount > 0 ? 'text-rose-400' : 'text-white'}
          footnote={
            <>
              Deben{' '}
              <strong className="text-slate-200">
                {formatEUR(historicalDebtTotal + overdueThisMonthTotal)}
              </strong>{' '}
              · {formatEUR(historicalDebtTotal)} de meses anteriores
            </>
          }
        />
        <KpiCard
          label="Alumnos activos"
          icon={Users}
          accent="sky"
          loading={loading}
          value={activeStudentsCount}
          footnote={`+${newSignupsThisMonth} altas · ${guestsThisMonth} invitados este mes`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cuotas por Programa + Anillo de tasa de cobro */}
        <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-headline text-lg uppercase tracking-wide text-white">
                Cuotas por Programa
              </h2>
              <p className="text-xs text-slate-400">Efectividad de cobro del mes</p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60" aria-hidden="true">
                  <circle
                    cx="30"
                    cy="30"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="5.5"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r={ringRadius}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="transition-[stroke-dashoffset] duration-500"
                  />
                </svg>
                <span className="absolute font-headline text-xs text-white">{collectionRate}%</span>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : Object.keys(byProgram).length === 0 ? (
            <p className="text-sm text-slate-400">
              Aún no hay suscripciones generadas para {formatMonthLong(selectedMonth)}.
            </p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(byProgram).map(([planName, stats]) => {
                const ratio = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;
                return (
                  <div
                    key={planName}
                    className="rounded-2xl studio-panel-inset px-4 py-3 border border-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white truncate">{planName}</span>
                      <span className="text-xs font-semibold text-slate-300 shrink-0">
                        {stats.paid} / {stats.total} pagadas ({ratio}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full w-full origin-left bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-transform duration-500"
                        style={{ transform: `scaleX(${ratio / 100})` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* En el tatami hoy */}
        <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-lg uppercase tracking-wide text-white">
              En el tatami hoy ({todayList.length})
            </h2>
            <UserPlus className="w-4 h-4 text-slate-400" />
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : todayList.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no se ha pasado lista hoy.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {todayList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl studio-panel-inset px-3.5 py-2.5 border border-white/5"
                >
                  <span className="text-sm text-white font-medium">
                    {item.profiles?.full_name ?? `${item.guest_name} (Invitado)`}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.schedule_classes?.title} ({item.schedule_classes?.start_time?.slice(0, 5)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Analítica mensual, Ranking de Clases y Caja */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Desglose de Caja: Efectivo vs Bizum */}
          <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" /> Cobrado por Método de Pago
              </h2>
              {cashMonth && (
                <span className="text-xs text-slate-400">
                  {formatEURExact(cashCollected)} cobrados en el mes
                </span>
              )}
            </div>

            {cashError ? (
              <p className="text-sm text-amber-200">
                No se ha podido calcular lo cobrado en {formatMonthLong(selectedMonth)}. Revisa la conexión y recarga.
              </p>
            ) : !cashMonth ? (
              <div className="h-3 rounded-full studio-panel-inset studio-shimmer" aria-label="Cargando" />
            ) : cashCollected === 0 ? (
              <p className="text-sm text-slate-400">Sin cobros registrados en {formatMonthLong(selectedMonth)}.</p>
            ) : (
              <>
                <div className="w-full h-3 rounded-full studio-panel-inset overflow-hidden flex border border-white/5">
                  {cashTotal > 0 && (
                    <div
                      title={`Efectivo: ${formatEURExact(cashTotal)}`}
                      className="h-full bg-emerald-500"
                      style={{ width: `${(cashTotal / cashCollected) * 100}%` }}
                    />
                  )}
                  {bizumTotal > 0 && (
                    <div
                      title={`Bizum: ${formatEURExact(bizumTotal)}`}
                      className="h-full bg-sky-500"
                      style={{ width: `${(bizumTotal / cashCollected) * 100}%` }}
                    />
                  )}
                  {otherMethodTotal > 0 && (
                    <div
                      title={`Otros: ${formatEURExact(otherMethodTotal)}`}
                      className="h-full bg-slate-500"
                      style={{ width: `${(otherMethodTotal / cashCollected) * 100}%` }}
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Efectivo
                    </span>
                    <p className="font-headline text-lg text-white mt-0.5">{formatEURExact(cashTotal)}</p>
                  </div>
                  <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-sky-500" /> Bizum
                    </span>
                    <p className="font-headline text-lg text-white mt-0.5">{formatEURExact(bizumTotal)}</p>
                  </div>
                  <div className="rounded-2xl studio-panel-inset border border-white/5 p-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-500" /> Otros
                    </span>
                    <p className="font-headline text-lg text-white mt-0.5">
                      {formatEURExact(otherMethodTotal)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Ocupación por Disciplina */}
          <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-studio-red" /> Ocupación por Disciplina
              </h2>
              <span className="text-xs text-slate-400">
                {totalMonthAttendances} {totalMonthAttendances === 1 ? 'asistencia' : 'asistencias'}
              </span>
            </div>
            {loading ? (
              <p className="text-sm text-slate-400">Cargando...</p>
            ) : disciplineStats.length === 0 ? (
              <p className="text-sm text-slate-400">Sin disciplinas activas configuradas.</p>
            ) : (
              <div className="space-y-3">
                {disciplineStats.map((d) => {
                  const pct =
                    totalMonthAttendances > 0
                      ? Math.round((d.attendances / totalMonthAttendances) * 100)
                      : 0;
                  return (
                    <div key={d.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-white font-medium truncate">{d.name}</span>
                        <span className="text-xs text-slate-300 shrink-0">
                          {d.attendances} {d.attendances === 1 ? 'clase' : 'clases'} · {d.uniqueStudents}{' '}
                          {d.uniqueStudents === 1 ? 'alumno' : 'alumnos'} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full studio-panel-inset overflow-hidden border border-white/5">
                        <div
                          className="h-full w-full origin-left bg-gradient-to-r from-studio-cream/60 to-studio-cream transition-transform duration-500 rounded-full"
                          style={{ transform: `scaleX(${pct / 100})` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Ranking de Franjas Horarias */}
        <CollapsibleCard
          title={<><TrendingUp className="w-4 h-4 text-studio-red" /> Ranking de Clases del Mes</>}
          meta={classRankings.length > 0 ? `${classRankings.length} clases` : undefined}
          className="rounded-3xl studio-panel border border-white/10 self-start"
        >
          <Link to="/admin/horarios" className="text-xs text-studio-red-text hover:underline">
            Ver horarios
          </Link>
          {loading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : classRankings.length === 0 ? (
            <p className="text-sm text-slate-400">Sin asistencias registradas en {formatMonthLong(selectedMonth)}.</p>
          ) : (
            <div className="space-y-2.5 max-h-[26rem] overflow-y-auto pr-1">
              {classRankings.map((cls, idx) => {
                const maxAtt = classRankings[0]?.attendances || 1;
                const barPct = Math.round((cls.attendances / maxAtt) * 100);
                const avg = cls.sessions > 0 ? (cls.attendances / cls.sessions).toFixed(1) : '0';
                return (
                  <div
                    key={cls.id}
                    className="rounded-2xl studio-panel-inset border border-white/5 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          <span className="text-studio-cream mr-1.5">#{idx + 1}</span>
                          {cls.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {DAY_LABELS[cls.dayOfWeek] ?? ''} {cls.startTime.slice(0, 5)} · Prof.{' '}
                          {cls.coachName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-white">{cls.attendances} asist.</p>
                        <p className="text-[11px] text-slate-400">{avg} media/sesión</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-studio-cream/60 to-studio-cream rounded-full"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleCard>
      </div>

      {/* Centro de Alertas Accionables Unificado */}
      <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" /> Centro de Alertas y Seguimiento
            </h2>
            <p className="text-xs text-slate-400">
              Retención, renovación de bonos, cobros en gracia y cumplimiento legal
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'inactive' as const, label: 'Inactivos +15d', count: inactiveStudents.length, icon: Clock },
              { id: 'credits' as const, label: 'Bonos ≤2', count: lowCreditSubs.length, icon: Ticket },
              { id: 'grace' as const, label: 'Gracia 7d / Deuda', count: graceRows.length + pastDueHistory.length, icon: CreditCard },
              { id: 'legal' as const, label: 'Legal / Menores', count: complianceAlerts.length, icon: FileWarning },
            ].map(({ id, label, count, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAlertTab(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  alertTab === id
                    ? 'bg-studio-cream border-studio-cream text-slate-950'
                    : 'studio-panel-inset border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    alertTab === id ? 'bg-slate-950/15 text-slate-950' : 'bg-white/10 text-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando alertas...</p>
        ) : alertTab === 'inactive' ? (
          inactiveStudents.length === 0 ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Todos tus alumnos activos han entrenado en los últimos 15 días!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {inactiveStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 rounded-2xl studio-panel-inset px-3.5 py-2.5 border border-white/5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{student.full_name}</p>
                    <p className="text-xs text-slate-400">
                      {student.belt ? `Cinturón ${student.belt} · ` : ''}
                      {student.lastAttendance
                        ? `Última clase: ${new Date(`${student.lastAttendance}T00:00:00`).toLocaleDateString('es-ES')}`
                        : 'Sin asistencias registradas'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Hace {student.daysInactive} d
                  </span>
                </div>
              ))}
            </div>
          )
        ) : alertTab === 'credits' ? (
          lowCreditSubs.length === 0 ? (
            <p className="text-sm text-slate-400">No hay bonos de clases por agotarse en {formatMonthLong(selectedMonth)}.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {lowCreditSubs.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 rounded-2xl studio-panel-inset px-3.5 py-2.5 border border-white/5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{sub.userName}</p>
                    <p className="text-xs text-slate-400">{sub.planName}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      sub.remaining === 0
                        ? 'bg-studio-red/20 text-red-200 border-studio-red/40'
                        : 'bg-sky-500/15 text-sky-200 border-sky-400/30'
                    }`}
                  >
                    {sub.remaining} / {sub.total} créditos
                  </span>
                </div>
              ))}
            </div>
          )
        ) : alertTab === 'grace' ? (
          graceRows.length === 0 && pastDueHistory.length === 0 ? (
            <p className="text-sm text-slate-400">Sin alumnos en ventana de gracia ni deuda previa.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {graceRows.map((g) => (
                <div
                  key={`grace-${g.user_id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl studio-panel-inset px-3.5 py-2.5 border border-amber-500/20"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{g.full_name}</p>
                    <p className="text-xs text-slate-400">
                      {g.plan_name} · {formatEUR(Number(g.price_eur))}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Plazo 7 días
                  </span>
                </div>
              ))}
              {pastDueHistory.map((pd) => (
                <div
                  key={`past-${pd.user_id}-${pd.month_year}`}
                  className="flex items-center justify-between gap-3 rounded-2xl studio-panel-inset px-3.5 py-2.5 border border-studio-red/25"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{pd.full_name}</p>
                    <p className="text-xs text-slate-400">
                      {pd.plan_name} ({pd.month_year})
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-studio-red/20 text-red-200 border border-studio-red/40">
                    -{formatEUR(Number(pd.price_eur))}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : complianceAlerts.length === 0 ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Toda la escuela está al día en firmas y datos de menores.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {complianceAlerts.map((al) => (
              <div
                key={al.id}
                className="flex items-center justify-between gap-3 rounded-2xl studio-panel-inset px-3.5 py-2.5 border border-white/5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{al.fullName}</p>
                  <p className="text-xs text-amber-300 truncate">{al.reasons.join(' · ')}</p>
                </div>
                <Link
                  to="/admin/alumnos"
                  className="shrink-0 text-xs font-semibold text-studio-red-text hover:underline"
                >
                  Revisar
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

