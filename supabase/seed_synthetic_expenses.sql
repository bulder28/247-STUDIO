-- ============================================================================
-- 247 STUDIO — Gastos sintéticos (3 meses) para probar Finanzas
-- Requiere finance_phase1.sql. Ejecutar en Supabase -> SQL Editor -> New query
--
-- - Todo lo creado lleva supplier = 'Sintético' (plantillas y gastos).
-- - Se puede repetir: primero borra lo sintético anterior.
-- - Para borrarlo: cleanup_synthetic.sql (o el bloque de borrado del principio).
--
-- Meses: los dos anteriores con todos los fijos pagados + puntuales; el actual
-- con unos fijos ya pagados y otros pendientes de confirmar (sueldos, gestoría,
-- seguros), para ver el aviso de "fijos por confirmar".
-- ============================================================================

DO $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Europe/Madrid')::date;
  v_month_start DATE := date_trunc('month', v_today)::date;
  v_months TEXT[] := ARRAY[
    to_char(v_month_start - INTERVAL '2 months', 'YYYY-MM'),
    to_char(v_month_start - INTERVAL '1 month', 'YYYY-MM'),
    to_char(v_month_start, 'YYYY-MM')
  ];
  v_cur TEXT := to_char(v_month_start, 'YYYY-MM');
  m TEXT;
  t RECORD;
  p RECORD;
  v_tpl UUID;
  v_date DATE;
  v_amount INT;
  v_idx INT;
BEGIN
  IF to_regclass('public.expenses') IS NULL THEN
    RAISE EXCEPTION 'Falta finance_phase1.sql: ejecútalo antes.';
  END IF;

  -- Repetible: borrar lo sintético anterior (el SQL Editor no está sujeto a RLS)
  DELETE FROM public.expenses WHERE supplier = 'Sintético';
  DELETE FROM public.recurring_expenses WHERE supplier = 'Sintético';

  -- 1. Gastos fijos: plantilla + un gasto por mes
  --    pend_now = TRUE: en el mes actual queda pendiente de confirmar
  FOR t IN SELECT * FROM (VALUES
    ('alquiler',    'Alquiler del local',            220000, 1,  'Banco',   0,     FALSE),
    ('personal',    'Nómina profesor BJJ',           120000, 28, 'Banco',   0,     TRUE),
    ('personal',    'Nómina profesor MMA y Lucha',   110000, 28, 'Banco',   0,     TRUE),
    ('suministros', 'Luz',                            26000, 10, 'Banco',   6000,  FALSE),
    ('suministros', 'Agua',                            5500, 12, 'Banco',   1500,  TRUE),
    ('suministros', 'Internet y teléfono',             4500, 5,  'Banco',   0,     FALSE),
    ('seguros',     'Seguro de responsabilidad civil', 9500, 20, 'Banco',   0,     TRUE),
    ('software',    'App y comisiones Bizum',          4900, 2,  'Tarjeta', 800,   FALSE),
    ('gestoria',    'Gestoría',                       12000, 25, 'Banco',   0,     TRUE)
  ) AS x(cat, concept, cents, day, method, vary, pend_now)
  LOOP
    INSERT INTO public.recurring_expenses (category_id, concept, supplier, amount_cents, day_of_month, start_month, payment_method)
    SELECT id, t.concept, 'Sintético', t.cents, LEAST(28, t.day), v_months[1], t.method
    FROM public.expense_categories WHERE slug = t.cat
    RETURNING id INTO v_tpl;

    FOREACH m IN ARRAY v_months LOOP
      v_date := (m || '-' || lpad(LEAST(28, t.day)::text, 2, '0'))::date;
      -- Mes actual: solo si ya pasó el día habitual y no se deja pendiente a propósito
      CONTINUE WHEN m = v_cur AND (t.pend_now OR v_date > v_today);
      -- Suministros variables: ± hasta "vary" céntimos según el mes
      v_amount := t.cents + CASE WHEN t.vary > 0 THEN ((ascii(right(m, 1)) * 37) % (2 * t.vary)) - t.vary ELSE 0 END;

      INSERT INTO public.expenses (category_id, concept, supplier, amount_cents, expense_date, period_month, payment_method, recurring_expense_id)
      SELECT category_id, concept, 'Sintético', v_amount, v_date, m, payment_method, v_tpl
      FROM public.recurring_expenses WHERE id = v_tpl;
    END LOOP;
  END LOOP;

  -- 2. Gastos puntuales repartidos en los tres meses (mes 1 = hace dos meses)
  FOR p IN SELECT * FROM (VALUES
    (1, 'material',      'Reparación de tatamis',            35000, 8,  'Banco'),
    (1, 'federacion',    'Licencias federativas temporada',  48000, 14, 'Banco'),
    (1, 'mantenimiento', 'Limpieza profunda vestuarios',      14000, 22, 'Efectivo'),
    (2, 'material',      'Guantes y espinilleras MMA',        18900, 6,  'Tarjeta'),
    (2, 'marketing',     'Cartelería y flyers',                9500, 11, 'Tarjeta'),
    (2, 'mantenimiento', 'Productos de limpieza',              4250, 18, 'Efectivo'),
    (2, 'otros',         'Agua y botiquín',                    3600, 24, 'Efectivo'),
    (3, 'material',      'Kimonos para préstamo',             24000, 3,  'Tarjeta'),
    (3, 'marketing',     'Anuncios en redes',                 12000, 4,  'Tarjeta'),
    (3, 'mantenimiento', 'Productos de limpieza',              3890, 7,  'Efectivo'),
    (3, 'impuestos',     'Tasa municipal de basuras',          6800, 9,  'Banco')
  ) AS x(month_idx, cat, concept, cents, day, method)
  LOOP
    v_date := (v_months[p.month_idx] || '-' || lpad(p.day::text, 2, '0'))::date;
    CONTINUE WHEN v_date > v_today;
    INSERT INTO public.expenses (category_id, concept, supplier, amount_cents, expense_date, period_month, payment_method)
    SELECT id, p.concept, 'Sintético', p.cents, v_date, v_months[p.month_idx], p.method
    FROM public.expense_categories WHERE slug = p.cat;
  END LOOP;
END $$;

-- Comprobación: gastos pagados por mes (por fecha de pago)
SELECT to_char(expense_date, 'YYYY-MM') AS mes,
       COUNT(*) AS gastos,
       ROUND(SUM(amount_cents) / 100.0, 2) AS total_eur
FROM public.expenses
WHERE supplier = 'Sintético' AND voided_at IS NULL
GROUP BY 1
ORDER BY 1;
