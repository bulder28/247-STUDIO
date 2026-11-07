import React, { useEffect, useState } from 'react';
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
import { FighterCard } from '@/widgets/FighterCard';
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
      <div className="py-24 flex justify-center items-center">
        <div className="w-9 h-9 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const nextClassInfo = getNextClass(schedules, exceptions, now);
  const activeClass = schedules.find((s) => isClassInProgress(s, exceptions, now));

  const displayClass = activeClass || nextClassInfo?.schedule || schedules[0];
  const isClassActive = !!activeClass;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-10"
    >
      {/* ======================================================== */}
      {/* 1. ENCABEZADO CON SHADCN / ATHLETIC TYPOGRAPHY          */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {getGreeting()}, {userData.alias}
            </h1>
            <span className="text-xl">🥋</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            247Studio · Academia de Brazilian Jiu-Jitsu en Pinto (Madrid)
          </p>
        </div>

        {/* Radix / Shadcn Tabs Selector */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
          <TabsList className="bg-slate-100 border border-slate-200/80">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Bento Card 1: Próximas Clases & Check-In */}
            <Card className="lg:col-span-7 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-red-500/5 to-transparent pointer-events-none rounded-full blur-2xl" />

              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-studio-red" />
                    <CardTitle className="text-sm">Próximas Sesiones de Tatami</CardTitle>
                  </div>
                  <Link
                    to="/app/horario"
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 transition flex items-center gap-0.5"
                  >
                    <span>Ver Horario</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={isClassActive ? 'destructive' : 'secondary'}>
                      {isClassActive ? '● En curso ahora' : 'Próxima clase de hoy'}
                    </Badge>
                    <span className="text-xs text-slate-500 font-medium">
                      {displayClass?.room || 'Tatami Principal'}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {displayClass ? `${displayClass.startTime} – ${displayClass.endTime}` : '19:30 – 21:00'}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{displayClass?.program || 'BJJ Gi & Grappling'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-normal">
                      Prof. {displayClass?.professor || 'Mario Rodríguez'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2.5">
                  {role === 'admin' ? (
                    <Button asChild variant="studio">
                      <Link to="/admin/asistencia">
                        <span>Gestionar Asistencia Tatami</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="studio"
                      onClick={() => setShowQrModal(true)}
                      className="gap-1.5"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Ver Pase Check-In (QR)</span>
                    </Button>
                  )}

                  <Button asChild variant="outline">
                    <Link to="/app/horario">
                      <span>Ver Calendario Semanal</span>
                    </Link>
                  </Button>
                </div>

                {/* Sesiones adicionales */}
                <div className="border-t border-slate-100 pt-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Otras sesiones programadas hoy:
                  </span>
                  {schedules.slice(1, 3).map((s) => (
                    <Link
                      key={s.id}
                      to="/app/horario"
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200/60"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="font-bold text-slate-900">{s.program}</span>
                      </div>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {s.startTime} - {s.endTime}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bento Card 2: Estado del Atleta & Accesos Rápidos */}
            <Card className="lg:col-span-5 flex flex-col justify-between">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-700" />
                    <CardTitle className="text-sm">Panel del Socio</CardTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {userData.pricingTier || 'STD'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                {/* Estado de cuota */}
                <Link
                  to="/app/programas"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/60 transition group"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-studio-red transition">
                      Cuota Mensual
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Membresía oficial 247Studio
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={derivedStatus === 'OK' ? 'success' : 'warning'}>
                      {derivedStatus === 'OK' ? 'Al día' : 'Pendiente'}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
                  </div>
                </Link>

                {/* Asistencias acumuladas */}
                <Link
                  to="/app/historial"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/60 transition group"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-studio-red transition">
                      Horas de Tatami Este Mes
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Entrenamientos y sparrings
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-sm text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {bookings.length} clases
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
                  </div>
                </Link>

                {/* Avisos */}
                <Link
                  to="/app/avisos"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/60 transition group"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-studio-red transition">
                      Tablón de Anuncios
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Comunicaciones de Mario & David
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default" className="text-[10px]">
                      3 nuevos
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* ======================================================== */}
          {/* 3. FILA BENTO GRID: MÉTRICAS Y COMUNIDAD                 */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="hover:border-slate-300 transition-all">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Horario Semanal Activo
                </CardDescription>
                <CardTitle className="text-2xl font-mono">14 Clases</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sesiones de Gi, No-Gi & Kids
                </span>
              </CardContent>
            </Card>

            <Card className="hover:border-slate-300 transition-all">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Comunidad de Tatami
                </CardDescription>
                <CardTitle className="text-2xl font-mono">48 Atletas</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Compañeros activos en Pinto
                </span>
              </CardContent>
            </Card>

            <Card className="hover:border-slate-300 transition-all">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Racha y Progresión
                </CardDescription>
                <CardTitle className="text-2xl font-mono flex items-center gap-1.5 text-amber-600">
                  <Flame className="w-6 h-6 fill-amber-500 text-amber-600" />
                  <span>+25 XP / Clase</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-[11px] text-amber-700 font-bold">
                  Suma horas para tu próximo grado
                </span>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Pestaña de Entrenamiento: Ficha de Atleta, Gamificación y Atributos */
        <div className="space-y-6 animate-in fade-in duration-200">
          <BeltProgressionCard user={userData} bookings={bookings} />
          <FighterCard user={userData} />
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
