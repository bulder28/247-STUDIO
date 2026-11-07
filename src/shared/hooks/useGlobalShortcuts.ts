import { useEffect } from 'react';

export interface ShortcutHandlers {
  onToggleTimer?: () => void;
  onToggleWeightCalc?: () => void;
  onToggleCurriculum?: () => void;
  onCloseModals?: () => void;
}

export function useGlobalShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea (except for Escape)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Escape
      if (e.key === 'Escape') {
        handlers.onCloseModals?.();
        return;
      }

      if (isInput) return;

      // Shift+T (Timer)
      if (e.shiftKey && e.key.toUpperCase() === 'T') {
        e.preventDefault();
        handlers.onToggleTimer?.();
      }

      // Shift+W (Weight Calculator)
      if (e.shiftKey && e.key.toUpperCase() === 'W') {
        e.preventDefault();
        handlers.onToggleWeightCalc?.();
      }

      // Shift+C (Curriculum)
      if (e.shiftKey && e.key.toUpperCase() === 'C') {
        e.preventDefault();
        handlers.onToggleCurriculum?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

