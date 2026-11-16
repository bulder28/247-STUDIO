export const NOTICES_SEEN_EVENT = '247-notices-seen';

function storageKey(userId: string): string {
  return `247_notices_seen_at_${userId}`;
}

export function getNoticesSeenAt(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function markNoticesSeen(userId: string, latestNoticeAt?: string): void {
  const now = new Date().toISOString();
  const value = latestNoticeAt && latestNoticeAt > now ? latestNoticeAt : now;
  try {
    localStorage.setItem(storageKey(userId), value);
  } catch {
    // Si localStorage no está disponible, al menos limpiamos el estado en memoria de esta sesión
  }
  window.dispatchEvent(new Event(NOTICES_SEEN_EVENT));
}
