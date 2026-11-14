-- ============================================================================
-- 247 STUDIO — Carga Inicial de Horario Oficial y Tarifas (Slide 7 y Slide 8)
-- Ejecutar en Supabase -> SQL Editor -> New query
-- ============================================================================

-- 1. TARIFAS OFICIALES
INSERT INTO public.plans (name, price_eur, is_class_pack, pack_credits, promo_text, is_active) VALUES
  ('BJJ & Grappling', 60, false, null, 'Acceso a Open Mat incluido', true),
  ('MMA', 60, false, null, null, true),
  ('Lucha', 50, false, null, null, true),
  ('BJJ Femenino', 50, false, null, null, true),
  ('Kids 1 (+7 años)', 45, false, null, null, true),
  ('Kids 2 (3 a 6 años)', 40, false, null, null, true),
  ('BJJ & Grappling + MMA', 80, false, null, 'Combo más popular', true),
  ('BJJ & Grappling + Lucha', 75, false, null, null, true),
  ('Pack Unlimited', 95, false, null, 'Todas las disciplinas + Open Mat', true),
  ('Bono Clase Suelta', 15, true, 1, 'Pago por sesión', true)
ON CONFLICT (name) DO NOTHING;

-- 2. VINCULAR DISCIPLINAS A CADA TARIFA
INSERT INTO public.plan_disciplines (plan_id, discipline_id)
SELECT p.id, d.id FROM public.plans p, public.disciplines d
WHERE (p.name = 'BJJ & Grappling' AND d.slug = 'bjj-grappling')
   OR (p.name = 'MMA' AND d.slug = 'mma')
   OR (p.name = 'Lucha' AND d.slug = 'lucha')
   OR (p.name = 'BJJ Femenino' AND d.slug = 'bjj-femenino')
   OR (p.name = 'Kids 1 (+7 años)' AND d.slug = 'kids-1')
   OR (p.name = 'Kids 2 (3 a 6 años)' AND d.slug = 'kids-2')
   OR (p.name = 'BJJ & Grappling + MMA' AND d.slug IN ('bjj-grappling', 'mma'))
   OR (p.name = 'BJJ & Grappling + Lucha' AND d.slug IN ('bjj-grappling', 'lucha'))
   OR (p.name = 'Pack Unlimited')
   OR (p.name = 'Bono Clase Suelta' AND d.slug IN ('bjj-grappling', 'mma', 'lucha'))
ON CONFLICT DO NOTHING;

-- 3. HORARIO SEMANAL OFICIAL (Lunes a Viernes — Slide 8)
INSERT INTO public.schedule_classes (day_of_week, start_time, end_time, discipline_id, title, coach_name)
SELECT v.day_of_week, v.start_time::time, v.end_time::time, d.id, v.title, v.coach_name
FROM (VALUES
  -- Mañanas (10:00 - 11:30)
  (1, '10:00', '11:30', 'bjj-grappling', 'GI (BJJ)', 'Mario / David'),
  (3, '10:00', '11:30', 'bjj-grappling', 'GRAPPLING', 'Mario / David'),
  (5, '10:00', '11:30', 'bjj-grappling', 'GRAPPLING', 'Mario / David'),

  -- Tardes 17:30 - 18:30 (Kids)
  (1, '17:30', '18:30', 'kids-1', 'KIDS 1 (+7 años)', 'Mario / David'),
  (2, '17:30', '18:30', 'kids-2', 'KIDS 2 (3-6 años)', 'Mario / David'),
  (3, '17:30', '18:30', 'kids-1', 'KIDS 1 (+7 años)', 'Mario / David'),
  (4, '17:30', '18:30', 'kids-2', 'KIDS 2 (3-6 años)', 'Mario / David'),
  (5, '17:30', '18:30', 'kids-1', 'KIDS 1 (+7 años)', 'Mario / David'),

  -- Tardes 18:30 - 19:30 (MMA / BJJ Femenino)
  (1, '18:30', '19:30', 'mma', 'MMA', 'Coach MMA'),
  (2, '18:30', '19:30', 'bjj-femenino', 'BJJ FEMENINO', 'Coach BJJ'),
  (3, '18:30', '19:30', 'mma', 'MMA', 'Coach MMA'),
  (4, '18:30', '19:30', 'bjj-femenino', 'BJJ FEMENINO', 'Coach BJJ'),
  (5, '18:30', '19:30', 'mma', 'MMA', 'Coach MMA'),

  -- Tardes 19:30 - 20:30 (GI / Grappling / Comp)
  (1, '19:30', '20:30', 'bjj-grappling', 'GI (BJJ)', 'Mario / David'),
  (2, '19:30', '20:30', 'bjj-grappling', 'GRAPPLING', 'Mario / David'),
  (3, '19:30', '20:30', 'bjj-grappling', 'GI (BJJ)', 'Mario / David'),
  (4, '19:30', '20:30', 'bjj-grappling', 'GRAPPLING', 'Mario / David'),
  (5, '19:30', '20:30', 'bjj-grappling', 'COMPETICIÓN / CLÁSICO', 'Mario / David'),

  -- Noches 20:30 - 21:30 (Grappling / Lucha / Sparring / Open Mat)
  (1, '20:30', '21:30', 'bjj-grappling', 'GRAPPLING', 'Mario / David'),
  (2, '20:30', '21:30', 'lucha', 'LUCHA (WRESTLING)', 'Coach Lucha'),
  (3, '20:30', '21:30', 'bjj-grappling', 'GI SPARRING', 'Mario / David'),
  (4, '20:30', '21:30', 'lucha', 'LUCHA (WRESTLING)', 'Coach Lucha'),
  (5, '20:30', '21:30', 'bjj-grappling', 'OPEN MAT', 'Mario / David')
) AS v(day_of_week, start_time, end_time, slug, title, coach_name)
JOIN public.disciplines d ON d.slug = v.slug;

