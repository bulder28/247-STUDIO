import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, CalendarPlus, X } from 'lucide-react';
import { formatEURExact } from '@/lib/format';
import type { CashMonth } from '@/lib/finance';
import {
  formatMonthLabel,
  isPaidStatus,
  normalizeText,
  rowAmount,
  type PaymentMethod,
  type PaymentRow,
} from './types';

type Tab = 'pending' | 'paid' | 'all' | 'plans';

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric' });
}

/** Meses anteriores sin pagar de cada alumno (para avisar en su fila y en el grupo de atrasados). */
function pastDueByStudent(allRows: PaymentRow[], month: string) {
  const map = new Map<string, PaymentRow[]>();
  for (const r of allRows) {
    if (r.month_year < month && (r.effective_status === 'PAST_DUE' || r.effective_status === 'NOK_OVERDUE')) {
      const list = map.get(r.user_id) ?? [];
      list.push(r);
      map.set(r.user_id, list);
    }
  }
  return map;
}

export function CollectionsBoard({
  rows,
  allRows,
  month,
  currentMonth,
  cash,
  cashError,
  busyUserId,
  onCharge,
  onUndo,
  onMultiple,
  onOpenLedger,
}: {
  rows: PaymentRow[];
  allRows: PaymentRow[];
  month: string;
  currentMonth: string;
  cash: CashMonth | null;
  cashError: boolean;
  busyUserId: string | null;
  onCharge: (row: PaymentRow, method: PaymentMethod) => void;
  onUndo: (row: PaymentRow) => void;
  onMultiple: (userId: string) => void;
  onOpenLedger: (userId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('pending');
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('');
  // Lo urgente abierto; "en plazo" y "aún no han venido" plegados para no alargar la lista con 150+ alumnos
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ grace: true, novisit: true });

  const pastDue = useMemo(() => pastDueByStudent(allRows, month), [allRows, month]);
  const plans = useMemo(() => [...new Set(rows.map((r) => r.plan_name))].sort(), [rows]);

  const paidRows = rows.filter((r) => isPaidStatus(r.effective_status));
  // Sin pagar = todo lo no pagado, incluidas las cuotas de un mes futuro aún no vencidas
  const unpaidRows = rows.filter((r) => !isPaidStatus(r.effective_status));
  const paidTotal = paidRows.reduce((s, r) => s + rowAmount(r), 0);
  const pendingTotal = unpaidRows.reduce((s, r) => s + Number(r.price_eur || 0), 0);
  const progress = rows.length ? paidRows.length / rows.length : 0;

  const q = normalizeText(query.trim());
  const byPlan = (r: PaymentRow) => !plan || r.plan_name === plan;
  const searchHits = q ? rows.filter((r) => byPlan(r) && normalizeText(r.full_name).includes(q)) : [];

  // Alumnos con meses anteriores sin pagar que este mes no aparecen como pendientes
  const pastDueOnly = useMemo(() => {
    if (month !== currentMonth) return [];
    const pendingIds = new Set(unpaidRows.map((r) => r.user_id));
    return [...pastDue.entries()]
      .filter(([uid]) => !pendingIds.has(uid))
      .map(([uid, list]) => ({ uid, list }));
  }, [pastDue, unpaidRows, month, currentMonth]);

  const groups: { id: string; title: string; hint: string; rows: PaymentRow[]; tone: string }[] =
    month < currentMonth
      ? [{ id: 'past', title: 'Sin pagar', hint: 'Mes cerrado', rows: unpaidRows.filter(byPlan), tone: 'text-red-200' }]
      : month > currentMonth
        ? [{ id: 'future', title: 'Aún sin cobrar', hint: 'Mes próximo: se puede cobrar por adelantado', rows: unpaidRows.filter(byPlan), tone: 'text-slate-200' }]
        : [
          {
            id: 'late',
            title: 'Más de 7 días sin pagar',
            hint: 'Vinieron hace más de una semana',
            rows: unpaidRows
              .filter((r) => r.effective_status === 'NOK_OVERDUE' && byPlan(r))
              .sort((a, b) => (a.first_attendance_in_month ?? '').localeCompare(b.first_attendance_in_month ?? '')),
            tone: 'text-red-200',
          },
          {
            id: 'grace',
            title: 'En plazo',
            hint: 'Vinieron hace menos de 7 días',
            rows: unpaidRows.filter((r) => r.effective_status === 'GRACE_7_DAYS' && byPlan(r)),
            tone: 'text-sky-200',
          },
          {
            id: 'novisit',
            title: 'Aún no han venido este mes',
            hint: 'Sin asistencia registrada',
            rows: unpaidRows.filter((r) => (r.effective_status === 'PENDING' || r.effective_status === 'PAST_DUE') && byPlan(r)),
            tone: 'text-slate-200',
          },
        ];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'pending', label: 'Por cobrar', count: unpaidRows.length },
    { id: 'paid', label: 'Cobrados', count: paidRows.length },
    { id: 'all', label: 'Todos', count: rows.length },
    { id: 'plans', label: 'Por tarifa' },
  ];

  const renderRow = (r: PaymentRow) => {
    const paid = isPaidStatus(r.effective_status);
    const busy = busyUserId === r.user_id;
    const due = pastDue.get(r.user_id);
    const days = daysSince(r.first_attendance_in_month);
    const advanceUntil = allRows
      .filter((x) => x.user_id === r.user_id && x.effective_status === 'ADVANCE_OK')
      .reduce<string | null>((max, x) => (!max || x.month_year > max ? x.month_year : max), null);

    let detail = '';
    if (paid) {
      detail = `${r.payment_method ?? 'Pagado'}${r.paid_at ? ` el ${shortDate(r.paid_at)}` : ''}`;
    } else if (r.effective_status === 'NOK_OVERDUE' && days !== null) {
      detail = `vino hace ${days} días`;
    } else if (r.effective_status === 'GRACE_7_DAYS' && days !== null) {
      const left = Math.max(0, 7 - days);
      detail = left === 0 ? 'hoy acaba el plazo' : `le quedan ${left} ${left === 1 ? 'día' : 'días'} de plazo`;
    }

    return (
      <li key={`${r.user_id}-${r.month_year}`} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 px-4 sm:px-5 py-3">
        <button
          type="button"
          onClick={() => onOpenLedger(r.user_id)}
          className="min-w-0 flex-1 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-white/[0.04]"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-white">{r.full_name}</span>
            {r.is_founder && <span className="text-xs text-amber-300">Socio fundador</span>}
            {due && due.length > 0 && (
              <span className="text-xs font-semibold text-red-300">
                también debe {due.map((d) => formatMonthLabel(d.month_year)).join(', ')}
              </span>
            )}
            {advanceUntil && <span className="text-xs text-teal-300">cubierto hasta {formatMonthLabel(advanceUntil)}</span>}
          </span>
          <span className="block text-xs text-slate-400 mt-0.5">
            {r.plan_name} · <span className="tabular-nums">{formatEURExact(rowAmount(r))}</span>
            {detail ? ` · ${detail}` : ''}
          </span>
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {paid ? (
            <button
              type="button"
              onClick={() => onUndo(r)}
              disabled={busy}
              className="min-h-[44px] rounded-xl px-3 text-sm font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
            >
              Deshacer
            </button>
          ) : (
            <>
              {(['Bizum', 'Efectivo'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onCharge(r, m)}
                  disabled={busy}
                  aria-label={`Cobrar a ${r.full_name} por ${m}, ${formatEURExact(Number(r.price_eur || 0))}`}
                  className="min-h-[44px] min-w-[5.5rem] rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? '…' : m}
                </button>
              ))}
            </>
          )}
          <button
            type="button"
            onClick={() => onMultiple(r.user_id)}
            aria-label={`Cobrar varios meses a ${r.full_name}`}
            title="Varios meses"
            className="grid place-items-center w-11 h-11 rounded-xl border border-white/15 text-slate-200 hover:bg-white/[0.08]"
          >
            <CalendarPlus className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </li>
    );
  };

  const section = (id: string, title: ReactNode, hint: string, count: number, sum: number, tone: string, body: ReactNode) => {
    const isCollapsed = collapsed[id] ?? false;
    return (
      <section key={id} className="rounded-2xl studio-panel border border-white/10 overflow-hidden">
        <h3>
          <button
            type="button"
            aria-expanded={!isCollapsed}
            onClick={() => setCollapsed((c) => ({ ...c, [id]: !isCollapsed }))}
            className="w-full min-h-[56px] flex items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-white/[0.03]"
          >
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform motion-reduce:transition-none ${isCollapsed ? '-rotate-90' : ''}`}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${tone}`}>
                {title} <span className="text-slate-400 font-normal">({count})</span>
              </span>
              <span className="block text-xs text-slate-400">{hint}</span>
            </span>
            <span className="text-sm text-white tabular-nums shrink-0">{formatEURExact(sum)}</span>
          </button>
        </h3>
        {!isCollapsed && body}
      </section>
    );
  };

  return (
    <div className="space-y-5">
      {/* Progreso del mes */}
      <section aria-label="Progreso de cobro del mes" className="rounded-2xl studio-panel border border-white/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-slate-200">
            <strong className="text-white text-lg tabular-nums">{paidRows.length}</strong> de{' '}
            <span className="tabular-nums">{rows.length}</span> cuotas de {formatMonthLabel(month)} cobradas ·{' '}
            <span className="tabular-nums">{formatEURExact(paidTotal)}</span>
          </p>
          <p className="text-sm text-amber-200 tabular-nums">
            {unpaidRows.length > 0
              ? `Faltan ${unpaidRows.length} · ${formatEURExact(pendingTotal)}`
              : rows.length > 0
                ? 'Todo cobrado'
                : ''}
          </p>
        </div>
        <div
          className="mt-3 h-2.5 rounded-full studio-panel-inset overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={rows.length}
          aria-valuenow={paidRows.length}
          aria-label="Cuotas cobradas"
        >
          <div
            className="h-full w-full origin-left rounded-full bg-emerald-500 transition-transform duration-500 motion-reduce:transition-none"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {cashError ? (
            'No se ha podido calcular lo cobrado en el mes.'
          ) : cash ? (
            <>
              Cobrado en {formatMonthLabel(month)} (por fecha de cobro): {formatEURExact(cash.total)} · Bizum{' '}
              {formatEURExact(cash.bizum)} · Efectivo {formatEURExact(cash.cash)}
              {cash.advance > 0 ? ` · ${formatEURExact(cash.advance)} adelantado` : ''} ·{' '}
              <Link to={`/admin/finanzas?mes=${month}`} className="underline underline-offset-2 hover:text-white">
                Ver en Finanzas
              </Link>
            </>
          ) : (
            'Calculando lo cobrado…'
          )}
        </p>
      </section>

      {/* Buscador + filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Buscar alumno</span>
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alumno para cobrar…"
            className="w-full rounded-xl studio-field pl-11 pr-11 py-3 text-base text-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Borrar búsqueda"
              className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-lg text-slate-300 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
        <label className="sm:w-60">
          <span className="sr-only">Filtrar por tarifa</span>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full rounded-xl studio-field px-3 py-3 text-sm text-white"
          >
            <option value="">Todas las tarifas</option>
            {plans.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      {q ? (
        <section aria-label="Resultados de búsqueda" className="rounded-2xl studio-panel border border-white/10 overflow-hidden">
          <p className="px-4 sm:px-5 pt-4 pb-2 text-sm text-slate-300" role="status">
            {searchHits.length === 0
              ? `Nadie con «${query.trim()}» en ${formatMonthLabel(month)}.`
              : `${searchHits.length} ${searchHits.length === 1 ? 'alumno' : 'alumnos'}`}
          </p>
          {searchHits.length > 0 && <ul className="divide-y divide-white/[0.06]">{searchHits.map(renderRow)}</ul>}
        </section>
      ) : (
        <>
          <div role="tablist" aria-label="Vista de cobros" className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold transition-colors ${
                  tab === t.id ? 'bg-studio-cream text-studio-navy-deep' : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {t.label}
                {t.count !== undefined && <span className="ml-1.5 tabular-nums opacity-80">{t.count}</span>}
              </button>
            ))}
          </div>

          {tab === 'pending' && (
            <div className="space-y-4">
              {unpaidRows.length === 0 && pastDueOnly.length === 0 ? (
                <p className="rounded-2xl studio-panel border border-white/10 p-6 text-sm text-emerald-200">
                  {rows.length === 0
                    ? `No hay cuotas en ${formatMonthLabel(month)}. Usa «Generar mes» para crearlas a partir del mes anterior.`
                    : `Todo cobrado en ${formatMonthLabel(month)}.`}
                </p>
              ) : null}

              {pastDueOnly.length > 0 &&
                section(
                  'pastdue',
                  'Deben meses anteriores',
                  'Este mes está pagado, pero tienen meses atrasados',
                  pastDueOnly.length,
                  pastDueOnly.reduce((s, x) => s + x.list.reduce((a, r) => a + Number(r.price_eur || 0), 0), 0),
                  'text-red-200',
                  <ul className="divide-y divide-white/[0.06]">
                    {pastDueOnly.map(({ uid, list }) => (
                      <li key={uid} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                        <button
                          type="button"
                          onClick={() => onOpenLedger(uid)}
                          className="min-w-0 flex-1 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-white/[0.04]"
                        >
                          <span className="block text-sm font-semibold text-white">{list[0].full_name}</span>
                          <span className="block text-xs text-red-300">
                            Debe {list.map((r) => formatMonthLabel(r.month_year)).join(', ')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onMultiple(uid)}
                          className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 text-sm font-semibold text-white"
                        >
                          Cobrar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

              {groups
                .filter((g) => g.rows.length > 0)
                .map((g) =>
                  section(
                    g.id,
                    g.title,
                    g.hint,
                    g.rows.length,
                    g.rows.reduce((s, r) => s + Number(r.price_eur || 0), 0),
                    g.tone,
                    <ul className="divide-y divide-white/[0.06]">{g.rows.map(renderRow)}</ul>
                  )
                )}
            </div>
          )}

          {(tab === 'paid' || tab === 'all') && (
            <section className="rounded-2xl studio-panel border border-white/10 overflow-hidden">
              {(tab === 'paid' ? paidRows : rows).filter(byPlan).length === 0 ? (
                <p className="p-6 text-sm text-slate-400">Nada que mostrar con este filtro.</p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {(tab === 'paid' ? paidRows : rows).filter(byPlan).map(renderRow)}
                </ul>
              )}
            </section>
          )}

          {tab === 'plans' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((p) => {
                const list = rows.filter((r) => r.plan_name === p);
                const paid = list.filter((r) => isPaidStatus(r.effective_status));
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPlan(p);
                      setTab('pending');
                    }}
                    className="text-left rounded-2xl studio-panel border border-white/10 p-5 hover:border-white/25"
                  >
                    <span className="block font-headline text-xl uppercase text-white">{p}</span>
                    <span className="mt-2 flex items-baseline justify-between gap-3">
                      <span className="text-sm text-slate-300">
                        {paid.length} de {list.length} cobradas
                        {list.length - paid.length > 0 ? ` · ver ${list.length - paid.length} pendientes` : ''}
                      </span>
                      <span className="font-headline text-2xl text-emerald-300 tabular-nums">
                        {formatEURExact(paid.reduce((s, r) => s + rowAmount(r), 0))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
