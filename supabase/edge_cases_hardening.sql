-- ============================================================================
-- 247 STUDIO — Blindaje de Casos Límite (Bonos, Ficha Base y Consistencia)
-- Ejecutar en Supabase -> SQL Editor -> New query
-- ============================================================================

-- 1. Inicializar automáticamente remaining_credits cuando se crea/cambia a un Bono
CREATE OR REPLACE FUNCTION public.init_subscription_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_pack BOOLEAN;
  v_credits INT;
BEGIN
  SELECT is_class_pack, pack_credits
  INTO v_is_pack, v_credits
  FROM public.plans
  WHERE id = NEW.plan_id;

  IF COALESCE(v_is_pack, FALSE) THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.plan_id IS DISTINCT FROM OLD.plan_id) THEN
      NEW.remaining_credits := COALESCE(NEW.remaining_credits, v_credits, 1);
    END IF;
  ELSE
    NEW.remaining_credits := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_subscription_credits ON public.subscriptions;
CREATE TRIGGER trg_init_subscription_credits
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.init_subscription_credits();

-- Backfill para bonos ya existentes sin créditos inicializados
UPDATE public.subscriptions s
SET remaining_credits = COALESCE(pl.pack_credits, 1)
FROM public.plans pl
WHERE s.plan_id = pl.id
  AND pl.is_class_pack = TRUE
  AND s.remaining_credits IS NULL;

-- 2. Descontar / devolver 1 crédito automáticamente al pasar lista con Bono Clase Suelta
CREATE OR REPLACE FUNCTION public.sync_pack_credits_on_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_month TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    v_uid := NEW.user_id;
    v_month := to_char(NEW.attendance_date, 'YYYY-MM');

    UPDATE public.subscriptions s
    SET remaining_credits = GREATEST(0, COALESCE(s.remaining_credits, pl.pack_credits, 1) - 1)
    FROM public.plans pl
    WHERE s.user_id = v_uid
      AND s.month_year = v_month
      AND s.status = 'active'
      AND s.plan_id = pl.id
      AND pl.is_class_pack = TRUE;

  ELSIF TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL THEN
    v_uid := OLD.user_id;
    v_month := to_char(OLD.attendance_date, 'YYYY-MM');

    UPDATE public.subscriptions s
    SET remaining_credits = LEAST(
      COALESCE(pl.pack_credits, COALESCE(s.remaining_credits, 0) + 1),
      COALESCE(s.remaining_credits, 0) + 1
    )
    FROM public.plans pl
    WHERE s.user_id = v_uid
      AND s.month_year = v_month
      AND s.status = 'active'
      AND s.plan_id = pl.id
      AND pl.is_class_pack = TRUE;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pack_credits ON public.attendances;
CREATE TRIGGER trg_sync_pack_credits
  AFTER INSERT OR DELETE ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_pack_credits_on_attendance();

-- 3. Crear fila inicial en fighter_stats automáticamente para cada nuevo alumno
CREATE OR REPLACE FUNCTION public.init_fighter_stats_for_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'client' THEN
    INSERT INTO public.fighter_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_fighter_stats ON public.profiles;
CREATE TRIGGER trg_init_fighter_stats
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.init_fighter_stats_for_client();

-- Backfill para clientes existentes sin fighter_stats
INSERT INTO public.fighter_stats (user_id)
SELECT id FROM public.profiles
WHERE role = 'client'
ON CONFLICT (user_id) DO NOTHING;

