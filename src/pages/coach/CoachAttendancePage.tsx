import { useEffect, useState } from 'react';
import { Check, UserPlus, User, Users, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
];

interface ScheduleClass {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  coach_name: string;
  discipline_id: string;
}

interface StudentCard {
  id: string;
  full_name: string;
  alias: string | null;
  avatar_url: string | null;
  belt: string | null;
}

interface AttendanceRecord {
  id: string;
  user_id: string | null;
  guest_name: string | null;
}

interface Discipline {
  id: string;
  name: string;
}

export function CoachAttendancePage() {
  const { user } = useAuth();
  const todayDate = new Date().toISOString().slice(0, 10);
  const currentMonth = todayDate.slice(0, 7);
  const jsDay = new Date().getDay(); // 0=Dom, 1=Lun ... 6=Sab
  const todayDayOfWeek = jsDay === 0 ? 7 : jsDay;

  const [allClasses, setAllClasses] = useState<ScheduleClass[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(
    todayDayOfWeek >= 1 && todayDayOfWeek <= 5 ? todayDayOfWeek : 1
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentCard[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestDisciplineId, setGuestDisciplineId] = useState('');
  const [guestDate, setGuestDate] = useState(todayDate);
  const [loading, setLoading] = useState(true);

  const isToday = selectedDay === todayDayOfWeek;
  const classesForDay = allClasses.filter((c) => c.day_of_week === selectedDay);

  useEffect(() => {
    const loadInitial = async () => {
      const [clsRes, discRes] = await Promise.all([
        supabase
          .from('schedule_classes')
          .select('*')
          .eq('is_active', true)
          .order('day_of_week')
          .order('start_time'),
        supabase.from('disciplines').select('id, name').order('sort_order'),
      ]);

      const list = (clsRes.data as ScheduleClass[]) ?? [];
      setAllClasses(list);
      setDisciplines((discRes.data as Discipline[]) ?? []);

      // Si hoy es fin de semana o no hay clases hoy, salta al próximo día con clases (ej. Lunes)
      let targetDay = todayDayOfWeek >= 1 && todayDayOfWeek <= 5 ? todayDayOfWeek : 1;
      if (!list.some((c) => c.day_of_week === targetDay) && list.length > 0) {
        targetDay = list[0].day_of_week;
      }
      setSelectedDay(targetDay);
    };
    loadInitial();
  }, [todayDayOfWeek]);

  // Al cambiar de día, seleccionar la clase en curso / siguiente o la primera del día
  useEffect(() => {
    const dayList = allClasses.filter((c) => c.day_of_week === selectedDay);
    if (dayList.length === 0) {
      setSelectedClassId('');
      setStudents([]);
      setAttendances([]);
      setLoading(false);
      return;
    }

    if (selectedDay === todayDayOfWeek) {
      const nowTime = new Date().toTimeString().slice(0, 5);
      const current = dayList.find((c) => c.end_time.slice(0, 5) >= nowTime) ?? dayList[0];
      setSelectedClassId(current.id);
    } else {
      setSelectedClassId(dayList[0].id);
    }
  }, [selectedDay, allClasses, todayDayOfWeek]);

  useEffect(() => {
    const selected = allClasses.find((c) => c.id === selectedClassId);
    if (!selected) return;

    const loadRosterAndAttendances = async () => {
      setLoading(true);
      const { data: planDiscs } = await supabase
        .from('plan_disciplines')
        .select('plan_id')
        .eq('discipline_id', selected.discipline_id);

      const allowedPlanIds = (planDiscs ?? []).map((p: { plan_id: string }) => p.plan_id);

      let eligibleStudents: StudentCard[] = [];
      if (allowedPlanIds.length > 0) {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('user_id, profiles!inner(id, full_name, alias, avatar_url, belt, status, role)')
          .eq('month_year', currentMonth)
          .eq('status', 'active')
          .in('plan_id', allowedPlanIds)
          .eq('profiles.status', 'active')
          .eq('profiles.role', 'client');

        eligibleStudents = (subs ?? [])
          .map((row: unknown) => (row as { profiles: StudentCard }).profiles)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
      }

      if (selected.day_of_week === todayDayOfWeek) {
        const { data: attData } = await supabase
          .from('attendances')
          .select('id, user_id, guest_name')
          .eq('schedule_class_id', selected.id)
          .eq('attendance_date', todayDate);
        setAttendances((attData as AttendanceRecord[]) ?? []);
      } else {
        setAttendances([]);
      }

      setStudents(eligibleStudents);
      setLoading(false);
    };

    loadRosterAndAttendances();
  }, [selectedClassId, allClasses, currentMonth, todayDate, todayDayOfWeek]);

  const toggleStudent = async (studentId: string) => {
    if (!isToday) return;
    const selected = allClasses.find((c) => c.id === selectedClassId);
    if (!selected || !user) return;

    const existing = attendances.find((a) => a.user_id === studentId);
    if (existing) {
      await supabase.from('attendances').delete().eq('id', existing.id);
      setAttendances((prev) => prev.filter((a) => a.id !== existing.id));
    } else {
      const { data } = await supabase
        .from('attendances')
        .insert({
          user_id: studentId,
          schedule_class_id: selected.id,
          discipline_id: selected.discipline_id,
          attendance_date: todayDate,
          validated_by: user.id,
        })
        .select('id, user_id, guest_name')
        .single();
      if (data) {
        setAttendances((prev) => [...prev, data as AttendanceRecord]);
      }
    }
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = allClasses.find((c) => c.id === selectedClassId);
    if (!user || !guestName.trim() || !guestDisciplineId) return;

    await supabase.from('trial_guests').insert({
      full_name: guestName.trim(),
      phone: guestPhone.trim() || null,
      email: guestEmail.trim() || null,
      discipline_id: guestDisciplineId,
      trial_date: guestDate,
      schedule_class_id: selected?.id ?? null,
      created_by: user.id,
    });

    if (selected && isToday && guestDate === todayDate) {
      const { data } = await supabase
        .from('attendances')
        .insert({
          user_id: null,
          guest_name: guestName.trim(),
          schedule_class_id: selected.id,
          discipline_id: guestDisciplineId,
          attendance_date: todayDate,
          validated_by: user.id,
        })
        .select('id, user_id, guest_name')
        .single();

      if (data) {
        setAttendances((prev) => [...prev, data as AttendanceRecord]);
      }
    }

    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setGuestDate(todayDate);
    setShowGuestModal(false);
  };

  const guestList = attendances.filter((a) => !a.user_id && a.guest_name);
  const selectedDayLabel = DAYS.find((d) => d.value === selectedDay)?.label ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
            {isToday ? 'Pasar Lista — Hoy' : `Previsión de Clase — ${selectedDayLabel}`}
          </h1>
          <p className="text-sm text-slate-400">
            {isToday
              ? 'Toca a cada alumno presente en el tatami para validar su asistencia.'
              : 'Vista previa de los alumnos previstos para la próxima sesión (el fichaje se habilita el día de la clase).'}
          </p>
        </div>

        <button
          onClick={() => {
            const current = allClasses.find((c) => c.id === selectedClassId);
            if (current) setGuestDisciplineId(current.discipline_id);
            else if (disciplines[0]) setGuestDisciplineId(disciplines[0].id);
            setShowGuestModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-studio-navy px-4 py-2 text-xs font-semibold text-white hover:bg-white/5 shrink-0"
        >
          <UserPlus className="w-4 h-4 text-studio-red" />
          + Invitado / Clase Prueba
        </button>
      </div>

      {/* Selector de Día (Lunes a Viernes) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 mr-1">
          <Calendar className="w-3.5 h-3.5" /> Día:
        </span>
        {DAYS.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDay(d.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              selectedDay === d.value
                ? 'bg-white text-studio-navy-deep border-white'
                : 'bg-studio-navy border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            {d.label}
            {d.value === todayDayOfWeek ? ' (Hoy)' : ''}
          </button>
        ))}
      </div>

      {/* Selector de clases del día */}
      {classesForDay.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {classesForDay.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`px-4 py-2 rounded-xl text-left transition border ${
                selectedClassId === c.id
                  ? 'bg-studio-red border-studio-red text-white'
                  : 'bg-studio-navy border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <span className="block text-[11px] opacity-80">
                {c.start_time.slice(0, 5)} – {c.end_time.slice(0, 5)}
              </span>
              <span className="font-headline text-sm uppercase tracking-wide">{c.title}</span>
            </button>
          ))}
        </div>
      )}

      {showGuestModal && (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={addGuest}
            className="w-full max-w-md rounded-2xl bg-studio-navy border border-white/15 p-6 space-y-4 shadow-modal"
          >
            <h2 className="font-headline text-xl uppercase text-white">
              Registrar Clase de Prueba
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-1">
                  Nombre y apellidos *
                </label>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  required
                  className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">Teléfono</label>
                  <input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="600 000 000"
                    className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="carlos@email.com"
                    className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">
                    Disciplina prueba *
                  </label>
                  <select
                    value={guestDisciplineId}
                    onChange={(e) => setGuestDisciplineId(e.target.value)}
                    required
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
                  <label className="block text-xs text-slate-400 uppercase mb-1">
                    Fecha prueba *
                  </label>
                  <input
                    type="date"
                    value={guestDate}
                    onChange={(e) => setGuestDate(e.target.value)}
                    required
                    className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowGuestModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-studio-red hover:bg-studio-red-dark text-sm font-semibold text-white"
              >
                Guardar Prueba
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contador */}
      {classesForDay.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Users className="w-4 h-4 text-emerald-400" />
          {isToday ? (
            <span>
              <strong className="text-white">{attendances.length}</strong> de{' '}
              <strong className="text-white">{students.length}</strong> alumnos marcados en esta clase
            </span>
          ) : (
            <span>
              <strong className="text-white">{students.length}</strong> alumnos previstos en esta clase
            </span>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando lista de clase...</p>
      ) : classesForDay.length === 0 ? (
        <div className="rounded-2xl bg-studio-navy border border-white/10 p-6 text-sm text-slate-400">
          No hay clases programadas para este día.
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl bg-studio-navy border border-white/10 p-6 text-sm text-slate-400">
          No hay alumnos activos con tarifa compatible para esta disciplina este mes ({currentMonth}).
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {students.map((st) => {
            const checked = attendances.some((a) => a.user_id === st.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => toggleStudent(st.id)}
                className={`relative rounded-2xl p-4 border text-left transition flex flex-col items-center text-center gap-2.5 ${
                  checked
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : isToday
                      ? 'bg-studio-navy border-white/10 text-slate-200 hover:border-white/30'
                      : 'bg-studio-navy/70 border-white/10 text-slate-200 cursor-default'
                }`}
              >
                {checked && (
                  <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </span>
                )}
                <div className="w-16 h-16 rounded-full bg-studio-navy-deep border border-white/10 overflow-hidden flex items-center justify-center">
                  {st.avatar_url ? (
                    <img
                      src={st.avatar_url}
                      alt={st.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{st.full_name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{st.belt || 'Blanco'}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {guestList.length > 0 && (
        <div className="rounded-2xl bg-studio-navy border border-white/10 p-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
            Invitados / Pruebas hoy
          </h3>
          <div className="flex flex-wrap gap-2">
            {guestList.map((g) => (
              <span
                key={g.id}
                className="px-3 py-1 rounded-full bg-white/5 text-xs text-slate-200"
              >
                {g.guest_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
