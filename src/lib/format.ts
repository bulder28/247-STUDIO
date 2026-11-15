const eurFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const intFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

const MONTH_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** 1250.4 → "1.250 €" (sin decimales, separador de miles es-ES). */
export function formatEUR(value: number): string {
  return eurFormatter.format(Number.isFinite(value) ? value : 0);
}

const eurExactFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Importes de caja: 1250.5 → "1.250,5 €", 62 → "62 €" (hasta 2 decimales, sin redondear céntimos). */
export function formatEURExact(value: number): string {
  return eurExactFormatter.format(Number.isFinite(value) ? value : 0);
}

/** 1250 → "1.250". */
export function formatInt(value: number): string {
  return intFormatter.format(Number.isFinite(value) ? value : 0);
}

/** "2026-11" → "Noviembre 2026". */
export function formatMonthLong(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTH_LONG[m - 1]} ${y}`;
}
