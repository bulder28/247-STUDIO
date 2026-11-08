import React, { useEffect } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, SkipForward, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSparringTimerStore } from '@/shared/stores/useSparringTimerStore';

export const SparringTimerPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    roundDuration,
    totalRounds,
    currentRound,
    secondsRemaining,
    phase,
    isRunning,
    setRoundDuration,
    setRestDuration,
    setTotalRounds,
    togglePlayPause,
    resetTimer,
    skipRound,
    tick,
  } = useSparringTimerStore();

  // Bucle central de ejecución del cronómetro
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, tick]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'FIGHT':
        return 'bg-emerald-600 text-white';
      case 'REST':
        return 'bg-amber-500 text-slate-950';
      case 'FINISHED':
        return 'bg-rose-700 text-white';
      default:
        return 'bg-slate-900 text-white';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)] max-w-4xl mx-auto justify-between animate-in fade-in duration-200">
      {/* Barra de cabecera */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-brand-accent" />
          <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900">
            Cronómetro de Sparring
          </h1>
        </div>
        <div className="text-[11px] font-mono text-slate-400">247Studio</div>
      </div>

      {/* Selector de Presets de Sparring */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-2 shrink-0 overflow-x-auto">
        {[
          { label: '5 min / 1 min', round: 300, rest: 60, rounds: 5 },
          { label: '6 min / 1 min', round: 360, rest: 60, rounds: 5 },
          { label: '7 min (IBJJF)', round: 420, rest: 60, rounds: 4 },
          { label: '10 min (Negro)', round: 600, rest: 90, rounds: 3 },
        ].map((p, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isRunning}
            onClick={() => {
              setRoundDuration(p.round);
              setRestDuration(p.rest);
              setTotalRounds(p.rounds);
              resetTimer();
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold border transition ${
              roundDuration === p.round && !isRunning
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            } disabled:opacity-50`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Gran Display del Temporizador (Cero Scroll) */}
      <div
        className={`flex-1 min-h-0 my-2 sm:my-3 rounded-3xl ${getPhaseColor()} p-4 flex flex-col items-center justify-center shadow-lg transition-colors duration-300 relative overflow-hidden`}
      >
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/25 text-white/90 text-xs font-bold uppercase tracking-widest backdrop-blur-xs">
            {phase === 'FIGHT' && `🥋 Asalto ${currentRound} de ${totalRounds}`}
            {phase === 'REST' && '⏳ Tiempo de Descanso'}
            {phase === 'FINISHED' && '🏁 Entrenamiento Finalizado'}
          </div>

          <div className="font-mono font-black text-6xl sm:text-8xl md:text-9xl tracking-tight select-none">
            {formatTime(secondsRemaining)}
          </div>

          <p className="text-xs sm:text-sm font-semibold opacity-90 uppercase tracking-wider">
            {phase === 'FIGHT' && 'Combate Activo'}
            {phase === 'REST' && `Próximo: Asalto ${currentRound + 1}`}
            {phase === 'FINISHED' && '¡Buen entreno! Oss'}
          </p>
        </div>
      </div>

      {/* Controles de Acción Rápidos */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={resetTimer}
          className="flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reiniciar</span>
        </button>

        <button
          type="button"
          onClick={togglePlayPause}
          className={`flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Pausar</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-emerald-400" />
              <span>{phase === 'FINISHED' ? 'Repetir' : 'Iniciar'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={skipRound}
          disabled={phase === 'FINISHED'}
          className="flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl text-xs sm:text-sm font-bold transition disabled:opacity-40 cursor-pointer"
        >
          <SkipForward className="w-4 h-4" />
          <span>Pasar</span>
        </button>
      </div>
    </div>
  );
};
