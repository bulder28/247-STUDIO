import { supabase } from '@/lib/supabase';

export const DOC_BUCKET = 'student-documents';
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

export const DOC_CATEGORIES = [
  { value: 'normas_seguridad', label: 'Normas de seguridad' },
  { value: 'permiso', label: 'Permiso / autorización' },
  { value: 'certificado_medico', label: 'Certificado médico' },
  { value: 'identificacion', label: 'Identificación (DNI)' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'otro', label: 'Otro documento' },
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number]['value'];
export type AssignmentStatus = 'pending' | 'signed' | 'validated' | 'rejected';

export interface AcademyDocument {
  id: string;
  title: string;
  description: string | null;
  category: DocCategory;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  requires_signature: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DocAssignment {
  id: string;
  document_id: string;
  user_id: string;
  assigned_at: string;
  viewed_at: string | null;
  status: AssignmentStatus;
  signer_name: string | null;
  signer_dni: string | null;
  signature_image_url: string | null;
  signed_at: string | null;
  validated_at: string | null;
  review_note: string | null;
  academy_documents?: AcademyDocument | null;
  profiles?: { full_name: string } | null;
}

/** Extensión → MIME. Se usa en vez de file.type, que algunos móviles dejan vacío. */
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  odt: 'application/vnd.oasis.opendocument.text',
  txt: 'text/plain',
};

export const DOC_ACCEPT = Object.keys(MIME_BY_EXT)
  .map((e) => `.${e}`)
  .join(',');

export const categoryLabel = (c: string) =>
  DOC_CATEGORIES.find((x) => x.value === c)?.label ?? 'Otro documento';

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Devuelve un mensaje de error en español, o null si el archivo es válido. */
export function validateDocFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!MIME_BY_EXT[ext]) {
    return 'Formato no admitido. Usa PDF, imagen (JPG, PNG, WebP, HEIC), Word, Excel, ODT o TXT.';
  }
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > MAX_DOC_BYTES) {
    return `El archivo pesa ${formatBytes(file.size)}. El máximo es 10 MB.`;
  }
  return null;
}

/** Nombre seguro para la ruta de almacenamiento (sin tildes, espacios ni símbolos raros). */
function safeName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  const clean =
    base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'documento';
  return ext ? `${clean}.${ext}` : clean;
}

/**
 * ADMIN: sube un documento y lo asigna a los alumnos indicados.
 * Si algo falla a mitad, deshace lo hecho para no dejar archivos ni filas huérfanas.
 */
export async function publishDocument(params: {
  adminId: string;
  file: File;
  title: string;
  description: string;
  category: DocCategory;
  requiresSignature: boolean;
  userIds: string[];
}): Promise<{ error: string | null }> {
  const { adminId, file, title, description, category, requiresSignature, userIds } = params;
  const invalid = validateDocFile(file);
  if (invalid) return { error: invalid };
  if (userIds.length === 0) return { error: 'Elige al menos un alumno destinatario.' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = MIME_BY_EXT[ext];
  const path = `library/${crypto.randomUUID()}-${safeName(file.name)}`;

  const up = await supabase.storage
    .from(DOC_BUCKET)
    .upload(path, file, { contentType: mime, upsert: false });
  if (up.error) return { error: 'No se pudo subir el archivo. Revisa tu conexión.' };

  const ins = await supabase
    .from('academy_documents')
    .insert({
      title: title.trim() || file.name.slice(0, 120),
      description: description.trim() || null,
      category,
      file_path: path,
      file_name: file.name.slice(0, 200),
      mime_type: mime,
      size_bytes: file.size,
      requires_signature: requiresSignature,
      uploaded_by: adminId,
    })
    .select('id')
    .single();
  if (ins.error || !ins.data) {
    await supabase.storage.from(DOC_BUCKET).remove([path]);
    return { error: 'No se pudo registrar el documento.' };
  }

  const docId = ins.data.id as string;
  for (let i = 0; i < userIds.length; i += 200) {
    const chunk = userIds.slice(i, i + 200).map((user_id) => ({ document_id: docId, user_id }));
    const asg = await supabase.from('document_assignments').insert(chunk);
    if (asg.error) {
      await supabase.from('academy_documents').delete().eq('id', docId);
      await supabase.storage.from(DOC_BUCKET).remove([path]);
      return { error: 'No se pudo asignar el documento a los alumnos.' };
    }
  }
  return { error: null };
}

/** URL firmada de 60 s: el bucket es privado. */
export async function getDocumentUrl(path: string, fileName: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(path, 60, { download: fileName });
  return error ? null : data.signedUrl;
}

/** Abre el documento en una pestaña nueva. Devuelve false si no se pudo. */
export async function openDocument(doc: Pick<AcademyDocument, 'file_path' | 'file_name'>) {
  const url = await getDocumentUrl(doc.file_path, doc.file_name);
  if (!url) return false;
  window.open(url, '_blank', 'noopener');
  return true;
}

/** ALUMNO: registra que ha abierto el documento (requisito previo para firmar). */
export async function markViewed(assignmentId: string) {
  await supabase.rpc('mark_assignment_viewed', { p_id: assignmentId });
}

/** ALUMNO: firma. Las reglas (abrir antes, solo una vez…) las valida la base de datos. */
export async function signAssignment(params: {
  assignmentId: string;
  signerName: string;
  signerDni: string;
  signature: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('sign_assignment', {
    p_id: params.assignmentId,
    p_signer_name: params.signerName,
    p_signer_dni: params.signerDni,
    p_signature: params.signature,
  });
  return { error: error ? error.message : null };
}

/** Un documento con firma exigida asignado a un alumno, tal como lo ve el admin. */
export interface SignatureTask {
  title: string;
  status: AssignmentStatus;
  signed_at: string | null;
}

export const isPendingSignature = (t: SignatureTask) =>
  t.status === 'pending' || t.status === 'rejected';

export const countPendingSignatures = (tasks?: SignatureTask[]) =>
  (tasks ?? []).filter(isPendingSignature).length;

/**
 * ADMIN: documentos activos que exigen firma, agrupados por alumno.
 * Pagina de 1000 en 1000 (límite por defecto de Supabase).
 */
export async function fetchSignatureTasksByUser(): Promise<Record<string, SignatureTask[]>> {
  const byUser: Record<string, SignatureTask[]> = {};
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('document_assignments')
      .select('user_id, status, signed_at, academy_documents!inner(title, requires_signature, is_active)')
      .eq('academy_documents.requires_signature', true)
      .eq('academy_documents.is_active', true)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    for (const r of data as unknown as {
      user_id: string;
      status: AssignmentStatus;
      signed_at: string | null;
      academy_documents: { title: string };
    }[]) {
      (byUser[r.user_id] ??= []).push({
        title: r.academy_documents.title,
        status: r.status,
        signed_at: r.signed_at,
      });
    }
    if (data.length < PAGE) break;
  }
  return byUser;
}

/** ADMIN: borrar un documento y su archivo (solo si nadie lo ha firmado). */
export async function deleteDocument(doc: Pick<AcademyDocument, 'id' | 'file_path'>) {
  const del = await supabase.from('academy_documents').delete().eq('id', doc.id);
  if (del.error) return { error: 'No se pudo borrar el documento.' };
  await supabase.storage.from(DOC_BUCKET).remove([doc.file_path]);
  return { error: null };
}
