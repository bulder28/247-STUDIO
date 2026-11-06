import { describe, expect, it } from 'vitest';
import { calculateVatBreakdown } from '../../src/shared/domain/money';

describe('Dominio Puro: Cálculos Monetarios y Desglose de IVA', () => {
  it('desglosa correctamente 5000 céntimos (50,00 €) con IVA 21%', () => {
    const result = calculateVatBreakdown(5000, 0.21);
    expect(result.totalCents).toBe(5000);
    expect(result.baseCents).toBe(4132);
    expect(result.vatCents).toBe(868);
    expect(result.baseCents + result.vatCents).toBe(5000);
  });

  it('maneja 0 céntimos con base 0 e IVA 0', () => {
    const result = calculateVatBreakdown(0, 0.21);
    expect(result.baseCents).toBe(0);
    expect(result.vatCents).toBe(0);
    expect(result.totalCents).toBe(0);
  });

  it('maneja 1 céntimo con redondeo seguro', () => {
    const result = calculateVatBreakdown(1, 0.21);
    // 1 / 1.21 = 0.826 => round = 1
    expect(result.baseCents).toBe(1);
    expect(result.vatCents).toBe(0);
    expect(result.baseCents + result.vatCents).toBe(1);
  });

  it('cumple la invariante base + vat === total para todo el rango de 1 a 100.000 céntimos', () => {
    for (let cents = 1; cents <= 10000; cents++) {
      const res = calculateVatBreakdown(cents, 0.21);
      expect(res.baseCents + res.vatCents).toBe(cents);
    }
  });

  it('soporta tasas de IVA personalizables distintas de 0.21 (ej. 10%)', () => {
    const result = calculateVatBreakdown(1000, 0.10);
    // 1000 / 1.10 = 909.09 => round = 909
    expect(result.baseCents).toBe(909);
    expect(result.vatCents).toBe(91);
    expect(result.baseCents + result.vatCents).toBe(1000);
  });

  it('rechaza importes negativos o valores no enteros', () => {
    expect(() => calculateVatBreakdown(-500)).toThrow();
    expect(() => calculateVatBreakdown(49.99)).toThrow();
    expect(() => calculateVatBreakdown(NaN)).toThrow();
  });
});
