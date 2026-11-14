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
  const [selectedDay, setSelectedDay] = useState<'all' | number>('all');

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
  const visibleDays = selectedDay === 'all' ? DAYS : DAYS.filter((d) => d.value === selectedDay);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
            Horario Semanal
          </h1>
          <p className="text-sm text-slate-400">Parrilla oficial de clases y profesores.</p>
        </div>

        {/* Filtro rápido por día */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              selectedDay === 'all'
                ? 'bg-studio-red border-studio-red text-white shadow-glow-red'
                : 'studio-panel-inset border-white/10 text-slate-300 hover:text-white'
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isSelected
                    ? 'bg-studio-red border-studio-red text-white shadow-glow-red'
                    : isToday
                      ? 'studio-panel-inset border-studio-red/50 text-white'
                      : 'studio-panel-inset border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                <span>{d.label.slice(0, 3)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clase en curso / Siguiente clase (Slide 8) */}
      {(currentClass || nextClass) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentClass && (
            <div className="relative overflow-hidden rounded-3xl border border-emerald-400/45 p-5 flex items-center gap-4 studio-panel">
              <img
                src={getDisciplineImage(currentClass.disciplines?.slug, currentClass.title)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-emerald-950/40 pointer-events-none" />
              <img
                src={getDisciplineImage(currentClass.disciplines?.slug, currentClass.title)}
                alt={currentClass.title}
                className="relative w-16 h-16 rounded-2xl object-cover shrink-0 border-2 border-emerald-400/60 shadow-modal"
              />
              <div className="relative min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En tatami ahora
                </span>
                <p className="font-headline text-xl text-white mt-1 truncate">{currentClass.title}</p>
                <p className="text-xs text-slate-300">
                  {currentClass.start_time.slice(0, 5)} – {currentClass.end_time.slice(0, 5)} · Prof.{' '}
                  {currentClass.coach_name}
                </p>
              </div>
            </div>
          )}
          {nextClass && (
            <div className="relative overflow-hidden rounded-3xl studio-panel border border-studio-red/45 p-5 flex items-center gap-4">
              <img
                src={getDisciplineImage(nextClass.disciplines?.slug, nextClass.title)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-transparent pointer-events-none" />
              <img
                src={getDisciplineImage(nextClass.disciplines?.slug, nextClass.title)}
                alt={nextClass.title}
                className="relative w-16 h-16 rounded-2xl object-cover shrink-0 border border-white/20 shadow-modal"
              />
              <div className="relative min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-studio-red/20 border border-studio-red/40 text-[10px] font-bold uppercase tracking-wider text-red-200">
                  <Clock className="w-3 h-3" /> Siguiente clase hoy
                </span>
                <p className="font-headline text-xl text-white mt-1 truncate">{nextClass.title}</p>
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
        <div
          className={`grid gap-4 ${
            selectedDay === 'all' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-xl'
          }`}
        >
          {visibleDays.map((day) => {
            const list = classes.filter((c) => c.day_of_week === day.value);
            return (
              <div
                key={day.value}
                className={`rounded-3xl studio-panel border p-5 transition ${
                  day.value === todayDay
                    ? 'border-studio-red/60 shadow-glow-red'
                    : 'border-white/10'
                }`}
              >
                <h2 className="font-headline text-lg uppercase text-white border-b border-white/10 pb-2.5 mb-3.5 flex items-center justify-between">
                  <span>{day.label}</span>
                  {day.value === todayDay && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-studio-red text-white font-bold">
                      HOY
                    </span>
                  )}
                </h2>
                {list.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin clases programadas</p>
                ) : (
                  <div className="space-y-2.5">
                    {list.map((c) => (
                      <div
                        key={c.id}
                        className="group rounded-2xl studio-panel-inset p-2.5 border border-white/5 hover:border-white/15 flex items-center gap-3 transition"
                      >
                        <img
                          src={getDisciplineImage(c.disciplines?.slug, c.title)}
                          alt={c.title}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10 group-hover:scale-105 transition"
                        />
                        <div className="min-w-0">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-studio-red/15 text-[11px] font-semibold text-red-200 mb-0.5">
                            {c.start_time.slice(0, 5)} – {c.end_time.slice(0, 5)}
                          </span>
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
