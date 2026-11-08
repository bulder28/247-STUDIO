import { Belt, FighterStats, UserDomainModel } from '@/shared/domain/types';
import { BJJ_CURRICULUM, CurriculumTechnique } from '@/shared/domain/curriculum';

export interface CalculatedEloResult {
  ovr: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'ICON_BLACK';
  tierLabel: string;
  archetype: string;
  archetypeDesc: string;
  stats: FighterStats;
  totalMastered: number;
  totalCurriculum: number;
  masteryPercentage: number;
}

const BELT_BASE_RATING: Partial<Record<Belt, number>> = {
  WHITE: 55,
  BLUE: 70,
  PURPLE: 80,
  BROWN: 87,
  BLACK: 93,
};

/**
 * Motor de Cálculo de ELO Marcial y Atributos de Rendimiento 247 STUDIO
 * Pondera cinturón, grados, asistencias y técnicas dominadas en el Skill Tree.
 */
export function calculateFighterElo(
  athlete: Partial<UserDomainModel>,
  masteredTechniqueIds: string[] = [],
  attendedClassesCount = 24
): CalculatedEloResult {
  const belt = athlete.belt || 'WHITE';
  const stripes = athlete.stripes || 0;
  const baseRating = BELT_BASE_RATING[belt] ?? 55;

  // 1. Ponderación por grados (cada grado suma entre 1 y 2 puntos de media)
  const stripeBonus = stripes * 1.5;

  // 2. Asistencias y constancia (volumen de tatami)
  const attendanceBonus = Math.min(6, Math.floor(attendedClassesCount / 15));

  // 3. Proporción de técnicas asimiladas en el currículum
  const totalCurriculum = BJJ_CURRICULUM.length;
  const totalMastered = masteredTechniqueIds.length;
  const masteryPercentage = totalCurriculum > 0 ? Math.round((totalMastered / totalCurriculum) * 100) : 0;
  const skillTreeBonus = Math.min(8, Math.round((masteryPercentage / 100) * 8));

  // 4. Cálculo de habilidades por pilares del Skill Tree
  const masteredMap = new Set(masteredTechniqueIds);
  const pillarCounts: Record<CurriculumTechnique['pillar'], { total: number; done: number }> = {
    ESCAPES: { total: 0, done: 0 },
    PASSES: { total: 0, done: 0 },
    SWEEPS: { total: 0, done: 0 },
    SUBMISSIONS: { total: 0, done: 0 },
    TAKEDOWNS: { total: 0, done: 0 },
  };

  BJJ_CURRICULUM.forEach((tech) => {
    pillarCounts[tech.pillar].total += 1;
    if (masteredMap.has(tech.id)) {
      pillarCounts[tech.pillar].done += 1;
    }
  });

  const getPillarRatio = (pillar: CurriculumTechnique['pillar']) => {
    const p = pillarCounts[pillar];
    return p.total > 0 ? p.done / p.total : 0.2;
  };

  const escapesRatio = getPillarRatio('ESCAPES');
  const passesRatio = getPillarRatio('PASSES');
  const sweepsRatio = getPillarRatio('SWEEPS');
  const subsRatio = getPillarRatio('SUBMISSIONS');
  const takedownsRatio = getPillarRatio('TAKEDOWNS');

  // Cálculo individual de los 8 atributos (acotados entre 45 y 99)
  const clamp = (val: number) => Math.min(99, Math.max(45, Math.round(val)));

  const computedStats: FighterStats = {
    tecnica: clamp(baseRating + stripeBonus + masteryPercentage * 0.15),
    guardia: clamp(baseRating + stripeBonus + (sweepsRatio * 0.6 + escapesRatio * 0.4) * 12),
    pase: clamp(baseRating + stripeBonus + passesRatio * 14),
    finalizacion: clamp(baseRating + stripeBonus + subsRatio * 15),
    derribos: clamp(baseRating + stripeBonus + takedownsRatio * 14),
    leglocks: clamp(
      baseRating -
        5 +
        (masteredMap.has('sub_heel_hook') || masteredMap.has('sub_straight_ankle') ? 14 : 0) +
        stripeBonus
    ),
    fuerza: clamp(baseRating + attendanceBonus * 1.5 + (takedownsRatio + passesRatio) * 4),
    elasticidad: clamp(baseRating + (escapesRatio + sweepsRatio) * 5 + attendanceBonus),
  };

  // Cálculo de la media OVR global
  const statValues = Object.values(computedStats);
  const rawAvg = statValues.reduce((a, b) => a + b, 0) / statValues.length;
  const ovr = clamp(rawAvg + skillTreeBonus * 0.4);

  // Clasificación de la carta
  let tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'ICON_BLACK' = 'BRONZE';
  let tierLabel = 'BRONCE';

  if (belt === 'BLACK' || ovr >= 90 || athlete.pricingTier === 'SF') {
    tier = 'ICON_BLACK';
    tierLabel = 'MASTER BLACK';
  } else if (ovr >= 78 || belt === 'PURPLE' || belt === 'BROWN') {
    tier = 'GOLD';
    tierLabel = 'ORO RARO';
  } else if (ovr >= 66 || belt === 'BLUE') {
    tier = 'SILVER';
    tierLabel = 'PLATA';
  }

  // Determinación de Arquetipo Marcial según estadísticas destacadas
  let archetype = 'Guerrero Polivalente';
  let archetypeDesc = 'Equilibrio marcial y sólida capacidad en todas las fases de la lucha.';

  if (computedStats.leglocks >= 80 && computedStats.leglocks > computedStats.pase) {
    archetype = 'Leg Locker / Cazador de Talones';
    archetypeDesc = 'Especialista en ataques asimétricos a las extremidades inferiores y Ashi Garami.';
  } else if (computedStats.pase >= 78 && computedStats.fuerza >= 75) {
    archetype = 'Pressure Passer / Rodillo Humano';
    archetypeDesc = 'Presión incesante desde arriba, aplastando las caderas del oponente.';
  } else if (computedStats.guardia >= 80 && computedStats.finalizacion >= 78) {
    archetype = 'Guard Wizard / Maestro de la Espalda';
    archetypeDesc = 'Peligroso desde abajo. Capacidad de invertir y finalizar en una fracción de segundo.';
  } else if (computedStats.derribos >= 78 && computedStats.fuerza >= 74) {
    archetype = 'Wrestler / Controlador de Tatami';
    archetypeDesc = 'Dominio de la lucha en pie, dictando el ritmo del combate en el suelo.';
  } else if (computedStats.finalizacion >= 82) {
    archetype = 'Finisher Clínico';
    archetypeDesc = 'Instinto asesino para asegurar llaves articulares y estrangulaciones con precisión quirúrgica.';
  }

  return {
    ovr,
    tier,
    tierLabel,
    archetype,
    archetypeDesc,
    stats: computedStats,
    totalMastered,
    totalCurriculum,
    masteryPercentage,
  };
}
