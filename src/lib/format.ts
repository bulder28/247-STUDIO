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

const eurWholeFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const eurCentsFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Importes de caja: 62 → "62 €", 38.9 → "38,90 €" (sin decimales si es redondo; si no, siempre 2). */
export function formatEURExact(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  return Math.round(v * 100) % 100 === 0 ? eurWholeFormatter.format(v) : eurCentsFormatter.format(v);
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
