-- ============================================================================
-- 247 STUDIO — Parche de Blindaje de Seguridad (ejecutar sobre BD ya creada)
-- ============================================================================

-- 1. Helper para verificar que el usuario NO está dado de baja ('inactive')
CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role IN ('admin', 'coach') OR status IN ('active', 'paused'))
  );
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

REVOKE ALL ON FUNCTION public.is_active_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_member() TO authenticated;

-- 2. Bloquear escalada de privilegios en 'profiles' (un alumno no puede cambiar su role, status, cinturón ni tutor)
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.belt IS DISTINCT FROM OLD.belt
       OR NEW.belt_stripes IS DISTINCT FROM OLD.belt_stripes
       OR NEW.first_training_at IS DISTINCT FROM OLD.first_training_at
       OR NEW.guardian_user_id IS DISTINCT FROM OLD.guardian_user_id
       OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'No tienes permiso para modificar campos administrativos del perfil.';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Hacer que la vista de pagos respete el RLS de las tablas base
ALTER VIEW public.v_monthly_payment_status SET (security_invoker = true);

-- 4. Cortar acceso a usuarios en estado 'inactive' (baja) en catálogos, foro, media y chat
DROP POLICY IF EXISTS "disciplines_read" ON public.disciplines;
CREATE POLICY "disciplines_read" ON public.disciplines FOR SELECT USING (public.is_active_member());

DROP POLICY IF EXISTS "plans_read" ON public.plans;
CREATE POLICY "plans_read" ON public.plans FOR SELECT USING (public.is_active_member());

DROP POLICY IF EXISTS "plan_disc_read" ON public.plan_disciplines;
CREATE POLICY "plan_disc_read" ON public.plan_disciplines FOR SELECT USING (public.is_active_member());

DROP POLICY IF EXISTS "schedule_read" ON public.schedule_classes;
CREATE POLICY "schedule_read" ON public.schedule_classes FOR SELECT USING (public.is_active_member());

DROP POLICY IF EXISTS "docs_read" ON public.document_templates;
CREATE POLICY "docs_read" ON public.document_templates FOR SELECT USING (public.is_active_member());

DROP POLICY IF EXISTS "events_read" ON public.events;
CREATE POLICY "events_read" ON public.events FOR SELECT USING (public.is_active_member());

DROP POLICY IF EXISTS "faqs_read" ON public.faqs;
CREATE POLICY "faqs_read" ON public.faqs FOR SELECT USING (public.is_active_member());

DROP POLICY IF EXISTS "announcements_read" ON public.announcements;
CREATE POLICY "announcements_read" ON public.announcements FOR SELECT USING (public.is_active_member());

DROP POLICY IF EXISTS "media_read" ON public.media_photos;
CREATE POLICY "media_read" ON public.media_photos FOR SELECT USING (public.is_active_member());

-- 5. Bloquear spoofing en notice_reads y permitir firmas de tutores a hijos menores
DROP POLICY IF EXISTS "notice_reads_own" ON public.notice_reads;
CREATE POLICY "notice_reads_own" ON public.notice_reads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "signatures_select" ON public.document_signatures;
CREATE POLICY "signatures_select" ON public.document_signatures FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.guardian_user_id = auth.uid())
  OR public.get_my_role() = 'admin'
);

DROP POLICY IF EXISTS "signatures_insert_own" ON public.document_signatures;
CREATE POLICY "signatures_insert_own" ON public.document_signatures FOR INSERT WITH CHECK (
  public.is_active_member() AND (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.guardian_user_id = auth.uid())
    OR public.get_my_role() = 'admin'
  )
);

-- 6. Chat privado: solo activos pueden enviar y nadie puede alterar mensajes pasados
DROP POLICY IF EXISTS "chat_insert" ON public.private_messages;
CREATE POLICY "chat_insert" ON public.private_messages FOR INSERT WITH CHECK (
  public.is_active_member() AND (
    (sender_id = auth.uid() AND client_id = auth.uid())
    OR (sender_id = auth.uid() AND public.get_my_role() = 'admin')
  )
);

