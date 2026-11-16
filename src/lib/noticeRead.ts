export const NOTICES_SEEN_EVENT = '247-notices-seen';
export const FORUM_SEEN_EVENT = '247-forum-seen';
export const CHAT_SEEN_EVENT = '247-chat-seen';
export const DOCS_UPDATED_EVENT = '247-docs-updated';

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSeen(key: string, eventName: string, latestAt?: string): void {
  const now = new Date().toISOString();
  const value = latestAt && latestAt > now ? latestAt : now;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin localStorage disponible: al menos actualizamos el estado en memoria de esta sesión
  }
  window.dispatchEvent(new Event(eventName));
}

export function getNoticesSeenAt(userId: string): string | null {
  return readKey(`247_notices_seen_at_${userId}`);
}

export function markNoticesSeen(userId: string, latestNoticeAt?: string): void {
  writeSeen(`247_notices_seen_at_${userId}`, NOTICES_SEEN_EVENT, latestNoticeAt);
}

export function getForumSeenAt(userId: string): string | null {
  return readKey(`247_forum_seen_at_${userId}`);
}

export function markForumSeen(userId: string, latestAt?: string): void {
  writeSeen(`247_forum_seen_at_${userId}`, FORUM_SEEN_EVENT, latestAt);
}

export function getChatSeenAt(userId: string): string | null {
  return readKey(`247_chat_seen_at_${userId}`);
}

export function markChatSeen(userId: string, latestAt?: string): void {
  writeSeen(`247_chat_seen_at_${userId}`, CHAT_SEEN_EVENT, latestAt);
}

export function notifyDocsUpdated(): void {
  window.dispatchEvent(new Event(DOCS_UPDATED_EVENT));
}
