import { supabase } from '@/lib/supabase';
import { getLocalDateISO } from '@/lib/dateUtils';

/** Un bono comprado: validez de 3 meses desde el pago (o lo que fije el admin). */
export interface ClassPack {
  id: string;
  user_id: string;
  plan_id: string | null;
  total_credits: number;
  remaining_credits: number;
  starts_on: string;
  expires_on: string;
  payment_id: string | null;
  notes: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
  plans?: { name: string } | null;
}

export interface ClassPackUse {
  id: string;
  pack_id: string;
  used_on: string;
  schedule_classes?: { title: string; start_time: string } | null;
}

export type PackState = 'active' | 'exhausted' | 'expired' | 'upcoming';

export function packState(p: Pick<ClassPack, 'remaining_credits' | 'starts_on' | 'expires_on'>, today = getLocalDateISO()): PackState {
  if (p.expires_on < today) return 'expired';
  if (p.starts_on > today) return 'upcoming';
  if (p.remaining_credits <= 0) return 'exhausted';
  return 'active';
}

export const PACK_STATE_LABEL: Record<PackState, string> = {
  active: 'En vigor',
  exhausted: 'Agotado',
  expired: 'Caducado',
  upcoming: 'Empieza más adelante',
};

/** Días que faltan hasta la caducidad (0 = caduca hoy). */
export function daysLeft(expiresOn: string, today = getLocalDateISO()): number {
  const ms = new Date(`${expiresOn}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}

/** Fecha + 3 meses, en formato YYYY-MM-DD (mismo criterio que la base de datos). */
export function plusThreeMonths(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + 3, d);
  return getLocalDateISO(dt);
}

export const formatDateES = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Bono en vigor de cada alumno (el que caduca antes, con clases y dentro de fechas).
 * Devuelve user_id -> bono. Los alumnos sin bono en vigor no aparecen.
 */
export async function fetchActivePacks(userIds?: string[]): Promise<Record<string, ClassPack>> {
  const today = getLocalDateISO();
  let q = supabase
    .from('class_packs')
    .select('*')
    .gte('expires_on', today)
    .lte('starts_on', today)
    .gt('remaining_credits', 0)
    .order('expires_on');
  if (userIds && userIds.length > 0) q = q.in('user_id', userIds);
  const { data } = await q;
  const map: Record<string, ClassPack> = {};
  ((data as ClassPack[]) ?? []).forEach((p) => {
    if (!map[p.user_id]) map[p.user_id] = p;
  });
  return map;
}
