import { create } from 'zustand';

export type ViewMode = 'DAY' | 'WEEK' | 'MONTH';

interface ScheduleState {
  selectedDiscipline: string;
  selectedProfessor: string;
  selectedRoom: string;
  viewMode: ViewMode;
  setSelectedDiscipline: (discipline: string) => void;
  setSelectedProfessor: (professor: string) => void;
  setSelectedRoom: (room: string) => void;
  setViewMode: (mode: ViewMode) => void;
  resetFilters: () => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  selectedDiscipline: 'TODAS',
  selectedProfessor: 'ALL',
  selectedRoom: 'ALL',
  viewMode: 'DAY',
  setSelectedDiscipline: (discipline) => set({ selectedDiscipline: discipline }),
  setSelectedProfessor: (professor) => set({ selectedProfessor: professor }),
  setSelectedRoom: (room) => set({ selectedRoom: room }),
  setViewMode: (mode) => set({ viewMode: mode }),
  resetFilters: () =>
    set({
      selectedDiscipline: 'TODAS',
      selectedProfessor: 'ALL',
      selectedRoom: 'ALL',
    }),
}));

