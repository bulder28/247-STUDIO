import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Bell, ChevronRight } from 'lucide-react';
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
import { BeltProgressionCard } from '@/widgets/BeltProgressionCard';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';

export const HomePage: React.FC = () => {
  const { user, userData, role } = useAuth();
  const [derivedStatus, setDerivedStatus] = useState<DerivedPaymentStatus>('GRACE');
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDomainModel[]>([]);
  const [bookings, setBookings] = useState<BookingDomainModel[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'academia' | 'entrenamiento'>('academia');
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 13) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

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
        const userBookings: BookingDomainModel[] = [];
        bookingsSnap.forEach((d) => userBookings.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
        setBookings(userBookings);

        // 3. Cargar freezes del alumno
        const freezesQuery = query(collection(db, 'freezes'), where('uid', '==', user.uid));
        const freezesSnap = await getDocs(freezesQuery);
        const freezes: FreezeDomainModel[] = [];
        freezesSnap.forEach((d) => freezes.push({ id: d.id, ...(d.data() as Omit<FreezeDomainModel, 'id'>) }));

        // 4. Derivar estado de pago puro
        const status = derivePaymentStatus({
          billingType: 'MONTHLY',
          payments,
          bookings: userBookings,
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
      <div className="py-20 flex justify-center items-center">
        <div className="w-8 h-8 border-3 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const nextClassInfo = getNextClass(schedules, exceptions, now);
  const activeClass = schedules.find((s) => isClassInProgress(s, exceptions, now));

  const displayClass = activeClass || nextClassInfo?.schedule || schedules[0];
  const isClassActive = !!activeClass;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. ENCABEZADO ESTILO MATGOAT (Saludo + Nombre + Academia) */}
      {/* ======================================================== */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {getGreeting()}, {userData.alias} 👋
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">
          247Studio · Pinto (Madrid Sur)
        </p>
      </div>

      {/* Selector de pestañas segmentado estilo MatGoat */}
      <div className="inline-flex p-1 bg-slate-200/70 rounded-xl">
        <button
          onClick={() => setActiveTab('academia')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'academia'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mi academia
        </button>
        <button
          onClick={() => setActiveTab('entrenamiento')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'entrenamiento'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Entrenamiento
        </button>
      </div>

      {activeTab === 'academia' ? (
        <>
          {/* ======================================================== */}
          {/* 2. DOS TARJETAS PRINCIPALES (Próximas clases & Pendiente) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tarjeta Izquierda: Próximas clases */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                  <h3 className="font-bold text-slate-900 text-base">Próximas clases</h3>
                  <Link
                    to="/app/horario"
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                  >
                    Calendario
                  </Link>
                </div>

                <div className="mb-6">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    {isClassActive ? 'En curso ahora' : 'Hoy'}
                  </span>
                  <div className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {displayClass ? `${displayClass.startTime} – ${displayClass.endTime}` : '10:00 – 11:30'}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className={`w-2.5 h-2.5 rounded-full ${isClassActive ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500'}`} />
                    <span>Todos los niveles</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{displayClass?.program || 'BJJ Gi & Grappling'}</span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    Prof. {displayClass?.professor || 'Mario Rodríguez'}
                  </p>

                  <div className="mt-5">
                    {role === 'admin' ? (
                      <Link
                        to="/admin/asistencia"
                        className="inline-flex items-center justify-center px-4 py-2.5 bg-[#1A1D2E] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
                      >
                        Ver asistencia
                      </Link>
                    ) : (
                      <button
                        onClick={() => setShowQrModal(true)}
                        className="inline-flex items-center justify-center px-4 py-2.5 bg-[#1A1D2E] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
                      >
                        Ver pase de check-in
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Clases subsiguientes de hoy */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                {schedules.slice(1, 3).map((s) => (
                  <Link
                    key={s.id}
                    to="/app/horario"
                    className="flex items-center justify-between text-xs py-2 px-1 rounded-lg hover:bg-slate-50 transition"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{s.program}</span>
                      <span className="text-slate-400 text-[11px]">Hoy · {s.startTime} - {s.endTime}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Tarjeta Derecha: Pendiente de revisar estilo MatGoat */}
            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                  <h3 className="font-bold text-slate-900 text-base">Pendiente de revisar</h3>
                  <Bell className="w-4 h-4 text-slate-400" />
                </div>

                <div className="space-y-4">
                  {/* Fila 1: Estado de cuota */}
                  <Link to="/app/programas" className="flex items-center justify-between group py-1">
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-brand-accent transition">
                        Estado de membresía
                      </p>
                      <p className="text-[11px] text-slate-400">Cuota activa 247Studio</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        derivedStatus === 'OK'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {derivedStatus === 'OK' ? 'Al día' : 'Pendiente'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
                    </div>
                  </Link>

                  {/* Fila 2: Mensajes sin leer */}
                  <Link to="/app/avisos" className="flex items-center justify-between group py-1">
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-brand-accent transition">
                        Mensajes sin leer
                      </p>
                      <p className="text-[11px] text-slate-400">Anuncios y avisos del tatami</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full text-[11px] font-bold bg-[#1A1D2E] text-white flex items-center justify-center">
                        3
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
                    </div>
                  </Link>

                  {/* Fila 3: Asistencias del mes */}
                  <Link to="/app/horario" className="flex items-center justify-between group py-1">
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-brand-accent transition">
                        Asistencias este mes
                      </p>
                      <p className="text-[11px] text-slate-400">Clases registradas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 font-mono">
                        {bookings.length}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
                    </div>
                  </Link>
                </div>
              </div>

              {/* Sección inferior: ACCESOS RÁPIDOS */}
              <div className="pt-5 border-t border-slate-100 mt-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Accesos rápidos
                </span>
                <div className="space-y-1">
                  <Link
                    to="/app/programas"
                    className="flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition"
                  >
                    <span>Pagos y Cuotas</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </Link>
                  <Link
                    to="/app/horario"
                    className="flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition"
                  >
                    <span>Horario semanal</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. FILA DE 3 CONTADORES INFERIORES ESTILO MATGOAT        */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-400 font-medium block">Clases esta semana</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight">
                14 clases
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                Tatami activo Lunes a Viernes
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-400 font-medium block">Alumnos que han asistido este mes</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight">
                48 alumnos
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                Comunidad 247Studio Pinto
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-400 font-medium block">Nuevos alumnos este mes</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight">
                12 altas
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                Clases de prueba activas
              </span>
            </div>
          </div>
        </>
      ) : (
        /* Pestaña de Entrenamiento: Ficha de Atleta, Gamificación y Atributos */
        <div className="space-y-6">
          <BeltProgressionCard user={userData} bookings={bookings} />
          <FighterCard user={userData} />
        </div>
      )}

      {/* Modal Pase QR */}
      {showQrModal && userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm relative">
            <QrCodePassCard user={userData} onClose={() => setShowQrModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};