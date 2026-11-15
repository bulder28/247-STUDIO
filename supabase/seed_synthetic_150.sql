-- ============================================================================
-- 247 STUDIO — 150 alumnos sintéticos para probar Cobros a escala real
-- Emails escala001..escala150@test247.local · Contraseña: Test247!
-- Requiere finance_step0.sql. Ejecutar en Supabase -> SQL Editor -> New query
--
-- - No toca los 28 alumnos sintéticos ni las cuentas *.prueba.
-- - Se puede repetir: primero borra solo los escala*@test247.local.
-- - Para borrarlos todos (junto con el resto de datos de prueba): cleanup_synthetic.sql
--
-- Reparto del mes actual (aprox.): 62% pagado · 12% en plazo (vino hace <7 días)
-- · 9% con más de 7 días sin pagar · 7% sin venir aún · 5% con un mes anterior
-- atrasado · 5% con el mes siguiente pagado por adelantado. ~5% pausados, ~3% de baja,
-- ~10% socios fundadores y 10 parejas de hermanos en Kids.
-- Dos meses anteriores de historial, casi todo pagado.
-- ============================================================================

DO $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Europe/Madrid')::date;
  v_month TEXT := to_char(v_today, 'YYYY-MM');
  v_month_start DATE := date_trunc('month', v_today)::date;
  v_prev1 TEXT := to_char(v_month_start - INTERVAL '1 month', 'YYYY-MM');
  v_prev2 TEXT := to_char(v_month_start - INTERVAL '2 months', 'YYYY-MM');
  v_next TEXT := to_char(v_month_start + INTERVAL '1 month', 'YYYY-MM');

  v_first TEXT[] := ARRAY['Pablo','Lucía','Hugo','Martina','Daniel','Sara','Alejandro','Paula','Mario','Julia',
    'Álvaro','Carmen','David','Lola','Adrián','Elena','Diego','Noa','Javier','Irene','Marcos','Claudia','Iker',
    'Alba','Manuel','Vega','Rubén','Nerea','Gonzalo','Ainhoa','Raúl','Marina','Sergio','Aitana','Jorge','Valeria',
    'Nicolás','Candela','Bruno','Olivia','Samuel','Carla','Óscar','Inés','Eric','Laia','Gabriel','Mía','Leo','Sofía'];
  v_last TEXT[] := ARRAY['García','Rodríguez','González','Fernández','López','Martínez','Sánchez','Pérez','Gómez',
    'Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro',
    'Torres','Domínguez','Vázquez','Ramos','Gil','Ramírez','Serrano','Blanco','Molina','Morales','Suárez','Ortega',
    'Delgado','Castro','Ortiz','Rubio','Marín','Sanz','Núñez','Iglesias','Medina','Garrido','Cortés','Castillo'];
  v_belts TEXT[] := ARRAY['Blanco','Blanco','Blanco','Azul','Azul','Morado','Marrón'];

  v_plans UUID[];
  v_plan_names TEXT[] := ARRAY['BJJ & Grappling','MMA','Lucha','BJJ Femenino','Kids 1 (+7 años)',
    'Kids 2 (3 a 6 años)','BJJ & Grappling + MMA','Pack Unlimited','Bono Clase Suelta'];
  -- Peso de cada tarifa en el reparto (suma 150)
  v_weights INT[] := ARRAY[45, 20, 12, 15, 20, 15, 10, 8, 5];

  v_cls UUID;
  v_disc UUID;
  v_validator UUID;

  i INT;
  k INT;
  acc INT;
  r DOUBLE PRECISION;
  v_uid UUID;
  v_email TEXT;
  v_name TEXT;
  v_status member_status;
  v_plan_idx INT;
  v_plan_id UUID;
  v_price NUMERIC(8,2);
  v_is_founder BOOLEAN;
  v_is_kid BOOLEAN;
  v_birth DATE;
  v_case TEXT;
  v_method TEXT;
  v_day INT;
  v_prev_sibling UUID;
  v_siblings_made INT := 0;
