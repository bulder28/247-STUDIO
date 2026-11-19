import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, UserPlus, User, Users, Calendar, Search, CalendarX, WifiOff, AlertTriangle, ChevronDown, Star } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/KpiCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateISO, getLocalTimeHHMM } from '@/lib/dateUtils';
import { PageHeader } from '@/components/PageHeader';
import { BELT_DISCIPLINE_SLUGS } from '@/lib/belts';

/** Días sin venir a una clase para dejar de ser habitual de esa franja. */
const REGULAR_WINDOW_DAYS = 21;

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
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
  remaining_credits: number | null;
  is_class_pack: boolean;
}

interface AttendanceRecord {
  id: string;
  user_id: string | null;
  guest_name: string | null;
}

interface Discipline {
  id: string;
  name: string;
  slug: string;
}

export function CoachAttendancePage() {
  const { user } = useAuth();
  const todayDate = getLocalDateISO();
  const currentMonth = todayDate.slice(0, 7);
  const jsDay = new Date().getDay(); // 0=Dom, 1=Lun ... 6=Sab
  const todayDayOfWeek = jsDay === 0 ? 7 : jsDay;

  const [allClasses, setAllClasses] = useState<ScheduleClass[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(
    todayDayOfWeek >= 1 && todayDayOfWeek <= 6 ? todayDayOfWeek : 1
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentCard[]>([]);
  const [attendances, setAttendancesState] = useState<AttendanceRecord[]>([]);
  // Copia siempre al día de la lista de presentes. Con toques rápidos varios guardados terminan a la vez:
  // si cada uno rehiciera la lista desde la copia que vio al tocar, se pisarían y algunos alumnos
  // quedarían guardados en la BD pero sin marcar en pantalla.
  const attendancesRef = useRef<AttendanceRecord[]>([]);
  const setAttendances = (next: AttendanceRecord[] | ((prev: AttendanceRecord[]) => AttendanceRecord[])) => {
    const value = typeof next === 'function' ? next(attendancesRef.current) : next;
    attendancesRef.current = value;
    setAttendancesState(value);
  };
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  // Habituales: user_id -> nº de asistencias a ESTA clase en las últimas 3 semanas
  const [regularCounts, setRegularCounts] = useState<Record<string, number>>({});
  const [showOthers, setShowOthers] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestDisciplineId, setGuestDisciplineId] = useState('');
  const [guestDate, setGuestDate] = useState(todayDate);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  const showToast = (msg: string, isError = false) => {
    setToastMsg(msg);
    setToastError(isError);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), isError ? 4500 : 2200);
  };

  // Sin red, pasar lista no puede guardarse: se avisa en vez de fallar en silencio.
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

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
        supabase.from('disciplines').select('id, name, slug').order('sort_order'),
      ]);

      const list = (clsRes.data as ScheduleClass[]) ?? [];
      setAllClasses(list);
      setDisciplines((discRes.data as Discipline[]) ?? []);

      // Si hoy es fin de semana o no hay clases hoy, salta al próximo día con clases (ej. Lunes)
      let targetDay = todayDayOfWeek >= 1 && todayDayOfWeek <= 6 ? todayDayOfWeek : 1;
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
      const nowTime = getLocalTimeHHMM();
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
          .select(
            'user_id, remaining_credits, plans(is_class_pack, pack_credits), profiles!inner(id, full_name, alias, avatar_url, belt, status, role)'
          )
          .eq('month_year', currentMonth)
          .eq('status', 'active')
          .in('plan_id', allowedPlanIds)
          .eq('profiles.status', 'active')
          .eq('profiles.role', 'client');

        eligibleStudents = (subs ?? [])
          .map((row: unknown) => {
            const r = row as {
              remaining_credits: number | null;
              plans?: { is_class_pack?: boolean; pack_credits?: number | null } | null;
              profiles: {
                id: string;
                full_name: string;
                alias: string | null;
                avatar_url: string | null;
                belt: string | null;
              };
            };
            const isPack = Boolean(r.plans?.is_class_pack);
            const credits = isPack ? (r.remaining_credits ?? r.plans?.pack_credits ?? 1) : null;
            return {
              ...r.profiles,
              is_class_pack: isPack,
              remaining_credits: credits,
            };
          })
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
      }

      // Historial de esta clase (franja y disciplina) en las últimas 3 semanas, sin contar hoy
      const since = new Date();
      since.setDate(since.getDate() - REGULAR_WINDOW_DAYS);
      const { data: histData } = await supabase
        .from('attendances')
        .select('user_id')
        .eq('schedule_class_id', selected.id)
        .gte('attendance_date', getLocalDateISO(since))
        .lt('attendance_date', todayDate)
        .not('user_id', 'is', null);
      const counts: Record<string, number> = {};
      ((histData as { user_id: string }[]) ?? []).forEach((r) => {
        counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
      });
      setRegularCounts(counts);
      setShowOthers(false);

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

  // El cinturón solo se muestra en las clases de BJJ y Grappling
  const classDisciplineId = allClasses.find((c) => c.id === selectedClassId)?.discipline_id;
  const classUsesBelt = disciplines.some(
    (d) => d.id === classDisciplineId && BELT_DISCIPLINE_SLUGS.includes(d.slug)
  );

  const toggleStudent = async (studentId: string) => {
    if (!isToday || togglingIds[studentId]) return;
    const selected = allClasses.find((c) => c.id === selectedClassId);
    if (!selected || !user) return;
    const studentName = students.find((s) => s.id === studentId)?.full_name ?? 'el alumno';
    if (!navigator.onLine) {
      showToast(`Sin conexión: no se guardó la asistencia de ${studentName}`, true);
      return;
    }

    setTogglingIds((prev) => ({ ...prev, [studentId]: true }));
    try {
      const existing = attendancesRef.current.find((a) => a.user_id === studentId);
      if (existing) {
        const { error } = await supabase.from('attendances').delete().eq('id', existing.id);
        if (error) {
          showToast(`No se pudo quitar a ${studentName}. Revisa la conexión y vuelve a tocar.`, true);
        } else {
          setAttendances((prev) => prev.filter((a) => a.id !== existing.id));
          const nextList = attendancesRef.current;
          setStudents((prev) =>
            prev.map((s) =>
              s.id === studentId && s.is_class_pack && s.remaining_credits !== null
                ? { ...s, remaining_credits: s.remaining_credits + 1 }
                : s
            )
          );
          const count = nextList.filter((a) => a.user_id !== null).length;
          showToast(`Asistencia retirada · ${count} presentes`);
        }
      } else {
        const { data, error } = await supabase
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
        if (error?.code === '23505') {
          // Ya estaba guardado (otro dispositivo o un toque anterior): se sincroniza en vez de dar error
          const { data: fresh } = await supabase
            .from('attendances')
            .select('id, user_id, guest_name')
            .eq('schedule_class_id', selected.id)
            .eq('attendance_date', todayDate);
          setAttendances((fresh as AttendanceRecord[]) ?? attendancesRef.current);
          showToast(`${studentName} ya estaba marcado · ${attendancesRef.current.filter((a) => a.user_id !== null).length} presentes`);
        } else if (error || !data) {
          showToast(`No se guardó la asistencia de ${studentName}. Revisa la conexión y vuelve a tocar.`, true);
        } else {
          setAttendances((prev) =>
            prev.some((a) => a.id === (data as AttendanceRecord).id) ? prev : [...prev, data as AttendanceRecord]
          );
          const nextList = attendancesRef.current;
          setStudents((prev) =>
            prev.map((s) =>
              s.id === studentId && s.is_class_pack && s.remaining_credits !== null
                ? { ...s, remaining_credits: Math.max(0, s.remaining_credits - 1) }
                : s
            )
          );
          const count = nextList.filter((a) => a.user_id !== null).length;
          showToast(`Asistencia guardada · ${count} presentes`);
        }
      }
    } catch {
      showToast(`No se guardó la asistencia de ${studentName}. Revisa la conexión y vuelve a tocar.`, true);
    } finally {
      setTogglingIds((prev) => ({ ...prev, [studentId]: false }));
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

  const memberAttendancesCount = attendances.filter((a) => a.user_id !== null).length;
  const guestList = attendances.filter((a) => !a.user_id && a.guest_name);
  const selectedDayLabel = DAYS.find((d) => d.value === selectedDay)?.label ?? '';
  const visibleStudents = searchTerm.trim()
    ? students.filter(
        (s) =>
          s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.alias && s.alias.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : students;

  // Habituales de la franja arriba; el resto plegado. Sin historial (primera vez) se ve todo.
  // Se calcula solo con el historial: marcar hoy a alguien de "Otros" no lo mueve de sitio.
  const hasRegulars = students.some((s) => regularCounts[s.id]);
  const splitByRegulars = hasRegulars && !searchTerm.trim();
  const regularStudents = students
    .filter((s) => regularCounts[s.id])
    .sort(
      (a, b) =>
        (regularCounts[b.id] ?? 0) - (regularCounts[a.id] ?? 0) || a.full_name.localeCompare(b.full_name)
    );
  const otherStudents = students.filter((s) => !regularCounts[s.id]);
  const othersMarked = otherStudents.filter((s) => attendances.some((a) => a.user_id === s.id)).length;

  const renderCard = (st: StudentCard) => {
    const checked = attendances.some((a) => a.user_id === st.id);
    const busy = Boolean(togglingIds[st.id]);
    return (
      <motion.button
        key={st.id}
        type="button"
        disabled={busy}
        whileHover={isToday ? { y: -3, scale: 1.02 } : undefined}
        whileTap={isToday ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        onClick={() => toggleStudent(st.id)}
        className={`group relative rounded-2xl p-2.5 sm:p-4 border text-left transition-[color,background-color,border-color,box-shadow,opacity] duration-200 flex flex-col items-center text-center gap-2.5 ${
          checked
            ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-[0_10px_24px_-10px_rgba(16,185,129,0.45)]'
            : isToday
              ? 'bg-white/[0.04] border-white/10 text-slate-200 hover:border-studio-red/70 hover:bg-white/[0.09] hover:shadow-[0_12px_28px_-10px_rgba(220,38,38,0.4)]'
              : 'bg-studio-navy/70 border-white/10 text-slate-200 cursor-default'
        } ${busy ? 'opacity-60' : ''}`}
      >
        {checked && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm"
          >
            <Check className="w-4 h-4" />
          </motion.span>
        )}
        <div
          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full studio-panel-inset border overflow-hidden flex items-center justify-center transition-[transform,box-shadow,border-color] duration-200 group-hover:scale-110 ${
            checked
              ? 'border-emerald-400/70 ring-2 ring-emerald-400/40'
              : 'border-white/10 group-hover:ring-2 group-hover:ring-studio-red/75 group-hover:shadow-[0_0_18px_rgba(220,38,38,0.4)]'
          }`}
        >
          {st.avatar_url ? (
            <img
              src={st.avatar_url}
              alt={st.full_name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <User className="w-7 h-7 text-slate-500 transition-colors duration-200 group-hover:text-white" />
          )}
        </div>
        <div>
          <p className="text-xs sm:text-sm font-semibold leading-tight break-words">{st.full_name}</p>
          {st.alias && (
            <p className="text-[11px] text-studio-cream/80 font-medium">&ldquo;{st.alias}&rdquo;</p>
          )}
          {classUsesBelt && st.belt && <p className="text-[11px] text-slate-400 mt-0.5">{st.belt}</p>}
          {st.is_class_pack && st.remaining_credits !== null && (
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                st.remaining_credits > 0
                  ? 'bg-sky-500/15 text-sky-300'
                  : 'bg-studio-red/20 text-red-300'
              }`}
            >
              {st.remaining_credits > 0
                ? `Bono: ${st.remaining_credits} ${st.remaining_credits === 1 ? 'clase' : 'clases'}`
                : 'Bono agotado (0)'}
            </span>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>{isToday ? 'Pasar lista' : `Previsión del ${selectedDayLabel}`}</>}
        actions={
          <>
            <button
              onClick={() => {
                const current = allClasses.find((c) => c.id === selectedClassId);
                if (current) setGuestDisciplineId(current.discipline_id);
                else if (disciplines[0]) setGuestDisciplineId(disciplines[0].id);
                setShowGuestModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 min-h-11 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white hover:bg-white/5 shrink-0"
            >
              <UserPlus className="w-4 h-4 text-studio-red" />
              + Invitado / Clase Prueba
            </button>
          </>
        }
      />

      {!online && (
        <div
          role="alert"
          className="sticky top-2 z-20 rounded-2xl border border-studio-red/50 bg-studio-red/20 text-red-100 px-4 py-3 flex items-center gap-3"
        >
          <WifiOff className="w-5 h-5 shrink-0" aria-hidden />
          <p className="text-sm">
            <strong>Sin conexión.</strong> La asistencia no se guardará hasta que vuelva la red.
          </p>
        </div>
      )}

      {/* Selector de Día (Lunes a Viernes) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 mr-1">
          <Calendar className="w-3.5 h-3.5" /> Día:
        </span>
        {/* El sábado solo aparece si hay clases ese día */}
        {DAYS.filter((d) => d.value <= 5 || allClasses.some((c) => c.day_of_week === d.value)).map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDay(d.value)}
            className={`min-h-11 px-3.5 rounded-xl text-xs font-semibold border transition ${
              selectedDay === d.value
                ? 'bg-white text-studio-navy-deep border-white'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:border-white/25'
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
                  ? 'bg-studio-cream border-studio-cream text-slate-950'
                  : 'bg-white/[0.04] border-white/10 text-slate-300 hover:border-white/25'
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
            className="w-full max-w-md rounded-2xl studio-panel border border-white/15 p-6 space-y-4 shadow-modal"
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
                  className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">Teléfono</label>
                  <input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="600 000 000"
                    className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="carlos@email.com"
                    className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
                  <label className="block text-xs text-slate-400 uppercase mb-1">
                    Fecha prueba *
                  </label>
                  <input
                    type="date"
                    value={guestDate}
                    onChange={(e) => setGuestDate(e.target.value)}
                    required
                    className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
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
                className="px-5 py-2 rounded-xl studio-btn text-sm font-semibold text-white"
              >
                Guardar Prueba
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contador y búsqueda rápida */}
      {classesForDay.length > 0 && (
        <div className="sticky top-[4.5rem] z-20 -mx-2 px-2 py-2 rounded-2xl bg-[#272c35]/90 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Users className="w-4 h-4 text-emerald-400" />
            {isToday ? (
              <span>
                <strong className="text-white">{memberAttendancesCount}</strong> de{' '}
                <strong className="text-white">{students.length}</strong> alumnos marcados
                {guestList.length > 0 ? ` (+${guestList.length} prueba)` : ''}
              </span>
            ) : (
              <span>
                <strong className="text-white">{students.length}</strong> alumnos previstos en esta clase
              </span>
            )}
          </div>

          {students.length > 6 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar alumno..."
                className="w-full min-h-11 rounded-xl studio-field pl-9 pr-3 py-2 text-sm text-white"
              />
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-4 border border-white/10 bg-white/[0.03] flex flex-col items-center gap-2.5"
            >
              <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 !rounded-full" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          ))}
        </div>
      ) : classesForDay.length === 0 ? (
        <EmptyState icon={CalendarX}>No hay clases programadas para este día.</EmptyState>
      ) : visibleStudents.length === 0 ? (
        <EmptyState icon={Users}>
          {students.length === 0
            ? `No hay alumnos activos con tarifa compatible para esta disciplina este mes (${currentMonth}).`
            : 'Ningún alumno coincide con la búsqueda.'}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {splitByRegulars ? (
            <>
              <section aria-label="Habituales de esta clase" className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-300">
                  <Star className="w-3.5 h-3.5 text-amber-300" aria-hidden />
                  Habituales de esta clase ({regularStudents.length})
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {regularStudents.map(renderCard)}
                </div>
              </section>
              {otherStudents.length > 0 && (
                <section aria-label="Otros alumnos de la disciplina" className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowOthers((v) => !v)}
                    aria-expanded={showOthers}
                    className="w-full min-h-11 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-4 text-sm font-semibold text-slate-200"
                  >
                    <span>
                      Otros alumnos de la disciplina ({otherStudents.length})
                      {othersMarked > 0 && (
                        <span className="ml-2 text-emerald-300">· {othersMarked} marcado{othersMarked === 1 ? '' : 's'} hoy</span>
                      )}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showOthers ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                  {showOthers && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                      {otherStudents.map(renderCard)}
                    </div>
                  )}
                </section>
              )}
            </>
          ) : (
            <>
              {!hasRegulars && !searchTerm.trim() && (
                <p className="text-xs text-slate-300">
                  Primera vez en esta clase: cuando pases lista, la próxima vez verás arriba solo a los habituales de esta franja.
                </p>
              )}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {visibleStudents.map(renderCard)}
              </div>
            </>
          )}
        </div>
      )}

      {guestList.length > 0 && (
        <div className="rounded-2xl studio-panel border border-white/10 p-4">
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
      {/* El centrado va en un contenedor: motion reescribe transform y anulaba -translate-x-1/2. */}
      <div className="fixed bottom-24 md:bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              role={toastError ? 'alert' : 'status'}
              className={`max-w-full px-4 py-2.5 rounded-2xl text-white text-xs font-semibold shadow-modal flex items-center gap-2 ${
                toastError
                  ? 'bg-studio-red border border-red-300/40'
                  : 'bg-emerald-600 border border-emerald-400/40'
              }`}
            >
              {toastError ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
