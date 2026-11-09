import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handlers = { next: (s: unknown) => void; error: (e: unknown) => void };
const subs: { handlers: Handlers; unsub: ReturnType<typeof vi.fn> }[] = [];

vi.mock('firebase/firestore', () => ({
  onSnapshot: vi.fn((_q: unknown, next: Handlers['next'], error: Handlers['error']) => {
    const unsub = vi.fn();
    subs.push({ handlers: { next, error }, unsub });
    return unsub;
  }),
}));

import { getLiveDocs, invalidateLiveDocs, resetLiveReads } from '@/shared/api/liveReads';

const snap = (fromCache: boolean, ids: string[] = []) => ({ metadata: { fromCache }, docs: ids.map((id) => ({ id })) });
const q = {} as never;

describe('liveReads', () => {
  beforeEach(() => {
    resetLiveReads();
    subs.length = 0;
  });

  it('reutiliza el resultado sin abrir otra escucha', async () => {
    const p1 = getLiveDocs('users', q);
    subs[0].handlers.next(snap(false, ['a']));
    await p1;
    const again = await getLiveDocs('users', q);
    expect(subs.length).toBe(1);
    expect((again as unknown as { docs: unknown[] }).docs.length).toBe(1);
  });

  it('ignora un primer resultado vacío de caché y espera al del servidor', async () => {
    let resolved = false;
    const p = getLiveDocs('payments', q).then((s) => {
      resolved = true;
      return s;
    });
    subs[0].handlers.next(snap(true));
    await Promise.resolve();
    expect(resolved).toBe(false);
    subs[0].handlers.next(snap(false, ['p1', 'p2']));
    expect(((await p) as unknown as { docs: unknown[] }).docs.length).toBe(2);
  });

  it('las actualizaciones posteriores se ven al instante en lecturas siguientes', async () => {
    const p = getLiveDocs('leads', q);
    subs[0].handlers.next(snap(false, ['l1']));
    await p;
    subs[0].handlers.next(snap(false, ['l1', 'l2']));
    expect(((await getLiveDocs('leads', q)) as unknown as { docs: unknown[] }).docs.length).toBe(2);
  });

  it('si hay error, rechaza y no deja datos pegados', async () => {
    const p = getLiveDocs('users', q);
    subs[0].handlers.error(new Error('permission-denied'));
    await expect(p).rejects.toThrow('permission-denied');
    const retry = getLiveDocs('users', q);
    expect(subs.length).toBe(2);
    subs[1].handlers.next(snap(false, ['x']));
    await retry;
  });

  it('invalidate por prefijo cierra solo esas escuchas', async () => {
    const a = getLiveDocs('users', q);
    subs[0].handlers.next(snap(false));
    await a;
    const b = getLiveDocs('payments:u1', q);
    subs[1].handlers.next(snap(false));
    await b;
    invalidateLiveDocs(['payments']);
    expect(subs[1].unsub).toHaveBeenCalled();
    expect(subs[0].unsub).not.toHaveBeenCalled();
    resetLiveReads();
    expect(subs[0].unsub).toHaveBeenCalled();
  });
});
