import { create } from 'zustand';

export type ViewMode = 'DAY' | 'WEEK' | 'MONTH';

interface ScheduleState {
  selectedDiscipline: string;
  selectedProfessor: string;
  selectedRoom: string;
  viewMode: ViewMode;
  mobileSectionTab: 'RESERVAR' | 'MIS_RESERVAS';
  onlyMyBookings: boolean;
  setSelectedDiscipline: (discipline: string) => void;
  setSelectedProfessor: (professor: string) => void;
  setSelectedRoom: (room: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setMobileSectionTab: (tab: 'RESERVAR' | 'MIS_RESERVAS') => void;
  setOnlyMyBookings: (only: boolean) => void;
  resetFilters: () => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  selectedDiscipline: 'TODAS',
  selectedProfessor: 'ALL',
  selectedRoom: 'ALL',
  viewMode: 'DAY',
  mobileSectionTab: 'RESERVAR',
  onlyMyBookings: false,
  setSelectedDiscipline: (discipline) => set({ selectedDiscipline: discipline }),
  setSelectedProfessor: (professor) => set({ selectedProfessor: professor }),
  setSelectedRoom: (room) => set({ selectedRoom: room }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setMobileSectionTab: (tab) => set({ mobileSectionTab: tab }),
  setOnlyMyBookings: (only) => set({ onlyMyBookings: only }),
  resetFilters: () =>
    set({
      selectedDiscipline: 'TODAS',
      selectedProfessor: 'ALL',
      selectedRoom: 'ALL',
    }),
}));
