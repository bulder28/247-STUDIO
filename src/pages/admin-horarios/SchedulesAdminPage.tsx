import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { getLiveDocs } from '@/shared/api/liveReads';
import {
  calculateScheduleDurationMinutes,
  calculateWeeklyStats,
  DEFAULT_OFFICIAL_SCHEDULES,
  detectScheduleConflicts,
  getProgramTheme,
  ScheduleConflict,
} from '@/shared/domain/schedule';
import { LevelRequired, ScheduleDomainModel, ScheduleExceptionDomainModel } from '@/shared/domain/types';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';

const PROGRAM_SUGGESTIONS = [
  'GI',
  'GRAPPLING',
  'KIDS 1',
  'KIDS 2',
  'MMA',
  'LUCHA',
  'BJJ FEM',
  'OPEN MAT',
  'COMP CLAS.',
  'GI SPARRING',
];

const PROFESSOR_SUGGESTIONS = [
  'Mario Bros',
  'David',
  'Coach Pro',
  'Instructora BJJ',
  'Wrestling Coach',
  'Mario & David',
];

const ROOM_SUGGESTIONS = [
  'Tatami Principal',
  'Tatami 2 (Kids)',
  'Tatami 2 (Anexo)',
  'Área de Golpeo / Jaula',
];

const LEVEL_OPTIONS: { value: LevelRequired; label: string }[] = [
  { value: 'TODOS', label: 'Todos los Niveles' },
  { value: 'FUNDAMENTOS', label: 'Iniciación / Fundamentos' },
  { value: 'AVANZADO', label: 'Avanzado (Azul+)' },
  { value: 'COMPETICION', label: 'Equipo Competición' },
  { value: 'KIDS', label: 'Infantil / Juvenil' },
];

const DAYS_OF_WEEK = [
  { num: 1, name: 'Lunes', short: 'LUN' },
  { num: 2, name: 'Martes', short: 'MAR' },
  { num: 3, name: 'Miércoles', short: 'MIÉ' },
  { num: 4, name: 'Jueves', short: 'JUE' },
  { num: 5, name: 'Viernes', short: 'VIE' },
];

