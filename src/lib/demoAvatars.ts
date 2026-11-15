import type { Profile } from '@/types/database';
import { isMinorAge } from '@/lib/dateUtils';

/**
 * Solo para previsualizar la app con avatares ilustrados.
 * Se activa con VITE_DEMO_AVATARS=true en .env.local (archivo ignorado por git).
 * No escribe nada en la base de datos: solo cambia lo que se muestra en pantalla.
 */
const DEMO_AVATARS_ON = import.meta.env.VITE_DEMO_AVATARS === 'true';
const DEMO_COUNT = 6;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

// Solo para datos sintéticos de prueba. Listas cerradas de nombres comunes, sin reglas por terminación.
const FEMALE_NAMES = new Set([
  'ana', 'laura', 'lucia', 'marta', 'sara', 'paula', 'carmen', 'maria', 'elena', 'irene', 'julia',
  'claudia', 'alba', 'noa', 'sofia', 'carla', 'nerea', 'lorena', 'raquel', 'patricia', 'beatriz',
  'andrea', 'eva', 'cristina', 'marina', 'blanca', 'aitana', 'ainhoa', 'isabel', 'rocio', 'silvia',
  'natalia', 'monica', 'pilar', 'mireia', 'olga', 'jimena',
]);
const MALE_NAMES = new Set([
  'adrian', 'alejandro', 'alvaro', 'andres', 'carlos', 'david', 'daniel', 'javier', 'jorge', 'juan',
  'pablo', 'pedro', 'miguel', 'manuel', 'sergio', 'raul', 'ruben', 'mario', 'hugo', 'diego', 'alberto',
  'ivan', 'oscar', 'ignacio', 'fernando', 'luis', 'antonio', 'francisco', 'jose', 'tomas', 'marcos',
  'enrique', 'pau', 'gonzalo', 'ruben', 'rodrigo', 'guillermo', 'victor', 'eduardo', 'roberto', 'alfonso',
  'angel', 'jesus', 'rafael', 'santiago', 'martin', 'joel', 'nil', 'bruno', 'aitor', 'iker', 'unai',
  'gabriel', 'samuel', 'jaime', 'ricardo', 'felipe', 'alonso', 'mateo', 'leo', 'aaron', 'ismael',
]);

function guessGenderFromName(fullName: string): 'hombre' | 'mujer' | null {
  const first = fullName
    .trim()
    .split(/\s+/)[0]
    ?.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (!first) return null;
  if (FEMALE_NAMES.has(first)) return 'mujer';
  if (MALE_NAMES.has(first)) return 'hombre';
  return null;
}

/**
 * Devuelve la foto a mostrar: la real, o un avatar ilustrado si el modo demo está activo.
 * Avatares 1-3 con aspecto de chico, 4-6 de chica. Sin sexo indicado, cualquiera.
 */
export function displayAvatar(
  p: Pick<Profile, 'id' | 'full_name' | 'birth_date' | 'avatar_url' | 'gender'>
): string | null {
  if (!DEMO_AVATARS_ON) return p.avatar_url;
  const h = hashId(p.id);
  const gender = p.gender ?? guessGenderFromName(p.full_name);
  // Menores de 14 años (mismo criterio que la app): avatares de niño y niña.
  if (isMinorAge(p.birth_date)) {
    if (gender === 'hombre') return '/demo-avatars/avatar-kid-boy.svg';
    if (gender === 'mujer') return '/demo-avatars/avatar-kid-girl.svg';
    return '/demo-avatars/avatar-kid-neutral.svg';
  }
  if (gender === 'hombre') return `/demo-avatars/avatar-${(h % 3) + 1}.svg`;
  if (gender === 'mujer') return `/demo-avatars/avatar-${(h % 3) + 4}.svg`;
  // Nombre no reconocido: silueta neutra, nunca un avatar con aspecto de chico o chica.
  return '/demo-avatars/avatar-neutral.svg';
}
