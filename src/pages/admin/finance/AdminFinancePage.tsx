import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Check, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/KpiCard';
import { getLocalMonthYear } from '@/lib/dateUtils';
import { formatMonthLong } from '@/lib/format';
import { useAmountsHidden } from '@/lib/privacy';
import { shiftMonth } from '@/lib/finance';
import { useFinanceMonth } from './useFinanceMonth';
import { FinanceSummary } from './FinanceSummary';
import { FinanceExpenses } from './FinanceExpenses';
import { ExpenseFormModal, type ExpenseFormTarget } from './ExpenseFormModal';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function AdminFinancePage({ tab }: { tab: 'resumen' | 'gastos' }) {
  useAmountsHidden(); // repinta los importes al pulsar el ojo
  const currentMonth = getLocalMonthYear();
  const [params, setParams] = useSearchParams();
  const paramMonth = params.get('mes');
  const month = paramMonth && MONTH_RE.test(paramMonth) ? paramMonth : currentMonth;
  const isCurrentMonth = month === currentMonth;
  // Se puede abrir el mes siguiente para pagar por adelantado un fijo (p. ej. el alquiler de diciembre el 30/11)
  const isLastNavigable = month >= shiftMonth(currentMonth, 1);

  const { state, reload } = useFinanceMonth(month);
  const [formTarget, setFormTarget] = useState<ExpenseFormTarget | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const goToMonth = (ym: string) => {
    const next = new URLSearchParams(params);
    if (ym === currentMonth) next.delete('mes');
    else next.set('mes', ym);
    setParams(next, { replace: true });
  };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  const ready = state.status === 'ready' ? state.data : null;
  const search = paramMonth && MONTH_RE.test(paramMonth) ? `?mes=${paramMonth}` : '';

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `min-h-[44px] inline-flex items-center rounded-xl px-4 text-sm font-semibold transition-colors ${
      isActive ? 'bg-studio-cream text-studio-navy-deep' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
    }`;

  return (
    // pb extra en móvil: el botón flotante "+ Gasto" no debe tapar la última fila
    <div className="space-y-6 pb-20 md:pb-0">
      <PageHeader
        title="Finanzas"
        actions={
          <div className="flex items-center gap-1 rounded-xl studio-panel-inset border border-white/10 p-1">
            <button
              type="button"
              onClick={() => goToMonth(shiftMonth(month, -1))}
              aria-label="Mes anterior"
              className="grid place-items-center w-11 h-11 rounded-lg text-slate-200 hover:bg-white/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="min-w-[9.5rem] text-center text-sm font-semibold text-white" aria-live="polite">
              {formatMonthLong(month)}
            </span>
            <button
              type="button"
              onClick={() => goToMonth(shiftMonth(month, 1))}
              disabled={isLastNavigable}
              aria-label="Mes siguiente"
              className="grid place-items-center w-11 h-11 rounded-lg text-slate-200 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        }
      >
        <nav aria-label="Secciones de Finanzas" className="flex flex-wrap items-center gap-2">
          <NavLink to={`/admin/finanzas${search}`} end className={tabClass}>
            Resumen
          </NavLink>
          <NavLink to={`/admin/finanzas/gastos${search}`} className={tabClass}>
            Gastos
          </NavLink>
          <button
            type="button"
            onClick={() => setFormTarget({ kind: 'new' })}
            disabled={!ready}
            className="hidden md:inline-flex ml-auto min-h-[44px] items-center gap-1.5 rounded-xl studio-btn px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="w-4 h-4" aria-hidden /> Gasto
          </button>
        </nav>
      </PageHeader>

      {state.status === 'loading' && (
        <div className="space-y-5" aria-busy="true" aria-label="Cargando finanzas">
          <div className="rounded-3xl studio-panel border border-white/10 p-6 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-14 w-64" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="rounded-3xl studio-panel border border-white/10 p-6 space-y-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div role="alert" className="rounded-3xl border border-amber-500/50 bg-amber-500/10 p-6 space-y-3 max-w-2xl">
          <p className="text-amber-100">
            No se han podido cargar los datos de {formatMonthLong(month)}. Revisa la conexión. No se muestran cifras para
            no confundirlas con un resultado real.
          </p>
          <p className="text-xs text-amber-200/80">Detalle: {state.message}</p>
          <button
            type="button"
            onClick={reload}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-amber-300/50 px-4 text-sm font-semibold text-amber-100 hover:bg-amber-500/10"
          >
            <RefreshCw className="w-4 h-4" aria-hidden /> Reintentar
          </button>
        </div>
      )}

      {ready &&
        (tab === 'resumen' ? (
          <FinanceSummary
            data={ready}
            month={month}
            isCurrentMonth={isCurrentMonth}
            daysLeft={daysLeft}
            onAddExpense={(preferFixed) => setFormTarget({ kind: 'new', preferFixed })}
          />
        ) : (
          <FinanceExpenses data={ready} month={month} onOpen={setFormTarget} />
        ))}

      {/* Acción principal en móvil, sobre el dock (no se duplica con el botón del aviso de mes sin gastos) */}
      {ready && !(tab === 'resumen' && !ready.hasExpenses) && (
        <button
          type="button"
          onClick={() => setFormTarget({ kind: 'new' })}
          className="md:hidden fixed right-4 bottom-24 z-30 min-h-[52px] inline-flex items-center gap-1.5 rounded-2xl studio-btn px-5 text-base font-semibold text-white shadow-modal"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Plus className="w-5 h-5" aria-hidden /> Gasto
        </button>
      )}

      {formTarget && ready && (
        <ExpenseFormModal
          target={formTarget}
          month={month}
          categories={ready.categories}
          templates={ready.templates}
          onClose={() => setFormTarget(null)}
          onSaved={(msg) => {
            setFormTarget(null);
            showToast(msg);
            reload();
          }}
        />
      )}

      {/* Región viva siempre montada: los lectores de pantalla anuncian cada cambio */}
      <p role="status" aria-live="polite" className="sr-only">
        {toast ?? ''}
      </p>
      {toast && (
        <div
          aria-hidden="true"
          className="fixed bottom-40 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-modal border border-emerald-400/40 flex items-center gap-2 max-w-[calc(100vw-2rem)]"
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden />
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}
