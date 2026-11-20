import { useSyncExternalStore } from 'react';

/**
 * Modo privado de importes: oculta las cantidades en euros del panel de dirección
 * para que no se lean de un vistazo (pantalla del mostrador, móvil en la mano...).
 * Empieza oculto y la elección se recuerda en este navegador.
 */
const STORAGE_KEY = 'admin-hide-amounts';

function readInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

let hidden = readInitial();
const listeners = new Set<() => void>();

export function amountsHidden(): boolean {
  return hidden;
}

export function setAmountsHidden(next: boolean): void {
  if (next === hidden) return;
  hidden = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // sin almacenamiento disponible: funciona igual, solo no se recuerda
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Suscribe el componente al modo privado. Las páginas que muestran importes lo
 * llaman para volver a pintarse al pulsar el ojo (sus hijos se repintan con ellas).
 */
export function useAmountsHidden(): boolean {
  return useSyncExternalStore(subscribe, amountsHidden, amountsHidden);
}
