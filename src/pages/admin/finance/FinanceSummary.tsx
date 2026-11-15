import { Link } from 'react-router-dom';
import CollapsibleCard from '@/components/CollapsibleCard';
import { Plus, Info } from 'lucide-react';
import { formatEURExact, formatMonthLong } from '@/lib/format';
import { centsToEur } from '@/lib/finance';
import type { FinanceMonthData } from './useFinanceMonth';

function signedEur(cents: number): string {
  if (cents === 0) return formatEURExact(0);
  return `${cents > 0 ? '+' : '−'}${formatEURExact(centsToEur(Math.abs(cents)))}`;
}

export function FinanceSummary({
  data,
  month,
  isCurrentMonth,
  daysLeft,
  onAddExpense,
}: {
  data: FinanceMonthData;
  month: string;
  isCurrentMonth: boolean;
  daysLeft: number;
  onAddExpense: (preferFixed?: boolean) => void;
}) {
  const {
    incomeCents,
    advanceCents,
    expensesCents,
    resultCents,
    prevResultCents,
    byCategory,
    fixed,
    breakEven,
    hasExpenses,
  } = data;

  const delta = resultCents - prevResultCents;
  const scale = Math.max(incomeCents, expensesCents, 1);
  const monthName = formatMonthLong(month);

  return (
    <div className="space-y-5">
      {/* Cifra protagonista: resultado del mes */}
      <section
        aria-labelledby="fin-result"
        className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-7"
      >
        <p id="fin-result" className="text-sm text-slate-300">
          Resultado de {monthName}
          {isCurrentMonth && (
            <span className="text-slate-400"> · mes en curso, {daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`}</span>
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p
            className={`font-headline text-5xl sm:text-6xl leading-none tabular-nums ${
              resultCents > 0 ? 'text-emerald-300' : resultCents < 0 ? 'text-rose-300' : 'text-white'
            }`}
          >
            {signedEur(resultCents)}
          </p>
          <p className="text-lg font-semibold text-white pb-1">
            {resultCents > 0 ? 'Ganado' : resultCents < 0 ? 'Perdido' : 'Sin beneficio ni pérdida'}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-400 tabular-nums">
          Mes anterior{isCurrentMonth ? ' (completo)' : ''}: {signedEur(prevResultCents)}
          {!isCurrentMonth &&
            (delta === 0
              ? ' · igual que entonces'
              : ` · ${formatEURExact(centsToEur(Math.abs(delta)))} ${delta > 0 ? 'mejor' : 'peor'} que entonces`)}
        </p>

        {hasExpenses && fixed.pendingCents > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100 space-y-1">
            <p>
              Faltan {fixed.total - fixed.confirmed} {fixed.total - fixed.confirmed === 1 ? 'gasto fijo' : 'gastos fijos'} por
              confirmar (−{formatEURExact(centsToEur(fixed.pendingCents))} previstos).
            </p>
            <p className="font-semibold tabular-nums">
              Resultado previsto al pagarlos: {signedEur(resultCents - fixed.pendingCents)}
            </p>
            <Link to={`/admin/finanzas/gastos?mes=${month}`} className="inline-block text-amber-50 underline underline-offset-2 py-1">
              Confirmar fijos pendientes
            </Link>
          </div>
        )}

        {!hasExpenses && (
          <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100 space-y-3">
            <p>
              Aún no hay gastos registrados en {monthName}: este resultado solo cuenta lo cobrado y no es real todavía.
            </p>
            <button
              type="button"
              onClick={() => onAddExpense(true)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl studio-btn px-4 text-sm font-semibold text-white"
            >
              <Plus className="w-4 h-4" aria-hidden /> Añadir el primer gasto
            </button>
          </div>
        )}
      </section>

      {/* Entrado frente a gastado, misma escala */}
      <section aria-label="Entrado frente a gastado" className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6 space-y-4">
        {[
          { label: 'Entrado', cents: incomeCents, tone: 'bg-emerald-500', link: `/admin/seguimiento?mes=${month}`, linkLabel: 'Ver cobros' },
          { label: 'Gastado', cents: expensesCents, tone: 'bg-rose-400', link: `/admin/finanzas/gastos?mes=${month}`, linkLabel: 'Ver gastos' },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="text-sm font-semibold text-white">
                {row.label}{' '}
                <Link to={row.link} className="ml-1 text-xs font-normal text-slate-400 underline underline-offset-2 hover:text-white">
                  {row.linkLabel}
                </Link>
              </span>
              <span className="font-headline text-xl text-white tabular-nums">
                {row.label === 'Gastado' && row.cents > 0 ? '−' : ''}
                {formatEURExact(centsToEur(row.cents))}
              </span>
            </div>
            <div className="h-3 rounded-full studio-panel-inset overflow-hidden">
              <div
                className={`h-full w-full origin-left rounded-full ${row.tone} transition-transform duration-500 motion-reduce:transition-none`}
                style={{ transform: `scaleX(${row.cents / scale})` }}
              />
            </div>
          </div>
        ))}
        {advanceCents > 0 && (
          <p className="flex gap-2 text-xs text-sky-200">
            <Info className="w-4 h-4 shrink-0" aria-hidden />
            De lo entrado, {formatEURExact(centsToEur(advanceCents))} son cuotas de meses siguientes ya cobradas: conviene no
            gastarlas este mes.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gastos por categoría */}
        <CollapsibleCard
          title="Gastos por categoría"
          meta={byCategory.length > 0 ? `${byCategory.length}` : undefined}
          className="rounded-3xl studio-panel border border-white/10 self-start"
        >
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-400">Sin gastos en {monthName}.</p>
          ) : (
            <ul className="space-y-3">
              {byCategory.map((c) => (
                <li key={c.categoryId}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-200 min-w-0 truncate">
                      {c.name}
                      {c.hasFixed && <span className="ml-2 text-xs text-slate-400">Fijo</span>}
                    </span>
                    <span className="text-white tabular-nums shrink-0">
                      {formatEURExact(centsToEur(c.cents))}{' '}
                      <span className="text-slate-400">· {Math.round((c.cents / Math.max(expensesCents, 1)) * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full studio-panel-inset overflow-hidden">
                    <div
                      className="h-full w-full origin-left rounded-full bg-rose-400/80"
                      style={{ transform: `scaleX(${c.cents / Math.max(expensesCents, 1)})` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>

        <div className="space-y-5">
          {/* Fijos del mes */}
          <section aria-labelledby="fin-fixed" className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6">
            <h2 id="fin-fixed" className="font-headline text-lg uppercase text-white mb-2">
              Gastos fijos del mes
            </h2>
            {fixed.total === 0 ? (
              <p className="text-sm text-slate-400">
                No hay gastos fijos. Al añadir un gasto, marca «Se repite cada mes» para el alquiler, seguros o sueldos.
              </p>
            ) : (
              <>
                <p className="font-headline text-2xl text-white tabular-nums">
                  {formatEURExact(centsToEur(fixed.committedCents))}{' '}
                  <span className="text-sm font-sans text-slate-400">comprometidos</span>
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  {fixed.confirmed} de {fixed.total} cubiertos
                  {fixed.confirmed < fixed.total && (
                    <>
                      {' · '}
                      <Link
                        to={`/admin/finanzas/gastos?mes=${month}`}
                        className="text-studio-red-text underline underline-offset-2"
                      >
                        confirmar pendientes
                      </Link>
                    </>
                  )}
                </p>
              </>
            )}
          </section>

          {/* Punto de equilibrio */}
          <section aria-labelledby="fin-break" className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-6">
            <h2 id="fin-break" className="font-headline text-lg uppercase text-white mb-2">
              Punto de equilibrio
            </h2>
            {breakEven ? (
              <>
                <p className="text-sm text-slate-200">
                  Para cubrir los fijos ({formatEURExact(centsToEur(fixed.committedCents))}) con la cuota media de tarifa de
                  este mes ({formatEURExact(centsToEur(breakEven.avgQuotaCents))}) hacen falta{' '}
                  <strong className="text-white">{breakEven.students} alumnos al corriente</strong>.
                </p>
                <p className={`text-sm mt-1 ${breakEven.paidStudents >= breakEven.students ? 'text-emerald-300' : 'text-amber-200'}`}>
                  Cuotas de {monthName.toLowerCase()} ya pagadas: {breakEven.paidStudents}
                  {breakEven.paidStudents >= breakEven.students
                    ? ': los fijos están cubiertos.'
                    : `: faltan ${breakEven.students - breakEven.paidStudents}.`}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                Se calcula cuando haya gastos fijos y cuotas en {monthName}.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
