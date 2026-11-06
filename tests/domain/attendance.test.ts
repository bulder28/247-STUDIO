import { describe, expect, it } from 'vitest';
import { deriveRetentionRisk, getAttendanceWeight } from '../../src/shared/domain/attendance';
import { BookingDomainModel } from '../../src/shared/domain/types';

describe('Dominio Puro: Ponderación de Asistencia y Riesgo de Retención', () => {
  describe('getAttendanceWeight', () => {
    it('calcula 2 PARTICIPANT (1.0 cada uno) + 1 OBSERVER (0.5) = 2.5 de peso acumulado', () => {
      const weight1 = getAttendanceWeight('PARTICIPANT');
      const weight2 = getAttendanceWeight('PARTICIPANT');
      const weight3 = getAttendanceWeight('OBSERVER');
      expect(weight1 + weight2 + weight3).toBe(2.5);
    });

    it('asigna 3.0 para sesión especial GRADUATION_CLASS', () => {
      expect(getAttendanceWeight('GRADUATION_CLASS')).toBe(3.0);
    });
  });

  describe('deriveRetentionRisk', () => {
    const fixedNow = new Date('2026-11-06T12:00:00Z');

    it('asigna HIGH cuando han pasado 25 días sin asistencia ATTENDED (>= 21 días)', () => {
      const history: Pick<BookingDomainModel, 'date' | 'status'>[] = [
        { date: '2026-10-12', status: 'ATTENDED' }, // 25 días antes
      ];
      const risk = deriveRetentionRisk(history, fixedNow);
      expect(risk).toBe('HIGH');
    });

    it('asigna MEDIUM cuando han transcurrido 15 días desde la última asistencia (14-20 días)', () => {
      const history: Pick<BookingDomainModel, 'date' | 'status'>[] = [
        { date: '2026-10-22', status: 'ATTENDED' }, // 15 días antes
        { date: '2026-10-20', status: 'ATTENDED' },
      ];
      const risk = deriveRetentionRisk(history, fixedNow);
      expect(risk).toBe('MEDIUM');
    });

    it('asigna LOW cuando el alumno asistió hace 5 días y mantiene regularidad', () => {
      const history: Pick<BookingDomainModel, 'date' | 'status'>[] = [
        { date: '2026-11-01', status: 'ATTENDED' }, // 5 días antes
        { date: '2026-10-28', status: 'ATTENDED' },
        { date: '2026-10-25', status: 'ATTENDED' },
        { date: '2026-10-15', status: 'ATTENDED' },
        { date: '2026-10-05', status: 'ATTENDED' },
      ];
      const risk = deriveRetentionRisk(history, fixedNow);
      expect(risk).toBe('LOW');
    });

    it('asigna HIGH si el ratio de NO_SHOW supera el 30% en los últimos 30 días', () => {
      const history: Pick<BookingDomainModel, 'date' | 'status'>[] = [
        { date: '2026-11-04', status: 'ATTENDED' }, // Asistió hace 2 días (no por días)
        { date: '2026-11-02', status: 'NO_SHOW' },
        { date: '2026-10-30', status: 'NO_SHOW' },
        // 1 ATTENDED y 2 NO_SHOW => ratio NO_SHOW = 66.6% (> 30%)
      ];
      const risk = deriveRetentionRisk(history, fixedNow);
      expect(risk).toBe('HIGH');
    });
  });
});
