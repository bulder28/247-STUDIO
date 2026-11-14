/**
 * Devuelve la fecha local en formato YYYY-MM-DD evitando desfases UTC a medianoche.
 */
export function getLocalDateISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Devuelve el mes local en formato YYYY-MM evitando desfases UTC el día 1 de mes.
 */
export function getLocalMonthYear(date: Date = new Date()): string {
  return getLocalDateISO(date).slice(0, 7);
}

/**
 * Devuelve la hora local en formato HH:MM.
 */
export function getLocalTimeHHMM(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

