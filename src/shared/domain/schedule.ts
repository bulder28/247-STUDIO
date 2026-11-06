import {
  BookingDomainModel,
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
} from './types';

/**
 * Obtiene los componentes temporales de `now` en la zona horaria 'Europe/Madrid'.
 */
export function getMadridTimeComponents(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  const dayOfWeek = weekdayMap[getVal('weekday')] || 1;
  const hour = parseInt(getVal('hour'), 10);
  const minute = parseInt(getVal('minute'), 10);
  const timeInMinutes = hour * 60 + minute;
  const dateStr = `${getVal('year')}-${getVal('month')}-${getVal('day')}`;

  return {
    dayOfWeek,
    hour,
    minute,
    timeInMinutes,
    dateStr,
  };
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
}

/**
 * Evalúa si una clase está actualmente en curso (inicio inclusivo, fin exclusivo).
 */
export function isClassInProgress(
  schedule: ScheduleDomainModel,
  exceptions: ScheduleExceptionDomainModel[],
  now: Date
): boolean {
  if (!schedule.active) return false;

  const madrid = getMadridTimeComponents(now);
  if (schedule.dayOfWeek !== madrid.dayOfWeek) return false;

  // Verificar si hay una excepción activa para este horario hoy
  const hasException = exceptions.some(
    (e) => e.scheduleId === schedule.id && e.date === madrid.dateStr
  );
  if (hasException) return false;

  const startMin = parseTimeToMinutes(schedule.startTime);
  const endMin = parseTimeToMinutes(schedule.endTime);

  return madrid.timeInMinutes >= startMin && madrid.timeInMinutes < endMin;
}

/**
 * Determina la siguiente clase disponible en la parrilla horaria.
 * Considera el fin de semana, saltando de viernes tras la última clase a lunes 10:00.
 */
export function getNextClass(
  schedules: ScheduleDomainModel[],
  exceptions: ScheduleExceptionDomainModel[],
  now: Date
): { schedule: ScheduleDomainModel; targetDateStr: string } | null {
  const activeSchedules = schedules.filter((s) => s.active);
  if (activeSchedules.length === 0) return null;

  const madrid = getMadridTimeComponents(now);

  // Buscar en los próximos 7 días a partir de hoy
  for (let offset = 0; offset < 7; offset++) {
    // Calculamos el día a evaluar
    const evalDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const evalMadrid = getMadridTimeComponents(evalDate);
    const dayOfWeek = evalMadrid.dayOfWeek;

    // Solo clases activas de ese día de la semana
    const daySchedules = activeSchedules
      .filter((s) => s.dayOfWeek === dayOfWeek)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    for (const sched of daySchedules) {
      // Excepción ese día
      const isExcepted = exceptions.some(
        (e) => e.scheduleId === sched.id && e.date === evalMadrid.dateStr
      );
      if (isExcepted) continue;

      const startMin = parseTimeToMinutes(sched.startTime);

      // Si es hoy, debe empezar en el futuro
      if (offset === 0) {
        if (startMin > madrid.timeInMinutes) {
          return { schedule: sched, targetDateStr: evalMadrid.dateStr };
        }
      } else {
        // En días posteriores, es la primera no cancelada
        return { schedule: sched, targetDateStr: evalMadrid.dateStr };
      }
    }
  }

  return null;
}

/**
 * Valida si una reserva puede ser cancelada por el alumno según el plazo límite.
 * El admin cuenta siempre con facultad de override.
 */
export function canCancel(
  booking: Pick<BookingDomainModel, 'date' | 'status'>,
  schedule: Pick<ScheduleDomainModel, 'startTime'>,
  cancellationDeadlineHours: number,
  now: Date,
  isAdmin: boolean = false
): boolean {
  if (isAdmin) return true;
  if (booking.status !== 'BOOKED' && booking.status !== 'WAITLISTED') return false;

  // Reconstruir la fecha y hora de la clase en Europe/Madrid
  const [year, month, day] = booking.date.split('-').map((v) => parseInt(v, 10));
  const [hour, minute] = schedule.startTime.split(':').map((v) => parseInt(v, 10));

  // Creamos la fecha objetivo en UTC considerando el offset de Madrid
  const classStartApprox = new Date(Date.UTC(year, month - 1, day, hour - 1, minute)); 
  const deadlineMs = cancellationDeadlineHours * 60 * 60 * 1000;

  return (classStartApprox.getTime() - now.getTime()) >= deadlineMs;
}

/**
 * Horario oficial por defecto extraído directamente de la Diapositiva 8 del PowerPoint de 247Studio.
 * Sirve como fallback garantizado si la base de datos Firestore está recién creada.
 */
