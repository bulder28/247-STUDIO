import React, { useMemo } from 'react';
import { Award, CheckCircle2, Lock, Sparkles, Trophy, Zap } from 'lucide-react';
import {
  calculateAthleteXP,
  calculateGraduationProgress,
  getAthleteBadges,
  getNextPromotion,
} from '@/shared/domain/graduation';
import { BookingDomainModel, UserDomainModel } from '@/shared/domain/types';
import { beltLabelEs } from '@/widgets/Belt';

interface BeltProgressionCardProps {
  user: UserDomainModel;
  bookings: BookingDomainModel[];
  className?: string;
}

export const BeltProgressionCard: React.FC<BeltProgressionCardProps> = ({
  user,
  bookings,
  className = '',
}) => {
  const attendedBookings = useMemo(
    () => bookings.filter((b) => b.status === 'ATTENDED'),
    [bookings]
  );
  const totalAttended = attendedBookings.length;

  // 1. Siguiente escalón de graduación
  const promotion = useMemo(
    () => getNextPromotion(user.belt, user.stripes || 0, user.beltSystem),
    [user.belt, user.stripes, user.beltSystem]
  );

  // 2. Progreso de clases hacia la siguiente raya (cada 25 asistencias)
  // Calculamos el resto para simular clases acumuladas en el grado actual
  const classesInCurrentRank = totalAttended > 0 ? (totalAttended % 25) || 25 : 0;
  const progress = useMemo(
    () => calculateGraduationProgress(classesInCurrentRank, 25),
    [classesInCurrentRank]
  );

  // 3. XP y Nivel de Tatami
  const xpData = useMemo(() => calculateAthleteXP(totalAttended), [totalAttended]);

  // 4. Medallas deportivas desbloqueables
  const badges = useMemo(() => getAthleteBadges(user, bookings), [user, bookings]);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const nextGoalLabel = promotion.isBeltPromotion
    ? `Cinturón ${beltLabelEs(promotion.nextBelt)}`
    : `${promotion.nextStripes}º Grado (Raya)`;

  return (
    <section className={`bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm text-slate-900 ${className}`}>
      {/* Cabecera Gamificación: Nivel de Tatami & XP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Nivel {xpData.level}
            </span>
            <span className="text-xs font-bold text-slate-400">•</span>
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">
              {xpData.title}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Camino a la Graduación
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Progreso oficial de tatami basado en horas y asistencias con Mario y David.
          </p>
        </div>

        {/* Contador de XP */}
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center gap-3 self-start sm:self-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl font-black text-slate-900">{xpData.xp}</span>
              <span className="text-[10px] font-black text-slate-400">XP</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 block">
              {xpData.nextLevelXp - xpData.xp} XP para Nivel {xpData.level + 1}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjeta de Progreso hacia la Siguiente Raya / Cinturón */}
      <div className="my-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl shrink-0">
              🥋
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-accent block">
                Próximo Ascenso
              </span>
              <h4 className="font-black text-base text-slate-900 tracking-tight">
                {nextGoalLabel}
              </h4>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="font-mono text-2xl font-black text-slate-900">
              {progress.percentage}%
            </span>
            <span className="text-[11px] text-slate-500 block font-medium">
              {progress.currentClasses} de {progress.targetClasses} clases completadas
            </span>
          </div>
        </div>

        {/* Barra de progreso interactiva */}
        <div className="w-full bg-white h-3.5 rounded-full p-0.5 border border-slate-200 shadow-inner overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-slate-900 via-brand-accent to-red-500 transition-all duration-500 shadow-sm"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Mensaje motivacional */}
        <div className="mt-3.5 flex items-center justify-between text-xs font-semibold">
          {progress.isReady ? (
            <span className="text-emerald-700 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ¡Has cumplido el volumen de entrenamientos! Habla con Mario o David para tu evaluación.
            </span>
          ) : (
            <span className="text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
              Faltan <span className="font-bold text-slate-900">{progress.classesRemaining} clases</span> para estar listo para la ceremonia.
            </span>
          )}

          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Tatami 247Studio
          </span>
        </div>
      </div>

      {/* Vitrina de Medallas Deportivas (Badges) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-black uppercase tracking-wide text-slate-900">
              Vitrina de Logros Deportivos
            </h4>
          </div>
          <span className="text-xs font-bold text-slate-500 font-mono">
            {unlockedCount} de {badges.length} desbloqueados
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-between min-h-[130px] ${
                b.unlocked
                  ? 'bg-amber-50/40 border-amber-200/80 hover:shadow-md hover:scale-[1.02]'
                  : 'bg-slate-50/70 border-slate-200/60 opacity-60'
              }`}
            >
              <div className="relative">
                <span className="text-3xl filter drop-shadow-sm block">{b.icon}</span>
                {!b.unlocked && (
                  <div className="absolute -bottom-1 -right-1 bg-slate-200 rounded-full p-1 border border-white">
                    <Lock className="w-2.5 h-2.5 text-slate-600" />
                  </div>
                )}
              </div>

              <div>
                <span className={`block text-xs font-black tracking-tight mt-1 ${b.unlocked ? 'text-slate-900' : 'text-slate-500'}`}>
                  {b.title}
                </span>
                <p className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                  {b.description}
                </p>
              </div>

              <span
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                  b.unlocked
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {b.unlocked ? 'Obtenido' : 'Bloqueado'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
