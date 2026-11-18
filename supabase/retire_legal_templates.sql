-- ============================================================================
-- 247 STUDIO — Retirar los 4 documentos legales "de plantilla"
-- (privacidad, derechos de imagen, exención de responsabilidad, normas del tatami).
--
-- Los documentos legales reales los sube ahora el admin desde
-- Comunicación -> "Subir documentos" (tablas academy_documents / document_assignments).
--
-- Solo se DESACTIVAN: las firmas que ya hicieron los alumnos (document_signatures)
-- se conservan como histórico. La app ya no lee ninguna de las dos tablas.
-- Ejecutar en Supabase -> SQL Editor. Idempotente.
-- ============================================================================

UPDATE public.document_templates
   SET is_active = false
 WHERE slug IN (
   'privacidad-rgpd',
   'derechos-imagen-adulto',
   'derechos-imagen-menor',
   'exencion-responsabilidad-adulto',
   'exencion-responsabilidad-menor',
   'normas-tatami'
 );
