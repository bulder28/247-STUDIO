import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Ticket, X, History, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalDateISO } from '@/lib/dateUtils';
import { PageHeader } from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import {
  PACK_STATE_LABEL,
  daysLeft,
  formatDateES,
  packState,
  plusThreeMonths,
  type ClassPack,
  type ClassPackUse,
  type PackState,
} from '@/lib/classPacks';

interface StudentOption {
  id: string;
  full_name: string;
}
interface PackPlan {
  id: string;
  name: string;
  pack_credits: number | null;
}

type Filter = 'active' | 'exhausted' | 'expired' | 'all';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'active', label: 'En vigor' },
  { id: 'exhausted', label: 'Agotados' },
  { id: 'expired', label: 'Caducados' },
  { id: 'all', label: 'Todos' },
];

const STATE_STYLE: Record<PackState, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  exhausted: 'bg-studio-red/20 text-red-200 border-studio-red/40',
  expired: 'bg-white/10 text-slate-300 border-white/15',
  upcoming: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
};

interface FormState {
  id?: string;
  user_id: string;
  plan_id: string;
  total: string;
  remaining: string;
  starts_on: string;
  expires_on: string;
  notes: string;
}

export function AdminPacksPage() {
  const { user } = useAuth();
  const today = getLocalDateISO();
  const [packs, setPacks] = useState<ClassPack[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [packPlans, setPackPlans] = useState<PackPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<{ pack: ClassPack; uses: ClassPackUse[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [packRes, studRes, planRes] = await Promise.all([
      supabase
        .from('class_packs')
        .select('*, profiles!user_id(full_name), plans(name)')
        .order('expires_on', { ascending: true }),
      supabase.from('profiles').select('id, full_name').eq('role', 'client').eq('status', 'active').order('full_name'),
      supabase.from('plans').select('id, name, pack_credits').eq('is_class_pack', true).order('name'),
    ]);
    setPacks((packRes.data as ClassPack[]) ?? []);
    setStudents((studRes.data as StudentOption[]) ?? []);
    setPackPlans((planRes.data as PackPlan[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { active: 0, exhausted: 0, expired: 0, all: packs.length };
    packs.forEach((p) => {
      const s = packState(p, today);
      if (s === 'active' || s === 'upcoming') c.active += 1;
      else c[s] += 1;
    });
    return c;
  }, [packs, today]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packs.filter((p) => {
      const s = packState(p, today);
      const inFilter =
        filter === 'all' ||
        (filter === 'active' ? s === 'active' || s === 'upcoming' : s === filter);
      return inFilter && (!q || (p.profiles?.full_name ?? '').toLowerCase().includes(q));
    });
  }, [packs, filter, query, today]);

  const openNew = () => {
    const plan = packPlans[0];
    const credits = String(plan?.pack_credits ?? 8);
    setForm({
      user_id: '',
      plan_id: plan?.id ?? '',
      total: credits,
      remaining: credits,
      starts_on: today,
      expires_on: plusThreeMonths(today),
      notes: '',
    });
    setStudentQuery('');
    setFormError(null);
  };

  const openEdit = (p: ClassPack) => {
    setForm({
      id: p.id,
      user_id: p.user_id,
      plan_id: p.plan_id ?? '',
      total: String(p.total_credits),
      remaining: String(p.remaining_credits),
      starts_on: p.starts_on,
      expires_on: p.expires_on,
      notes: p.notes ?? '',
    });
    setFormError(null);
  };

  const save = async () => {
    if (!form || !user) return;
    const total = Number(form.total);
    const remaining = Number(form.remaining);
    if (!form.user_id) return setFormError('Elige el alumno.');
    if (!Number.isInteger(total) || total < 1) return setFormError('Las clases totales deben ser 1 o más.');
    if (!Number.isInteger(remaining) || remaining < 0 || remaining > total)
      return setFormError('Las clases restantes van de 0 al total.');
    if (!form.starts_on || !form.expires_on || form.expires_on < form.starts_on)
      return setFormError('La caducidad no puede ser anterior al inicio.');
    setSaving(true);
    const row = {
      user_id: form.user_id,
      plan_id: form.plan_id || null,
      total_credits: total,
      remaining_credits: remaining,
      starts_on: form.starts_on,
      expires_on: form.expires_on,
      notes: form.notes.trim() || null,
    };
    const { error } = form.id
      ? await supabase.from('class_packs').update(row).eq('id', form.id)
      : await supabase.from('class_packs').insert({ ...row, created_by: user.id });
    setSaving(false);
    if (error) return setFormError('No se pudo guardar el bono. Revisa la conexión e inténtalo de nuevo.');
    const name = students.find((s) => s.id === form.user_id)?.full_name ?? packs.find((p) => p.id === form.id)?.profiles?.full_name ?? '';
    setMessage(form.id ? `Bono de ${name} actualizado.` : `Bono creado para ${name}.`);
    setForm(null);
    load();
  };

  const remove = async (p: ClassPack) => {
    if (!window.confirm(`¿Borrar el bono de ${p.profiles?.full_name ?? 'este alumno'}? Se perderá su historial de clases.`)) return;
    const { error } = await supabase.from('class_packs').delete().eq('id', p.id);
    setMessage(error ? 'No se pudo borrar el bono.' : 'Bono borrado.');
    load();
  };

  const openHistory = async (p: ClassPack) => {
    const { data } = await supabase
      .from('class_pack_uses')
      .select('id, pack_id, used_on, schedule_classes(title, start_time)')
      .eq('pack_id', p.id)
      .order('used_on', { ascending: false });
    setHistory({ pack: p, uses: (data as unknown as ClassPackUse[]) ?? [] });
  };

  const studentMatches = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return q.length < 2 ? [] : students.filter((s) => s.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [students, studentQuery]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bonos"
        actions={
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 min-h-11 rounded-xl studio-btn px-4 text-sm font-semibold text-white"
          >
            <Plus className="w-4 h-4" aria-hidden /> Nuevo bono
          </button>
        }
      />
      <p className="text-sm text-slate-300 -mt-2">
        Cada bono vale 3 meses desde el pago. Al pasar lista se descuenta una clase sola; al cobrar un bono en
        Cobros se crea aquí automáticamente. Usa «Nuevo bono» para dar de alta los que ya existían con su saldo.
      </p>

      {message && (
        <p role="status" className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-200">
          {message}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`min-h-11 px-4 rounded-xl text-sm font-semibold ${
                filter === f.id ? 'bg-studio-cream text-slate-950' : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alumno..."
            aria-label="Buscar alumno"
            className="w-full min-h-11 rounded-xl studio-field pl-9 pr-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={Ticket}>
          {packs.length === 0
            ? 'Aún no hay bonos. Da de alta los bonos actuales con «Nuevo bono».'
            : 'No hay bonos en esta lista.'}
        </EmptyState>
      ) : (
        <div className="rounded-2xl studio-panel border border-white/10 divide-y divide-white/5">
          {visible.map((p) => {
            const st = packState(p, today);
            const left = daysLeft(p.expires_on, today);
            const used = p.total_credits - p.remaining_credits;
            return (
              <div key={p.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">{p.profiles?.full_name ?? 'Alumno'}</p>
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATE_STYLE[st]}`}>
                      {PACK_STATE_LABEL[st]}
                    </span>
                    {st === 'active' && p.remaining_credits <= 2 && (
                      <span className="px-2 py-0.5 rounded-full border text-[11px] font-semibold bg-amber-500/15 text-amber-200 border-amber-400/30">
                        Le quedan {p.remaining_credits}
                      </span>
                    )}
                    {st === 'active' && left <= 15 && (
                      <span className="px-2 py-0.5 rounded-full border text-[11px] font-semibold bg-amber-500/15 text-amber-200 border-amber-400/30">
                        Caduca pronto
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-40 rounded-full studio-panel-inset overflow-hidden" aria-hidden>
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(p.remaining_credits / p.total_credits) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-200 tabular-nums">
                      Quedan <strong>{p.remaining_credits}</strong> de {p.total_credits} clases · usadas {used}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {p.plans?.name ? `${p.plans.name} · ` : ''}Del {formatDateES(p.starts_on)} al {formatDateES(p.expires_on)}
                    {st !== 'expired' ? ` · ${left === 0 ? 'caduca hoy' : `quedan ${left} días`}` : ''}
                    {p.notes ? ` · ${p.notes}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button type="button" onClick={() => openHistory(p)} className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white">
                    <History className="w-4 h-4" aria-hidden /> Clases
                  </button>
                  <button type="button" onClick={() => openEdit(p)} className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white">
                    <Pencil className="w-4 h-4" aria-hidden /> Editar
                  </button>
                  <button type="button" onClick={() => remove(p)} aria-label={`Borrar bono de ${p.profiles?.full_name ?? ''}`} className="grid place-items-center min-h-11 min-w-11 rounded-xl bg-white/5 hover:bg-studio-red/30 text-white">
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={form.id ? 'Editar bono' : 'Nuevo bono'} onKeyDown={(e) => e.key === 'Escape' && setForm(null)} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
            <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl studio-panel border border-white/15 p-5 space-y-4 shadow-modal">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-headline text-xl uppercase text-white">{form.id ? 'Editar bono' : 'Nuevo bono'}</h2>
                <button type="button" onClick={() => setForm(null)} aria-label="Cerrar" className="grid place-items-center min-h-11 min-w-11 rounded-xl text-slate-300 hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {form.id ? (
                <p className="text-sm text-white">{packs.find((p) => p.id === form.id)?.profiles?.full_name}</p>
              ) : (
                <div>
                  <label htmlFor="pk-student" className="block text-xs text-slate-300 uppercase mb-1">Alumno</label>
                  {form.user_id ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl studio-panel-inset border border-white/10 px-3 min-h-11">
                      <span className="text-sm text-white">{students.find((s) => s.id === form.user_id)?.full_name}</span>
                      <button type="button" onClick={() => setForm({ ...form, user_id: '' })} className="text-xs text-studio-red-text min-h-11">Cambiar</button>
                    </div>
                  ) : (
                    <>
                      <input id="pk-student" value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Escribe al menos 2 letras..." className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white" />
                      <div className="mt-1 space-y-1">
                        {studentMatches.map((s) => (
                          <button key={s.id} type="button" onClick={() => setForm({ ...form, user_id: s.id })} className="w-full min-h-11 text-left px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-sm text-white">
                            {s.full_name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {packPlans.length > 0 && (
                <div>
                  <label htmlFor="pk-plan" className="block text-xs text-slate-300 uppercase mb-1">Tipo de bono</label>
                  <select
                    id="pk-plan"
                    value={form.plan_id}
                    onChange={(e) => {
                      const pl = packPlans.find((x) => x.id === e.target.value);
                      setForm({ ...form, plan_id: e.target.value, ...(pl?.pack_credits && !form.id ? { total: String(pl.pack_credits), remaining: String(pl.pack_credits) } : {}) });
                    }}
                    className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white"
                  >
                    {packPlans.map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pk-total" className="block text-xs text-slate-300 uppercase mb-1">Clases totales</label>
                  <input id="pk-total" type="number" inputMode="numeric" min={1} value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label htmlFor="pk-remaining" className="block text-xs text-slate-300 uppercase mb-1">Clases que le quedan</label>
                  <input id="pk-remaining" type="number" inputMode="numeric" min={0} value={form.remaining} onChange={(e) => setForm({ ...form, remaining: e.target.value })} className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label htmlFor="pk-start" className="block text-xs text-slate-300 uppercase mb-1">Inicio</label>
                  <input
                    id="pk-start"
                    type="date"
                    value={form.starts_on}
                    onChange={(e) => setForm({ ...form, starts_on: e.target.value, ...(form.id ? {} : { expires_on: e.target.value ? plusThreeMonths(e.target.value) : form.expires_on }) })}
                    className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="pk-end" className="block text-xs text-slate-300 uppercase mb-1">Caduca</label>
                  <input id="pk-end" type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <p className="text-xs text-slate-300">
                {form.id
                  ? 'Para ampliar la caducidad, cambia la fecha de «Caduca».'
                  : 'La caducidad se calcula sola a 3 meses del inicio; puedes cambiarla.'}
              </p>

              <div>
                <label htmlFor="pk-notes" className="block text-xs text-slate-300 uppercase mb-1">Nota (opcional)</label>
                <input id="pk-notes" value={form.notes} maxLength={200} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej.: saldo inicial del bono anterior" className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white" />
              </div>

              {formError && <p role="alert" className="rounded-xl bg-studio-red/15 border border-studio-red/40 px-3 py-2 text-sm text-red-200">{formError}</p>}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setForm(null)} className="min-h-11 px-4 rounded-xl border border-white/10 text-sm text-slate-300">Cancelar</button>
                <button type="button" onClick={save} disabled={saving} className="min-h-11 px-5 rounded-xl studio-btn text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear bono'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {history &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="Clases del bono" onKeyDown={(e) => e.key === 'Escape' && setHistory(null)} onClick={() => setHistory(null)} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
            <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl studio-panel border border-white/15 p-5 space-y-3 shadow-modal">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-headline text-xl uppercase text-white">Clases del bono</h2>
                  <p className="text-xs text-slate-300">{history.pack.profiles?.full_name} · {history.uses.length} de {history.pack.total_credits} usadas</p>
                </div>
                <button type="button" onClick={() => setHistory(null)} aria-label="Cerrar" className="grid place-items-center min-h-11 min-w-11 rounded-xl text-slate-300 hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {history.uses.length === 0 ? (
                <p className="text-sm text-slate-300">Aún no ha gastado ninguna clase con este bono.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {history.uses.map((u) => (
                    <li key={u.id} className="py-2 flex justify-between gap-3 text-sm">
                      <span className="text-white">{u.schedule_classes?.title ?? 'Clase'}</span>
                      <span className="text-slate-300 tabular-nums">
                        {formatDateES(u.used_on)}{u.schedule_classes?.start_time ? ` · ${u.schedule_classes.start_time.slice(0, 5)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {history.pack.total_credits - history.pack.remaining_credits > history.uses.length && (
                <p className="text-xs text-slate-300">
                  Otras {history.pack.total_credits - history.pack.remaining_credits - history.uses.length} clases se gastaron antes de dar de alta el bono en la app.
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
