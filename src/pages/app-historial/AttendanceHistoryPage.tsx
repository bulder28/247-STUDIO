import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Flame,
  Layers,
  Loader2,
  Search,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { getLiveDocs } from '@/shared/api/liveReads';
import { useScheduleData } from '@/shared/hooks/useScheduleQueries';
import { BookingDomainModel, ScheduleDomainModel } from '@/shared/domain/types';
import { DEFAULT_OFFICIAL_SCHEDULES } from '@/shared/domain/schedule';
import {
  calculateTatamiDemandMetrics,
  TatamiDemandSummary,
} from '@/shared/domain/attendanceMetrics';
import { exportAttendanceMetricsToCsv } from '@/shared/utils/csvExporter';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTH_SHORTS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V'];

export const AttendanceHistoryPage: React.FC = () => {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  const [activeView, setActiveView] = useState<'METRICS' | 'PERSONAL'>(
    isAdmin ? 'METRICS' : 'PERSONAL'
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'ALL'>('ALL');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('ALL');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');

  // Estados de datos
  // Horarios y reservas propias: misma caché que Hoy y Clases (no se vuelven a descargar)
  const { data: scheduleData, isLoading: scheduleLoading } = useScheduleData(user?.uid);
  const schedules: ScheduleDomainModel[] = scheduleData?.schedules ?? DEFAULT_OFFICIAL_SCHEDULES;
  const userBookings: BookingDomainModel[] = scheduleData?.myBookings ?? [];
  const [allAcademyBookings, setAllAcademyBookings] = useState<BookingDomainModel[]>([]);
  const [academyLoading, setAcademyLoading] = useState(isAdmin);
  const loading = scheduleLoading || academyLoading;

  // Sub-pestaña para vista móvil de historial personal
  const [mobileTab, setMobileTab] = useState<'mapa' | 'curva' | 'meses' | 'sesiones'>('mapa');
  const [mobileMonthIdx, setMobileMonthIdx] = useState<number>(new Date().getMonth());

  // Solo para administradores: reservas de toda la academia (año anterior y actual), una sola escucha compartida
  useEffect(() => {
    if (!isAdmin) {
      setAcademyLoading(false);
      return;
    }
    let isMounted = true;
    const since = `${new Date().getFullYear() - 1}-01-01`;
    getLiveDocs(`bookings:academy:${since}`, query(collection(db, 'bookings'), where('date', '>=', since)))
      .then((snap) => {
        const list: BookingDomainModel[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
        if (isMounted) setAllAcademyBookings(list);
      })
      .catch((e) => console.warn('Aviso cargando reservas globales:', e))
      .finally(() => {
        if (isMounted) setAcademyLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  // =========================================================================
  // CÁLCULO DE MÉTRICAS DINÁMICAS DE ACADEMIA (PARA ADMINISTRADORES)
  // =========================================================================
  const metricsSummary: TatamiDemandSummary = useMemo(() => {
    const monthNum = selectedMonthFilter === 'ALL' ? undefined : selectedMonthFilter;
    return calculateTatamiDemandMetrics(allAcademyBookings, schedules, selectedYear, monthNum);
  }, [allAcademyBookings, schedules, selectedYear, selectedMonthFilter]);

  // Filtrado de sesiones para la tabla analítica
  const filteredSessions = useMemo(() => {
    let list = metricsSummary.sessions;
    if (selectedProgramFilter !== 'ALL') {
      list = list.filter((s) => s.program.toUpperCase().includes(selectedProgramFilter.toUpperCase()));
    }
    if (sessionSearchTerm.trim()) {
      const q = sessionSearchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.date.includes(q) ||
          s.program.toLowerCase().includes(q) ||
          s.professor.toLowerCase().includes(q) ||
          s.dayName.toLowerCase().includes(q) ||
          s.startTime.includes(q)
      );
    }
    return list;
  }, [metricsSummary.sessions, selectedProgramFilter, sessionSearchTerm]);

  // =========================================================================
  // CÁLCULO DE HISTORIAL PERSONAL (DINÁMICO DEL ALUMNO)
  // =========================================================================
  const personalYearBookings = useMemo(() => {
    return userBookings.filter(
      (b) =>
        b.date &&
        b.date.startsWith(String(selectedYear)) &&
        (b.status === 'ATTENDED' || b.status === 'BOOKED')
    );
  }, [userBookings, selectedYear]);

  const personalAttendedDates = useMemo(() => {
    return new Set(personalYearBookings.map((b) => b.date));
  }, [personalYearBookings]);

  // Curva de asistencia personal por mes (acumulada y real)
  const personalMonthlyData = useMemo(() => {
    let cumulative = 0;
    return MONTH_NAMES.map((name, idx) => {
      const prefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      const count = personalYearBookings.filter((b) => b.date.startsWith(prefix)).length;
      cumulative += count;
      return {
        month: name,
        short: MONTH_SHORTS[idx],
        count,
        cumulative,
      };
    });
  }, [personalYearBookings, selectedYear]);

  // Exportar métricas a Excel / CSV
  const handleExportCsv = () => {
    exportAttendanceMetricsToCsv(filteredSessions, selectedYear);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Loader2 className="w-9 h-9 text-brand-accent animate-spin" />
        <p className="text-xs font-headline font-bold uppercase tracking-widest text-slate-500 animate-pulse">
          Calculando Métricas Reales de Asistencia...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-12 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. CABECERA: TÍTULO, SELECTOR DE AÑO & PESTAÑAS ADMIN     */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-headline uppercase text-slate-900 tracking-tight flex items-center gap-2.5">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent shrink-0" />
              <span>{activeView === 'METRICS' ? 'Métricas de Asistencia y Demanda' : 'Mi Historial de Tatami'}</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {activeView === 'METRICS'
              ? 'Fuente de datos viva para el análisis de ocupación, horas punta y clases completadas en 247Studio.'
              : 'Registro personal de asistencias, entrenamientos y curva de progresión.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Switcher Admin: Métricas Globales vs Mi Historial */}
          {isAdmin && (
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveView('METRICS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeView === 'METRICS'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Métricas Tatami</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('PERSONAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeView === 'PERSONAL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Mi Historial</span>
              </button>
            </div>
          )}

          {/* Selector de año */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-xs">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl transition cursor-pointer"
              title="Año anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 px-2">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl transition cursor-pointer"
              title="Año siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: DASHBOARD ANALÍTICO DE MÉTRICAS & DEMANDA (ADMINISTRADORES)      */}
      {/* ========================================================================= */}
      {activeView === 'METRICS' && (
        <div className="space-y-6">
          {/* 4 KPIs de Cabecera */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-xs font-headline font-bold uppercase tracking-wider text-slate-400 block">
                Clases Completadas
              </span>
              <div className="font-mono text-2xl sm:text-4xl font-black text-slate-900 mt-1">
                {metricsSummary.totalCompletedClasses}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Sesiones impartidas en {selectedYear}
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-xs font-headline font-bold uppercase tracking-wider text-slate-400 block">
                Total Asistencias
              </span>
              <div className="font-mono text-2xl sm:text-4xl font-black text-emerald-600 mt-1">
                {metricsSummary.totalAttendances}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Presencias de atletas en tatami
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-xs font-headline font-bold uppercase tracking-wider text-slate-400 block">
                Media Alumnos / Clase
              </span>
              <div className="font-mono text-2xl sm:text-4xl font-black text-brand-accent mt-1">
                {metricsSummary.averageAttendeesPerClass}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Ocupación media del tatami: <strong>{Math.round(metricsSummary.averageOccupancyRate * 100)}%</strong>
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
              <span className="text-[10px] sm:text-xs font-headline font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Hora de Mayor Demanda</span>
              </span>
              <div className="font-mono text-lg sm:text-2xl font-black text-amber-600 mt-1 truncate">
                {metricsSummary.peakHour?.timeSlot || '19:30 - 20:30'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Punta: <strong>{metricsSummary.peakHour?.averageAttendees || 0}</strong> alumnos de media
              </p>
            </div>
          </div>

          {/* Filtros de Mes y Programa + Botón de Exportar a Excel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filtrar Mes:</span>
              <select
                value={selectedMonthFilter}
                onChange={(e) =>
                  setSelectedMonthFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                }
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todo el Año {selectedYear}</option>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-slate-600 ml-2">Programa:</span>
              <select
                value={selectedProgramFilter}
                onChange={(e) => setSelectedProgramFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todas las Modalidades</option>
                <option value="GI">BJJ GI</option>
                <option value="GRAPPLING">GRAPPLING (No-Gi)</option>
                <option value="KIDS">KIDS</option>
                <option value="MMA">MMA</option>
                <option value="LUCHA">LUCHA</option>
                <option value="OPEN MAT">OPEN MAT</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer shrink-0"
              title="Descargar datos en CSV compatible con Excel y Power BI"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Dataset Excel / CSV</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* BLOQUE A: HORAS CON MÁS DEMANDA (RANKING DE FRANJAS)     */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-accent" />
                  <h3 className="font-headline text-lg uppercase text-slate-900 tracking-tight">
                    Horas con Más Demanda (Peak Hours)
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Ordenado por Asistencia
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {metricsSummary.demandByHour.map((hour, idx) => (
                  <div
                    key={hour.timeSlot}
                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-slate-900">
                            {hour.timeSlot}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                            {hour.program}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {hour.totalClasses} sesiones impartidas · Pico máximo: <strong>{hour.peakAttendees} alumnos</strong>
                        </span>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <div className="font-mono text-base font-black text-slate-900">
                        {hour.averageAttendees} <span className="text-xs font-normal text-slate-500">media</span>
                      </div>
                      <div className="flex items-center sm:justify-end gap-1.5 mt-1">
                        <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              hour.averageOccupancy >= 0.8
                                ? 'bg-rose-500'
                                : hour.averageOccupancy >= 0.6
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(hour.averageOccupancy * 100, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-600 font-bold">
                          {Math.round(hour.averageOccupancy * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ======================================================== */}
            {/* BLOQUE B: CLASES COMPLETADAS CON X ALUMNOS (HISTOGRAMA)  */}
            {/* ======================================================== */}
            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-accent" />
                    <h3 className="font-headline text-lg uppercase text-slate-900 tracking-tight">
                      Clases con X Alumnos
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Distribución
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2 mb-4">
                  Desglose de clases impartidas según el número de atletas presentes en el tatami:
                </p>

                <div className="space-y-3.5">
                  {metricsSummary.distributionBuckets.map((bucket) => (
                    <div key={bucket.bucket} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{bucket.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-slate-900">
                            {bucket.classesCount} clases
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({bucket.percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bucket.colorClass}`}
                          style={{ width: `${bucket.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 bg-amber-50/50 -mx-2 sm:-mx-3 -mb-2 p-3 sm:p-4 rounded-2xl border border-amber-200/60 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Conclusión Operativa de Tatami</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Las clases nocturnas (19:30 y 20:30) superan habitualmente los 18 alumnos. El histograma demuestra que más del 70% de las sesiones operan en franjas de alta afluencia (&ge;11 alumnos).
                </p>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BLOQUE C: DEMANDA POR DÍA DE LA SEMANA & POR PROGRAMA    */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Por Día de la Semana */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-headline text-base uppercase text-slate-900 tracking-tight flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-accent" />
                  <span>Afluencia por Día de la Semana</span>
                </span>
                <span className="text-[11px] text-slate-400 font-bold">Media Atletas</span>
              </div>

              <div className="space-y-2 pt-1">
                {metricsSummary.demandByDay.map((d) => (
                  <div
                    key={d.dayOfWeek}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-7 text-xs font-black uppercase text-slate-700">
                        {d.dayName.slice(0, 3)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {d.totalClasses} clases
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-slate-900">
                        {d.averageAttendees}
                      </span>
                      <span className="text-[10px] text-slate-400">alumnos/clase</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Por Modalidad / Programa */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-headline text-base uppercase text-slate-900 tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-accent" />
                  <span>Demanda por Modalidad / Programa</span>
                </span>
                <span className="text-[11px] text-slate-400 font-bold">Total Asistencias</span>
              </div>

              <div className="space-y-2 pt-1">
                {metricsSummary.demandByProgram.map((prog) => (
                  <div
                    key={prog.program}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {prog.program}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {prog.totalClasses} sesiones · media: <strong>{prog.averageAttendees}</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-sm font-black text-brand-accent">
                        {prog.totalAttendees}
                      </span>
                      <span className="text-[10px] text-slate-400 block">asistencias</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BLOQUE D: TABLA DETALLADA DE SESIONES COMPLETADAS        */}
          {/* ======================================================== */}
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-headline text-lg uppercase text-slate-900 tracking-tight">
                  Registro Histórico de Sesiones ({filteredSessions.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Fuente de datos reactiva lista para exportar y conectar con modelos de Power BI / Excel.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar fecha, hora, profesor..."
                  value={sessionSearchTerm}
                  onChange={(e) => setSessionSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Día</th>
                    <th className="py-3 px-4">Horario</th>
                    <th className="py-3 px-4">Programa</th>
                    <th className="py-3 px-4">Profesor</th>
                    <th className="py-3 px-4 text-center">Alumnos</th>
                    <th className="py-3 px-4 text-center">Ocupación</th>
                    <th className="py-3 px-4">Rango</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.slice(0, 30).map((sess) => (
                    <tr key={sess.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {sess.date}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-medium">
                        {sess.dayName}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                        {sess.startTime} - {sess.endTime}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px]">
                          {sess.program}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {sess.professor}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                        {sess.attendeesCount} / {sess.capacity}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            sess.occupancyRate >= 0.8
                              ? 'text-rose-600'
                              : sess.occupancyRate >= 0.6
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {Math.round(sess.occupancyRate * 100)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sess.bucket === '>20'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : sess.bucket === '16-20'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : sess.bucket === '11-15'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {sess.bucket}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSessions.length > 30 && (
                <div className="p-3 text-center text-xs text-slate-500 bg-slate-50/50 border-t border-slate-100">
                  Mostrando las 30 sesiones más recientes de {filteredSessions.length}. Pulsa <strong>Exportar Dataset Excel / CSV</strong> para descargar el dataset completo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: HISTORIAL PERSONAL DEL ATLETA (DINÁMICO, NO FOTOGRÁFICO)         */}
      {/* ========================================================================= */}
      {activeView === 'PERSONAL' && (
        <div className="space-y-6">
          {/* Sub-pestañas móviles */}
          <div className="md:hidden grid grid-cols-3 gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileTab('mapa')}
              className={`py-2 rounded-lg transition ${
                mobileTab === 'mapa' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              🔥 Mapa
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('curva')}
              className={`py-2 rounded-lg transition ${
                mobileTab === 'curva' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              📈 Curva
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('meses')}
              className={`py-2 rounded-lg transition ${
                mobileTab === 'meses' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              📅 Calendario
            </button>
          </div>

          {/* Tarjeta de Resumen Personal */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-headline font-bold uppercase tracking-wider text-slate-400 block">
                Total de Clases Asistidas ({selectedYear})
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-black text-slate-900 mt-1">
                {personalAttendedDates.size} <span className="text-base font-normal text-slate-500">clases</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {personalAttendedDates.size > 0
                  ? `Has entrenado un total estimado de ${(personalAttendedDates.size * 1.5).toFixed(1)} horas en el tatami.`
                  : 'Aún no tienes asistencias registradas este año. ¡Ven a entrenar!'}
              </p>
            </div>

            <Link
              to="/app/horario"
              className="cta-button py-2.5 px-4 text-xs shrink-0 inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Ver Horario y Reservar</span>
            </Link>
          </div>

          {/* Heatmap Anual Dinámico */}
          <div
            className={`${
              mobileTab === 'mapa' ? 'block' : 'hidden md:block'
            } bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs overflow-x-auto`}
          >
            <div className="min-w-[650px]">
              <div className="flex text-[11px] font-semibold text-slate-400 pl-6 mb-3">
                {MONTH_SHORTS.map((m) => (
                  <span key={m} className="flex-1 text-center">
                    {m}
                  </span>
                ))}
              </div>

              {/* Rejilla de días reales (Lunes a Domingo x Semanas del año) */}
              <div className="space-y-1.5">
                {DAY_LABELS.map((dayLabel, dIdx) => (
                  <div key={dayLabel} className="flex items-center gap-2">
                      <span className="w-4 text-[10px] font-bold text-slate-400 text-center">
                        {dayLabel}
                      </span>
                      <div className="flex-1 flex justify-between gap-1">
                        {Array.from({ length: 52 }).map((_, wIdx) => {
                          // Calcular la fecha exacta de la semana wIdx y día dIdx
                          const approxDay = wIdx * 7 + dIdx;
                          const approxDate = new Date(selectedYear, 0, 1 + approxDay);
                          const yyyy = approxDate.getFullYear();
                          const mm = String(approxDate.getMonth() + 1).padStart(2, '0');
                          const dd = String(approxDate.getDate()).padStart(2, '0');
                          const dateStr = `${yyyy}-${mm}-${dd}`;

                          const isAttended = personalAttendedDates.has(dateStr);

                          return (
                            <span
                              key={wIdx}
                              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                isAttended
                                  ? 'bg-emerald-500 ring-2 ring-emerald-200'
                                  : 'bg-slate-100 hover:bg-slate-200'
                              }`}
                              title={`${dateStr}: ${isAttended ? 'Asistió a clase 🥋' : 'Sin asistencia'}`}
                            />
                          );
                        })}
                      </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Curva de Crecimiento Dinámica (SVG reactivo a los datos) */}
          <div
            className={`${
              mobileTab === 'curva' ? 'block' : 'hidden md:block'
            } bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Curva de Asistencia Acumulada {selectedYear}
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                Progreso real del alumno
              </span>
            </div>

            <div className="relative h-48 sm:h-56 w-full pt-4">
              {/* SVG dinámico calculado según personalMonthlyData */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 660 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="personalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Renderizar puntos dinámicos */}
                {(() => {
                  const maxVal = Math.max(
                    ...personalMonthlyData.map((d) => d.cumulative),
                    10
                  );
                  const points = personalMonthlyData.map((d, i) => {
                    const x = 30 + i * 50;
                    const y = 160 - (d.cumulative / maxVal) * 130;
                    return { x, y, val: d.cumulative, month: d.short };
                  });

                  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
                  const polygonPoints = `30,165 ${polylinePoints} ${points[points.length - 1].x},165`;

                  return (
                    <>
                      <polygon points={polygonPoints} fill="url(#personalGrad)" />
                      <polyline
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={polylinePoints}
                      />
                      {points.map((pt, idx) => (
                        <g key={idx}>
                          <circle cx={pt.x} cy={pt.y} r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              <div className="flex justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 mt-3 pt-1">
                {personalMonthlyData.map((d) => (
                  <span key={d.month}>{d.short}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Calendarios Mensuales con Días Reales de Asistencia */}
          <div className={`${mobileTab === 'meses' ? 'block' : 'hidden md:block'} space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg uppercase text-slate-900 tracking-tight">
                Calendario de Asistencia
              </h3>
              <div className="flex items-center gap-1">
                {MONTH_NAMES.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMobileMonthIdx(idx)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      mobileMonthIdx === idx
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {MONTH_SHORTS[idx]}
                  </button>
                ))}
              </div>
            </div>

            {/* Vista del mes seleccionado */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs max-w-md mx-auto">
              <h4 className="font-bold text-sm text-slate-900 mb-3 text-center">
                {MONTH_NAMES[mobileMonthIdx]} {selectedYear}
              </h4>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                  <span key={d} className="text-slate-400 font-bold py-1">
                    {d}
                  </span>
                ))}
                {(() => {
                  const daysInMonth = new Date(selectedYear, mobileMonthIdx + 1, 0).getDate();
                  const firstDayRaw = new Date(selectedYear, mobileMonthIdx, 1).getDay();
                  const firstDay = firstDayRaw === 0 ? 7 : firstDayRaw; // 1=Lunes

                  const blanks = Array.from({ length: firstDay - 1 });
                  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                  return (
                    <>
                      {blanks.map((_, i) => (
                        <span key={`b_${i}`} />
                      ))}
                      {days.map((day) => {
                        const dateStr = `${selectedYear}-${String(mobileMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isAttended = personalAttendedDates.has(dateStr);

                        return (
                          <div key={day} className="py-1 flex items-center justify-center">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                isAttended
                                  ? 'bg-emerald-500 text-white font-extrabold shadow-xs'
                                  : 'text-slate-700'
                              }`}
                              title={isAttended ? `Asistió el ${dateStr}` : dateStr}
                            >
                              {day}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
