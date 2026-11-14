-- ============================================================================
-- 247 STUDIO — Migración: Primer Acceso (must_change_password) y Clases de Prueba
-- Ejecutar en Supabase -> SQL Editor -> New query
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.trial_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE RESTRICT,
  trial_date DATE NOT NULL DEFAULT CURRENT_DATE,
  schedule_class_id UUID REFERENCES public.schedule_classes(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  converted_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trial_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trial_guests_read" ON public.trial_guests;
CREATE POLICY "trial_guests_read" ON public.trial_guests
  FOR SELECT USING (public.get_my_role() IN ('admin', 'coach'));

DROP POLICY IF EXISTS "trial_guests_insert" ON public.trial_guests;
CREATE POLICY "trial_guests_insert" ON public.trial_guests
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'coach'));

DROP POLICY IF EXISTS "trial_guests_admin_update" ON public.trial_guests;
CREATE POLICY "trial_guests_admin_update" ON public.trial_guests
  FOR UPDATE USING (public.get_my_role() = 'admin');

