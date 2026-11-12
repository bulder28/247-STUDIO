import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Moon,
  QrCode,
  Sun,
  Sunrise,
  User,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useScheduleStore } from '@/shared/stores/useScheduleStore';
import { useScheduleData } from '@/shared/hooks/useScheduleQueries';
import {
  calculateScheduleDurationMinutes,
  getMadridTimeComponents,
  getProgramTheme,
  isClassInProgress,
} from '@/shared/domain/schedule';
import { ScheduleDomainModel, ScheduleExceptionDomainModel } from '@/shared/domain/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { QrCodePassCard } from '@/widgets/QrCodePassCard';

type GroupingMode = 'BY_ACTIVITY' | 'BY_TIME_BAND';

export interface ActivityCategory {
  id: string;
  name: string;
  short: string;
  icon: string;
  image: string;
  match: (program: string) => boolean;
  description: string;
  badge: string;
}

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  {
    id: 'BJJ',
    name: 'Brazilian Jiu-Jitsu (GI)',
    short: 'BJJ GI',
    icon: '🥋',
    image: '/galeria/bjj/bjj9.webp',
    match: (program: string) =>
      /GI|BJJ FEM|MANHÃ|INICIANTES/i.test(program) && !/NO-GI|GRAPPLING/i.test(program),
    description: 'Técnica de kimono, agarres, transiciones y combate controlado',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  },
  {
    id: 'GRAPPLING',
    name: 'Grappling & No-Gi',
    short: 'NO-GI',
    icon: '🤼',
    image: '/galeria/grappling/grappling11.webp',
    match: (program: string) => /GRAPPLING|NO-GI/i.test(program),
    description: 'Lucha de sumisión sin kimono, ritmo fluido, derribos y llaves',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  {
    id: 'MMA',
    name: 'MMA & Striking',
    short: 'MMA',
    icon: '🥊',
    image: '/galeria/grappling/grappling1.webp',
    match: (program: string) => /MMA|BOXEO|STRIKING|KICK/i.test(program),
    description: 'Artes marciales mixtas, combinación de golpeo y suelo',
    badge: 'bg-rose-100 text-rose-900 border-rose-200',
  },
  {
    id: 'LUCHA',
    name: 'Lucha Olímpica & Wrestling',
    short: 'LUCHA',
    icon: '🤼‍♂️',
    image: '/galeria/lucha/lucha5.webp',
    match: (program: string) => /LUCHA|WRESTLING/i.test(program),
    description: 'Control de pie, derribos olímpicos y defensa en tatami',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  {
    id: 'KIDS',
    name: 'Infantil & Juvenil (Kids)',
    short: 'KIDS',
    icon: '👶',
    image: '/galeria/kids/kids1.webp',
    match: (program: string) => /KIDS|INFANTIL|JUVENIL/i.test(program),
    description: 'Psicomotricidad, disciplina marcial y valores para los más jóvenes',
    badge: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  {
    id: 'OPEN_MAT',
    name: 'Open Mat & Sparring Libre',
    short: 'OPEN MAT',
    icon: '⚡',
    image: '/galeria/bjj/bjj1.webp',
    match: (program: string) => /OPEN MAT|TATAMI LIBRE|SPARRING LIBRE/i.test(program),
    description: 'Tatami libre para rodar con compañeros a tu propio ritmo',
    badge: 'bg-purple-100 text-purple-900 border-purple-200',
  },
];

export interface DisciplineFilterItem {
  id: string;
  label: string;
  short: string;
  subtitle: string;
  image: string;
  icon: string;
}

export const DISCIPLINE_FILTERS: DisciplineFilterItem[] = [
  {
    id: 'TODAS',
    label: 'Todas las Clases',
    short: 'TODAS',
    subtitle: 'Todo el Horario',
    icon: '⚡',
    image: '/herobackground.webp',
  },
  {
    id: 'GI_GRAPPLING',
    label: 'BJJ Gi & Grappling',
    short: 'GI & GRAPPLING',
    subtitle: 'Con y sin kimono',
    icon: '🥋',
    image: '/galeria/bjj/bjj9.webp',
  },
  {
    id: 'MMA',
    label: 'MMA & Striking',
    short: 'MMA',
    subtitle: 'Golpeo y derribos',
    icon: '🥊',
    image: '/galeria/grappling/grappling1.webp',
  },
  {
    id: 'LUCHA',
    label: 'Lucha Olímpica & Wrestling',
    short: 'LUCHA',
    subtitle: 'Wrestling & control',
    icon: '🤼‍♂️',
    image: '/galeria/lucha/lucha5.webp',
  },
  {
    id: 'KIDS',
    label: 'Infantil & Juvenil (Kids)',
    short: 'KIDS',
    subtitle: '3 a 14 años',
    icon: '👶',
    image: '/galeria/kids/kids1.webp',
  },
  {
    id: 'BJJ FEM',
    label: 'BJJ Femenino',
    short: 'BJJ FEM',
    subtitle: 'Tatami femenino',
    icon: '🥋',
    image: '/galeria/bjj/bjj11.webp',
  },
  {
    id: 'OPEN MAT',
    label: 'Open Mat & Tatami Libre',
    short: 'OPEN MAT',
    subtitle: 'Sparring libre entre socios',
    icon: '⚡',
    image: '/galeria/bjj/bjj1.webp',
  },
];

export function getActivityCategory(program: string): ActivityCategory {
  const found = ACTIVITY_CATEGORIES.find((cat) => cat.match(program));
  if (found) return found;
  return {
    id: 'GENERAL',
    name: program,
    short: program.slice(0, 8),
    icon: '🥋',
    image: '/herobackground.webp',
    match: () => true,
    description: 'Entrenamiento dirigido en tatami',
    badge: 'bg-slate-100 text-slate-900 border-slate-200',
  };
}

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
];

// Días lectivos de 247 STUDIO (Lunes a Viernes exclusivamente; sábados y domingos no hay actividades)
const WORKING_WEEKDAY_HEADERS = WEEKDAY_HEADERS;

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

// Redirige sábados y domingos al próximo día con clase (Lunes)
function getClosestWorkingDay(dateStr: string): string {
  const { dayOfWeek } = parseYMD(dateStr);
  if (dayOfWeek === 6) return addDaysYMD(dateStr, 2); // Sábado -> Próximo Lunes
  if (dayOfWeek === 7) return addDaysYMD(dateStr, 1); // Domingo -> Próximo Lunes
  return dateStr;
}

function formatReadableDateEs(dateStr: string): string {
  const { year, month0, day, dayOfWeek } = parseYMD(dateStr);
  const dayName = WEEKDAY_HEADERS.find((w) => w.num === dayOfWeek)?.label || '';
  return `${dayName}, ${day} de ${MONTH_NAMES_ES[month0]} ${year}`;
}

export const SchedulePage: React.FC = () => {
  const { user, userData } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDomainModel[]>([]);

  const now = new Date();
  const madridNow = getMadridTimeComponents(now);
  const todayStr = madridNow.dateStr;

  // Fecha activa seleccionada (YYYY-MM-DD): si hoy es fin de semana, apunta directamente al próximo día lectivo (Lunes)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return getClosestWorkingDay(todayStr);
  });

  // Mes visible para la vista mensual (año y mes 0-11)
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month0: number }>(() => {
    const parsed = parseYMD(getClosestWorkingDay(todayStr));
    return { year: parsed.year, month0: parsed.month0 };
  });

  // Filtros globales sincronizados vía Zustand Store
  const {
    selectedDiscipline,
    selectedProfessor,
    selectedRoom,
    viewMode,
    setSelectedDiscipline,
    setSelectedProfessor,
    setSelectedRoom,
    setViewMode,
  } = useScheduleStore();

  // Modo de agrupación de clases en vista diaria: Por Actividad (BJJ Gi, No-Gi, MMA...) o Por Franja Horaria
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('BY_ACTIVITY');

  // Modal de Resguardo QR de Acceso (Estilo Madrid Móvil)
  const [showQrPassModal, setShowQrPassModal] = useState<boolean>(false);

  // Estado de carga y feedback
  const [loading, setLoading] = useState(true);

  // Modal de Ficha Rápida REA (al pulsar sobre una clase en vista Semanal o Mensual)
  const [selectedSlotModal, setSelectedSlotModal] = useState<{
    schedule: ScheduleDomainModel;
    dateStr: string;
  } | null>(null);

  // TanStack Query: consulta reactiva con caché inteligente (5 minutos de frescura)
  const {
    data: scheduleQueryData,
    refetch: refetchScheduleData,
  } = useScheduleData(user?.uid);

  useEffect(() => {
    if (scheduleQueryData) {
      setSchedules(scheduleQueryData.schedules);
      setExceptions(scheduleQueryData.exceptions);
      setLoading(false);
    }
  }, [scheduleQueryData]);

  const fetchScheduleData = async () => {
    await refetchScheduleData();
  };

  useEffect(() => {
    fetchScheduleData();
  }, [user]);

  // Sincronizar mes visible cuando cambia selectedDateStr (redirecciona fines de semana a lunes)
  const handleSelectDate = (dateStr: string) => {
    const validDate = getClosestWorkingDay(dateStr);
    setSelectedDateStr(validDate);
    const { year, month0 } = parseYMD(validDate);
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
  const matchesFilters = (schedule: ScheduleDomainModel): boolean => {
    const prog = (schedule.program || '').toUpperCase();
    let matchDiscipline = true;

    if (selectedDiscipline === 'TODAS') {
      matchDiscipline = true;
    } else if (selectedDiscipline === 'GI_GRAPPLING') {
      const isGrappling = prog.includes('GRAPPLING') || prog.includes('NO-GI');
      const isGi =
        (/\bGI\b/.test(prog) || prog.includes('KIMONO') || prog.includes('BJJ')) &&
        !isGrappling &&
        !prog.includes('FEM');
      matchDiscipline = isGi || isGrappling;
    } else if (selectedDiscipline === 'MMA') {
      matchDiscipline = prog.includes('MMA') || prog.includes('BOXEO') || prog.includes('STRIKING');
    } else if (selectedDiscipline === 'LUCHA') {
      matchDiscipline = prog.includes('LUCHA') || prog.includes('WRESTLING');
    } else if (selectedDiscipline === 'KIDS') {
      matchDiscipline = prog.includes('KIDS') || prog.includes('INFANTIL') || prog.includes('JUVENIL');
    } else if (selectedDiscipline === 'BJJ FEM') {
      matchDiscipline = prog.includes('FEM') || prog.includes('BJJ FEM');
    } else if (selectedDiscipline === 'OPEN MAT') {
      matchDiscipline = prog.includes('OPEN MAT') || prog.includes('LIBRE') || prog.includes('SPARRING LIBRE');
    } else {
      matchDiscipline = prog.includes(selectedDiscipline.toUpperCase());
    }

    const matchProfessor =
      selectedProfessor === 'ALL' || schedule.professor === selectedProfessor;
    const matchRoom =
      selectedRoom === 'ALL' || (schedule.room || 'Tatami Principal') === selectedRoom;

    if (!matchDiscipline || !matchProfessor || !matchRoom) return false;

    return true;
  };

  // Semana activa calculada a partir de selectedDateStr (Lunes a Domingo)
  const mondayOfSelectedWeek = useMemo(() => getMondayOfWeek(selectedDateStr), [selectedDateStr]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, idx) => {
      const dateStr = addDaysYMD(mondayOfSelectedWeek, idx);
      const parsed = parseYMD(dateStr);
      const meta = WORKING_WEEKDAY_HEADERS[idx];
      return {
        ...meta,
        dateStr,
        dayNum: parsed.day,
        monthShort: MONTH_NAMES_ES[parsed.month0].slice(0, 3).toUpperCase(),
        isToday: dateStr === todayStr,
      };
    });
  }, [mondayOfSelectedWeek, todayStr]);

  // Celdas de la matriz mensual (Lunes a Viernes exclusivamente, omitiendo sábados y domingos)
  const monthGridCells = useMemo(() => {
    const { year, month0 } = visibleMonth;
    const firstDayStr = formatDateYMD(year, month0, 1);
    const mondayOfFirstWeek = getMondayOfWeek(firstDayStr);

    const cells: Array<{
      dateStr: string;
      day: number;
      dayOfWeek: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      daySchedules: ScheduleDomainModel[];
      dayException: ScheduleExceptionDomainModel | undefined;
    }> = [];

    let weekMonday = mondayOfFirstWeek;

    while (
      cells.length < 25 ||
      (cells.length < 35 &&
        parseYMD(weekMonday).month0 <= month0 &&
        parseYMD(weekMonday).year <= year)
    ) {
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const dateStr = addDaysYMD(weekMonday, dayOffset);
        const parsed = parseYMD(dateStr);
        const isCurrentMonth = parsed.month0 === month0 && parsed.year === year;
        const daySchedules = schedules
          .filter((s) => s.dayOfWeek === parsed.dayOfWeek && matchesFilters(s))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const dayException = exceptions.find((e) => e.date === dateStr);

        cells.push({
          dateStr,
          day: parsed.day,
          dayOfWeek: parsed.dayOfWeek,
          isCurrentMonth,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDateStr,
          daySchedules,
          dayException,
        });
      }
      weekMonday = addDaysYMD(weekMonday, 7);
      if (cells.length >= 35) break;
    }

    return cells;
  }, [
    visibleMonth,
    schedules,
    exceptions,
    selectedDiscipline,
    selectedProfessor,
    selectedRoom,
    todayStr,
    selectedDateStr,
  ]);

  // Navegación Anterior / Hoy / Siguiente según la vista activa (saltando fines de semana)
  const handleNavigatePrev = () => {
    if (viewMode === 'MONTH') {
      setVisibleMonth((prev) => {
        const nextMonth0 = prev.month0 === 0 ? 11 : prev.month0 - 1;
        const nextYear = prev.month0 === 0 ? prev.year - 1 : prev.year;
        const nextDate = getClosestWorkingDay(formatDateYMD(nextYear, nextMonth0, 1));
        setSelectedDateStr(nextDate);
        return { year: nextYear, month0: nextMonth0 };
      });
    } else if (viewMode === 'WEEK') {
      handleSelectDate(addDaysYMD(selectedDateStr, -7));
    } else {
      let prevDate = addDaysYMD(selectedDateStr, -1);
      const prevParsed = parseYMD(prevDate);
      if (prevParsed.dayOfWeek === 7) {
        prevDate = addDaysYMD(selectedDateStr, -3); // Domingo -> Viernes
      } else if (prevParsed.dayOfWeek === 6) {
        prevDate = addDaysYMD(selectedDateStr, -2); // Sábado -> Viernes
      }
      handleSelectDate(prevDate);
    }
  };

  const handleNavigateNext = () => {
    if (viewMode === 'MONTH') {
      setVisibleMonth((prev) => {
        const nextMonth0 = prev.month0 === 11 ? 0 : prev.month0 + 1;
        const nextYear = prev.month0 === 11 ? prev.year + 1 : prev.year;
        const nextDate = getClosestWorkingDay(formatDateYMD(nextYear, nextMonth0, 1));
        setSelectedDateStr(nextDate);
        return { year: nextYear, month0: nextMonth0 };
      });
    } else if (viewMode === 'WEEK') {
      handleSelectDate(addDaysYMD(selectedDateStr, 7));
    } else {
      let nextDate = addDaysYMD(selectedDateStr, 1);
      const nextParsed = parseYMD(nextDate);
      if (nextParsed.dayOfWeek === 6) {
        nextDate = addDaysYMD(selectedDateStr, 3); // Sábado -> Lunes
      } else if (nextParsed.dayOfWeek === 7) {
        nextDate = addDaysYMD(selectedDateStr, 2); // Domingo -> Lunes
      }
      handleSelectDate(nextDate);
    }
  };

  const handleJumpToToday = () => {
    handleSelectDate(getClosestWorkingDay(todayStr));
  };

  // Clases para el día seleccionado (usado en vista DÍA y en el detalle inferior de la vista MES)
  const selectedDayParsed = parseYMD(selectedDateStr);
  const selectedDaySchedules = useMemo(() => {
    return schedules
      .filter(
        (s) =>
          s.dayOfWeek === selectedDayParsed.dayOfWeek &&
          matchesFilters(s)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [
    schedules,
    selectedDayParsed.dayOfWeek,
    selectedDateStr,
    selectedDiscipline,
    selectedProfessor,
    selectedRoom,
  ]);

  // División / Agrupación de clases por actividad deportiva
  const groupedByActivity = useMemo(() => {
    const groups: { category: ActivityCategory; schedules: ScheduleDomainModel[] }[] = [];
    ACTIVITY_CATEGORIES.forEach((cat) => {
      const list = selectedDaySchedules.filter((s) => cat.match(s.program));
      if (list.length > 0) {
        groups.push({ category: cat, schedules: list });
      }
    });
    const uncategorized = selectedDaySchedules.filter(
      (s) => !ACTIVITY_CATEGORIES.some((cat) => cat.match(s.program))
    );
    if (uncategorized.length > 0) {
      groups.push({
        category: getActivityCategory('Otras Actividades'),
        schedules: uncategorized,
      });
    }
    return groups;
  }, [selectedDaySchedules]);

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
      {/* 1. CABECERA NATIVA ESTILO MADRID MÓVIL + PASE QR RÁPIDO   */}
      {/* ======================================================== */}
      <div className="bg-slate-950 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-800/90 relative overflow-hidden">
        {/* Halos ambientales animados de fondo */}
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-amber-400/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="min-w-0">
            {/* Indicador de Estado del Tatami */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-headline">
                Tatami Oficial · En Directo
              </span>
            </div>

            {/* Título Principal Exclusivo: STUDIO 247 CON ANIMACIÓN */}
            <div className="flex items-center gap-2.5 sm:gap-3 mt-1.5">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shadow-md shadow-amber-400/10 shrink-0">
                <img
                  src="/logo.webp"
                  alt="247"
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain brightness-110 filter drop-shadow animate-pulse"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase font-headline animate-studio-title leading-none">
                STUDIO 247
              </h1>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide mt-1 truncate">
              Artes Marciales · BJJ · Grappling · MMA · Lucha Olímpica
            </p>
          </div>

          {/* Botón Pase QR para el torno de acceso */}
          {userData && (
            <button
              type="button"
              onClick={() => setShowQrPassModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-md shrink-0 cursor-pointer active:scale-95"
              title="Abrir Pase QR digital para el torno"
            >
              <QrCode className="w-4 h-4 text-slate-950" />
              <div className="text-left hidden sm:block">
                <span className="block text-[10px] uppercase tracking-wider leading-none text-slate-800">Torno</span>
                <span className="block text-xs font-black leading-none mt-0.5">Pase QR</span>
              </div>
              <span className="sm:hidden font-black text-xs">Pase QR</span>
            </button>
          )}
        </div>

        {/* Conmutador de Vistas en Escritorio (Día · Semana · Mes) */}
        <div className="hidden lg:flex justify-end mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('DAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'DAY'
                  ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Vista App</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('WEEK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'WEEK'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'MONTH'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. HORARIO DE CONSULTA (SEMANA + FILTROS + VISTAS)        */}
      {/* ======================================================== */}
        <div className="space-y-4">
          {/* Selector fijo de semana (Lunes a Viernes, 5 columnas sin scroll horizontal) */}
          <div className="bg-white p-3 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Días de Actividad (Lunes a Viernes)
              </span>
              <button
                type="button"
                onClick={handleJumpToToday}
                className="text-[11px] font-black text-amber-600 hover:text-amber-700 underline cursor-pointer"
              >
                Volver a Hoy
              </button>
            </div>

            <div className="flex items-stretch gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectDate(addDaysYMD(selectedDateStr, -7))}
                aria-label="Semana anterior"
                title="Semana anterior"
                className="w-8 shrink-0 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-5 gap-1 flex-1 min-w-0">
                {weekDays.map((d) => {
                  const isSelected = d.dateStr === selectedDateStr;

                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => handleSelectDate(d.dateStr)}
                      aria-pressed={isSelected}
                      aria-label={`Ver horario del ${d.label} ${d.dayNum}${d.isToday ? ' (Hoy)' : ''}`}
                      className={`py-2 px-0.5 min-w-0 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                        isSelected
                          ? 'bg-slate-950 text-white border-slate-950 shadow-md ring-2 ring-slate-900/10'
                          : d.isToday
                          ? 'bg-amber-50/80 text-slate-950 border-amber-300 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider">
                        {d.short}
                      </span>
                      <span className="text-base font-black font-mono mt-0.5 leading-none">
                        {d.dayNum}
                      </span>
                      <span
                        className={`text-[8px] font-bold uppercase mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {d.monthShort}
                      </span>
                      <div className="mt-1 h-2.5 flex items-center">
                        {d.isToday && (
                          <span
                            className={`text-[7px] font-black uppercase px-1 rounded-full leading-tight ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-amber-200 text-amber-950'
                            }`}
                          >
                            Hoy
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleSelectDate(addDaysYMD(selectedDateStr, 7))}
                aria-label="Semana siguiente"
                title="Semana siguiente"
                className="w-8 shrink-0 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selector de Disciplinas: Pastillas Rápidas + Recuadros Visuales (Tamaño Equilibrado / Correcto) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-3 sm:p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 font-headline">
                  Filtrar por Disciplina
                </span>
              </div>
              {selectedDiscipline !== 'TODAS' && (
                <button
                  type="button"
                  onClick={() => setSelectedDiscipline('TODAS')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  ✕ Ver todas
                </button>
              )}
            </div>

            {/* Pastillas de Selección Rápida estilo Studio 247 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none px-0.5">
              {DISCIPLINE_FILTERS.map((disc) => {
                const isSelected = selectedDiscipline === disc.id;
                return (
                  <button
                    key={disc.id}
                    type="button"
                    onClick={() => setSelectedDiscipline(disc.id)}
                    aria-pressed={isSelected}
                    className={`shrink-0 rounded-full font-headline uppercase tracking-wider transition-all duration-150 cursor-pointer text-xs sm:text-[13px] whitespace-nowrap flex items-center gap-1.5 px-4 py-2 ${
                      isSelected
                        ? 'bg-slate-950 text-white font-black shadow-sm ring-2 ring-slate-900 border border-slate-950 scale-[1.02]'
                        : 'bg-white text-slate-700 font-extrabold border border-slate-200/90 shadow-2xs hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <span className="text-xs">{disc.icon}</span>
                    <span>{disc.short}</span>
                  </button>
                );
              })}
            </div>

            {/* Carrusel de Recuadros Visuales con Imagen (Tamaño Equilibrado / Correcto) */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none px-0.5">
              {DISCIPLINE_FILTERS.map((disc) => {
                const isSelected = selectedDiscipline === disc.id;
                return (
                  <button
                    key={disc.id}
                    type="button"
                    onClick={() => setSelectedDiscipline(disc.id)}
                    aria-pressed={isSelected}
                    aria-label={`Filtrar por ${disc.label}`}
                    className={`group relative shrink-0 w-24 sm:w-28 h-24 sm:h-28 rounded-2xl overflow-hidden text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'ring-3 ring-amber-400 shadow-md scale-[1.03] z-10'
                        : 'border border-slate-200/90 shadow-2xs opacity-90 hover:opacity-100 hover:scale-[1.01]'
                    }`}
                  >
                    {/* Fotografía de Fondo con Brillo */}
                    <img
                      src={disc.image}
                      alt={disc.label}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 filter brightness-100 contrast-105"
                      loading="lazy"
                    />

                    {/* Gradiente Oscuro para Legibilidad */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />

                    {/* Insignia Superior */}
                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between z-10">
                      <span className="w-5 h-5 rounded-md bg-slate-950/80 backdrop-blur-xs text-white flex items-center justify-center text-[10px] shadow-xs border border-white/10">
                        {disc.icon}
                      </span>
                      {isSelected && (
                        <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Texto Inferior */}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
                      <h4 className="text-[11px] font-black text-white uppercase leading-tight font-headline truncate drop-shadow-xs">
                        {disc.short}
                      </h4>
                      <p className="text-[9px] text-slate-300 font-medium truncate leading-tight">
                        {disc.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Filtros de Profesor y Sala */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <select
                  value={selectedProfessor}
                  onChange={(e) => setSelectedProfessor(e.target.value)}
                  aria-label="Filtrar por profesor"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos los Profesores</option>
                  {distinctProfessors.map((prof) => (
                    <option key={prof} value={prof}>
                      Prof. {prof}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  aria-label="Filtrar por tatami"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none hidden sm:block"
                >
                  <option value="ALL">Todos los Tatamis</option>
                  {distinctRooms.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>

                {(selectedDiscipline !== 'TODAS' ||
                  selectedProfessor !== 'ALL' ||
                  selectedRoom !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDiscipline('TODAS');
                      setSelectedProfessor('ALL');
                      setSelectedRoom('ALL');
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer ml-1"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>
          </div>

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
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleNavigatePrev}
                aria-label="Semana anterior"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold font-mono text-slate-900 px-1">{periodTitle}</span>
              <button
                type="button"
                onClick={handleNavigateNext}
                aria-label="Semana siguiente"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Semana Actual
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {weekDays.map((dayCol) => {
              const colSchedules = schedules
                .filter(
                  (s) =>
                    s.dayOfWeek === dayCol.num && matchesFilters(s)
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
                        const exc = getExceptionForSlot(sched.id, dayCol.dateStr);
                        const inProgress =
                          dayCol.isToday && isClassInProgress(sched, exceptions, now);
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

                            {exc && (
                              <div className="pt-2 border-t border-slate-200/60">
                                <div className="text-[10px] font-bold text-rose-700 text-center py-1 bg-rose-100/70 rounded-lg">
                                  Cerrado: {exc.reason}
                                </div>
                              </div>
                            )}
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
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleNavigatePrev}
                aria-label="Mes anterior"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold font-mono text-slate-900 px-1">{periodTitle}</span>
              <button
                type="button"
                onClick={handleNavigateNext}
                aria-label="Mes siguiente"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Mes Actual
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            {/* Matriz Mensual (8 columnas en XL) */}
            <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            {/* Cabecera L-V (5 días lectivos sin fines de semana) */}
            <div className="grid grid-cols-5 bg-slate-50 border-b border-slate-200/80 text-center">
              {WORKING_WEEKDAY_HEADERS.map((w) => (
                <div
                  key={w.num}
                  className="py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500"
                >
                  <span className="hidden sm:inline">{w.short}</span>
                  <span className="sm:hidden">{w.letter}</span>
                </div>
              ))}
            </div>

            {/* Celdas del Mes (5 columnas de Lunes a Viernes) */}
            <div className="grid grid-cols-5 divide-x divide-y divide-slate-200/70">
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
                    {/* Fila superior: Número de día */}
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
                                className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold truncate flex items-center justify-between gap-1 border ${theme.bg} ${theme.text} ${theme.border}`}
                              >
                                <span className="truncate">
                                  <strong className="font-mono">{s.startTime}</strong> {s.program}
                                </span>
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
                  const exc = getExceptionForSlot(sched.id, selectedDateStr);
                  const slotKey = `${sched.id}_${selectedDateStr}`;

                  return (
                    <div
                      key={slotKey}
                      className="p-3 rounded-xl border transition bg-slate-50/60 border-slate-200/80"
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

                      <div className="text-[11px] text-slate-600">
                        <span>
                          Prof. <strong>{sched.professor}</strong> · {sched.room || 'Tatami Principal'}
                        </span>
                      </div>

                      {exc && (
                        <div className="mt-2.5 text-[11px] font-bold text-rose-600">
                          Cancelada: {exc.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        /* ======================================================== */
        /* 3C. VISTA DÍA / MADRID MÓVIL                             */
        /* (DIVISIÓN POR ACTIVIDAD O POR FRANJA HORARIA)            */
        /* ======================================================== */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-2 pt-1">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">
                Sesiones Disponibles · STUDIO 247
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 capitalize font-headline">
                {formatReadableDateEs(selectedDateStr)}
              </h2>
            </div>

            {/* Selector de Agrupación: [ 🥋 Por Actividades ] | [ ⏰ Por Horario ] */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setGroupingMode('BY_ACTIVITY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  groupingMode === 'BY_ACTIVITY'
                    ? 'bg-white text-slate-950 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🥋 Por Actividades</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupingMode('BY_TIME_BAND')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  groupingMode === 'BY_TIME_BAND'
                    ? 'bg-white text-slate-950 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⏰ Por Horario</span>
              </button>
            </div>
          </div>

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
          ) : groupingMode === 'BY_ACTIVITY' ? (
            /* ======================================================== */
            /* 1. VISTA AGRUPADA POR ACTIVIDAD DEPORTIVA               */
            /* ======================================================== */
            <div className="space-y-6">
              {groupedByActivity.map(({ category, schedules: catSchedules }) => (
                <div key={category.id} className="space-y-3">
                  {/* Cabecera de Categoría de Actividad (Limpia y Elegante) */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center text-lg shadow-2xs shrink-0">
                        {category.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight font-headline truncate">
                          {category.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                          {category.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span className="px-2 py-1 rounded-xl text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {catSchedules.length} {catSchedules.length === 1 ? 'clase' : 'clases'}
                      </span>
                    </div>
                  </div>

                  {/* Listado de Clases dentro de la Actividad */}
                  <div className="space-y-3">
                    {catSchedules.map((schedule) => {
                      const theme = getProgramTheme(schedule.program);
                      const dur = calculateScheduleDurationMinutes(
                        schedule.startTime,
                        schedule.endTime
                      );
                      const inProgress =
                        selectedDateStr === todayStr &&
                        isClassInProgress(schedule, exceptions, now);
                      const exc = getExceptionForSlot(schedule.id, selectedDateStr);
                      const slotKey = `${schedule.id}_${selectedDateStr}`;

                      return (
                        <div
                          key={slotKey}
                          className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${
                            inProgress
                              ? 'border-emerald-400 ring-1 ring-emerald-200'
                              : 'border-slate-200/80'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            {/* Imagen de la Actividad (Un pelín más grande y luminosa) + Horario y Duración */}
                            <div className="flex items-center gap-3 sm:gap-3.5">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-200/90 shadow-2xs relative bg-slate-100 self-center">
                                <img
                                  src={category.image}
                                  alt={schedule.program}
                                  className="w-full h-full object-cover filter brightness-105 contrast-105 group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>

                              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-center shrink-0 min-w-[70px] sm:min-w-[78px]">
                                <span className="text-xs sm:text-sm font-black text-slate-900 block font-mono">
                                  {schedule.startTime}
                                </span>
                                <span className="text-[10px] sm:text-[11px] text-slate-400 block font-mono">
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
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ======================================================== */
            /* 2. VISTA AGRUPADA POR FRANJA HORARIA (MAÑANA / TARDE...) */
            /* ======================================================== */
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
                        const activityCat = getActivityCategory(schedule.program);
                        const slotKey = `${schedule.id}_${selectedDateStr}`;

                        return (
                          <div
                            key={slotKey}
                            className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${
                              inProgress
                                ? 'border-emerald-400 ring-1 ring-emerald-200'
                                : 'border-slate-200/80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              {/* Imagen de la Actividad (Un pelín más grande y luminosa) + Horario y Duración */}
                              <div className="flex items-center gap-3 sm:gap-3.5">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-200/90 shadow-2xs relative bg-slate-100 self-center">
                                  <img
                                    src={activityCat.image}
                                    alt={schedule.program}
                                    className="w-full h-full object-cover filter brightness-105 contrast-105 group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                </div>

                                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-center shrink-0 min-w-[70px] sm:min-w-[78px]">
                                  <span className="text-xs sm:text-sm font-black text-slate-900 block font-mono">
                                    {schedule.startTime}
                                  </span>
                                  <span className="text-[10px] sm:text-[11px] text-slate-400 block font-mono">
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
                                  </div>
                                </div>
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
        </div>

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
            const exc = getExceptionForSlot(schedule.id, dateStr);

            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-200/90 shadow-xs bg-slate-100">
                      <img
                        src={getActivityCategory(schedule.program).image}
                        alt={schedule.program}
                        className="w-full h-full object-cover filter brightness-105 contrast-105"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${theme.badge}`}
                        >
                          {schedule.program}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {dur} min
                        </span>
                      </div>
                      <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 truncate">
                        {schedule.program}
                      </DialogTitle>
                      <DialogDescription className="text-xs font-semibold text-slate-500 capitalize">
                        {formatReadableDateEs(dateStr)} · {schedule.startTime} – {schedule.endTime}
                      </DialogDescription>
                    </div>
                  </div>
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

                  {exc && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                      Sesión suspendida: {exc.reason}
                    </div>
                  )}
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
            <QrCodePassCard
              user={userData}
              onClose={() => setShowQrPassModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
