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
  Award,
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  UserCheck,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { triggerPromotionConfetti } from '@/shared/utils/confetti';
import { generateGraduationDiplomaPdf } from '@/shared/utils/diplomaGenerator';
import { downloadAttendanceSheetPdf } from '@/shared/utils/attendanceSheetGenerator';
import { getAttendanceWeight } from '@/shared/domain/attendance';
import { calculateAthleteXP, getNextPromotion } from '@/shared/domain/graduation';
import { DEFAULT_OFFICIAL_SCHEDULES, getMadridTimeComponents } from '@/shared/domain/schedule';
import {
  BookingDomainModel,
  BookingStatus,
  ScheduleDomainModel,
  SessionType,
} from '@/shared/domain/types';
import { Belt, beltLabelEs } from '@/widgets/Belt';

interface StudentDirectoryItem {
  uid: string;
  alias: string;
  belt: string;
  stripes: number;
  beltSystem: string;
  phone?: string;
  accountStatus: string;
}

export const AttendanceAdminPage: React.FC = () => {
  const now = new Date();
  const madridNow = getMadridTimeComponents(now);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(madridNow.dateStr);
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [bookings, setBookings] = useState<BookingDomainModel[]>([]);
  const [students, setStudents] = useState<Record<string, StudentDirectoryItem>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal para añadir alumno fuera de lista
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [addSessionType, setAddSessionType] = useState<SessionType>('PARTICIPANT');

  // Vista de informe mensual y graduaciones
  const [viewMode, setViewMode] = useState<'SHEET' | 'MONTHLY_REPORT' | 'GRADUATIONS'>('SHEET');
  const [reportMonth, setReportMonth] = useState<string>(madridNow.dateStr.slice(0, 7)); // YYYY-MM
  const [monthlyBookings, setMonthlyBookings] = useState<BookingDomainModel[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // 1. Cargar directorio de alumnos para referencias de nombre y cinturón
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        const map: Record<string, StudentDirectoryItem> = {};
        uSnap.forEach((d) => {
          const data = d.data();
          map[d.id] = {
            uid: d.id,
            alias: data.alias || 'Alumno',
            belt: data.belt || 'WHITE',
            stripes: Number(data.stripes || 0),
            beltSystem: data.beltSystem || 'ADULT',
            phone: data.phone || '',
            accountStatus: data.accountStatus || 'ACTIVE',
          };
        });

        // Complementar con kiosk_members si hay alumnos solo en kiosk
        const kSnap = await getDocs(collection(db, 'kiosk_members'));
        kSnap.forEach((d) => {
          if (!map[d.id]) {
            const data = d.data();
            map[d.id] = {
              uid: d.id,
              alias: data.alias || 'Alumno',
              belt: data.belt || 'WHITE',
              stripes: Number(data.stripes || 0),
              beltSystem: data.beltSystem || 'ADULT',
              accountStatus: data.accountStatus || 'ACTIVE',
            };
          }
        });

        setStudents(map);
      } catch (err) {
        console.error('Error cargando estudiantes:', err);
      }
    };
    fetchStudents();
  }, []);

  // 2. Cargar horarios activos
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const sSnap = await getDocs(query(collection(db, 'schedules'), where('active', '==', true)));
        const list: ScheduleDomainModel[] = [];
        sSnap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
        const effectiveList = list.length > 0 ? list : DEFAULT_OFFICIAL_SCHEDULES;
        setSchedules(effectiveList);
      } catch (err) {
        console.error('Error cargando horarios:', err);
        setSchedules(DEFAULT_OFFICIAL_SCHEDULES);
      }
    };
    fetchSchedules();
  }, []);

  // 3. Calcular día de la semana para la fecha seleccionada (1 = Lunes, 7 = Domingo)
  const getDayOfWeekForDate = (dateStr: string): number => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const day = dateObj.getUTCDay(); // 0 = Domingo, 1 = Lunes
    return day === 0 ? 7 : day;
  };

  const dayOfWeek = getDayOfWeekForDate(selectedDateStr);
  const daySchedules = schedules
    .filter((s) => s.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Auto-seleccionar primera clase del día si cambia la fecha
  useEffect(() => {
    if (daySchedules.length > 0) {
      if (!daySchedules.some((s) => s.id === selectedScheduleId)) {
        setSelectedScheduleId(daySchedules[0].id);
      }
    } else {
      setSelectedScheduleId('');
    }
  }, [selectedDateStr, schedules]);

  const activeSchedule = schedules.find((s) => s.id === selectedScheduleId);

  // 4. Cargar reservas y asistencias para la clase y fecha activa
  const fetchClassBookings = async () => {
    if (!selectedScheduleId || !selectedDateStr) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'bookings'),
        where('scheduleId', '==', selectedScheduleId),
        where('date', '==', selectedDateStr)
      );
      const snap = await getDocs(q);
      const list: BookingDomainModel[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<BookingDomainModel, 'id'>) }));
      setBookings(list);
    } catch (err) {
      console.error('Error cargando reservas de clase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassBookings();
  }, [selectedScheduleId, selectedDateStr]);

  // Contadores de la sesión
  const attendedBookings = bookings.filter((b) => b.status === 'ATTENDED');
  const pendingBookings = bookings.filter((b) => b.status === 'BOOKED');
  const waitlistedBookings = bookings.filter((b) => b.status === 'WAITLISTED');
  const participantCount = attendedBookings.filter((b) => b.sessionType === 'PARTICIPANT').length;
  const observerCount = attendedBookings.filter((b) => b.sessionType === 'OBSERVER').length;
  const graduationCount = attendedBookings.filter((b) => b.sessionType === 'GRADUATION_CLASS').length;
  const maxCapacity = activeSchedule?.capacity || 26;

  // ACCIÓN 1: "Check in all" - Confirmar todos los pendientes a ATTENDED
  const handleCheckInAll = async () => {
    if (pendingBookings.length === 0) return;
    setActionLoading('ALL');
    setMessage(null);

    try {
      for (const booking of pendingBookings) {
        await updateDoc(doc(db, 'bookings', booking.id), {
          status: 'ATTENDED',
          checkInSource: 'ADMIN',
          sessionType: booking.sessionType || 'PARTICIPANT',
          attendanceWeight: getAttendanceWeight(booking.sessionType || 'PARTICIPANT'),
        });
      }

      // Actualizar contador agregado class_capacity
      const capRef = doc(db, 'class_capacity', `cap_${selectedScheduleId}_${selectedDateStr}`);
      await setDoc(
        capRef,
        {
          scheduleId: selectedScheduleId,
          date: selectedDateStr,
          bookedCount: attendedBookings.length + pendingBookings.length,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage({
        text: `¡Confirmados ${pendingBookings.length} alumnos presentes con éxito!`,
        type: 'success',
      });
      await fetchClassBookings();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error al confirmar pendientes.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 2: Cambiar estado individual (Check-in individual o Deshacer)
  const handleToggleAttendance = async (booking: BookingDomainModel) => {
    setActionLoading(booking.id);
    setMessage(null);

    const isCurrentlyAttended = booking.status === 'ATTENDED';
    const newStatus: BookingStatus = isCurrentlyAttended ? 'BOOKED' : 'ATTENDED';

    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: newStatus,
        checkInSource: 'ADMIN',
        attendanceWeight: newStatus === 'ATTENDED' ? getAttendanceWeight(booking.sessionType) : 1.0,
      });

      // Sincronizar class_capacity
      const capRef = doc(db, 'class_capacity', `cap_${selectedScheduleId}_${selectedDateStr}`);
      await setDoc(
        capRef,
        {
          scheduleId: selectedScheduleId,
          date: selectedDateStr,
          bookedCount: increment(newStatus === 'ATTENDED' ? 0 : 0),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await fetchClassBookings();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error al actualizar asistencia.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 3: Cambiar modalidad de sesión (Participante / Observador / Graduación)
  const handleChangeSessionType = async (booking: BookingDomainModel, newType: SessionType) => {
    setActionLoading(booking.id);
    try {
      const weight = getAttendanceWeight(newType);
      await updateDoc(doc(db, 'bookings', booking.id), {
        sessionType: newType,
        attendanceWeight: weight,
      });
      await fetchClassBookings();
    } catch (err: unknown) {
      console.error('Error cambiando tipo de sesión:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 4: Añadir alumno manualmente fuera de lista (Walk-in / Asistencia directa)
  const handleAddStudentManual = async (targetStudent: StudentDirectoryItem) => {
    if (!activeSchedule) return;
    setActionLoading(`add_${targetStudent.uid}`);
    setMessage(null);

    try {
      const bookingId = `bk_${targetStudent.uid}_${activeSchedule.id}_${selectedDateStr}`;
      const weight = getAttendanceWeight(addSessionType);

      await setDoc(doc(db, 'bookings', bookingId), {
        uid: targetStudent.uid,
        scheduleId: activeSchedule.id,
        date: selectedDateStr,
        status: 'ATTENDED',
        sessionType: addSessionType,
        attendanceWeight: weight,
        checkInSource: 'ADMIN',
        createdAt: serverTimestamp(),
      });

      // Incrementar contador class_capacity
      const capRef = doc(db, 'class_capacity', `cap_${activeSchedule.id}_${selectedDateStr}`);
      await setDoc(
        capRef,
        {
          scheduleId: activeSchedule.id,
          date: selectedDateStr,
          bookedCount: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage({
        text: `${targetStudent.alias} añadido como asistente presente.`,
        type: 'success',
      });
      setAddModalOpen(false);
      setAddSearchTerm('');
      await fetchClassBookings();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'No se pudo añadir al alumno.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 5: Eliminar o cancelar reserva
  const handleRemoveBooking = async (booking: BookingDomainModel) => {
    if (!confirm('¿Seguro que deseas eliminar esta reserva/asistencia?')) return;
    setActionLoading(booking.id);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp(),
      });

      const capRef = doc(db, 'class_capacity', `cap_${selectedScheduleId}_${selectedDateStr}`);
      await setDoc(
        capRef,
        {
          scheduleId: selectedScheduleId,
          date: selectedDateStr,
          bookedCount: increment(-1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await fetchClassBookings();
    } catch (err: unknown) {
      console.error('Error eliminando reserva:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Cargar datos para el informe mensual
  const fetchMonthlyReport = async () => {
    setLoadingReport(true);
    try {
      const q = query(
        collection(db, 'bookings'),
        where('status', '==', 'ATTENDED')
      );
      const snap = await getDocs(q);
      const list: BookingDomainModel[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<BookingDomainModel, 'id'>;
        if (data.date && data.date.startsWith(reportMonth)) {
          list.push({ id: d.id, ...data });
        }
      });
      setMonthlyBookings(list);
    } catch (err) {
      console.error('Error cargando informe mensual:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'MONTHLY_REPORT' || viewMode === 'GRADUATIONS') {
      fetchMonthlyReport();
    }
  }, [viewMode, reportMonth]);

  // ACCIÓN DE GRADUACIÓN: Conceder raya o ascender cinturón
  const handlePromoteStudent = async (student: StudentDirectoryItem) => {
    const promotion = getNextPromotion(student.belt as any, student.stripes, student.beltSystem as any);
    const label = promotion.isBeltPromotion
      ? `ascender al Cinturón ${beltLabelEs(promotion.nextBelt)}`
      : `otorgar la raya ${promotion.nextStripes}º grado`;

    if (!confirm(`¿Confirmas ${label} a ${student.alias}?`)) {
      return;
    }

    setActionLoading(`promote_${student.uid}`);
    try {
      await updateDoc(doc(db, 'users', student.uid), {
        belt: promotion.nextBelt,
        stripes: promotion.nextStripes,
        beltDate: madridNow.dateStr,
        updatedAt: serverTimestamp(),
      });

      // Actualizar estado local en memoria
      setStudents((prev) => ({
        ...prev,
        [student.uid]: {
          ...prev[student.uid],
          belt: promotion.nextBelt,
          stripes: promotion.nextStripes,
        },
      }));

      triggerPromotionConfetti();

      setMessage({
        text: `¡Graduación completada! ${student.alias} ahora tiene ${beltLabelEs(promotion.nextBelt)} (${promotion.nextStripes} grados).`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error('Error graduando alumno:', err);
      setMessage({
        text: err instanceof Error ? err.message : 'Error al procesar graduación.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Alumnos filtrados para añadir manualmente
  const filteredStudentsToAdd = Object.values(students).filter((s) => {
    const matchesSearch = s.alias.toLowerCase().includes(addSearchTerm.toLowerCase());
    const alreadyInClass = bookings.some((b) => b.uid === s.uid && b.status !== 'CANCELLED');
    return matchesSearch && !alreadyInClass;
  });

  // Agregación de estadísticas por alumno para el informe mensual
  const studentMonthlyAggregates = Object.values(students).map((st) => {
    const studentBookings = monthlyBookings.filter((b) => b.uid === st.uid);
    const totalAttendances = studentBookings.length;
    const totalPoints = studentBookings.reduce((sum, b) => sum + (b.attendanceWeight || 1.0), 0);
    const participantCount = studentBookings.filter((b) => b.sessionType === 'PARTICIPANT').length;
    const observerCount = studentBookings.filter((b) => b.sessionType === 'OBSERVER').length;
    const graduationCount = studentBookings.filter((b) => b.sessionType === 'GRADUATION_CLASS').length;
    return {
      student: st,
      totalAttendances,
      totalPoints,
      participantCount,
      observerCount,
      graduationCount,
    };
  }).filter((item) => item.totalAttendances > 0).sort((a, b) => b.totalPoints - a.totalPoints);

  const handleExportCsv = () => {
    if (studentMonthlyAggregates.length === 0) {
      alert('No hay datos de asistencia para exportar en el mes seleccionado.');
      return;
    }

    const headers = [
      'Posición',
      'Alumno',
      'Cinturón',
      'Grados',
      'Total Clases',
      'Puntos Graduación',
      'Participante',
      'Observador',
      'Graduación',
    ];

    const rows = studentMonthlyAggregates.map((item, index) => [
      index + 1,
      `"${item.student.alias.replace(/"/g, '""')}"`,
      `"${beltLabelEs(item.student.belt)}"`,
      item.student.stripes,
      item.totalAttendances,
      item.totalPoints.toFixed(1),
      item.participantCount,
      item.observerCount,
      item.graduationCount,
    ]);

    const csvContent =
      '\ufeff' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `247studio_asistencias_${reportMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAttendanceSheet = () => {
    if (!activeSchedule) return;
    const list = bookings.map((b) => {
      const s = students[b.uid];
      return {
        alias: s?.alias || 'Atleta',
        belt: beltLabelEs((s?.belt as any) || 'WHITE'),
        stripes: Number(s?.stripes || 0),
      };
    });
    downloadAttendanceSheetPdf({
      className: activeSchedule.program,
      scheduleTime: `${activeSchedule.startTime} - ${activeSchedule.endTime}`,
      dateStr: selectedDateStr,
      instructor: activeSchedule.professor || 'Mario / David',
      students: list,
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Encabezado y Selector de Modo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-wide text-slate-900">
              Hoja de Asistencia
            </h1>
            <span className="text-[10px] bg-brand-accent text-white font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              Profesor / MatGoat
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de asistencia en tatami, confirmación masiva, corrección de sesiones pasadas y cálculo para graduaciones.
          </p>
        </div>

        {/* Toggle entre Hoja Diaria, Informe Mensual y Graduaciones */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('SHEET')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'SHEET'
                ? 'bg-brand-accent text-white shadow'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Por Sesión</span>
          </button>
          <button
            onClick={() => setViewMode('MONTHLY_REPORT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'MONTHLY_REPORT'
                ? 'bg-brand-accent text-white shadow'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Informe Mensual</span>
          </button>
          <button
            onClick={() => setViewMode('GRADUATIONS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'GRADUATIONS'
                ? 'bg-brand-accent text-white shadow'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Graduaciones & Gamificación</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : 'bg-studio-red/15 border-studio-red/40 text-studio-red'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 1: HOJA DE ASISTENCIA POR SESIÓN                                    */}
      {/* ========================================================================= */}
      {viewMode === 'SHEET' && (
        <div className="space-y-6">
          {/* Selector de Fecha y Atajos */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-studio-red" />
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Fecha de la Clase
                </label>
                <input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="bg-slate-50 text-slate-900 text-sm font-bold px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-studio-red"
                />
              </div>
            </div>

            {/* Atajos rápidos: Ayer / Hoy / Mañana */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(new Date(selectedDateStr).getTime() - 24 * 60 * 60 * 1000);
                  setSelectedDateStr(getMadridTimeComponents(d).dateStr);
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200/80"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button
                onClick={() => setSelectedDateStr(madridNow.dateStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  selectedDateStr === madridNow.dateStr
                    ? 'bg-studio-red/20 text-studio-red border-studio-red/40'
                    : 'bg-white/5 hover:bg-white/10 text-slate-700 border-slate-200/80'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => {
                  const d = new Date(new Date(selectedDateStr).getTime() + 24 * 60 * 60 * 1000);
                  setSelectedDateStr(getMadridTimeComponents(d).dateStr);
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200/80"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Carrusel / Parrilla de clases del día seleccionado */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Clases programadas ({daySchedules.length})
            </span>
            {daySchedules.length === 0 ? (
              <div className="bg-white/60 p-6 rounded-2xl border border-slate-200/80 text-center text-sm text-slate-500">
                No hay clases registradas en la parrilla oficial para este día de la semana.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {daySchedules.map((sched) => {
                  const isSelected = sched.id === selectedScheduleId;
                  return (
                    <button
                      key={sched.id}
                      onClick={() => setSelectedScheduleId(sched.id)}
                      className={`p-3.5 rounded-2xl text-left border transition relative flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-studio-red/15 border-studio-red shadow-lg shadow-studio-red/10'
                          : 'bg-white border-slate-200/80 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg text-slate-900">{sched.startTime}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-700">
                          {sched.program}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-900 truncate">
                          {sched.program}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Prof. {sched.professor}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ficha Resumen de la Sesión Activa */}
          {activeSchedule && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-3xl uppercase text-slate-900">
                      {activeSchedule.program}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded bg-brand-accent text-white text-xs font-black">
                      {activeSchedule.startTime} - {activeSchedule.endTime}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Profesor: <strong className="text-slate-900">{activeSchedule.professor}</strong> • Capacidad máxima:{' '}
                    <strong className="text-slate-900">{maxCapacity} alumnos</strong>
                  </p>
                </div>

                {/* Acciones principales de la sesión */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleCheckInAll}
                    disabled={pendingBookings.length === 0 || actionLoading === 'ALL'}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                    title="Marca automáticamente todos los alumnos en reserva como presentes"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Check In All ({pendingBookings.length} pendientes)</span>
                  </button>

                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="px-4 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Añadir Alumno</span>
                  </button>

                  <button
                    onClick={handleDownloadAttendanceSheet}
                    className="px-3.5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                    title="Descargar hoja de asistencia oficial en PDF para imprimir y llevar en la carpeta del tatami"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Hoja Tatami (PDF)</span>
                  </button>
                </div>
              </div>

              {/* Tarjetas de Contadores en Tiempo Real */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-200/80">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Presentes en Tatami
                  </span>
                  <div className="font-display num text-3xl text-emerald-400 mt-0.5">
                    {attendedBookings.length}
                    <span className="text-xs font-sans text-slate-400 ml-1.5">
                      / {maxCapacity}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {participantCount} part. • {observerCount} obs.{graduationCount > 0 ? ` • ${graduationCount} grad.` : ''}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Reservados Pendientes
                  </span>
                  <div className="font-display num text-3xl text-amber-400 mt-0.5">
                    {pendingBookings.length}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Reservaron por app
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Lista de Espera
                  </span>
                  <div className="font-display num text-3xl text-blue-400 mt-0.5">
                    {waitlistedBookings.length}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    En cola por aforo lleno
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Puntos de Graduación
                  </span>
                  <div className="font-display num text-3xl text-purple-400 mt-0.5">
                    {attendedBookings.reduce((sum, b) => sum + (b.attendanceWeight || 1.0), 0).toFixed(1)}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Suma total ponderada
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tabla / Lista de Alumnos de la Sesión */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
              <span className="font-display text-xl text-slate-900">
                Lista de Alumnos ({bookings.length})
              </span>
              <span className="text-xs text-slate-500">
                {activeSchedule ? `${activeSchedule.program} • ${selectedDateStr}` : ''}
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No hay reservas registradas para esta sesión. Pulsa en <strong>“Añadir Alumno”</strong> para registrar a alguien directamente en el tatami.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="py-3.5 px-4">Alumno</th>
                      <th className="py-3.5 px-4">Cinturón</th>
                      <th className="py-3.5 px-4">Modalidad</th>
                      <th className="py-3.5 px-4">Origen</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bookings.map((booking) => {
                      const student = students[booking.uid] || {
                        uid: booking.uid,
                        alias: 'Alumno desconocido',
                        belt: 'WHITE',
                        stripes: 0,
                        beltSystem: 'ADULT',
                        accountStatus: 'ACTIVE',
                      };
                      const isAttended = booking.status === 'ATTENDED';

                      return (
                        <tr
                          key={booking.id}
                          className={`hover:bg-white/[0.02] transition ${
                            isAttended ? 'bg-emerald-500/[0.04]' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-sm text-slate-900 block">
                              {student.alias}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {student.phone || 'Sin teléfono'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16">
                                <Belt belt={student.belt} stripes={student.stripes} decorative className="h-4" />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-900">
                                {beltLabelEs(student.belt)}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={booking.sessionType || 'PARTICIPANT'}
                              onChange={(e) =>
                                handleChangeSessionType(booking, e.target.value as SessionType)
                              }
                              disabled={actionLoading === booking.id}
                              className="bg-slate-50 text-slate-900 text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none"
                            >
                              <option value="PARTICIPANT">Participante (x1.0)</option>
                              <option value="OBSERVER">Observador / Lesionado (x0.5)</option>
                              <option value="GRADUATION_CLASS">Graduación (x3.0)</option>
                            </select>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-600 border border-slate-200/80 uppercase">
                              {booking.checkInSource || 'APP'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isAttended
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : booking.status === 'BOOKED'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : booking.status === 'WAITLISTED'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-studio-red/20 text-studio-red border border-studio-red/30'
                              }`}
                            >
                              {isAttended
                                ? 'Presente'
                                : booking.status === 'BOOKED'
                                ? 'Pendiente'
                                : booking.status === 'WAITLISTED'
                                ? 'En Espera'
                                : 'Cancelado'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleAttendance(booking)}
                                disabled={actionLoading === booking.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer ${
                                  isAttended
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                }`}
                                title={isAttended ? 'Deshacer check-in' : 'Confirmar check-in'}
                              >
                                {isAttended ? (
                                  <>
                                    <RotateCcw className="w-3 h-3" /> Deshacer
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3" /> Presente
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleRemoveBooking(booking)}
                                disabled={actionLoading === booking.id}
                                className="p-1.5 bg-studio-red/10 hover:bg-studio-red/20 text-studio-red rounded-lg transition"
                                title="Eliminar de la clase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: INFORME MENSUAL DE ASISTENCIA Y GRADUACIONES                     */}
      {/* ========================================================================= */}
      {viewMode === 'MONTHLY_REPORT' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-studio-red" />
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Mes del Informe
                </label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="bg-slate-50 text-slate-900 text-sm font-bold px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow cursor-pointer transition"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow cursor-pointer transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Informe</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
              <span className="font-display text-xl text-slate-900">
                Ranking de Asistencias y Puntos — {reportMonth}
              </span>
              <span className="text-xs text-slate-400">
                {studentMonthlyAggregates.length} atletas activos
              </span>
            </div>

            {loadingReport ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-8 h-8 border-3 border-studio-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : studentMonthlyAggregates.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No hay asistencias registradas en el mes seleccionado ({reportMonth}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="py-3.5 px-4">#</th>
                      <th className="py-3.5 px-4">Atleta</th>
                      <th className="py-3.5 px-4">Cinturón</th>
                      <th className="py-3.5 px-4 text-center">Clases Asistidas</th>
                      <th className="py-3.5 px-4 text-center">Puntos Acumulados</th>
                      <th className="py-3.5 px-4 text-right">Desglose (Part / Obs / Grad)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {studentMonthlyAggregates.map((item, index) => (
                      <tr key={item.student.uid} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 text-sm block">
                            {item.student.alias}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-700">
                            {beltLabelEs(item.student.belt)}, {item.student.stripes} grados
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-display num text-lg text-slate-900">
                          {item.totalAttendances}
                        </td>
                        <td className="py-3.5 px-4 text-center font-display num text-lg text-purple-400 font-bold">
                          {item.totalPoints.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500">
                          {item.participantCount} / {item.observerCount} / {item.graduationCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: CEREMONIA DE GRADUACIONES Y GAMIFICACIÓN (PROFESORES 247)         */}
      {/* ========================================================================= */}
      {viewMode === 'GRADUATIONS' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Cabecera de la Ceremonia */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Candidatos a Graduación
              </span>
              <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                {studentMonthlyAggregates.filter((s) => s.totalPoints >= 25).length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Alumnos con &ge; 25 puntos de tatami listos para raya o cinturón.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-brand-accent" /> Censo Total en Evaluación
              </span>
              <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                {studentMonthlyAggregates.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Atletas activos con asistencia registrada este mes.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Criterio Oficial 247Studio
              </span>
              <div className="text-sm font-extrabold text-slate-800 mt-2">
                25 Clases / 1 Raya BJJ
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Graduación por horas de tatami y evaluación técnica de Mario y David.
              </p>
            </div>
          </div>

          {/* Tabla de Graduación y Promoción Rápida */}
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Panel de Evaluación y Ascenso de Grados
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Concede rayas (stripes) o ascensos de cinturón con un solo clic. El alumno verá su nueva ficha y medalla al instante.
                </p>
              </div>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Acta CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-4 px-5">Pos</th>
                    <th className="py-4 px-4">Atleta</th>
                    <th className="py-4 px-4">Cinturón Actual</th>
                    <th className="py-4 px-4 text-center">Clases / Puntos</th>
                    <th className="py-4 px-4">Progreso Raya</th>
                    <th className="py-4 px-4">Próximo Escalón</th>
                    <th className="py-4 px-5 text-right">Acción de Grado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentMonthlyAggregates.map((item, index) => {
                    const st = item.student;
                    const promotion = getNextPromotion(st.belt as any, st.stripes, st.beltSystem as any);
                    const isReady = item.totalPoints >= 25;
                    const pct = Math.min(100, Math.round((item.totalPoints / 25) * 100));
                    const xpData = calculateAthleteXP(item.totalAttendances);

                    return (
                      <tr key={st.uid} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-5 font-mono font-bold text-slate-400">
                          #{index + 1}
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-extrabold text-sm text-slate-900">{st.alias}</div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {st.beltSystem === 'KIDS' ? 'Categoría Infantil' : 'Adulto'} · Nivel {xpData.level}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="w-24 mb-1">
                            <Belt belt={st.belt} stripes={st.stripes} decorative className="h-4" />
                          </div>
                          <span className="font-bold text-slate-800 text-[11px] block">
                            {beltLabelEs(st.belt)}, {st.stripes} {st.stripes === 1 ? 'grado' : 'grados'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="font-mono text-base font-black text-slate-900 block">
                            {item.totalAttendances}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-purple-600 block">
                            {item.totalPoints.toFixed(1)} pts
                          </span>
                        </td>

                        <td className="py-4 px-4 min-w-[130px]">
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                            <span className={isReady ? 'text-emerald-700' : 'text-slate-500'}>
                              {item.totalPoints.toFixed(0)} / 25
                            </span>
                            <span className="font-mono text-slate-400">{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isReady ? 'bg-emerald-500' : 'bg-slate-900'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {isReady ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Sparkles className="w-3 h-3 text-amber-600" /> ¡Listo para evaluar!
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px] font-medium block">
                              {promotion.isBeltPromotion ? `Cinturón ${beltLabelEs(promotion.nextBelt)}` : `${promotion.nextStripes}º Grado`}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              generateGraduationDiplomaPdf(st as any);
                              triggerPromotionConfetti();
                            }}
                            title="Descargar Diploma Oficial en PDF"
                            className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition inline-flex items-center gap-1 text-xs font-bold shadow-2xs cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            <span className="hidden sm:inline">Diploma PDF</span>
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading === `promote_${st.uid}`}
                            onClick={() => handlePromoteStudent(st)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer ${
                              isReady
                                ? 'bg-brand-accent hover:bg-red-700 text-white shadow-brand-accent/20'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>
                              {promotion.isBeltPromotion ? 'Ascender Cinturón' : '+1 Grado'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AÑADIR ALUMNO MANUALMENTE A LA SESIÓN                              */}
      {/* ========================================================================= */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
              <h3 className="font-display text-2xl text-slate-900">
                Añadir Alumno al Tatami
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-700 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Buscar Atleta por Nombre
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-700/50 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={addSearchTerm}
                    onChange={(e) => setAddSearchTerm(e.target.value)}
                    placeholder="Escribe el nombre del alumno..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-studio-red"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Modalidad de Asistencia
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddSessionType('PARTICIPANT')}
                    className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                      addSessionType === 'PARTICIPANT'
                        ? 'bg-studio-red/20 border-studio-red text-slate-900'
                        : 'bg-slate-50 border-slate-200/80 text-slate-500'
                    }`}
                  >
                    Participante (1.0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddSessionType('OBSERVER')}
                    className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                      addSessionType === 'OBSERVER'
                        ? 'bg-studio-red/20 border-studio-red text-slate-900'
                        : 'bg-slate-50 border-slate-200/80 text-slate-500'
                    }`}
                  >
                    Observador (0.5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddSessionType('GRADUATION_CLASS')}
                    className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                      addSessionType === 'GRADUATION_CLASS'
                        ? 'bg-studio-red/20 border-studio-red text-slate-900'
                        : 'bg-slate-50 border-slate-200/80 text-slate-500'
                    }`}
                  >
                    Graduación (3.0)
                  </button>
                </div>
              </div>

              {/* Lista de resultados filtrados */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pt-2">
                {filteredStudentsToAdd.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">
                    {addSearchTerm ? 'No se encontraron alumnos con ese nombre.' : 'Escribe para buscar...'}
                  </p>
                ) : (
                  filteredStudentsToAdd.slice(0, 8).map((st) => (
                    <div
                      key={st.uid}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12">
                          <Belt belt={st.belt} stripes={st.stripes} decorative className="h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">{st.alias}</span>
                          <span className="text-[10px] text-slate-400">
                            {beltLabelEs(st.belt)} • {st.stripes} grados
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddStudentManual(st)}
                        disabled={actionLoading === `add_${st.uid}`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
