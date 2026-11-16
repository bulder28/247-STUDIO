export const FOUNDER_DISCOUNT_RATE = 0.10;
export const FAMILY_DISCOUNT_RATE = 0.10;

/**
 * Calcula el precio final de Socio Fundador (SF).
 * Si la tarifa define un PVP SF explícito en BD (`sf_price_eur`), lo usa directamente;
 * si no, aplica el 10% de descuento redondeado a euro entero.
 */
export function getFounderPrice(
  basePriceEur: number,
  explicitSfPriceEur?: number | null
): number {
  if (explicitSfPriceEur !== null && explicitSfPriceEur !== undefined) {
    return Number(explicitSfPriceEur);
  }
  const numeric = Number(basePriceEur || 0);
  return Math.round(numeric * (1 - FOUNDER_DISCOUNT_RATE));
}

/**
 * Calcula el precio final con descuento por familiar.
 * Si la tarifa define un PVP FAM explícito en BD (`family_price_eur`), lo usa directamente;
 * si no existe columna explícita (undefined), aplica el 10% redondeado;
 * si `explicitFamilyPriceEur === null`, significa que el producto no tiene tarifa familiar.
 */
export function getFamilyDiscountPrice(
  basePriceEur: number,
  explicitFamilyPriceEur?: number | null
): number {
  if (explicitFamilyPriceEur !== null && explicitFamilyPriceEur !== undefined) {
    return Number(explicitFamilyPriceEur);
  }
  const numeric = Number(basePriceEur || 0);
  if (explicitFamilyPriceEur === null) {
    return numeric;
  }
  return Math.round(numeric * (1 - FAMILY_DISCOUNT_RATE));
}

/**
 * Devuelve la cuota aplicable a un alumno según si es Socio Fundador (SF) o tarifa estándar.
 */
export function getEffectivePlanPrice(
  basePriceEur: number,
  isFounder?: boolean | null,
  explicitSfPriceEur?: number | null
): number {
  const numeric = Number(basePriceEur || 0);
  return isFounder ? getFounderPrice(numeric, explicitSfPriceEur) : numeric;
}
