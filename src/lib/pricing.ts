export const FOUNDER_DISCOUNT_RATE = 0.10;

/**
 * Calcula el precio final de Socio Fundador (SF): 10% de descuento redondeado a euro entero
 * (ej. 69 € -> 62 €).
 */
export function getFounderPrice(basePriceEur: number): number {
  const numeric = Number(basePriceEur || 0);
  return Math.round(numeric * (1 - FOUNDER_DISCOUNT_RATE));
}

/**
 * Devuelve la cuota aplicable a un alumno según si es Socio Fundador (SF) o tarifa estándar.
 */
export function getEffectivePlanPrice(basePriceEur: number, isFounder?: boolean | null): number {
  const numeric = Number(basePriceEur || 0);
  return isFounder ? getFounderPrice(numeric) : numeric;
}

