import {
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
 * Horario oficial por defecto extraído directamente de la Diapositiva 8 del PowerPoint de 247Studio.
 * Sirve como fallback garantizado si la base de datos Firestore está recién creada.
 */
export const DEFAULT_OFFICIAL_SCHEDULES: ScheduleDomainModel[] = [
  // LUNES (1)
  { id: 'sched-1-1', dayOfWeek: 1, startTime: '10:00', endTime: '11:30', program: 'GI', professor: 'Mario Bros', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-1-2', dayOfWeek: 1, startTime: '17:30', endTime: '18:30', program: 'KIDS 1', professor: 'David', active: true, room: 'Tatami 2 (Kids)', levelRequired: 'KIDS' },
  { id: 'sched-1-3', dayOfWeek: 1, startTime: '18:30', endTime: '19:30', program: 'KIDS 2', professor: 'David', active: true, room: 'Tatami 2 (Kids)', levelRequired: 'KIDS' },
  { id: 'sched-1-4', dayOfWeek: 1, startTime: '19:30', endTime: '20:30', program: 'GI', professor: 'Mario Bros', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-1-5', dayOfWeek: 1, startTime: '20:30', endTime: '21:30', program: 'GRAPPLING', professor: 'David', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },

  // MARTES (2)
  { id: 'sched-2-1', dayOfWeek: 2, startTime: '10:00', endTime: '11:30', program: 'GRAPPLING', professor: 'David', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-2-2', dayOfWeek: 2, startTime: '17:30', endTime: '18:30', program: 'MMA', professor: 'Coach Pro', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-2-3', dayOfWeek: 2, startTime: '18:30', endTime: '19:30', program: 'BJJ FEM', professor: 'Instructora BJJ', active: true, room: 'Tatami 2 (Anexo)', levelRequired: 'TODOS' },
  { id: 'sched-2-4', dayOfWeek: 2, startTime: '19:30', endTime: '20:30', program: 'GRAPPLING', professor: 'David', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-2-5', dayOfWeek: 2, startTime: '20:30', endTime: '21:30', program: 'COMP CLAS.', professor: 'Mario Bros', active: true, room: 'Tatami Principal', levelRequired: 'COMPETICION' },

  // MIÉRCOLES (3)
  { id: 'sched-3-1', dayOfWeek: 3, startTime: '10:00', endTime: '11:30', program: 'GI', professor: 'Mario Bros', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-3-2', dayOfWeek: 3, startTime: '17:30', endTime: '18:30', program: 'KIDS 1', professor: 'David', active: true, room: 'Tatami 2 (Kids)', levelRequired: 'KIDS' },
  { id: 'sched-3-3', dayOfWeek: 3, startTime: '18:30', endTime: '19:30', program: 'KIDS 2', professor: 'David', active: true, room: 'Tatami 2 (Kids)', levelRequired: 'KIDS' },
  { id: 'sched-3-4', dayOfWeek: 3, startTime: '19:30', endTime: '20:30', program: 'GI', professor: 'Mario Bros', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-3-5', dayOfWeek: 3, startTime: '20:30', endTime: '21:30', program: 'GRAPPLING', professor: 'David', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },

  // JUEVES (4)
  { id: 'sched-4-1', dayOfWeek: 4, startTime: '10:00', endTime: '11:30', program: 'GRAPPLING', professor: 'David', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-4-2', dayOfWeek: 4, startTime: '17:30', endTime: '18:30', program: 'MMA', professor: 'Coach Pro', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-4-3', dayOfWeek: 4, startTime: '18:30', endTime: '19:30', program: 'BJJ FEM', professor: 'Instructora BJJ', active: true, room: 'Tatami 2 (Anexo)', levelRequired: 'TODOS' },
  { id: 'sched-4-4', dayOfWeek: 4, startTime: '19:30', endTime: '20:30', program: 'LUCHA', professor: 'Wrestling Coach', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-4-5', dayOfWeek: 4, startTime: '20:30', endTime: '21:30', program: 'GI SPARRING', professor: 'Mario Bros', active: true, room: 'Tatami Principal', levelRequired: 'AVANZADO' },

  // VIERNES (5)
  { id: 'sched-5-1', dayOfWeek: 5, startTime: '10:00', endTime: '11:30', program: 'GRAPPLING', professor: 'David', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-5-2', dayOfWeek: 5, startTime: '17:30', endTime: '18:30', program: 'KIDS 1', professor: 'David', active: true, room: 'Tatami 2 (Kids)', levelRequired: 'KIDS' },
  { id: 'sched-5-3', dayOfWeek: 5, startTime: '18:30', endTime: '19:30', program: 'MMA', professor: 'Coach Pro', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-5-4', dayOfWeek: 5, startTime: '19:30', endTime: '20:30', program: 'LUCHA', professor: 'Wrestling Coach', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
  { id: 'sched-5-5', dayOfWeek: 5, startTime: '20:30', endTime: '21:30', program: 'OPEN MAT', professor: 'Mario & David', active: true, room: 'Tatami Principal', levelRequired: 'TODOS' },
];

/**
 * Calcula la duración en minutos entre dos horas 'HH:mm'.
 */
export function calculateScheduleDurationMinutes(startTime: string, endTime: string): number {
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);
  const diff = h2 * 60 + m2 - (h1 * 60 + m1);
  return diff > 0 ? diff : 0;
}

/**
 * Paleta de colores temáticos por programa marcial para la parrilla Gymdesk/Wodify.
 */
export function getProgramTheme(program: string) {
  const p = (program || '').toUpperCase();
  if (p.includes('GI') && !p.includes('NO-GI') && !p.includes('GRAPPLING')) {
    return {
      bg: 'bg-blue-50/90 hover:bg-blue-100/90',
      text: 'text-blue-800',
      border: 'border-blue-200',
      badge: 'bg-blue-600 text-white',
      borderLeft: 'border-l-4 border-l-blue-600',
      accentHex: '#2563EB',
    };
  }
  if (p.includes('GRAPPLING') || p.includes('NO-GI') || p.includes('NOGI')) {
    return {
      bg: 'bg-amber-50/90 hover:bg-amber-100/90',
      text: 'text-amber-900',
      border: 'border-amber-200',
      badge: 'bg-amber-600 text-white',
      borderLeft: 'border-l-4 border-l-amber-600',
      accentHex: '#D97706',
    };
  }
  if (p.includes('KIDS')) {
    return {
      bg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
      text: 'text-emerald-900',
      border: 'border-emerald-200',
      badge: 'bg-emerald-600 text-white',
      borderLeft: 'border-l-4 border-l-emerald-600',
      accentHex: '#059669',
    };
  }
  if (p.includes('MMA') || p.includes('COMP') || p.includes('LUCHA')) {
    return {
      bg: 'bg-rose-50/90 hover:bg-rose-100/90',
      text: 'text-rose-900',
      border: 'border-rose-200',
      badge: 'bg-rose-600 text-white',
      borderLeft: 'border-l-4 border-l-rose-600',
      accentHex: '#E11D48',
    };
  }
  if (p.includes('OPEN MAT')) {
    return {
      bg: 'bg-purple-50/90 hover:bg-purple-100/90',
      text: 'text-purple-900',
      border: 'border-purple-200',
      badge: 'bg-purple-600 text-white',
      borderLeft: 'border-l-4 border-l-purple-600',
      accentHex: '#7C3AED',
    };
  }
  if (p.includes('FEM')) {
    return {
      bg: 'bg-pink-50/90 hover:bg-pink-100/90',
      text: 'text-pink-900',
      border: 'border-pink-200',
      badge: 'bg-pink-600 text-white',
      borderLeft: 'border-l-4 border-l-pink-600',
      accentHex: '#DB2777',
    };
  }
  return {
    bg: 'bg-slate-50 hover:bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-200',
    badge: 'bg-slate-700 text-white',
    borderLeft: 'border-l-4 border-l-slate-600',
    accentHex: '#475569',
  };
}

export interface ScheduleConflict {
  scheduleAId: string;
  scheduleBId: string;
  dayOfWeek: number;
  type: 'ROOM_OVERLAP' | 'PROFESSOR_OVERLAP';
  description: string;
}

/**
 * Detecta solapamientos de sala o profesor en la misma franja horaria.
 */
export function detectScheduleConflicts(schedules: ScheduleDomainModel[]): ScheduleConflict[] {
  const active = schedules.filter((s) => s.active);
  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      if (a.dayOfWeek !== b.dayOfWeek) continue;

      const aStart = parseTimeToMinutes(a.startTime);
      const aEnd = parseTimeToMinutes(a.endTime);
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime);

      const overlaps = Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
      if (!overlaps) continue;

      const dayName = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][a.dayOfWeek] || `Día ${a.dayOfWeek}`;

      // Conflicto de tatami / sala
      if (a.room && b.room && a.room.trim().toLowerCase() === b.room.trim().toLowerCase()) {
        conflicts.push({
          scheduleAId: a.id,
          scheduleBId: b.id,
          dayOfWeek: a.dayOfWeek,
          type: 'ROOM_OVERLAP',
          description: `Solapamiento en ${a.room} el ${dayName}: "${a.program}" (${a.startTime}-${a.endTime}) coincide con "${b.program}" (${b.startTime}-${b.endTime}).`,
        });
      }

      // Conflicto de profesor
      if (
        a.professor &&
        b.professor &&
        a.professor.trim().toLowerCase() === b.professor.trim().toLowerCase() &&
        !a.professor.includes('&')
      ) {
        conflicts.push({
          scheduleAId: a.id,
          scheduleBId: b.id,
          dayOfWeek: a.dayOfWeek,
          type: 'PROFESSOR_OVERLAP',
          description: `Doble asignación de ${a.professor} el ${dayName}: programado a la vez en "${a.program}" y "${b.program}".`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Agregado semanal para el panel de métricas operativas de tatami (REA Architecture).
 */
export function calculateWeeklyStats(schedules: ScheduleDomainModel[]) {
  const activeSchedules = schedules.filter((s) => s.active);
  let totalMinutes = 0;
  const professorMap: Record<string, { count: number; minutes: number }> = {};
  const roomMap: Record<string, number> = {};

  activeSchedules.forEach((s) => {
    const dur = calculateScheduleDurationMinutes(s.startTime, s.endTime);
    totalMinutes += dur;

    const prof = s.professor || 'Sin asignar';
    if (!professorMap[prof]) {
      professorMap[prof] = { count: 0, minutes: 0 };
    }
    professorMap[prof].count += 1;
    professorMap[prof].minutes += dur;

    const room = s.room || 'Tatami Principal';
    roomMap[room] = (roomMap[room] || 0) + 1;
  });

  const hours = (totalMinutes / 60).toFixed(1);

  return {
    totalClasses: schedules.length,
    activeClasses: activeSchedules.length,
    totalMinutes,
    totalHours: `${hours}h`,
    professorBreakdown: professorMap,
    roomBreakdown: roomMap,
  };
}
