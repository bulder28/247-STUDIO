import { BillingType, PaymentDomainModel, PaymentMethod, UserDomainModel } from './types';

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

export interface PeriodOption {
  value: string;
  label: string;
}

/**
 * Selectable YYYY-MM periods from `back` months before `current` to `ahead` months after it,
 * labeled in Spanish and capitalized (e.g. "Noviembre 2026").
 */
export function buildPeriodOptions(current: string, back: number, ahead: number): PeriodOption[] {
  const match = PERIOD_REGEX.exec(current);
  if (!match) {
    throw new Error(`Invalid period: ${current}. Expected YYYY-MM.`);
  }
  const baseIndex = parseInt(match[1], 10) * 12 + (parseInt(match[2], 10) - 1);
  const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const options: PeriodOption[] = [];
  for (let offset = -back; offset <= ahead; offset++) {
    const total = baseIndex + offset;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    const raw = formatter.format(new Date(Date.UTC(year, month - 1, 1)));
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    options.push({ value: `${year}-${String(month).padStart(2, '0')}`, label: label.replace(/ de /, ' ') });
  }
  return options;
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

export const MAX_PREPAYMENT_MONTHS = 12;
export const PASS_SESSIONS_INCLUDED = 10;

export interface BuildChargeInput {
  uid: string;
  /** First period covered by the charge (YYYY-MM). */
  period: string;
  /** Number of monthly payments to create. Only MONTHLY charges may exceed 1. */
  months: number;
  method: PaymentMethod;
  billingType: BillingType;
  concept: string;
  tariffId?: string;
  /** Per-month list price, before any discount. */
  baseAmountCents: number;
  isFoundingMember: boolean;
  validatedBy: string;
  /** Who took the payment; shown in notes. */
  staffLabel: string;
  /** Value used for createdAt / paidAt / validatedAt (e.g. Firestore serverTimestamp()). */
  stamp: unknown;
}

export interface ChargePaymentData {
  uid: string;
  period: string;
  method: PaymentMethod;
  billingType: BillingType;
  status: 'APPROVED';
  concept: string;
  amountCents: number;
  discountCents: number;
  notes: string;
  validatedBy: string;
  createdAt: unknown;
  paidAt: unknown;
  validatedAt: unknown;
  tariffId?: string;
  sessionsIncluded?: number;
  sessionsRemaining?: number;
}

export interface BuiltCharge {
  payments: ChargePaymentData[];
  /** Sum of amountCents across all payments. */
  totalCents: number;
  /** Final per-month amount after discount. */
  perMonthCents: number;
  /** Per-month discount applied. */
  discountPerMonthCents: number;
}

/**
 * Builds the APPROVED payment documents for a counter charge: one per month,
 * each with the discounted amount and period. Amounts are stored as plain
 * totals; no VAT breakdown is computed or saved for new payments.
 */
export function buildChargePayments(input: BuildChargeInput): BuiltCharge {
  const { months, billingType } = input;
  if (!Number.isInteger(months) || months < 1 || months > MAX_PREPAYMENT_MONTHS) {
    throw new Error(`Invalid number of months: ${months}. Must be between 1 and ${MAX_PREPAYMENT_MONTHS}.`);
  }
  if (billingType !== 'MONTHLY' && months > 1) {
    throw new Error('Only monthly charges can be prepaid for several months.');
  }
  if (!Number.isInteger(input.baseAmountCents) || input.baseAmountCents < 0) {
    throw new Error(`Invalid amount: ${input.baseAmountCents}. Must be an integer >= 0 (cents).`);
  }

  const periods = buildPrepaymentPeriods(input.period, months);
  const { finalCents, discountCents } = applyFoundingDiscount(
    input.baseAmountCents,
    input.isFoundingMember
  );
  const staffNote = `Cobro en mostrador por ${input.staffLabel}`;

  const payments = periods.map((period, i): ChargePaymentData => {
    const data: ChargePaymentData = {
      uid: input.uid,
      period,
      method: input.method,
      billingType,
      status: 'APPROVED',
      concept: input.concept,
      amountCents: finalCents,
      discountCents,
      notes: months > 1 ? `Pago adelantado ${i + 1}/${months} - ${staffNote}` : staffNote,
      validatedBy: input.validatedBy,
      createdAt: input.stamp,
      paidAt: input.stamp,
      validatedAt: input.stamp,
    };
    if (input.tariffId) data.tariffId = input.tariffId;
    if (billingType === 'PASS') {
      data.sessionsIncluded = PASS_SESSIONS_INCLUDED;
      data.sessionsRemaining = PASS_SESSIONS_INCLUDED;
    }
    return data;
  });

  return {
    payments,
    totalCents: finalCents * months,
    perMonthCents: finalCents,
    discountPerMonthCents: discountCents,
  };
}

/** Key used to group students whose latest payment carries no tariff. */
export const NO_TARIFF = '__none__';

function isActiveStudent(u: UserDomainModel): boolean {
  return u.accountStatus === 'ACTIVE' && (u.permissions ?? []).some((perm) => perm.toLowerCase() === 'student');
}

/** Latest APPROVED payment (highest period) per student uid. */
export function latestApprovedPaymentByUid(payments: PaymentDomainModel[]): Map<string, PaymentDomainModel> {
  const latest = new Map<string, PaymentDomainModel>();
  for (const p of payments) {
    if (p.status !== 'APPROVED') continue;
    const current = latest.get(p.uid);
    if (!current || p.period > current.period) latest.set(p.uid, p);
  }
  return latest;
}

export interface UnpaidStudentRow {
  user: UserDomainModel;
  /** Period of the student's latest APPROVED payment, if any. */
  lastPaidPeriod?: string;
  /** Tariff of that payment, or NO_TARIFF. */
  tariffKey: string;
}

/**
 * Active students without an APPROVED payment for `period`, with their last
 * paid period and tariff (from their latest APPROVED payment). Optionally
 * filtered by tariff key (a tariff id or NO_TARIFF).
 */
export function buildUnpaidRows(
  users: UserDomainModel[],
  payments: PaymentDomainModel[],
  period: string,
  tariffFilter?: string
): UnpaidStudentRow[] {
  const latest = latestApprovedPaymentByUid(payments);
  return findUnpaidStudents(users, payments, period)
    .map((user): UnpaidStudentRow => {
      const last = latest.get(user.uid);
      return { user, lastPaidPeriod: last?.period, tariffKey: last?.tariffId || NO_TARIFF };
    })
    .filter((row) => !tariffFilter || row.tariffKey === tariffFilter);
}

export interface PeriodPaymentSummary {
  /** Active students who have paid `period`. */
  paid: number;
  /** Active students in total. */
  total: number;
  /** Students who paid `period`, grouped by the tariff on that payment (tariff id or NO_TARIFF). */
  paidByTariff: Record<string, number>;
}

export function summarizePeriodPayments(
  users: UserDomainModel[],
  payments: PaymentDomainModel[],
  period: string
): PeriodPaymentSummary {
  const activeUids = new Set(users.filter(isActiveStudent).map((u) => u.uid));
  const tariffByUid = new Map<string, string>();
  for (const p of payments) {
    if (p.period !== period || p.status !== 'APPROVED' || !activeUids.has(p.uid)) continue;
    const existing = tariffByUid.get(p.uid);
    if (existing === undefined || existing === NO_TARIFF) {
      tariffByUid.set(p.uid, p.tariffId || NO_TARIFF);
    }
  }
  const paidByTariff: Record<string, number> = {};
  for (const key of tariffByUid.values()) paidByTariff[key] = (paidByTariff[key] ?? 0) + 1;
  return { paid: tariffByUid.size, total: activeUids.size, paidByTariff };
}
