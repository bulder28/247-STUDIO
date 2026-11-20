import { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateISO, getNextDateForDayOfWeek } from '@/lib/dateUtils';
import { preconfKey, toggleClassPreconfirmation, type PreconfirmationRow } from '@/lib/preconfirmations';
import { getDisciplineImage } from '@/lib/disciplineImages';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/KpiCard';

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
  image_key?: string | null;
  disciplines?: { name: string; slug: string } | null;
}

/** Tarjeta protagonista: clase en curso o siguiente clase del día. */
function LiveClassCard({ cls, live }: { cls: ScheduleClass; live: boolean }) {
  const img = getDisciplineImage(cls.disciplines?.slug, cls.title, cls.image_key);
  return (
    <div className="relative overflow-hidden rounded-3xl min-h-[11rem] flex items-end p-5 sm:p-6 ring-1 ring-white/10">
      <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#272c35] via-[#272c35]/70 to-[#272c35]/10" />
      <div className="relative min-w-0 w-full">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            live ? 'bg-emerald-400 text-emerald-950' : 'bg-studio-cream text-slate-950'
          }`}
        >
          {live ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-900 animate-pulse" />
          ) : (
            <Clock className="w-3 h-3" />
          )}
          {live ? 'En el tatami ahora' : 'Siguiente clase de hoy'}
        </span>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-headline text-2xl sm:text-3xl uppercase text-white leading-none truncate">
              {cls.title}
            </p>
            <p className="text-sm text-slate-300 mt-1 truncate">Prof. {cls.coach_name}</p>
          </div>
          <p className="font-headline text-3xl sm:text-4xl text-studio-cream leading-none tabular-nums shrink-0">
            {cls.start_time.slice(0, 5)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ScheduleViewPage() {
  const { user, profile } = useAuth();
  const isClient = profile?.role === 'client';
  const [classes, setClasses] = useState<ScheduleClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<'all' | number>('all');
  const [linkedChildren, setLinkedChildren] = useState<{ id: string; full_name: string }[]>([]);
  const [preconfSet, setPreconfSet] = useState<Set<string>>(new Set());
  const [togglingPreconf, setTogglingPreconf] = useState<Record<string, boolean>>({});

  const now = new Date();
  const todayDate = getLocalDateISO(now);
  const jsDay = now.getDay();
  const todayDay = jsDay === 0 ? 7 : jsDay;
  const nowTime = now.toTimeString().slice(0, 5);

  useEffect(() => {
    const loadSchedule = async () => {
      const { data } = await supabase
        .from('schedule_classes')
        .select('*, disciplines(name, slug)')
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');
      setClasses((data as unknown as ScheduleClass[]) ?? []);

      if (isClient && user?.id) {
        const { data: kidsData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('guardian_user_id', user.id)
          .order('full_name');
        const kids = (kidsData as { id: string; full_name: string }[]) ?? [];
        setLinkedChildren(kids);

        const familyIds = [user.id, ...kids.map((k) => k.id)];
        const { data: preconfRows } = await supabase
          .from('class_preconfirmations')
          .select('user_id, schedule_class_id, class_date')
          .gte('class_date', todayDate)
          .in('user_id', familyIds);
        setPreconfSet(
          new Set(
            ((preconfRows as PreconfirmationRow[]) ?? []).map((r) =>
              preconfKey(r.user_id, r.schedule_class_id, r.class_date)
            )
          )
        );
      }
      setLoading(false);
    };
    loadSchedule();
  }, [isClient, user?.id, todayDate]);

  const handleTogglePreconf = async (targetUserId: string, cls: ScheduleClass) => {
    if (!user?.id) return;
    const targetDate = getNextDateForDayOfWeek(cls.day_of_week);
    const key = preconfKey(targetUserId, cls.id, targetDate);
    if (togglingPreconf[key]) return;
    const currentlyConfirmed = preconfSet.has(key);

    setTogglingPreconf((prev) => ({ ...prev, [key]: true }));
    setPreconfSet((prev) => {
      const next = new Set(prev);
      if (currentlyConfirmed) next.delete(key);
      else next.add(key);
      return next;
    });

    const ok = await toggleClassPreconfirmation({
      userId: targetUserId,
      scheduleClassId: cls.id,
      classDate: targetDate,
      confirmedBy: user.id,
      currentlyConfirmed,
    });

    if (!ok) {
      setPreconfSet((prev) => {
        const next = new Set(prev);
        if (currentlyConfirmed) next.add(key);
        else next.delete(key);
        return next;
      });
    }
    setTogglingPreconf((prev) => ({ ...prev, [key]: false }));
  };

  const todayClasses = classes.filter((c) => c.day_of_week === todayDay);
  const currentClass = todayClasses.find(
    (c) => c.start_time.slice(0, 5) <= nowTime && c.end_time.slice(0, 5) >= nowTime
  );
  const nextClass = todayClasses.find((c) => c.start_time.slice(0, 5) > nowTime);
  const visibleDays = selectedDay === 'all' ? DAYS : DAYS.filter((d) => d.value === selectedDay);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horario"
        actions={
          <div
            className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/10"
            role="group"
            aria-label="Filtrar por día"
          >
            <button
              type="button"
              onClick={() => setSelectedDay('all')}
              aria-pressed={selectedDay === 'all'}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedDay === 'all'
                  ? 'bg-studio-cream text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              Semana
            </button>
            {DAYS.map((d) => {
              const isToday = d.value === todayDay;
              const isSelected = selectedDay === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDay(d.value)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-studio-cream text-slate-950'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-studio-red" />}
                  <span>{d.label.slice(0, 3)}</span>
                </button>
              );
            })}
          </div>
        }
      />

      {(currentClass || nextClass) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentClass && <LiveClassCard cls={currentClass} live />}
          {nextClass && <LiveClassCard cls={nextClass} live={false} />}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full !rounded-3xl" />
          ))}
        </div>
      ) : (
        <div
          className={`grid gap-4 items-start ${
            selectedDay === 'all' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-xl'
          }`}
        >
          {visibleDays.map((day) => {
            const list = classes.filter((c) => c.day_of_week === day.value);
            const isToday = day.value === todayDay;
            return (
              <section
                key={day.value}
                className={`rounded-3xl p-5 sm:p-6 ${
                  isToday ? 'studio-sand' : 'studio-panel border border-white/10'
                }`}
              >
                <h2
                  className={`font-headline text-2xl uppercase leading-none flex items-baseline justify-between pb-3 mb-1 border-b ${
                    isToday ? 'border-[#141a2b]/15' : 'text-white border-white/10'
                  }`}
                >
                  <span>{day.label}</span>
                  {isToday ? (
                    <span className="text-xs font-sans font-semibold normal-case text-red-700">Hoy</span>
                  ) : (
                    <span className="text-xs font-sans font-normal normal-case text-slate-400 tabular-nums">
                      {list.length > 0 && `${list.length} ${list.length === 1 ? 'clase' : 'clases'}`}
                    </span>
                  )}
                </h2>
                {list.length === 0 ? (
                  <p className={`text-sm pt-3 ${isToday ? 'text-[#141a2b]/80' : 'text-slate-400'}`}>
                    Día de descanso, sin clases.
                  </p>
                ) : (
                  <ul className={`divide-y ${isToday ? 'divide-[#141a2b]/10' : 'divide-white/[0.06]'}`}>
                    {list.map((c) => {
                      const isLive = isToday && currentClass?.id === c.id;
                      const isPast = isToday && c.end_time.slice(0, 5) < nowTime;
                      return (
                        <li
                          key={c.id}
                          className={`group flex items-center gap-3.5 py-3 px-2 -mx-2 rounded-xl transition-[background-color,opacity] duration-200 ${
                            isToday ? 'hover:bg-[#141a2b]/[0.06]' : 'hover:bg-white/[0.06]'
                          } ${isPast ? 'opacity-75' : ''}`}
                        >
                          <div className="w-14 shrink-0">
                            <p
                              className={`font-headline text-xl leading-none tabular-nums ${
                                isToday ? 'text-[#141a2b]' : 'text-studio-cream'
                              }`}
                            >
                              {c.start_time.slice(0, 5)}
                            </p>
                            <p
                              className={`text-[11px] tabular-nums mt-0.5 ${
                                isToday ? 'text-[#141a2b]/80' : 'text-slate-400'
                              }`}
                            >
                              {c.end_time.slice(0, 5)}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isToday ? 'text-[#141a2b]' : 'text-white'
                              }`}
                            >
                              {c.title}
                              {isLive && (
                                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse align-middle" />
                              )}
                            </p>
                            <p
                              className={`text-xs truncate ${
                                isToday ? 'text-[#141a2b]/85' : 'text-slate-300'
                              }`}
                            >
                              Prof. {c.coach_name}
                            </p>
                            {isClient && user?.id && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {(linkedChildren.length > 0
                                  ? [
                                      ...linkedChildren.map((k) => ({
                                        id: k.id,
                                        label: k.full_name.split(' ')[0],
                                      })),
                                      { id: user.id, label: 'Yo' },
                                    ]
                                  : [{ id: user.id, label: '' }]
                                ).map((m) => {
                                  const targetDate = getNextDateForDayOfWeek(c.day_of_week);
                                  const key = preconfKey(m.id, c.id, targetDate);
                                  const confirmed = preconfSet.has(key);
                                  const busy = Boolean(togglingPreconf[key]);
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleTogglePreconf(m.id, c)}
                                      aria-pressed={confirmed}
                                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold border transition ${
                                        confirmed
                                          ? isToday
                                            ? 'bg-emerald-700 border-emerald-800 text-white'
                                            : 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                          : isToday
                                            ? 'bg-[#141a2b]/10 border-[#141a2b]/20 text-[#141a2b] hover:bg-[#141a2b]/20'
                                            : 'bg-white/[0.04] border-white/15 text-slate-300 hover:text-white hover:border-emerald-400/50'
                                      } disabled:opacity-50`}
                                    >
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                      <span>
                                        {linkedChildren.length > 0
                                          ? confirmed
                                            ? `${m.label}: Voy`
                                            : m.label
                                          : confirmed
                                            ? 'Confirmado'
                                            : 'Confirmar'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <img
                            src={getDisciplineImage(c.disciplines?.slug, c.title, c.image_key)}
                            alt=""
                            className="w-11 h-11 rounded-xl object-cover shrink-0 transition-transform duration-300 group-hover:scale-110"
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
