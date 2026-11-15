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
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportWorkbook } from '@/lib/excel';
import { getLocalDateISO, getLocalMonthYear } from '@/lib/dateUtils';
import { fetchAllRows, getCashMonth, type CashMonth } from '@/lib/finance';
import { formatEURExact } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';

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
  is_founder?: boolean;
  month_year: string;
  plan_id: string;
  plan_name: string;
  base_price_eur?: number;
  price_eur: number;
  recorded_payment_status: 'paid_ok' | 'pending_nok' | null;
  paid_at: string | null;
  effective_status: EffectiveStatus;
  payment_method: string | null;
  paid_amount_eur: number | null;
  payment_notes: string | null;
}

interface StudentLatestPlan {
  user_id: string;
  full_name: string;
  is_founder?: boolean;
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
  const currentMonth = useMemo(() => getLocalMonthYear(), []);
  // Admite ?mes=YYYY-MM (enlace "Ver cobros" desde Finanzas)
  const [monthYear, setMonthYear] = useState(() => {
    const m = new URLSearchParams(window.location.search).get('mes');
    return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : currentMonth;
  });
  const [tab, setTab] = useState<'person' | 'product'>('person');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'future'>('all');

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [allMemberStatuses, setAllMemberStatuses] = useState<PaymentRow[]>([]);
  const [cashMonth, setCashMonth] = useState<CashMonth | null>(null);
  const [cashError, setCashError] = useState(false);
  // Historial de todos los meses incompleto: los avisos de meses pendientes no serían fiables
  const [historyError, setHistoryError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
  const [paidDate, setPaidDate] = useState(() => getLocalDateISO());
  const [savingMulti, setSavingMulti] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadTracking = useCallback(async () => {
    setLoading(true);
    // Caja del mes: definición única en hora de Madrid (src/lib/finance.ts)
    const cashPromise = getCashMonth(monthYear).then(
      (c) => ({ ok: true as const, c }),
      () => ({ ok: false as const, c: null })
    );

    const [monthRes, allRes, cashRes] = await Promise.all([
      supabase
        .from('v_monthly_payment_status')
        .select('*')
        .eq('month_year', monthYear)
        .order('full_name'),
      // Todas las páginas: con muchos alumnos y meses supera el límite de 1.000 filas
      fetchAllRows<PaymentRow>((from, to) =>
        supabase
          .from('v_monthly_payment_status')
          .select('*')
          .order('month_year', { ascending: true })
          .order('user_id', { ascending: true })
          .range(from, to)
      ).then(
        (r) => ({ ok: true as const, r }),
        () => ({ ok: false as const, r: [] as PaymentRow[] })
      ),
      cashPromise,
    ]);

    const monthRows = (monthRes.data as PaymentRow[]) ?? [];
    const allRows = allRes.r;
    setHistoryError(!allRes.ok);

    setRows(monthRows);
    setAllMemberStatuses(allRows);
    setCashMonth(cashRes.c);
    setCashError(!cashRes.ok);

    // Construir catálogo único de alumnos con su tarifa más reciente
    const map = new Map<string, StudentLatestPlan>();
    for (const r of allRows) {
      map.set(r.user_id, {
        user_id: r.user_id,
        full_name: r.full_name,
        is_founder: Boolean(r.is_founder),
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
    setActionError(null);
    const { error } =
      status === 'paid_ok'
        ? await supabase.from('payments').upsert(
            {
              user_id: row.user_id,
              month_year: monthYear,
              amount_eur: row.price_eur,
              status,
              payment_method: method ?? 'Bizum',
              paid_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,month_year' }
          )
        : // Deshacer: no se toca el importe; el cobro original queda en el historial (payment_events)
          await supabase
            .from('payments')
            .update({ status: 'pending_nok', paid_at: null, payment_method: null })
            .eq('user_id', row.user_id)
            .eq('month_year', monthYear);

    if (error) {
      setActionError(
        `${row.full_name}: ${error.message || 'no se ha podido guardar el cambio.'} Se ha recargado la lista.`
      );
    }
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
    setPaidDate(getLocalDateISO());
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

    // No volver a cobrar un mes ya cobrado: pisaría la fecha y el importe reales
    const alreadyPaid = selectedMonths.filter((ym) =>
      allMemberStatuses.some(
        (r) =>
          r.user_id === selectedStudent.user_id &&
          r.month_year === ym &&
          isPaidStatus(r.effective_status)
      )
    );
    if (alreadyPaid.length > 0) {
      setModalError(
        `${alreadyPaid.map(formatMonthLabel).join(', ')} ya está cobrado. Deshaz ese cobro antes de registrarlo de nuevo.`
      );
      return;
    }

    const todayISO = getLocalDateISO();
    if (!paidDate || paidDate > todayISO) {
      setModalError('La fecha de cobro no puede ser futura.');
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
      // Hoy: hora exacta. Otro día: mediodía local, para que caiga en su mes en hora de Madrid
      const paidAtIso =
        paidDate === todayISO
          ? new Date().toISOString()
          : new Date(`${paidDate}T12:00:00`).toISOString();

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
            <AlertTriangle className="w-3.5 h-3.5" /> Cuota pendiente (+7d)
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
            <AlertTriangle className="w-3.5 h-3.5" /> Cuota pendiente
          </span>
        );
    }
  };

  const handleExportExcel = () => {
    const statusLabel = (s: EffectiveStatus) => {
      if (s === 'OK') return 'Pagado';
      if (s === 'ADVANCE_OK') return 'Adelantado';
      if (s === 'FUTURE_UPCOMING') return 'Próximo';
      if (s === 'GRACE_7_DAYS') return 'En gracia (7 días)';
      if (s === 'PAST_DUE' || s === 'NOK_OVERDUE') return 'Vencido / Impgado';
      return 'Pendiente';
    };

    const detailRows = filteredRows.map((r) => ({
      Alumno: r.full_name,
      Mes: r.month_year,
      Tarifa: r.plan_name,
      Importe_EUR: Number(r.price_eur || 0),
      Pagado_EUR: r.paid_amount_eur != null ? Number(r.paid_amount_eur) : isPaidStatus(r.effective_status) ? Number(r.price_eur || 0) : 0,
      Estado: statusLabel(r.effective_status),
      Metodo_pago: r.payment_method ?? '',
      Fecha_pago: r.paid_at ? r.paid_at.slice(0, 10) : '',
      Socio_fundador: r.is_founder ? 'Sí' : 'No',
      Notas: r.payment_notes ?? '',
    }));

    const summaryRows = Object.entries(byProduct).map(([planName, stats]) => ({
      Tarifa: planName,
      Alumnos: stats.count,
      Pagados: stats.paid,
      Pendientes: stats.count - stats.paid,
      Cobrado_EUR: stats.amount,
    }));

    exportWorkbook(`cobros_247_${monthYear}.xlsx`, [
      { name: 'Cobros', rows: detailRows },
      { name: 'Resumen_Tarifas', rows: summaryRows },
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seguimiento"
        subtitle={<>Cuotas pendientes, próximos vencimientos, pagos adelantados y lo cobrado en el mes (Efectivo / Bizum).</>}
        actions={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredRows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/10 disabled:opacity-50 px-3 py-2 text-xs font-medium text-slate-200"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Exportar Excel
              </button>
              <button
                onClick={generateMonthFromPrevious}
                disabled={generating}
                title="Copiar suscripciones activas del mes anterior"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                Generar mes
              </button>
              <button
                onClick={() => openMultiModal()}
                disabled={studentsCatalog.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl studio-btn disabled:opacity-50 px-3.5 py-2 text-xs font-semibold text-white transition"
              >
                <CalendarPlus className="w-4 h-4" />
                Cobrar varios meses
              </button>
            </div>
          </>
        }
      />

      {(historyError || actionError) && (
        <div role="alert" className="rounded-2xl border border-amber-500/50 bg-amber-500/15 text-amber-100 p-4 text-sm space-y-1">
          {historyError && (
            <p>
              No se ha podido cargar el historial completo de cuotas. Los avisos de meses pendientes y
              adelantados pueden estar incompletos: recarga antes de cobrar varios meses.
            </p>
          )}
          {actionError && <p>{actionError}</p>}
        </div>
      )}

      {/* Resumen económico del mes vs Caja real */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl studio-panel border border-white/10 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Cuotas de {formatMonthLabel(monthYear)}
          </p>
          <p className="mt-1 font-headline text-2xl text-emerald-400">
            {formatEURExact(monthQuotaPaidTotal)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {rows.filter((r) => isPaidStatus(r.effective_status)).length} de {rows.length} alumnos cubiertos
          </p>
        </div>

        <div className="rounded-2xl studio-panel border border-white/10 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Cuotas pendientes ({formatMonthLabel(monthYear)})
          </p>
          <p className="mt-1 font-headline text-2xl text-amber-300">
            {formatEURExact(monthPendingTotal)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {rows.filter((r) => isUnpaidOverdue(r.effective_status)).length} alumnos por cobrar
          </p>
        </div>

        <div className="rounded-2xl studio-panel border border-white/10 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
            <span>Cobrado en {formatMonthLabel(monthYear)}</span>
            <Wallet className="w-4 h-4 text-sky-400" />
          </div>
          {cashError ? (
            <p className="mt-2 text-sm text-amber-200">
              No se ha podido calcular lo cobrado. Revisa la conexión y recarga.
            </p>
          ) : !cashMonth ? (
            <p className="mt-1 font-headline text-2xl text-slate-500" aria-label="Cargando">…</p>
          ) : (
            <>
              <p className="mt-1 font-headline text-2xl text-white">{formatEURExact(cashMonth.total)}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Bizum: {formatEURExact(cashMonth.bizum)} · Efectivo: {formatEURExact(cashMonth.cash)}
                {cashMonth.other > 0 ? ` · Otros: ${formatEURExact(cashMonth.other)}` : ''}
              </p>
              {cashMonth.advance > 0 && (
                <p className="text-xs text-sky-300 mt-0.5">
                  {formatEURExact(cashMonth.advance)} son cuotas de meses siguientes
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs Por Persona / Por Producto */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('person')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === 'person'
                ? 'bg-studio-cream text-slate-950'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Por Persona ({rows.length})
          </button>
          <button
            onClick={() => setTab('product')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === 'product'
                ? 'bg-studio-cream text-slate-950'
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Por Producto / Tarifa
          </button>
        </div>

        {tab === 'person' && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Cuotas pendientes' },
              { id: 'paid', label: 'OK / Adelantados' },
              { id: 'future', label: 'Próximo vencimiento' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === f.id
                    ? 'bg-white/15 text-white'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
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
        <div className="rounded-2xl studio-panel border border-white/10 overflow-hidden">
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
                        {r.is_founder && (
                          <span
                            title="Socio Fundador (-10%)"
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30"
                          >
                            SF
                          </span>
                        )}
                        {info && info.overdueCount > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-studio-red/20 text-red-300">
                            {info.overdueCount} cuotas pendientes
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
            <div key={planName} className="rounded-2xl studio-panel border border-white/10 p-5">
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
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl studio-panel border border-white/15 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-headline text-xl uppercase text-white">
                  Cobrar Varios Meses
                </h2>
                <p className="text-xs text-slate-400">
                  Selecciona cuotas pendientes y/o meses futuros por adelantado en un solo cobro.
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
                  className="w-full rounded-xl studio-panel-inset border border-white/15 px-3.5 py-2.5 text-sm text-white"
                >
                  {studentsCatalog.map((s) => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.full_name} {s.is_founder ? '[SF] ' : ''}— {s.plan_name} ({s.price_eur.toFixed(0)} €/mes)
                    </option>
                  ))}
                </select>
              </div>

              {/* Bloque 1: Facturas pendientes (Vencidos / Actual) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Cuotas pendientes (vencidas / mes actual)
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
                      className="text-xs text-studio-red-text hover:underline font-medium"
                    >
                      Seleccionar todos los vencidos
                    </button>
                  )}
                </div>

                {overdueMonthsForModal.length === 0 ? (
                  <p className="text-xs text-slate-400 rounded-xl bg-studio-navy-deep/70 px-3 py-2.5">
                    Este alumno no tiene cuotas pendientes hasta {formatMonthLabel(currentMonth)}.
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
                              : 'border-white/10 studio-panel-inset text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <p className="text-xs font-semibold">{formatMonthLabel(m.month_year)}</p>
                          <p className="text-[11px] text-amber-300">Cuota pendiente</p>
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
                              : 'border-white/10 studio-panel-inset text-slate-300 hover:border-white/25'
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
                            : 'border-white/10 studio-panel-inset text-slate-300'
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
                    className="w-full rounded-xl studio-field px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="multi-paid-date"
                  className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5"
                >
                  Fecha de cobro
                </label>
                <input
                  id="multi-paid-date"
                  type="date"
                  value={paidDate}
                  max={getLocalDateISO()}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="w-full rounded-xl studio-field px-3.5 py-2 text-sm text-white"
                />
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
                  className="w-full rounded-xl studio-field px-3.5 py-2 text-sm text-white"
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
