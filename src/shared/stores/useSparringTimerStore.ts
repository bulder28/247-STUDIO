import { create } from 'zustand';
import { dojoAudio } from '@/shared/utils/audioEffects';

export type TimerPhase = 'PREP' | 'FIGHT' | 'REST' | 'FINISHED';

interface SparringTimerState {
  roundDuration: number;
  restDuration: number;
  totalRounds: number;
  currentRound: number;
  secondsRemaining: number;
  phase: TimerPhase;
  isRunning: boolean;
  setRoundDuration: (sec: number) => void;
  setRestDuration: (sec: number) => void;
  setTotalRounds: (rounds: number) => void;
  setIsRunning: (running: boolean) => void;
  togglePlayPause: () => void;
  resetTimer: () => void;
  skipRound: () => void;
  tick: () => void;
}

export const useSparringTimerStore = create<SparringTimerState>((set, get) => ({
  roundDuration: 300, // 5 min
  restDuration: 60, // 1 min
  totalRounds: 5,
  currentRound: 1,
  secondsRemaining: 300,
  phase: 'FIGHT',
  isRunning: false,

  setRoundDuration: (sec: number) => {
    const { isRunning, phase } = get();
    set({ roundDuration: sec });
    if (!isRunning && phase === 'FIGHT') {
      set({ secondsRemaining: sec });
    }
  },

  setRestDuration: (sec: number) => set({ restDuration: sec }),
  setTotalRounds: (rounds: number) => set({ totalRounds: rounds }),
  setIsRunning: (running: boolean) => set({ isRunning: running }),

  togglePlayPause: () => {
    const { isRunning } = get();
    if (!isRunning) {
      dojoAudio.triggerHaptic('light');
    }
    set({ isRunning: !isRunning });
  },

  resetTimer: () => {
    const { roundDuration } = get();
    dojoAudio.triggerHaptic('medium');
    set({
      isRunning: false,
      currentRound: 1,
      secondsRemaining: roundDuration,
      phase: 'FIGHT',
    });
  },

  skipRound: () => {
    const { currentRound, totalRounds, roundDuration, restDuration, phase } = get();
    dojoAudio.triggerHaptic('medium');
    if (phase === 'FIGHT') {
      dojoAudio.playRoundBell();
      if (currentRound >= totalRounds) {
        set({ phase: 'FINISHED', isRunning: false, secondsRemaining: 0 });
      } else {
        set({ phase: 'REST', secondsRemaining: restDuration });
      }
    } else if (phase === 'REST') {
      dojoAudio.playRoundBell();
      set({
        phase: 'FIGHT',
        currentRound: currentRound + 1,
        secondsRemaining: roundDuration,
      });
    }
  },

  tick: () => {
    const {
      secondsRemaining,
      phase,
      currentRound,
      totalRounds,
      roundDuration,
      restDuration,
    } = get();

    if (secondsRemaining === 11 && phase === 'FIGHT') {
      dojoAudio.playWoodTick();
      dojoAudio.triggerHaptic('warning');
    }

    if (secondsRemaining <= 1) {
      if (phase === 'FIGHT') {
        dojoAudio.playRoundBell();
        dojoAudio.triggerHaptic('medium');

        if (currentRound >= totalRounds) {
          set({ phase: 'FINISHED', isRunning: false, secondsRemaining: 0 });
        } else {
          set({ phase: 'REST', secondsRemaining: restDuration });
        }
      } else if (phase === 'REST') {
        dojoAudio.playRoundBell();
        dojoAudio.triggerHaptic('success');
        set({
          phase: 'FIGHT',
          currentRound: currentRound + 1,
          secondsRemaining: roundDuration,
        });
      }
    } else {
      set({ secondsRemaining: secondsRemaining - 1 });
    }
  },
}));
