import { describe, expect, it } from 'vitest';
import { calculatePassBalance, derivePaymentStatus } from '../../src/shared/domain/payment-status';
import { BookingDomainModel, FreezeDomainModel, PaymentDomainModel } from '../../src/shared/domain/types';

describe('Dominio Puro: Derivación de Estado de Pago y Membresía', () => {
  const mockNow = new Date('2026-11-10T12:00:00Z'); // Periodo actual: 2026-11

  describe('Modalidad MONTHLY', () => {
    it('devuelve OK si existe un pago APPROVED para el periodo en curso', () => {
      const payments: PaymentDomainModel[] = [
        {
          id: 'pay-1',
          uid: 'u-1',
          period: '2026-11',
          method: 'BIZUM',
          status: 'APPROVED',
          billingType: 'MONTHLY',
          amountCents: 6500,
          validatedAt: '2026-11-02T10:00:00Z',
          createdAt: '2026-11-02T09:00:00Z',
        },
      ];

      const status = derivePaymentStatus({
        billingType: 'MONTHLY',
        payments,
        bookings: [{ date: '2026-11-02', status: 'ATTENDED' }],
        now: mockNow,
      });

      expect(status).toBe('OK');
    });

    it('devuelve PENDING_VALIDATION si el alumno reportó el pago y está pendiente de admin', () => {
      const payments: PaymentDomainModel[] = [
        {
          id: 'pay-2',
          uid: 'u-1',
          period: '2026-11',
          method: 'BIZUM',
          status: 'PENDING_APPROVAL',
          billingType: 'MONTHLY',
          createdAt: '2026-11-08T10:00:00Z',
        },
      ];

      const status = derivePaymentStatus({
        billingType: 'MONTHLY',
        payments,
        bookings: [{ date: '2026-11-02', status: 'ATTENDED' }],
        now: mockNow,
      });

      expect(status).toBe('PENDING_VALIDATION');
    });

    it('devuelve GRACE en los primeros días del mes si no hay asistencias registradas', () => {
      const status = derivePaymentStatus({
        billingType: 'MONTHLY',
        payments: [],
        bookings: [],
        now: new Date('2026-11-03T12:00:00Z'),
      });

      expect(status).toBe('GRACE');
    });

    it('devuelve NOK si no hay pago aprobado y la primera clase ATTENDED fue hace >= 7 días', () => {
      const status = derivePaymentStatus({
        billingType: 'MONTHLY',
        payments: [],
        bookings: [
          { date: '2026-11-01', status: 'ATTENDED' }, // 9 días antes de 2026-11-10
        ],
        now: mockNow,
      });

      expect(status).toBe('NOK');
    });

    it('NO_SHOW no activa la regla de 7 días', () => {
      const status = derivePaymentStatus({
        billingType: 'MONTHLY',
        payments: [],
        bookings: [
          { date: '2026-11-01', status: 'NO_SHOW' }, // No cuenta como asistencia
        ],
        now: mockNow,
      });

      expect(status).toBe('GRACE');
    });

    it('un pago REJECTED no liquida la deuda y deriva a NOK si ya pasaron 7 días', () => {
      const payments: PaymentDomainModel[] = [
        {
          id: 'pay-3',
          uid: 'u-1',
          period: '2026-11',
          method: 'BIZUM',
          status: 'REJECTED',
          billingType: 'MONTHLY',
          rejectedReason: 'Comprobante no legible',
          createdAt: '2026-11-02T10:00:00Z',
        },
      ];

      const status = derivePaymentStatus({
        billingType: 'MONTHLY',
        payments,
        bookings: [{ date: '2026-11-01', status: 'ATTENDED' }],
        now: mockNow,
      });

      expect(status).toBe('NOK');
    });

    it('un freeze activo en now fuerza el estado a GRACE ignorando la regla de 7 días', () => {
      const freezes: FreezeDomainModel[] = [
        {
          id: 'fr-1',
          uid: 'u-1',
          reason: 'INJURY',
          startDate: '2026-11-05T00:00:00Z',
          openEnded: true,
          createdAt: '2026-11-05T00:00:00Z',
          createdBy: 'admin-1',
        },
      ];

      const status = derivePaymentStatus({
        billingType: 'MONTHLY',
        payments: [],
        bookings: [{ date: '2026-11-01', status: 'ATTENDED' }], // Asistió hace 9 días
        freezes,
        now: mockNow,
      });

      expect(status).toBe('GRACE');
    });

    it('usa el pago APPROVED más reciente ordenado por validatedAt si hay varios', () => {
      const payments: PaymentDomainModel[] = [
        {
          id: 'pay-old',
          uid: 'u-1',
          period: '2026-11',
          method: 'CASH',
          status: 'REJECTED',
          billingType: 'MONTHLY',
          validatedAt: '2026-11-01T10:00:00Z',
          createdAt: '2026-11-01T09:00:00Z',
        },
        {
          id: 'pay-new',
          uid: 'u-1',
          period: '2026-11',
          method: 'BIZUM',
          status: 'APPROVED',
          billingType: 'MONTHLY',
          validatedAt: '2026-11-02T10:00:00Z',
          createdAt: '2026-11-02T09:00:00Z',
        },
      ];

      const status = derivePaymentStatus({
        billingType: 'MONTHLY',
        payments,
        bookings: [{ date: '2026-11-01', status: 'ATTENDED' }],
        now: mockNow,
      });

      expect(status).toBe('OK');
    });
  });

  describe('Modalidad PASS (Bonos)', () => {
    it('calcula saldo: 10 sesiones compradas - 3 ATTENDED = 7 disponibles -> OK', () => {
      const payments: PaymentDomainModel[] = [
        {
          id: 'pay-pass-1',
          uid: 'u-2',
          period: '2026-11',
          method: 'BIZUM',
          status: 'APPROVED',
          billingType: 'PASS',
          sessionsIncluded: 10,
          createdAt: '2026-11-01T10:00:00Z',
        },
      ];
      const bookings: Pick<BookingDomainModel, 'status'>[] = [
        { status: 'ATTENDED' },
        { status: 'ATTENDED' },
        { status: 'ATTENDED' },
        { status: 'NO_SHOW' }, // No descuenta saldo
        { status: 'CANCELLED' }, // No descuenta saldo
      ];

      const balance = calculatePassBalance(payments, bookings);
      expect(balance).toBe(7);

      const status = derivePaymentStatus({
        billingType: 'PASS',
        payments,
        bookings: bookings.map((b) => ({ ...b, date: '2026-11-02' })),
        now: mockNow,
      });
      expect(status).toBe('OK');
    });

    it('devuelve NOK si 10 sesiones compradas - 10 ATTENDED = 0 saldo', () => {
      const payments: PaymentDomainModel[] = [
        {
          id: 'pay-pass-1',
          uid: 'u-2',
          period: '2026-11',
          method: 'CASH',
          status: 'APPROVED',
          billingType: 'PASS',
          sessionsIncluded: 10,
          createdAt: '2026-10-01T10:00:00Z',
        },
      ];
      const bookings = Array.from({ length: 10 }).map(() => ({
        status: 'ATTENDED' as const,
        date: '2026-10-15',
      }));

      const balance = calculatePassBalance(payments, bookings);
      expect(balance).toBe(0);

      const status = derivePaymentStatus({
        billingType: 'PASS',
        payments,
        bookings,
        now: mockNow,
      });
      expect(status).toBe('NOK');
    });

    it('un segundo pago de PASS suma acumulativamente al saldo total', () => {
      const payments: PaymentDomainModel[] = [
        {
          id: 'pay-pass-1',
          uid: 'u-2',
          period: '2026-10',
          method: 'CASH',
          status: 'APPROVED',
          billingType: 'PASS',
          sessionsIncluded: 10,
          createdAt: '2026-10-01T10:00:00Z',
        },
        {
          id: 'pay-pass-2',
          uid: 'u-2',
          period: '2026-11',
          method: 'BIZUM',
          status: 'APPROVED',
          billingType: 'PASS',
          sessionsIncluded: 5,
          createdAt: '2026-11-05T10:00:00Z',
        },
      ];
      // 15 sesiones totales - 12 consumidas = 3 restantes
      const bookings = Array.from({ length: 12 }).map(() => ({
        status: 'ATTENDED' as const,
      }));

      const balance = calculatePassBalance(payments, bookings);
      expect(balance).toBe(3);
    });
  });
});
