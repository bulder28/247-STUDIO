import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X, Eye, Search, PenTool } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/EmptyState';
import { categoryLabel, openDocument, type DocAssignment } from '@/lib/studentDocuments';

type Filter = 'signed' | 'validated' | 'rejected';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'signed', label: 'Por validar' },
  { id: 'validated', label: 'Validados (archivo)' },
  { id: 'rejected', label: 'Rechazados' },
];

/** Dentro de "Firmas": el admin valida o rechaza los documentos firmados por los alumnos. */
export function AdminSignatureValidation() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DocAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('signed');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocAssignment | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('document_assignments')
      .select('*, academy_documents(*), profiles!user_id(full_name)')
      .in('status', ['signed', 'validated', 'rejected'])
      .order('signed_at', { ascending: false });
    setRows((data as DocAssignment[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      signed: rows.filter((r) => r.status === 'signed').length,
      validated: rows.filter((r) => r.status === 'validated').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.status === filter &&
        (!q ||
          (r.profiles?.full_name ?? '').toLowerCase().includes(q) ||
          (r.academy_documents?.title ?? '').toLowerCase().includes(q))
    );
  }, [rows, filter, query]);

  const decide = async (r: DocAssignment, next: 'validated' | 'rejected') => {
    let note: string | null = null;
    if (next === 'rejected') {
      note = window.prompt('Motivo del rechazo (el alumno lo verá y deberá volver a firmar):', '');
      if (note === null) return;
    }
    const { error } = await supabase
      .from('document_assignments')
      .update({
        status: next,
        review_note: note?.trim() || null,
        validated_by: user?.id ?? null,
        validated_at: new Date().toISOString(),
      })
      .eq('id', r.id);
    setMessage(
      error
        ? 'No se pudo actualizar la firma.'
        : next === 'validated'
          ? 'Firma validada y archivada.'
          : 'Firma rechazada: el alumno deberá firmar de nuevo.'
    );
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-headline text-lg uppercase text-white">Documentos para validar</h3>
        <p className="text-xs text-slate-300">
          Documentos subidos por la academia que los alumnos han firmado. Al validarlos quedan
          archivados con la firma, el firmante y la fecha.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`min-h-11 px-4 rounded-xl text-sm font-semibold ${
                filter === f.id
                  ? 'bg-studio-cream text-slate-950'
                  : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alumno o documento"
            aria-label="Buscar alumno o documento"
            className="w-full min-h-11 rounded-xl studio-field pl-9 pr-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      {message && (
        <p role="status" className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-200">
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={PenTool}>
          {filter === 'signed'
            ? 'No hay firmas pendientes de validar.'
            : 'No hay documentos en esta lista.'}
        </EmptyState>
      ) : (
        <div className="rounded-2xl studio-panel border border-white/10 divide-y divide-white/5">
          {visible.map((r) => (
            <div key={r.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white break-words">
                  {r.profiles?.full_name ?? 'Alumno'} — {r.academy_documents?.title}
                </p>
                <p className="text-xs text-slate-300">
                  {r.academy_documents && categoryLabel(r.academy_documents.category)} · Firmante:{' '}
                  {r.signer_name}
                  {r.signer_dni ? ` (${r.signer_dni})` : ''} ·{' '}
                  {r.signed_at && new Date(r.signed_at).toLocaleString('es-ES')}
                </p>
                {r.status === 'validated' && r.validated_at && (
                  <p className="text-xs text-emerald-300 mt-0.5">
                    Validado el {new Date(r.validated_at).toLocaleDateString('es-ES')}
                  </p>
                )}
                {r.review_note && <p className="text-xs text-slate-300 mt-0.5">Nota: {r.review_note}</p>}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={() => setPreview(r)}
                  className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white"
                >
                  <PenTool className="w-4 h-4" /> Ver firma
                </button>
                {r.academy_documents && (
                  <button
                    onClick={async () => {
                      if (!(await openDocument(r.academy_documents!)))
                        setMessage('No se pudo abrir el documento.');
                    }}
                    className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white"
                  >
                    <Eye className="w-4 h-4" /> Documento
                  </button>
                )}
                {r.status !== 'validated' && (
                  <button
                    onClick={() => decide(r, 'validated')}
                    className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-xs font-medium text-emerald-200"
                  >
                    <Check className="w-4 h-4" /> Validar
                  </button>
                )}
                {r.status === 'signed' && (
                  <button
                    onClick={() => decide(r, 'rejected')}
                    className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-studio-red/15 hover:bg-studio-red/30 text-xs font-medium text-red-200"
                  >
                    <X className="w-4 h-4" /> Rechazar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Firma del alumno"
          onKeyDown={(e) => e.key === 'Escape' && setPreview(null)}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="rounded-2xl studio-panel border border-white/15 p-6 max-w-md w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-headline text-lg uppercase text-white">
              Firma de {preview.signer_name}
            </h3>
            {preview.signature_image_url && (
              <img
                src={preview.signature_image_url}
                alt="Firma"
                className="w-full rounded-xl studio-panel-inset border border-white/10"
              />
            )}
            <button
              autoFocus
              onClick={() => setPreview(null)}
              className="w-full min-h-11 rounded-xl bg-studio-red text-sm font-semibold text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
