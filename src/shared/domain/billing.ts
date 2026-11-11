import { calculateVatBreakdown } from './money';
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
export const DEFAULT_VAT_RATE = 0.21;

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
  /** Per-month list price (VAT included), before any discount. */
  baseAmountCents: number;
  isFoundingMember: boolean;
  validatedBy: string;
  /** Who took the payment; shown in notes. */
  staffLabel: string;
  /** Value used for createdAt / paidAt / validatedAt (e.g. Firestore serverTimestamp()). */
  stamp: unknown;
  vatRate?: number;
}

export interface ChargePaymentData {
  uid: string;
  period: string;
  method: PaymentMethod;
  billingType: BillingType;
  status: 'APPROVED';
  concept: string;
  amountCents: number;
  baseCents: number;
  vatCents: number;
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
 * each with the discounted amount, VAT breakdown (VAT included in price) and period.
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
  const vat = calculateVatBreakdown(finalCents, input.vatRate ?? DEFAULT_VAT_RATE);
  const staffNote = `Cobro en mostrador por ${input.staffLabel}`;

  const payments = periods.map((period, i): ChargePaymentData => {
    const data: ChargePaymentData = {
      uid: input.uid,
      period,
      method: input.method,
      billingType,
      status: 'APPROVED',
      concept: input.concept,
      amountCents: vat.totalCents,
      baseCents: vat.baseCents,
      vatCents: vat.vatCents,
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
