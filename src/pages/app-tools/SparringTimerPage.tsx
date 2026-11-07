import React, { useEffect, useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, SkipForward, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dojoAudio } from '@/shared/utils/audioEffects';

type TimerPhase = 'PREP' | 'FIGHT' | 'REST' | 'FINISHED';

export const SparringTimerPage: React.FC = () => {
  const navigate = useNavigate();
  const [roundDuration, setRoundDuration] = useState<number>(300); // 5 min
  const [restDuration, setRestDuration] = useState<number>(60); // 1 min
  const [totalRounds, setTotalRounds] = useState<number>(5);

  const [currentRound, setCurrentRound] = useState<number>(1);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(roundDuration);
  const [phase, setPhase] = useState<TimerPhase>('FIGHT');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Synchronize when settings change and not running
  useEffect(() => {
    if (!isRunning && phase === 'FIGHT') {
      setSecondsRemaining(roundDuration);
    }
  }, [roundDuration, isRunning, phase]);

  // Main Timer Loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev === 11 && phase === 'FIGHT') {
            dojoAudio.playWoodTick();
            dojoAudio.triggerHaptic('warning');
          }

          if (prev <= 1) {
            if (phase === 'FIGHT') {
              dojoAudio.playRoundBell();
              dojoAudio.triggerHaptic('medium');

              if (currentRound >= totalRounds) {
                setPhase('FINISHED');
                setIsRunning(false);
                return 0;
              } else {
                setPhase('REST');
                return restDuration;
              }
            } else if (phase === 'REST') {
              dojoAudio.playRoundBell();
              dojoAudio.triggerHaptic('success');
              setCurrentRound((r) => r + 1);
              setPhase('FIGHT');
              return roundDuration;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, phase, currentRound, totalRounds, roundDuration, restDuration]);

  const toggleRunning = () => {
    if (!isRunning) {
      if (phase === 'FINISHED') {
        resetTimer();
      }
      dojoAudio.playRoundBell();
      dojoAudio.triggerHaptic('success');
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setPhase('FIGHT');
    setCurrentRound(1);
    setSecondsRemaining(roundDuration);
  };

  const skipPhase = () => {
    if (phase === 'FIGHT') {
      dojoAudio.playRoundBell();
      if (currentRound >= totalRounds) {
        setPhase('FINISHED');
        setIsRunning(false);
      } else {
        setPhase('REST');
        setSecondsRemaining(restDuration);
      }
    } else if (phase === 'REST') {
      dojoAudio.playRoundBell();
      setCurrentRound((r) => r + 1);
      setPhase('FIGHT');
      setSecondsRemaining(roundDuration);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'FIGHT':
        return 'bg-[#09090B] text-white';
      case 'REST':
        return 'bg-zinc-200 text-[#09090B]';
      case 'FINISHED':
        return 'bg-brand-accent text-white';
      default:
        return 'bg-[#09090B] text-white';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)] max-w-4xl mx-auto justify-between animate-in fade-in duration-200">
      {/* Barra de cabecera */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7] shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-[#09090B] bg-white border border-[#E4E4E7] px-3 py-1.5 rounded-xl cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-brand-accent" />
          <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-[#09090B]">
            Cronómetro de Sparring
          </h1>
        </div>
        <div className="text-[11px] font-mono text-zinc-400">247Studio</div>
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
              setSecondsRemaining(p.round);
              setPhase('FIGHT');
              setCurrentRound(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold border transition ${
              roundDuration === p.round && !isRunning
                ? 'bg-[#09090B] text-white border-[#09090B]'
                : 'bg-white text-zinc-600 border-[#E4E4E7] hover:border-zinc-300'
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
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 text-current text-xs font-bold uppercase tracking-widest backdrop-blur-xs">
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
          className="flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-white border border-[#E4E4E7] text-[#09090B] hover:bg-zinc-100 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reiniciar</span>
        </button>

        <button
          type="button"
          onClick={toggleRunning}
          className={`flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
            isRunning
              ? 'bg-[#09090B] hover:bg-zinc-800 text-white shadow-md'
              : 'bg-brand-accent hover:bg-brand-accent-dark text-white shadow-md'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Pausar</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-white" />
              <span>{phase === 'FINISHED' ? 'Repetir' : 'Iniciar'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={skipPhase}
          disabled={phase === 'FINISHED'}
          className="flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-white border border-[#E4E4E7] text-[#09090B] hover:bg-zinc-100 rounded-2xl text-xs sm:text-sm font-bold transition disabled:opacity-40 cursor-pointer"
        >
          <SkipForward className="w-4 h-4" />
          <span>Pasar</span>
        </button>
      </div>
    </div>
  );
};
