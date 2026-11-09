import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { ChevronRight, QrCode } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { getLiveDocs } from '@/shared/api/liveReads';
import { useScheduleData } from '@/shared/hooks/useScheduleQueries';
import { derivePaymentStatus } from '@/shared/domain/payment-status';
import {
  DEFAULT_OFFICIAL_SCHEDULES,
  getMadridTimeComponents,
  getNextClass,
  isClassInProgress,
} from '@/shared/domain/schedule';
import {
  BookingDomainModel,
  DerivedPaymentStatus,
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
} from '@/shared/domain/types';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';

const PAYMENT_UI: Record<DerivedPaymentStatus, { label: string; hint: string; cls: string }> = {
  OK: { label: 'Al día', hint: 'No tienes pagos pendientes', cls: 'bg-[#DDF3E8] text-[#0B5D3B]' },
  PENDING_VALIDATION: { label: 'En revisión', hint: 'Estamos validando tu pago', cls: 'bg-[#FDEBC8] text-[#5C3700]' },
  GRACE: { label: 'Pendiente', hint: 'Paga pronto para seguir reservando', cls: 'bg-[#FDEBC8] text-[#5C3700]' },
  NOK: { label: 'Impago', hint: 'Regulariza tu cuota para reservar', cls: 'bg-[#FBDADD] text-[#8F1420]' },
};

function formatClassDay(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Hoy';
  const label = new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const HomePage: React.FC = () => {
  const { user, userData } = useAuth();
  const [derivedStatus, setDerivedStatus] = useState<DerivedPaymentStatus>('GRACE');
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);

  // Mismos datos (y misma caché) que la pestaña "Clases": al saltar entre ambas no se vuelve a descargar nada
  const { data: scheduleData, isLoading: scheduleLoading } = useScheduleData(user?.uid);
  const schedules: ScheduleDomainModel[] = scheduleData?.schedules ?? DEFAULT_OFFICIAL_SCHEDULES;
  const exceptions: ScheduleExceptionDomainModel[] = scheduleData?.exceptions ?? [];
  const bookings: BookingDomainModel[] = scheduleData?.myBookings ?? [];
  const loading = scheduleLoading || paymentsLoading;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  useEffect(() => {
    let isMounted = true;
    if (!user) return;

    const loadPayments = async () => {
      try {
        const paymentsSnap = await getLiveDocs(
          `payments:${user.uid}`,
          query(collection(db, 'payments'), where('uid', '==', user.uid))
        );
        const paymentsList: any[] = [];
        paymentsSnap.forEach((d) => paymentsList.push({ id: d.id, ...d.data() }));
        if (isMounted) {
          setDerivedStatus(
            derivePaymentStatus({
              billingType: 'MONTHLY',
              payments: paymentsList,
              bookings: [],
              freezes: [],
              now: new Date(),
            })
          );
        }
      } catch (err) {
        console.error('Error leyendo pagos del alumno:', err);
      } finally {
        if (isMounted) setPaymentsLoading(false);
      }
    };

    loadPayments();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading || !userData) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 animate-pulse" role="status" aria-label="Cargando">
        <div className="h-9 w-56 rounded-xl bg-studio-cream" />
        <div className="h-64 rounded-2xl bg-studio-cream" />
        <div className="h-20 rounded-xl bg-studio-cream" />
        <span className="sr-only">Cargando tu panel…</span>
      </div>
    );
  }

  const now = new Date();
  const madridNow = getMadridTimeComponents(now);
  const nextClassInfo = getNextClass(schedules, exceptions, now);
  const activeClass = schedules.find((s) => isClassInProgress(s, exceptions, now));

  const displayClass = activeClass || nextClassInfo?.schedule;
  const isClassActive = !!activeClass;
  const classDate = activeClass ? madridNow.dateStr : nextClassInfo?.targetDateStr;
  const isBooked =
    !!displayClass &&
    bookings.some((b) => b.scheduleId === displayClass.id && b.date === classDate && b.status === 'BOOKED');

  const upcoming = bookings
    .filter(
      (b) =>
        b.status === 'BOOKED' &&
        b.date >= madridNow.dateStr &&
        !(b.scheduleId === displayClass?.id && b.date === classDate)
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map((b) => ({ booking: b, schedule: schedules.find((s) => s.id === b.scheduleId) }));

  const monthName = new Date(`${madridNow.dateStr.slice(0, 7)}-15T12:00:00`).toLocaleDateString('es-ES', {
    month: 'long',
  });
  const payment = PAYMENT_UI[derivedStatus];

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-4 text-studio-navy">
      <h1 className="font-headline text-3xl leading-tight">
        {getGreeting()}, {userData.alias}
      </h1>

      <section className="flex flex-col gap-3.5 rounded-2xl bg-studio-navy p-5 text-studio-cream-light">
        <p className="text-sm text-studio-cream">{isClassActive ? 'Clase en curso' : 'Tu próxima clase'}</p>
        {displayClass && classDate ? (
          <>
            <p className="font-headline text-4xl leading-none num">
              {formatClassDay(classDate, madridNow.dateStr)}, {displayClass.startTime}
            </p>
            <p className="text-base">
              {displayClass.program}
              {displayClass.room ? ` · ${displayClass.room}` : ''}
            </p>
          </>
        ) : (
          <p className="text-base">No hay clases programadas esta semana.</p>
        )}
        <button
          type="button"
          onClick={() => setShowQrModal(true)}
          className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-studio-red text-base font-semibold text-white transition hover:bg-studio-red-dark"
        >
          <QrCode className="h-5 w-5" aria-hidden="true" />
          Enseñar carnet QR
        </button>
        {displayClass && (
          <Link
            to="/app/horario"
            className="flex min-h-[44px] items-center justify-center text-sm text-studio-cream underline"
          >
            {isBooked ? 'Tienes plaza reservada · Ver o cancelar' : 'Reservar plaza'}
          </Link>
        )}
      </section>

      <Link
        to="/app/pagos"
        className="flex items-center justify-between gap-3 rounded-xl border border-studio-cream bg-white p-4"
      >
        <div>
          <p className="text-base font-semibold">Cuota de {monthName}</p>
          <p className="mt-0.5 text-sm text-slate-600">{payment.hint}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${payment.cls}`}>{payment.label}</span>
      </Link>

      <section>
        <h2 className="mb-1 text-base font-semibold">Después</h2>
        {upcoming.length > 0 ? (
          <ul>
            {upcoming.map(({ booking, schedule }) => (
              <li
                key={booking.id}
                className="flex min-h-[48px] items-center justify-between border-t border-studio-cream text-[15px]"
              >
                <span>
                  {formatClassDay(booking.date, madridNow.dateStr)}
                  {schedule ? ` · ${schedule.startTime} · ${schedule.program}` : ''}
                </span>
                <span className="text-sm font-semibold text-[#0B5D3B]">Reservada</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-studio-cream pt-3 text-[15px] text-slate-700">
            No tienes más reservas. Reserva tu próxima clase.
          </p>
        )}
        <Link
          to="/app/horario"
          className="flex min-h-[44px] items-center gap-1 text-sm font-semibold text-studio-red-dark"
        >
          Ver horario completo <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-xs border-0 bg-transparent p-0 shadow-none">
          {userData && <QrCodePassCard user={userData} onClose={() => setShowQrModal(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
