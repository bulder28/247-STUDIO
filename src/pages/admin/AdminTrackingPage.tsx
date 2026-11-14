import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  CalendarPlus,
  CalendarClock,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type EffectiveStatus =
  | 'OK'
  | 'ADVANCE_OK'
  | 'FUTURE_UPCOMING'
  | 'PAST_DUE'
  | 'NOK_OVERDUE'
  | 'GRACE_7_DAYS'
  | 'PENDING';

type PaymentMethod = 'Efectivo' | 'Bizum';

interface PaymentRow {
  user_id: string;
  full_name: string;
  member_status: string;
  month_year: string;
  plan_id: string;
  plan_name: string;
  price_eur: number;
  recorded_payment_status: 'paid_ok' | 'pending_nok' | null;
  paid_at: string | null;
  effective_status: EffectiveStatus;
  payment_method: string | null;
  paid_amount_eur: number | null;
  payment_notes: string | null;
}

interface CashPaymentRecord {
  amount_eur: number;
  payment_method: string | null;
}

interface StudentLatestPlan {
  user_id: string;
  full_name: string;
  plan_id: string;
  plan_name: string;
  price_eur: number;
}

const MONTH_NAMES_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTH_NAMES_ES[m - 1]} ${y}`;
}

function addMonths(ym: string, offset: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isUnpaidOverdue(status: EffectiveStatus): boolean {
  return (
    status === 'PAST_DUE' ||
    status === 'NOK_OVERDUE' ||
    status === 'GRACE_7_DAYS' ||
    status === 'PENDING'
  );
}

function isPaidStatus(status: EffectiveStatus): boolean {
  return status === 'OK' || status === 'ADVANCE_OK';
}

export function AdminTrackingPage() {
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [monthYear, setMonthYear] = useState(currentMonth);
  const [tab, setTab] = useState<'person' | 'product'>('person');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'future'>('all');

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [allMemberStatuses, setAllMemberStatuses] = useState<PaymentRow[]>([]);
  const [cashPayments, setCashPayments] = useState<CashPaymentRecord[]>([]);
  const [studentsCatalog, setStudentsCatalog] = useState<StudentLatestPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Modal de cobro múltiple (Vencidos + Futuros)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUserId, setModalUserId] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bizum');
  const [totalAmountInput, setTotalAmountInput] = useState('');
  const [customAmountTouched, setCustomAmountTouched] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [savingMulti, setSavingMulti] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadTracking = useCallback(async () => {
    setLoading(true);
    const nextMonthStart = `${addMonths(monthYear, 1)}-01T00:00:00.000Z`;
    const monthStart = `${monthYear}-01T00:00:00.000Z`;

    const [monthRes, allRes, cashRes] = await Promise.all([
      supabase
        .from('v_monthly_payment_status')
        .select('*')
        .eq('month_year', monthYear)
        .order('full_name'),
      supabase
        .from('v_monthly_payment_status')
        .select('*')
        .order('month_year', { ascending: true }),
      supabase
        .from('payments')
        .select('amount_eur, payment_method')
        .eq('status', 'paid_ok')
        .gte('paid_at', monthStart)
        .lt('paid_at', nextMonthStart),
    ]);

    const monthRows = (monthRes.data as PaymentRow[]) ?? [];
    const allRows = (allRes.data as PaymentRow[]) ?? [];

    setRows(monthRows);
    setAllMemberStatuses(allRows);
    setCashPayments((cashRes.data as CashPaymentRecord[]) ?? []);

    // Construir catálogo único de alumnos con su tarifa más reciente
    const map = new Map<string, StudentLatestPlan>();
    for (const r of allRows) {
      map.set(r.user_id, {
        user_id: r.user_id,
        full_name: r.full_name,
        plan_id: r.plan_id,
        plan_name: r.plan_name,
        price_eur: Number(r.price_eur || 0),
      });
    }
    setStudentsCatalog(
      Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name))
    );
    setLoading(false);
  }, [monthYear]);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  // Resumen por alumno de facturas pendientes y cobertura futura
  const studentSummaryMap = useMemo(() => {
    const summary: Record<string, { overdueCount: number; maxAdvanceMonth: string | null }> = {};
    for (const r of allMemberStatuses) {
      if (!summary[r.user_id]) {
        summary[r.user_id] = { overdueCount: 0, maxAdvanceMonth: null };
      }
      if (isUnpaidOverdue(r.effective_status) && r.month_year <= currentMonth) {
        summary[r.user_id].overdueCount += 1;
      }
      if (r.effective_status === 'ADVANCE_OK') {
        const prev = summary[r.user_id].maxAdvanceMonth;
        if (!prev || r.month_year > prev) {
          summary[r.user_id].maxAdvanceMonth = r.month_year;
        }
      }
    }
    return summary;
  }, [allMemberStatuses, currentMonth]);

  const markSinglePayment = async (
    row: PaymentRow,
    status: 'paid_ok' | 'pending_nok',
    method?: PaymentMethod
  ) => {
    await supabase.from('payments').upsert(
      {
        user_id: row.user_id,
        month_year: monthYear,
        amount_eur: row.price_eur,
        status,
        payment_method: status === 'paid_ok' ? method ?? 'Bizum' : null,
        paid_at: status === 'paid_ok' ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,month_year' }
    );
    await loadTracking();
  };

  const generateMonthFromPrevious = async () => {
    setGenerating(true);
    const prevMonthYear = addMonths(monthYear, -1);

    const { data: prevSubs } = await supabase
      .from('subscriptions')
      .select('user_id, plan_id, profiles!inner(status)')
      .eq('month_year', prevMonthYear)
      .eq('status', 'active')
      .eq('profiles.status', 'active');

    if (prevSubs && prevSubs.length > 0) {
      await supabase.from('subscriptions').upsert(
        prevSubs.map((s) => ({
          user_id: s.user_id,
          plan_id: s.plan_id,
          month_year: monthYear,
          status: 'active',
        })),
        { onConflict: 'user_id,month_year', ignoreDuplicates: true }
      );
    }
    await loadTracking();
    setGenerating(false);
  };

  // --- Lógica del Modal de Cobro Múltiple ---
  const selectedStudent = useMemo(
    () => studentsCatalog.find((s) => s.user_id === modalUserId) ?? null,
    [studentsCatalog, modalUserId]
  );

  const studentRowsAllMonths = useMemo(
    () => allMemberStatuses.filter((r) => r.user_id === modalUserId),
    [allMemberStatuses, modalUserId]
  );

  const overdueMonthsForModal = useMemo(() => {
    const unpaid = studentRowsAllMonths
      .filter((r) => r.month_year <= currentMonth && isUnpaidOverdue(r.effective_status))
      .map((r) => ({
        month_year: r.month_year,
        status: r.effective_status,
        price_eur: Number(r.price_eur || 0),
      }));

    // Si el mes visto actualmente es <= currentMonth y el alumno aún no tiene suscripción, lo incluimos
    if (
      monthYear <= currentMonth &&
      !studentRowsAllMonths.some((r) => r.month_year === monthYear) &&
      selectedStudent
    ) {
      unpaid.push({
        month_year: monthYear,
        status: 'PENDING',
        price_eur: selectedStudent.price_eur,
      });
    }
    return unpaid.sort((a, b) => a.month_year.localeCompare(b.month_year));
  }, [studentRowsAllMonths, currentMonth, monthYear, selectedStudent]);

  const futureMonthsForModal = useMemo(() => {
    const list: { month_year: string; status: EffectiveStatus }[] = [];
    for (let i = 1; i <= 12; i += 1) {
      const ym = addMonths(currentMonth, i);
      const existing = studentRowsAllMonths.find((r) => r.month_year === ym);
      list.push({
        month_year: ym,
        status: existing ? existing.effective_status : 'FUTURE_UPCOMING',
      });
    }
    return list;
  }, [currentMonth, studentRowsAllMonths]);

  const openMultiModal = (userId?: string) => {
    const targetId = userId ?? studentsCatalog[0]?.user_id ?? '';
    setModalUserId(targetId);
    setPaymentMethod('Bizum');
    setCustomAmountTouched(false);
    setPaymentNotes('');
    setModalError(null);

    // Preseleccionar los meses vencidos de ese alumno si los tiene, o el mes visualizado
    const targetRows = allMemberStatuses.filter((r) => r.user_id === targetId);
    const due = targetRows
      .filter((r) => r.month_year <= currentMonth && isUnpaidOverdue(r.effective_status))
      .map((r) => r.month_year);

    if (due.length > 0) {
      setSelectedMonths(due);
    } else if (!targetRows.some((r) => r.month_year === monthYear && isPaidStatus(r.effective_status))) {
      setSelectedMonths([monthYear]);
    } else {
      setSelectedMonths([]);
    }
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen || customAmountTouched || !selectedStudent) return;
    const total = selectedMonths.length * Number(selectedStudent.price_eur || 0);
    setTotalAmountInput(total > 0 ? total.toFixed(2) : '');
  }, [modalOpen, selectedMonths, selectedStudent, customAmountTouched]);

  const toggleMonthSelection = (ym: string) => {
    setSelectedMonths((prev) =>
      prev.includes(ym) ? prev.filter((m) => m !== ym) : [...prev, ym].sort()
    );
  };

  const selectNextMonths = (count: number) => {
    const unpaidFuture = futureMonthsForModal
      .filter((m) => m.status !== 'ADVANCE_OK')
      .slice(0, count)
      .map((m) => m.month_year);

    setSelectedMonths((prev) => {
      const set = new Set(prev);
      // También incluir mes actual si está pendiente
      const cur = studentRowsAllMonths.find((r) => r.month_year === currentMonth);
      if (!cur || !isPaidStatus(cur.effective_status)) {
        set.add(currentMonth);
      }
      unpaidFuture.forEach((m) => set.add(m));
      return Array.from(set).sort();
    });
  };

  const handleSaveMultiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || selectedMonths.length === 0) {
      setModalError('Selecciona al menos un mes para cobrar.');
      return;
    }

    const totalEur = Number(totalAmountInput.replace(',', '.'));
    if (Number.isNaN(totalEur) || totalEur < 0) {
      setModalError('Introduce un importe total válido.');
      return;
    }

    setSavingMulti(true);
    setModalError(null);

    try {
      const sortedMonths = [...selectedMonths].sort();

      // 1. Asegurar suscripción activa en cada mes seleccionado
      const subPayloads = sortedMonths.map((ym) => ({
        user_id: selectedStudent.user_id,
        plan_id: selectedStudent.plan_id,
        month_year: ym,
        status: 'active',
      }));

      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert(subPayloads, { onConflict: 'user_id,month_year', ignoreDuplicates: true });

      if (subError) throw subError;

      // 2. Repartir el total exacto en céntimos entre los meses cubiertos
      const n = sortedMonths.length;
      const totalCents = Math.round(totalEur * 100);
      const baseCents = Math.floor(totalCents / n);
      const remainderCents = totalCents - baseCents * n;
      const paidAtIso = new Date().toISOString();

      const autoNote =
        n > 1
          ? `Cobro múltiple (${n} meses: ${formatMonthLabel(sortedMonths[0])} – ${formatMonthLabel(
              sortedMonths[n - 1]
            )})`
          : 'Pago mensual';
      const finalNotes = paymentNotes.trim() ? `${autoNote} · ${paymentNotes.trim()}` : autoNote;

      const payPayloads = sortedMonths.map((ym, idx) => {
        const cents = idx === n - 1 ? baseCents + remainderCents : baseCents;
        return {
          user_id: selectedStudent.user_id,
          month_year: ym,
          amount_eur: Number((cents / 100).toFixed(2)),
          status: 'paid_ok' as const,
          payment_method: paymentMethod,
          paid_at: paidAtIso,
          notes: finalNotes,
        };
      });

      const { error: payError } = await supabase
        .from('payments')
        .upsert(payPayloads, { onConflict: 'user_id,month_year' });

      if (payError) throw payError;

      setModalOpen(false);
      await loadTracking();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error guardando cobro múltiple.');
    } finally {
      setSavingMulti(false);
    }
  };

  // --- Cálculos de resumen y filtrado ---
  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    if (statusFilter === 'pending') return rows.filter((r) => isUnpaidOverdue(r.effective_status));
    if (statusFilter === 'paid') return rows.filter((r) => isPaidStatus(r.effective_status));
    return rows.filter((r) => r.effective_status === 'FUTURE_UPCOMING');
  }, [rows, statusFilter]);

  const monthQuotaPaidTotal = rows
    .filter((r) => isPaidStatus(r.effective_status))
    .reduce((sum, r) => sum + Number(r.paid_amount_eur ?? r.price_eur ?? 0), 0);

  const monthPendingTotal = rows
    .filter((r) => isUnpaidOverdue(r.effective_status))
    .reduce((sum, r) => sum + Number(r.price_eur || 0), 0);

  const cashTotal = cashPayments.reduce((sum, p) => sum + Number(p.amount_eur || 0), 0);
  const cashEfectivo = cashPayments
    .filter((p) => p.payment_method === 'Efectivo')
    .reduce((sum, p) => sum + Number(p.amount_eur || 0), 0);
  const cashBizum = cashPayments
    .filter((p) => p.payment_method === 'Bizum')
    .reduce((sum, p) => sum + Number(p.amount_eur || 0), 0);

  const byProduct = rows.reduce<Record<string, { count: number; paid: number; amount: number }>>(
    (acc, r) => {
      if (!acc[r.plan_name]) acc[r.plan_name] = { count: 0, paid: 0, amount: 0 };
      acc[r.plan_name].count += 1;
      if (isPaidStatus(r.effective_status)) {
        acc[r.plan_name].paid += 1;
        acc[r.plan_name].amount += Number(r.paid_amount_eur ?? r.price_eur ?? 0);
      }
      return acc;
    },
    {}
  );

  const badgeFor = (status: EffectiveStatus) => {
    switch (status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pago OK
          </span>
        );
      case 'ADVANCE_OK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300">
            <CalendarPlus className="w-3.5 h-3.5" /> Pago adelantado
          </span>
        );
      case 'FUTURE_UPCOMING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300">
            <CalendarClock className="w-3.5 h-3.5" /> Próximo vencimiento
          </span>
        );
      case 'NOK_OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-studio-red/20 text-red-300">
            <AlertTriangle className="w-3.5 h-3.5" /> Factura pendiente (+7d)
          </span>
        );
      case 'GRACE_7_DAYS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300">
            <Clock className="w-3.5 h-3.5" /> En plazo 7 días
          </span>
        );
      case 'PAST_DUE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" /> Factura pendiente
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
            Seguimiento Mensual
          </h1>
          <p className="text-sm text-slate-400">
            Facturas pendientes, próximos vencimientos, pagos adelantados y caja real (Efectivo / Bizum).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="rounded-xl bg-studio-navy border border-white/10 px-3 py-2 text-sm text-white"
          />
          <button
            onClick={generateMonthFromPrevious}
            disabled={generating}
            title="Copiar suscripciones activas del mes anterior"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-studio-navy px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            Generar mes
          </button>
          <button
            onClick={() => openMultiModal()}
            disabled={studentsCatalog.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-studio-red hover:bg-studio-red-dark disabled:opacity-50 px-3.5 py-2 text-xs font-semibold text-white transition"
          >
            <CalendarPlus className="w-4 h-4" />
            Cobrar varios meses
          </button>
        </div>
      </div>

      {/* Resumen económico del mes vs Caja real */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-studio-navy border border-white/10 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Cuotas de {formatMonthLabel(monthYear)}
          </p>
          <p className="mt-1 font-headline text-2xl text-emerald-400">
            {monthQuotaPaidTotal.toFixed(2).replace(/\.00$/, '')} €
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {rows.filter((r) => isPaidStatus(r.effective_status)).length} de {rows.length} alumnos cubiertos
          </p>
        </div>

        <div className="rounded-2xl bg-studio-navy border border-white/10 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Facturas pendientes ({formatMonthLabel(monthYear)})
          </p>
          <p className="mt-1 font-headline text-2xl text-amber-300">
            {monthPendingTotal.toFixed(2).replace(/\.00$/, '')} €
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {rows.filter((r) => isUnpaidOverdue(r.effective_status)).length} alumnos por cobrar
          </p>
        </div>

        <div className="rounded-2xl bg-studio-navy border border-white/10 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
            <span>Caja real entrada en {formatMonthLabel(monthYear)}</span>
            <Wallet className="w-4 h-4 text-sky-400" />
          </div>
          <p className="mt-1 font-headline text-2xl text-white">
            {cashTotal.toFixed(2).replace(/\.00$/, '')} €
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Bizum: {cashBizum.toFixed(0)} € · Efectivo: {cashEfectivo.toFixed(0)} €
          </p>
        </div>
      </div>

      {/* Tabs Por Persona / Por Producto */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('person')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === 'person'
                ? 'bg-studio-red text-white'
                : 'bg-studio-navy text-slate-300 hover:text-white'
            }`}
          >
            Por Persona ({rows.length})
          </button>
          <button
            onClick={() => setTab('product')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === 'product'
                ? 'bg-studio-red text-white'
                : 'bg-studio-navy text-slate-300 hover:text-white'
            }`}
          >
            Por Producto / Tarifa
          </button>
        </div>

        {tab === 'person' && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Facturas pendientes' },
              { id: 'paid', label: 'OK / Adelantados' },
              { id: 'future', label: 'Próximo vencimiento' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === f.id
                    ? 'bg-white/15 text-white'
                    : 'bg-studio-navy text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando seguimiento...</p>
      ) : tab === 'person' ? (
        <div className="rounded-2xl bg-studio-navy border border-white/10 overflow-hidden">
          {filteredRows.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">
              No hay registros en {formatMonthLabel(monthYear)} para este filtro. Puedes usar
              &quot;Generar mes&quot; o &quot;Cobrar varios meses&quot;.
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredRows.map((r) => {
                const paid = isPaidStatus(r.effective_status);
                const info = studentSummaryMap[r.user_id];
                const shownPrice =
                  paid && r.paid_amount_eur != null ? Number(r.paid_amount_eur) : Number(r.price_eur);

                return (
                  <div
                    key={r.user_id}
                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{r.full_name}</p>
                        {info && info.overdueCount > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-studio-red/20 text-red-300">
                            {info.overdueCount} facturas pendientes
                          </span>
                        )}
                        {info?.maxAdvanceMonth && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/15 text-teal-300">
                            Cubierto hasta {formatMonthLabel(info.maxAdvanceMonth)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {r.plan_name} · {shownPrice.toFixed(2).replace(/\.00$/, '')} €
                        {paid && r.payment_method ? ` · ${r.payment_method}` : ''}
                        {r.payment_notes ? ` · ${r.payment_notes}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {badgeFor(r.effective_status)}

                      {paid ? (
                        <button
                          onClick={() => markSinglePayment(r, 'pending_nok')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-300 hover:bg-white/10 transition"
                        >
                          Deshacer pago
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => markSinglePayment(r, 'paid_ok', 'Bizum')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
                          >
                            Bizum
                          </button>
                          <button
                            onClick={() => markSinglePayment(r, 'paid_ok', 'Efectivo')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition"
                          >
                            Efectivo
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => openMultiModal(r.user_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/15 text-slate-200 hover:bg-white/10 transition"
                      >
                        Varios meses
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(byProduct).map(([planName, stats]) => (
            <div key={planName} className="rounded-2xl bg-studio-navy border border-white/10 p-5">
              <h3 className="font-headline text-xl uppercase text-white">{planName}</h3>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-sm text-slate-300">
                  {stats.paid} de {stats.count} alumnos cubiertos
                </span>
                <span className="font-headline text-2xl text-emerald-400">
                  {stats.amount.toFixed(0)} €
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Cobro múltiple (Pagos Vencidos + Pagos Futuros Adelantados) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-studio-navy border border-white/15 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-headline text-xl uppercase text-white">
                  Cobrar Varios Meses
                </h2>
                <p className="text-xs text-slate-400">
                  Selecciona facturas pendientes y/o meses futuros por adelantado en un solo cobro.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMultiPayment} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">
                  Alumno
                </label>
                <select
                  value={modalUserId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setModalUserId(nextId);
                    setCustomAmountTouched(false);
                    const due = allMemberStatuses
                      .filter(
                        (r) =>
                          r.user_id === nextId &&
                          r.month_year <= currentMonth &&
                          isUnpaidOverdue(r.effective_status)
                      )
                      .map((r) => r.month_year);
                    setSelectedMonths(due.length > 0 ? due : [currentMonth]);
                  }}
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/15 px-3.5 py-2.5 text-sm text-white"
                >
                  {studentsCatalog.map((s) => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.full_name} — {s.plan_name} ({s.price_eur.toFixed(0)} €/mes)
                    </option>
                  ))}
                </select>
              </div>

              {/* Bloque 1: Facturas pendientes (Vencidos / Actual) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Facturas pendientes (vencidos / mes actual)
                  </span>
                  {overdueMonthsForModal.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedMonths((prev) =>
                          Array.from(
                            new Set([...prev, ...overdueMonthsForModal.map((m) => m.month_year)])
                          ).sort()
                        )
                      }
                      className="text-xs text-studio-red hover:underline font-medium"
                    >
                      Seleccionar todos los vencidos
                    </button>
                  )}
                </div>

                {overdueMonthsForModal.length === 0 ? (
                  <p className="text-xs text-slate-400 rounded-xl bg-studio-navy-deep/70 px-3 py-2.5">
                    Este alumno no tiene facturas pendientes hasta {formatMonthLabel(currentMonth)}.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {overdueMonthsForModal.map((m) => {
                      const active = selectedMonths.includes(m.month_year);
                      return (
                        <button
                          key={m.month_year}
                          type="button"
                          onClick={() => toggleMonthSelection(m.month_year)}
                          className={`rounded-xl border px-3 py-2 text-left transition ${
                            active
                              ? 'border-studio-red bg-studio-red/20 text-white'
                              : 'border-white/10 bg-studio-navy-deep text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <p className="text-xs font-semibold">{formatMonthLabel(m.month_year)}</p>
                          <p className="text-[11px] text-amber-300">Factura pendiente</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bloque 2: Meses futuros (Próximo vencimiento / Adelantados) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                    Pagos futuros (por adelantado)
                  </span>
                  <div className="flex gap-1.5 text-[11px]">
                    {[3, 6, 12].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => selectNextMonths(n)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold"
                      >
                        +{n} meses
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedMonths([])}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {futureMonthsForModal.map((m) => {
                    const active = selectedMonths.includes(m.month_year);
                    const alreadyPaid = m.status === 'ADVANCE_OK';
                    return (
                      <button
                        key={m.month_year}
                        type="button"
                        disabled={alreadyPaid}
                        onClick={() => toggleMonthSelection(m.month_year)}
                        className={`rounded-xl border px-2.5 py-2 text-left transition ${
                          alreadyPaid
                            ? 'border-teal-500/30 bg-teal-500/10 text-teal-300 opacity-75 cursor-not-allowed'
                            : active
                              ? 'border-emerald-400 bg-emerald-500/20 text-white'
                              : 'border-white/10 bg-studio-navy-deep text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <p className="text-xs font-semibold">{formatMonthLabel(m.month_year)}</p>
                        <p className="text-[10px] opacity-80">
                          {alreadyPaid ? 'Pago adelantado' : 'Próx. vencimiento'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Método de pago (Solo Efectivo o Bizum) + Importe Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">
                    Método de pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Bizum', 'Efectivo'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                          paymentMethod === m
                            ? 'border-emerald-400 bg-emerald-500/20 text-white'
                            : 'border-white/10 bg-studio-navy-deep text-slate-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">
                    Importe total cobrado (€) · {selectedMonths.length} mes(es)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalAmountInput}
                    onChange={(e) => {
                      setCustomAmountTouched(true);
                      setTotalAmountInput(e.target.value);
                    }}
                    placeholder="Ej. 180"
                    className="w-full rounded-xl bg-studio-navy-deep border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">
                  Nota opcional (ej. descuento trimestre)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ej. Bono trimestral con descuento"
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/15 px-3.5 py-2 text-sm text-white"
                />
              </div>

              {modalError && (
                <p className="text-xs text-red-300 bg-studio-red/20 border border-studio-red/40 rounded-xl px-3 py-2">
                  {modalError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMulti || selectedMonths.length === 0}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white transition"
                >
                  {savingMulti
                    ? 'Guardando...'
                    : `Confirmar cobro (${selectedMonths.length} ${
                        selectedMonths.length === 1 ? 'mes' : 'meses'
                      })`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
