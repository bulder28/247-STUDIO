import { describe, expect, it } from 'vitest';
import { calculateExactAge, deriveCategory, isLegalMinor } from '../../src/shared/domain/minor';

describe('Dominio Puro: Evaluación de Menores y Doble Umbral Etario', () => {
  const referenceNow = new Date('2026-11-06T12:00:00Z');

  it('un usuario con exactamente 14 años cumplidos hoy es autónomo legalmente pero categoría KID', () => {
    // Nacido el 2012-11-06 => 14 años exactos
    const birthDate = '2012-11-06';
    const age = calculateExactAge(birthDate, referenceNow);
    expect(age).toBe(14);

    // Umbral Legal (14 años)
    expect(isLegalMinor(birthDate, referenceNow)).toBe(false);

    // Umbral Deportivo (18 años)
    expect(deriveCategory(birthDate, referenceNow)).toBe('KID');
  });

  it('un usuario con 13 años y 364 días (cumple mañana) es menor legal y categoría KID', () => {
    // Nacido el 2012-11-07 => 13 años (cumple 14 mañana)
    const birthDate = '2012-11-07';
    const age = calculateExactAge(birthDate, referenceNow);
    expect(age).toBe(13);

    expect(isLegalMinor(birthDate, referenceNow)).toBe(true);
    expect(deriveCategory(birthDate, referenceNow)).toBe('KID');
  });

  it('un usuario con 18 años cumplidos es mayor de edad y categoría ADULT', () => {
    const birthDate = '2008-11-06'; // Exactamente 18 años
    const age = calculateExactAge(birthDate, referenceNow);
    expect(age).toBe(18);

    expect(isLegalMinor(birthDate, referenceNow)).toBe(false);
    expect(deriveCategory(birthDate, referenceNow)).toBe('ADULT');
  });
});