const MONTH_NAMES_ADMIN_ES = [
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

export const SchedulesAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDomainModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Vistas: Matriz Semanal (GRID) | Calendario Mensual (MONTH) | Agenda (LIST)
  const [viewMode, setViewMode] = useState<'GRID' | 'MONTH' | 'LIST'>('GRID');
  const [adminMonth, setAdminMonth] = useState<{ year: number; month0: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month0: d.getMonth() };
  });

  // Filtros de Operación
  const [filterProfessor, setFilterProfessor] = useState<string>('ALL');
  const [filterProgram, setFilterProgram] = useState<string>('ALL');
  const [filterRoom, setFilterRoom] = useState<string>('ALL');
  const [onlyActive, setOnlyActive] = useState<boolean>(false);

  // Modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleDomainModel | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    program: string;
    professor: string;
    room: string;
    levelRequired: LevelRequired;
    capacity: number;
    curriculumTopic: string;
    active: boolean;
  }>({
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '11:30',
    program: 'GI',
    professor: 'Mario Bros',
    room: 'Tatami Principal',
    levelRequired: 'TODOS',
    capacity: 26,
    curriculumTopic: '',
    active: true,
  });

  // Modal Clonar / Replicar a Otros Días
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneTargetSchedule, setCloneTargetSchedule] = useState<ScheduleDomainModel | null>(null);
  const [selectedCloneDays, setSelectedCloneDays] = useState<number[]>([]);

  // Modal Excepción / Festivo
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [excForm, setExcForm] = useState({
    scheduleId: 'ALL',
    date: new Date().toISOString().split('T')[0],
    reason: 'Festivo Oficial / Mantenimiento Tatami',
  });

  // Modal Confirmar Carga Horario Oficial
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);

  // Carga inicial de datos
  const fetchData = async () => {
    try {
      setLoading(true);
      const sSnap = await getLiveDocs('schedules', collection(db, 'schedules'));
      const sList: ScheduleDomainModel[] = [];
      sSnap.forEach((d) => sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));

      // Si la colección está vacía, usar el horario oficial como base visible
      setSchedules(sList.length > 0 ? sList : DEFAULT_OFFICIAL_SCHEDULES);

      const eSnap = await getLiveDocs('scheduleExceptions', collection(db, 'scheduleExceptions'));
      const eList: ScheduleExceptionDomainModel[] = [];
      eSnap.forEach((d) => eList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) }));
      setExceptions(eList);
    } catch (err) {
      console.error('Error cargando horarios:', err);
      setSchedules(DEFAULT_OFFICIAL_SCHEDULES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Conflictos detectados en tiempo real (REA - Resource/Agent Solapamientos)
  const conflicts: ScheduleConflict[] = useMemo(() => {
    return detectScheduleConflicts(schedules);
  }, [schedules]);

  // KPIs Semanales
  const weeklyStats = useMemo(() => {
    return calculateWeeklyStats(schedules);
  }, [schedules]);

  // Lista filtrada
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (onlyActive && !s.active) return false;
      if (filterProfessor !== 'ALL' && s.professor !== filterProfessor) return false;
      if (filterProgram !== 'ALL' && s.program !== filterProgram) return false;
      if (filterRoom !== 'ALL' && (s.room || 'Tatami Principal') !== filterRoom) return false;
      return true;
    });
  }, [schedules, onlyActive, filterProfessor, filterProgram, filterRoom]);

  // Profesores únicos para el filtro
  const distinctProfessors = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.professor) set.add(s.professor);
    });
    return Array.from(set).sort();
  }, [schedules]);

  // Programas únicos para el filtro
  const distinctPrograms = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.program) set.add(s.program);
    });
    return Array.from(set).sort();
  }, [schedules]);

  // ACCIÓN 1: Abrir modal para crear nueva clase
  const handleOpenCreateModal = (defaultDay: number = 1) => {
    setEditingScheduleId(null);
    setFormState({
      dayOfWeek: defaultDay,
      startTime: '19:30',
      endTime: '20:30',
      program: 'GI',
      professor: 'Mario Bros',
      room: 'Tatami Principal',
      levelRequired: 'TODOS',
      capacity: 26,
      curriculumTopic: '',
      active: true,
    });
    setEditModalOpen(true);
  };

  // ACCIÓN 2: Abrir modal para editar clase existente
  const handleOpenEditModal = (schedule: ScheduleDomainModel) => {
    setEditingScheduleId(schedule.id);
    setFormState({
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      program: schedule.program,
      professor: schedule.professor,
      room: schedule.room || 'Tatami Principal',
      levelRequired: schedule.levelRequired || 'TODOS',
      capacity: schedule.capacity || 26,
      curriculumTopic: schedule.curriculumTopic || '',
      active: schedule.active,
    });
    setEditModalOpen(true);
  };

  // ACCIÓN 3: Guardar clase (Crear o Modificar)
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('save');
    setMessage(null);

    try {
      const duration = calculateScheduleDurationMinutes(formState.startTime, formState.endTime);
      if (duration <= 0) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio.');
      }

      const id = editingScheduleId || `sched_${formState.dayOfWeek}_${formState.startTime.replace(':', '')}_${Date.now()}`;
      const payload: ScheduleDomainModel = {
        id,
        dayOfWeek: Number(formState.dayOfWeek),
        startTime: formState.startTime,
        endTime: formState.endTime,
        program: formState.program.trim().toUpperCase(),
        professor: formState.professor.trim(),
        room: formState.room.trim(),
        levelRequired: formState.levelRequired,
        capacity: Number(formState.capacity) || 26,
        curriculumTopic: formState.curriculumTopic.trim(),
        active: formState.active,
      };

      await setDoc(doc(db, 'schedules', id), payload, { merge: true });

      setMessage({
        text: editingScheduleId ? 'Clase actualizada con éxito.' : 'Nueva clase creada en la parrilla.',
        type: 'success',
      });
      setEditModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error al guardar la franja horaria.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 4: Toggle Activar / Desactivar
  const handleToggleActive = async (s: ScheduleDomainModel) => {
    setActionLoading(s.id);
    try {
      await updateDoc(doc(db, 'schedules', s.id), {
        active: !s.active,
        updatedAt: serverTimestamp(),
      });
      await fetchData();
    } catch (err) {
      console.error('Error toggling active:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 5: Eliminar franja horaria (Radix Dialog)
  const handleDeleteSchedule = (s: ScheduleDomainModel) => {
    setScheduleToDelete(s);
  };

  const handleConfirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    setActionLoading(scheduleToDelete.id);
    try {
      await deleteDoc(doc(db, 'schedules', scheduleToDelete.id));
      setMessage({ text: 'Clase eliminada de la parrilla.', type: 'success' });
      setScheduleToDelete(null);
      await fetchData();
    } catch (err) {
      console.error('Error deleting schedule:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 6: Abrir modal de replicación a otros días
  const handleOpenCloneModal = (schedule: ScheduleDomainModel) => {
    setCloneTargetSchedule(schedule);
    // Sugerir por defecto días alternos habituales en artes marciales (Lunes -> Miércoles, Viernes)
    if (schedule.dayOfWeek === 1) setSelectedCloneDays([3, 5]);
    else if (schedule.dayOfWeek === 2) setSelectedCloneDays([4]);
    else setSelectedCloneDays([]);
    setCloneModalOpen(true);
  };

  // ACCIÓN 7: Ejecutar replicación de clase a múltiples días
  const handleExecuteClone = async () => {
    if (!cloneTargetSchedule || selectedCloneDays.length === 0) return;
    setActionLoading('clone');
    setMessage(null);

    try {
      const batch = writeBatch(db);

      selectedCloneDays.forEach((targetDay) => {
        const newId = `sched_${targetDay}_${cloneTargetSchedule.startTime.replace(':', '')}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const clonePayload: ScheduleDomainModel = {
          ...cloneTargetSchedule,
          id: newId,
          dayOfWeek: targetDay,
          active: true,
        };
        batch.set(doc(db, 'schedules', newId), clonePayload);
      });

      await batch.commit();
      setMessage({
        text: `¡Clase replicada a ${selectedCloneDays.length} día(s) con éxito!`,
        type: 'success',
      });
      setCloneModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error al replicar la clase.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 8: Restaurar horario oficial 247Studio (25 clases de Diapositiva 8)
  const handleRestoreOfficialSchedule = async () => {
    setActionLoading('restore');
    setMessage(null);
    try {
      const batch = writeBatch(db);
      DEFAULT_OFFICIAL_SCHEDULES.forEach((sched) => {
        batch.set(doc(db, 'schedules', sched.id), sched);
      });
      await batch.commit();

      setMessage({
        text: 'Parrilla oficial de 247Studio (25 clases semanales) cargada con éxito en Firestore.',
        type: 'success',
      });
      setRestoreModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error cargando horario oficial.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 9: Crear Excepción / Festivo
  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('exception');
    try {
      const id = `exc_${Date.now()}`;
      await setDoc(doc(db, 'scheduleExceptions', id), {
        ...excForm,
        createdAt: serverTimestamp(),
        createdBy: user?.uid || 'admin',
      });
      setMessage({ text: 'Excepción de calendario registrada con éxito.', type: 'success' });
      setExceptionModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ACCIÓN 10: Eliminar excepción
  const handleDeleteException = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scheduleExceptions', id));
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Calcular duración en tiempo real en el formulario
  const currentFormDuration = calculateScheduleDurationMinutes(formState.startTime, formState.endTime);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* ======================================================== */}
      {/* 1. CABECERA & CONTROLES PRINCIPALES                       */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl sm:text-4xl uppercase tracking-wide text-slate-900">
              Configurador de Horarios
            </h1>
            <span className="text-[10px] bg-slate-900 text-amber-400 font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              REA • Wodify Architecture
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de recursos de tatami, asignación docente, aforos máximos y detección de solapamientos operativos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Vista: Parrilla Semanal | Vista Mensual | Agenda */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'GRID'
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>
            <button
              onClick={() => setViewMode('MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'MONTH'
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          <button
            onClick={() => setExceptionModalOpen(true)}
            className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 border border-slate-200/80 cursor-pointer"
            title="Añadir festivo o cierre temporal"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Festivo / Excepción</span>
          </button>

          <button
            onClick={() => setRestoreModalOpen(true)}
            className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 border border-slate-200/80 cursor-pointer"
            title="Cargar las 25 clases oficiales del plan de estudios de 247Studio"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Plantilla 247</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal(1)}
            className="py-2.5 px-4 bg-brand-accent hover:bg-brand-accent/90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Clase</span>
          </button>
        </div>
      </div>

      {/* Mensaje de feedback */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. REA ANALYTICS BAR (RECURSOS, EVENTOS Y AGENTES)        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Clases Semanales
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {weeklyStats.activeClasses}
            <span className="text-xs font-sans text-slate-400 font-normal ml-1.5">
              / {weeklyStats.totalClasses} total
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            En parrilla activa
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block mb-1">
            Horas de Tatami / Semana
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {weeklyStats.totalHours}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {weeklyStats.totalMinutes} min de formación
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">
            Plazas Totales Tatami
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {weeklyStats.totalCapacity}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Aforo acumulado semanal
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block mb-1">
            Carga de Profesores (REA)
          </span>
          <div className="text-xs font-semibold text-slate-800 space-y-1 mt-1 max-h-12 overflow-y-auto">
            {Object.entries(weeklyStats.professorBreakdown).map(([prof, stat]) => (
              <div key={prof} className="flex justify-between items-center text-[11px]">
                <span className="truncate max-w-[120px]">{prof}:</span>
                <span className="font-mono text-purple-700 font-bold">{stat.count} cl. ({(stat.minutes / 60).toFixed(1)}h)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ALERTA DE CONFLICTOS Y SOLAPAMIENTOS OPERATIVOS        */}
      {/* ======================================================== */}
      {conflicts.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 animate-in shake duration-300 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-sm text-amber-950 uppercase tracking-wide">
              Conflictos Operativos Detectados ({conflicts.length})
            </h3>
          </div>
          <p className="text-xs text-amber-900 mb-3">
            La técnica REA de Gymdesk/Wodify alerta de solapamientos físicos en tatami o doble asignación del mismo profesor a la misma hora:
          </p>
          <div className="space-y-1.5">
            {conflicts.map((c, idx) => (
              <div
                key={idx}
                className="bg-white/80 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-950 flex items-start justify-between gap-2"
              >
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-200 text-amber-900 mt-0.5">
                    {c.type === 'ROOM_OVERLAP' ? 'SALA' : 'PROFESOR'}
                  </span>
                  <span>{c.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. EXCEPCIONES Y FESTIVOS ACTIVOS                        */}
      {/* ======================================================== */}
      {exceptions.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-accent" /> Excepciones de Calendario Registradas ({exceptions.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-extrabold text-slate-900 block">{ex.date}</span>
                  <span className="text-[11px] text-slate-500">{ex.reason}</span>
                </div>
                <button
                  onClick={() => handleDeleteException(ex.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                  title="Eliminar excepción y reactivar día"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. BARRA DE FILTROS RÁPIDOS                               */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar:
          </span>

          {/* Filtro Profesor */}
          <select
            value={filterProfessor}
            onChange={(e) => setFilterProfessor(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
          >
            <option value="ALL">Todos los Profesores</option>
            {distinctProfessors.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Filtro Disciplina */}
          <select
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
          >
            <option value="ALL">Todas las Disciplinas</option>
            {distinctPrograms.map((prg) => (
              <option key={prg} value={prg}>
                {prg}
              </option>
            ))}
          </select>

          {/* Filtro Sala */}
          <select
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
          >
            <option value="ALL">Todas las Salas / Tatamis</option>
            <option value="Tatami Principal">Tatami Principal</option>
            <option value="Tatami 2 (Kids)">Tatami 2 (Kids)</option>
            <option value="Tatami 2 (Anexo)">Tatami 2 (Anexo)</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="rounded text-brand-accent focus:ring-0"
          />
          <span>Solo Clases Activas</span>
        </label>
      </div>

      {/* ======================================================== */}
      {/* 6. VISTA MATRIZ SEMANAL (TIMETABLE GRID • GYMDESK)        */}
      {/* ======================================================== */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-brand-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-7 gap-3">
          {DAYS_OF_WEEK.map((d) => {
            const dayClasses = filteredSchedules
              .filter((s) => s.dayOfWeek === d.num)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={d.num}
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[480px]"
              >
                {/* Cabecera del día */}
                <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 block">{d.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {dayClasses.length} {dayClasses.length === 1 ? 'clase' : 'clases'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenCreateModal(d.num)}
                    className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shadow-2xs"
                    title={`Añadir clase el ${d.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tarjetas de Clases del día */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto">
                  {dayClasses.length === 0 ? (
                    <div className="py-12 text-center text-[11px] text-slate-400 italic">
                      Sin clases programadas
                    </div>
                  ) : (
                    dayClasses.map((s) => {
                      const theme = getProgramTheme(s.program);
                      const dur = calculateScheduleDurationMinutes(s.startTime, s.endTime);
                      const hasConflict = conflicts.some(
                        (c) => (c.scheduleAId === s.id || c.scheduleBId === s.id) && c.dayOfWeek === s.dayOfWeek
                      );

                      return (
                        <motion.div
                          key={s.id}
                          whileHover={{ y: -2, scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className={`p-3 rounded-xl border transition relative group shadow-2xs ${theme.bg} ${theme.border} ${theme.borderLeft} ${
                            !s.active ? 'opacity-40 grayscale' : ''
                          } ${hasConflict ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}
                        >
                          {/* Hora y Duración */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-extrabold text-slate-900 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {s.startTime} - {s.endTime}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-white/70 px-1.5 py-0.2 rounded border border-slate-200/50">
                              {dur} min
                            </span>
                          </div>

                          {/* Programa / Disciplina */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.badge}`}>
                              {s.program}
                            </span>
                            {s.levelRequired && s.levelRequired !== 'TODOS' && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono uppercase bg-white/80">
                                {s.levelRequired}
                              </Badge>
                            )}
                          </div>

                          {/* Profesor & Tatami (REA Agente y Recurso) */}
                          <div className="space-y-0.5 text-[11px] text-slate-700 pt-1 border-t border-slate-200/40">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 font-semibold truncate max-w-[110px]" title={s.professor}>
                                <User className="w-3 h-3 text-brand-accent shrink-0" />
                                <span className="truncate">{s.professor}</span>
                              </span>
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-500 font-mono font-bold">
                                <Users className="w-3 h-3" />
                                {s.capacity || 26}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{s.room || 'Tatami Principal'}</span>
                            </div>
                          </div>

                          {/* Botonera Operativa Rápida (Hover o Tap) */}
                          <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenCloneModal(s)}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                              title="Replicar esta clase a otros días de la semana"
                            >
                              <Copy className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(s)}
                              className="p-1 rounded-md text-slate-500 hover:text-blue-700 hover:bg-white transition cursor-pointer"
                              title="Editar horario, profesor o tatami"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(s)}
                              className={`p-1 rounded-md transition text-[10px] font-bold uppercase cursor-pointer ${
                                s.active
                                  ? 'text-slate-400 hover:text-amber-700 hover:bg-white'
                                  : 'text-emerald-700 bg-emerald-100'
                              }`}
                              title={s.active ? 'Pausar clase' : 'Reactivar clase'}
                            >
                              {s.active ? 'Pausar' : 'Activar'}
                            </button>

                            <button
                              onClick={() => handleDeleteSchedule(s)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white transition"
                              title="Eliminar clase"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'MONTH' ? (
        /* ======================================================== */
        /* 6.5 VISTA MENSUAL ADMINISTRATIVA (PLANIFICACIÓN & FESTIVOS)*/
        /* ======================================================== */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          {/* Barra de navegación del mes */}
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black uppercase font-headline tracking-wide text-slate-900">
                Planificación Mensual · {MONTH_NAMES_ADMIN_ES[adminMonth.month0]} {adminMonth.year}
              </h3>
              <p className="text-[11px] text-slate-500">
                Haz clic en una clase para editarla o pulsa el botón de festivo en cualquier día del mes para registrar un cierre temporal.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() =>
                  setAdminMonth((prev) => ({
                    year: prev.month0 === 0 ? prev.year - 1 : prev.year,
                    month0: prev.month0 === 0 ? 11 : prev.month0 - 1,
                  }))
                }
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setAdminMonth({ year: now.getFullYear(), month0: now.getMonth() });
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                Mes Actual
              </button>
              <button
                type="button"
                onClick={() =>
                  setAdminMonth((prev) => ({
                    year: prev.month0 === 11 ? prev.year + 1 : prev.year,
                    month0: prev.month0 === 11 ? 0 : prev.month0 + 1,
                  }))
                }
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cabecera L-D */}
          <div className="grid grid-cols-7 bg-slate-100/70 border-b border-slate-200/80 text-center">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d.num}
                className="py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500"
              >
                {d.short}
              </div>
            ))}
          </div>

          {/* Celdas del Mes */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/70">
            {(() => {
              const { year, month0 } = adminMonth;
              const firstDate = new Date(Date.UTC(year, month0, 1, 12, 0, 0));
              const firstJsDay = firstDate.getUTCDay();
              const firstDayOfWeek = firstJsDay === 0 ? 7 : firstJsDay;
              const leading = firstDayOfWeek - 1;
              const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
              const totalCells = leading + daysInMonth > 35 ? 42 : 35;
              const todayIso = new Date().toISOString().split('T')[0];

              return Array.from({ length: totalCells }, (_, idx) => {
                const cellDate = new Date(Date.UTC(year, month0, 1 - leading + idx, 12, 0, 0));
                const cYear = cellDate.getUTCFullYear();
                const cMonth0 = cellDate.getUTCMonth();
                const cDay = cellDate.getUTCDate();
                const jsD = cellDate.getUTCDay();
                const dayOfWeek = jsD === 0 ? 7 : jsD;
                const dateStr = `${cYear}-${String(cMonth0 + 1).padStart(2, '0')}-${String(cDay).padStart(2, '0')}`;
                const isCurrentMonth = cMonth0 === month0 && cYear === year;
                const isToday = dateStr === todayIso;

                const dayClasses = filteredSchedules
                  .filter((s) => s.dayOfWeek === dayOfWeek)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                const dayExc = exceptions.find((e) => e.date === dateStr);

                return (
                  <div
                    key={dateStr}
                    className={`min-h-[110px] sm:min-h-[130px] p-2 flex flex-col justify-between transition ${
                      !isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-400'
                        : dayExc
                        ? 'bg-rose-50/30'
                        : 'bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                          isToday
                            ? 'bg-brand-accent text-white font-black'
                            : isCurrentMonth
                            ? 'text-slate-900'
                            : 'text-slate-400'
                        }`}
                      >
                        {cDay}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setExcForm({
                              scheduleId: 'ALL',
                              date: dateStr,
                              reason: 'Festivo Oficial / Cierre Tatami',
                            });
                            setExceptionModalOpen(true);
                          }}
                          title={`Marcar festivo o excepción el ${dateStr}`}
                          className="p-1 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-700 transition cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal(dayOfWeek)}
                          title={`Añadir clase los ${DAYS_OF_WEEK[dayOfWeek - 1].name}`}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1.5 space-y-1">
                      {dayExc ? (
                        <div className="p-1.5 rounded-lg bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-bold">
                          Festivo: {dayExc.reason}
                        </div>
                      ) : (
                        <>
                          {dayClasses.slice(0, 3).map((s) => {
                            const theme = getProgramTheme(s.program);
                            return (
                              <button
                                key={`${s.id}_${dateStr}`}
                                type="button"
                                onClick={() => handleOpenEditModal(s)}
                                className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-bold truncate border ${theme.bg} ${theme.text} ${theme.border} cursor-pointer`}
                                title={`${s.startTime}-${s.endTime} · ${s.program} (${s.professor})`}
                              >
                                <strong className="font-mono">{s.startTime}</strong> {s.program}
                              </button>
                            );
                          })}
                          {dayClasses.length > 3 && (
                            <span className="text-[9px] font-mono font-bold text-slate-500 block pl-1">
                              +{dayClasses.length - 3} clases más
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 7. VISTA AGENDA / LISTA OPERATIVA                        */
        /* ======================================================== */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4">Día</th>
                  <th className="py-3.5 px-4">Horario</th>
                  <th className="py-3.5 px-4">Programa / Disciplina</th>
                  <th className="py-3.5 px-4">Profesor</th>
                  <th className="py-3.5 px-4">Tatami / Sala</th>
                  <th className="py-3.5 px-4">Aforo</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((s) => {
                  const dayName = DAYS_OF_WEEK.find((d) => d.num === s.dayOfWeek)?.name || 'Día';
                  const theme = getProgramTheme(s.program);
                  const dur = calculateScheduleDurationMinutes(s.startTime, s.endTime);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{dayName}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {s.startTime} - {s.endTime}{' '}
                        <span className="text-[10px] font-sans text-slate-400 ml-1">({dur} min)</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${theme.badge}`}>
                          {s.program}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{s.professor}</td>
                      <td className="py-3.5 px-4 text-slate-600">{s.room || 'Tatami Principal'}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{s.capacity || 26}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            s.active
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {s.active ? 'Activa' : 'Pausada'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenCloneModal(s)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition cursor-pointer"
                          title="Replicar a otros días"
                        >
                          <Copy className="w-3 h-3 inline mr-1" /> Replicar
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 inline mr-1" /> Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(s)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition cursor-pointer"
                        >
                          {s.active ? 'Pausar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(s)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL CREAR / EDITAR CLASE (RADIX DIALOG)              */}
      {/* ======================================================== */}
      <Dialog open={editModalOpen} onOpenChange={(open) => setEditModalOpen(open)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-slate-900">
              {editingScheduleId ? 'Editar Franja Horaria' : 'Crear Nueva Clase'}
            </DialogTitle>
            <p className="text-xs text-slate-400">
              Asignación de recursos de tatami y parámetros docentes
            </p>
          </DialogHeader>

          <form onSubmit={handleSaveSchedule} className="space-y-4 pt-2">
            {/* Día de la semana */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                Día de la Semana
              </label>
              <select
                value={formState.dayOfWeek}
                onChange={(e) => setFormState({ ...formState, dayOfWeek: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.num} value={d.num}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Horas Inicio y Fin + Duración dinámica */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                  Hora Inicio
                </label>
                <Input
                  type="time"
                  required
                  value={formState.startTime}
                  onChange={(e) => setFormState({ ...formState, startTime: e.target.value })}
                  className="font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                  Hora Fin ({currentFormDuration > 0 ? `${currentFormDuration} min` : 'Inválida'})
                </label>
                <Input
                  type="time"
                  required
                  value={formState.endTime}
                  onChange={(e) => setFormState({ ...formState, endTime: e.target.value })}
                  className="font-mono font-bold"
                />
              </div>
            </div>

            {/* Programa / Disciplina + Chips rápidos */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                Programa / Modalidad
              </label>
              <Input
                type="text"
                required
                value={formState.program}
                onChange={(e) => setFormState({ ...formState, program: e.target.value })}
                placeholder="GI / GRAPPLING / KIDS / MMA / LUCHA"
                className="font-bold mb-1.5"
              />
              <div className="flex flex-wrap gap-1">
                {PROGRAM_SUGGESTIONS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setFormState({ ...formState, program: p })}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Profesor Titular (REA Agente) */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                Profesor Asignado
              </label>
              <Input
                type="text"
                required
                value={formState.professor}
                onChange={(e) => setFormState({ ...formState, professor: e.target.value })}
                className="font-semibold mb-1.5"
              />
              <div className="flex flex-wrap gap-1">
                {PROFESSOR_SUGGESTIONS.map((prof) => (
                  <button
                    type="button"
                    key={prof}
                    onClick={() => setFormState({ ...formState, professor: prof })}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 transition"
                  >
                    {prof}
                  </button>
                ))}
              </div>
            </div>

            {/* Sala / Tatami (REA Recurso) y Aforo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                  Tatami / Sala
                </label>
                <select
                  value={formState.room}
                  onChange={(e) => setFormState({ ...formState, room: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                >
                  {ROOM_SUGGESTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                  Aforo Máximo (Plazas)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={formState.capacity}
                  onChange={(e) => setFormState({ ...formState, capacity: parseInt(e.target.value, 10) || 26 })}
                  className="font-mono font-bold"
                />
              </div>
            </div>

            {/* Nivel Requerido */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                Nivel Requerido
              </label>
              <select
                value={formState.levelRequired}
                onChange={(e) => setFormState({ ...formState, levelRequired: e.target.value as LevelRequired })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tema Técnico de la Sesión (Opcional) */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                Tema Técnico / Módulo Currículum (Opcional)
              </label>
              <Input
                type="text"
                value={formState.curriculumTopic}
                onChange={(e) => setFormState({ ...formState, curriculumTopic: e.target.value })}
                placeholder="Ej: Raspados de Mariposa, Defensa de Armbar, Derribos Judo"
              />
            </div>

            {/* Switch Clase Activa */}
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={formState.active}
                onChange={(e) => setFormState({ ...formState, active: e.target.checked })}
                className="rounded text-brand-accent focus:ring-0"
              />
              <span>Clase activa en la app y kiosco</span>
            </label>

            {/* Botones */}
            <div className="pt-4 border-t border-slate-200/80 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={actionLoading === 'save'}
                variant="studio"
              >
                {actionLoading === 'save' ? 'Guardando...' : editingScheduleId ? 'Guardar Cambios' : 'Crear Franja'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 9. MODAL CLONAR / REPLICAR A OTROS DÍAS (RADIX DIALOG)    */}
      {/* ======================================================== */}
      <Dialog
        open={cloneModalOpen && !!cloneTargetSchedule}
        onOpenChange={(open) => setCloneModalOpen(open)}
      >
        <DialogContent className="max-w-md">
          {cloneTargetSchedule && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-black uppercase text-slate-900">
                  Replicar Clase
                </DialogTitle>
                <p className="text-xs text-slate-400">
                  Clonar a otros días de la semana en 1 clic
                </p>
              </DialogHeader>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl my-2 text-xs">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Clase Origen:</span>
                <span className="font-extrabold text-slate-900 block text-sm">
                  {cloneTargetSchedule.program} ({cloneTargetSchedule.startTime} - {cloneTargetSchedule.endTime})
                </span>
                <span className="text-slate-600 block mt-0.5">
                  {cloneTargetSchedule.professor} • {cloneTargetSchedule.room || 'Tatami Principal'}
                </span>
              </div>

              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Selecciona los días destino:
              </label>
              <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                {DAYS_OF_WEEK.filter((d) => d.num !== cloneTargetSchedule.dayOfWeek).map((d) => {
                  const isSelected = selectedCloneDays.includes(d.num);
                  return (
                    <label
                      key={d.num}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition text-xs font-bold ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{d.name}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCloneDays([...selectedCloneDays, d.num]);
                          } else {
                            setSelectedCloneDays(selectedCloneDays.filter((x) => x !== d.num));
                          }
                        }}
                        className="rounded text-brand-accent focus:ring-0"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCloneModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={selectedCloneDays.length === 0 || actionLoading === 'clone'}
                  onClick={handleExecuteClone}
                  variant="studio"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  <span>{actionLoading === 'clone' ? 'Replicando...' : `Replicar (${selectedCloneDays.length} días)`}</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 10. MODAL EXCEPCIÓN / FESTIVO DE CALENDARIO (RADIX DIALOG)*/}
      {/* ======================================================== */}
      <Dialog open={exceptionModalOpen} onOpenChange={(open) => setExceptionModalOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-slate-900">
              Registrar Excepción / Festivo
            </DialogTitle>
            <p className="text-xs text-slate-400">
              Pausar reservas para una fecha determinada
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateException} className="space-y-4 pt-2">
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                Fecha de Cierre
              </label>
              <Input
                type="date"
                required
                value={excForm.date}
                onChange={(e) => setExcForm({ ...excForm, date: e.target.value })}
                className="font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-700 mb-1">
                Motivo de la Excepción
              </label>
              <Input
                type="text"
                required
                value={excForm.reason}
                onChange={(e) => setExcForm({ ...excForm, reason: e.target.value })}
                placeholder="Festivo Comunidad de Madrid, Seminario Internacional, etc."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExceptionModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={actionLoading === 'exception'}
                variant="default"
              >
                Guardar Excepción
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 11. MODAL RESTAURAR PLANTILLA OFICIAL 247 (RADIX DIALOG)   */}
      {/* ======================================================== */}
      <Dialog open={restoreModalOpen} onOpenChange={(open) => setRestoreModalOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-accent" /> Plantilla Oficial 247Studio
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-slate-600 mb-2 leading-relaxed">
            ¿Deseas volcar en la base de datos de Firestore las <strong>25 clases oficiales</strong> de la academia (Lunes a Viernes, con Gi, No-Gi Grappling, Kids 1 y 2, MMA, Lucha y Open Mat) diseñadas por Mario y David?
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRestoreModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={actionLoading === 'restore'}
              onClick={handleRestoreOfficialSchedule}
              variant="studio"
            >
              {actionLoading === 'restore' ? 'Cargando 25 clases...' : 'Confirmar y Volcar Parrilla'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ======================================================== */}
      {/* MODAL 5: CONFIRMAR ELIMINACIÓN DE CLASE (RADIX DIALOG)    */}
      {/* ======================================================== */}
      <Dialog open={!!scheduleToDelete} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-slate-900">
              Eliminar Clase de la Parrilla
            </DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar la clase de{' '}
              <strong className="text-slate-900">{scheduleToDelete?.program}</strong> (
              {scheduleToDelete?.startTime} - {scheduleToDelete?.endTime})? Esta acción retirará la clase de la parrilla oficial.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleToDelete(null)}
              disabled={actionLoading === scheduleToDelete?.id}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteSchedule}
              disabled={actionLoading === scheduleToDelete?.id}
            >
              {actionLoading === scheduleToDelete?.id ? 'Eliminando...' : 'Eliminar Clase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
