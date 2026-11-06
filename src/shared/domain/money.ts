/**
 * Módulo de cálculo monetario y desglose de IVA para 247Studio WebApp.
 * Invariante fiscal fundamental: baseCents + vatCents === totalCents
 */

export interface VatBreakdown {
  totalCents: number;
  baseCents: number;
  vatCents: number;
  vatRate: number;
}

/**
 * Calcula el desglose de IVA a partir de un total con IVA incluido expresado en céntimos enteros.
 * @param totalCents Importe total en céntimos (entero >= 0)
 * @param vatRate Tasa de IVA (por defecto 0.21 para 21%)
 */
export function calculateVatBreakdown(totalCents: number, vatRate: number = 0.21): VatBreakdown {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error(`Total en céntimos inválido: ${totalCents}. Debe ser un entero mayor o igual a 0.`);
  }

  if (typeof vatRate !== 'number' || vatRate < 0 || isNaN(vatRate)) {
    throw new Error(`Tasa de IVA inválida: ${vatRate}. Debe ser un número >= 0.`);
  }

  if (totalCents === 0) {
    return {
      totalCents: 0,
      baseCents: 0,
      vatCents: 0,
      vatRate,
    };
  }

  // baseCents = round(total / (1 + vatRate))
  const baseCents = Math.round(totalCents / (1 + vatRate));
  const vatCents = totalCents - baseCents;

  // Invariante de seguridad
  if (baseCents + vatCents !== totalCents) {
    throw new Error(`Violación de invariante fiscal: ${baseCents} + ${vatCents} !== ${totalCents}`);
  }

  return {
    totalCents,
    baseCents,
    vatCents,
    vatRate,
  };
}
