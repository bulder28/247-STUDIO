import { describe, expect, it } from 'vitest';
import { calculateCombatVolume, SparringEntry } from '../../src/shared/domain/fightRecord';

describe('Sparring Record Domain Logic', () => {
  it('correctly aggregates combat minutes and favorite submission', () => {
    const entries: SparringEntry[] = [
      {
        id: '1',
        dateStr: '2026-11-01',
        roundsCount: 5,
        minutesPerRound: 5,
        submissionsApplied: ['Palanca de Brazo (Armbar)', 'Triángulo (Triangle Choke)'],
        submissionsConceded: ['Kimura (Figura 4)'],
        intensityRpe: 8,
      },
      {
        id: '2',
        dateStr: '2026-11-03',
        roundsCount: 4,
        minutesPerRound: 6,
        submissionsApplied: ['Palanca de Brazo (Armbar)'],
        submissionsConceded: [],
        intensityRpe: 7,
      },
    ];

    const volume = calculateCombatVolume(entries);
    expect(volume.totalRounds).toBe(9);
    // 5*5 + 4*6 = 25 + 24 = 49 minutes
    expect(volume.totalMatMinutes).toBe(49);
    expect(volume.totalSubmissions).toBe(3);
    expect(volume.favoriteSubmission).toBe('Palanca de Brazo (Armbar)');
  });
});
