import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getCashMonth,
  getExpenseCategories,
  getExpensesOfMonth,
  getRecurringExpenses,
  recurringAppliesTo,
  shiftMonth,
  sumActiveCents,
  type Expense,
  type ExpenseCategory,
  type RecurringExpense,
} from '@/lib/finance';

export interface FixedOfMonth {
  template: RecurringExpense;
  /** Gasto del mes que lo confirma (si ya se pagó). */
  expense: Expense | null;
}

export interface FinanceMonthData {
  categories: ExpenseCategory[];
  templates: RecurringExpense[];
  expenses: Expense[];
  fixedOfMonth: FixedOfMonth[];
  /** Cobrado en el mes (caja, hora de Madrid). */
  incomeCents: number;
  /** Parte de lo cobrado que son cuotas de meses siguientes. */
  advanceCents: number;
  /** Gastos no anulados pagados en el mes. */
  expensesCents: number;
  resultCents: number;
  prevResultCents: number;
  hasExpenses: boolean;
  byCategory: { categoryId: string; name: string; cents: number; hasFixed: boolean }[];
  /** pendingCents: importe previsto de los fijos que cubren el mes y aún no se han confirmado. */
  fixed: { total: number; confirmed: number; committedCents: number; pendingCents: number };
  breakEven: { students: number; avgQuotaCents: number; paidStudents: number } | null;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: FinanceMonthData; month: string };

/**
 * Criterio (decidido con el usuario): resultado del mes = cobrado en el mes
 * (por fecha de cobro) − gastos pagados en el mes (por fecha de pago), sin anulados.
 */
export function useFinanceMonth(month: string) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    // Al recargar el mismo mes se mantienen las cifras; al cambiar de mes, nunca se
    // enseñan las del mes anterior bajo el nombre del nuevo
    setState((s) => (s.status === 'ready' && s.month === month ? s : { status: 'loading' }));
    const prev = shiftMonth(month, -1);

    Promise.all([
      getCashMonth(month),
      getCashMonth(prev),
      getExpensesOfMonth(month),
      getExpensesOfMonth(prev),
      getExpenseCategories(),
      getRecurringExpenses(),
      // Fijos que cubren este mes, aunque se pagaran en otro (p. ej. alquiler de diciembre pagado el 30/11)
      supabase
        .from('expenses')
        .select('*')
        .eq('period_month', month)
        .not('recurring_expense_id', 'is', null)
        .is('voided_at', null)
        .then(({ data, error }) => {
          if (error) throw error;
          return (data ?? []) as Expense[];
        }),
      supabase
        .from('v_monthly_payment_status')
        .select('price_eur, recorded_payment_status')
        .eq('month_year', month)
        .then(({ data, error }) => {
          if (error) throw error;
          return (data ?? []) as { price_eur: number; recorded_payment_status: string | null }[];
        }),
    ])
      .then(([cash, prevCash, expenses, prevExpenses, categories, templates, fixedPaid, quotas]) => {
        if (!alive) return;
        const incomeCents = Math.round(cash.total * 100);
        const expensesCents = sumActiveCents(expenses);
        const prevResultCents = Math.round(prevCash.total * 100) - sumActiveCents(prevExpenses);

        const active = expenses.filter((e) => !e.voided_at);
        const catName = new Map(categories.map((c) => [c.id, c.name]));
        const byCatMap = new Map<string, { cents: number; hasFixed: boolean }>();
        for (const e of active) {
          const cur = byCatMap.get(e.category_id) ?? { cents: 0, hasFixed: false };
          cur.cents += e.amount_cents;
          cur.hasFixed ||= Boolean(e.recurring_expense_id);
          byCatMap.set(e.category_id, cur);
        }
        const byCategory = [...byCatMap.entries()]
          .map(([categoryId, v]) => ({ categoryId, name: catName.get(categoryId) ?? 'Sin categoría', ...v }))
          .sort((a, b) => b.cents - a.cents);

        // Fijos del mes: plantillas vigentes y, si existe, su gasto confirmado (por mes que cubre)
        const fixedOfMonth: FixedOfMonth[] = templates
          .filter((t) => recurringAppliesTo(t, month))
          .map((template) => ({
            template,
            expense: fixedPaid.find((e) => e.recurring_expense_id === template.id) ?? null,
          }));
        const committedCents = fixedOfMonth.reduce(
          (s, f) => s + (f.expense ? f.expense.amount_cents : f.template.amount_cents),
          0
        );
        const confirmed = fixedOfMonth.filter((f) => f.expense).length;
        const pendingCents = fixedOfMonth.reduce((s, f) => (f.expense ? s : s + f.template.amount_cents), 0);

        // Punto de equilibrio: fijos comprometidos / cuota media efectiva del mes
        const paidQuotas = quotas.filter((q) => q.recorded_payment_status === 'paid_ok');
        const avgQuotaCents =
          quotas.length > 0
            ? Math.round((quotas.reduce((s, q) => s + Number(q.price_eur || 0), 0) / quotas.length) * 100)
            : 0;
        const breakEven =
          committedCents > 0 && avgQuotaCents > 0
            ? {
                students: Math.ceil(committedCents / avgQuotaCents),
                avgQuotaCents,
                paidStudents: paidQuotas.length,
              }
            : null;

        setState({
          status: 'ready',
          month,
          data: {
            categories,
            templates,
            expenses,
            fixedOfMonth,
            incomeCents,
            advanceCents: Math.round(cash.advance * 100),
            expensesCents,
            resultCents: incomeCents - expensesCents,
            prevResultCents,
            hasExpenses: active.length > 0,
            byCategory,
            fixed: { total: fixedOfMonth.length, confirmed, committedCents, pendingCents },
            breakEven,
          },
        });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const message = (err as { message?: string })?.message ?? 'Error desconocido';
        setState({ status: 'error', message });
      });

    return () => {
      alive = false;
    };
  }, [month, reloadKey]);

  return { state, reload };
}
