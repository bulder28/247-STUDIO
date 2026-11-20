-- ============================================================================
-- 247 STUDIO — Bonos con caducidad (validez de 3 meses desde el pago)
--
-- Antes: el bono era una cuota de un mes con un contador (subscriptions.remaining_credits):
-- no pasaba al mes siguiente y "Generar mes" lo volvía a crear lleno.
-- Ahora: cada bono es una compra con su caducidad (class_packs) y cada clase gastada
-- queda registrada (class_pack_uses).
--
--   · Al cobrar un plan de bono (Bono 8 clases) se crea el bono: empieza el día del
--     pago y caduca a los 3 meses. Si se deshace el cobro y no se ha usado, se borra.
--   · Al pasar lista se descuenta 1 clase del bono en vigor (el que caduca antes);
--     al desmarcar, se devuelve.
--   · Cuando quedan 2 clases, el alumno recibe un aviso en su app.
--   · El admin puede dar de alta bonos a mano (saldo inicial) y ampliar la caducidad.
--   · Clase suelta y Clase particular dejan de ser bonos: son un pago de un día.
--
-- Ejecutar en Supabase -> SQL Editor. Idempotente.
-- ============================================================================

-- 1) Tarifas de pago único (no se copian al generar el mes siguiente)
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS is_one_off BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.plans
   SET is_class_pack = FALSE, is_one_off = TRUE
 WHERE name ILIKE 'Clase suelta%' OR name ILIKE 'Clase particular%';

-- El bono tampoco se renueva solo cada mes: se compra cuando hace falta
UPDATE public.plans SET is_one_off = TRUE WHERE is_class_pack = TRUE;

-- 2) Bonos
CREATE TABLE IF NOT EXISTS public.class_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  total_credits INT NOT NULL CHECK (total_credits > 0),
  remaining_credits INT NOT NULL CHECK (remaining_credits >= 0),
  starts_on DATE NOT NULL,
  expires_on DATE NOT NULL,
  payment_id UUID UNIQUE REFERENCES public.payments(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (remaining_credits <= total_credits),
  CHECK (expires_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS class_packs_user_idx ON public.class_packs (user_id, expires_on);

CREATE TABLE IF NOT EXISTS public.class_pack_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.class_packs(id) ON DELETE CASCADE,
  attendance_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  used_on DATE NOT NULL,
  schedule_class_id UUID REFERENCES public.schedule_classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS class_pack_uses_pack_idx ON public.class_pack_uses (pack_id, used_on DESC);

ALTER TABLE public.class_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_pack_uses ENABLE ROW LEVEL SECURITY;

-- El alumno ve los suyos; dirección y profesores ven todos. Solo el admin los edita a mano.
DROP POLICY IF EXISTS "packs_select" ON public.class_packs;
CREATE POLICY "packs_select" ON public.class_packs
  FOR SELECT USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'coach'));
DROP POLICY IF EXISTS "packs_admin_write" ON public.class_packs;
CREATE POLICY "packs_admin_write" ON public.class_packs
  FOR ALL USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "pack_uses_select" ON public.class_pack_uses;
CREATE POLICY "pack_uses_select" ON public.class_pack_uses
  FOR SELECT USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'coach'));
-- Sin políticas de escritura: solo los triggers (SECURITY DEFINER) registran usos.

-- 3) Pasar lista descuenta del bono en vigor (y lo devuelve al desmarcar)
CREATE OR REPLACE FUNCTION public.class_pack_on_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack public.class_packs%ROWTYPE;
  v_use public.class_pack_uses%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    SELECT * INTO v_pack FROM public.class_packs
     WHERE user_id = NEW.user_id
       AND remaining_credits > 0
       AND NEW.attendance_date BETWEEN starts_on AND expires_on
     ORDER BY expires_on, created_at
     LIMIT 1
     FOR UPDATE;
    IF FOUND THEN
      UPDATE public.class_packs SET remaining_credits = remaining_credits - 1 WHERE id = v_pack.id;
      INSERT INTO public.class_pack_uses (pack_id, attendance_id, user_id, used_on, schedule_class_id)
      VALUES (v_pack.id, NEW.id, NEW.user_id, NEW.attendance_date, NEW.schedule_class_id)
      ON CONFLICT (attendance_id) DO NOTHING;
      IF v_pack.remaining_credits - 1 = 2 THEN
        INSERT INTO public.notices (target_user_id, notice_type, title, message)
        VALUES (
          NEW.user_id, 'payment', 'Te quedan 2 clases de tu bono',
          'Tu bono caduca el ' || to_char(v_pack.expires_on, 'DD/MM/YYYY') ||
          '. Cuando lo gastes, renuévalo en recepción.'
        );
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL THEN
    SELECT * INTO v_use FROM public.class_pack_uses WHERE attendance_id = OLD.id;
    IF FOUND THEN
      UPDATE public.class_packs
         SET remaining_credits = LEAST(total_credits, remaining_credits + 1)
       WHERE id = v_use.pack_id;
      DELETE FROM public.class_pack_uses WHERE id = v_use.id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- El contador mensual antiguo deja de usarse
DROP TRIGGER IF EXISTS trg_sync_pack_credits ON public.attendances;
DROP TRIGGER IF EXISTS trg_class_pack_on_attendance ON public.attendances;
CREATE TRIGGER trg_class_pack_on_attendance
  AFTER INSERT OR DELETE ON public.attendances
  FOR EACH ROW EXECUTE FUNCTION public.class_pack_on_attendance();

-- 4) Cobrar un bono crea el bono; deshacer el cobro lo borra si no se ha usado
CREATE OR REPLACE FUNCTION public.class_pack_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.plans%ROWTYPE;
  v_start DATE;
BEGIN
  IF NEW.status = 'paid_ok' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid_ok') THEN
    SELECT pl.* INTO v_plan
      FROM public.subscriptions s JOIN public.plans pl ON pl.id = s.plan_id
     WHERE s.user_id = NEW.user_id AND s.month_year = NEW.month_year AND s.status = 'active'
     LIMIT 1;
    IF FOUND AND v_plan.is_class_pack AND COALESCE(v_plan.pack_credits, 0) > 0
       AND NOT EXISTS (SELECT 1 FROM public.class_packs WHERE payment_id = NEW.id) THEN
      v_start := (COALESCE(NEW.paid_at, NOW()) AT TIME ZONE 'Europe/Madrid')::date;
      INSERT INTO public.class_packs
        (user_id, plan_id, total_credits, remaining_credits, starts_on, expires_on, payment_id, created_by)
      VALUES
        (NEW.user_id, v_plan.id, v_plan.pack_credits, v_plan.pack_credits,
         v_start, (v_start + INTERVAL '3 months')::date, NEW.id, auth.uid());
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'paid_ok' AND NEW.status IS DISTINCT FROM 'paid_ok' THEN
    DELETE FROM public.class_packs p
     WHERE p.payment_id = NEW.id
       AND NOT EXISTS (SELECT 1 FROM public.class_pack_uses u WHERE u.pack_id = p.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_pack_on_payment ON public.payments;
CREATE TRIGGER trg_class_pack_on_payment
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.class_pack_on_payment();
