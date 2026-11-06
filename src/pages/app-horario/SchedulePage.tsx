import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Filter,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { canCancel, getMadridTimeComponents, isClassInProgress } from '@/shared/domain/schedule';
import {
  BookingDomainModel,
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
} from '@/shared/domain/types';

const PROGRAM_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  GI: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  GRAPPLING: { bg: 'bg-studio-red/20', text: 'text-studio-red', border: 'border-studio-red/40' },
  MMA: { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  LUCHA: { bg: 'bg-emerald-600/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  'KIDS 1': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  'KIDS 2': { bg: 'bg-amber-600/20', text: 'text-amber-400', border: 'border-amber-600/40' },
  'BJJ FEM': { bg: 'bg-pink-600/20', text: 'text-pink-400', border: 'border-pink-500/40' },
  'COMP CLAS.': { bg: 'bg-red-700/25', text: 'text-red-400', border: 'border-red-600/50' },
  'GI SPARRING': { bg: 'bg-cyan-600/20', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  'OPEN MAT': { bg: 'bg-studio-cream/20', text: 'text-studio-cream', border: 'border-studio-cream/40' },
};

export const SchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDomainModel[]>([]);
  const [myBookings, setMyBookings] = useState<BookingDomainModel[]>([]);
  const [allDateBookings, setAllDateBookings] = useState<BookingDomainModel[]>([]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(1); // 1 = Lunes
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('TODAS');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const now = new Date();
  const madridNow = getMadridTimeComponents(now);

  const daysHeader = [
    { num: 1, label: 'Lunes', short: 'L' },
    { num: 2, label: 'Martes', short: 'M' },
    { num: 3, label: 'Miércoles', short: 'X' },
    { num: 4, label: 'Jueves', short: 'J' },
    { num: 5, label: 'Viernes', short: 'V' },
  ];

  // Calcular la fecha YYYY-MM-DD para el día seleccionado de la semana en curso
  const getTargetDateForDayOfWeek = (targetDay: number): string => {
    const currentDay = madridNow.dayOfWeek; // 1..7
    const diff = targetDay - currentDay;
    const targetMs = now.getTime() + diff * 24 * 60 * 60 * 1000;
    const targetComponents = getMadridTimeComponents(new Date(targetMs));
    return targetComponents.dateStr;
  };

  const selectedDateStr = getTargetDateForDayOfWeek(selectedDayOfWeek);

  const fetchScheduleData = async () => {
    try {
      // 1. Obtener schedules activos
      const schedQuery = query(collection(db, 'schedules'), where('active', '==', true));
      const schedSnap = await getDocs(schedQuery);
      const sList: ScheduleDomainModel[] = [];
      schedSnap.forEach((d) => sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
      setSchedules(sList);

      // 2. Obtener excepciones
      const excSnap = await getDocs(collection(db, 'scheduleExceptions'));
      const eList: ScheduleExceptionDomainModel[] = [];
      excSnap.forEach((d) => eList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) }));
      setExceptions(eList);

      // 3. Obtener mis reservas
      if (user) {
        const bQuery = query(collection(db, 'bookings'), where('uid', '==', user.uid));
        const bSnap = await getDocs(bQuery);
        const bList: BookingDomainModel[] = [];
        bSnap.forEach((d) => bList.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
        setMyBookings(bList);
      }

      // 4. Obtener bookings globales para conteo de aforo
      const allBQuery = query(collection(db, 'bookings'), where('date', '==', selectedDateStr));
      const allBSnap = await getDocs(allBQuery);
      const allBList: BookingDomainModel[] = [];
      allBSnap.forEach((d) => allBList.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
      setAllDateBookings(allBList);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Si hoy es fin de semana (Sáb/Dom), posicionar en Lunes; de lo contrario en el día de hoy
    if (madridNow.dayOfWeek >= 1 && madridNow.dayOfWeek <= 5) {
      setSelectedDayOfWeek(madridNow.dayOfWeek);
    } else {
      setSelectedDayOfWeek(1);
    }
  }, []);

  useEffect(() => {
    fetchScheduleData();
  }, [selectedDayOfWeek, user]);

  const handleBookClass = async (schedule: ScheduleDomainModel) => {
    if (!user) return;
    setActionLoading(schedule.id);
    setMessage(null);

    try {
      const bookingId = `bk_${user.uid}_${schedule.id}_${selectedDateStr}`;

      // Comprobar aforo orientativo
      const activeBookingsForClass = allDateBookings.filter(
        (b) => b.scheduleId === schedule.id && (b.status === 'BOOKED' || b.status === 'ATTENDED')
      );
      const capacity = schedule.capacity || 24;
      const isWaitlist = activeBookingsForClass.length >= capacity;

      await setDoc(doc(db, 'bookings', bookingId), {
        uid: user.uid,
        scheduleId: schedule.id,
        date: selectedDateStr,
        status: isWaitlist ? 'WAITLISTED' : 'BOOKED',
        sessionType: 'PARTICIPANT',
        attendanceWeight: 1.0,
        checkInSource: 'APP',
        createdAt: serverTimestamp(),
      });

      setMessage({
        text: isWaitlist
          ? 'Clase completa. Has sido añadido a la LISTA DE ESPERA.'
          : '¡Plaza reservada con éxito!',
        type: 'success',
      });

      await fetchScheduleData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error al realizar la reserva.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async (booking: BookingDomainModel, schedule: ScheduleDomainModel) => {
    setActionLoading(schedule.id);
    setMessage(null);

    try {
      const allowed = canCancel(booking, schedule, 2, new Date());
      if (!allowed) {
        throw new Error('El plazo de cancelación anticipada (2 horas antes) ha vencido.');
      }

      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp(),
      });

      setMessage({ text: 'Reserva cancelada correctamente.', type: 'success' });
      await fetchScheduleData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'No se pudo cancelar la reserva.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Filtrado de clases
  const daySchedules = schedules.filter((s) => {
    const matchDay = s.dayOfWeek === selectedDayOfWeek;
    const matchDiscipline =
      selectedDiscipline === 'TODAS' ||
      s.program.toUpperCase().includes(selectedDiscipline.toUpperCase());
    return matchDay && matchDiscipline;
  });

  // Lista única de disciplinas para el filtro
  const disciplines = ['TODAS', 'GI', 'GRAPPLING', 'MMA', 'LUCHA', 'KIDS', 'BJJ FEM', 'OPEN MAT'];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-white">Horarios y Reservas</h1>
          <p className="text-xs text-studio-cream/70 mt-0.5">
            Semana activa • Franjas oficiales 247Studio BJJ
          </p>
        </div>

        {/* Filtro por disciplina estilo MatGoat */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <Filter className="w-3.5 h-3.5 text-studio-cream/60 shrink-0" />
          {disciplines.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDiscipline(d)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 transition ${
                selectedDiscipline === d
                  ? 'bg-studio-red text-white shadow'
                  : 'bg-white/5 text-studio-cream/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de Días L-V (Mobile First) */}
      <div className="grid grid-cols-5 gap-2 bg-studio-navy-light/90 p-2 rounded-2xl border border-white/10 shadow-lg">
        {daysHeader.map((d) => {
          const isSelected = selectedDayOfWeek === d.num;
          const isToday = madridNow.dayOfWeek === d.num;
          return (
            <button
              key={d.num}
              onClick={() => setSelectedDayOfWeek(d.num)}
              className={`py-3 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                isSelected
                  ? 'bg-studio-red text-white shadow-lg shadow-studio-red/30 scale-[1.02]'
                  : 'text-studio-cream/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">{d.short}</span>
              <span className="text-xs sm:text-sm font-black mt-0.5">{d.label.slice(0, 3)}</span>
              {isToday && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    isSelected ? 'bg-white' : 'bg-studio-red'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-studio-red/15 border-studio-red/30 text-studio-red'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Lista de Clases del Día */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : daySchedules.length === 0 ? (
        <div className="text-center py-12 bg-studio-navy-light/50 border border-white/5 rounded-3xl p-8">
          <Calendar className="w-10 h-10 text-studio-cream/40 mx-auto mb-2" />
          <p className="text-sm font-bold text-white">No hay clases programadas para este filtro.</p>
          <p className="text-xs text-studio-cream/60 mt-1">Selecciona otro día o restablece las disciplinas.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {daySchedules
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((schedule) => {
              const theme = PROGRAM_THEMES[schedule.program] || {
                bg: 'bg-white/10',
                text: 'text-white',
                border: 'border-white/20',
              };

              const inProgress = isClassInProgress(schedule, exceptions, now);
              const isException = exceptions.some(
                (e) => e.scheduleId === schedule.id && e.date === selectedDateStr
              );

              // Mi reserva activa para esta clase
              const myBooking = myBookings.find(
                (b) =>
                  b.scheduleId === schedule.id &&
                  b.date === selectedDateStr &&
                  (b.status === 'BOOKED' || b.status === 'WAITLISTED')
              );

              // Conteo de asistentes activos
              const currentAttendees = allDateBookings.filter(
                (b) => b.scheduleId === schedule.id && (b.status === 'BOOKED' || b.status === 'ATTENDED')
              ).length;
              const capacity = schedule.capacity || 24;
              const isFull = currentAttendees >= capacity;

              return (
                <div
                  key={schedule.id}
                  className={`bg-studio-navy-light/90 border rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm transition-all duration-200 ${
                    inProgress
                      ? 'border-emerald-500 shadow-emerald-500/10'
                      : myBooking
                      ? 'border-studio-red shadow-studio-red/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Detalles de la clase */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-studio-navy border border-white/10 text-center shrink-0 min-w-[70px]">
                        <span className="text-xs font-black text-white block">{schedule.startTime}</span>
                        <span className="text-[10px] text-studio-cream/60 block">{schedule.endTime}</span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${theme.bg} ${theme.text} ${theme.border}`}
                          >
                            {schedule.program}
                          </span>

                          {inProgress && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              Clase en Curso
                            </span>
                          )}

                          {isException && (
                            <span className="px-2 py-0.5 rounded-full bg-studio-red/20 text-studio-red border border-studio-red/40 text-[10px] font-black uppercase tracking-wider">
                              Cancelada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-studio-cream/80">
                          <span className="flex items-center gap-1 font-semibold text-white">
                            <User className="w-3.5 h-3.5 text-studio-red" /> Prof. {schedule.professor}
                          </span>

                          <span className="flex items-center gap-1 text-[11px] text-studio-cream/70">
                            <Users className="w-3.5 h-3.5" />
                            {currentAttendees} / {capacity} plazas
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones de Reserva / Cancelación */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                      {isException ? (
                        <span className="text-xs font-bold text-studio-red">Clase no disponible</span>
                      ) : myBooking ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4" />
                            {myBooking.status === 'WAITLISTED' ? 'En Lista de Espera' : 'Plaza Reservada'}
                          </span>

                          <button
                            onClick={() => handleCancelBooking(myBooking, schedule)}
                            disabled={actionLoading === schedule.id}
                            className="p-2 rounded-xl bg-studio-red/10 hover:bg-studio-red/20 text-studio-red border border-studio-red/30 text-xs font-bold transition"
                            title="Cancelar mi reserva"
                          >
                            {actionLoading === schedule.id ? (
                              <div className="w-4 h-4 border-2 border-studio-red border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBookClass(schedule)}
                          disabled={actionLoading === schedule.id}
                          className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition shadow flex items-center gap-1.5 ${
                            isFull
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-studio-red hover:bg-studio-red-dark text-white shadow-studio-red/20'
                          }`}
                        >
                          {actionLoading === schedule.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : isFull ? (
                            <>
                              <Clock className="w-3.5 h-3.5" /> Lista de Espera
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Reservar Clase
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
