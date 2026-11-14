-- ============================================================================
-- 247 STUDIO PWA — Esquema Completo PostgreSQL / Supabase
-- Roles: 'client' (Alumno), 'coach' (Profesor), 'admin' (Dueño)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TIPOS ENUM
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('client', 'coach', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('active', 'paused', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('paid_ok', 'pending_nok');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. PERFILES (vinculado a auth.users; soporta tutor_id para hermanos en Kids)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  status member_status NOT NULL DEFAULT 'active',
  full_name TEXT NOT NULL,
  alias TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  avatar_url TEXT,
  belt TEXT DEFAULT 'Blanco',
  belt_stripes INT DEFAULT 0 CHECK (belt_stripes BETWEEN 0 AND 4),
  weight_category TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_notes TEXT,
  personal_goals TEXT,
  guardian_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_training_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. FICHA RESUMEN DEL LUCHADOR (Slide 4)
CREATE TABLE IF NOT EXISTS public.fighter_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tecnica INT NOT NULL DEFAULT 50 CHECK (tecnica BETWEEN 0 AND 100),
  fuerza INT NOT NULL DEFAULT 50 CHECK (fuerza BETWEEN 0 AND 100),
  elasticidad INT NOT NULL DEFAULT 50 CHECK (elasticidad BETWEEN 0 AND 100),
  guardia INT NOT NULL DEFAULT 50 CHECK (guardia BETWEEN 0 AND 100),
  pase INT NOT NULL DEFAULT 50 CHECK (pase BETWEEN 0 AND 100),
  derribos INT NOT NULL DEFAULT 50 CHECK (derribos BETWEEN 0 AND 100),
  leglocks INT NOT NULL DEFAULT 50 CHECK (leglocks BETWEEN 0 AND 100),
  finalizacion INT NOT NULL DEFAULT 50 CHECK (finalizacion BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DISCIPLINAS
CREATE TABLE IF NOT EXISTS public.disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- 5. TARIFAS / PLANES Y RELACIÓN CON DISCIPLINAS (Slides 7 y 18)
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_eur NUMERIC(8,2) NOT NULL DEFAULT 0,
  is_class_pack BOOLEAN NOT NULL DEFAULT FALSE, -- true para Bono Clase Suelta
  pack_credits INT,
  promo_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plan_disciplines (
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, discipline_id)
);

-- 6. HORARIOS SEMANALES (Slides 8 y 19)
CREATE TABLE IF NOT EXISTS public.schedule_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Lunes ... 5=Viernes
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 7. SUSCRIPCIONES MENSUALES (qué plan tiene cada alumno en cada mes)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  month_year TEXT NOT NULL, -- Formato 'YYYY-MM', ej. '2026-11'
  remaining_credits INT, -- Solo si is_class_pack = true
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month_year)
);

-- 8. PAGOS / SEGUIMIENTO MENSUAL (Slides 6, 15, 20, 21)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  month_year TEXT NOT NULL,
  amount_eur NUMERIC(8,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending_nok',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month_year)
);

-- 9. ASISTENCIAS (Pasar lista por el Coach/Admin)
CREATE TABLE IF NOT EXISTS public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_name TEXT,
  schedule_class_id UUID NOT NULL REFERENCES public.schedule_classes(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE RESTRICT,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, schedule_class_id, attendance_date)
);

-- 10. DOCUMENTACIÓN Y FIRMAS EN PANTALLA (Slides 5 y 17)
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  requires_signature BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  template_version INT NOT NULL,
  signature_image_url TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_dni TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, template_id, template_version)
);

