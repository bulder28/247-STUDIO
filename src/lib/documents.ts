import { isMinorAge } from '@/lib/dateUtils';

export interface DocTemplate {
  id: string;
  slug: string;
  title: string;
  body_text: string;
  version: number;
}

export interface DocSignature {
  user_id?: string;
  template_id: string;
  template_version: number;
  signed_at: string;
  signer_name?: string;
}

const ADULT_DOC_SLUGS = [
  'privacidad-rgpd',
  'derechos-imagen-adulto',
  'exencion-responsabilidad-adulto',
  'normas-tatami',
] as const;

const MINOR_DOC_SLUGS = [
  'privacidad-rgpd',
  'derechos-imagen-menor',
  'exencion-responsabilidad-menor',
  'normas-tatami',
] as const;

/**
 * Devuelve los slugs de documentos obligatorios según si el alumno es menor (<= 14 años) o adulto.
 */
export function getRequiredDocSlugs(birthDate?: string | null): readonly string[] {
  return isMinorAge(birthDate) ? MINOR_DOC_SLUGS : ADULT_DOC_SLUGS;
}

/**
 * Filtra las plantillas aplicables al alumno y calcula cuáles están firmadas o pendientes.
 */
export function getDocumentCompliance(
  templates: DocTemplate[],
  signatures: DocSignature[],
  birthDate?: string | null
) {
  const requiredSlugs = getRequiredDocSlugs(birthDate);
  const required = templates.filter((t) => requiredSlugs.includes(t.slug));
  const pending = required.filter(
    (doc) => !signatures.some((s) => s.template_id === doc.id && s.template_version === doc.version)
  );
  const signedCount = required.length - pending.length;

  return {
    required,
    pending,
    signedCount,
    totalRequired: required.length,
    isComplete: required.length > 0 && pending.length === 0,
  };
}

