import React, { useEffect, useMemo, useState } from 'react';
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
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Moon,
  QrCode,
  Sparkles,
  Sun,
  Sunrise,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import {
  calculateScheduleDurationMinutes,
  canCancel,
  DEFAULT_OFFICIAL_SCHEDULES,
  getMadridTimeComponents,
  getProgramTheme,
  isClassInProgress,
} from '@/shared/domain/schedule';
import {
  BookingDomainModel,
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
} from '@/shared/domain/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';

type CalendarViewMode = 'DAY' | 'WEEK' | 'MONTH';
type TimeBandFilter = 'ALL' | 'MORNING' | 'AFTERNOON' | 'NIGHT';

function getScheduleTimeBand(startTime: string): 'MORNING' | 'AFTERNOON' | 'NIGHT' {
  const hour = parseInt(startTime.split(':')[0] || '0', 10);
  if (hour < 14) return 'MORNING';
  if (hour < 19) return 'AFTERNOON';
  return 'NIGHT';
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_HEADERS = [
  { num: 1, label: 'Lunes', short: 'LUN', letter: 'L' },
  { num: 2, label: 'Martes', short: 'MAR', letter: 'M' },
  { num: 3, label: 'Miércoles', short: 'MIÉ', letter: 'X' },
  { num: 4, label: 'Jueves', short: 'JUE', letter: 'J' },
  { num: 5, label: 'Viernes', short: 'VIE', letter: 'V' },
  { num: 6, label: 'Sábado', short: 'SÁB', letter: 'S' },
  { num: 7, label: 'Domingo', short: 'DOM', letter: 'D' },
];

function formatDateYMD(year: number, monthIndex0: number, day: number): string {
  const y = String(year);
  const m = String(monthIndex0 + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYMD(dateStr: string): { year: number; month0: number; day: number; dayOfWeek: number } {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const jsDay = dt.getUTCDay(); // 0=Sun..6=Sat
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;
  return { year: y, month0: m - 1, day: d, dayOfWeek };
}

function addDaysYMD(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return formatDateYMD(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

function getMondayOfWeek(dateStr: string): string {
  const { dayOfWeek } = parseYMD(dateStr);
  return addDaysYMD(dateStr, -(dayOfWeek - 1));
}

function formatReadableDateEs(dateStr: string): string {
  const { year, month0, day, dayOfWeek } = parseYMD(dateStr);
  const dayName = WEEKDAY_HEADERS.find((w) => w.num === dayOfWeek)?.label || '';
  return `${dayName}, ${day} de ${MONTH_NAMES_ES[month0]} ${year}`;
}

export const SchedulePage: React.FC = () => {
  const { user, role, userData } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDomainModel[]>([]);
  const [myBookings, setMyBookings] = useState<BookingDomainModel[]>([]);
  const [classCapacities, setClassCapacities] = useState<
    Record<string, { bookedCount: number; waitlistCount: number }>
  >({});

  const now = new Date();
  const madridNow = getMadridTimeComponents(now);
  const todayStr = madridNow.dateStr;

  // Vista activa: en escritorio prioriza SEMANA para aprovechar la parrilla visual; en móvil prioriza DÍA estilo Madrid Móvil
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return 'WEEK';
    }
    return 'DAY';
  });

  // Fecha activa seleccionada (YYYY-MM-DD)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return todayStr;
  });

  // Mes visible para la vista mensual (año y mes 0-11)
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month0: number }>(() => {
    const parsed = parseYMD(todayStr);
    return { year: parsed.year, month0: parsed.month0 };
  });

  // Filtros REA (Recursos, Eventos y Agentes) + Franja Horaria estilo Madrid Móvil
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('TODAS');
  const [selectedProfessor, setSelectedProfessor] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedTimeBand, setSelectedTimeBand] = useState<TimeBandFilter>('ALL');
  const [onlyMyBookings, setOnlyMyBookings] = useState<boolean>(false);

  // Modal de Resguardo QR de Acceso (Estilo Madrid Móvil)
  const [showQrPassModal, setShowQrPassModal] = useState<boolean>(false);

  // Estado de carga y feedback
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal de Ficha Rápida REA (al pulsar sobre una clase en vista Semanal o Mensual)
  const [selectedSlotModal, setSelectedSlotModal] = useState<{
    schedule: ScheduleDomainModel;
    dateStr: string;
  } | null>(null);

  const fetchScheduleData = async () => {
    try {
      const schedQuery = query(collection(db, 'schedules'), where('active', '==', true));
      const excQuery = collection(db, 'scheduleExceptions');
      const bQuery = user
        ? query(collection(db, 'bookings'), where('uid', '==', user.uid))
        : null;
      const capQuery = collection(db, 'class_capacity');

      const [schedSnap, excSnap, bSnap, capSnap] = await Promise.all([
        getDocs(schedQuery),
        getDocs(excQuery),
        bQuery ? getDocs(bQuery) : Promise.resolve(null),
        getDocs(capQuery),
      ]);

      const sList: ScheduleDomainModel[] = [];
      schedSnap.forEach((d) =>
        sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) })
      );
      setSchedules(sList.length > 0 ? sList : DEFAULT_OFFICIAL_SCHEDULES);

      const eList: ScheduleExceptionDomainModel[] = [];
      excSnap.forEach((d) =>
        eList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) })
      );
      setExceptions(eList);

      if (bSnap) {
        const bList: BookingDomainModel[] = [];
        bSnap.forEach((d) =>
          bList.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) })
        );
        setMyBookings(bList);
      } else {
        setMyBookings([]);
      }

      // Mapa indexado por `${scheduleId}_${date}`
      const capMap: Record<string, { bookedCount: number; waitlistCount: number }> = {};
      capSnap.forEach((d) => {
        const data = d.data();
        if (data.scheduleId && data.date) {
          capMap[`${data.scheduleId}_${data.date}`] = {
            bookedCount: Number(data.bookedCount || 0),
            waitlistCount: Number(data.waitlistCount || 0),
          };
        }
      });
      setClassCapacities(capMap);
    } catch (err) {
      console.error('Error fetching schedule data:', err);
      setSchedules((prev) => (prev.length > 0 ? prev : DEFAULT_OFFICIAL_SCHEDULES));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [user]);

  // Sincronizar mes visible cuando cambia selectedDateStr
  const handleSelectDate = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const { year, month0 } = parseYMD(dateStr);
    setVisibleMonth({ year, month0 });
  };

  // Listas únicas de Profesores (Agentes) y Salas (Recursos)
  const distinctProfessors = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.professor) set.add(s.professor);
    });
    return Array.from(set).sort();
  }, [schedules]);

  const distinctRooms = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      set.add(s.room || 'Tatami Principal');
    });
    return Array.from(set).sort();
  }, [schedules]);

  // Reservas activas del socio (BOOKED o WAITLISTED desde hoy en adelante)
  const activeMyBookings = useMemo(() => {
    return myBookings.filter(
      (b) => (b.status === 'BOOKED' || b.status === 'WAITLISTED') && b.date >= todayStr
    );
  }, [myBookings, todayStr]);

  // Detalle enriquecido de próximas reservas (Estilo Madrid Móvil "Mis Reservas y Anulaciones")
  const upcomingMyBookingsDetailed = useMemo(() => {
    return activeMyBookings
      .map((booking) => {
        const schedule = schedules.find((s) => s.id === booking.scheduleId);
        return schedule ? { booking, schedule } : null;
      })
      .filter((item): item is { booking: BookingDomainModel; schedule: ScheduleDomainModel } => item !== null)
      .sort((a, b) => {
        const dateCmp = a.booking.date.localeCompare(b.booking.date);
        if (dateCmp !== 0) return dateCmp;
        return a.schedule.startTime.localeCompare(b.schedule.startTime);
      });
  }, [activeMyBookings, schedules]);

  // Helper para saber si una clase en una fecha está reservada por el usuario
  const getMyBookingForSlot = (scheduleId: string, dateStr: string): BookingDomainModel | undefined => {
    return myBookings.find(
      (b) =>
        b.scheduleId === scheduleId &&
        b.date === dateStr &&
        (b.status === 'BOOKED' || b.status === 'WAITLISTED')
    );
  };

  // Helper para saber el aforo en una fecha
  const getCapacityForSlot = (schedule: ScheduleDomainModel, dateStr: string) => {
    const key = `${schedule.id}_${dateStr}`;
    const capData = classCapacities[key] || { bookedCount: 0, waitlistCount: 0 };
    const capacity = schedule.capacity || 24;
    const currentAttendees = Math.max(0, capData.bookedCount);
    const isFull = currentAttendees >= capacity;
    const fillPct = Math.min(100, Math.round((currentAttendees / capacity) * 100));
    return {
      currentAttendees,
      waitlistCount: Math.max(0, capData.waitlistCount),
      capacity,
      isFull,
      fillPct,
    };
  };

  // Helper para comprobar excepción/festivo en una fecha
  const getExceptionForSlot = (
    scheduleId: string,
    dateStr: string
  ): ScheduleExceptionDomainModel | undefined => {
    return exceptions.find(
      (e) => (e.scheduleId === scheduleId || e.scheduleId === 'ALL') && e.date === dateStr
    );
  };

  // Filtrar horarios según criterios REA seleccionados + Franja Horaria (Madrid Móvil)
  const matchesFilters = (schedule: ScheduleDomainModel, dateStr?: string): boolean => {
    const matchDiscipline =
      selectedDiscipline === 'TODAS' ||
      schedule.program.toUpperCase().includes(selectedDiscipline.toUpperCase());
    const matchProfessor =
      selectedProfessor === 'ALL' || schedule.professor === selectedProfessor;
    const matchRoom =
      selectedRoom === 'ALL' || (schedule.room || 'Tatami Principal') === selectedRoom;
    const matchBand =
      selectedTimeBand === 'ALL' || getScheduleTimeBand(schedule.startTime) === selectedTimeBand;

    if (!matchDiscipline || !matchProfessor || !matchRoom || !matchBand) return false;

    if (onlyMyBookings && dateStr) {
      return !!getMyBookingForSlot(schedule.id, dateStr);
    }

    return true;
  };

  // Acción: Reservar Clase (con fecha explícita YYYY-MM-DD)
  const handleBookClass = async (schedule: ScheduleDomainModel, targetDateStr: string) => {
    if (!user) return;
    const slotKey = `${schedule.id}_${targetDateStr}`;
    setActionLoading(slotKey);
    setMessage(null);

    try {
      if (targetDateStr < todayStr) {
        throw new Error('No se pueden reservar clases en fechas pasadas.');
      }

      const inProgress =
        targetDateStr === todayStr && isClassInProgress(schedule, exceptions, now);
      if (inProgress) {
        throw new Error('La clase ya está en curso o finalizada.');
      }

      const { isFull } = getCapacityForSlot(schedule, targetDateStr);
      const bookingId = `${schedule.id}_${targetDateStr}_${user.uid}`;
      const status = isFull ? 'WAITLISTED' : 'BOOKED';

      await setDoc(doc(db, 'bookings', bookingId), {
        uid: user.uid,
        scheduleId: schedule.id,
        date: targetDateStr,
        status,
        checkInSource: 'APP',
        createdAt: serverTimestamp(),
      });

      const capDocId = `${schedule.id}_${targetDateStr}`;
      await setDoc(
        doc(db, 'class_capacity', capDocId),
        {
          scheduleId: schedule.id,
          date: targetDateStr,
          bookedCount: isFull ? increment(0) : increment(1),
          waitlistCount: isFull ? increment(1) : increment(0),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage({
        text: isFull
          ? `Aforo completo el ${targetDateStr}. Te hemos añadido a la Lista de Espera.`
          : `¡Plaza reservada en ${schedule.program} (${schedule.startTime}) para el ${targetDateStr}!`,
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

  // Acción: Cancelar Reserva
  const handleCancelBooking = async (
    booking: BookingDomainModel,
    schedule: ScheduleDomainModel,
    targetDateStr: string
  ) => {
    if (!user) return;
    const slotKey = `${schedule.id}_${targetDateStr}`;
    setActionLoading(slotKey);
    setMessage(null);

    try {
      const allowed = canCancel(booking, schedule, 2, now, role === 'admin');
      if (!allowed) {
        throw new Error('No es posible cancelar con menos de 2 horas de antelación.');
      }

      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp(),
      });

      const capDocId = `${schedule.id}_${targetDateStr}`;
      if (booking.status === 'BOOKED') {
        await setDoc(
          doc(db, 'class_capacity', capDocId),
          {
            scheduleId: schedule.id,
            date: targetDateStr,
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
            date: targetDateStr,
            waitlistCount: increment(-1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      setMessage({ text: 'Reserva cancelada correctamente. Plaza liberada.', type: 'success' });
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

  // Semana activa calculada a partir de selectedDateStr (Lunes a Domingo)
  const mondayOfSelectedWeek = useMemo(() => getMondayOfWeek(selectedDateStr), [selectedDateStr]);

  const weekDays = useMemo(() => {
    const hasWeekendClasses = schedules.some((s) => s.dayOfWeek === 6 || s.dayOfWeek === 7);
    const count = hasWeekendClasses ? 7 : 5;
    return Array.from({ length: count }, (_, idx) => {
      const dateStr = addDaysYMD(mondayOfSelectedWeek, idx);
      const parsed = parseYMD(dateStr);
      const meta = WEEKDAY_HEADERS[idx];
      return {
        ...meta,
        dateStr,
        dayNum: parsed.day,
        monthShort: MONTH_NAMES_ES[parsed.month0].slice(0, 3).toUpperCase(),
        isToday: dateStr === todayStr,
      };
    });
  }, [mondayOfSelectedWeek, schedules, todayStr]);

  // Carrusel horizontal de 14 días estilo Madrid Móvil para navegación táctil rápida en móvil
  const mobileCarouselDays = useMemo(() => {
    const endOf14FromToday = addDaysYMD(todayStr, 13);
    const baseStart =
      selectedDateStr >= todayStr && selectedDateStr <= endOf14FromToday
        ? todayStr
        : mondayOfSelectedWeek;
    return Array.from({ length: 14 }, (_, idx) => {
      const dateStr = addDaysYMD(baseStart, idx);
      const parsed = parseYMD(dateStr);
      const meta = WEEKDAY_HEADERS.find((w) => w.num === parsed.dayOfWeek) || WEEKDAY_HEADERS[0];
      return {
        ...meta,
        dateStr,
        dayNum: parsed.day,
        monthShort: MONTH_NAMES_ES[parsed.month0].slice(0, 3).toUpperCase(),
        isToday: dateStr === todayStr,
      };
    });
  }, [todayStr, selectedDateStr, mondayOfSelectedWeek]);

  // Celdas de la matriz mensual (Lunes a Domingo, 35 o 42 celdas)
  const monthGridCells = useMemo(() => {
    const { year, month0 } = visibleMonth;
    const firstDayStr = formatDateYMD(year, month0, 1);
    const firstDayParsed = parseYMD(firstDayStr);
    const leadingDays = firstDayParsed.dayOfWeek - 1; // 0 si empieza en Lunes
    const gridStartStr = addDaysYMD(firstDayStr, -leadingDays);

    const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
    const totalCells = leadingDays + daysInMonth > 35 ? 42 : 35;

    return Array.from({ length: totalCells }, (_, idx) => {
      const dateStr = addDaysYMD(gridStartStr, idx);
      const parsed = parseYMD(dateStr);
      const isCurrentMonth = parsed.month0 === month0 && parsed.year === year;
      const daySchedules = schedules
        .filter((s) => s.dayOfWeek === parsed.dayOfWeek && matchesFilters(s, dateStr))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const dayBookingsCount = daySchedules.filter(
        (s) => !!getMyBookingForSlot(s.id, dateStr)
      ).length;

      const dayException = exceptions.find((e) => e.date === dateStr);

      return {
        dateStr,
        day: parsed.day,
        dayOfWeek: parsed.dayOfWeek,
        isCurrentMonth,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        daySchedules,
        dayBookingsCount,
        dayException,
      };
    });
  }, [
    visibleMonth,
    schedules,
    exceptions,
    myBookings,
    selectedDiscipline,
    selectedProfessor,
    selectedRoom,
    selectedTimeBand,
    onlyMyBookings,
    todayStr,
    selectedDateStr,
  ]);

  // Navegación Anterior / Hoy / Siguiente según la vista activa
  const handleNavigatePrev = () => {
    if (viewMode === 'MONTH') {
      setVisibleMonth((prev) => {
        const nextMonth0 = prev.month0 === 0 ? 11 : prev.month0 - 1;
        const nextYear = prev.month0 === 0 ? prev.year - 1 : prev.year;
        const nextDate = formatDateYMD(nextYear, nextMonth0, 1);
        setSelectedDateStr(nextDate);
        return { year: nextYear, month0: nextMonth0 };
      });
    } else if (viewMode === 'WEEK') {
      handleSelectDate(addDaysYMD(selectedDateStr, -7));
    } else {
      handleSelectDate(addDaysYMD(selectedDateStr, -1));
    }
  };

  const handleNavigateNext = () => {
    if (viewMode === 'MONTH') {
      setVisibleMonth((prev) => {
        const nextMonth0 = prev.month0 === 11 ? 0 : prev.month0 + 1;
        const nextYear = prev.month0 === 11 ? prev.year + 1 : prev.year;
        const nextDate = formatDateYMD(nextYear, nextMonth0, 1);
        setSelectedDateStr(nextDate);
        return { year: nextYear, month0: nextMonth0 };
      });
    } else if (viewMode === 'WEEK') {
      handleSelectDate(addDaysYMD(selectedDateStr, 7));
    } else {
      handleSelectDate(addDaysYMD(selectedDateStr, 1));
    }
  };

  const handleJumpToToday = () => {
    handleSelectDate(todayStr);
  };

  // Clases para el día seleccionado (usado en vista DÍA y en el detalle inferior de la vista MES)
  const selectedDayParsed = parseYMD(selectedDateStr);
  const selectedDaySchedules = useMemo(() => {
    return schedules
      .filter(
        (s) =>
          s.dayOfWeek === selectedDayParsed.dayOfWeek &&
          matchesFilters(s, selectedDateStr)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [
    schedules,
    selectedDayParsed.dayOfWeek,
    selectedDateStr,
    selectedDiscipline,
    selectedProfessor,
    selectedRoom,
    selectedTimeBand,
    onlyMyBookings,
    myBookings,
  ]);

  const disciplines = ['TODAS', 'GI', 'GRAPPLING', 'MMA', 'LUCHA', 'KIDS', 'BJJ FEM', 'OPEN MAT'];

  // Rango legible en la cabecera
  const periodTitle = useMemo(() => {
    if (viewMode === 'MONTH') {
      return `${MONTH_NAMES_ES[visibleMonth.month0]} ${visibleMonth.year}`;
    }
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    if (!first || !last) return '';
    const fParsed = parseYMD(first.dateStr);
    const lParsed = parseYMD(last.dateStr);
    if (fParsed.month0 === lParsed.month0) {
      return `${fParsed.day} – ${lParsed.day} ${MONTH_NAMES_ES[fParsed.month0]} ${fParsed.year}`;
    }
    return `${fParsed.day} ${MONTH_NAMES_ES[fParsed.month0].slice(0, 3)} – ${lParsed.day} ${MONTH_NAMES_ES[lParsed.month0].slice(0, 3)} ${lParsed.year}`;
  }, [viewMode, visibleMonth, weekDays]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-12 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. CABECERA PRINCIPAL + SELECTOR DE VISTA (DÍA/SEMANA/MES) */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase font-headline">
              Calendario & Reservas de Tatami
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-amber-400">
              Sistema REA
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Gestiona tus reservas en vista diaria, parrilla semanal o planificación mensual.
          </p>
        </div>

        {/* Controles de Navegación Temporal + Conmutador de Vista (Día | Semana | Mes) */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          {/* Navegador de Fechas (< Periodo | HOY | >) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={handleNavigatePrev}
              aria-label="Periodo anterior"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-slate-800 hover:bg-white transition cursor-pointer"
              title="Volver al día de hoy"
            >
              Hoy
            </button>

            <span className="px-2 text-xs font-bold text-slate-900 font-mono whitespace-nowrap">
              {periodTitle}
            </span>

            <button
              type="button"
              onClick={handleNavigateNext}
              aria-label="Periodo siguiente"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Conmutador de Vistas: Día | Semana | Mes */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setViewMode('DAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'DAY'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Día</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('WEEK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'WEEK'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'MONTH'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BARRA DE FILTROS REA + FRANJA HORARIA (MADRID MÓVIL)   */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
        {/* Tira de disciplinas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-0.5" />
          {disciplines.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDiscipline(d)}
              aria-pressed={selectedDiscipline === d}
              aria-label={`Filtrar por disciplina ${d}`}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition cursor-pointer ${
                selectedDiscipline === d
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Filtros de Agente (Profesor), Recurso (Sala), Franja Horaria y Evento (Mis Reservas + QR) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Profesor (REA Agent) */}
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedProfessor}
                onChange={(e) => setSelectedProfessor(e.target.value)}
                aria-label="Filtrar por profesor"
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todos los Profesores</option>
                {distinctProfessors.map((prof) => (
                  <option key={prof} value={prof}>
                    Prof. {prof}
                  </option>
                ))}
              </select>
            </div>

            {/* Sala / Tatami (REA Resource) */}
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                aria-label="Filtrar por tatami o sala"
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todos los Tatamis</option>
                {distinctRooms.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector rápido de Franja Horaria (Mañana / Tarde / Noche estilo Madrid Móvil) */}
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200/80">
              {(
                [
                  { id: 'ALL', label: 'Todo el día', icon: null },
                  { id: 'MORNING', label: 'Mañana', icon: Sunrise },
                  { id: 'AFTERNOON', label: 'Tarde', icon: Sun },
                  { id: 'NIGHT', label: 'Noche', icon: Moon },
                ] as const
              ).map((band) => {
                const IconComp = band.icon;
                const active = selectedTimeBand === band.id;
                return (
                  <button
                    key={band.id}
                    type="button"
                    onClick={() => setSelectedTimeBand(band.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {IconComp && <IconComp className="w-3 h-3" />}
                    <span>{band.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chip de Mis Reservas Activas + Pase QR */}
          <div className="flex items-center gap-2">
            {userData && (
              <button
                type="button"
                onClick={() => setShowQrPassModal(true)}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Mostrar Resguardo QR de Acceso al Tatami"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Pase QR</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setOnlyMyBookings((prev) => !prev)}
              className={`px-3 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                onlyMyBookings
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mis Reservas ({activeMyBookings.length})</span>
            </button>

            {(selectedDiscipline !== 'TODAS' ||
              selectedProfessor !== 'ALL' ||
              selectedRoom !== 'ALL' ||
              selectedTimeBand !== 'ALL' ||
              onlyMyBookings) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDiscipline('TODAS');
                  setSelectedProfessor('ALL');
                  setSelectedRoom('ALL');
                  setSelectedTimeBand('ALL');
                  setOnlyMyBookings(false);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Panel desplegable "Mis Reservas y Anulaciones" estilo Madrid Móvil cuando se activa Mis Reservas */}
        {onlyMyBookings && (
          <div className="pt-3 border-t border-emerald-100 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Mis Próximas Reservas & Anulaciones ({upcomingMyBookingsDetailed.length})
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Anulación sin penalización hasta 2h antes
              </span>
            </div>

            {upcomingMyBookingsDetailed.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500 text-center">
                No tienes próximas reservas activas. Desactiva el filtro «Mis Reservas» para explorar todas las clases.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {upcomingMyBookingsDetailed.map(({ booking, schedule }) => {
                  const slotKey = `${schedule.id}_${booking.date}`;
                  const theme = getProgramTheme(schedule.program);
                  return (
                    <div
                      key={booking.id}
                      className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between gap-2"
                    >
                      <div
                        className="min-w-0 cursor-pointer"
                        onClick={() => handleSelectDate(booking.date)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${theme.badge}`}>
                            {schedule.program}
                          </span>
                          <span className="text-[11px] font-mono font-black text-slate-900">
                            {schedule.startTime}–{schedule.endTime}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 capitalize truncate mt-0.5">
                          {formatReadableDateEs(booking.date)}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {schedule.room || 'Tatami Principal'} · Prof. {schedule.professor}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {userData && (
                          <button
                            type="button"
                            onClick={() => setShowQrPassModal(true)}
                            className="p-1.5 rounded-lg bg-slate-900 text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                            title="Ver QR de acceso"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(booking, schedule, booking.date)}
                          disabled={actionLoading === slotKey}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold transition cursor-pointer"
                        >
                          Anular
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback de Reserva / Cancelación */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CONTENIDO SEGÚN LA VISTA ACTIVA (DÍA | SEMANA | MES)   */}
      {/* ======================================================== */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3" role="status" aria-label="Cargando calendario de tatami...">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 h-72 animate-pulse space-y-3"
            >
              <div className="h-6 w-24 bg-slate-200 rounded-lg" />
              <div className="h-24 w-full bg-slate-100 rounded-xl" />
              <div className="h-24 w-full bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : viewMode === 'WEEK' ? (
        /* ======================================================== */
        /* 3A. VISTA SEMANAL (PARRILLA HORARIA ESTILO GYMDESK/WODIFY)*/
        /* ======================================================== */
        <div className="space-y-3">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              weekDays.length > 5 ? 'lg:grid-cols-7' : 'lg:grid-cols-5'
            } gap-3`}
          >
            {weekDays.map((dayCol) => {
              const colSchedules = schedules
                .filter(
                  (s) =>
                    s.dayOfWeek === dayCol.num && matchesFilters(s, dayCol.dateStr)
                )
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              const isSelectedDay = dayCol.dateStr === selectedDateStr;

              return (
                <div
                  key={dayCol.dateStr}
                  className={`bg-white border rounded-2xl overflow-hidden shadow-xs flex flex-col min-h-[420px] transition ${
                    dayCol.isToday
                      ? 'border-slate-900 ring-1 ring-slate-900/10'
                      : isSelectedDay
                      ? 'border-slate-400'
                      : 'border-slate-200/80'
                  }`}
                >
                  {/* Cabecera de Columna del Día */}
                  <button
                    type="button"
                    onClick={() => handleSelectDate(dayCol.dateStr)}
                    className={`p-3 border-b flex items-center justify-between text-left transition cursor-pointer ${
                      dayCol.isToday
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50/80 text-slate-900 border-slate-200/80 hover:bg-slate-100/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase tracking-wider">
                          {dayCol.label}
                        </span>
                        {dayCol.isToday && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-amber-400 text-slate-950">
                            Hoy
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold block mt-0.5 ${
                          dayCol.isToday ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {dayCol.dayNum} {dayCol.monthShort}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        dayCol.isToday
                          ? 'bg-white/15 text-white'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {colSchedules.length} cl.
                    </span>
                  </button>

                  {/* Bloques de Clases de la Columna */}
                  <div className="p-2.5 space-y-2.5 flex-1">
                    {colSchedules.length === 0 ? (
                      <div className="py-12 text-center text-[11px] text-slate-400 italic">
                        Sin sesiones para este filtro
                      </div>
                    ) : (
                      colSchedules.map((sched) => {
                        const theme = getProgramTheme(sched.program);
                        const dur = calculateScheduleDurationMinutes(
                          sched.startTime,
                          sched.endTime
                        );
                        const myBooking = getMyBookingForSlot(sched.id, dayCol.dateStr);
                        const exc = getExceptionForSlot(sched.id, dayCol.dateStr);
                        const { currentAttendees, capacity, isFull, fillPct } =
                          getCapacityForSlot(sched, dayCol.dateStr);
                        const inProgress =
                          dayCol.isToday && isClassInProgress(sched, exceptions, now);
                        const isPastDay = dayCol.dateStr < todayStr;
                        const slotKey = `${sched.id}_${dayCol.dateStr}`;

                        return (
                          <div
                            key={slotKey}
                            onClick={() =>
                              setSelectedSlotModal({
                                schedule: sched,
                                dateStr: dayCol.dateStr,
                              })
                            }
                            className={`p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between gap-2 ${
                              exc
                                ? 'bg-rose-50/50 border-rose-200 opacity-75'
                                : myBooking
                                ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                                : `${theme.bg} ${theme.border} ${theme.borderLeft}`
                            }`}
                          >
                            <div>
                              {/* Hora + Duración */}
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="text-xs font-mono font-black text-slate-900 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {sched.startTime} - {sched.endTime}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white/80 px-1.5 py-0.2 rounded border border-slate-200/60">
                                  {dur}m
                                </span>
                              </div>

                              {/* Disciplina + Estado en curso */}
                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <span
                                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.badge}`}
                                >
                                  {sched.program}
                                </span>
                                {inProgress && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase animate-pulse">
                                    En curso
                                  </span>
                                )}
                                {myBooking && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" />
                                    {myBooking.status === 'WAITLISTED' ? 'Espera' : 'Inscrito'}
                                  </span>
                                )}
                              </div>

                              {/* Profesor & Sala */}
                              <div className="text-[11px] text-slate-700 space-y-0.5">
                                <div className="flex items-center gap-1 font-semibold truncate">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">Prof. {sched.professor}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">
                                    {sched.room || 'Tatami Principal'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Barra de Ocupación REA + Botón Rápido 1-Clic */}
                            <div
                              className="pt-2 border-t border-slate-200/60 space-y-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {currentAttendees}/{capacity} plazas
                                </span>
                                <span
                                  className={`font-bold ${
                                    isFull
                                      ? 'text-rose-600'
                                      : fillPct >= 75
                                      ? 'text-amber-600'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  {isFull ? 'Completo' : `${capacity - currentAttendees} libres`}
                                </span>
                              </div>

                              <div className="w-full h-1.5 bg-white/80 rounded-full overflow-hidden border border-slate-200/60">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isFull
                                      ? 'bg-rose-500'
                                      : fillPct >= 75
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${fillPct}%` }}
                                />
                              </div>

                              {exc ? (
                                <div className="text-[10px] font-bold text-rose-700 text-center py-1 bg-rose-100/70 rounded-lg">
                                  Cerrado: {exc.reason}
                                </div>
                              ) : myBooking ? (
                                <div className="flex items-center gap-1">
                                  <span className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold text-center flex items-center justify-center gap-1">
                                    <Check className="w-3 h-3" />
                                    {myBooking.status === 'WAITLISTED'
                                      ? 'En Espera'
                                      : 'Reservada'}
                                  </span>
                                  {!isPastDay && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCancelBooking(myBooking, sched, dayCol.dateStr)
                                      }
                                      disabled={actionLoading === slotKey}
                                      title="Cancelar mi reserva"
                                      className="p-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 transition cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ) : isPastDay ? (
                                <div className="text-[10px] font-semibold text-slate-400 text-center py-1">
                                  Sesión finalizada
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleBookClass(sched, dayCol.dateStr)}
                                  disabled={actionLoading === slotKey}
                                  className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                    isFull
                                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                                  }`}
                                >
                                  {actionLoading === slotKey ? (
                                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : isFull ? (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      <span>Lista Espera</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3 h-3 text-amber-400" />
                                      <span>Reservar</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'MONTH' ? (
        /* ======================================================== */
        /* 3B. VISTA MENSUAL (MATRIZ 7 COLUMNAS + PUENTE DIARIO)     */
        /* ======================================================== */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Matriz Mensual (8 columnas en XL) */}
          <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            {/* Cabecera L-D */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200/80 text-center">
              {WEEKDAY_HEADERS.map((w) => (
                <div
                  key={w.num}
                  className="py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500"
                >
                  <span className="hidden sm:inline">{w.short}</span>
                  <span className="sm:hidden">{w.letter}</span>
                </div>
              ))}
            </div>

            {/* Celdas del Mes */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/70">
              {monthGridCells.map((cell) => {
                const maxPills = 3;
                const visiblePills = cell.daySchedules.slice(0, maxPills);
                const hiddenCount = Math.max(0, cell.daySchedules.length - maxPills);

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => handleSelectDate(cell.dateStr)}
                    className={`min-h-[90px] sm:min-h-[118px] p-1.5 sm:p-2 flex flex-col justify-between transition cursor-pointer ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-400'
                        : cell.isSelected
                        ? 'bg-amber-50/40 ring-2 ring-inset ring-slate-900'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Fila superior: Número de día + Insignia de Reserva */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-brand-accent text-white font-black shadow-2xs'
                            : cell.isSelected
                            ? 'bg-slate-900 text-white font-black'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.day}
                      </span>

                      {cell.dayBookingsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          <span className="hidden sm:inline">{cell.dayBookingsCount}</span>
                        </span>
                      )}
                    </div>

                    {/* Píldoras de clases del día */}
                    <div className="mt-1 space-y-1">
                      {cell.dayException ? (
                        <div className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-bold truncate">
                          Festivo
                        </div>
                      ) : (
                        <>
                          {visiblePills.map((s) => {
                            const booked = !!getMyBookingForSlot(s.id, cell.dateStr);
                            const theme = getProgramTheme(s.program);
                            return (
                              <div
                                key={`${s.id}_${cell.dateStr}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectDate(cell.dateStr);
                                  setSelectedSlotModal({
                                    schedule: s,
                                    dateStr: cell.dateStr,
                                  });
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold truncate flex items-center justify-between gap-1 border ${
                                  booked
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : `${theme.bg} ${theme.text} ${theme.border}`
                                }`}
                              >
                                <span className="truncate">
                                  <strong className="font-mono">{s.startTime}</strong> {s.program}
                                </span>
                                {booked && <Check className="w-2.5 h-2.5 shrink-0" />}
                              </div>
                            );
                          })}
                          {hiddenCount > 0 && (
                            <div className="text-[9px] font-mono font-bold text-slate-500 pl-1">
                              +{hiddenCount} más
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel Lateral de Agenda del Día Seleccionado (Macro -> Micro Bridge) */}
          <div className="xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 sticky top-20">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-accent block">
                  Clases del Día Seleccionado
                </span>
                <h3 className="text-sm font-black text-slate-900 capitalize">
                  {formatReadableDateEs(selectedDateStr)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('DAY')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
              >
                Ampliar Día →
              </button>
            </div>

            {selectedDaySchedules.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No hay sesiones programadas en esta fecha.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {selectedDaySchedules.map((sched) => {
                  const theme = getProgramTheme(sched.program);
                  const myBooking = getMyBookingForSlot(sched.id, selectedDateStr);
                  const exc = getExceptionForSlot(sched.id, selectedDateStr);
                  const { currentAttendees, capacity, isFull } = getCapacityForSlot(
                    sched,
                    selectedDateStr
                  );
                  const isPastDay = selectedDateStr < todayStr;
                  const slotKey = `${sched.id}_${selectedDateStr}`;

                  return (
                    <div
                      key={slotKey}
                      className={`p-3 rounded-xl border transition ${
                        myBooking
                          ? 'bg-emerald-50/40 border-emerald-300'
                          : 'bg-slate-50/60 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-black text-slate-900">
                          {sched.startTime} – {sched.endTime}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${theme.badge}`}
                        >
                          {sched.program}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 mb-2.5">
                        <span>
                          Prof. <strong>{sched.professor}</strong> · {sched.room || 'Tatami Principal'}
                        </span>
                        <span className="font-mono font-bold">
                          {currentAttendees}/{capacity}
                        </span>
                      </div>

                      {exc ? (
                        <div className="text-[11px] font-bold text-rose-600">
                          Cancelada: {exc.reason}
                        </div>
                      ) : myBooking ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            {myBooking.status === 'WAITLISTED'
                              ? 'En Lista de Espera'
                              : 'Plaza Reservada'}
                          </span>
                          {!isPastDay && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCancelBooking(myBooking, sched, selectedDateStr)
                              }
                              disabled={actionLoading === slotKey}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      ) : isPastDay ? (
                        <span className="text-[11px] text-slate-400 italic">
                          Fecha pasada
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBookClass(sched, selectedDateStr)}
                          disabled={actionLoading === slotKey}
                          className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isFull
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isFull ? 'Entrar en Lista de Espera' : 'Reservar Plaza'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 3C. VISTA DÍA / MADRID MÓVIL (CARRUSEL 14 DÍAS + FRANJAS) */
        /* ======================================================== */
        <div className="space-y-4">
          {/* Carrusel horizontal deslizable de 14 días (Estilo Madrid Móvil "Madrid es Deporte") */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Selecciona Fecha (14 Días · Estilo Madrid Móvil)
              </span>
              <span className="text-[11px] font-bold text-slate-800 capitalize">
                {formatReadableDateEs(selectedDateStr)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {mobileCarouselDays.map((d) => {
                const isSelected = d.dateStr === selectedDateStr;
                const hasBookingOnDay = schedules.some(
                  (s) =>
                    s.dayOfWeek === d.num && !!getMyBookingForSlot(s.id, d.dateStr)
                );

                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => handleSelectDate(d.dateStr)}
                    aria-pressed={isSelected}
                    aria-label={`Ver horario del ${d.label} ${d.dayNum}${d.isToday ? ' (Hoy)' : ''}`}
                    className={`py-2 px-2.5 min-w-[60px] shrink-0 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border relative ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : d.isToday
                        ? 'bg-amber-50/70 text-slate-900 border-amber-300'
                        : 'bg-slate-50/60 text-slate-600 border-slate-200/70 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      {d.short}
                    </span>
                    <span className="text-sm font-black font-mono mt-0.5 leading-none">
                      {d.dayNum}
                    </span>
                    <span
                      className={`text-[8px] font-bold uppercase mt-0.5 ${
                        isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {d.monthShort}
                    </span>
                    <div className="flex items-center gap-1 mt-1 h-3">
                      {d.isToday && (
                        <span
                          className={`text-[8px] font-black uppercase px-1 rounded-full ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-amber-200 text-amber-950'
                          }`}
                        >
                          Hoy
                        </span>
                      )}
                      {hasBookingOnDay && (
                        <span
                          title="Tienes reserva este día"
                          className="w-2 h-2 rounded-full bg-emerald-500"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista detallada de clases agrupadas por Franja Horaria (Mañana / Tarde / Noche) */}
          {selectedDaySchedules.length === 0 ? (
            <div className="text-center py-14 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900">
                No hay clases programadas para este filtro el {formatReadableDateEs(selectedDateStr)}.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona otro día en el carrusel superior o cambia a la vista Semana / Mes.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {(
                [
                  { id: 'MORNING', title: 'Franja de Mañana (Antes de las 14:00)', icon: Sunrise },
                  { id: 'AFTERNOON', title: 'Franja de Tarde (14:00 – 18:59)', icon: Sun },
                  { id: 'NIGHT', title: 'Franja de Noche (Desde las 19:00)', icon: Moon },
                ] as const
              ).map((bandGroup) => {
                const bandSchedules = selectedDaySchedules.filter(
                  (s) => getScheduleTimeBand(s.startTime) === bandGroup.id
                );
                if (bandSchedules.length === 0) return null;
                const BandIcon = bandGroup.icon;

                return (
                  <div key={bandGroup.id} className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <BandIcon className="w-3.5 h-3.5 text-brand-accent" />
                        {bandGroup.title}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {bandSchedules.length} {bandSchedules.length === 1 ? 'sesión' : 'sesiones'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {bandSchedules.map((schedule) => {
                        const theme = getProgramTheme(schedule.program);
                        const dur = calculateScheduleDurationMinutes(
                          schedule.startTime,
                          schedule.endTime
                        );
                        const inProgress =
                          selectedDateStr === todayStr &&
                          isClassInProgress(schedule, exceptions, now);
                        const exc = getExceptionForSlot(schedule.id, selectedDateStr);
                        const myBooking = getMyBookingForSlot(schedule.id, selectedDateStr);
                        const { currentAttendees, capacity, isFull, fillPct } = getCapacityForSlot(
                          schedule,
                          selectedDateStr
                        );
                        const freeSpots = Math.max(0, capacity - currentAttendees);
                        const isPastDay = selectedDateStr < todayStr;
                        const slotKey = `${schedule.id}_${selectedDateStr}`;

                        return (
                          <div
                            key={slotKey}
                            className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${
                              inProgress
                                ? 'border-emerald-400 ring-1 ring-emerald-200'
                                : myBooking
                                ? 'border-emerald-300 bg-emerald-50/20'
                                : 'border-slate-200/80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              {/* Detalles de la clase (REA: Evento + Agente + Recurso) */}
                              <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center shrink-0 min-w-[82px]">
                                  <span className="text-sm font-black text-slate-900 block font-mono">
                                    {schedule.startTime}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block font-mono">
                                    {schedule.endTime}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-500 mt-0.5 block">
                                    {dur} min
                                  </span>
                                </div>

                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase ${theme.badge}`}
                                    >
                                      {schedule.program}
                                    </span>

                                    {/* Píldora de Plazas Libres estilo Madrid Móvil */}
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                        isFull
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : fillPct >= 75
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      }`}
                                    >
                                      {isFull
                                        ? 'Completo · Lista Espera'
                                        : fillPct >= 75
                                        ? `¡Últimas ${freeSpots} plazas!`
                                        : `${freeSpots} plazas libres`}
                                    </span>

                                    {schedule.levelRequired && (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold uppercase">
                                        Nivel: {schedule.levelRequired}
                                      </span>
                                    )}

                                    {inProgress && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        Clase en Curso
                                      </span>
                                    )}

                                    {exc && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                                        Cancelada: {exc.reason}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                                      <User className="w-3.5 h-3.5 text-slate-400" /> Prof.{' '}
                                      {schedule.professor}
                                    </span>

                                    <span className="flex items-center gap-1 text-slate-500">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                      {schedule.room || 'Tatami Principal'}
                                    </span>

                                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                                      <Users className="w-3.5 h-3.5" />
                                      {currentAttendees} / {capacity} plazas ({fillPct}%)
                                    </span>
                                  </div>

                                  {/* Barra de progreso de aforo */}
                                  <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        isFull
                                          ? 'bg-rose-500'
                                          : fillPct >= 75
                                          ? 'bg-amber-500'
                                          : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${fillPct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Acciones de Reserva / Resguardo QR / Cancelación */}
                              <div className="flex items-center justify-end gap-2 shrink-0">
                                {exc ? (
                                  <span className="text-xs font-bold text-red-600">
                                    Clase no disponible
                                  </span>
                                ) : myBooking ? (
                                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                                      <Check className="w-4 h-4 text-emerald-600" />
                                      {myBooking.status === 'WAITLISTED'
                                        ? 'En Lista de Espera'
                                        : 'Plaza Reservada'}
                                    </span>

                                    {userData && (
                                      <button
                                        type="button"
                                        onClick={() => setShowQrPassModal(true)}
                                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                        title="Mostrar Resguardo QR para el torno/kiosco"
                                      >
                                        <QrCode className="w-3.5 h-3.5 text-amber-400" />
                                        <span>QR</span>
                                      </button>
                                    )}

                                    {!isPastDay && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCancelBooking(
                                            myBooking,
                                            schedule,
                                            selectedDateStr
                                          )
                                        }
                                        disabled={actionLoading === slotKey}
                                        aria-label={`Cancelar mi reserva para ${schedule.program} a las ${schedule.startTime}`}
                                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition cursor-pointer"
                                        title="Cancelar mi reserva"
                                      >
                                        {actionLoading === slotKey ? (
                                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <X className="w-4 h-4" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                ) : isPastDay ? (
                                  <span className="text-xs font-semibold text-slate-400">
                                    Sesión pasada
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleBookClass(schedule, selectedDateStr)}
                                    disabled={actionLoading === slotKey}
                                    className={`w-full sm:w-auto justify-center py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer ${
                                      isFull
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                                    }`}
                                  >
                                    {actionLoading === slotKey ? (
                                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : isFull ? (
                                      <>
                                        <Clock className="w-3.5 h-3.5" /> Lista de Espera
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Reservar
                                        Clase
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL DE FICHA RÁPIDA REA (QUICK-GLANCE CLASS DIALOG)  */}
      {/* ======================================================== */}
      <Dialog
        open={!!selectedSlotModal}
        onOpenChange={(open) => {
          if (!open) setSelectedSlotModal(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl">
          {selectedSlotModal && (() => {
            const { schedule, dateStr } = selectedSlotModal;
            const theme = getProgramTheme(schedule.program);
            const dur = calculateScheduleDurationMinutes(
              schedule.startTime,
              schedule.endTime
            );
            const myBooking = getMyBookingForSlot(schedule.id, dateStr);
            const exc = getExceptionForSlot(schedule.id, dateStr);
            const { currentAttendees, capacity, isFull, fillPct } = getCapacityForSlot(
              schedule,
              dateStr
            );
            const isPastDay = dateStr < todayStr;
            const slotKey = `${schedule.id}_${dateStr}`;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${theme.badge}`}
                    >
                      {schedule.program}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {dur} minutos
                    </span>
                  </div>
                  <DialogTitle className="text-xl font-black text-slate-900">
                    {schedule.program} · {schedule.startTime} – {schedule.endTime}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-semibold text-slate-500 capitalize">
                    {formatReadableDateEs(dateStr)}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Instructor (Agente REA)
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        Prof. {schedule.professor}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Ubicación (Recurso REA)
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {schedule.room || 'Tatami Principal'}
                      </span>
                    </div>
                  </div>

                  {/* Aforo en tiempo real */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">
                        Ocupación del Tatami
                      </span>
                      <span className="font-mono font-black text-slate-900">
                        {currentAttendees} / {capacity} atletas ({fillPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isFull
                            ? 'bg-rose-500'
                            : fillPct >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Cancelación gratuita disponible hasta 2 horas antes del inicio de la sesión.
                    </p>
                  </div>

                  {exc ? (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                      Sesión suspendida: {exc.reason}
                    </div>
                  ) : myBooking ? (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        {myBooking.status === 'WAITLISTED'
                          ? 'Inscrito en Lista de Espera'
                          : 'Tienes Plaza Reservada'}
                      </span>
                      {!isPastDay && (
                        <button
                          type="button"
                          onClick={async () => {
                            await handleCancelBooking(myBooking, schedule, dateStr);
                            setSelectedSlotModal(null);
                          }}
                          disabled={actionLoading === slotKey}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                        >
                          Cancelar Reserva
                        </button>
                      )}
                    </div>
                  ) : !isPastDay ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleBookClass(schedule, dateStr);
                        setSelectedSlotModal(null);
                      }}
                      disabled={actionLoading === slotKey}
                      className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>
                        {isFull
                          ? 'Unirse a la Lista de Espera'
                          : 'Confirmar Reserva de Plaza'}
                      </span>
                    </button>
                  ) : null}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 5. MODAL DE PASE QR DE ACCESO (ESTILO MADRID MÓVIL)       */}
      {/* ======================================================== */}
      {showQrPassModal && userData && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowQrPassModal(false)}
        >
          <div className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <QrCodePassCard user={userData} onClose={() => setShowQrPassModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
