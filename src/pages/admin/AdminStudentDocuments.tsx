import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Loader2, Eye, Trash2, Archive, ArchiveRestore, PenTool, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/EmptyState';
import {
  DOC_ACCEPT,
  DOC_CATEGORIES,
  categoryLabel,
  deleteDocument,
  formatBytes,
  openDocument,
  publishDocument,
  validateDocFile,
  type AcademyDocument,
  type DocCategory,
} from '@/lib/studentDocuments';

interface Student {
  id: string;
  full_name: string;
}

interface AssignmentStat {
  document_id: string;
  status: string;
  viewed_at: string | null;
}

/** Pestaña "Subir documentos": el admin sube documentos, decide si exigen firma y a quién se envían. */
export function AdminStudentDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<AcademyDocument[]>([]);
  const [stats, setStats] = useState<AssignmentStat[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocCategory>('normas_seguridad');
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [audience, setAudience] = useState<'all' | 'some'>('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [studentQuery, setStudentQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [d, a, s] = await Promise.all([
      supabase.from('academy_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('document_assignments').select('document_id, status, viewed_at'),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'client')
        .eq('status', 'active')
        .order('full_name'),
    ]);
    setDocs((d.data as AcademyDocument[]) ?? []);
    setStats((a.data as AssignmentStat[]) ?? []);
    setStudents((s.data as Student[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return q ? students.filter((s) => s.full_name.toLowerCase().includes(q)) : students;
  }, [students, studentQuery]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onPick = (f: File | null) => {
    setMessage(null);
    if (!f) return setFile(null);
    const err = validateDocFile(f);
    if (err) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      return setMessage({ ok: false, text: err });
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 120));
  };

  const recipients = audience === 'all' ? students.map((s) => s.id) : [...picked];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return setMessage({ ok: false, text: 'Elige primero un archivo.' });
    if (recipients.length === 0) {
      return setMessage({ ok: false, text: 'Elige al menos un alumno destinatario.' });
    }
    if (
      audience === 'all' &&
      !window.confirm(`¿Enviar este documento a ${recipients.length} alumnos activos?`)
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await publishDocument({
      adminId: user.id,
      file,
      title,
      description,
      category,
      requiresSignature,
      userIds: recipients,
    });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error });
    setMessage({
      ok: true,
      text: `Documento enviado a ${recipients.length} alumno${recipients.length === 1 ? '' : 's'}.`,
    });
    setFile(null);
    setTitle('');
    setDescription('');
    setRequiresSignature(false);
    setPicked(new Set());
    if (inputRef.current) inputRef.current.value = '';
    load();
  };

  const countsFor = (docId: string) => {
    const rows = stats.filter((r) => r.document_id === docId);
    return {
      total: rows.length,
      viewed: rows.filter((r) => r.viewed_at).length,
      signed: rows.filter((r) => r.status === 'signed' || r.status === 'validated').length,
      validated: rows.filter((r) => r.status === 'validated').length,
    };
  };

  const toggleActive = async (d: AcademyDocument) => {
    const { error } = await supabase
      .from('academy_documents')
      .update({ is_active: !d.is_active })
      .eq('id', d.id);
    setMessage(
      error
        ? { ok: false, text: 'No se pudo actualizar el documento.' }
        : { ok: true, text: d.is_active ? 'Documento archivado: los alumnos ya no lo ven.' : 'Documento reactivado.' }
    );
    load();
  };

  const remove = async (d: AcademyDocument) => {
    if (!window.confirm(`¿Borrar "${d.title}" y quitarlo a todos los alumnos?`)) return;
    const { error } = await deleteDocument(d);
    setMessage(error ? { ok: false, text: error } : { ok: true, text: 'Documento borrado.' });
    load();
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4 max-w-3xl"
      >
        <h3 className="font-headline text-lg uppercase text-white">Subir un documento</h3>

        <div>
          <label htmlFor="up-file" className="block text-xs text-slate-300 uppercase mb-1">
            Archivo (PDF, imagen, Word, Excel · máx. 10 MB)
          </label>
          <input
            id="up-file"
            ref={inputRef}
            type="file"
            accept={DOC_ACCEPT}
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-200 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
          />
          {file && (
            <p className="mt-1 text-xs text-slate-300">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="up-title" className="block text-xs text-slate-300 uppercase mb-1">
              Título
            </label>
            <input
              id="up-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="up-cat" className="block text-xs text-slate-300 uppercase mb-1">
              Tipo
            </label>
            <select
              id="up-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocCategory)}
              className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white"
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="up-desc" className="block text-xs text-slate-300 uppercase mb-1">
            Mensaje para el alumno (opcional)
          </label>
          <textarea
            id="up-desc"
            value={description}
            maxLength={600}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
          />
        </div>

        <label className="flex items-center gap-3 min-h-11 cursor-pointer">
          <input
            type="checkbox"
            checked={requiresSignature}
            onChange={(e) => setRequiresSignature(e.target.checked)}
            className="w-5 h-5 accent-red-600"
          />
          <span className="text-sm text-white">
            <strong>Exigir firma</strong> del alumno (aparecerá una campana de pendiente)
          </span>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs text-slate-300 uppercase mb-1">Destinatarios</legend>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 min-h-11 cursor-pointer text-sm text-white">
              <input
                type="radio"
                name="audience"
                checked={audience === 'all'}
                onChange={() => setAudience('all')}
                className="accent-red-600"
              />
              Todos los alumnos activos ({students.length})
            </label>
            <label className="inline-flex items-center gap-2 min-h-11 cursor-pointer text-sm text-white">
              <input
                type="radio"
                name="audience"
                checked={audience === 'some'}
                onChange={() => setAudience('some')}
                className="accent-red-600"
              />
              Elegir alumnos
            </label>
          </div>

          {audience === 'some' && (
            <div className="rounded-xl studio-panel-inset border border-white/10 p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                <input
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Buscar alumno"
                  aria-label="Buscar alumno"
                  className="w-full min-h-11 rounded-xl studio-field pl-9 pr-3 py-2 text-sm text-white"
                />
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                {filteredStudents.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 min-h-11 px-1 cursor-pointer text-sm text-white"
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="w-5 h-5 accent-red-600"
                    />
                    {s.full_name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-300">{picked.size} seleccionado(s)</p>
            </div>
          )}
        </fieldset>

        <button
          type="submit"
          disabled={busy || !file}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl studio-btn text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {busy ? 'Enviando…' : 'Subir y enviar'}
        </button>

        {message && (
          <p
            role={message.ok ? 'status' : 'alert'}
            className={`rounded-xl px-3 py-2 text-xs border ${
              message.ok
                ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                : 'bg-studio-red/15 border-studio-red/40 text-red-200'
            }`}
          >
            {message.text}
          </p>
        )}
      </form>

      <div className="space-y-2">
        <h3 className="font-headline text-lg uppercase text-white">Documentos enviados</h3>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : docs.length === 0 ? (
          <EmptyState icon={Upload}>Aún no has subido ningún documento.</EmptyState>
        ) : (
          <div className="rounded-2xl studio-panel border border-white/10 divide-y divide-white/5">
            {docs.map((d) => {
              const c = countsFor(d.id);
              return (
                <div
                  key={d.id}
                  className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                    d.is_active ? '' : 'opacity-60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white break-words">
                      {d.title}{' '}
                      {d.requires_signature && (
                        <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[11px] text-amber-200">
                          <PenTool className="w-3 h-3" /> Exige firma
                        </span>
                      )}
                      {!d.is_active && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-[11px] text-slate-300">
                          Archivado
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-300">
                      {categoryLabel(d.category)} · {d.file_name} · {formatBytes(d.size_bytes)} ·{' '}
                      {new Date(d.created_at).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      Enviado a {c.total} · visto por {c.viewed}
                      {d.requires_signature && ` · firmado ${c.signed} · validado ${c.validated}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        if (!(await openDocument(d)))
                          setMessage({ ok: false, text: 'No se pudo abrir el documento.' });
                      }}
                      className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white"
                    >
                      <Eye className="w-4 h-4" /> Ver
                    </button>
                    <button
                      onClick={() => toggleActive(d)}
                      className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white"
                    >
                      {d.is_active ? (
                        <>
                          <Archive className="w-4 h-4" /> Archivar
                        </>
                      ) : (
                        <>
                          <ArchiveRestore className="w-4 h-4" /> Reactivar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => remove(d)}
                      disabled={c.signed > 0}
                      title={c.signed > 0 ? 'Tiene firmas: archívalo en vez de borrarlo' : undefined}
                      aria-label={`Borrar ${d.title}`}
                      className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl bg-white/5 hover:bg-studio-red/30 text-white disabled:opacity-40 disabled:hover:bg-white/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
