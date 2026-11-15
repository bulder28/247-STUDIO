-- ============================================================================
-- 247 STUDIO — Finanzas · Paso 0: ingresos fiables
-- Ejecutar en Supabase -> SQL Editor -> New query (idempotente: se puede repetir)
--
-- 1. Historial de cambios en pagos (quién cobró, quién deshizo, cuándo)
-- 2. Los pagos ya no se borran al borrar un alumno (ON DELETE RESTRICT)
-- 3. El "mes actual" de la vista de pagos se calcula en hora de Madrid
-- 4. Función única de "cobrado en el mes" (criterio de caja, hora de Madrid)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trazabilidad de pagos
-- ----------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.payment_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id UUID,
  user_id UUID,
  month_year TEXT,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_row JSONB,
  new_row JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_events_user_month_idx
  ON public.payment_events (user_id, month_year);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_events_admin_read" ON public.payment_events;
CREATE POLICY "payment_events_admin_read" ON public.payment_events
  FOR SELECT USING (public.get_my_role() = 'admin');
-- Sin políticas de escritura: solo el trigger (SECURITY DEFINER) escribe el historial.

-- Marca quién registra el cobro y la fecha de última modificación
CREATE OR REPLACE FUNCTION public.payments_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Un cobro ya registrado no se pisa: para corregirlo, primero se deshace (pasa a pendiente)
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'paid_ok' AND NEW.status = 'paid_ok'
     AND (NEW.paid_at IS DISTINCT FROM OLD.paid_at OR NEW.amount_eur IS DISTINCT FROM OLD.amount_eur) THEN
    RAISE EXCEPTION 'El mes % ya está cobrado. Deshaz el cobro antes de registrarlo de nuevo.', OLD.month_year
      USING ERRCODE = 'P0001';
  END IF;

  NEW.updated_at := NOW();
  IF NEW.status = 'paid_ok'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid_ok') THEN
    -- Quién registra este cobro (NULL si se hace desde el SQL Editor)
    NEW.recorded_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_touch_trg ON public.payments;
CREATE TRIGGER payments_touch_trg
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_touch();

-- Copia cada alta, cambio o borrado de un pago en payment_events
CREATE OR REPLACE FUNCTION public.payments_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.payment_events (payment_id, user_id, month_year, action, new_row, changed_by)
    VALUES (NEW.id, NEW.user_id, NEW.month_year, 'insert', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(OLD) - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'updated_at') THEN
      INSERT INTO public.payment_events (payment_id, user_id, month_year, action, old_row, new_row, changed_by)
      VALUES (NEW.id, NEW.user_id, NEW.month_year, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO public.payment_events (payment_id, user_id, month_year, action, old_row, changed_by)
    VALUES (OLD.id, OLD.user_id, OLD.month_year, 'delete', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS payments_audit_trg ON public.payments;
CREATE TRIGGER payments_audit_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_audit();

-- ----------------------------------------------------------------------------
-- 2. Un alumno con pagos ya no se puede borrar en cascada: se pierde la caja.
--    Para dar de baja a un alumno, márcalo como inactivo.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_con TEXT;
BEGIN
  FOR v_con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.payments'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND a.attname = 'user_id'
  LOOP
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', v_con);
  END LOOP;

  ALTER TABLE public.payments
    ADD CONSTRAINT payments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Vista de pagos: mismo contenido, "mes actual" en hora de Madrid
--    (antes usaba CURRENT_DATE del servidor, en UTC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_monthly_payment_status
WITH (security_invoker = true)
AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.status AS member_status,
  p.is_founder,
  s.month_year,
  pl.name AS plan_name,
  pl.price_eur AS base_price_eur,
  CASE
    WHEN p.is_founder THEN ROUND(pl.price_eur * 0.90)
    ELSE pl.price_eur
  END AS price_eur,
  pay.status AS recorded_payment_status,
  pay.paid_at,
  MIN(a.created_at) AS first_attendance_in_month,
  CASE
    WHEN pay.status = 'paid_ok' AND s.month_year > to_char(NOW() AT TIME ZONE 'Europe/Madrid', 'YYYY-MM') THEN 'ADVANCE_OK'
    WHEN pay.status = 'paid_ok' THEN 'OK'
    WHEN s.month_year > to_char(NOW() AT TIME ZONE 'Europe/Madrid', 'YYYY-MM') THEN 'FUTURE_UPCOMING'
    WHEN s.month_year < to_char(NOW() AT TIME ZONE 'Europe/Madrid', 'YYYY-MM') THEN 'PAST_DUE'
    WHEN MIN(a.created_at) IS NOT NULL AND NOW() > (MIN(a.created_at) + INTERVAL '7 days') THEN 'NOK_OVERDUE'
    WHEN MIN(a.created_at) IS NOT NULL THEN 'GRACE_7_DAYS'
    ELSE 'PENDING'
  END AS effective_status,
  pay.payment_method,
  pay.amount_eur AS paid_amount_eur,
  pay.notes AS payment_notes,
  s.plan_id
FROM public.profiles p
JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
JOIN public.plans pl ON pl.id = s.plan_id
LEFT JOIN public.payments pay ON pay.user_id = p.id AND pay.month_year = s.month_year
LEFT JOIN public.attendances a ON a.user_id = p.id AND to_char(a.attendance_date, 'YYYY-MM') = s.month_year
WHERE p.role = 'client'
GROUP BY
  p.id, p.full_name, p.status, p.is_founder, s.month_year, s.plan_id, pl.name, pl.price_eur,
  pay.status, pay.paid_at, pay.payment_method, pay.amount_eur, pay.notes;

-- ----------------------------------------------------------------------------
-- 4. "Cobrado en el mes": definición única (criterio de caja, hora de Madrid)
--    Importes en céntimos para evitar errores de redondeo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_cash_month(p_month TEXT)
RETURNS TABLE (
  total_cents BIGINT,
  cash_cents BIGINT,
  bizum_cents BIGINT,
  other_cents BIGINT,
  advance_cents BIGINT,
  payments_count INT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      ((p_month || '-01')::date)::timestamp AT TIME ZONE 'Europe/Madrid' AS start_ts,
      (((p_month || '-01')::date + INTERVAL '1 month'))::timestamp AT TIME ZONE 'Europe/Madrid' AS end_ts
  ),
  paid AS (
    SELECT pay.month_year, pay.payment_method, ROUND(pay.amount_eur * 100)::BIGINT AS cents
    FROM public.payments pay, bounds b
    WHERE pay.status = 'paid_ok'
      AND pay.paid_at >= b.start_ts
      AND pay.paid_at < b.end_ts
  )
  SELECT
    COALESCE(SUM(cents), 0)::BIGINT,
    COALESCE(SUM(cents) FILTER (WHERE payment_method = 'Efectivo'), 0)::BIGINT,
    COALESCE(SUM(cents) FILTER (WHERE payment_method = 'Bizum'), 0)::BIGINT,
    COALESCE(SUM(cents) FILTER (WHERE payment_method IS NULL OR payment_method NOT IN ('Efectivo', 'Bizum')), 0)::BIGINT,
    COALESCE(SUM(cents) FILTER (WHERE month_year > p_month), 0)::BIGINT,
    COUNT(*)::INT
  FROM paid;
$$;

GRANT EXECUTE ON FUNCTION public.finance_cash_month(TEXT) TO authenticated;
