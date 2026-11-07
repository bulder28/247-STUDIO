import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Swords,
  X,
} from 'lucide-react';
import { dojoAudio } from '@/shared/utils/audioEffects';

interface SparringTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TimerPhase = 'PREP' | 'FIGHT' | 'REST' | 'FINISHED';

export const SparringTimerModal: React.FC<SparringTimerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [roundDuration, setRoundDuration] = useState<number>(300); // 5 min
  const [restDuration, setRestDuration] = useState<number>(60); // 1 min
  const [totalRounds, setTotalRounds] = useState<number>(5);

  const [currentRound, setCurrentRound] = useState<number>(1);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(roundDuration);
  const [phase, setPhase] = useState<TimerPhase>('FIGHT');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Synchronize when settings change and not running
  useEffect(() => {
    if (!isRunning && phase === 'FIGHT') {
      setSecondsRemaining(roundDuration);
    }
  }, [roundDuration]);

  // Main Timer Loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && isOpen) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          // Warning at 10 seconds remaining
          if (prev === 11 && phase === 'FIGHT') {
            dojoAudio.playWoodTick();
            dojoAudio.triggerHaptic('warning');
          }

          if (prev <= 1) {
            // Transition to next phase
            if (phase === 'FIGHT') {
              dojoAudio.playRoundBell();
              dojoAudio.triggerHaptic('success');
              if (currentRound >= totalRounds) {
                // All rounds finished
                setPhase('FINISHED');
                setIsRunning(false);
                dojoAudio.playGong();
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
  }, [isRunning, isOpen, phase, currentRound, totalRounds, roundDuration, restDuration]);

  if (!isOpen) return null;

  const handleStart = () => {
    if (!isRunning) {
      dojoAudio.playRoundBell();
      dojoAudio.triggerHaptic('light');
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentRound(1);
    setPhase('FIGHT');
    setSecondsRemaining(roundDuration);
  };

  const handleSkipNext = () => {
    if (phase === 'FIGHT') {
      if (currentRound >= totalRounds) {
        setPhase('FINISHED');
        setIsRunning(false);
      } else {
        setPhase('REST');
        setSecondsRemaining(restDuration);
      }
    } else {
      setCurrentRound((r) => r + 1);
      setPhase('FIGHT');
      setSecondsRemaining(roundDuration);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const phaseColor =
    phase === 'FIGHT'
      ? 'bg-red-950/90 text-red-100 border-red-500/50'
      : phase === 'REST'
      ? 'bg-blue-950/90 text-blue-100 border-blue-500/50'
      : 'bg-emerald-950/90 text-emerald-100 border-emerald-500/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className={`bg-slate-950 text-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col justify-between ${
          isFullscreen ? 'h-screen max-w-none rounded-none' : 'max-h-[95vh]'
        }`}
      >
        {/* Top bar */}
        <div className="p-4 sm:p-5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg sm:text-xl font-black uppercase tracking-wider">
                Tatami Sparring Timer
              </h2>
              <p className="text-xs text-slate-400">247 Studio Official Clock</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Pantalla Completa"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Display */}
        <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-4">
          {/* Phase Badge */}
          <div
            className={`px-5 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest border shadow-lg ${phaseColor}`}
          >
            {phase === 'FIGHT' && '🔥 COMBATE / ROLANDO'}
            {phase === 'REST' && '💧 DESCANSO / HIDRATACIÓN'}
            {phase === 'FINISHED' && '🏆 SESIÓN COMPLETADA - OSS'}
          </div>

          {/* Huge Digits */}
          <div className="font-headline font-black text-7xl sm:text-9xl tracking-tight text-white select-none py-2 drop-shadow-[0_0_35px_rgba(255,255,255,0.15)]">
            {formatTime(secondsRemaining)}
          </div>

          {/* Round Indicator */}
          <div className="flex items-center gap-3 text-slate-300 text-sm sm:text-base font-bold uppercase tracking-wider">
            <span>Ronda</span>
            <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-amber-400 font-mono text-lg font-black">
              {currentRound} / {totalRounds}
            </span>
          </div>
        </div>

        {/* Quick Presets (only when stopped) */}
        {!isRunning && (
          <div className="px-6 py-2 flex flex-wrap justify-center gap-2 border-t border-slate-900 bg-slate-900/40">
            {[
              { label: '5 min IBJJF', fight: 300, rest: 60, rounds: 5 },
              { label: '6 min Masters', fight: 360, rest: 60, rounds: 5 },
              { label: '3 min Box/Thai', fight: 180, rest: 60, rounds: 6 },
              { label: '10 min Maratón', fight: 600, rest: 90, rounds: 3 },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setRoundDuration(p.fight);
                  setRestDuration(p.rest);
                  setTotalRounds(p.rounds);
                  setSecondsRemaining(p.fight);
                  setCurrentRound(1);
                  setPhase('FIGHT');
                }}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Control Buttons */}
        <div className="p-4 sm:p-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-sm"
            title="Reiniciar Cronómetro"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={handleStart}
            className={`px-8 py-4 rounded-2xl font-headline font-black text-lg uppercase tracking-wider flex items-center gap-3 transition shadow-xl ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-6 h-6" /> Pausar
              </>
            ) : (
              <>
                <Play className="w-6 h-6 fill-current" /> Iniciar Combate
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkipNext}
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-sm"
            title="Siguiente Ronda"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
