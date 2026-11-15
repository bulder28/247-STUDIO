import { useEffect, useId, useRef, useState } from 'react';
import { X, CalendarPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatEURExact } from '@/lib/format';
import { shiftMonth } from '@/lib/finance';
import { formatMonthLabel, isPaidStatus, rowAmount, type PaymentRow } from './types';

interface PaymentEvent {
  id: number;
  action: 'insert' | 'update' | 'delete';
  month_year: string | null;
  old_row: { status?: string; amount_eur?: number; payment_method?: string | null } | null;
  new_row: { status?: string; amount_eur?: number; payment_method?: string | null } | null;
  changed_by: string | null;
  changed_at: string;
}

function describeEvent(e: PaymentEvent): string | null {
  const was = e.old_row?.status;
  const now = e.new_row?.status;
  const amount = e.new_row?.amount_eur ?? e.old_row?.amount_eur;
  const money = amount != null ? ` · ${formatEURExact(Number(amount))}` : '';
  const method = e.new_row?.payment_method ? ` (${e.new_row.payment_method})` : '';
  if (now === 'paid_ok' && was !== 'paid_ok') return `Cobro registrado${method}${money}`;
  if (was === 'paid_ok' && now !== 'paid_ok') return `Cobro deshecho${money}`;
  if (e.action === 'delete') return `Pago borrado${money}`;
  return null; // cambios menores (notas, etc.)
}

const cellTone: Record<string, string> = {
  paid: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  advance: 'bg-teal-500/20 text-teal-200 border-teal-500/40',
  due: 'bg-studio-red/20 text-red-200 border-studio-red/50',
  pending: 'bg-amber-500/15 text-amber-100 border-amber-500/40',
  none: 'bg-white/[0.03] text-slate-400 border-white/10',
};

