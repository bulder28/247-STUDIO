-- ============================================================================
-- 247 STUDIO — El profesor no podía pasar lista a alumnos que entrenaban por primera vez
--
-- Al insertar la primera asistencia de un alumno, el trigger trg_set_first_training
-- rellena profiles.first_training_at. La protección trg_prevent_profile_escalation
-- prohíbe a quien no es admin cambiar ese campo, así que con sesión de profesor la
-- asistencia entera fallaba (error 400): "marca a unos sí y a otros no".
--
-- Arreglo: se permite ese único cambio (first_training_at de NULL a un valor) cuando
-- llega desde otro trigger (pg_trigger_depth() > 1), es decir, desde la asistencia.
-- Un UPDATE directo de un alumno o profesor sobre su perfil sigue bloqueado igual.
--
-- Ejecutar en Supabase -> SQL Editor. Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_training_by_attendance BOOLEAN :=
    pg_trigger_depth() > 1
    AND OLD.first_training_at IS NULL
    AND NEW.first_training_at IS NOT NULL;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.belt IS DISTINCT FROM OLD.belt
       OR NEW.belt_stripes IS DISTINCT FROM OLD.belt_stripes
       OR (NEW.first_training_at IS DISTINCT FROM OLD.first_training_at AND NOT v_first_training_by_attendance)
       OR NEW.guardian_user_id IS DISTINCT FROM OLD.guardian_user_id
       OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'No tienes permiso para modificar campos administrativos del perfil.';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2) El profesor puede valorar el radar del alumno (fighter_stats)
--    Antes solo había lectura para el profesor y escritura para el admin.
--    Se guarda quién y cuándo hizo la última valoración.
-- ============================================================================

ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS evaluated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "stats_coach_insert" ON public.fighter_stats;
CREATE POLICY "stats_coach_insert" ON public.fighter_stats
  FOR INSERT WITH CHECK (public.get_my_role() = 'coach');

DROP POLICY IF EXISTS "stats_coach_update" ON public.fighter_stats;
CREATE POLICY "stats_coach_update" ON public.fighter_stats
  FOR UPDATE USING (public.get_my_role() = 'coach')
  WITH CHECK (public.get_my_role() = 'coach');
