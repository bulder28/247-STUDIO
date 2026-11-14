import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CreditCard, AlertTriangle, UserPlus, CheckCircle2, FileWarning, BarChart3, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLocalDateISO, getLocalMonthYear } from '@/lib/dateUtils';
import { getDocumentCompliance, type DocSignature, type DocTemplate } from '@/lib/documents';

interface DisciplineStat {
  id: string;
  name: string;
  attendances: number;
  uniqueStudents: number;
}

interface InactiveStudent {
  id: string;
  full_name: string;
  belt: string;
  lastAttendance: string | null;
  daysInactive: number;
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
  effective_status:
  | 'OK'
  | 'ADVANCE_OK'
  | 'FUTURE_UPCOMING'
  | 'PAST_DUE'
  | 'NOK_OVERDUE'
  | 'GRACE_7_DAYS'
  | 'PENDING';
}

interface TodayAttendance {
  id: string;
  guest_name: string | null;
  profiles: { full_name: string; avatar_url: string | null } | null;
  schedule_classes: { title: string; start_time: string } | null;
}

export function AdminHomePage() {
  const currentMonth = getLocalMonthYear();
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [todayList, setTodayList] = useState<TodayAttendance[]>([]);
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);
  const [disciplineStats, setDisciplineStats] = useState<DisciplineStat[]>([]);
  const [inactiveStudents, setInactiveStudents] = useState<InactiveStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      const todayStr = getLocalDateISO();

      const [
        monthlyRes,
        studentsRes,
        attendanceRes,
        clientsRes,
        tplRes,
        sigRes,
        discRes,
        monthAttRes,
        lastAttRes,
      ] = await Promise.all([
        supabase
          .from('v_monthly_payment_status')
          .select('user_id, full_name, plan_name, price_eur, paid_amount_eur, effective_status')
          .eq('month_year', currentMonth),
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
          .select('id, full_name, belt, status, birth_date, created_at, first_training_at')
          .eq('role', 'client')
          .in('status', ['active', 'paused']),
        supabase.from('document_templates').select('*').eq('is_active', true),
        supabase
          .from('document_signatures')
          .select('user_id, template_id, template_version, signed_at'),
        supabase
          .from('disciplines')
          .select('id, name')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('attendances')
          .select('user_id, discipline_id, schedule_classes(discipline_id)')
          .gte('attendance_date', `${currentMonth}-01`),
        supabase
          .from('attendances')
          .select('user_id, attendance_date')
          .not('user_id', 'is', null)
          .order('attendance_date', { ascending: false })
          .limit(2000),
      ]);

      setRows((monthlyRes.data as MonthlyRow[]) ?? []);
      setActiveStudentsCount(studentsRes.count ?? 0);
      setTodayList((attendanceRes.data as unknown as TodayAttendance[]) ?? []);

      const templates = (tplRes.data as DocTemplate[]) ?? [];
      const sigMap: Record<string, DocSignature[]> = {};
      ((sigRes.data as DocSignature[]) ?? []).forEach((s) => {
        if (!s.user_id) return;
        if (!sigMap[s.user_id]) sigMap[s.user_id] = [];
        sigMap[s.user_id].push(s);
      });

      const clients =
        (clientsRes.data as {
          id: string;
          full_name: string;
          belt: string | null;
          status: string;
          birth_date: string | null;
          created_at: string;
          first_training_at: string | null;
        }[]) ?? [];

      const clientsWithPendingDocs = clients.filter(
        (c) => getDocumentCompliance(templates, sigMap[c.id] ?? [], c.birth_date).pending.length > 0
      ).length;
      setPendingDocsCount(clientsWithPendingDocs);

      const discList = (discRes.data as { id: string; name: string }[]) ?? [];
      const discCountMap: Record<string, { attendances: number; users: Set<string> }> = {};
      discList.forEach((d) => {
        discCountMap[d.id] = { attendances: 0, users: new Set() };
      });
      type MonthAttRow = {
        user_id: string | null;
        discipline_id: string | null;
        schedule_classes: { discipline_id: string | null } | { discipline_id: string | null }[] | null;
      };
      ((monthAttRes.data as unknown as MonthAttRow[]) ?? []).forEach((a) => {
        const sc = Array.isArray(a.schedule_classes) ? a.schedule_classes[0] : a.schedule_classes;
        const discId = a.discipline_id ?? sc?.discipline_id ?? null;
        if (!discId || !discCountMap[discId]) return;
        discCountMap[discId].attendances += 1;
        if (a.user_id) discCountMap[discId].users.add(a.user_id);
      });
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
            belt: c.belt ?? 'blanco',
            lastAttendance: lastAtt,
            daysInactive,
          };
        })
        .filter((item) => item.daysInactive > 15)
        .sort((a, b) => b.daysInactive - a.daysInactive);
      setInactiveStudents(inactive);

      setLoading(false);
    };

    loadDashboard();
  }, [currentMonth]);

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

  const totalCollected = paidRows.reduce(
    (sum, r) => sum + Number(r.paid_amount_eur ?? r.price_eur ?? 0),
    0
  );
  const totalPending = pendingRows.reduce((sum, r) => sum + Number(r.price_eur || 0), 0);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
            Resumen Mensual ({currentMonth})
          </h1>
          <p className="text-sm text-slate-400">Indicadores clave de gestión — 247 STUDIO</p>
        </div>
        <Link
          to="/admin/seguimiento"
          className="inline-flex items-center justify-center rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2 text-sm font-semibold text-white transition"
        >
          Ir a Seguimiento Mensual
        </Link>
      </div>

      {pendingDocsCount > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileWarning className="w-5 h-5 text-amber-300 shrink-0" />
            <p className="text-xs sm:text-sm">
              <strong>{pendingDocsCount}</strong> alumno(s) con documentación obligatoria pendiente
              de firma (privacidad, imagen, exención o normas).
            </p>
          </div>
          <Link
            to="/admin/alumnos"
            className="inline-flex items-center justify-center rounded-xl bg-studio-navy-deep border border-amber-400/30 hover:bg-white/5 px-3.5 py-2 text-xs font-semibold text-amber-200 shrink-0"
          >
            Revisar en BBDD Personal
          </Link>
        </div>
      )}

      {/* 4 KPIs de la Slide 15 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-studio-navy border border-white/10 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase tracking-wider">
            <span>Cuotas / Mes (OK)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-headline text-3xl text-white">
            {totalCollected.toFixed(0)} €
          </p>
          <p className="text-xs text-slate-400 mt-1">{paidRows.length} cuotas cobradas</p>
        </div>

        <div className="rounded-2xl bg-studio-navy border border-white/10 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase tracking-wider">
            <span>Pendientes / Mes</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <p className="mt-2 font-headline text-3xl text-amber-300">
            {totalPending.toFixed(0)} €
          </p>
          <p className="text-xs text-slate-400 mt-1">{pendingRows.length} alumnos sin pago</p>
        </div>

        <div className="rounded-2xl bg-studio-navy border border-white/10 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase tracking-wider">
            <span>Facturas pendientes (+7d)</span>
            <AlertTriangle className="w-4 h-4 text-studio-red" />
          </div>
          <p className="mt-2 font-headline text-3xl text-studio-red">
            {overdueRows.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Han entrenado &gt;7 días sin pagar</p>
        </div>

        <div className="rounded-2xl bg-studio-navy border border-white/10 p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase tracking-wider">
            <span>Alumnos Activos</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="mt-2 font-headline text-3xl text-white">{activeStudentsCount}</p>
          <p className="text-xs text-slate-400 mt-1">Con ficha activa en la escuela</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cuotas por Programa */}
        <section className="rounded-2xl bg-studio-navy border border-white/10 p-5">
          <h2 className="font-headline text-lg uppercase tracking-wide text-white mb-4">
            Cuotas por Programa
          </h2>
          {loading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : Object.keys(byProgram).length === 0 ? (
            <p className="text-sm text-slate-400">
              Aún no hay suscripciones generadas para {currentMonth}.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byProgram).map(([planName, stats]) => (
                <div
                  key={planName}
                  className="flex items-center justify-between rounded-xl bg-studio-navy-deep px-4 py-3 border border-white/5"
                >
                  <span className="text-sm font-medium text-white">{planName}</span>
                  <span className="text-xs font-semibold text-slate-300">
                    {stats.paid} / {stats.total} pagadas
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* En el tatami hoy */}
        <section className="rounded-2xl bg-studio-navy border border-white/10 p-5">
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
                  className="flex items-center justify-between rounded-xl bg-studio-navy-deep px-3.5 py-2.5 border border-white/5"
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

      {/* Analítica mensual y retención */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-studio-navy border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-studio-red" /> Ocupación por Disciplina
            </h2>
            <span className="text-xs text-slate-400">
              {totalMonthAttendances} {totalMonthAttendances === 1 ? 'asistencia' : 'asistencias'} este mes
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
                    <div className="w-full h-2 rounded-full bg-studio-navy-deep overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-studio-red transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-studio-navy border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Alerta de Inactividad (+15d)
            </h2>
            <div className="flex items-center gap-3">
              {inactiveStudents.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                  {inactiveStudents.length} en seguimiento
                </span>
              )}
              <Link to="/admin/alumnos" className="text-xs text-studio-red hover:underline">
                Ver alumnos
              </Link>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : inactiveStudents.length === 0 ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Todos tus alumnos activos han entrenado en los últimos 15 días!</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {inactiveStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-studio-navy-deep px-3.5 py-2.5 border border-white/5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{student.full_name}</p>
                    <p className="text-xs text-slate-400">
                      Cinturón {student.belt} ·{' '}
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
          )}
        </section>
      </div>
    </div>
  );
}

