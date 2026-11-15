import { useEffect, useState } from 'react';
import { Plus, Trash2, Bell, Pencil, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  DISCIPLINE_IMAGE_OPTIONS,
  getDisciplineImage,
  type DisciplineImageKey,
} from '@/lib/disciplineImages';
import { PageHeader } from '@/components/PageHeader';

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
  slug?: string;
}

interface CoachProfile {
  id: string;
  full_name: string;
  role: 'coach' | 'admin';
}

interface ScheduleClass {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  coach_name: string;
  discipline_id: string;
  image_key?: string | null;
  disciplines?: { name: string; slug: string } | null;
}

const CUSTOM_COACH_VALUE = '__custom__';

export function AdminSchedulePage() {
  const [classes, setClasses] = useState<ScheduleClass[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('18:30');
  const [endTime, setEndTime] = useState('19:30');
  const [disciplineId, setDisciplineId] = useState('');
  const [title, setTitle] = useState('');
  const [coachSelection, setCoachSelection] = useState<string>(CUSTOM_COACH_VALUE);
  const [customCoachName, setCustomCoachName] = useState('');
  const [imageKey, setImageKey] = useState<'auto' | DisciplineImageKey>('auto');
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    const [clsRes, discRes, coachRes] = await Promise.all([
      supabase
        .from('schedule_classes')
        .select('*, disciplines(name, slug)')
        .order('day_of_week')
        .order('start_time'),
      supabase.from('disciplines').select('id, name, slug').order('sort_order'),
      supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['coach', 'admin'])
        .eq('status', 'active')
        .order('full_name'),
    ]);

    setClasses((clsRes.data as unknown as ScheduleClass[]) ?? []);
    const discList = (discRes.data as Discipline[]) ?? [];
    setDisciplines(discList);
    if (!disciplineId && discList.length > 0) setDisciplineId(discList[0].id);

    const coachList = (coachRes.data as CoachProfile[]) ?? [];
    setCoaches(coachList);
    if (!editingId && coachSelection === CUSTOM_COACH_VALUE && !customCoachName && coachList.length > 0) {
      setCoachSelection(coachList[0].full_name);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resolvedCoachName =
    coachSelection === CUSTOM_COACH_VALUE ? customCoachName.trim() : coachSelection.trim();

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setImageKey('auto');
    if (coaches.length > 0) {
      setCoachSelection(coaches[0].full_name);
      setCustomCoachName('');
    } else {
      setCoachSelection(CUSTOM_COACH_VALUE);
      setCustomCoachName('');
    }
  };

  const handleStartEdit = (c: ScheduleClass) => {
    setFeedback(null);
    setEditingId(c.id);
    setDayOfWeek(c.day_of_week);
    setStartTime(c.start_time.slice(0, 5));
    setEndTime(c.end_time.slice(0, 5));
    setDisciplineId(c.discipline_id);
    setTitle(c.title);

    const matchesRegistered = coaches.some(
      (coach) => coach.full_name.trim().toLowerCase() === c.coach_name.trim().toLowerCase()
    );
    if (matchesRegistered) {
      const exact = coaches.find(
        (coach) => coach.full_name.trim().toLowerCase() === c.coach_name.trim().toLowerCase()
      )!;
      setCoachSelection(exact.full_name);
      setCustomCoachName('');
    } else {
      setCoachSelection(CUSTOM_COACH_VALUE);
      setCustomCoachName(c.coach_name);
    }

    const validCustomImg = DISCIPLINE_IMAGE_OPTIONS.some((opt) => opt.key === c.image_key);
    setImageKey(validCustomImg ? (c.image_key as DisciplineImageKey) : 'auto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !resolvedCoachName || !disciplineId) return;
    setSaving(true);
    setFeedback(null);

    const basePayload = {
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      discipline_id: disciplineId,
      title: title.trim().toUpperCase(),
      coach_name: resolvedCoachName,
    };

    const payloadWithImage = {
      ...basePayload,
      image_key: imageKey === 'auto' ? null : imageKey,
    };

    let error = null as { message?: string } | null;

    if (editingId) {
      const res = await supabase
        .from('schedule_classes')
        .update(payloadWithImage)
        .eq('id', editingId);
      error = res.error;
      if (error?.message?.includes('image_key')) {
        const retry = await supabase
          .from('schedule_classes')
          .update(basePayload)
          .eq('id', editingId);
        error = retry.error;
        if (!error) {
          setFeedback(
            'Clase actualizada. Nota: ejecuta supabase/schedule_image_key.sql en Supabase para guardar iconos personalizados.'
          );
        }
      }
    } else {
      const res = await supabase.from('schedule_classes').insert(payloadWithImage);
      error = res.error;
      if (error?.message?.includes('image_key')) {
        const retry = await supabase.from('schedule_classes').insert(basePayload);
        error = retry.error;
        if (!error) {
          setFeedback(
            'Clase añadida. Nota: ejecuta supabase/schedule_image_key.sql en Supabase para guardar iconos personalizados.'
          );
        }
      }
    }

    if (!error) {
      if (notifyStudents) {
        const dayLabel = DAYS.find((d) => d.value === dayOfWeek)?.label ?? '';
        await supabase.from('notices').insert({
          target_user_id: null,
          notice_type: 'schedule_change',
          title: 'Actualización de Horarios',
          message: `${editingId ? 'Cambio' : 'Nueva clase'} en el horario: ${dayLabel} ${startTime}–${endTime} (${title.trim().toUpperCase()}) con ${resolvedCoachName}.`,
        });
      }
      resetForm();
      await loadData();
    } else {
      setFeedback(`Error al guardar clase: ${error.message ?? 'Inténtalo de nuevo'}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('schedule_classes').delete().eq('id', id);
    if (editingId === id) resetForm();
    await loadData();
  };

  const selectedDisciplineSlug = disciplines.find((d) => d.id === disciplineId)?.slug;
  const previewSrc = getDisciplineImage(
    selectedDisciplineSlug,
    title,
    imageKey === 'auto' ? null : imageKey
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios"
        subtitle={
          <>
            Configura la parrilla de clases semanales (Lunes a Sábado), sustituciones de profesores e
            icono de cada clase.
          </>
        }
      />

      <form
        onSubmit={handleSaveClass}
        className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-headline text-lg uppercase text-white flex items-center gap-2">
            {editingId ? (
              <>
                <Pencil className="w-4 h-4 text-amber-400" />
                Editar Clase / Sustitución de Profesor
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-studio-red" />
                Añadir Clase al Horario
              </>
            )}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar edición
            </button>
          )}
        </div>

        {feedback && (
          <div className="rounded-xl bg-amber-500/15 border border-amber-500/35 px-3.5 py-2 text-xs text-amber-200">
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Día</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase mb-1">Fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Disciplina</label>
            <select
              value={disciplineId}
              onChange={(e) => setDisciplineId(e.target.value)}
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">
              Profesor asignado
            </label>
            <select
              value={coachSelection}
              onChange={(e) => setCoachSelection(e.target.value)}
              className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
            >
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.full_name}>
                  {coach.full_name} ({coach.role === 'admin' ? 'Admin' : 'Coach'})
                </option>
              ))}
              <option value={CUSTOM_COACH_VALUE}>Otro / Sustituto puntual...</option>
            </select>
            {coachSelection === CUSTOM_COACH_VALUE && (
              <input
                value={customCoachName}
                onChange={(e) => setCustomCoachName(e.target.value)}
                placeholder="Nombre del profesor o sustituto"
                required
                className="mt-2 w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
              />
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">
              Icono / Imagen de clase
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setImageKey('auto')}
                className={`px-2.5 py-2 rounded-xl border text-xs font-medium transition ${
                  imageKey === 'auto'
                    ? 'border-red-500 bg-red-500/20 text-white'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/5'
                }`}
              >
                Auto
              </button>
              {DISCIPLINE_IMAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setImageKey(opt.key)}
                  title={opt.label}
                  className={`relative rounded-xl p-0.5 border transition ${
                    imageKey === opt.key
                      ? 'border-red-500 ring-2 ring-red-500/40'
                      : 'border-white/10 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={opt.src}
                    alt={opt.label}
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                </button>
              ))}
              <img
                src={previewSrc}
                alt="Vista previa"
                title="Vista previa actual"
                className="w-9 h-9 rounded-lg object-cover border border-white/20 ml-auto hidden sm:block"
              />
            </div>
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
            className="rounded-xl studio-btn disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition"
          >
            {saving
              ? 'Guardando...'
              : editingId
              ? 'Guardar cambios'
              : 'Añadir Clase'}
          </button>
        </div>
      </form>

      {/* Parrilla por día */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((day) => {
          const dayClasses = classes.filter((c) => c.day_of_week === day.value);
          return (
            <div key={day.value} className="rounded-2xl studio-panel border border-white/10 p-4">
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
                      className={`flex items-center justify-between gap-2 rounded-xl studio-panel-inset p-2.5 border ${
                        editingId === c.id ? 'border-amber-400/60' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getDisciplineImage(c.disciplines?.slug, c.title, c.image_key)}
                          alt={c.title}
                          className="w-11 h-11 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-studio-red-text font-semibold">
                            {c.start_time.slice(0, 5)} – {c.end_time.slice(0, 5)}
                          </p>
                          <p className="text-sm font-medium text-white truncate">{c.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {c.disciplines?.name} · Prof. {c.coach_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-300"
                          title="Editar clase / profesor"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400"
                          title="Eliminar clase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
