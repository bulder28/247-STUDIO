import { describe, expect, it } from 'vitest';
import {
  BELT_DISCIPLINES,
  DISCIPLINES,
  disciplineForProgram,
  disciplineHasBelt,
} from '@/shared/domain/disciplines';
import { DEFAULT_OFFICIAL_SCHEDULES } from '@/shared/domain/schedule';

describe('disciplines registry', () => {
  it('flags belt-based and non-belt disciplines', () => {
    expect(disciplineHasBelt('BJJ')).toBe(true);
    expect(disciplineHasBelt('GRAPPLING')).toBe(true);
    expect(disciplineHasBelt('KIDS')).toBe(true);
    expect(disciplineHasBelt('MMA')).toBe(false);
    expect(disciplineHasBelt('LUCHA')).toBe(false);
  });

  it('treats unknown ids as having no belt', () => {
    expect(disciplineHasBelt('YOGA')).toBe(false);
  });

  it('BELT_DISCIPLINES only contains belt-based disciplines', () => {
    expect(BELT_DISCIPLINES.map((d) => d.id)).toEqual(['BJJ', 'GRAPPLING', 'KIDS']);
    expect(BELT_DISCIPLINES.every((d) => d.hasBelt)).toBe(true);
  });

  it('has unique ids', () => {
    const ids = DISCIPLINES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('disciplineForProgram', () => {
  it.each([
    ['GI', 'BJJ'],
    ['GI SPARRING', 'BJJ'],
    ['BJJ FEM', 'BJJ'],
    ['COMP CLAS.', 'BJJ'],
    ['GRAPPLING', 'GRAPPLING'],
    ['KIDS 1', 'KIDS'],
    ['MMA', 'MMA'],
    ['LUCHA', 'LUCHA'],
  ])('maps %s to %s', (program, expected) => {
    expect(disciplineForProgram(program)).toBe(expected);
  });

  it('returns null for mixed or empty programs', () => {
    expect(disciplineForProgram('OPEN MAT')).toBeNull();
    expect(disciplineForProgram('')).toBeNull();
  });

  it('resolves every official schedule program except OPEN MAT', () => {
    const unresolved = DEFAULT_OFFICIAL_SCHEDULES.filter(
      (s) => disciplineForProgram(s.program) === null
    ).map((s) => s.program);
    expect(new Set(unresolved)).toEqual(new Set(['OPEN MAT']));
  });
});
