import { PaymentDomainModel, UserDomainModel } from './types';

/** Discount applied to every charge of a founding member ("socio fundador"). */
export const FOUNDING_MEMBER_DISCOUNT = 0.1;

export function applyFoundingDiscount(
  amountCents: number,
  isFoundingMember: boolean
): { finalCents: number; discountCents: number } {
  if (!isFoundingMember) {
    return { finalCents: amountCents, discountCents: 0 };
  }
  const discountCents = Math.round(amountCents * FOUNDING_MEMBER_DISCOUNT);
  return { finalCents: amountCents - discountCents, discountCents };
}

const PERIOD_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * Returns `months` consecutive YYYY-MM periods starting at `startPeriod`,
 * rolling over year boundaries.
 */
export function buildPrepaymentPeriods(startPeriod: string, months: number): string[] {
  const match = PERIOD_REGEX.exec(startPeriod);
  if (!match) {
    throw new Error(`Invalid period: ${startPeriod}. Expected YYYY-MM.`);
  }
  if (!Number.isInteger(months) || months < 1) {
    throw new Error(`Invalid number of months: ${months}. Must be an integer >= 1.`);
  }

  const startYear = parseInt(match[1], 10);
  const startMonthIndex = parseInt(match[2], 10) - 1;
  const periods: string[] = [];
  for (let i = 0; i < months; i++) {
    const total = startMonthIndex + i;
    const year = startYear + Math.floor(total / 12);
    const month = (total % 12) + 1;
    periods.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return periods;
}

/**
 * Active students without an APPROVED payment for the given period.
 */
export function findUnpaidStudents(
  users: UserDomainModel[],
  payments: PaymentDomainModel[],
  period: string
): UserDomainModel[] {
  const paidUids = new Set(
    payments.filter((p) => p.period === period && p.status === 'APPROVED').map((p) => p.uid)
  );
  return users.filter(
    (u) =>
      u.accountStatus === 'ACTIVE' &&
      (u.permissions ?? []).some((perm) => perm.toLowerCase() === 'student') &&
      !paidUids.has(u.uid)
  );
}
