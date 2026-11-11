import { describe, expect, it } from 'vitest';
import {
  applyFoundingDiscount,
  buildChargePayments,
  buildPrepaymentPeriods,
  findUnpaidStudents,
} from '../../src/shared/domain/billing';
import type { PaymentDomainModel, UserDomainModel } from '../../src/shared/domain/types';

const user = (uid: string, over: Partial<UserDomainModel> = {}): UserDomainModel =>
  ({ uid, accountStatus: 'ACTIVE', permissions: ['student'], ...over }) as UserDomainModel;

const pay = (uid: string, period: string, status: PaymentDomainModel['status']): PaymentDomainModel =>
  ({ id: `${uid}-${period}-${status}`, uid, period, status }) as PaymentDomainModel;

describe('applyFoundingDiscount', () => {
  it('returns the full amount for non founding members', () => {
    expect(applyFoundingDiscount(5000, false)).toEqual({ finalCents: 5000, discountCents: 0 });
  });

  it('applies 10% to founding members', () => {
    expect(applyFoundingDiscount(5000, true)).toEqual({ finalCents: 4500, discountCents: 500 });
  });

  it('rounds to the nearest cent', () => {
    // 10% of 4995 = 499.5 -> 500
    expect(applyFoundingDiscount(4995, true)).toEqual({ finalCents: 4495, discountCents: 500 });
    // 10% of 4994 = 499.4 -> 499
    expect(applyFoundingDiscount(4994, true)).toEqual({ finalCents: 4495, discountCents: 499 });
  });
});

describe('buildPrepaymentPeriods', () => {
  it('builds consecutive periods', () => {
    expect(buildPrepaymentPeriods('2026-03', 3)).toEqual(['2026-03', '2026-04', '2026-05']);
  });

  it('crosses year boundaries', () => {
    expect(buildPrepaymentPeriods('2026-11', 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('rejects invalid months and periods', () => {
    expect(() => buildPrepaymentPeriods('2026-03', 0)).toThrow();
    expect(() => buildPrepaymentPeriods('2026-03', 1.5)).toThrow();
    expect(() => buildPrepaymentPeriods('2026-13', 1)).toThrow();
    expect(() => buildPrepaymentPeriods('26-03', 1)).toThrow();
  });
});

describe('findUnpaidStudents', () => {
  const period = '2026-11';

  it('returns active students without an approved payment for the period', () => {
    const users = [user('a'), user('b'), user('c')];
    const payments = [pay('a', period, 'APPROVED'), pay('b', '2026-10', 'APPROVED'), pay('c', period, 'PENDING_APPROVAL')];
    expect(findUnpaidStudents(users, payments, period).map((u) => u.uid)).toEqual(['b', 'c']);
  });

  it('ignores inactive users and non students', () => {
    const users = [
      user('a', { accountStatus: 'PAUSED' }),
      user('b', { permissions: ['coach'] }),
      user('c', { permissions: ['STUDENT'] }),
    ];
    expect(findUnpaidStudents(users, [], period).map((u) => u.uid)).toEqual(['c']);
  });

  it('ignores rejected payments', () => {
    expect(findUnpaidStudents([user('a')], [pay('a', period, 'REJECTED')], period)).toHaveLength(1);
  });
});

describe('buildChargePayments', () => {
  const base = {
    uid: 'u1',
    period: '2026-11',
    months: 1,
    method: 'CASH' as const,
    billingType: 'MONTHLY' as const,
    concept: 'Adultos Ilimitado',
    tariffId: 't1',
    baseAmountCents: 7500,
    isFoundingMember: false,
    validatedBy: 'admin1',
    staffLabel: 'Mario',
    stamp: 'TS',
  };

  it('builds one approved payment with a consistent VAT breakdown', () => {
    const r = buildChargePayments(base);
    expect(r.payments).toHaveLength(1);
    const p = r.payments[0];
    expect(p).toMatchObject({
      uid: 'u1',
      period: '2026-11',
      status: 'APPROVED',
      tariffId: 't1',
      amountCents: 7500,
      discountCents: 0,
      createdAt: 'TS',
      paidAt: 'TS',
      validatedAt: 'TS',
    });
    expect(p.baseCents + p.vatCents).toBe(p.amountCents);
    expect(p.notes).toBe('Cobro en mostrador por Mario');
    expect(r.totalCents).toBe(7500);
  });

  it('applies the founding-member discount and stores it', () => {
    const r = buildChargePayments({ ...base, isFoundingMember: true });
    expect(r.payments[0].amountCents).toBe(6750);
    expect(r.payments[0].discountCents).toBe(750);
    expect(r.payments[0].baseCents + r.payments[0].vatCents).toBe(6750);
  });

  it('creates one payment per month for prepayment, rolling over the year', () => {
    const r = buildChargePayments({ ...base, period: '2026-11', months: 3 });
    expect(r.payments.map((p) => p.period)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(r.payments.map((p) => p.notes)).toEqual([
      'Pago adelantado 1/3 - Cobro en mostrador por Mario',
      'Pago adelantado 2/3 - Cobro en mostrador por Mario',
      'Pago adelantado 3/3 - Cobro en mostrador por Mario',
    ]);
    expect(r.payments.every((p) => p.amountCents === 7500 && p.tariffId === 't1')).toBe(true);
    expect(r.totalCents).toBe(22500);
  });

  it('omits tariffId when none is given and never emits undefined values', () => {
    const r = buildChargePayments({ ...base, tariffId: undefined });
    expect('tariffId' in r.payments[0]).toBe(false);
    expect(Object.values(r.payments[0]).every((v) => v !== undefined)).toBe(true);
  });

  it('tracks bono sessions on the payment for PASS', () => {
    const r = buildChargePayments({ ...base, billingType: 'PASS', baseAmountCents: 11000 });
    expect(r.payments[0].sessionsIncluded).toBe(10);
    expect(r.payments[0].sessionsRemaining).toBe(10);
  });

  it('rejects invalid months, prepaid non-monthly charges and bad amounts', () => {
    expect(() => buildChargePayments({ ...base, months: 0 })).toThrow();
    expect(() => buildChargePayments({ ...base, months: 13 })).toThrow();
    expect(() => buildChargePayments({ ...base, billingType: 'DROP_IN', months: 2 })).toThrow();
    expect(() => buildChargePayments({ ...base, baseAmountCents: 12.5 })).toThrow();
  });
});
