import { describe, expect, it } from 'vitest';
import {
  BookingDomainModel,
  FreezeDomainModel,
  PaymentDomainModel,
  ScheduleDomainModel,
  UserDomainModel,
} from '../../src/shared/domain/types';
import { derivePaymentStatus } from '../../src/shared/domain/payment-status';
import { getNextPromotion, calculateGraduationProgress, calculateAthleteXP } from '../../src/shared/domain/graduation';
import { getAttendanceWeight, deriveRetentionRisk } from '../../src/shared/domain/attendance';
import { calculateVatBreakdown } from '../../src/shared/domain/money';
import { validateMinorOnboarding } from '../../src/shared/domain/minor';
import { DEFAULT_OFFICIAL_SCHEDULES } from '../../src/shared/domain/schedule';

/**
 * 247 STUDIO - 1-Month 50-Student Realistic Academy Simulation
 * Evaluated under dual perspectives:
 * 1. Lead Fullstack Dev (Software Architecture, Edge Cases, Data Integrity)
 * 2. Martial Arts Gym Operations Expert (Sensei / Dojo Operations & Cashflow)
 */

interface SimulatedAthlete extends UserDomainModel {
  roleType: 'COMPETITOR' | 'REGULAR' | 'ADVANCED' | 'KID' | 'INJURED' | 'DELINQUENT';
  preferredDays: number[];
  attendedClassCount: number;
}