BEGIN
  PERFORM setseed(0.247);

  -- Tarifas existentes, en el orden de v_plan_names
  v_plans := ARRAY(SELECT (SELECT id FROM public.plans WHERE name = n LIMIT 1) FROM unnest(v_plan_names) AS n);
  IF v_plans[1] IS NULL THEN
    RAISE EXCEPTION 'No encuentro la tarifa "BJJ & Grappling". Ejecuta antes seed_schedule_and_plans.sql.';
  END IF;

  SELECT id, discipline_id INTO v_cls, v_disc FROM public.schedule_classes WHERE is_active LIMIT 1;
  SELECT id INTO v_validator FROM public.profiles WHERE role IN ('coach', 'admin') ORDER BY role LIMIT 1;

  -- Repetible: borrar solo los alumnos de escala (pagos primero: ON DELETE RESTRICT)
  DELETE FROM public.attendances WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'escala%@test247.local');
  DELETE FROM public.payments WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'escala%@test247.local');
  DELETE FROM public.payment_events WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'escala%@test247.local');
  DELETE FROM auth.users WHERE email LIKE 'escala%@test247.local';

  FOR i IN 1..150 LOOP
    -- Tarifa según el reparto de pesos
    acc := 0;
    v_plan_idx := 1;
    FOR k IN 1..array_length(v_weights, 1) LOOP
      acc := acc + v_weights[k];
      IF i <= acc THEN
        v_plan_idx := k;
        EXIT;
      END IF;
    END LOOP;
    v_plan_id := v_plans[v_plan_idx];
    CONTINUE WHEN v_plan_id IS NULL;
    v_is_kid := v_plan_idx IN (5, 6);

    v_uid := gen_random_uuid();
    v_email := 'escala' || lpad(i::text, 3, '0') || '@test247.local';
    v_name := v_first[1 + floor(random() * array_length(v_first, 1))::int] || ' ' ||
              v_last[1 + floor(random() * array_length(v_last, 1))::int] || ' ' ||
              v_last[1 + floor(random() * array_length(v_last, 1))::int];
    r := random();
    v_status := CASE WHEN r < 0.05 THEN 'paused' WHEN r < 0.08 THEN 'inactive' ELSE 'active' END;
    v_is_founder := random() < 0.10;
    v_birth := CASE
      WHEN v_plan_idx = 5 THEN v_today - ((7 + floor(random() * 6))::int * 365)
      WHEN v_plan_idx = 6 THEN v_today - ((3 + floor(random() * 4))::int * 365)
      ELSE v_today - ((18 + floor(random() * 25))::int * 365)
    END;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change, email_change_token_new, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt('Test247!', gen_salt('bf')), NOW(),
      '', '', '', '', false,
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email), 'email', v_uid::text, NOW(), NOW(), NOW());

    INSERT INTO public.profiles (id, role, status, full_name, email, belt, birth_date, is_founder, guardian_user_id, first_training_at)
    VALUES (
      v_uid, 'client', v_status, v_name, v_email,
      CASE WHEN v_is_kid THEN 'Blanco' ELSE v_belts[1 + floor(random() * array_length(v_belts, 1))::int] END,
      v_birth, v_is_founder,
      -- Hermanos: en Kids, cada dos alumnos se vinculan al anterior (hasta 10 parejas)
      CASE WHEN v_is_kid AND v_prev_sibling IS NOT NULL AND v_siblings_made < 10 THEN v_prev_sibling ELSE NULL END,
      NOW() - INTERVAL '70 days'
    );
    IF v_is_kid THEN
      IF v_prev_sibling IS NOT NULL AND v_siblings_made < 10 THEN
        v_siblings_made := v_siblings_made + 1;
        v_prev_sibling := NULL;
      ELSE
        v_prev_sibling := v_uid;
      END IF;
    END IF;

    SELECT CASE WHEN v_is_founder THEN ROUND(price_eur * 0.90) ELSE price_eur END
      INTO v_price FROM public.plans WHERE id = v_plan_id;

    -- Historial: dos meses anteriores, casi todo pagado (a mitad de cada mes)
    INSERT INTO public.subscriptions (user_id, plan_id, month_year, status)
    VALUES (v_uid, v_plan_id, v_prev2, 'active'), (v_uid, v_plan_id, v_prev1, 'active')
    ON CONFLICT (user_id, month_year) DO NOTHING;

    INSERT INTO public.payments (user_id, month_year, amount_eur, status, payment_method, paid_at)
    VALUES (v_uid, v_prev2, v_price, 'paid_ok',
            CASE WHEN random() < 0.7 THEN 'Bizum' ELSE 'Efectivo' END,
            (v_prev2 || '-' || lpad((2 + floor(random() * 12))::int::text, 2, '0'))::date + TIME '18:30');

    -- Caso del mes actual
    IF v_status = 'inactive' THEN
      v_case := 'BAJA';
    ELSIF v_status = 'paused' THEN
      v_case := 'PAUSA';
    ELSE
      r := random();
      v_case := CASE
        WHEN r < 0.62 THEN 'PAGADO'
        WHEN r < 0.74 THEN 'EN_PLAZO'
        WHEN r < 0.83 THEN 'MAS_7'
        WHEN r < 0.90 THEN 'SIN_VENIR'
        WHEN r < 0.95 THEN 'ATRASADO'
        ELSE 'ADELANTADO'
      END;
    END IF;

    -- Mes anterior: pagado salvo los atrasados
    IF v_case <> 'ATRASADO' THEN
      INSERT INTO public.payments (user_id, month_year, amount_eur, status, payment_method, paid_at)
      VALUES (v_uid, v_prev1, v_price, 'paid_ok',
              CASE WHEN random() < 0.7 THEN 'Bizum' ELSE 'Efectivo' END,
              (v_prev1 || '-' || lpad((2 + floor(random() * 12))::int::text, 2, '0'))::date + TIME '19:00');
    END IF;

    -- Suscripción del mes actual (baja: cancelada; pausa: sin cuota este mes)
    IF v_case <> 'PAUSA' THEN
      INSERT INTO public.subscriptions (user_id, plan_id, month_year, status)
      VALUES (v_uid, v_plan_id, v_month, CASE WHEN v_case = 'BAJA' THEN 'cancelled' ELSE 'active' END)
      ON CONFLICT (user_id, month_year) DO NOTHING;
    END IF;

    v_method := CASE WHEN random() < 0.7 THEN 'Bizum' ELSE 'Efectivo' END;
    v_day := 1 + floor(random() * GREATEST(1, EXTRACT(DAY FROM v_today)::int))::int;

    IF v_case IN ('PAGADO', 'ADELANTADO') THEN
      INSERT INTO public.payments (user_id, month_year, amount_eur, status, payment_method, paid_at)
      VALUES (v_uid, v_month, v_price, 'paid_ok', v_method, (v_month_start + (v_day - 1)) + TIME '19:15');
    END IF;

    IF v_case = 'ADELANTADO' THEN
      INSERT INTO public.subscriptions (user_id, plan_id, month_year, status)
      VALUES (v_uid, v_plan_id, v_next, 'active')
      ON CONFLICT (user_id, month_year) DO NOTHING;
      INSERT INTO public.payments (user_id, month_year, amount_eur, status, payment_method, paid_at, notes)
      VALUES (v_uid, v_next, v_price, 'paid_ok', v_method, (v_month_start + (v_day - 1)) + TIME '19:15',
              'Cobro múltiple (prueba de escala)');
    END IF;

    -- Asistencias del mes: activan la regla de 7 días
    IF v_cls IS NOT NULL AND v_validator IS NOT NULL THEN
      IF v_case IN ('PAGADO', 'ADELANTADO', 'ATRASADO', 'MAS_7') THEN
        INSERT INTO public.attendances (user_id, schedule_class_id, discipline_id, attendance_date, validated_by, created_at)
        VALUES (v_uid, v_cls, v_disc, v_month_start, v_validator, v_month_start + TIME '19:00')
        ON CONFLICT DO NOTHING;
      ELSIF v_case = 'EN_PLAZO' THEN
        INSERT INTO public.attendances (user_id, schedule_class_id, discipline_id, attendance_date, validated_by, created_at)
        VALUES (v_uid, v_cls, v_disc, GREATEST(v_month_start, v_today - 2), v_validator,
                GREATEST(v_month_start, v_today - 2) + TIME '19:00')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Comprobación rápida
SELECT effective_status, COUNT(*) AS alumnos
FROM public.v_monthly_payment_status
WHERE month_year = to_char((NOW() AT TIME ZONE 'Europe/Madrid')::date, 'YYYY-MM')
GROUP BY effective_status
ORDER BY 2 DESC;
