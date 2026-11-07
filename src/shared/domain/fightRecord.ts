/**
 * 247 STUDIO - Mat Sparring Record & Combat Log Domain
 */

export interface SparringEntry {
  id: string;
  dateStr: string;
  roundsCount: number;
  minutesPerRound: number;
  submissionsApplied: string[];
  submissionsConceded: string[];
  intensityRpe: number; // 1 to 10
  partnersNotes?: string;
  technicalReflection?: string;
}

export const SUBMISSION_OPTIONS = [
  'Palanca de Brazo (Armbar)',
  'Triángulo (Triangle Choke)',
  'Kimura (Figura 4)',
  'Mata-León (Rear Naked Choke)',
  'Guillotina (Guillotine)',
  'Americana',
  'Omoplata',
  'Llave de Pie Recta (Straight Ankle Lock)',
  'Kneebar',
  'Heel Hook (No-Gi)',
  'Ezequiel Choke',
  'Baseball Choke',
  'D’Arce / Anaconda Choke',
];

export function calculateCombatVolume(entries: SparringEntry[]): {
  totalRounds: number;
  totalMatMinutes: number;
  totalSubmissions: number;
  favoriteSubmission: string;
} {
  let totalRounds = 0;
  let totalMatMinutes = 0;
  let totalSubmissions = 0;
  const subCounts: Record<string, number> = {};

  entries.forEach((e) => {
    totalRounds += e.roundsCount;
    totalMatMinutes += e.roundsCount * (e.minutesPerRound || 5);
    totalSubmissions += e.submissionsApplied.length;

    e.submissionsApplied.forEach((s) => {
      subCounts[s] = (subCounts[s] || 0) + 1;
    });
  });

  let favoriteSubmission = 'En desarrollo';
  let maxCount = 0;
  Object.entries(subCounts).forEach(([sub, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteSubmission = sub;
    }
  });

  return {
    totalRounds,
    totalMatMinutes,
    totalSubmissions,
    favoriteSubmission,
  };
}
