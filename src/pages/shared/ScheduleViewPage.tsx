import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
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

interface ScheduleClass {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  coach_name: string;
  disciplines?: { name: string; slug: string } | null;
}

export function ScheduleViewPage() {
  const [classes, setClasses] = useState<ScheduleClass[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const jsDay = now.getDay();
  const todayDay = jsDay === 0 ? 7 : jsDay;
  const nowTime = now.toTimeString().slice(0, 5);

  useEffect(() => {
    supabase
      .from('schedule_classes')
      .select('*, disciplines(name, slug)')
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time')
      .then(({ data }) => {
        setClasses((data as unknown as ScheduleClass[]) ?? []);
        setLoading(false);
      });
  }, []);

  const todayClasses = classes.filter((c) => c.day_of_week === todayDay);
  const currentClass = todayClasses.find(
    (c) => c.start_time.slice(0, 5) <= nowTime && c.end_time.slice(0, 5) >= nowTime
  );
  const nextClass = todayClasses.find((c) => c.start_time.slice(0, 5) > nowTime);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
          Horario Semanal
        </h1>
        <p className="text-sm text-slate-400">Parrilla oficial de clases y profesores.</p>
      </div>

      {/* Clase en curso / Siguiente clase (Slide 8) */}
      {(currentClass || nextClass) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentClass && (
            <div className="relative overflow-hidden rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-4 flex items-center gap-4">
              <img
                src={getDisciplineImage(currentClass.disciplines?.slug, currentClass.title)}
                alt={currentClass.title}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-emerald-400/40"
              />
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  <Clock className="w-3.5 h-3.5" /> Clase en curso
                </span>
                <p className="font-headline text-xl text-white mt-0.5">{currentClass.title}</p>
                <p className="text-xs text-slate-300">
                  {currentClass.start_time.slice(0, 5)} – {currentClass.end_time.slice(0, 5)} · Prof.{' '}
                  {currentClass.coach_name}
                </p>
              </div>
            </div>
          )}
          {nextClass && (
            <div className="relative overflow-hidden rounded-2xl bg-studio-navy border border-studio-red/40 p-4 flex items-center gap-4">
              <img
                src={getDisciplineImage(nextClass.disciplines?.slug, nextClass.title)}
                alt={nextClass.title}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/15"
              />
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-studio-red">
                  <Clock className="w-3.5 h-3.5" /> Siguiente clase hoy
                </span>
                <p className="font-headline text-xl text-white mt-0.5">{nextClass.title}</p>
                <p className="text-xs text-slate-300">
                  {nextClass.start_time.slice(0, 5)} – {nextClass.end_time.slice(0, 5)} · Prof.{' '}
                  {nextClass.coach_name}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando horario...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.map((day) => {
            const list = classes.filter((c) => c.day_of_week === day.value);
            return (
              <div
                key={day.value}
                className={`rounded-2xl border p-4 ${
                  day.value === todayDay
                    ? 'bg-studio-navy border-studio-red/50'
                    : 'bg-studio-navy border-white/10'
                }`}
              >
                <h2 className="font-headline text-lg uppercase text-white border-b border-white/10 pb-2 mb-3 flex items-center justify-between">
                  <span>{day.label}</span>
                  {day.value === todayDay && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-studio-red text-white">
                      HOY
                    </span>
                  )}
                </h2>
                {list.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin clases</p>
                ) : (
                  <div className="space-y-2.5">
                    {list.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl bg-studio-navy-deep p-2.5 border border-white/5 flex items-center gap-3"
                      >
                        <img
                          src={getDisciplineImage(c.disciplines?.slug, c.title)}
                          alt={c.title}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-studio-red">
                            {c.start_time.slice(0, 5)} – {c.end_time.slice(0, 5)}
                          </p>
                          <p className="text-sm font-medium text-white truncate">{c.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            Prof. {c.coach_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
