import { useEffect, useState } from 'react';
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
  Ticket,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLocalDateISO, getLocalMonthYear, isMinorAge } from '@/lib/dateUtils';
import { countPendingSignatures, fetchSignatureTasksByUser } from '@/lib/studentDocuments';
import { formatEUR, formatMonthLong } from '@/lib/format';
import { useAmountsHidden } from '@/lib/privacy';
import { usersWithBeltThisMonth } from '@/lib/belts';
import { daysLeft, packState, type ClassPack } from '@/lib/classPacks';
import { DeltaBadge, KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';

interface InactiveStudent {
  id: string;
  full_name: string;
  belt: string | null;
  lastAttendance: string | null;
  daysInactive: number;
}

interface PackAlert {
  id: string;
  userName: string;
  planName: string;
  remaining: number;
  total: number;
  daysToExpire: number;
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

interface MonthlyRow {
  user_id: string;
  full_name: string;
  plan_name: string;
  price_eur: number;
  paid_amount_eur: number | null;
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

export function AdminHomePage() {
  useAmountsHidden(); // repinta los importes al pulsar el ojo
  const currentMonth = getLocalMonthYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [prevRows, setPrevRows] = useState<PrevMonthlyRow[]>([]);
  const [pastDueHistory, setPastDueHistory] = useState<PastDueRow[]>([]);
  const [todayList, setTodayList] = useState<TodayAttendance[]>([]);
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [newSignupsThisMonth, setNewSignupsThisMonth] = useState(0);
  const [inactiveStudents, setInactiveStudents] = useState<InactiveStudent[]>([]);
  const [packAlerts, setPackAlerts] = useState<PackAlert[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [alertTab, setAlertTab] = useState<'inactive' | 'credits' | 'grace' | 'legal'>('inactive');
  const [loading, setLoading] = useState(true);

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
        lastAttRes,
        packsRes,
      ] = await Promise.all([
        supabase
          .from('v_monthly_payment_status')
          .select('user_id, full_name, plan_name, price_eur, paid_amount_eur, effective_status')
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
          .from('attendances')
          .select('user_id, attendance_date')
          .not('user_id', 'is', null)
          .order('attendance_date', { ascending: false })
          .limit(2000),
        supabase
          .from('class_packs')
          .select('id, user_id, total_credits, remaining_credits, starts_on, expires_on, profiles!user_id(full_name), plans(name)')
          .gte('expires_on', todayStr)
          .order('expires_on', { ascending: true }),
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
      clients.forEach((c) => {
        const reasons: string[] = [];
        const pendingSign = countPendingSignatures(signTasks[c.id]);
        if (pendingSign > 0) {
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
      setComplianceAlerts(legalList);

      const signupsCount = clients.filter((c) => {
        const createdDay = c.created_at.slice(0, 10);
        return createdDay >= monthStart && createdDay < nextMonthStart;
      }).length;
      setNewSignupsThisMonth(signupsCount);

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

      const withBelt = await usersWithBeltThisMonth(
        inactive.map((i) => i.id),
        currentMonth
      );
      setInactiveStudents(inactive.map((i) => ({ ...i, belt: withBelt.has(i.id) ? i.belt : null })));

      const packs = (packsRes.data as unknown as ClassPack[]) ?? [];
      const lowPacks: PackAlert[] = packs
        .filter((p) => {
          const st = packState(p, todayStr);
          if (st !== 'active') return false;
          return p.remaining_credits <= 2 || daysLeft(p.expires_on, todayStr) <= 15;
        })
        .map((p) => ({
          id: p.id,
          userName: p.profiles?.full_name ?? 'Alumno',
          planName: p.plans?.name ?? 'Bono de clases',
          remaining: p.remaining_credits,
          total: p.total_credits,
          daysToExpire: daysLeft(p.expires_on, todayStr),
        }));
      setPackAlerts(lowPacks);

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

  const prevCollected = prevRows
    .filter((r) => r.effective_status === 'OK' || r.effective_status === 'ADVANCE_OK')
    .reduce((sum, r) => sum + Number(r.paid_amount_eur ?? r.price_eur ?? 0), 0);
  const momPct =
    prevCollected > 0 ? Math.round(((totalCollected - prevCollected) / prevCollected) * 100) : null;

  const historicalDebtTotal = pastDueHistory.reduce((sum, r) => sum + Number(r.price_eur || 0), 0);
  const debtorCount = new Set([
    ...overdueRows.map((r) => r.user_id),
    ...pastDueHistory.map((r) => r.user_id),
  ]).size;
  const overdueThisMonthTotal = overdueRows.reduce((sum, r) => sum + Number(r.price_eur || 0), 0);

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
              to="/admin/kpis"
              className="inline-flex items-center justify-center gap-1.5 min-h-11 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-200 transition"
            >
              <BarChart3 className="w-4 h-4 text-slate-300" />
              Ver KPIs
            </Link>
            <Link
              to="/admin/seguimiento"
              className="inline-flex items-center justify-center min-h-11 rounded-xl studio-btn px-4 py-2.5 text-sm font-semibold text-white transition"
            >
              Ir a Cobros
            </Link>
          </>
        }
      />

      {/* 4 KPIs operativos rápidos del mes */}
      <div className="studio-stagger grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Cuotas cobradas"
          icon={CheckCircle2}
          accent="emerald"
          loading={loading}
          value={formatEUR(totalCollected)}
          delta={<DeltaBadge value={momPct} />}
          footnote={`${paidRows.length} de ${rows.length} cuotas pagadas`}
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
              · {formatEUR(historicalDebtTotal)} anteriores
            </>
          }
        />
        <KpiCard
          label="Alumnos activos"
          icon={Users}
          accent="sky"
          loading={loading}
          value={activeStudentsCount}
          footnote={`+${newSignupsThisMonth} altas este mes`}
        />
      </div>

      {/* En el tatami hoy */}
      <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-studio-red shrink-0" />
            <h2 className="font-headline text-lg uppercase tracking-wide text-white">
              En el tatami hoy ({todayList.length})
            </h2>
          </div>
          <Link to="/admin/pasar-lista" className="text-xs font-semibold text-studio-red-text hover:underline">
            Pasar lista
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : todayList.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no se ha pasado lista hoy.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {todayList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-2xl studio-panel-inset px-3.5 py-2.5 border border-white/5"
              >
                <span className="text-sm text-white font-medium truncate">
                  {item.profiles?.full_name ?? `${item.guest_name} (Invitado)`}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {item.schedule_classes?.title} ({item.schedule_classes?.start_time?.slice(0, 5)})
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Centro de Alertas Accionables Unificado */}
      <section className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" /> Alertas y seguimiento
            </h2>
            <p className="text-xs text-slate-400">
              Retención, bonos por renovar, cobros pendientes y firmas
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'inactive' as const, label: 'Inactivos +15d', count: inactiveStudents.length, icon: Clock },
              { id: 'credits' as const, label: 'Bonos', count: packAlerts.length, icon: Ticket },
              { id: 'grace' as const, label: 'Gracia 7d / Deuda', count: graceRows.length + pastDueHistory.length, icon: CreditCard },
              { id: 'legal' as const, label: 'Firmas / Menores', count: complianceAlerts.length, icon: FileWarning },
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
          packAlerts.length === 0 ? (
            <p className="text-sm text-slate-400">No hay bonos con ≤ 2 clases ni próximos a caducar.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {packAlerts.map((pack) => (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between gap-3 rounded-2xl studio-panel-inset px-3.5 py-2.5 border border-white/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{pack.userName}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {pack.planName} ·{' '}
                        {pack.daysToExpire === 0
                          ? 'caduca hoy'
                          : `caduca en ${pack.daysToExpire} d`}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-500/15 text-amber-200 border-amber-400/30">
                      {pack.remaining} / {pack.total} clases
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <Link to="/admin/bonos" className="text-xs font-semibold text-studio-red-text hover:underline">
                  Gestionar bonos →
                </Link>
              </div>
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
