-- ============================================================================
-- 247 STUDIO — Catálogo Oficial de Tarifas (PVP STD / PVP SF / PVP FAM)
-- Ejecutar en Supabase -> SQL Editor -> New query
-- Idempotente: conserva los plan_id existentes para no romper suscripciones ni pagos.
-- ============================================================================

-- 1. Añadir columnas para código de producto y precios explícitos SF y Familiar
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS product_code TEXT,
  ADD COLUMN IF NOT EXISTS sf_price_eur NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS family_price_eur NUMERIC(8,2);

-- 2. Renombrar tarifas previas manteniendo su UUID (solo si no existe ya el nombre destino)
DO $$
DECLARE
  pairs CONSTANT TEXT[][] := ARRAY[
    ARRAY['BJJ & Grappling',         'BJJ Gi | NoGi'],
    ARRAY['Kids 1 (+7 años)',        'BJJ Kids 1 (7 a 14 años)'],
    ARRAY['Kids 2 (3 a 6 años)',     'BJJ Kids 2 (3 a 6 años)'],
    ARRAY['BJJ & Grappling + Lucha', 'BJJ Gi | NoGi + Lucha'],
    ARRAY['BJJ & Grappling + MMA',   'BJJ Gi | NoGi + MMA'],
    ARRAY['Pack Unlimited',          'Pack Unlimitted'],
    ARRAY['Bono Clase Suelta',       'Clase suelta / Utilización de la instalación 1 día']
  ];
  i INT;
BEGIN
  FOR i IN 1..array_length(pairs, 1) LOOP
    IF EXISTS (SELECT 1 FROM public.plans WHERE name = pairs[i][1])
       AND NOT EXISTS (SELECT 1 FROM public.plans WHERE name = pairs[i][2]) THEN
      UPDATE public.plans SET name = pairs[i][2] WHERE name = pairs[i][1];
    END IF;
  END LOOP;
END $$;

-- 3. Insertar o actualizar los 19 productos oficiales del catálogo
INSERT INTO public.plans (
  product_code, name, price_eur, sf_price_eur, family_price_eur,
  is_class_pack, pack_credits, promo_text, is_active
) VALUES
  ('247s_01', 'BJJ Gi | NoGi',                                      69,  62,  62,   false, null, 'Acceso a Open Mat incluido',         true),
  ('247s_02', 'BJJ Kids 1 (7 a 14 años)',                           55,  50,  50,   false, null, 'Infantil 7 a 14 años',               true),
  ('247s_03', 'BJJ Kids 2 (3 a 6 años)',                            45,  40,  40,   false, null, 'Infantil 3 a 6 años',                true),
  ('247s_04', 'BJJ Femenino',                                       45,  40,  40,   false, null, 'Grupo dedicado',                     true),
  ('247s_05', 'Lucha',                                              45,  40,  40,   false, null, 'Wrestling · 2-3 días/semana',        true),
  ('247s_06', 'MMA',                                                59,  59,  54,   false, null, 'Clases ilimitadas',                  true),
  ('247s_07', 'BJJ Gi | NoGi + Lucha',                              94,  87,  87,   false, null, 'BJJ + Lucha · Sin permanencia',      true),
  ('247s_08', 'BJJ Gi | NoGi + MMA',                                100, 93,  93,   false, null, 'Combo más popular',                  true),
  ('247s_09', 'MMA + Lucha',                                        79,  79,  72,   false, null, 'Striking + Wrestling · Sin permanencia', true),
  ('247s_10', 'Pack Unlimitted',                                    125, 118, 118,  false, null, 'Todas las modalidades + Open Mat',   true),
  ('247s_11', 'Bono 8 clases',                                      70,  63,  null, true,  8,    'Ideal para visitas / sin permanencia', true),
  ('247s_12', 'Clase suelta / Utilización de la instalación 1 día', 15,  15,  null, true,  1,    'Pago por día / clase suelta',        true),
  ('247s_13', 'Clase particular',                                   50,  50,  null, true,  1,    'Sesión privada 1 a 1',               true),
  ('247s_14', 'Medio mes BJJ Gi | NoGi',                            39,  39,  null, false, null, 'Quincena (medio mes)',               true),
  ('247s_15', 'Medio mes Kids',                                     39,  39,  null, false, null, 'Quincena (medio mes)',               true),
  ('247s_16', 'Medio mes Lucha',                                    39,  39,  null, false, null, 'Quincena (medio mes)',               true),
  ('247s_17', 'Medio mes MMA',                                      39,  39,  null, false, null, 'Quincena (medio mes)',               true),
  ('247s_18', 'Entreno 1 Semana',                                   30,  30,  null, false, null, 'Pase semanal (7 días)',              true),
  ('247s_19', 'Otros / especiales',                                 0,   0,   null, false, null, 'Importe personalizado',              true)
