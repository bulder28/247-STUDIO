import { supabase } from '@/lib/supabase';

/**
 * Definición única de ingresos de 247 STUDIO.
 *
 * - "Cobrado en el mes" (criterio de caja): dinero que entró entre el día 1 y el
 *   último día del mes en hora de Madrid, según la fecha de cobro (paid_at).
 *   Lo calcula la función SQL finance_cash_month (supabase/finance_step0.sql).
 * - "Cuotas del mes" (criterio de devengo): cuotas cuyo month_year es ese mes,
 *   cobradas o no. Es lo que muestran Seguimiento y KPIs por alumno.
 *
 * Un pago adelantado de varios meses cuenta entero en el mes en que se cobra
 * (caja) y aparece en `advance` como dinero de meses futuros.
 */
export interface CashMonth {
  total: number;
  cash: number;
  bizum: number;
  other: number;
  /** Parte de lo cobrado este mes que corresponde a cuotas de meses posteriores. */
  advance: number;
  count: number;
}

const EMPTY_CASH: CashMonth = { total: 0, cash: 0, bizum: 0, other: 0, advance: 0, count: 0 };

export async function getCashMonth(monthYear: string): Promise<CashMonth> {
  const { data, error } = await supabase.rpc('finance_cash_month', { p_month: monthYear });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return EMPTY_CASH;
  const eur = (cents: unknown) => Number(cents ?? 0) / 100;
  return {
    total: eur(row.total_cents),
    cash: eur(row.cash_cents),
    bizum: eur(row.bizum_cents),
    other: eur(row.other_cents),
    advance: eur(row.advance_cents),
    count: Number(row.payments_count ?? 0),
  };
}

const PAGE_SIZE = 1000;

/**
 * Supabase devuelve como máximo 1.000 filas por petición. Para totales que
 * recorren muchos alumnos y meses, pide todas las páginas en lugar de truncar.
 * `buildQuery` debe devolver una consulta nueva con su orden ya fijado.
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const all: T[] = [];
  // Avanza según lo recibido (no según PAGE_SIZE): si el servidor tiene un límite
  // menor que 1.000, se siguen pidiendo páginas hasta que llegue una vacía.
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    if (page.length === 0) break;
    all.push(...page);
    from += page.length;
  }
  return all;
}

// ============================================================================
// Gastos (Fase 1) — tablas en supabase/finance_phase1.sql
// Importes siempre en céntimos enteros; solo se pasan a euros para mostrar.
// ============================================================================

export type ExpenseMethod = 'Banco' | 'Efectivo' | 'Tarjeta' | 'Bizum';
export const EXPENSE_METHODS: ExpenseMethod[] = ['Banco', 'Efectivo', 'Tarjeta', 'Bizum'];

export interface ExpenseCategory {
  id: string;
  slug: string;
  name: string;
  is_fixed_default: boolean;
  sort_order: number;
}

export interface RecurringExpense {
  id: string;
  category_id: string;
  concept: string;
  supplier: string | null;
  amount_cents: number;
  day_of_month: number;
  start_month: string;
  end_month: string | null;
  payment_method: ExpenseMethod | null;
  is_active: boolean;
}

export interface Expense {
  id: string;
  category_id: string;
  concept: string;
  supplier: string | null;
  amount_cents: number;
  vat_cents: number | null;
  expense_date: string;
  period_month: string;
  payment_method: ExpenseMethod | null;
  recurring_expense_id: string | null;
  notes: string | null;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
}

/** "2026-11" + 1 → "2026-12". */
export function shiftMonth(ym: string, offset: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "12,50" | "12.5" | "1.234,56" → 1250 / 1250 / 123456. null si no es un importe válido > 0. */
export function parseEurToCents(input: string): number | null {
  const raw = input.trim().replace(/\s|€/g, '');
  if (!raw) return null;
  // Con coma decimal: los puntos son de miles
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents > 0 ? cents : null;
}

export const centsToEur = (cents: number) => cents / 100;

/** ¿La plantilla está vigente en ese mes? */
export function recurringAppliesTo(r: RecurringExpense, ym: string): boolean {
  return r.is_active && r.start_month <= ym && (r.end_month === null || r.end_month >= ym);
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, slug, name, is_fixed_default, sort_order')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data as ExpenseCategory[]) ?? [];
}

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return (data as RecurringExpense[]) ?? [];
}

/** Gastos cuyo dinero salió en ese mes (por fecha), anulados incluidos para poder listarlos. */
export async function getExpensesOfMonth(ym: string): Promise<Expense[]> {
  const start = `${ym}-01`;
  const next = `${shiftMonth(ym, 1)}-01`;
  return fetchAllRows<Expense>((from, to) =>
    supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', start)
      .lt('expense_date', next)
      .order('expense_date', { ascending: false })
      .order('id')
      .range(from, to)
  );
}

/** Suma en céntimos de los gastos no anulados. */
export function sumActiveCents(expenses: Expense[]): number {
  return expenses.reduce((s, e) => (e.voided_at ? s : s + e.amount_cents), 0);
}
