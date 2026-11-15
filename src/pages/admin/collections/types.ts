export type EffectiveStatus =
  | 'OK'
  | 'ADVANCE_OK'
  | 'FUTURE_UPCOMING'
  | 'PAST_DUE'
  | 'NOK_OVERDUE'
  | 'GRACE_7_DAYS'
  | 'PENDING';

export type PaymentMethod = 'Efectivo' | 'Bizum';

/** Una fila de v_monthly_payment_status: un alumno en un mes. */
export interface PaymentRow {
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
  first_attendance_in_month?: string | null;
  effective_status: EffectiveStatus;
  payment_method: string | null;
  paid_amount_eur: number | null;
  payment_notes: string | null;
}

const MONTH_NAMES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "2026-11" → "Nov 2026". */
export function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTH_NAMES_ES[m - 1]} ${y}`;
}

export function isUnpaidOverdue(status: EffectiveStatus): boolean {
  return status === 'PAST_DUE' || status === 'NOK_OVERDUE' || status === 'GRACE_7_DAYS' || status === 'PENDING';
}

export function isPaidStatus(status: EffectiveStatus): boolean {
  return status === 'OK' || status === 'ADVANCE_OK';
}

/** Importe que cuenta para la fila: lo cobrado si está pagado, si no la cuota. */
export function rowAmount(r: PaymentRow): number {
  return isPaidStatus(r.effective_status) && r.paid_amount_eur != null ? Number(r.paid_amount_eur) : Number(r.price_eur || 0);
}

/** Búsqueda sin tildes ni mayúsculas: "alvaro" encuentra "Álvaro". */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
