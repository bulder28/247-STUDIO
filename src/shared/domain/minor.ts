import { AthleteCategory } from './types';

/**
 * Calcula la edad exacta de un usuario a partir de su fecha de nacimiento y una fecha de referencia.
 * @param birthDateStr Fecha de nacimiento en formato YYYY-MM-DD
 * @param now Fecha actual inyectada
 */
export function calculateExactAge(birthDateStr: string, now: Date): number {
  const parts = birthDateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Formato de fecha inválido: ${birthDateStr}. Se espera YYYY-MM-DD.`);
  }

  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10);
  const birthDay = parseInt(parts[2], 10);

  // Obtener componentes de fecha en zona horaria Europe/Madrid
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const partsNow = formatter.formatToParts(now);
  const curYear = parseInt(partsNow.find((p) => p.type === 'year')!.value, 10);
  const curMonth = parseInt(partsNow.find((p) => p.type === 'month')!.value, 10);
  const curDay = parseInt(partsNow.find((p) => p.type === 'day')!.value, 10);

  let age = curYear - birthYear;
  if (curMonth < birthMonth || (curMonth === birthMonth && curDay < birthDay)) {
    age--;
  }

  return age;
}

/**
 * Umbral Legal de Autonomía Digital y Capacidad Contractual (LOPDGDD / España):
 * Menor de 16 años no puede auto-registrarse; requiere tutor y presencialidad.
 */
export function isLegalMinor(birthDateStr: string, now: Date): boolean {
  return calculateExactAge(birthDateStr, now) < 16;
}

/**
 * Umbral de Categoría Deportiva y Sistema de Graduación:
 * < 18 años: KID (Sistema de cinturones infantiles)
 * >= 18 años: ADULT (Sistema de cinturones de adultos)
 */
export function deriveCategory(birthDateStr: string, now: Date): AthleteCategory {
  const age = calculateExactAge(birthDateStr, now);
  return age < 18 ? 'KID' : 'ADULT';
}
