import { describe, expect, it } from 'vitest';
import { calculateWeightDivision } from '../../src/shared/domain/weightClasses';

describe('Weight Division Domain Calculations', () => {
  it('correctly categorizes male featherweight in IBJJF GI with Gi allowance', () => {
    // 67kg without gi + 2.2kg gi allowance = 69.2kg -> Feather (Pena, <= 70.0kg)
    const result = calculateWeightDivision(67, 'IBJJF_GI', 'MALE', false);
    expect(result.division.nameEs).toBe('Pena');
    expect(result.division.maxWeightKg).toBe(70.0);
    expect(result.actualWeightKg).toBe(69.2);
    expect(result.weightDiffKg).toBe(0.8);
  });

  it('correctly handles already wearing Gi in IBJJF GI', () => {
    // 69.5kg with Gi already on -> Feather (Pena, <= 70.0kg)
    const result = calculateWeightDivision(69.5, 'IBJJF_GI', 'MALE', true);
    expect(result.division.nameEs).toBe('Pena');
    expect(result.actualWeightKg).toBe(69.5);
    expect(result.weightDiffKg).toBe(0.5);
  });

  it('correctly places heavyweights in ADCC', () => {
    const result = calculateWeightDivision(85, 'ADCC', 'MALE', true);
    expect(result.division.name).toBe('-88 kg');
    expect(result.weightDiffKg).toBe(3);
  });

  it('correctly handles ultra heavy open division (>100.5kg)', () => {
    const result = calculateWeightDivision(105, 'IBJJF_GI', 'MALE', true);
    expect(result.division.nameEs).toBe('Pesadíssimo');
    expect(result.isUnlimited).toBe(true);
  });
});