function generate50Athletes(): SimulatedAthlete[] {
  const athletes: SimulatedAthlete[] = [];

  const rolesDistribution: SimulatedAthlete['roleType'][] = [
    ...Array(5).fill('COMPETITOR'),
    ...Array(10).fill('ADVANCED'),
    ...Array(20).fill('REGULAR'),
    ...Array(7).fill('KID'),
    ...Array(4).fill('INJURED'),
    ...Array(4).fill('DELINQUENT'),
  ];

  rolesDistribution.forEach((roleType, idx) => {
    const idNum = idx + 1;
    const isKid = roleType === 'KID';
    const isCompetitor = roleType === 'COMPETITOR';
    const isAdvanced = roleType === 'ADVANCED';

    const belt = isKid
      ? (idNum % 2 === 0 ? 'YELLOW' : 'GREY')
      : isAdvanced
      ? (idNum % 3 === 0 ? 'PURPLE' : idNum % 5 === 0 ? 'BROWN' : 'BLUE')
      : isCompetitor
      ? 'BLUE'
      : 'WHITE';

    const stripes = isAdvanced ? 2 : isCompetitor ? 3 : (idNum % 4);

    athletes.push({
      uid: `ath_${idNum}`,
      authEmail: `atleta${idNum}@247studio.es`,
      contactEmail: `atleta${idNum}@gmail.com`,
      alias: `Luchador ${idNum} (${roleType})`,
      phone: `6001122${idNum.toString().padStart(2, '0')}`,
      emergencyContactName: isKid ? 'Padre / Tutor Legal' : 'Contacto Emergencia',
      emergencyContactPhone: '611223344',
      birthDate: isKid ? '2014-05-12' : '1995-08-20',
      isMinor: isKid,
      guardianUid: isKid ? `guardian_${idNum}` : undefined,
      beltSystem: isKid ? 'KIDS' : 'ADULT',
      belt: belt as any,
      stripes,
      beltDate: '2026-01-15',
      pricingTier: isCompetitor ? 'SF' : 'STD',
      activeTariffId: isKid ? 'tariff_kids' : isCompetitor ? 'tariff_sf' : 'tariff_adult',
      accountStatus: roleType === 'INJURED' ? 'INACTIVE' : 'ACTIVE',
      permissions: ['STUDENT'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
      roleType,
      preferredDays: isCompetitor
        ? [1, 2, 3, 4, 5, 6]
        : isAdvanced
        ? [1, 3, 5]
        : [2, 4],
      attendedClassCount: isAdvanced ? 140 : isCompetitor ? 80 : 20,
    });
  });

  return athletes;
}

describe('30-Day Operational Simulation with 50 Athletes', () => {
  const athletes = generate50Athletes();
  const schedules: ScheduleDomainModel[] = DEFAULT_OFFICIAL_SCHEDULES;

  it('verifies 50 athletes census distribution and minor onboarding', () => {
    expect(athletes.length).toBe(50);
    const minors = athletes.filter((a) => a.isMinor);
    expect(minors.length).toBe(7);

    minors.forEach((m) => {
      const v = validateMinorOnboarding({
        birthDate: m.birthDate,
        now: new Date('2026-11-01'),
        guardianTutorName: m.emergencyContactName,
        guardianTutorPhone: m.emergencyContactPhone,
        minorMedicalNotes: '',
      });
      expect(v.isMinor).toBe(true);
      expect(v.isValid).toBe(true);
    });
  });

  it('Simulates Month Billing: Day 1 payments, Freezes, and Derived Status', () => {
    const currentPeriod = '2026-11';
    const simulationNow = new Date('2026-11-02T10:00:00Z');

    const payments: PaymentDomainModel[] = [];
    const freezes: FreezeDomainModel[] = [];
    const bookings: BookingDomainModel[] = [];

    // 1. Process Freezes for Injured Athletes
    athletes.filter((a) => a.roleType === 'INJURED').forEach((inj) => {
      freezes.push({
        id: `frz_${inj.uid}`,
        uid: inj.uid,
        reason: 'INJURY',
        startDate: '2026-11-01',
        openEnded: true,
        createdAt: '2026-11-01T09:00:00Z',
        createdBy: 'admin_mario',
      });
    });

    // 2. Generate Payments
    athletes.forEach((athlete) => {
      if (athlete.roleType === 'INJURED' || athlete.roleType === 'DELINQUENT') return;

      const priceCents = athlete.pricingTier === 'SF' ? 5500 : athlete.isMinor ? 4500 : 6500;
      const vat = calculateVatBreakdown(priceCents);

      payments.push({
        id: `pay_${athlete.uid}_${currentPeriod}`,
        uid: athlete.uid,
        period: currentPeriod,
        method: athlete.uid.endsWith('2') ? 'CASH' : 'BIZUM',
        status: athlete.uid.endsWith('3') ? 'PENDING_APPROVAL' : 'APPROVED',
        billingType: 'MONTHLY',
        amountCents: priceCents,
        baseCents: vat.baseCents,
        vatCents: vat.vatCents,
        createdAt: '2026-11-01T10:00:00Z',
      });
    });

    // 3. Verify Derived Payment Statuses
    let okCount = 0;
    let pendingCount = 0;
    let graceCount = 0;

    athletes.forEach((athlete) => {
      const userPayments = payments.filter((p) => p.uid === athlete.uid);
      const userFreezes = freezes.filter((f) => f.uid === athlete.uid);
      const userBookings = bookings.filter((b) => b.uid === athlete.uid);

      const status = derivePaymentStatus({
        billingType: 'MONTHLY',
        payments: userPayments,
        bookings: userBookings,
        freezes: userFreezes,
        now: simulationNow,
      });

      if (status === 'OK') okCount++;
      else if (status === 'PENDING_VALIDATION') pendingCount++;
      else if (status === 'GRACE') graceCount++;
    });

    expect(okCount).toBeGreaterThan(30);
    // 4 Delinquents without payment + 4 Active Injured Freezes protected from NOK
    expect(graceCount).toBe(8);
  });

  it('Verifies Grace Period Expiry on Day 10 for Delinquent who attended early in the month', () => {
    // Delinquent attended class on Nov 1st
    const delinquentUid = 'ath_47';
    const delinquentBookings: BookingDomainModel[] = [
      {
        id: `bk_${delinquentUid}_sched1_2026-11-01`,
        uid: delinquentUid,
        scheduleId: 'sched_1',
        date: '2026-11-01',
        status: 'ATTENDED',
        sessionType: 'PARTICIPANT',
        attendanceWeight: 1.0,
        checkInSource: 'TABLET',
        createdAt: '2026-11-01T19:00:00Z',
      },
    ];

    // On November 10th (9 days after first class attended):
    const nowNov10 = new Date('2026-11-10T12:00:00Z');
    const status = derivePaymentStatus({
      billingType: 'MONTHLY',
      payments: [], // No payment submitted
      bookings: delinquentBookings,
      freezes: [],
      now: nowNov10,
    });

    // 9 days >= 7 days grace rule -> status must be blocked (NOK)
    expect(status).toBe('NOK');
  });

  it('Simulates 30-day Tatami Attendance, Capacity Overflow, and Promotion Triggers', () => {
    const simulationBookings: BookingDomainModel[] = [];
    let promotionsTriggeredCount = 0;

    // Simulate 30 days
    for (let day = 1; day <= 30; day++) {
      const dayStr = `2026-11-${day.toString().padStart(2, '0')}`;
      const dateObj = new Date(`${dayStr}T18:00:00Z`);
      const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay(); // 1..7

      // Find classes for this day
      const dayClasses = schedules.filter((s) => s.dayOfWeek === dayOfWeek && s.active);

      dayClasses.forEach((sched) => {
        let bookedInClass = 0;

        athletes.forEach((athlete) => {
          if (athlete.roleType === 'INJURED') return; // Cannot train
          if (!athlete.preferredDays.includes(dayOfWeek)) return;

          // Check class capacity (max 25)
          const capacity = sched.capacity || 25;
          const isCapacityFull = bookedInClass >= capacity;

          const bookingStatus = isCapacityFull ? 'WAITLISTED' : 'ATTENDED';
          const sessionType = athlete.roleType === 'DELINQUENT' ? 'OBSERVER' : 'PARTICIPANT';
          const weight = getAttendanceWeight(sessionType);

          if (!isCapacityFull) {
            bookedInClass++;
            athlete.attendedClassCount += weight;

            // Check if athlete hit a stripe graduation milestone (every 25 classes)
            if (athlete.attendedClassCount % 25 === 0) {
              promotionsTriggeredCount++;
              const promo = getNextPromotion(athlete.belt as any, athlete.stripes, athlete.beltSystem as any);
              expect(promo).toBeDefined();
            }
          }

          simulationBookings.push({
            id: `bk_${athlete.uid}_${sched.id}_${dayStr}`,
            uid: athlete.uid,
            scheduleId: sched.id,
            date: dayStr,
            status: bookingStatus,
            sessionType,
            attendanceWeight: weight,
            checkInSource: 'TABLET',
            createdAt: `${dayStr}T19:00:00Z`,
          });
        });
      });
    }

    expect(simulationBookings.length).toBeGreaterThan(500);
    expect(promotionsTriggeredCount).toBeGreaterThan(0);
  });

  it('Evaluates Student Churn & Retention Alarm for Athletes Missing >21 Days', () => {
    const nowDay30 = new Date('2026-11-30T12:00:00Z');

    // Athlete who attended in early October and has not trained for 28 days
    const dropoutHistory = [
      { date: '2026-10-15', status: 'ATTENDED' as const },
      { date: '2026-10-18', status: 'ATTENDED' as const },
      { date: '2026-11-02', status: 'NO_SHOW' as const },
    ];

    const risk = deriveRetentionRisk(dropoutHistory, nowDay30);
    expect(risk).toBe('HIGH'); // Over 21 days since last attended -> flags as HIGH churn risk
  });

  it('Ensures Financial Invariant: Base + VAT === Total for All 50 Subscriptions', () => {
    athletes.forEach((athlete) => {
      const priceCents = athlete.pricingTier === 'SF' ? 5500 : athlete.isMinor ? 4500 : 6500;
      const vat = calculateVatBreakdown(priceCents);
      expect(vat.baseCents + vat.vatCents).toBe(priceCents);
    });
  });
});
