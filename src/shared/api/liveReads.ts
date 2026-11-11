/**
 * Lecturas "vivas" compartidas entre pestañas.
 *
 * Antes, cada pantalla volvía a descargar colecciones enteras (users, payments...) al abrirse.
 * Ahora la primera pantalla abre UNA escucha de Firestore por consulta y las demás reutilizan
 * el último resultado al instante. La escucha se mantiene al día sola (incluidos tus propios cambios),
 * y además sólo factura los documentos que cambian, no la colección completa en cada pestaña.
 */
import { onSnapshot, type DocumentData, type Query, type QuerySnapshot } from 'firebase/firestore';

type Snap = QuerySnapshot<DocumentData>;

interface Entry {
  snap?: Snap;
  ready?: Promise<Snap>;
  unsubscribe?: () => void;
}

const entries = new Map<string, Entry>();
const FIRST_SNAPSHOT_TIMEOUT_MS = 6000;

/** Devuelve el último resultado de la consulta; si no existe, abre la escucha y espera datos del servidor. */
export function getLiveDocs(key: string, q: Query<DocumentData>): Promise<Snap> {
  const existing = entries.get(key);
  if (existing?.snap) return Promise.resolve(existing.snap);
  if (existing?.ready) return existing.ready;

  const entry: Entry = {};
  entries.set(key, entry);

  entry.ready = new Promise<Snap>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fail = (err: unknown) => {
      if (entries.get(key) === entry) entries.delete(key);
      entry.unsubscribe?.();
      if (timer) clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    timer = setTimeout(() => fail(new Error('Firestore no respondió a tiempo')), FIRST_SNAPSHOT_TIMEOUT_MS);

    entry.unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!settled) {
          // Solo ignorar si la caché viene completamente vacía
          const isEmpty = snap.empty === true || (Array.isArray(snap.docs) && snap.docs.length === 0);
          if (snap.metadata.fromCache && isEmpty) return;
          settled = true;
          if (timer) clearTimeout(timer);
          entry.snap = snap;
          resolve(snap);
          return;
        }
        entry.snap = snap;
      },
      (err) => fail(err)
    );
  });

  return entry.ready;
}

/** Olvida (y deja de escuchar) las consultas cuyo nombre empiece por alguno de los prefijos; sin prefijos, todas. */
export function invalidateLiveDocs(prefixes?: string[]): void {
  for (const [key, entry] of [...entries.entries()]) {
    if (!prefixes || prefixes.some((p) => key.startsWith(p))) {
      entry.unsubscribe?.();
      entries.delete(key);
    }
  }
}

/** Cierra todas las escuchas (al cerrar sesión o cambiar de usuario). */
export function resetLiveReads(): void {
  invalidateLiveDocs();
}
