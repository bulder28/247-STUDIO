import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CreditCard, AlertTriangle, UserPlus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLocalDateISO, getLocalMonthYear } from '@/lib/dateUtils';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      const todayStr = getLocalDateISO();

      const [monthlyRes, studentsRes, attendanceRes] = await Promise.all([
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
      ]);

      setRows((monthlyRes.data as MonthlyRow[]) ?? []);
      setActiveStudentsCount(studentsRes.count ?? 0);
      setTodayList((attendanceRes.data as unknown as TodayAttendance[]) ?? []);
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
    </div>
  );
}