/** Ficha de cobros de un alumno: últimos meses, pagos y quién cobró o deshizo cada uno. */
export function StudentLedger({
  userId,
  allRows,
  currentMonth,
  onClose,
  onMultiple,
}: {
  userId: string;
  allRows: PaymentRow[];
  currentMonth: string;
  onClose: () => void;
  onMultiple: (userId: string) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const rows = allRows.filter((r) => r.user_id === userId);
  const latest = [...rows].sort((a, b) => b.month_year.localeCompare(a.month_year))[0];
  const [events, setEvents] = useState<(PaymentEvent & { who: string | null })[] | null>(null);
  const [eventsError, setEventsError] = useState(false);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('payment_events')
        .select('id, action, month_year, old_row, new_row, changed_by, changed_at')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false })
        .limit(30);
      if (!alive) return;
      if (error) {
        setEventsError(true);
        return;
      }
      const list = (data ?? []) as PaymentEvent[];
      const ids = [...new Set(list.map((e) => e.changed_by).filter((x): x is string => Boolean(x)))];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        for (const p of profs ?? []) names.set(p.id as string, p.full_name as string);
      }
      if (alive) setEvents(list.map((e) => ({ ...e, who: e.changed_by ? names.get(e.changed_by) ?? null : null })));
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  // Tira de meses: 6 anteriores, el actual y 2 siguientes
  const strip = Array.from({ length: 9 }, (_, i) => shiftMonth(currentMonth, i - 6)).map((ym) => {
    const r = rows.find((x) => x.month_year === ym);
    let tone = 'none';
    let label = 'Sin cuota';
    if (r) {
      if (r.effective_status === 'ADVANCE_OK') [tone, label] = ['advance', 'Adelantado'];
      else if (isPaidStatus(r.effective_status)) [tone, label] = ['paid', 'Pagado'];
      else if (r.effective_status === 'PAST_DUE' || r.effective_status === 'NOK_OVERDUE') [tone, label] = ['due', 'Sin pagar'];
      else if (r.effective_status === 'FUTURE_UPCOMING') [tone, label] = ['none', 'Próximo'];
      else [tone, label] = ['pending', 'Pendiente'];
    }
    return { ym, tone, label, row: r };
  });

  const paidRows = rows
    .filter((r) => isPaidStatus(r.effective_status))
    .sort((a, b) => b.month_year.localeCompare(a.month_year));
  const owed = rows.filter((r) => r.month_year <= currentMonth && !isPaidStatus(r.effective_status) && r.effective_status !== 'FUTURE_UPCOMING');
  const owedTotal = owed.reduce((s, r) => s + Number(r.price_eur || 0), 0);

  const visibleEvents = (events ?? [])
    .map((e) => ({ e, text: describeEvent(e) }))
    .filter((x): x is { e: PaymentEvent & { who: string | null }; text: string } => Boolean(x.text));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex justify-end"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full sm:max-w-md h-full overflow-y-auto overscroll-contain bg-[#2b313b] border-l border-white/10 shadow-modal p-5 sm:p-6 space-y-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-headline text-2xl uppercase text-white leading-tight">
              {latest?.full_name ?? 'Alumno'}
            </h2>
            {latest && (
              <p className="text-sm text-slate-300 mt-1">
                {latest.plan_name} · {formatEURExact(Number(latest.price_eur || 0))}/mes
                {latest.is_founder ? ' · Socio fundador (−10 %)' : ''}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha"
            className="grid place-items-center w-11 h-11 -mr-2 rounded-xl text-slate-300 hover:bg-white/10 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`rounded-2xl p-4 border ${owed.length ? 'border-studio-red/50 bg-studio-red/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}
        >
          <p className={`text-sm font-semibold ${owed.length ? 'text-red-100' : 'text-emerald-100'}`}>
            {owed.length
              ? `Debe ${formatEURExact(owedTotal)} · ${owed.map((r) => formatMonthLabel(r.month_year)).join(', ')}`
              : 'Al corriente'}
          </p>
          <button
            type="button"
            onClick={() => onMultiple(userId)}
            className="mt-3 min-h-[44px] inline-flex items-center gap-1.5 rounded-xl studio-btn px-4 text-sm font-semibold text-white"
          >
            <CalendarPlus className="w-4 h-4" aria-hidden /> {owed.length ? 'Cobrar lo pendiente' : 'Cobrar meses por adelantado'}
          </button>
        </div>

        <section aria-labelledby={`${titleId}-strip`}>
          <h3 id={`${titleId}-strip`} className="text-sm font-semibold text-slate-200 mb-2">
            Últimos meses
          </h3>
          <ol className="grid grid-cols-3 gap-2">
            {strip.map((s) => (
              <li
                key={s.ym}
                className={`rounded-xl border px-2.5 py-2 text-xs ${cellTone[s.tone]} ${s.ym === currentMonth ? 'ring-2 ring-white/40' : ''}`}
              >
                <span className="block font-semibold">{formatMonthLabel(s.ym)}</span>
                <span className="block">{s.label}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby={`${titleId}-paid`}>
          <h3 id={`${titleId}-paid`} className="text-sm font-semibold text-slate-200 mb-2">
            Pagos
          </h3>
          {paidRows.length === 0 ? (
            <p className="text-sm text-slate-400">Sin pagos registrados.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/10">
              {paidRows.map((r) => (
                <li key={r.month_year} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="text-white">{formatMonthLabel(r.month_year)}</span>
                  <span className="text-slate-300 text-xs text-right">
                    {r.paid_at ? new Date(r.paid_at).toLocaleDateString('es-ES') : 'sin fecha'}
                    {r.payment_method ? ` · ${r.payment_method}` : ''}
                  </span>
                  <span className="text-white tabular-nums">{formatEURExact(rowAmount(r))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby={`${titleId}-hist`}>
          <h3 id={`${titleId}-hist`} className="text-sm font-semibold text-slate-200 mb-2">
            Historial de cambios
          </h3>
          {eventsError ? (
            <p className="text-sm text-amber-200">No se ha podido cargar el historial.</p>
          ) : events === null ? (
            <p className="text-sm text-slate-400" aria-busy="true">
              Cargando…
            </p>
          ) : visibleEvents.length === 0 ? (
            <p className="text-sm text-slate-400">Sin cambios registrados desde que se activó el historial.</p>
          ) : (
            <ul className="space-y-2">
              {visibleEvents.map(({ e, text }) => (
                <li key={e.id} className="text-sm">
                  <span className="text-white">{text}</span>
                  <span className="block text-xs text-slate-400">
                    {e.month_year ? `${formatMonthLabel(e.month_year)} · ` : ''}
                    {new Date(e.changed_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    {` · ${e.who ?? 'sistema'}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
