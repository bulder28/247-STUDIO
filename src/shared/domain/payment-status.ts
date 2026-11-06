import {
  BillingType,
  BookingDomainModel,
  DerivedPaymentStatus,
  FreezeDomainModel,
  PaymentDomainModel,
} from './types';

export function getMadridYearMonth(date: Date): string {
  // Formatea YYYY-MM según la zona horaria Europe/Madrid
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
  });
  return formatter.format(date); // Retorna "YYYY-MM"
}

export function calculatePassBalance(
  payments: PaymentDomainModel[],
  bookings: Pick<BookingDomainModel, 'status'>[]
): number {
  const approvedPassPayments = payments.filter(
    (p) => p.billingType === 'PASS' && p.status === 'APPROVED'
  );

  const totalSessionsPurchased = approvedPassPayments.reduce(
    (acc, p) => acc + (p.sessionsIncluded || 0),
    0
  );

  const totalAttendedSessions = bookings.filter((b) => b.status === 'ATTENDED').length;

  return totalSessionsPurchased - totalAttendedSessions;
}

export interface DerivePaymentStatusParams {
  billingType: BillingType;
  payments: PaymentDomainModel[];
  bookings: Pick<BookingDomainModel, 'date' | 'status'>[];
  freezes?: FreezeDomainModel[];
  targetBookingId?: string; // Para DROP_IN
  now: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Derivación pura del estado de pago y membresía de un alumno.
 * Sin cron jobs ni efectos colaterales.
 */
export function derivePaymentStatus({
  billingType,
  payments,
  bookings,
  freezes = [],
  targetBookingId,
  now,
}: DerivePaymentStatusParams): DerivedPaymentStatus {
  // 1. MODALIDAD PASS (Bono de sesiones)
  if (billingType === 'PASS') {
    const balance = calculatePassBalance(payments, bookings);
    return balance > 0 ? 'OK' : 'NOK';
  }

  // 2. MODALIDAD DROP_IN (Clase suelta)
  if (billingType === 'DROP_IN') {
    if (!targetBookingId) {
      return 'NOK';
    }
    const hasApprovedPaymentForBooking = payments.some(
      (p) =>
        p.billingType === 'DROP_IN' &&
        p.bookingId === targetBookingId &&
        p.status === 'APPROVED'
    );
    if (hasApprovedPaymentForBooking) return 'OK';

    const hasPendingPayment = payments.some(
      (p) =>
        p.billingType === 'DROP_IN' &&
        p.bookingId === targetBookingId &&
        p.status === 'PENDING_APPROVAL'
    );
    return hasPendingPayment ? 'PENDING_VALIDATION' : 'NOK';
  }

  // 3. MODALIDAD MONTHLY (Incluye tarifa regular y familiar FAM)
  const currentPeriod = getMadridYearMonth(now);

  // Filtrar pagos para el periodo actual
  const periodPayments = payments.filter((p) => p.period === currentPeriod);

  // Ordenar por validatedAt desc si existen múltiples
  const approvedPayments = periodPayments
    .filter((p) => p.status === 'APPROVED')
    .sort((a, b) => {
      const timeA = a.validatedAt ? new Date(a.validatedAt).getTime() : 0;
      const timeB = b.validatedAt ? new Date(b.validatedAt).getTime() : 0;
      return timeB - timeA;
    });

  if (approvedPayments.length > 0) {
    return 'OK';
  }

  const hasPendingApproval = periodPayments.some(
    (p) => p.status === 'PENDING_APPROVAL'
  );
  if (hasPendingApproval) {
    return 'PENDING_VALIDATION';
  }

  // Verificar si hay un freeze activo en `now`
  const nowTime = now.getTime();
  const isFreezeActive = freezes.some((f) => {
    const start = new Date(f.startDate).getTime();
    if (f.openEnded) {
      return nowTime >= start;
    }
    if (f.endDate) {
      const end = new Date(f.endDate).getTime();
      return nowTime >= start && nowTime <= end;
    }
    return nowTime >= start;
  });

  if (isFreezeActive) {
    return 'GRACE';
  }

  // Regla de los 7 días: primera clase con estado ATTENDED en el periodo actual
  // Los bookings están formateados con fecha YYYY-MM-DD
  const periodAttendedBookings = bookings
    .filter((b) => b.status === 'ATTENDED' && b.date.startsWith(currentPeriod))
    .map((b) => new Date(b.date).getTime())
    .sort((a, b) => a - b); // Primera clase primero

  if (periodAttendedBookings.length > 0) {
    const firstAttendedDateMs = periodAttendedBookings[0];
    const diffDays = Math.floor((nowTime - firstAttendedDateMs) / MS_PER_DAY);
    if (diffDays >= 7) {
      return 'NOK';
    }
  }

  // Por defecto (ej. inicio de mes, días 1-6 o sin clases aún)
  return 'GRACE';
}
