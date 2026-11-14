-- ============================================================================
-- 247 STUDIO — Actualización de Tarifas Oficiales (247studiobjj.com/pricing)
-- Ejecutar en Supabase -> SQL Editor -> New query
-- Actualiza precios existentes sin romper suscripciones ni pagos ya creados
-- y añade las tarifas nuevas (MMA + Lucha, Bono 8 clases).
-- ============================================================================

-- 1. Actualizar precios de tarifas existentes
UPDATE public.plans SET price_eur = 69,  promo_text = 'Acceso a Open Mat incluido'          WHERE name = 'BJJ & Grappling';
UPDATE public.plans SET price_eur = 59,  promo_text = 'Clases ilimitadas'                   WHERE name = 'MMA';
UPDATE public.plans SET price_eur = 42,  promo_text = 'Wrestling · 2-3 días/semana'         WHERE name = 'Lucha';
UPDATE public.plans SET price_eur = 35,  promo_text = 'Grupo dedicado'                      WHERE name = 'BJJ Femenino';
UPDATE public.plans SET price_eur = 42                                                      WHERE name = 'Kids 1 (+7 años)';
UPDATE public.plans SET price_eur = 42                                                      WHERE name = 'Kids 2 (3 a 6 años)';
UPDATE public.plans SET price_eur = 100, promo_text = 'Combo más popular'                   WHERE name = 'BJJ & Grappling + MMA';
UPDATE public.plans SET price_eur = 94,  promo_text = 'BJJ + Lucha · Sin permanencia'       WHERE name = 'BJJ & Grappling + Lucha';
UPDATE public.plans SET price_eur = 125, promo_text = 'Todas las modalidades + Open Mat'    WHERE name = 'Pack Unlimited';
UPDATE public.plans SET price_eur = 15,  promo_text = 'Pago por clase'                      WHERE name = 'Bono Clase Suelta';

-- 2. Insertar tarifas adicionales del catálogo oficial
INSERT INTO public.plans (name, price_eur, is_class_pack, pack_credits, promo_text, is_active) VALUES
  ('MMA + Lucha',   79, false, null, 'Striking + Wrestling · Sin permanencia', true),
  ('Bono 8 clases', 70, true,  8,    'Ideal para visitas / sin permanencia',   true)
ON CONFLICT (name) DO UPDATE SET
  price_eur     = EXCLUDED.price_eur,
  is_class_pack = EXCLUDED.is_class_pack,
  pack_credits  = EXCLUDED.pack_credits,
  promo_text    = EXCLUDED.promo_text,
  is_active     = true;

-- 3. Vincular disciplinas a las nuevas tarifas
INSERT INTO public.plan_disciplines (plan_id, discipline_id)
SELECT p.id, d.id FROM public.plans p, public.disciplines d
WHERE (p.name = 'MMA + Lucha'   AND d.slug IN ('mma', 'lucha'))
   OR (p.name = 'Bono 8 clases' AND d.slug IN ('bjj-grappling', 'mma', 'lucha'))
ON CONFLICT DO NOTHING;

