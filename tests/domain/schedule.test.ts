import { describe, expect, it } from 'vitest';
import { getMadridYearMonth } from '../../src/shared/domain/payment-status';
import { canCancel, getNextClass, isClassInProgress } from '../../src/shared/domain/schedule';
import { ScheduleDomainModel, ScheduleExceptionDomainModel } from '../../src/shared/domain/types';

describe('Dominio Puro: Horarios, Fechas en Madrid y Cancelaciones', () => {
  describe('Zonas Horarias y Periodos Madrid', () => {
    it('calcula 2024-12 para 31 dic 23:59 hora Madrid y 2025-01 para 1 ene 00:00', () => {
      // 31 dic 2024 23:59:00 en Madrid (UTC+1 => 22:59:00Z)
      const dec31 = new Date('2024-12-31T22:59:00Z');
      expect(getMadridYearMonth(dec31)).toBe('2024-12');

      // 1 ene 2025 00:00:00 en Madrid (UTC+1 => 2024-12-31T23:00:00Z)
      const jan01 = new Date('2024-12-31T23:00:00Z');
      expect(getMadridYearMonth(jan01)).toBe('2025-01');
    });

    it('gestiona correctamente los días de cambio de hora (octubre y marzo)', () => {
      // Último domingo de octubre (cambio de CEST UTC+2 a CET UTC+1)
      const octEnd = new Date('2026-10-25T01:30:00Z');
      expect(getMadridYearMonth(octEnd)).toBe('2026-10');
    });
  });

  describe('isClassInProgress & getNextClass', () => {
    const schedules: ScheduleDomainModel[] = [
      {
        id: 's-mon-morning',
        dayOfWeek: 1, // Lunes
        startTime: '10:00',
        endTime: '11:30',
        professor: 'Prof. Carlos',
        program: 'BJJ Fundamentals',
        active: true,
      },
      {
        id: 's-mon-evening-1',
        dayOfWeek: 1,
        startTime: '17:30',
        endTime: '18:30',
        professor: 'Prof. Carlos',
        program: 'BJJ All Levels',
        active: true,
      },
      {
        id: 's-fri-last',
        dayOfWeek: 5, // Viernes
        startTime: '20:30',
        endTime: '21:30',
        professor: 'Prof. Sofia',
        program: 'BJJ Open Mat',
        active: true,
      },
      {
        id: 's-inactive',
        dayOfWeek: 1,
        startTime: '18:30',
        endTime: '19:30',
        professor: 'Guest',
        program: 'Judo',
        active: false,
      },
    ];

    it('identifica clase en curso: inicio inclusivo (10:00) y fin exclusivo (11:30)', () => {
      // Lunes 2026-11-02 a las 10:00 hora Madrid (UTC+1 => 09:00Z)
      const atStart = new Date('2026-11-02T09:00:00Z');
      expect(isClassInProgress(schedules[0], [], atStart)).toBe(true);

      // A las 11:29:59 => en curso
      const justBeforeEnd = new Date('2026-11-02T10:29:59Z');
      expect(isClassInProgress(schedules[0], [], justBeforeEnd)).toBe(true);

      // A las 11:30:00 => fuera (fin exclusivo)
      const atEnd = new Date('2026-11-02T10:30:00Z');
      expect(isClassInProgress(schedules[0], [], atEnd)).toBe(false);
    });

    it('en el hueco 11:30 a 17:30 no hay clase en curso y la siguiente es la de 17:30', () => {
      const at1400 = new Date('2026-11-02T13:00:00Z'); // Lunes 14:00 Madrid
      expect(isClassInProgress(schedules[0], [], at1400)).toBe(false);
      expect(isClassInProgress(schedules[1], [], at1400)).toBe(false);

      const next = getNextClass(schedules, [], at1400);
      expect(next).not.toBeNull();
      expect(next?.schedule.id).toBe('s-mon-evening-1');
    });

    it('el viernes tras la última clase (21:35) la siguiente clase es el lunes a las 10:00', () => {
      // Viernes 2026-11-06 a las 21:35 Madrid (20:35Z)
      const fridayNight = new Date('2026-11-06T20:35:00Z');
      const next = getNextClass(schedules, [], fridayNight);
      expect(next).not.toBeNull();
      expect(next?.schedule.id).toBe('s-mon-morning');
      expect(next?.targetDateStr).toBe('2026-11-09'); // Lunes siguiente
    });

    it('ignora franjas horarias con excepción activa para la fecha', () => {
      const at0900 = new Date('2026-11-02T08:00:00Z'); // Lunes 09:00 Madrid
      const exceptions: ScheduleExceptionDomainModel[] = [
        {
          id: 'exc-1',
          scheduleId: 's-mon-morning',
          date: '2026-11-02',
          reason: 'Mantenimiento del tatami',
          createdAt: '2026-11-01T10:00:00Z',
          createdBy: 'admin-1',
        },
      ];

      // La de las 10:00 está exceptuada hoy, por lo que la siguiente es la de las 17:30
      const next = getNextClass(schedules, exceptions, at0900);
      expect(next?.schedule.id).toBe('s-mon-evening-1');
    });
  });

  describe('canCancel', () => {
    const schedule = { startTime: '18:00' };
    const booking = { date: '2026-11-06', status: 'BOOKED' as const };
    const deadlineHours = 2;

    it('permite cancelar si faltan 4 horas (> 2h deadline)', () => {
      const now = new Date('2026-11-06T13:00:00Z'); // 14:00 Madrid => faltan 4h para las 18:00
      expect(canCancel(booking, schedule, deadlineHours, now)).toBe(true);
    });

    it('deniega cancelación si falta 1 hora (< 2h deadline)', () => {
      const now = new Date('2026-11-06T16:00:00Z'); // 17:00 Madrid => falta 1h
      expect(canCancel(booking, schedule, deadlineHours, now)).toBe(false);
    });

    it('el administrador siempre tiene override para cancelar fuera de plazo', () => {
      const now = new Date('2026-11-06T16:50:00Z'); // Faltan 10 min
      expect(canCancel(booking, schedule, deadlineHours, now, true)).toBe(true);
    });
  });
});