-- 11. COMUNICACIÓN: FORO (solo lectura alumnos), AVISOS, CHAT PRIVADO, MEDIA, EVENTOS, FAQS
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = para todos
  notice_type TEXT NOT NULL DEFAULT 'general' CHECK (notice_type IN ('payment', 'tariff_change', 'schedule_change', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notice_reads (
  notice_id UUID NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (notice_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.media_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline_id UUID REFERENCES public.disciplines(id) ON DELETE SET NULL,
  title TEXT,
  image_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'Seminario',
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- FUNCIONES AUXILIARES Y REGLA DE LOS 7 DÍAS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Cuando se pasa lista por primera vez a un alumno, fija first_training_at
CREATE OR REPLACE FUNCTION public.set_first_training_on_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET first_training_at = COALESCE(first_training_at, NEW.created_at)
    WHERE id = NEW.user_id AND first_training_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_first_training ON public.attendances;
CREATE TRIGGER trg_set_first_training
  AFTER INSERT ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_first_training_on_attendance();

-- Vista para saber el estado de pago real (regla 7 días + vencidos + adelantados)
CREATE OR REPLACE VIEW public.v_monthly_payment_status AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.status AS member_status,
  s.month_year,
  pl.name AS plan_name,
  pl.price_eur,
  pay.status AS recorded_payment_status,
  pay.paid_at,
  MIN(a.created_at) AS first_attendance_in_month,
  CASE
    WHEN pay.status = 'paid_ok' AND s.month_year > to_char(CURRENT_DATE, 'YYYY-MM') THEN 'ADVANCE_OK'
    WHEN pay.status = 'paid_ok' THEN 'OK'
    WHEN s.month_year > to_char(CURRENT_DATE, 'YYYY-MM') THEN 'FUTURE_UPCOMING'
    WHEN s.month_year < to_char(CURRENT_DATE, 'YYYY-MM') THEN 'PAST_DUE'
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
  p.id, p.full_name, p.status, s.month_year, s.plan_id, pl.name, pl.price_eur,
  pay.status, pay.paid_at, pay.payment_method, pay.amount_eur, pay.notes;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fighter_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- PROFILES: cada uno ve el suyo; admin ve todo; coach ve clientes activos/pausados (sin pagos)
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  id = auth.uid()
  OR guardian_user_id = auth.uid()
  OR public.get_my_role() = 'admin'
  OR (public.get_my_role() = 'coach' AND status IN ('active', 'paused'))
);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

-- FIGHTER STATS
CREATE POLICY "stats_select" ON public.fighter_stats FOR SELECT USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'coach'));
CREATE POLICY "stats_admin_all" ON public.fighter_stats FOR ALL USING (public.get_my_role() = 'admin');

-- CATÁLOGOS PÚBLICOS PARA AUTENTICADOS (Disciplinas, Tarifas, Horarios, Documentos, Eventos, FAQs)
CREATE POLICY "disciplines_read" ON public.disciplines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "disciplines_admin" ON public.disciplines FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "plans_read" ON public.plans FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "plans_admin" ON public.plans FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "plan_disc_read" ON public.plan_disciplines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "plan_disc_admin" ON public.plan_disciplines FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "schedule_read" ON public.schedule_classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "schedule_admin" ON public.schedule_classes FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "docs_read" ON public.document_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "docs_admin" ON public.document_templates FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "events_read" ON public.events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "events_admin" ON public.events FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "faqs_read" ON public.faqs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "faqs_admin" ON public.faqs FOR ALL USING (public.get_my_role() = 'admin');

-- SUSCRIPCIONES: alumno ve la suya; coach ve quién está activo para pasar lista; admin ve todo
CREATE POLICY "subs_select" ON public.subscriptions FOR SELECT USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'coach'));
CREATE POLICY "subs_admin" ON public.subscriptions FOR ALL USING (public.get_my_role() = 'admin');

-- PAGOS: SOLO el propio alumno o el ADMIN (Coach NO tiene acceso)
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (user_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "payments_admin" ON public.payments FOR ALL USING (public.get_my_role() = 'admin');

-- ASISTENCIAS: alumno ve las suyas; coach y admin gestionan pasar lista
CREATE POLICY "attendances_select" ON public.attendances FOR SELECT USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'coach'));
CREATE POLICY "attendances_coach_admin" ON public.attendances FOR ALL USING (public.get_my_role() IN ('admin', 'coach'));

-- FIRMAS: alumno ve y crea las suyas; admin ve todas
CREATE POLICY "signatures_select" ON public.document_signatures FOR SELECT USING (user_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "signatures_insert_own" ON public.document_signatures FOR INSERT WITH CHECK (user_id = auth.uid() OR public.get_my_role() = 'admin');

-- FORO Y MEDIA: leen activos/pausados/staff; escriben admin y coach
CREATE POLICY "announcements_read" ON public.announcements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "announcements_write" ON public.announcements FOR ALL USING (public.get_my_role() IN ('admin', 'coach'));

CREATE POLICY "media_read" ON public.media_photos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "media_write" ON public.media_photos FOR ALL USING (public.get_my_role() IN ('admin', 'coach'));

-- AVISOS Y LECTURAS
CREATE POLICY "notices_select" ON public.notices FOR SELECT USING (target_user_id IS NULL OR target_user_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "notices_admin" ON public.notices FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "notice_reads_own" ON public.notice_reads FOR ALL USING (user_id = auth.uid());

-- CHAT PRIVADO (Cliente <-> Admin)
CREATE POLICY "chat_select" ON public.private_messages FOR SELECT USING (client_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "chat_insert" ON public.private_messages FOR INSERT WITH CHECK (
  (sender_id = auth.uid() AND client_id = auth.uid())
  OR (sender_id = auth.uid() AND public.get_my_role() = 'admin')
);

-- ============================================================================
-- DATOS INICIALES (Disciplinas y Tarifas del PowerPoint Slide 7)
-- ============================================================================
INSERT INTO public.disciplines (name, slug, sort_order) VALUES
  ('BJJ & Grappling', 'bjj-grappling', 1),
  ('MMA', 'mma', 2),
  ('Lucha', 'lucha', 3),
  ('BJJ Femenino', 'bjj-femenino', 4),
  ('Kids 1', 'kids-1', 5),
  ('Kids 2', 'kids-2', 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.document_templates (slug, title, body_text) VALUES
  ('derechos-imagen-adulto', 'Derechos de Imagen (Mayores de edad)', 'Autorizo a 247 STUDIO a captar y publicar fotografías o vídeos de entrenamientos y eventos con fines divulgativos de la academia.'),
  ('derechos-imagen-menor', 'Derechos de Imagen (Menores de edad)', 'Como padre/madre o tutor legal, autorizo a 247 STUDIO la captación de imágenes del menor durante las clases y eventos deportivos.'),
  ('normas-tatami', 'Normas del Tatami y Condiciones de la Escuela', 'Acepto las normas de higiene, puntualidad, respeto al compañero y condiciones de mensualidad de 247 STUDIO.')
ON CONFLICT (slug) DO NOTHING;

