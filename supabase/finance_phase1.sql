-- ============================================================================
-- 247 STUDIO — Finanzas · Fase 1: gastos y resultado del mes
-- Requiere finance_step0.sql. Ejecutar en Supabase -> SQL Editor -> New query
-- (idempotente: se puede repetir)
--
-- Tablas:
--   expense_categories  categorías de gasto
--   recurring_expenses  plantillas de gastos fijos (alquiler, seguros...)
--   expenses            cada gasto real: puntual u ocurrencia mensual de un fijo
--
-- Reglas:
--   - Importes en céntimos (enteros), nunca decimales flotantes.
--   - Un gasto no se borra: se anula con motivo y queda registrado quién lo anuló.
--   - Un gasto fijo solo puede registrarse una vez por mes.
--   - Solo dirección (admin) puede ver o tocar gastos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Categorías
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_fixed_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.expense_categories (slug, name, is_fixed_default, sort_order) VALUES
  ('alquiler',        'Alquiler',                        TRUE,  10),
  ('suministros',     'Suministros (luz, agua, internet)', TRUE, 20),
  ('personal',        'Profesores y personal',           TRUE,  30),
  ('seguros',         'Seguros',                         TRUE,  40),
  ('federacion',      'Federación y licencias',          FALSE, 50),
  ('material',        'Material deportivo',              FALSE, 60),
  ('marketing',       'Marketing',                       FALSE, 70),
  ('software',        'Software y comisiones',           TRUE,  80),
  ('mantenimiento',   'Mantenimiento y limpieza',        FALSE, 90),
  ('impuestos',       'Impuestos y tasas',               FALSE, 100),
  ('gestoria',        'Gestoría',                        TRUE,  110),
  ('otros',           'Otros',                           FALSE, 120)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Plantillas de gastos fijos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  concept TEXT NOT NULL CHECK (length(trim(concept)) > 0),
  supplier TEXT,
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  day_of_month INT NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  start_month TEXT NOT NULL CHECK (start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  end_month TEXT CHECK (end_month IS NULL OR end_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('Banco', 'Efectivo', 'Tarjeta', 'Bizum')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recurring_expenses_month_range CHECK (end_month IS NULL OR end_month >= start_month)
);

-- ----------------------------------------------------------------------------
-- 3. Gastos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  concept TEXT NOT NULL CHECK (length(trim(concept)) > 0),
  supplier TEXT,
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  -- IVA soportado opcional, solo como ayuda para el gestor
  vat_cents INT CHECK (vat_cents IS NULL OR (vat_cents >= 0 AND vat_cents <= amount_cents)),
  -- Fecha en que salió el dinero (criterio de caja)
  expense_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Europe/Madrid')::date),
  -- Mes al que corresponde el gasto (para fijos: el mes que cubre)
  period_month TEXT NOT NULL CHECK (period_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('Banco', 'Efectivo', 'Tarjeta', 'Bizum')),
  recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE RESTRICT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  void_reason TEXT,
  -- Anulado ⇔ con motivo (ni motivo sin anular, ni anular sin motivo)
  CONSTRAINT expenses_void_consistent CHECK (
    (voided_at IS NULL AND void_reason IS NULL)
    OR (voided_at IS NOT NULL AND void_reason IS NOT NULL AND length(trim(void_reason)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses (expense_date);
CREATE INDEX IF NOT EXISTS expenses_period_idx ON public.expenses (period_month);

-- Un gasto fijo solo una vez por mes. Si se anula, se puede volver a confirmar.
DROP INDEX IF EXISTS public.expenses_recurring_once_per_month;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_recurring_once_per_month_active
  ON public.expenses (recurring_expense_id, period_month)
  WHERE recurring_expense_id IS NOT NULL AND voided_at IS NULL;

-- ----------------------------------------------------------------------------
-- 4. Reglas de modificación
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expenses_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este gasto está anulado y no se puede modificar.' USING ERRCODE = 'P0001';
  END IF;

  -- Un gasto fijo no cambia de plantilla ni del mes que cubre
  IF OLD.recurring_expense_id IS NOT NULL AND (
       NEW.recurring_expense_id IS DISTINCT FROM OLD.recurring_expense_id
       OR NEW.period_month IS DISTINCT FROM OLD.period_month) THEN
    RAISE EXCEPTION 'Un gasto fijo no puede cambiar de mes ni de plantilla. Anúlalo y confírmalo de nuevo.'
      USING ERRCODE = 'P0001';
  END IF;
  -- Un gasto puntual no se convierte en fijo editando
  IF OLD.recurring_expense_id IS NULL AND NEW.recurring_expense_id IS NOT NULL THEN
    RAISE EXCEPTION 'Un gasto puntual no puede convertirse en fijo.' USING ERRCODE = 'P0001';
  END IF;

  -- Al anular: quién y cuándo
  IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
    NEW.voided_by := auth.uid();
    NEW.voided_at := NOW();
  END IF;

  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Al crear: la autoría la pone la base de datos y no se crean gastos ya anulados
CREATE OR REPLACE FUNCTION public.expenses_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  NEW.created_at := NOW();
  NEW.updated_at := NOW();
  NEW.voided_at := NULL;
  NEW.voided_by := NULL;
  NEW.void_reason := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expenses_insert_guard_trg ON public.expenses;
CREATE TRIGGER expenses_insert_guard_trg
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.expenses_insert_guard();

CREATE OR REPLACE FUNCTION public.recurring_expenses_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  NEW.created_at := NOW();
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recurring_expenses_insert_guard_trg ON public.recurring_expenses;
CREATE TRIGGER recurring_expenses_insert_guard_trg
  BEFORE INSERT ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.recurring_expenses_insert_guard();

DROP TRIGGER IF EXISTS expenses_guard_trg ON public.expenses;
CREATE TRIGGER expenses_guard_trg
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.expenses_guard();

CREATE OR REPLACE FUNCTION public.recurring_expenses_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recurring_expenses_touch_trg ON public.recurring_expenses;
CREATE TRIGGER recurring_expenses_touch_trg
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.recurring_expenses_touch();

-- ----------------------------------------------------------------------------
-- 5. Seguridad: solo admin. Sin políticas de DELETE (se anula, no se borra).
-- ----------------------------------------------------------------------------
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_categories_admin_read" ON public.expense_categories;
CREATE POLICY "expense_categories_admin_read" ON public.expense_categories
  FOR SELECT USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "recurring_expenses_admin_select" ON public.recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_admin_insert" ON public.recurring_expenses;
DROP POLICY IF EXISTS "recurring_expenses_admin_update" ON public.recurring_expenses;
CREATE POLICY "recurring_expenses_admin_select" ON public.recurring_expenses
  FOR SELECT USING (public.get_my_role() = 'admin');
CREATE POLICY "recurring_expenses_admin_insert" ON public.recurring_expenses
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "recurring_expenses_admin_update" ON public.recurring_expenses
  FOR UPDATE USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "expenses_admin_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_admin_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_admin_update" ON public.expenses;
CREATE POLICY "expenses_admin_select" ON public.expenses
  FOR SELECT USING (public.get_my_role() = 'admin');
CREATE POLICY "expenses_admin_insert" ON public.expenses
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "expenses_admin_update" ON public.expenses
  FOR UPDATE USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 6. Alta de un gasto fijo en una sola operación: plantilla + gasto del primer mes.
--    Si algo falla, no se guarda nada (evita plantillas duplicadas).
--    SECURITY INVOKER: se aplican las políticas RLS (solo admin).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_recurring_expense(
  p_category_id UUID,
  p_concept TEXT,
  p_amount_cents INT,
  p_day_of_month INT,
  p_start_month TEXT,
  p_payment_method TEXT,
  p_expense_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tpl UUID;
  v_exp UUID;
BEGIN
  INSERT INTO public.recurring_expenses
    (category_id, concept, amount_cents, day_of_month, start_month, payment_method)
  VALUES
    (p_category_id, p_concept, p_amount_cents, LEAST(28, GREATEST(1, p_day_of_month)), p_start_month, p_payment_method)
  RETURNING id INTO v_tpl;

  INSERT INTO public.expenses
    (category_id, concept, amount_cents, expense_date, period_month, payment_method, recurring_expense_id)
  VALUES
    (p_category_id, p_concept, p_amount_cents, p_expense_date, p_start_month, p_payment_method, v_tpl)
  RETURNING id INTO v_exp;

  RETURN v_exp;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_recurring_expense(UUID, TEXT, INT, INT, TEXT, TEXT, DATE) TO authenticated;
