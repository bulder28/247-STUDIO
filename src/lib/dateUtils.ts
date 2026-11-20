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

/**
 * Calcula la edad en años cumplidos a partir de YYYY-MM-DD en horario local.
 */
export function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const parts = birthDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/**
 * En 247 STUDIO se considera menor de edad a todo alumno de hasta 14 años inclusive.
 */
export function isMinorAge(birthDate?: string | null): boolean {
  const age = calculateAge(birthDate);
  return age !== null && age <= 14;
}

/**
 * Devuelve la próxima fecha YYYY-MM-DD (incluyendo hoy) para un día de la semana (1=Lun ... 7=Dom).
 */
export function getNextDateForDayOfWeek(dayOfWeek: number, from: Date = new Date()): string {
  const jsDay = from.getDay();
  const todayDow = jsDay === 0 ? 7 : jsDay;
  const diff = (dayOfWeek - todayDow + 7) % 7;
  const target = new Date(from);
  target.setDate(from.getDate() + diff);
  return getLocalDateISO(target);
}

