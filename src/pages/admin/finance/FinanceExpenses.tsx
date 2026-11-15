import { useMemo, useState } from 'react';
import { Search, Download, Repeat, Plus, CheckCircle2 } from 'lucide-react';
import { exportWorkbook } from '@/lib/excel';
import { formatEURExact, formatMonthLong } from '@/lib/format';
import { centsToEur, type Expense } from '@/lib/finance';
import type { ExpenseFormTarget } from './ExpenseFormModal';
import type { FinanceMonthData } from './useFinanceMonth';

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}`;
}

function minus(cents: number): string {
  return cents === 0 ? formatEURExact(0) : `−${formatEURExact(centsToEur(cents))}`;
}

export function FinanceExpenses({
  data,
  month,
  onOpen,
}: {
  data: FinanceMonthData;
  month: string;
  onOpen: (target: ExpenseFormTarget) => void;
}) {
  const { categories, expenses, fixedOfMonth } = data;
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showVoided, setShowVoided] = useState(false);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const fixedExpenseIds = useMemo(
    () => new Set(fixedOfMonth.flatMap((f) => (f.expense ? [f.expense.id] : []))),
    [fixedOfMonth]
  );

  const q = query.trim().toLowerCase();
  const matches = (concept: string, categoryId: string) =>
    (!categoryFilter || categoryId === categoryFilter) &&
    (!q || concept.toLowerCase().includes(q) || (catName.get(categoryId) ?? '').toLowerCase().includes(q));

  const fixedRows = fixedOfMonth.filter((f) => matches(f.template.concept, f.template.category_id));
  const otherRows = expenses.filter(
    (e) => !fixedExpenseIds.has(e.id) && (showVoided || !e.voided_at) && matches(e.concept, e.category_id)
  );
  const voidedCount = expenses.filter((e) => e.voided_at).length;

  const fixedSubtotal = fixedRows.reduce((s, f) => s + (f.expense && f.expense.expense_date.startsWith(month) ? f.expense.amount_cents : 0), 0);
  const coveredCount = fixedOfMonth.filter((f) => f.expense).length;
  const otherSubtotal = otherRows.reduce((s, e) => (e.voided_at ? s : s + e.amount_cents), 0);
  const isFiltered = Boolean(q || categoryFilter);

  const handleExport = () => {
    const rows = expenses.map((e) => ({
      Fecha_pago: e.expense_date,
      Concepto: e.concept,
      Categoria: catName.get(e.category_id) ?? '',
      Importe_EUR: centsToEur(e.amount_cents),
      Metodo: e.payment_method ?? '',
      Tipo: e.recurring_expense_id ? 'Fijo' : 'Puntual',
      Mes_que_cubre: e.period_month,
      Estado: e.voided_at ? `Anulado: ${e.void_reason ?? ''}` : 'Activo',
    }));
    const pending = fixedOfMonth
      .filter((f) => !f.expense)
      .map((f) => ({
        Concepto: f.template.concept,
        Categoria: catName.get(f.template.category_id) ?? '',
        Importe_previsto_EUR: centsToEur(f.template.amount_cents),
        Dia_habitual: f.template.day_of_month,
      }));
    exportWorkbook(`Gastos_247_${month}.xlsx`, [
      { name: 'Gastos', rows },
      { name: 'Fijos_pendientes', rows: pending },
    ]);
  };

  const noData = expenses.length === 0 && fixedOfMonth.length === 0;

  if (noData) {
    return (
      <section className="rounded-3xl studio-panel border border-white/10 p-6 sm:p-8 space-y-4 max-w-2xl">
        <h2 className="font-headline text-xl uppercase text-white">Aún no hay gastos en {formatMonthLong(month)}</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Hay dos tipos. Los <strong className="text-white">fijos</strong> se repiten cada mes (alquiler, seguros, sueldos):
          se dan de alta una vez y cada mes solo hay que confirmar que se han pagado. Los{' '}
          <strong className="text-white">puntuales</strong> ocurren una vez (material, una reparación).
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => onOpen({ kind: 'new', preferFixed: true })}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl studio-btn px-4 text-sm font-semibold text-white"
          >
            <Repeat className="w-4 h-4" aria-hidden /> Añadir gasto fijo
          </button>
          <button
            type="button"
            onClick={() => onOpen({ kind: 'new' })}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-100 hover:bg-white/5"
          >
            <Plus className="w-4 h-4" aria-hidden /> Añadir gasto puntual
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por concepto</span>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por concepto o categoría…"
            className="w-full rounded-xl studio-field pl-10 pr-3 py-2.5 text-sm text-white"
          />
        </label>
        <label className="lg:w-64">
          <span className="sr-only">Filtrar por categoría</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl studio-field px-3 py-2.5 text-sm text-white"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleExport}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-100 hover:bg-white/5"
        >
          <Download className="w-4 h-4" aria-hidden /> Exportar todo el mes
        </button>
      </div>

      <p className="text-sm text-slate-300 tabular-nums" role="status">
        {isFiltered ? (
          <>Total filtrado (pagado en el mes): <strong className="text-white">{minus(fixedSubtotal + otherSubtotal)}</strong></>
        ) : (
          <>Gastado en {formatMonthLong(month).toLowerCase()} (por fecha de pago): <strong className="text-white">{minus(data.expensesCents)}</strong></>
        )}
      </p>

      {/* Fijos del mes */}
      {fixedOfMonth.length > 0 && (
        <section aria-labelledby="exp-fixed" className="rounded-3xl studio-panel border border-white/10 overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5 pb-3">
            <h2 id="exp-fixed" className="font-headline text-lg uppercase text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-slate-400" aria-hidden /> Fijos
            </h2>
            <span className="text-sm text-slate-300 tabular-nums">{coveredCount} de {fixedOfMonth.length} cubiertos</span>
          </div>
          {fixedRows.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-slate-400">Ningún fijo coincide con el filtro.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {fixedRows.map(({ template, expense }) => (
                <li key={template.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{expense?.concept ?? template.concept}</p>
                    <p className="text-xs text-slate-400">
                      {catName.get(expense?.category_id ?? template.category_id)}
                      {expense
                        ? ` · pagado el ${shortDate(expense.expense_date)}${expense.expense_date.startsWith(month) ? "" : ` (cuenta en ${formatMonthLong(expense.expense_date.slice(0, 7)).toLowerCase()})`}`
                        : ` · habitual el día ${template.day_of_month}`}
                    </p>
                  </div>
                  {expense ? (
                    <button
                      type="button"
                      onClick={() => onOpen({ kind: 'edit', expense })}
                      className="min-h-[44px] flex items-center gap-2 rounded-xl px-2 -mr-2 hover:bg-white/5"
                      aria-label={`Editar ${template.concept}, ${formatEURExact(centsToEur(expense.amount_cents))}`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden />
                      <span className="text-sm text-white tabular-nums">{minus(expense.amount_cents)}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:inline text-sm text-slate-400 tabular-nums">
                        Previsto {formatEURExact(centsToEur(template.amount_cents))}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpen({ kind: 'confirm-fixed', template })}
                        className="min-h-[44px] rounded-xl border border-studio-cream/60 px-3 text-sm font-semibold text-studio-cream hover:bg-studio-cream/10"
                      >
                        Confirmar pago
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Resto de gastos del mes */}
      <section aria-labelledby="exp-other" className="rounded-3xl studio-panel border border-white/10 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pt-5 pb-3">
          <h2 id="exp-other" className="font-headline text-lg uppercase text-white">
            Otros gastos del mes
          </h2>
          <div className="flex items-center gap-4">
            {voidedCount > 0 && (
              <label className="inline-flex items-center gap-2 py-3 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVoided}
                  onChange={(e) => setShowVoided(e.target.checked)}
                  className="w-4 h-4 accent-red-600"
                />
                Ver anulados ({voidedCount})
              </label>
            )}
            <span className="text-sm text-slate-300 tabular-nums">{minus(otherSubtotal)}</span>
          </div>
        </div>
        {otherRows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-400">
            {isFiltered ? 'Ningún gasto coincide con el filtro.' : 'Sin otros gastos este mes.'}
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {otherRows.map((e: Expense) => (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={Boolean(e.voided_at)}
                  onClick={() => onOpen({ kind: 'edit', expense: e })}
                  className="w-full min-h-[56px] flex items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.04] disabled:hover:bg-transparent disabled:cursor-default"
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${e.voided_at ? 'text-slate-400 line-through' : 'text-white'}`}>
                      {e.concept}
                    </p>
                    <p className="text-xs text-slate-400">
                      {catName.get(e.category_id)} · {shortDate(e.expense_date)}
                      {e.payment_method ? ` · ${e.payment_method}` : ''}
                      {e.recurring_expense_id && e.period_month !== month
                        ? ` · fijo de ${formatMonthLong(e.period_month).toLowerCase()}`
                        : ''}
                      {e.voided_at ? ` · Anulado: ${e.void_reason}` : ''}
                    </p>
                  </div>
                  <span className={`text-sm tabular-nums shrink-0 ${e.voided_at ? 'text-slate-400 line-through' : 'text-white'}`}>
                    {minus(e.amount_cents)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
