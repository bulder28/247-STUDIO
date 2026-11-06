import { describe, expect, it } from 'vitest';
import {
  calculateAthleteXP,
  calculateGraduationProgress,
  getAthleteBadges,
  getNextPromotion,
} from '@/shared/domain/graduation';

describe('Graduation & Gamification Domain Tests', () => {
  describe('getNextPromotion', () => {
    it('promotes stripes within adult white belt', () => {
      const res = getNextPromotion('WHITE', 0, 'ADULT');
      expect(res).toEqual({
        nextBelt: 'WHITE',
        nextStripes: 1,
        isBeltPromotion: false,
      });

      const res2 = getNextPromotion('WHITE', 3, 'ADULT');
      expect(res2).toEqual({
        nextBelt: 'WHITE',
        nextStripes: 4,
        isBeltPromotion: false,
      });
    });

    it('promotes from 4th stripe adult white belt to blue belt with 0 stripes', () => {
      const res = getNextPromotion('WHITE', 4, 'ADULT');
      expect(res).toEqual({
        nextBelt: 'BLUE',
        nextStripes: 0,
        isBeltPromotion: true,
      });
    });

    it('promotes kids belt correctly from 4th stripe', () => {
      const res = getNextPromotion('WHITE', 4, 'KIDS');
      expect(res).toEqual({
        nextBelt: 'GREY_WHITE',
        nextStripes: 0,
        isBeltPromotion: true,
      });
    });
  });

  describe('calculateGraduationProgress', () => {
    it('calculates progress accurately when below target', () => {
      const res = calculateGraduationProgress(15, 30);
      expect(res.percentage).toBe(50);
      expect(res.isReady).toBe(false);
      expect(res.classesRemaining).toBe(15);
    });

    it('detects ready state when meeting or exceeding target', () => {
      const res = calculateGraduationProgress(32, 30);
      expect(res.percentage).toBe(100);
      expect(res.isReady).toBe(true);
      expect(res.classesRemaining).toBe(0);
    });
  });

  describe('calculateAthleteXP', () => {
    it('calculates XP and level progression correctly', () => {
      const xpData = calculateAthleteXP(12); // 1200 XP -> Level 3 (1000 - 1500 XP)
      expect(xpData.xp).toBe(1200);
      expect(xpData.level).toBe(3);
      expect(xpData.progressToNextLevel).toBe(40); // 200 / 500 = 40%
      expect(xpData.title).toBe('Luchador Comprometido');
    });
  });

  describe('getAthleteBadges', () => {
    it('unlocks badges based on attendance milestones and user tier', () => {
      const badges = getAthleteBadges(
        { belt: 'WHITE', stripes: 0, pricingTier: 'SF' },
        [
          { status: 'ATTENDED', date: '2026-03-01' },
          { status: 'ATTENDED', date: '2026-03-02' },
        ]
      );

      const firstClassBadge = badges.find((b) => b.id === 'first_class');
      const sfBadge = badges.find((b) => b.id === 'socio_fundador');
      const centurionBadge = badges.find((b) => b.id === 'centurion_100');

      expect(firstClassBadge?.unlocked).toBe(true);
      expect(sfBadge?.unlocked).toBe(true);
      expect(centurionBadge?.unlocked).toBe(false);
    });
  });
});
