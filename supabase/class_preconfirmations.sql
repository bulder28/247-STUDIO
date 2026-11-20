-- ============================================================================
-- 247 STUDIO — Pre-confirmación opcional de asistencia desde el móvil
-- Ejecutar en Supabase -> SQL Editor -> New query
-- Permite a alumnos (y padres para hijos vinculados) confirmar que van a clase
-- antes de llegar al gimnasio para agilizar la entrada en el tatami.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_preconfirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule_class_id UUID NOT NULL REFERENCES public.schedule_classes(id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, schedule_class_id, class_date)
);

CREATE INDEX IF NOT EXISTS idx_class_preconfirmations_lookup
  ON public.class_preconfirmations (schedule_class_id, class_date);

ALTER TABLE public.class_preconfirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preconf_select" ON public.class_preconfirmations;
CREATE POLICY "preconf_select" ON public.class_preconfirmations
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND p.guardian_user_id = auth.uid()
    )
    OR public.get_my_role() IN ('admin', 'coach')
  );

DROP POLICY IF EXISTS "preconf_insert" ON public.class_preconfirmations;
CREATE POLICY "preconf_insert" ON public.class_preconfirmations
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND p.guardian_user_id = auth.uid()
    )
    OR public.get_my_role() IN ('admin', 'coach')
  );

DROP POLICY IF EXISTS "preconf_delete" ON public.class_preconfirmations;
CREATE POLICY "preconf_delete" ON public.class_preconfirmations
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND p.guardian_user_id = auth.uid()
    )
    OR public.get_my_role() IN ('admin', 'coach')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'class_preconfirmations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_preconfirmations;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
