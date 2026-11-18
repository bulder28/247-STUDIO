import { useCallback, useEffect, useState } from 'react';
import { FileText, Eye, PenTool, FolderOpen, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import EmptyState from '@/components/EmptyState';
import { SignaturePad } from '@/components/SignaturePad';
import { notifyDocsUpdated } from '@/lib/noticeRead';
import {
  categoryLabel,
  formatBytes,
  markViewed,
  openDocument,
  signAssignment,
  type DocAssignment,
} from '@/lib/studentDocuments';

type Badge = { text: string; cls: string };

const AMBER = 'bg-amber-500/15 text-amber-200 border-amber-400/30';
const GREEN = 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30';
const RED = 'bg-studio-red/20 text-red-200 border-studio-red/40';
const SKY = 'bg-sky-500/15 text-sky-200 border-sky-400/30';

function badgeFor(a: DocAssignment): Badge {
  const needs = a.academy_documents?.requires_signature;
  if (!needs) {
    return a.viewed_at ? { text: 'Visto', cls: GREEN } : { text: 'Nuevo', cls: SKY };
  }
  if (a.status === 'validated') return { text: 'Firma validada', cls: GREEN };
  if (a.status === 'signed') return { text: 'Firmado · pendiente de validar', cls: SKY };
  if (a.status === 'rejected') return { text: 'Firma rechazada · vuelve a firmar', cls: RED };
  return { text: 'Firma pendiente', cls: AMBER };
}

/** Sección del alumno: revisa los documentos que le asigna la academia y firma los que lo exigen. */
export function StudentDocumentsSection({
  userId,
  fullName,
  isMinor = false,
}: {
  userId: string;
  fullName: string;
  isMinor?: boolean;
}) {
  const [items, setItems] = useState<DocAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [signing, setSigning] = useState<DocAssignment | null>(null);
  const [signerName, setSignerName] = useState(fullName);
  const [signerDni, setSignerDni] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('document_assignments')
      .select('*, academy_documents(*)')
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });
    const rows = ((data as DocAssignment[]) ?? []).filter((r) => r.academy_documents);
    setItems(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const view = async (a: DocAssignment) => {
    if (!a.academy_documents) return;
    const ok = await openDocument(a.academy_documents);
    if (!ok) return setMessage({ ok: false, text: 'No se pudo abrir el documento.' });
    if (!a.viewed_at) {
      await markViewed(a.id);
      load();
    }
  };

  const startSign = (a: DocAssignment) => {
    setMessage(null);
    setSignature(null);
    setSignerDni('');
    setSignerName(fullName);
    setSigning(a);
  };

  const confirmSign = async () => {
    if (!signing || !signature) return;
    setBusy(true);
    const { error } = await signAssignment({
      assignmentId: signing.id,
      signerName,
      signerDni,
      signature,
    });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error });
    setSigning(null);
    notifyDocsUpdated();
    setMessage({ ok: true, text: 'Documento firmado. La academia lo validará.' });
    load();
  };

  const pendingSign = items.filter(
    (a) => a.academy_documents?.requires_signature && (a.status === 'pending' || a.status === 'rejected')
  ).length;

  return (
    <section className="rounded-2xl studio-panel border border-white/10 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-headline text-lg uppercase text-white">Documentos de la academia</h2>
          <p className="text-xs text-slate-300">
            Aquí encontrarás los documentos que te envía la academia. Ábrelos para leerlos y firma
            los que lo requieran.
            {isMinor ? ' Al ser menor, debe firmarlos el padre, madre o tutor legal.' : ''}
          </p>
        </div>
        {pendingSign > 0 && (
          <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${AMBER}`}>
            {pendingSign} por firmar
          </span>
        )}
      </div>

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

      {loading ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={FolderOpen} compact>
          La academia no te ha enviado ningún documento todavía.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const d = a.academy_documents!;
            const b = badgeFor(a);
            const canSign =
              d.requires_signature && (a.status === 'pending' || a.status === 'rejected');
            return (
              <div
                key={a.id}
                className="rounded-xl studio-panel-inset border border-white/5 p-3 space-y-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white break-words">{d.title}</p>
                    <p className="text-xs text-slate-300">
                      {categoryLabel(d.category)} · {formatBytes(d.size_bytes)} ·{' '}
                      {new Date(a.assigned_at).toLocaleDateString('es-ES')}
                    </p>
                    {d.description && (
                      <p className="mt-1 text-xs text-slate-300">{d.description}</p>
                    )}
                    <span
                      className={`inline-block mt-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${b.cls}`}
                    >
                      {b.text}
                    </span>
                    {a.status === 'rejected' && a.review_note && (
                      <p className="mt-1 text-xs text-red-200">Motivo: {a.review_note}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => view(a)}
                    className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-white"
                  >
                    <Eye className="w-4 h-4" /> Abrir documento
                  </button>
                  {canSign && (
                    <button
                      onClick={() => startSign(a)}
                      disabled={!a.viewed_at}
                      className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl studio-btn text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <PenTool className="w-4 h-4" /> Firmar
                    </button>
                  )}
                  {a.status === 'validated' && d.requires_signature && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" /> Validado por la academia
                    </span>
                  )}
                </div>
                {canSign && !a.viewed_at && (
                  <p className="text-xs text-slate-300">Abre el documento para poder firmarlo.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {signing?.academy_documents && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Firmar ${signing.academy_documents.title}`}
          onKeyDown={(e) => e.key === 'Escape' && !busy && setSigning(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl studio-panel border border-white/15 p-6 space-y-4 shadow-modal">
            <h3 className="font-headline text-xl uppercase text-white">
              {signing.academy_documents.title}
            </h3>
            <p className="text-xs text-slate-300">
              Al firmar confirmas que has leído y aceptas este documento.
            </p>
            {isMinor && (
              <p className="rounded-xl bg-sky-500/15 border border-sky-400/30 px-3 py-2 text-xs text-sky-200">
                Alumno menor: debe firmar el padre, madre o tutor legal. Pon su nombre.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="sig-name" className="block text-xs text-slate-300 uppercase mb-1">
                  Nombre del firmante
                </label>
                <input
                  id="sig-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="sig-dni" className="block text-xs text-slate-300 uppercase mb-1">
                  DNI (opcional)
                </label>
                <input
                  id="sig-dni"
                  value={signerDni}
                  onChange={(e) => setSignerDni(e.target.value)}
                  className="w-full min-h-11 rounded-xl studio-field px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <SignaturePad onChange={setSignature} />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSigning(null)}
                disabled={busy}
                className="min-h-11 px-4 rounded-xl border border-white/10 text-sm text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmSign}
                disabled={busy || !signature || signerName.trim().length < 2}
                className="min-h-11 px-5 rounded-xl studio-btn disabled:opacity-45 text-sm font-semibold text-white"
              >
                {busy ? 'Firmando…' : 'Confirmar firma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
