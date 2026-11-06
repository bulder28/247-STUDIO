import { AdultBelt, Belt, BeltSystem, BookingDomainModel, KidsBelt, UserDomainModel } from './types';

export const ADULT_BELT_ORDER: AdultBelt[] = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];

export const KIDS_BELT_ORDER: KidsBelt[] = [
  'WHITE',
  'GREY_WHITE',
  'GREY',
  'GREY_BLACK',
  'YELLOW_WHITE',
  'YELLOW',
  'YELLOW_BLACK',
  'ORANGE_WHITE',
  'ORANGE',
  'ORANGE_BLACK',
  'GREEN_WHITE',
  'GREEN',
  'GREEN_BLACK',
];

export interface NextPromotion {
  nextBelt: Belt;
  nextStripes: number;
  isBeltPromotion: boolean;
}

/**
 * Calcula el siguiente escalón de graduación (raya o cinturón).
 */
export function getNextPromotion(
  currentBelt: Belt,
  currentStripes: number,
  beltSystem: BeltSystem
): NextPromotion {
  const safeStripes = Math.max(0, Math.min(4, currentStripes));

  // Si tiene menos de 4 rayas, el siguiente paso es otra raya en el mismo cinturón
  if (safeStripes < 4) {
    return {
      nextBelt: currentBelt,
      nextStripes: safeStripes + 1,
      isBeltPromotion: false,
    };
  }

  // Si ya tiene 4 rayas, el siguiente paso es el ascenso de cinturón con 0 rayas
  if (beltSystem === 'KIDS') {
    const idx = KIDS_BELT_ORDER.indexOf(currentBelt as KidsBelt);
    if (idx !== -1 && idx < KIDS_BELT_ORDER.length - 1) {
      return {
        nextBelt: KIDS_BELT_ORDER[idx + 1],
        nextStripes: 0,
        isBeltPromotion: true,
      };
    }
    // Si ya es el último cinturón infantil (GREEN_BLACK), el paso natural al cumplir edad es WHITE o BLUE adulto
    return {
      nextBelt: 'BLUE',
      nextStripes: 0,
      isBeltPromotion: true,
    };
  }

  // Adultos
  const idx = ADULT_BELT_ORDER.indexOf(currentBelt as AdultBelt);
  if (idx !== -1 && idx < ADULT_BELT_ORDER.length - 1) {
    return {
      nextBelt: ADULT_BELT_ORDER[idx + 1],
      nextStripes: 0,
      isBeltPromotion: true,
    };
  }

  // Si ya es cinturón negro, se mantiene negro
  return {
    nextBelt: 'BLACK',
    nextStripes: 4,
    isBeltPromotion: false,
  };
}

export interface GraduationProgress {
  currentClasses: number;
  targetClasses: number;
  percentage: number;
  isReady: boolean;
  classesRemaining: number;
}

/**
 * Calcula el progreso numérico de asistencia hacia el siguiente grado (raya o cinturón).
 * @param attendancesCount Número de clases ponderadas asistidas en el rango actual
 * @param targetClasses Meta de clases recomendada para evaluación (por defecto 25 clases por raya)
 */
export function calculateGraduationProgress(
  attendancesCount: number,
  targetClasses = 25
): GraduationProgress {
  const current = Math.max(0, attendancesCount);
  const target = Math.max(1, targetClasses);
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const classesRemaining = Math.max(0, target - current);
  const isReady = current >= target;

  return {
    currentClasses: current,
    targetClasses: target,
    percentage,
    isReady,
    classesRemaining,
  };
}

export interface AthleteXP {
  xp: number;
  level: number;
  title: string;
  nextLevelXp: number;
  progressToNextLevel: number; // 0..100
}

/**
 * Gamificación: Convierte asistencias en XP (Puntos de Tatami) y Niveles deportivos.
 * 1 clase asistida = 100 XP.
 */
export function calculateAthleteXP(attendedCount: number): AthleteXP {
  const xp = Math.max(0, attendedCount) * 100;
  // Cada nivel requiere 500 XP (5 clases)
  const level = Math.floor(xp / 500) + 1;
  const currentLevelBaseXp = (level - 1) * 500;
  const nextLevelXp = level * 500;
  const xpInCurrentLevel = xp - currentLevelBaseXp;
  const progressToNextLevel = Math.min(100, Math.round((xpInCurrentLevel / 500) * 100));

  let title = 'Iniciado del Tatami';
  if (level >= 20) title = 'Leyenda 247Studio';
  else if (level >= 15) title = 'Veterano de Guerra';
  else if (level >= 10) title = 'Samurái del Tatami';
  else if (level >= 5) title = 'Guerrero Constante';
  else if (level >= 2) title = 'Luchador Comprometido';

  return {
    xp,
    level,
    title,
    nextLevelXp,
    progressToNextLevel,
  };
}

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

/**
 * Devuelve la vitrina de medallas deportivas y evalúa cuáles están desbloqueadas.
 */
export function getAthleteBadges(
  user: Pick<UserDomainModel, 'pricingTier' | 'belt' | 'stripes'>,
  bookings: Pick<BookingDomainModel, 'status' | 'date'>[]
): BadgeItem[] {
  const attendedBookings = bookings.filter((b) => b.status === 'ATTENDED');
  const count = attendedBookings.length;

  return [
    {
      id: 'first_class',
      title: 'Primer Kimono',
      description: 'Completar tu primer entrenamiento en 247Studio.',
      icon: '🥋',
      unlocked: count >= 1,
    },
    {
      id: 'streak_3',
      title: 'Fuego en el Tatami',
      description: 'Asistir al menos a 10 entrenamientos oficiales.',
      icon: '🔥',
      unlocked: count >= 10,
    },
    {
      id: 'mat_rat_25',
      title: 'Mat Rat 25',
      description: 'Superar las 25 clases acumuladas en tatami.',
      icon: '🛡️',
      unlocked: count >= 25,
    },
    {
      id: 'centurion_100',
      title: 'Centurión del Tatami',
      description: 'Alcanzar el hito épico de 100 entrenamientos.',
      icon: '🥇',
      unlocked: count >= 100,
    },
    {
      id: 'first_stripe',
      title: 'Primer Grado',
      description: 'Haber sido graduado con al menos 1 raya en el cinturón.',
      icon: '⭐',
      unlocked: (user.stripes || 0) >= 1 || user.belt !== 'WHITE',
    },
    {
      id: 'socio_fundador',
      title: 'Socio Fundador',
      description: 'Pertenecer a la estirpe pionera con tarifa SF.',
      icon: '👑',
      unlocked: user.pricingTier === 'SF',
    },
  ];
}
