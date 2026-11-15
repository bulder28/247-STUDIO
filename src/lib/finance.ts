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
