/**
 * Registry of the academy's disciplines.
 *
 * `hasBelt` is data, not logic: flip a flag here and every screen that asks
 * `disciplineHasBelt` follows. The belt itself lives on the person (a student
 * has at most one BJJ rank); the UI only presents it where the discipline has one.
 */

export type DisciplineId = 'BJJ' | 'GRAPPLING' | 'KIDS' | 'MMA' | 'LUCHA';

export interface Discipline {
  id: DisciplineId;
  /** Display name (Spanish, UI-facing). */
  name: string;
  hasBelt: boolean;
}

export const DISCIPLINES: readonly Discipline[] = [
  { id: 'BJJ', name: 'BJJ (Gi)', hasBelt: true },
  // No-Gi shares the BJJ rank: there is no separate Grappling belt.
  { id: 'GRAPPLING', name: 'Grappling (No-Gi)', hasBelt: true },
  { id: 'KIDS', name: 'Kids', hasBelt: true },
  { id: 'MMA', name: 'MMA', hasBelt: false },
  { id: 'LUCHA', name: 'Lucha', hasBelt: false },
];

export const BELT_DISCIPLINES: readonly Discipline[] = DISCIPLINES.filter((d) => d.hasBelt);

export function getDiscipline(id: string): Discipline | undefined {
  return DISCIPLINES.find((d) => d.id === id);
}

/** True when the discipline ranks students by belt. Unknown ids have no belt. */
export function disciplineHasBelt(id: string): boolean {
  return getDiscipline(id)?.hasBelt ?? false;
}

/**
 * Maps a schedule `program` label (e.g. "GI SPARRING", "BJJ FEM", "KIDS 1")
 * to a discipline. Returns null for mixed or unknown programs such as OPEN MAT.
 */
export function disciplineForProgram(program: string): DisciplineId | null {
  const p = (program || '').toUpperCase().trim();
  if (!p) return null;
  if (p.includes('KIDS')) return 'KIDS';
  if (p.includes('GRAPPLING') || p.includes('NO-GI') || p.includes('NOGI')) return 'GRAPPLING';
  if (p.includes('MMA')) return 'MMA';
  if (p.includes('LUCHA')) return 'LUCHA';
  if (/^GI\b/.test(p) || p.includes('BJJ') || p.startsWith('COMP')) return 'BJJ';
  return null;
}