export const DEFAULT_OFFICIAL_SCHEDULES: ScheduleDomainModel[] = [
  // LUNES (1)
  { id: 'sched-1-1', dayOfWeek: 1, startTime: '10:00', endTime: '11:30', program: 'GI', professor: 'Mario Bros', capacity: 26, active: true },
  { id: 'sched-1-2', dayOfWeek: 1, startTime: '17:30', endTime: '18:30', program: 'KIDS 1', professor: 'David', capacity: 16, active: true },
  { id: 'sched-1-3', dayOfWeek: 1, startTime: '18:30', endTime: '19:30', program: 'KIDS 2', professor: 'David', capacity: 18, active: true },
  { id: 'sched-1-4', dayOfWeek: 1, startTime: '19:30', endTime: '20:30', program: 'GI', professor: 'Mario Bros', capacity: 26, active: true },
  { id: 'sched-1-5', dayOfWeek: 1, startTime: '20:30', endTime: '21:30', program: 'GRAPPLING', professor: 'David', capacity: 26, active: true },

  // MARTES (2)
  { id: 'sched-2-1', dayOfWeek: 2, startTime: '10:00', endTime: '11:30', program: 'GRAPPLING', professor: 'David', capacity: 24, active: true },
  { id: 'sched-2-2', dayOfWeek: 2, startTime: '17:30', endTime: '18:30', program: 'MMA', professor: 'Coach Pro', capacity: 20, active: true },
  { id: 'sched-2-3', dayOfWeek: 2, startTime: '18:30', endTime: '19:30', program: 'BJJ FEM', professor: 'Instructora BJJ', capacity: 20, active: true },
  { id: 'sched-2-4', dayOfWeek: 2, startTime: '19:30', endTime: '20:30', program: 'GRAPPLING', professor: 'David', capacity: 26, active: true },
  { id: 'sched-2-5', dayOfWeek: 2, startTime: '20:30', endTime: '21:30', program: 'COMP CLAS.', professor: 'Mario Bros', capacity: 22, active: true },

  // MIÉRCOLES (3)
  { id: 'sched-3-1', dayOfWeek: 3, startTime: '10:00', endTime: '11:30', program: 'GI', professor: 'Mario Bros', capacity: 26, active: true },
  { id: 'sched-3-2', dayOfWeek: 3, startTime: '17:30', endTime: '18:30', program: 'KIDS 1', professor: 'David', capacity: 16, active: true },
  { id: 'sched-3-3', dayOfWeek: 3, startTime: '18:30', endTime: '19:30', program: 'KIDS 2', professor: 'David', capacity: 18, active: true },
  { id: 'sched-3-4', dayOfWeek: 3, startTime: '19:30', endTime: '20:30', program: 'GI', professor: 'Mario Bros', capacity: 26, active: true },
  { id: 'sched-3-5', dayOfWeek: 3, startTime: '20:30', endTime: '21:30', program: 'GRAPPLING', professor: 'David', capacity: 26, active: true },

  // JUEVES (4)
  { id: 'sched-4-1', dayOfWeek: 4, startTime: '10:00', endTime: '11:30', program: 'GRAPPLING', professor: 'David', capacity: 24, active: true },
  { id: 'sched-4-2', dayOfWeek: 4, startTime: '17:30', endTime: '18:30', program: 'MMA', professor: 'Coach Pro', capacity: 20, active: true },
  { id: 'sched-4-3', dayOfWeek: 4, startTime: '18:30', endTime: '19:30', program: 'BJJ FEM', professor: 'Instructora BJJ', capacity: 20, active: true },
  { id: 'sched-4-4', dayOfWeek: 4, startTime: '19:30', endTime: '20:30', program: 'LUCHA', professor: 'Wrestling Coach', capacity: 22, active: true },
  { id: 'sched-4-5', dayOfWeek: 4, startTime: '20:30', endTime: '21:30', program: 'GI SPARRING', professor: 'Mario Bros', capacity: 26, active: true },

  // VIERNES (5)
  { id: 'sched-5-1', dayOfWeek: 5, startTime: '10:00', endTime: '11:30', program: 'GRAPPLING', professor: 'David', capacity: 24, active: true },
  { id: 'sched-5-2', dayOfWeek: 5, startTime: '17:30', endTime: '18:30', program: 'KIDS 1', professor: 'David', capacity: 16, active: true },
  { id: 'sched-5-3', dayOfWeek: 5, startTime: '18:30', endTime: '19:30', program: 'MMA', professor: 'Coach Pro', capacity: 20, active: true },
  { id: 'sched-5-4', dayOfWeek: 5, startTime: '19:30', endTime: '20:30', program: 'LUCHA', professor: 'Wrestling Coach', capacity: 22, active: true },
  { id: 'sched-5-5', dayOfWeek: 5, startTime: '20:30', endTime: '21:30', program: 'OPEN MAT', professor: 'Mario & David', capacity: 35, active: true },
];