ON CONFLICT (name) DO UPDATE SET
  product_code     = EXCLUDED.product_code,
  price_eur        = EXCLUDED.price_eur,
  sf_price_eur     = EXCLUDED.sf_price_eur,
  family_price_eur = EXCLUDED.family_price_eur,
  is_class_pack    = EXCLUDED.is_class_pack,
  pack_credits     = EXCLUDED.pack_credits,
  promo_text       = EXCLUDED.promo_text,
  is_active        = true;

-- 4. Vincular disciplinas a las tarifas nuevas y actualizadas
INSERT INTO public.plan_disciplines (plan_id, discipline_id)
SELECT p.id, d.id FROM public.plans p, public.disciplines d
WHERE (p.product_code = '247s_01' AND d.slug = 'bjj-grappling')
   OR (p.product_code = '247s_02' AND d.slug = 'kids-1')
   OR (p.product_code = '247s_03' AND d.slug = 'kids-2')
   OR (p.product_code = '247s_04' AND d.slug = 'bjj-femenino')
   OR (p.product_code = '247s_05' AND d.slug = 'lucha')
   OR (p.product_code = '247s_06' AND d.slug = 'mma')
   OR (p.product_code = '247s_07' AND d.slug IN ('bjj-grappling', 'lucha'))
   OR (p.product_code = '247s_08' AND d.slug IN ('bjj-grappling', 'mma'))
   OR (p.product_code = '247s_09' AND d.slug IN ('mma', 'lucha'))
   OR (p.product_code = '247s_10')
   OR (p.product_code = '247s_11' AND d.slug IN ('bjj-grappling', 'mma', 'lucha'))
   OR (p.product_code = '247s_12')
   OR (p.product_code = '247s_13')
   OR (p.product_code = '247s_14' AND d.slug = 'bjj-grappling')
   OR (p.product_code = '247s_15' AND d.slug IN ('kids-1', 'kids-2'))
   OR (p.product_code = '247s_16' AND d.slug = 'lucha')
   OR (p.product_code = '247s_17' AND d.slug = 'mma')
   OR (p.product_code = '247s_18')
ON CONFLICT DO NOTHING;

-- 5. Actualizar la vista de pagos mensuales para usar sf_price_eur explícito y exponer family_price_eur
DROP VIEW IF EXISTS public.v_monthly_payment_status;

CREATE VIEW public.v_monthly_payment_status
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
    WHEN p.is_founder THEN COALESCE(pl.sf_price_eur, ROUND(pl.price_eur * 0.90))
    ELSE pl.price_eur
  END AS price_eur,
  pl.sf_price_eur,
  pl.family_price_eur,
  pl.product_code,
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
  p.id, p.full_name, p.status, p.is_founder, s.month_year, pl.name, pl.price_eur,
  pl.sf_price_eur, pl.family_price_eur, pl.product_code,
  pay.status, pay.paid_at, pay.payment_method, pay.amount_eur, pay.notes, s.plan_id;
