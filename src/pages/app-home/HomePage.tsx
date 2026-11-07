import React, { Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  QrCode,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
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
  FreezeDomainModel,
  PaymentDomainModel,
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
} from '@/shared/domain/types';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { BeltProgressionCard } from '@/widgets/BeltProgressionCard';
const FighterCard = React.lazy(() =>
  import('@/widgets/FighterCard').then((m) => ({ default: m.FighterCard }))
);
import { QrCodePassCard } from '@/widgets/QrCodePassCard';

export const HomePage: React.FC = () => {
  const { user, userData, role } = useAuth();
  const [derivedStatus, setDerivedStatus] = useState<DerivedPaymentStatus>('GRACE');
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDomainModel[]>([]);
  const [bookings, setBookings] = useState<BookingDomainModel[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'academia' | 'entrenamiento'>('academia');
  const [mobileSection, setMobileSection] = useState<'hoy' | 'socio' | 'cinturon' | 'fut'>('hoy');
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

        // 1. Ejecución paralela de consultas independientes con Promise.all
        const paymentsQuery = query(collection(db, 'payments'), where('uid', '==', user.uid));
        const bookingsQuery = query(collection(db, 'bookings'), where('uid', '==', user.uid));
        const freezesQuery = query(collection(db, 'freezes'), where('uid', '==', user.uid));
        const schedQuery = query(collection(db, 'schedules'), where('active', '==', true));
        const excQuery = collection(db, 'scheduleExceptions');

        const [paymentsSnap, bookingsSnap, freezesSnap, schedSnap, excSnap] = await Promise.all([
          getDocs(paymentsQuery),
          getDocs(bookingsQuery),
          getDocs(freezesQuery),
          getDocs(schedQuery),
          getDocs(excQuery),
        ]);

        const payments: PaymentDomainModel[] = [];
        paymentsSnap.forEach((d) => payments.push({ id: d.id, ...(d.data() as Omit<PaymentDomainModel, 'id'>) }));

        const userBookings: BookingDomainModel[] = [];
        bookingsSnap.forEach((d) => userBookings.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
        setBookings(userBookings);

        const freezes: FreezeDomainModel[] = [];
        freezesSnap.forEach((d) => freezes.push({ id: d.id, ...(d.data() as Omit<FreezeDomainModel, 'id'>) }));

        // 2. Derivar estado de pago puro
        const status = derivePaymentStatus({
          billingType: 'MONTHLY',
          payments,
          bookings: userBookings,
          freezes,
          now,
        });
        setDerivedStatus(status);

        // 3. Procesar horarios y excepciones
        const schedList: ScheduleDomainModel[] = [];
        schedSnap.forEach((d) => schedList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
        setSchedules(schedList.length > 0 ? schedList : DEFAULT_OFFICIAL_SCHEDULES);

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
      <div className="space-y-6 pb-10 animate-pulse" role="status" aria-label="Cargando panel de bienvenida...">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-slate-200 rounded-xl" />
            <div className="h-4 w-72 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-10 w-64 bg-slate-100 rounded-xl" />
        </div>

        {/* Bento Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Bento Card 1 Skeleton: Schedule (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200/80 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="h-5 w-48 bg-slate-200 rounded-lg" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
            <div className="space-y-3">
              <div className="h-5 w-32 bg-slate-100 rounded-full" />
              <div className="h-10 w-44 bg-slate-200 rounded-xl" />
              <div className="h-4 w-60 bg-slate-100 rounded" />
            </div>
            <div className="flex gap-3 pt-2">
              <div className="h-10 w-40 bg-slate-200 rounded-xl" />
              <div className="h-10 w-36 bg-slate-100 rounded-xl" />
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="h-3 w-40 bg-slate-100 rounded" />
              <div className="h-8 w-full bg-slate-50 rounded-xl" />
            </div>
          </div>

          {/* Bento Card 2 Skeleton: Partner Panel (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200/80 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="h-5 w-32 bg-slate-200 rounded-lg" />
              <div className="h-5 w-12 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-3">
              <div className="h-16 w-full bg-slate-50 border border-slate-100 rounded-2xl" />
              <div className="h-16 w-full bg-slate-50 border border-slate-100 rounded-2xl" />
              <div className="h-16 w-full bg-slate-50 border border-slate-100 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Bento Row 3 Skeleton: Metrics (3 cols) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="h-28 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm space-y-2">
            <div className="h-3 w-28 bg-slate-100 rounded" />
            <div className="h-6 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
          <div className="h-28 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm space-y-2">
            <div className="h-3 w-28 bg-slate-100 rounded" />
            <div className="h-6 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
          <div className="h-28 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm space-y-2">
            <div className="h-3 w-28 bg-slate-100 rounded" />
            <div className="h-6 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
        </div>
        <span className="sr-only">Cargando datos de bienvenida...</span>
      </div>
    );
  }

  const now = new Date();
  const madridNow = getMadridTimeComponents(now);
  const nextClassInfo = getNextClass(schedules, exceptions, now);
  const activeClass = schedules.find((s) => isClassInProgress(s, exceptions, now));

  const displayClass = activeClass || nextClassInfo?.schedule || schedules[0];
  const isClassActive = !!activeClass;

  // Filtrar otras sesiones estrictamente por el día de la semana actual (Madrid)
  const todayOtherSchedules = schedules
    .filter(
      (s) =>
        s.active !== false &&
        s.dayOfWeek === madridNow.dayOfWeek &&
        s.id !== displayClass?.id
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Horas de tatami / asistencias en el mes en curso (matching reportMonth YYYY-MM)
  const reportMonth = madridNow.dateStr.slice(0, 7);
  const monthAttendedCount = bookings.filter(
    (b) =>
      b.date &&
      b.date.startsWith(reportMonth) &&
      (b.status === 'ATTENDED' || b.status === 'BOOKED' || (!b.status && b.date <= madridNow.dateStr))
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3 md:space-y-6 pb-2 md:pb-10"
    >
      {/* ======================================================== */}
      {/* 1. ENCABEZADO CON SHADCN / ATHLETIC TYPOGRAPHY          */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-black text-[#09090B] tracking-tight">
              {getGreeting()}, {userData.alias}
            </h1>
            <span className="text-lg sm:text-xl">🥋</span>
          </div>
          <p className="hidden sm:block text-xs sm:text-sm text-zinc-500 font-medium mt-0.5">
            247Studio · Academia de Brazilian Jiu-Jitsu en Pinto (Madrid)
          </p>
        </div>

        {/* Selector de sub-pestañas móvil sin scroll vertical */}
        <div className="md:hidden grid grid-cols-4 gap-1 bg-zinc-200/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMobileSection('hoy');
              setActiveTab('academia');
            }}
            className={`py-2 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              mobileSection === 'hoy' ? 'bg-[#09090B] text-white shadow-xs' : 'text-zinc-600'
            }`}
          >
            🥋 Hoy
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileSection('socio');
              setActiveTab('academia');
            }}
            className={`py-2 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              mobileSection === 'socio' ? 'bg-[#09090B] text-white shadow-xs' : 'text-zinc-600'
            }`}
          >
            💳 Socio
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileSection('cinturon');
              setActiveTab('entrenamiento');
            }}
            className={`py-2 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              mobileSection === 'cinturon' ? 'bg-[#09090B] text-white shadow-xs' : 'text-zinc-600'
            }`}
          >
            🏆 Cinturón
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileSection('fut');
              setActiveTab('entrenamiento');
            }}
            className={`py-2 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              mobileSection === 'fut' ? 'bg-[#09090B] text-white shadow-xs' : 'text-zinc-600'
            }`}
          >
            ⚡ Carta FUT
          </button>
        </div>

        {/* Radix / Shadcn Tabs Selector (Escritorio) */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="hidden md:block w-auto">
          <TabsList className="bg-zinc-200/70 border border-[#E4E4E7]">
            <TabsTrigger value="academia">Mi Academia</TabsTrigger>
            <TabsTrigger value="entrenamiento">Ficha & Progresión</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'academia' ? (
        <>
          {/* ======================================================== */}
          {/* 2. BENTO GRID: PRÓXIMAS CLASES & RADAR DE SOCIO           */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            {/* Bento Card 1: Próximas Clases & Check-In */}
            <Card
              className={`${
                mobileSection === 'hoy' ? 'flex' : 'hidden md:flex'
              } lg:col-span-7 flex-col justify-between overflow-hidden relative group bg-white shadow-card hover:shadow-card-hover transition-all border-[#E4E4E7]`}
            >
              <CardHeader className="border-b border-[#E4E4E7] pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-accent" />
                    <CardTitle className="text-xs sm:text-sm font-bold text-[#09090B]">Próximas Sesiones de Tatami</CardTitle>
                  </div>
                  <Link
                    to="/app/horario"
                    className="text-xs font-semibold text-zinc-500 hover:text-[#09090B] transition flex items-center gap-0.5"
                  >
                    <span>Ver Horario</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="pt-4 sm:pt-5 space-y-3.5 sm:space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    {isClassActive ? (
                      <Badge variant="destructive" className="gap-1.5 py-0.5 px-2.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                        </span>
                        <span>En curso ahora</span>
                      </Badge>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#FFE4E6] text-[#9F1239] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                        Próxima clase hoy
                      </span>
                    )}
                    <span className="text-xs text-zinc-500 font-medium">
                      {displayClass?.room || 'Tatami Principal'}
                    </span>
                  </div>

                  <div className="font-headline text-2xl sm:text-4xl text-[#09090B] tracking-tight">
                    {displayClass ? `${displayClass.startTime} – ${displayClass.endTime}` : '19:30 – 21:00'}
                  </div>

                  <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs font-bold text-[#09090B]">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-accent shrink-0" />
                    <span>{displayClass?.program || 'BJJ Gi & Grappling'}</span>
                    <span className="text-zinc-300">•</span>
                    <span className="text-zinc-500 font-normal">
                      Prof. {displayClass?.professor || 'Mario Rodríguez'}
                    </span>
                  </div>
                </div>

                <div className="pt-1 sm:pt-2 flex flex-wrap gap-2">
                  {role === 'admin' ? (
                    <Button asChild variant="studio" size="sm">
                      <Link to="/admin/asistencia">
                        <span>Gestionar Asistencia Tatami</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="studio"
                      size="sm"
                      onClick={() => setShowQrModal(true)}
                      className="gap-2 shadow-card cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Ver Pase Check-In (QR)</span>
                    </Button>
                  )}

                  <Button asChild variant="outline" size="sm">
                    <Link to="/app/horario">
                      <span>Ver Calendario Semanal</span>
                    </Link>
                  </Button>
                </div>

                {/* Sesiones adicionales estrictamente filtradas por el día de hoy */}
                <div className="border-t border-[#E4E4E7] pt-2.5 sm:pt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Otras sesiones programadas hoy:
                  </span>
                  {todayOtherSchedules.length > 0 ? (
                    todayOtherSchedules.slice(0, 3).map((s) => (
                      <Link
                        key={s.id}
                        to="/app/horario"
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-xl hover:bg-zinc-50 transition border border-transparent hover:border-[#E4E4E7]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-zinc-300" />
                          <span className="font-bold text-[#09090B]">{s.program}</span>
                        </div>
                        <span className="font-mono text-zinc-500 text-[11px]">
                          {s.startTime} - {s.endTime}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-400 italic py-1 px-2">
                      No hay más clases programadas para hoy.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bento Card 2: Estado del Atleta & Accesos Rápidos */}
            <Card
              className={`${
                mobileSection === 'socio' ? 'flex' : 'hidden md:flex'
              } lg:col-span-5 flex-col justify-between shadow-card hover:shadow-card-hover transition-all border-[#E4E4E7] bg-white`}
            >
              <CardHeader className="border-b border-[#E4E4E7] pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#09090B]" />
                    <CardTitle className="text-xs sm:text-sm font-bold text-[#09090B]">Panel del Socio</CardTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {userData.pricingTier || 'STD'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 sm:pt-5 space-y-2.5 sm:space-y-3.5">
                {/* Estado de cuota */}
                <Link
                  to="/app/programas"
                  className="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-zinc-50 border border-[#E4E4E7] transition-all shadow-subtle group"
                >
                  <div>
                    <span className="text-xs font-bold text-[#09090B] block group-hover:text-brand-accent transition">
                      Cuota Mensual
                    </span>
                    <span className="text-[11px] text-zinc-500 font-normal">
                      Membresía oficial 247Studio
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={derivedStatus === 'OK' ? 'success' : 'warning'}>
                      {derivedStatus === 'OK' ? 'Al día' : 'Pendiente'}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#09090B] transition" />
                  </div>
                </Link>

                {/* Asistencias acumuladas del mes en curso */}
                <Link
                  to="/app/historial"
                  className="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-zinc-50 border border-[#E4E4E7] transition-all shadow-subtle group"
                >
                  <div>
                    <span className="text-xs font-bold text-[#09090B] block group-hover:text-brand-accent transition">
                      Horas de Tatami Este Mes
                    </span>
                    <span className="text-[11px] text-zinc-500 font-normal">
                      Entrenamientos y sparrings
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-sm text-[#09090B] bg-[#F4F4F5] px-2 py-0.5 rounded-lg border border-[#E4E4E7]">
                      {monthAttendedCount} {monthAttendedCount === 1 ? 'clase' : 'clases'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#09090B] transition" />
                  </div>
                </Link>

                {/* Avisos */}
                <Link
                  to="/app/avisos"
                  className="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-zinc-50 border border-[#E4E4E7] transition-all shadow-subtle group"
                >
                  <div>
                    <span className="text-xs font-bold text-[#09090B] block group-hover:text-brand-accent transition">
                      Tablón de Anuncios
                    </span>
                    <span className="text-[11px] text-zinc-500 font-normal">
                      Comunicaciones de Mario & David
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default" className="text-[10px]">
                      3 nuevos
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#09090B] transition" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* ======================================================== */}
          {/* 3. FILA BENTO GRID: MÉTRICAS Y COMUNIDAD (Escritorio)    */}
          {/* ======================================================== */}
          <div className="hidden md:grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="hover:border-zinc-300 transition-all shadow-subtle hover:shadow-card bg-white border-[#E4E4E7]">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  Horario Semanal Activo
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-[#09090B]">14 Clases</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-[11px] text-zinc-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sesiones de Gi, No-Gi & Kids
                </span>
              </CardContent>
            </Card>

            <Card className="hover:border-zinc-300 transition-all shadow-subtle hover:shadow-card bg-white border-[#E4E4E7]">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  Comunidad de Tatami
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-[#09090B]">48 Atletas</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-[11px] text-zinc-600 font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#09090B]" /> Compañeros activos en Pinto
                </span>
              </CardContent>
            </Card>

            <Card className="hover:border-zinc-300 transition-all shadow-subtle hover:shadow-card bg-white border-[#E4E4E7]">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  Racha y Progresión
                </CardDescription>
                <CardTitle className="text-2xl font-mono flex items-center gap-1.5 text-brand-accent">
                  <Flame className="w-6 h-6 fill-brand-accent text-brand-accent" />
                  <span>+25 XP / Clase</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-[11px] text-zinc-600 font-bold">
                  Suma horas para tu próximo grado
                </span>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Pestaña de Entrenamiento: Ficha de Atleta, Gamificación y Atributos */
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200">
          <div className={mobileSection === 'cinturon' ? 'block' : 'hidden md:block'}>
            <BeltProgressionCard user={userData} bookings={bookings} />
          </div>
          <div className={mobileSection === 'fut' ? 'block' : 'hidden md:block'}>
            <Suspense
              fallback={
                <div className="h-64 flex items-center justify-center text-slate-400 bg-white/50 rounded-3xl border border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider animate-pulse">
                    Cargando ficha de atleta...
                  </span>
                </div>
              }
            >
              <FighterCard user={userData} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Radix Dialog: Modal Pase QR */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-xs p-0 border-0 bg-transparent shadow-none">
          {userData && <QrCodePassCard user={userData} onClose={() => setShowQrModal(false)} />}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
