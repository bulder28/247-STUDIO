import { useEffect, useState } from 'react';
import { Ticket, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLocalDateISO } from '@/lib/dateUtils';
import { daysLeft, formatDateES, packState, type ClassPack, type ClassPackUse } from '@/lib/classPacks';

/** Inicio del alumno: su bono (clases que le quedan, caducidad y clases gastadas). */
export function StudentPackCard({ userId }: { userId: string }) {
  const [pack, setPack] = useState<ClassPack | null>(null);
  const [uses, setUses] = useState<ClassPackUse[]>([]);
  const [open, setOpen] = useState(false);
  const today = getLocalDateISO();

  useEffect(() => {
    const load = async () => {
      // El más relevante: el que caduca antes de los que siguen en vigor; si no hay, el último
      const { data } = await supabase
        .from('class_packs')
        .select('*, plans(name)')
        .eq('user_id', userId)
        .order('expires_on', { ascending: false })
        .limit(5);
      const list = (data as ClassPack[]) ?? [];
      const current =
        [...list].reverse().find((p) => packState(p, today) === 'active') ??
        // Agotado o caducado hace menos de 30 días: se sigue mostrando para que sepa renovarlo
        list.find((p) => daysLeft(p.expires_on, today) >= -30) ??
        null;
      setPack(current);
      if (current) {
        const { data: u } = await supabase
          .from('class_pack_uses')
          .select('id, pack_id, used_on, schedule_classes(title, start_time)')
          .eq('pack_id', current.id)
          .order('used_on', { ascending: false });
        setUses((u as unknown as ClassPackUse[]) ?? []);
      }
    };
    load();
  }, [userId, today]);

  if (!pack) return null;
  const state = packState(pack, today);
  const left = daysLeft(pack.expires_on, today);
  const tone =
    state === 'active' && pack.remaining_credits > 2
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
      : state === 'active'
        ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
        : 'border-studio-red bg-studio-red/20 text-red-100';

  return (
    <section aria-label="Mi bono" className={`rounded-2xl border p-4 space-y-3 ${tone}`}>
      <div className="flex items-start gap-3">
        <Ticket className="w-6 h-6 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-headline text-base uppercase tracking-wide">
            {state === 'expired'
              ? 'Tu bono ha caducado'
              : state === 'exhausted'
                ? 'Has gastado tu bono'
                : `Te quedan ${pack.remaining_credits} de ${pack.total_credits} clases`}
          </p>
          <p className="text-xs opacity-90">
            {pack.plans?.name ? `${pack.plans.name} · ` : ''}
            {state === 'expired'
              ? `Caducó el ${formatDateES(pack.expires_on)}. Renuévalo en recepción.`
              : state === 'exhausted'
                ? 'Renuévalo en recepción para seguir entrenando.'
                : `Caduca el ${formatDateES(pack.expires_on)} (${left === 0 ? 'hoy' : `en ${left} días`}).`}
          </p>
          {state === 'active' && (
            <div className="mt-2 h-2 rounded-full bg-black/25 overflow-hidden" aria-hidden>
              <div className="h-full rounded-full bg-current opacity-80" style={{ width: `${(pack.remaining_credits / pack.total_credits) * 100}%` }} />
            </div>
          )}
        </div>
      </div>
      {uses.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 min-h-11 text-xs font-semibold"
          >
            Clases gastadas ({uses.length})
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {open && (
            <ul className="text-xs space-y-1 opacity-90">
              {uses.map((u) => (
                <li key={u.id} className="flex justify-between gap-3">
                  <span>{u.schedule_classes?.title ?? 'Clase'}</span>
                  <span className="tabular-nums">{formatDateES(u.used_on)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
