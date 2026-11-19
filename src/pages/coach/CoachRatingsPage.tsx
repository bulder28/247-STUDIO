import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, User, Target, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { FighterRadarChart } from '@/components/FighterRadarChart';

/** Los 8 atributos del radar, en el mismo orden que ve el alumno. */
const STATS = [
  { key: 'tecnica', label: 'Técnica' },
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'elasticidad', label: 'Elasticidad' },
  { key: 'guardia', label: 'Guardia' },
  { key: 'pase', label: 'Pase' },
  { key: 'derribos', label: 'Derribos' },
  { key: 'leglocks', label: 'Leglocks' },
  { key: 'finalizacion', label: 'Finalización' },
] as const;

type StatKey = (typeof STATS)[number]['key'];
type StatValues = Record<StatKey, number>;

interface Student {
  id: string;
  full_name: string;
  alias: string | null;
  avatar_url: string | null;
  belt: string | null;
}

interface StatsRow extends StatValues {
  user_id: string;
  evaluated_at?: string | null;
}

const DEFAULTS: StatValues = {
  tecnica: 50,
  fuerza: 50,
  elasticidad: 50,
  guardia: 50,
  pase: 50,
  derribos: 50,
  leglocks: 50,
  finalizacion: 50,
};

/** Evaluado = alguien lo valoró desde la app, o tiene algún valor distinto del 50 por defecto. */
const isEvaluated = (r?: StatsRow) =>
  Boolean(r && (r.evaluated_at || STATS.some(({ key }) => r[key] !== 50)));

export function CoachRatingsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Record<string, StatsRow>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [values, setValues] = useState<StatValues>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [profRes, statsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, alias, avatar_url, belt')
          .eq('role', 'client')
          .eq('status', 'active')
          .order('full_name'),
        supabase.from('fighter_stats').select('*'),
      ]);
      setStudents((profRes.data as Student[]) ?? []);
      const map: Record<string, StatsRow> = {};
      ((statsRes.data as StatsRow[]) ?? []).forEach((r) => {
        map[r.user_id] = r;
      });
      setStats(map);
      setLoading(false);
    };
    load();
  }, []);

  const pendingCount = students.filter((s) => !isEvaluated(stats[s.id])).length;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(
      (s) =>
        (!onlyPending || !isEvaluated(stats[s.id])) &&
        (!q || s.full_name.toLowerCase().includes(q) || (s.alias ?? '').toLowerCase().includes(q))
    );
  }, [students, stats, query, onlyPending]);

  const open = (s: Student) => {
    const row = stats[s.id];
    setValues(
      STATS.reduce((acc, { key }) => ({ ...acc, [key]: row?.[key] ?? 50 }), {} as StatValues)
    );
    setMessage(null);
    setEditing(s);
  };

  const save = async () => {
    if (!editing || !user) return;
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from('fighter_stats').upsert(
      { user_id: editing.id, ...values, updated_at: now, evaluated_by: user.id, evaluated_at: now },
      { onConflict: 'user_id' }
    );
    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: 'No se pudo guardar la valoración. Revisa la conexión e inténtalo de nuevo.' });
      return;
    }
    setStats((prev) => ({ ...prev, [editing.id]: { user_id: editing.id, ...values, evaluated_at: now } }));
    setMessage({ ok: true, text: `Valoración de ${editing.full_name} guardada.` });
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Valorar alumnos" />
      <p className="text-sm text-slate-300 -mt-2">
        Tu valoración alimenta el radar de combate que cada alumno ve en su app.
      </p>

      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={`rounded-xl px-4 py-2.5 text-sm border ${
            message.ok
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
              : 'bg-studio-red/15 border-studio-red/40 text-red-200'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
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
        <button
          type="button"
          onClick={() => setOnlyPending((v) => !v)}
          aria-pressed={onlyPending}
          className={`min-h-11 px-4 rounded-xl text-sm font-semibold border ${
            onlyPending
              ? 'bg-studio-cream text-slate-950 border-studio-cream'
              : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]'
          }`}
        >
          Sin evaluar ({pendingCount})
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={Target}>
          {onlyPending ? 'Todos los alumnos tienen valoración.' : 'Ningún alumno coincide con la búsqueda.'}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visible.map((s) => {
            const row = stats[s.id];
            const done = isEvaluated(row);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => open(s)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] p-3 text-left"
              >
                <span className="w-11 h-11 rounded-full studio-panel-inset border border-white/10 overflow-hidden grid place-items-center shrink-0">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white truncate">{s.full_name}</span>
                  <span className="block text-xs text-slate-300">
                    {s.belt ? `${s.belt} · ` : ''}
                    {done
                      ? row?.evaluated_at
                        ? `Valorado el ${new Date(row.evaluated_at).toLocaleDateString('es-ES')}`
                        : 'Valorado'
                      : 'Sin evaluar'}
                  </span>
                </span>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    done
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                      : 'bg-amber-500/15 text-amber-200 border-amber-400/30'
                  }`}
                >
                  {done ? 'Valorado' : 'Pendiente'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {editing &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Valorar a ${editing.full_name}`}
            onKeyDown={(e) => e.key === 'Escape' && !saving && setEditing(null)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          >
            <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl studio-panel border border-white/15 p-5 space-y-4 shadow-modal">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-headline text-xl uppercase text-white">{editing.full_name}</h2>
                  <p className="text-xs text-slate-300">De 0 a 100. El alumno verá este radar en su app.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  aria-label="Cerrar"
                  className="grid place-items-center min-h-11 min-w-11 rounded-xl text-slate-300 hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <FighterRadarChart items={STATS.map(({ key, label }) => ({ key, label, value: values[key] }))} />

              <div className="space-y-3">
                {STATS.map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <label htmlFor={`stat-${key}`} className="text-slate-200">
                        {label}
                      </label>
                      <span className="font-headline text-base text-white tabular-nums">{values[key]}</span>
                    </div>
                    <input
                      id={`stat-${key}`}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={values[key]}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: Number(e.target.value) }))}
                      className="w-full h-11 accent-red-600 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                  className="min-h-11 px-4 rounded-xl border border-white/10 text-sm text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="min-h-11 px-5 rounded-xl studio-btn text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar valoración'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
