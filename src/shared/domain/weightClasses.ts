/**
 * Official Martial Arts Weight Divisions
 * Covers IBJJF Gi, IBJJF No-Gi, and ADCC official categories
 */

export type WeightOrganization = 'IBJJF_GI' | 'IBJJF_NOGI' | 'ADCC';
export type Gender = 'MALE' | 'FEMALE';

export interface WeightDivision {
  name: string;
  nameEs: string;
  maxWeightKg: number; // 999 for open/unlimited
  maxWeightLbs: number;
}

export const IBJJF_MALE_GI_DIVISIONS: WeightDivision[] = [
  { name: 'Rooster', nameEs: 'Galo', maxWeightKg: 57.5, maxWeightLbs: 127.0 },
  { name: 'Light Feather', nameEs: 'Pluma', maxWeightKg: 64.0, maxWeightLbs: 141.5 },
  { name: 'Feather', nameEs: 'Pena', maxWeightKg: 70.0, maxWeightLbs: 154.5 },
  { name: 'Light', nameEs: 'Leve', maxWeightKg: 76.0, maxWeightLbs: 168.0 },
  { name: 'Middle', nameEs: 'Médio', maxWeightKg: 82.3, maxWeightLbs: 181.5 },
  { name: 'Medium Heavy', nameEs: 'Meio-Pesado', maxWeightKg: 88.3, maxWeightLbs: 195.0 },
  { name: 'Heavy', nameEs: 'Pesado', maxWeightKg: 94.3, maxWeightLbs: 208.0 },
  { name: 'Super Heavy', nameEs: 'Super-Pesado', maxWeightKg: 100.5, maxWeightLbs: 222.0 },
  { name: 'Ultra Heavy', nameEs: 'Pesadíssimo', maxWeightKg: 999, maxWeightLbs: 999 },
];

export const IBJJF_FEMALE_GI_DIVISIONS: WeightDivision[] = [
  { name: 'Rooster', nameEs: 'Galo', maxWeightKg: 48.5, maxWeightLbs: 107.0 },
  { name: 'Light Feather', nameEs: 'Pluma', maxWeightKg: 53.5, maxWeightLbs: 118.0 },
  { name: 'Feather', nameEs: 'Pena', maxWeightKg: 58.5, maxWeightLbs: 129.0 },
  { name: 'Light', nameEs: 'Leve', maxWeightKg: 64.0, maxWeightLbs: 141.0 },
  { name: 'Middle', nameEs: 'Médio', maxWeightKg: 69.0, maxWeightLbs: 152.0 },
  { name: 'Medium Heavy', nameEs: 'Meio-Pesado', maxWeightKg: 74.0, maxWeightLbs: 163.0 },
  { name: 'Heavy', nameEs: 'Pesado', maxWeightKg: 79.3, maxWeightLbs: 175.0 },
  { name: 'Super Heavy', nameEs: 'Super-Pesado', maxWeightKg: 999, maxWeightLbs: 999 },
];

export const ADCC_MALE_DIVISIONS: WeightDivision[] = [
  { name: '-66 kg', nameEs: 'Peso Ligero (-66 kg)', maxWeightKg: 66.0, maxWeightLbs: 145.5 },
  { name: '-77 kg', nameEs: 'Peso Welter (-77 kg)', maxWeightKg: 77.0, maxWeightLbs: 169.8 },
  { name: '-88 kg', nameEs: 'Peso Medio (-88 kg)', maxWeightKg: 88.0, maxWeightLbs: 194.0 },
  { name: '-99 kg', nameEs: 'Peso Semipesado (-99 kg)', maxWeightKg: 99.0, maxWeightLbs: 218.3 },
  { name: '+99 kg', nameEs: 'Peso Pesado (+99 kg)', maxWeightKg: 999, maxWeightLbs: 999 },
];

export const ADCC_FEMALE_DIVISIONS: WeightDivision[] = [
  { name: '-55 kg', nameEs: 'Peso Paja (-55 kg)', maxWeightKg: 55.0, maxWeightLbs: 121.3 },
  { name: '-65 kg', nameEs: 'Peso Mosca (-65 kg)', maxWeightKg: 65.0, maxWeightLbs: 143.3 },
  { name: '+65 kg', nameEs: 'Peso Libre (+65 kg)', maxWeightKg: 999, maxWeightLbs: 999 },
];

export interface WeightCalculationResult {
  division: WeightDivision;
  actualWeightKg: number;
  weightDiffKg: number; // Positive = under max weight, Negative = overweight
  giAllowanceKg: number;
  isUnlimited: boolean;
  cutSafetyAdvice: string;
}

/**
 * Calculates current division and weight difference
 * @param weightKg Current morning athlete weight
 * @param org Organization rule
 * @param gender Gender
 * @param wearingGi Whether athlete weighs with Gi on (adds ~2.0-2.5kg standard)
 */
export function calculateWeightDivision(
  weightKg: number,
  org: WeightOrganization = 'IBJJF_GI',
  gender: Gender = 'MALE',
  wearingGi: boolean = false
): WeightCalculationResult {
  const safeWeight = Math.max(30, weightKg);
  // If org is IBJJF_GI and athlete is NOT wearing gi yet, we add estimated Gi weight (2.2kg) to projected mat weight
  const giAllowanceKg = org === 'IBJJF_GI' && !wearingGi ? 2.2 : 0;
  const projectedWeightKg = Math.round((safeWeight + giAllowanceKg) * 10) / 10;

  let divisions = IBJJF_MALE_GI_DIVISIONS;
  if (org === 'ADCC') {
    divisions = gender === 'MALE' ? ADCC_MALE_DIVISIONS : ADCC_FEMALE_DIVISIONS;
  } else {
    divisions = gender === 'MALE' ? IBJJF_MALE_GI_DIVISIONS : IBJJF_FEMALE_GI_DIVISIONS;
  }

  const matchingDivision = divisions.find((d) => projectedWeightKg <= d.maxWeightKg) || divisions[divisions.length - 1];
  const isUnlimited = matchingDivision.maxWeightKg >= 999;
  const weightDiffKg = isUnlimited ? 0 : Math.round((matchingDivision.maxWeightKg - projectedWeightKg) * 10) / 10;

  let cutSafetyAdvice = 'Peso óptimo. Hidrátate de forma normal antes del combate.';
  if (!isUnlimited) {
    if (weightDiffKg < 0) {
      cutSafetyAdvice = `Estás ${Math.abs(weightDiffKg)} kg por encima del límite de ${matchingDivision.nameEs}. Considera subir de categoría o planificar corte progresivo sin deshidratación brusca.`;
    } else if (weightDiffKg < 1.0) {
      cutSafetyAdvice = `En peso muy ajustado (+${weightDiffKg} kg de margen). Vigila la ingesta de sodio y líquidos en las 12h previas al pesaje oficial.`;
    } else {
      cutSafetyAdvice = `Margen seguro de ${weightDiffKg} kg. Puedes competir en ${matchingDivision.nameEs} con total plenitud de energía.`;
    }
  }

  return {
    division: matchingDivision,
    actualWeightKg: projectedWeightKg,
    weightDiffKg,
    giAllowanceKg,
    isUnlimited,
    cutSafetyAdvice,
  };
}
