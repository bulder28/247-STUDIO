-- ============================================================================
-- 247 STUDIO — Biblioteca de documentos de la academia (v2)
--
-- Flujo:
--   1. El ADMIN sube un documento (PDF, imagen, Word…), decide si EXIGE FIRMA
--      y a quién se lo asigna (todos los alumnos activos o alumnos concretos).
--   2. El ALUMNO lo abre/descarga y, si exige firma, lo firma en pantalla.
--   3. El ADMIN valida o rechaza la firma en la pestaña "Firmas".
--      Lo validado queda archivado (documento + firma + fecha + firmante).
--
-- Bucket PRIVADO: solo se descarga con URL firmada de 60 s.
-- Ejecutar en Supabase -> SQL Editor -> New query. Idempotente.
--
-- AVISO: sustituye a la primera versión (alumno sube, tabla student_documents).
-- Esa tabla se elimina al final del bloque 0; si ya la ejecutaste, estaba vacía.
-- ============================================================================

-- 0) Limpieza de la versión anterior (si existía)
DROP POLICY IF EXISTS "student_docs_obj_select" ON storage.objects;
DROP POLICY IF EXISTS "student_docs_obj_insert" ON storage.objects;
DROP POLICY IF EXISTS "student_docs_obj_delete" ON storage.objects;
DROP TABLE IF EXISTS public.student_documents CASCADE;

-- 1) Bucket privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Documentos de la academia (los sube el admin)
CREATE TABLE IF NOT EXISTS public.academy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 600),
  category TEXT NOT NULL DEFAULT 'otro'
    CHECK (category IN ('normas_seguridad', 'permiso', 'certificado_medico', 'identificacion', 'seguro', 'otro')),
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  requires_signature BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Asignación a alumnos + estado de lectura/firma/validación
CREATE TABLE IF NOT EXISTS public.document_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.academy_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'signed', 'validated', 'rejected')),
  signer_name TEXT,
  signer_dni TEXT,
  signature_image_url TEXT,
  signed_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  review_note TEXT,
  UNIQUE (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS document_assignments_user_idx ON public.document_assignments (user_id);
CREATE INDEX IF NOT EXISTS document_assignments_status_idx ON public.document_assignments (status, signed_at DESC);

ALTER TABLE public.academy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_assignments ENABLE ROW LEVEL SECURITY;

-- academy_documents: el admin todo; el alumno solo los activos que le han asignado
DROP POLICY IF EXISTS "academy_docs_select" ON public.academy_documents;
CREATE POLICY "academy_docs_select" ON public.academy_documents
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    OR (
      is_active
      AND EXISTS (
        SELECT 1 FROM public.document_assignments a
        WHERE a.document_id = academy_documents.id AND a.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "academy_docs_admin_write" ON public.academy_documents;
CREATE POLICY "academy_docs_admin_write" ON public.academy_documents
  FOR ALL USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- document_assignments: el alumno solo LEE las suyas; no tiene UPDATE directo
-- (firma y "visto" van por las funciones de abajo, para que no pueda auto-validarse).
DROP POLICY IF EXISTS "doc_assign_select" ON public.document_assignments;
CREATE POLICY "doc_assign_select" ON public.document_assignments
  FOR SELECT USING (user_id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "doc_assign_admin_write" ON public.document_assignments;
CREATE POLICY "doc_assign_admin_write" ON public.document_assignments
  FOR ALL USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- 4) Acciones del alumno (SECURITY DEFINER: validan que la fila sea suya)
CREATE OR REPLACE FUNCTION public.mark_assignment_viewed(p_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.document_assignments
     SET viewed_at = COALESCE(viewed_at, NOW())
   WHERE id = p_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.sign_assignment(
  p_id UUID,
  p_signer_name TEXT,
  p_signer_dni TEXT,
  p_signature TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.document_assignments%ROWTYPE;
  v_requires BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM public.document_assignments
   WHERE id = p_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;

  SELECT requires_signature INTO v_requires FROM public.academy_documents
   WHERE id = v_row.document_id AND is_active;
  IF v_requires IS NOT TRUE THEN
    RAISE EXCEPTION 'Este documento no requiere firma';
  END IF;

  IF v_row.status NOT IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'Este documento ya está firmado';
  END IF;

  IF v_row.viewed_at IS NULL THEN
    RAISE EXCEPTION 'Abre el documento antes de firmarlo';
  END IF;

  IF p_signer_name IS NULL OR char_length(btrim(p_signer_name)) < 2 THEN
    RAISE EXCEPTION 'Falta el nombre del firmante';
  END IF;

  IF p_signature IS NULL
     OR p_signature NOT LIKE 'data:image/png;base64,%'
     OR char_length(p_signature) > 400000 THEN
    RAISE EXCEPTION 'Firma no válida';
  END IF;

  UPDATE public.document_assignments
     SET status = 'signed',
         signer_name = btrim(p_signer_name),
         signer_dni = NULLIF(btrim(COALESCE(p_signer_dni, '')), ''),
         signature_image_url = p_signature,
         signed_at = NOW(),
         validated_by = NULL,
         validated_at = NULL
   WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_assignment_viewed(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_assignment(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_assignment_viewed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_assignment(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 5) Bucket: solo el admin escribe; el alumno lee únicamente lo que le han asignado
CREATE POLICY "student_docs_obj_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'student-documents'
    AND (
      public.get_my_role() = 'admin'
      OR EXISTS (
        SELECT 1
        FROM public.academy_documents d
        JOIN public.document_assignments a ON a.document_id = d.id
        WHERE d.file_path = storage.objects.name
          AND d.is_active
          AND a.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "student_docs_obj_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'student-documents' AND public.get_my_role() = 'admin'
  );

CREATE POLICY "student_docs_obj_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'student-documents' AND public.get_my_role() = 'admin'
  );
