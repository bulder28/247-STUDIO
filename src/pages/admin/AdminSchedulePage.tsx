import { useEffect, useState } from 'react';
import { Plus, Trash2, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getDisciplineImage } from '@/lib/disciplineImages';

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

interface Discipline {
  id: string;
  name: string;
}

interface ScheduleClass {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  coach_name: string;
  discipline_id: string;
  disciplines?: { name: string; slug: string } | null;
}

export function AdminSchedulePage() {
  const [classes, setClasses] = useState<ScheduleClass[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('18:30');
  const [endTime, setEndTime] = useState('19:30');
  const [disciplineId, setDisciplineId] = useState('');
  const [title, setTitle] = useState('');
  const [coachName, setCoachName] = useState('');
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [clsRes, discRes] = await Promise.all([
      supabase
        .from('schedule_classes')
        .select('*, disciplines(name, slug)')
        .order('day_of_week')
        .order('start_time'),
      supabase.from('disciplines').select('id, name').order('sort_order'),
    ]);
    setClasses((clsRes.data as unknown as ScheduleClass[]) ?? []);
    const discList = (discRes.data as Discipline[]) ?? [];
    setDisciplines(discList);
    if (!disciplineId && discList.length > 0) setDisciplineId(discList[0].id);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !coachName.trim() || !disciplineId) return;
    setSaving(true);

    const { error } = await supabase.from('schedule_classes').insert({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      discipline_id: disciplineId,
      title: title.trim().toUpperCase(),
      coach_name: coachName.trim(),
    });

    if (!error) {
      if (notifyStudents) {
        const dayLabel = DAYS.find((d) => d.value === dayOfWeek)?.label ?? '';
        await supabase.from('notices').insert({
          target_user_id: null,
          notice_type: 'schedule_change',
          title: 'Actualización de Horarios',
          message: `Cambio en el horario: ${dayLabel} ${startTime}–${endTime} (${title.trim().toUpperCase()}) con ${coachName.trim()}.`,
        });
      }
      setTitle('');
      await loadData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('schedule_classes').delete().eq('id', id);
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
          BBDD Horarios
        </h1>
        <p className="text-sm text-slate-400">
          Configura la parrilla de clases semanales (Lunes a Sábado). Los cambios pueden avisar automáticamente al alumno.
        </p>
      </div>

      <form
        onSubmit={handleAddClass}
        className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-4"
      >
        <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-studio-red" />
          Añadir Clase al Horario
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Día</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Disciplina</label>
            <select
              value={disciplineId}
              onChange={(e) => setDisciplineId(e.target.value)}
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            >
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Nombre clase</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. GI GRAPPLING / MMA"
              required
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Profesor</label>
            <input
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="Ej. Mario / David"
              required
              className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyStudents}
              onChange={(e) => setNotifyStudents(e.target.checked)}
              className="rounded"
            />
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            Notificar cambio a los alumnos
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-studio-red hover:bg-studio-red-dark disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition"
          >
            {saving ? 'Añadiendo...' : 'Añadir Clase'}
          </button>
        </div>
      </form>

      {/* Parrilla por día */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((day) => {
          const dayClasses = classes.filter((c) => c.day_of_week === day.value);
          return (
            <div key={day.value} className="rounded-2xl bg-studio-navy border border-white/10 p-4">
              <h3 className="font-headline text-lg uppercase text-white border-b border-white/10 pb-2 mb-3">
                {day.label}
              </h3>
              {dayClasses.length === 0 ? (
                <p className="text-xs text-slate-500">Sin clases</p>
              ) : (
                <div className="space-y-2">
                  {dayClasses.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-studio-navy-deep p-2.5 border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getDisciplineImage(c.disciplines?.slug, c.title)}
                          alt={c.title}
                          className="w-11 h-11 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-studio-red font-semibold">
                            {c.start_time.slice(0, 5)} – {c.end_time.slice(0, 5)}
                          </p>
                          <p className="text-sm font-medium text-white truncate">{c.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {c.disciplines?.name} · Prof. {c.coach_name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 shrink-0"
                        title="Eliminar clase"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

