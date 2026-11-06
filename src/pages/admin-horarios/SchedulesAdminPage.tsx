import React, { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { db } from '@/shared/api/firebase';
import { ScheduleDomainModel, ScheduleExceptionDomainModel } from '@/shared/domain/types';

export const SchedulesAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleDomainModel[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionDomainModel[]>([]);

  // Modal nueva clase
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedForm, setSchedForm] = useState({
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '11:30',
    professor: 'Carlos Rodriguez',
    program: 'GI',
    capacity: 24,
  });

  // Modal nueva excepción
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [excForm, setExcForm] = useState({
    scheduleId: '',
    date: new Date().toISOString().split('T')[0],
    reason: 'Festivo o Mantenimiento',
  });

  const fetchData = async () => {
    try {
      const sSnap = await getDocs(collection(db, 'schedules'));
      const sList: ScheduleDomainModel[] = [];
      sSnap.forEach((d) => sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
      setSchedules(sList);

      const eSnap = await getDocs(collection(db, 'scheduleExceptions'));
      const eList: ScheduleExceptionDomainModel[] = [];
      eSnap.forEach((d) => eList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) }));
      setExceptions(eList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = `sched_${schedForm.dayOfWeek}_${schedForm.startTime.replace(':', '')}_${Date.now()}`;
      await setDoc(doc(db, 'schedules', id), {
        ...schedForm,
        capacity: Number(schedForm.capacity),
        active: true,
      });
      setShowScheduleModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (s: ScheduleDomainModel) => {
    try {
      await updateDoc(doc(db, 'schedules', s.id), {
        active: !s.active,
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const id = `exc_${Date.now()}`;
      await setDoc(doc(db, 'scheduleExceptions', id), {
        ...excForm,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      setShowExceptionModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scheduleExceptions', id));
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">Configuración de Horarios</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Parrilla semanal, cupos de tatami y excepciones de festivos.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowExceptionModal(true)}
            className="py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-studio-red" /> Excepción / Festivo
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="py-2.5 px-4 bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nueva Clase
          </button>
        </div>
      </div>

      {/* Lista de Excepciones Activas */}
      {exceptions.length > 0 && (
        <div className="bg-white border border-amber-500/30 rounded-2xl p-4 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
            Excepciones de Calendario Registradas ({exceptions.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{ex.date}</span>
                  <span className="text-[11px] text-slate-400">{ex.reason}</span>
                </div>
                <button
                  onClick={() => handleDeleteException(ex.id)}
                  className="p-1 text-slate-400 hover:text-studio-red"
                  title="Eliminar excepción"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parrilla de Horarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedules
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
          .map((s) => (
            <div
              key={s.id}
              className={`p-4 rounded-2xl border transition-all ${
                s.active
                  ? 'bg-white border-slate-200/80'
                  : 'bg-slate-50 border-slate-100 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-studio-red tracking-wider">
                  {days[s.dayOfWeek]}
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {s.startTime} - {s.endTime}
                </span>
              </div>

              <h3 className="font-black text-sm text-slate-900 mb-2">{s.program}</h3>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1 font-semibold">
                  <User className="w-3.5 h-3.5 text-studio-red" /> {s.professor}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Aforo: {s.capacity || 24}
                </span>
              </div>

              <div className="mt-3 pt-2 flex justify-end">
                <button
                  onClick={() => handleToggleActive(s)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                    s.active
                      ? 'bg-white/5 hover:bg-studio-red/20 text-slate-500 hover:text-studio-red'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {s.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal Nueva Clase */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm uppercase text-slate-900">Nueva Franja Horaria</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Día</label>
                <select
                  value={schedForm.dayOfWeek}
                  onChange={(e) => setSchedForm({ ...schedForm, dayOfWeek: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                >
                  <option value={1}>Lunes</option>
                  <option value={2}>Martes</option>
                  <option value={3}>Miércoles</option>
                  <option value={4}>Jueves</option>
                  <option value={5}>Viernes</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Inicio</label>
                  <input
                    type="time"
                    value={schedForm.startTime}
                    onChange={(e) => setSchedForm({ ...schedForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Fin</label>
                  <input
                    type="time"
                    value={schedForm.endTime}
                    onChange={(e) => setSchedForm({ ...schedForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Programa</label>
                <input
                  type="text"
                  value={schedForm.program}
                  onChange={(e) => setSchedForm({ ...schedForm, program: e.target.value })}
                  placeholder="GI / GRAPPLING / MMA / KIDS 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Profesor</label>
                <input
                  type="text"
                  value={schedForm.professor}
                  onChange={(e) => setSchedForm({ ...schedForm, professor: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Aforo Orientativo</label>
                <input
                  type="number"
                  value={schedForm.capacity}
                  onChange={(e) => setSchedForm({ ...schedForm, capacity: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-studio-red hover:bg-studio-red-dark text-white font-bold text-xs uppercase"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Excepción */}
      {showExceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm uppercase text-slate-900">Excepción de Calendario</h3>
              <button onClick={() => setShowExceptionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateException} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Fecha (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={excForm.date}
                  onChange={(e) => setExcForm({ ...excForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Clase Afectada</label>
                <select
                  required
                  value={excForm.scheduleId}
                  onChange={(e) => setExcForm({ ...excForm, scheduleId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                >
                  <option value="">Selecciona una franja</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {days[s.dayOfWeek]} {s.startTime} - {s.program} (Prof. {s.professor})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Causa</label>
                <input
                  type="text"
                  required
                  value={excForm.reason}
                  onChange={(e) => setExcForm({ ...excForm, reason: e.target.value })}
                  placeholder="Festivo / Seminario / Reparación tatami"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowExceptionModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-studio-red hover:bg-studio-red-dark text-white font-bold text-xs uppercase"
                >
                  Registrar Excepción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
