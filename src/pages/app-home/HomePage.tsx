import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Calendar, ChevronRight, QrCode } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { derivePaymentStatus } from '@/shared/domain/payment-status';
import { DEFAULT_OFFICIAL_SCHEDULES, getNextClass, isClassInProgress } from '@/shared/domain/schedule';
import {
  BookingDomainModel,
  DerivedPaymentStatus,
  FreezeDomainModel,
  PaymentDomainModel,
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
} from '@/shared/domain/types';
import { FighterCard } from '@/widgets/FighterCard';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';
import { StatusTrafficLight } from '@/widgets/StatusTrafficLight';

export const HomePage: React.FC = () => {
  const { user, userData } = useAuth();
  const [derivedStatus, setDerivedStatus] = useState<DerivedPaymentStatus>('GRACE');
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDomainModel[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const now = new Date();

        // 1. Cargar pagos del alumno
        const paymentsQuery = query(collection(db, 'payments'), where('uid', '==', user.uid));
        const paymentsSnap = await getDocs(paymentsQuery);
        const payments: PaymentDomainModel[] = [];
        paymentsSnap.forEach((d) => payments.push({ id: d.id, ...(d.data() as Omit<PaymentDomainModel, 'id'>) }));

        // 2. Cargar bookings del alumno
        const bookingsQuery = query(collection(db, 'bookings'), where('uid', '==', user.uid));
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookings: BookingDomainModel[] = [];
        bookingsSnap.forEach((d) => bookings.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));

        // 3. Cargar freezes del alumno
        const freezesQuery = query(collection(db, 'freezes'), where('uid', '==', user.uid));
        const freezesSnap = await getDocs(freezesQuery);
        const freezes: FreezeDomainModel[] = [];
        freezesSnap.forEach((d) => freezes.push({ id: d.id, ...(d.data() as Omit<FreezeDomainModel, 'id'>) }));

        // 4. Derivar estado de pago puro
        const status = derivePaymentStatus({
          billingType: 'MONTHLY',
          payments,
          bookings,
          freezes,
          now,
        });
        setDerivedStatus(status);

        // 5. Cargar horarios y excepciones
        const schedSnap = await getDocs(query(collection(db, 'schedules'), where('active', '==', true)));
        const schedList: ScheduleDomainModel[] = [];
        schedSnap.forEach((d) => schedList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
        setSchedules(schedList.length > 0 ? schedList : DEFAULT_OFFICIAL_SCHEDULES);

        const excSnap = await getDocs(collection(db, 'scheduleExceptions'));
        const excList: ScheduleExceptionDomainModel[] = [];
        excSnap.forEach((d) => excList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) }));
        setExceptions(excList);
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading || !userData) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const nextClassInfo = getNextClass(schedules, exceptions, now);
  const activeClass = schedules.find((s) => isClassInProgress(s, exceptions, now));

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* Botón rápido Pase QR */}
      <div className="flex items-center justify-between bg-gradient-to-r from-studio-navy-light via-studio-navy-light to-studio-red/20 border border-white/10 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-studio-red text-white rounded-xl shadow-md shadow-studio-red/30">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wide">Pase Digital QR</h3>
            <p className="text-xs text-studio-cream/70">Check-in automático en la tablet de recepción</p>
          </div>
        </div>
        <button
          onClick={() => setShowQrModal(true)}
          className="px-4 py-2 bg-white text-studio-navy font-black text-xs uppercase tracking-wider rounded-xl hover:bg-studio-cream transition shadow flex items-center gap-1"
        >
          <span>Ver QR</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Semáforo Gigante de Pago (OK / PENDING / GRACE / NOK) */}
      <StatusTrafficLight status={derivedStatus} />

      {/* Estado en Vivo de Clases (En Curso / Siguiente) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Clase en curso */}
        <div className="bg-studio-navy-light/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                activeClass ? 'bg-emerald-500 animate-ping' : 'bg-white/20'
              }`}
            />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-studio-cream/60 block">
                Clase en Curso
              </span>
              <p className="text-sm font-black text-white">
                {activeClass ? `${activeClass.program} (${activeClass.startTime} - ${activeClass.endTime})` : 'Ninguna clase en curso'}
              </p>
              {activeClass && (
                <span className="text-xs text-studio-cream/70">Prof. {activeClass.professor}</span>
              )}
            </div>
          </div>
        </div>

        {/* Siguiente clase */}
        <div className="bg-studio-navy-light/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-studio-cream/60" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-studio-cream/60 block">
                Siguiente Clase Programada
              </span>
              <p className="text-sm font-black text-white">
                {nextClassInfo
                  ? `${nextClassInfo.schedule.program} (${nextClassInfo.schedule.startTime})`
                  : 'Sin clases próximas'}
              </p>
              {nextClassInfo && (
                <span className="text-xs text-studio-cream/70">
                  {nextClassInfo.targetDateStr} • Prof. {nextClassInfo.schedule.professor}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ficha de Luchador (8 Barras de Atributos del Tatami) */}
      <FighterCard user={userData} />

      {/* Modal Pase QR Pantalla Completa */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="max-w-sm w-full animate-in zoom-in-95 duration-200">
            <QrCodePassCard user={userData} />
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-4 w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition border border-white/10"
            >
              Cerrar Pase
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
