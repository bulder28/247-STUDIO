-- ============================================================================
-- 247 STUDIO — Quitar a un alumno de la lista de una clase concreta
--
-- La lista de Pasar lista sale de la tarifa: si incluye la disciplina, el alumno
-- aparece en TODAS las clases de esa disciplina. Esta tabla guarda a quién se ha
-- quitado de una clase (franja) concreta porque no pertenece a ese grupo.
-- No toca su tarifa ni sus otras clases; se puede deshacer desde la app.
--
-- Ejecutar en Supabase -> SQL Editor. Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_roster_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_class_id UUID NOT NULL REFERENCES public.schedule_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_class_id, user_id)
);

ALTER TABLE public.class_roster_exclusions ENABLE ROW LEVEL SECURITY;

-- Solo dirección y profesores la leen y la cambian
DROP POLICY IF EXISTS "roster_excl_staff_all" ON public.class_roster_exclusions;
CREATE POLICY "roster_excl_staff_all" ON public.class_roster_exclusions
  FOR ALL USING (public.get_my_role() IN ('admin', 'coach'))
  WITH CHECK (public.get_my_role() IN ('admin', 'coach'));
