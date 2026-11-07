import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  increment,
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
import { DEFAULT_OFFICIAL_SCHEDULES, canCancel, getMadridTimeComponents, isClassInProgress } from '@/shared/domain/schedule';
import {
  BookingDomainModel,
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
} from '@/shared/domain/types';

const PROGRAM_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  GI: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  GRAPPLING: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  MMA: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  LUCHA: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'KIDS 1': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'KIDS 2': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'BJJ FEM': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  'COMP CLAS.': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'GI SPARRING': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'OPEN MAT': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
};

export const SchedulePage: React.FC = () => {
  const { user, role } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDomainModel[]>([]);
  const [myBookings, setMyBookings] = useState<BookingDomainModel[]>([]);
  const [classCapacities, setClassCapacities] = useState<Record<string, { bookedCount: number; waitlistCount: number }>>({});
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(1);
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

  const getTargetDateForDayOfWeek = (targetDay: number): string => {
    const currentDay = madridNow.dayOfWeek;
    const diff = targetDay - currentDay;
    const targetMs = now.getTime() + diff * 24 * 60 * 60 * 1000;
    const targetComponents = getMadridTimeComponents(new Date(targetMs));
    return targetComponents.dateStr;
  };

  const selectedDateStr = getTargetDateForDayOfWeek(selectedDayOfWeek);

  const fetchScheduleData = async () => {
    try {
      const schedQuery = query(collection(db, 'schedules'), where('active', '==', true));
      const excQuery = collection(db, 'scheduleExceptions');
      const bQuery = user
        ? query(
            collection(db, 'bookings'),
            where('uid', '==', user.uid),
            where('date', '==', selectedDateStr)
          )
        : null;
      const capQuery = query(collection(db, 'class_capacity'), where('date', '==', selectedDateStr));

      const [schedSnap, excSnap, bSnap, capSnap] = await Promise.all([
        getDocs(schedQuery),
        getDocs(excQuery),
        bQuery ? getDocs(bQuery) : Promise.resolve(null),
        getDocs(capQuery),
      ]);

      const sList: ScheduleDomainModel[] = [];
      schedSnap.forEach((d) => sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
      setSchedules(sList.length > 0 ? sList : DEFAULT_OFFICIAL_SCHEDULES);

      const eList: ScheduleExceptionDomainModel[] = [];
      excSnap.forEach((d) => eList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) }));
      setExceptions(eList);

      if (bSnap) {
        const bList: BookingDomainModel[] = [];
        bSnap.forEach((d) => bList.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
        setMyBookings(bList);
      } else {
        setMyBookings([]);
      }

      const capMap: Record<string, { bookedCount: number; waitlistCount: number }> = {};
      capSnap.forEach((d) => {
        const data = d.data();
        capMap[data.scheduleId] = {
          bookedCount: Number(data.bookedCount || 0),
          waitlistCount: Number(data.waitlistCount || 0),
        };
      });
      setClassCapacities(capMap);
    } catch (err) {
      console.error('Error fetching schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [user, selectedDateStr]);

  const handleBookClass = async (schedule: ScheduleDomainModel) => {
    if (!user) return;
    setActionLoading(schedule.id);
    setMessage(null);

    try {
      const inProgress = isClassInProgress(schedule, exceptions, now);
      if (inProgress) {
        throw new Error('La clase ya está en curso o finalizada.');
      }

      const capData = classCapacities[schedule.id] || { bookedCount: 0, waitlistCount: 0 };
      const currentAttendees = capData.bookedCount;
      const capacity = schedule.capacity || 24;
      const isFull = currentAttendees >= capacity;

      const bookingId = `${schedule.id}_${selectedDateStr}_${user.uid}`;
      const status = isFull ? 'WAITLISTED' : 'BOOKED';

      await setDoc(doc(db, 'bookings', bookingId), {
        uid: user.uid,
        scheduleId: schedule.id,
        date: selectedDateStr,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const capDocId = `${schedule.id}_${selectedDateStr}`;
      await setDoc(
        doc(db, 'class_capacity', capDocId),
        {
          scheduleId: schedule.id,
          date: selectedDateStr,
          bookedCount: isFull ? increment(0) : increment(1),
          waitlistCount: isFull ? increment(1) : increment(0),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage({
        text: isFull
          ? 'Aforo completo. Te hemos añadido a la lista de espera.'
          : '¡Plaza reservada con éxito!',
        type: 'success',
      });

      await fetchScheduleData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'No se pudo realizar la reserva.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async (booking: BookingDomainModel, schedule: ScheduleDomainModel) => {
    if (!user) return;
    setActionLoading(schedule.id);
    setMessage(null);

    try {
      const allowed = canCancel(booking, schedule, 2, now, role === 'admin');
      if (!allowed) {
        throw new Error('No es posible cancelar con menos de 2 horas de antelación.');
      }

      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const capDocId = `${schedule.id}_${selectedDateStr}`;
      if (booking.status === 'BOOKED') {
        await setDoc(
          doc(db, 'class_capacity', capDocId),
          {
            scheduleId: schedule.id,
            date: selectedDateStr,
            bookedCount: increment(-1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else if (booking.status === 'WAITLISTED') {
        await setDoc(
          doc(db, 'class_capacity', capDocId),
          {
            scheduleId: schedule.id,
            date: selectedDateStr,
            waitlistCount: increment(-1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

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

  const daySchedules = schedules.filter((s) => {
    const matchDay = s.dayOfWeek === selectedDayOfWeek;
    const matchDiscipline =
      selectedDiscipline === 'TODAS' ||
      s.program.toUpperCase().includes(selectedDiscipline.toUpperCase());
    return matchDay && matchDiscipline;
  });

  const disciplines = ['TODAS', 'GI', 'GRAPPLING', 'MMA', 'LUCHA', 'KIDS', 'BJJ FEM', 'OPEN MAT'];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header MatGoat Clean */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Horarios & Reservas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Semana activa • Franjas oficiales 247Studio Pinto
          </p>
        </div>

        {/* Filtro por disciplina estilo MatGoat */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {disciplines.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDiscipline(d)}
              aria-pressed={selectedDiscipline === d}
              aria-label={`Filtrar por disciplina ${d}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                selectedDiscipline === d
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de Días L-V estilo MatGoat */}
      <div className="grid grid-cols-5 gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
        {daysHeader.map((d) => {
          const isSelected = selectedDayOfWeek === d.num;
          const isToday = madridNow.dayOfWeek === d.num;
          return (
            <button
              key={d.num}
              type="button"
              onClick={() => setSelectedDayOfWeek(d.num)}
              aria-pressed={isSelected}
              aria-label={`Ver horario del ${d.label}${isToday ? ' (Hoy)' : ''}`}
              className={`py-3 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">{d.short}</span>
              <span className="text-xs sm:text-sm font-bold mt-0.5">{d.label.slice(0, 3)}</span>
              {isToday && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    isSelected ? 'bg-white' : 'bg-emerald-500'
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
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Lista de Clases del Día (con Skeletons anti-CLS) */}
      {loading ? (
        <div className="space-y-4" role="status" aria-label="Cargando horarios de tatami...">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm animate-pulse"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-[75px] h-[58px] rounded-xl bg-slate-100 shrink-0" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-5 rounded-lg bg-slate-200" />
                      <div className="w-16 h-4 rounded-full bg-slate-100" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-4 rounded bg-slate-100" />
                      <div className="w-24 h-3.5 rounded bg-slate-100" />
                    </div>
                  </div>
                </div>
                <div className="w-28 h-9 rounded-xl bg-slate-100 shrink-0 self-end sm:self-auto" />
              </div>
            </div>
          ))}
          <span className="sr-only">Cargando parrilla de clases...</span>
        </div>
      ) : daySchedules.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-900">No hay clases programadas para este filtro.</p>
          <p className="text-xs text-slate-500 mt-1">Selecciona otro día o pulsa 'TODAS' en el filtro superior.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {daySchedules
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((schedule) => {
              const theme = PROGRAM_THEMES[schedule.program] || {
                bg: 'bg-slate-100',
                text: 'text-slate-800',
                border: 'border-slate-200',
              };

              const inProgress = isClassInProgress(schedule, exceptions, now);
              const isException = exceptions.some(
                (e) => e.scheduleId === schedule.id && e.date === selectedDateStr
              );

              const myBooking = myBookings.find(
                (b) =>
                  b.scheduleId === schedule.id &&
                  b.date === selectedDateStr &&
                  (b.status === 'BOOKED' || b.status === 'WAITLISTED')
              );

              const capData = classCapacities[schedule.id] || { bookedCount: 0, waitlistCount: 0 };
              const currentAttendees = capData.bookedCount;
              const capacity = schedule.capacity || 24;
              const isFull = currentAttendees >= capacity;

              return (
                <div
                  key={schedule.id}
                  className={`bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${
                    inProgress
                      ? 'border-emerald-300 ring-1 ring-emerald-200'
                      : myBooking
                      ? 'border-slate-400'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Detalles de la clase */}
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center shrink-0 min-w-[75px]">
                        <span className="text-sm font-bold text-slate-900 block font-mono">{schedule.startTime}</span>
                        <span className="text-[11px] text-slate-400 block font-mono">{schedule.endTime}</span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${theme.bg} ${theme.text} ${theme.border}`}
                          >
                            {schedule.program}
                          </span>

                          {inProgress && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              Clase en Curso
                            </span>
                          )}

                          {isException && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                              Cancelada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span className="flex items-center gap-1 font-semibold text-slate-800">
                            <User className="w-3.5 h-3.5 text-slate-400" /> Prof. {schedule.professor}
                          </span>

                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Users className="w-3.5 h-3.5" />
                            {currentAttendees} / {capacity} plazas ocupadas
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones de Reserva / Cancelación */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                      {isException ? (
                        <span className="text-xs font-bold text-red-600">Clase no disponible</span>
                      ) : myBooking ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-600" />
                            {myBooking.status === 'WAITLISTED' ? 'En Lista de Espera' : 'Plaza Reservada'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCancelBooking(myBooking, schedule)}
                            disabled={actionLoading === schedule.id}
                            aria-label={`Cancelar mi reserva para ${schedule.program} a las ${schedule.startTime}`}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition cursor-pointer"
                            title="Cancelar mi reserva"
                          >
                            {actionLoading === schedule.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBookClass(schedule)}
                          disabled={actionLoading === schedule.id}
                          className={`py-2 px-4 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 ${
                            isFull
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {actionLoading === schedule.id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isFull ? (
                            <>
                              <Clock className="w-3.5 h-3.5" /> Lista de Espera
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Reservar Clase
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