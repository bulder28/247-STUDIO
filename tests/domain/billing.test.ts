import { describe, expect, it } from 'vitest';
import {
  applyFoundingDiscount,
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
