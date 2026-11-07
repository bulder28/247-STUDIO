import { useEffect } from 'react';

export interface ShortcutHandlers {
  onToggleCommandPalette?: () => void;
  onToggleTimer?: () => void;
  onToggleWeightCalc?: () => void;
  onToggleCurriculum?: () => void;
  onCloseModals?: () => void;
}

export function useGlobalShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea (except for Escape and Cmd+K)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Cmd+K or Ctrl+K (Command Palette)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlers.onToggleCommandPalette?.();
        return;
      }

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
