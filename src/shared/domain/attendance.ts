import { BookingDomainModel, RetentionRisk, SessionType } from './types';

/**
 * Ponderación de asistencia según rol en la sesión.
 * El progreso hacia el siguiente cinturón y cálculo de esfuerzo usan este peso acumulado.
 */
export function getAttendanceWeight(sessionType: SessionType): number {
  switch (sessionType) {
    case 'PARTICIPANT':
      return 1.0;
    case 'OBSERVER':
      return 0.5;
    case 'GRADUATION_CLASS':
      return 3.0;
    default:
      return 1.0;
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Deriva de forma pura el riesgo de retención de un alumno a partir de su historial.
 * @param attendanceHistory Lista de bookings del alumno
 * @param now Fecha actual inyectada
 */
export function deriveRetentionRisk(
  attendanceHistory: Pick<BookingDomainModel, 'date' | 'status'>[],
  now: Date
): RetentionRisk {
  const nowMs = now.getTime();

  // 1. Filtrar asistencias ATTENDED
  const attendedBookings = attendanceHistory
    .filter((b) => b.status === 'ATTENDED')
    .map((b) => new Date(b.date).getTime())
    .sort((a, b) => b - a); // Más recientes primero

  // Si nunca ha asistido, evaluamos si tiene historial
  if (attendedBookings.length === 0) {
    return 'HIGH';
  }

  const mostRecentAttendedMs = attendedBookings[0];
  const daysSinceLastAttended = Math.floor((nowMs - mostRecentAttendedMs) / MS_PER_DAY);

  // 2. Cálculo de no-shows en los últimos 30 días
  const last30DaysMs = nowMs - 30 * MS_PER_DAY;
  const recentBookings = attendanceHistory.filter((b) => {
    const t = new Date(b.date).getTime();
    return t >= last30DaysMs && t <= nowMs;
  });

  const totalRecentActiveBookings = recentBookings.filter(
    (b) => b.status === 'ATTENDED' || b.status === 'NO_SHOW'
  );

  let noShowRatio = 0;
  if (totalRecentActiveBookings.length > 0) {
    const noShowCount = totalRecentActiveBookings.filter((b) => b.status === 'NO_SHOW').length;
    noShowRatio = noShowCount / totalRecentActiveBookings.length;
  }

  // 3. Frecuencia últimas 4 semanas (días 0 a 28) vs 4 anteriores (días 28 a 56)
  const window1Start = nowMs - 28 * MS_PER_DAY;
  const window2Start = nowMs - 56 * MS_PER_DAY;

  const attendedLast4Weeks = attendedBookings.filter((t) => t >= window1Start && t <= nowMs).length;
  const attendedPrev4Weeks = attendedBookings.filter((t) => t >= window2Start && t < window1Start).length;

  let frequencyDropRatio = 0;
  if (attendedPrev4Weeks > 0) {
    frequencyDropRatio = (attendedPrev4Weeks - attendedLast4Weeks) / attendedPrev4Weeks;
  }

  // Criterios HIGH
  if (
    daysSinceLastAttended >= 21 ||
    (attendedPrev4Weeks > 0 && frequencyDropRatio > 0.5) ||
    noShowRatio > 0.3
  ) {
    return 'HIGH';
  }

  // Criterios MEDIUM
  if (
    (daysSinceLastAttended >= 14 && daysSinceLastAttended <= 20) ||
    (attendedPrev4Weeks > 0 && frequencyDropRatio >= 0.3 && frequencyDropRatio <= 0.5)
  ) {
    return 'MEDIUM';
  }

  return 'LOW';
}
