-- ============================================================================
-- 247 STUDIO — Datos Sintéticos de Prueba (28 usuarios @test247.local)
-- Contraseña de todos los usuarios de prueba: Test247!
-- Ejecutar en Supabase -> SQL Editor -> New query
-- ============================================================================

DO $$
DECLARE
  v_month TEXT := to_char(CURRENT_DATE, 'YYYY-MM');
  v_today DATE := CURRENT_DATE;
  v_uid UUID;
  v_parent_uid UUID;
  v_plan_bjj UUID;
  v_plan_mma UUID;
  v_plan_lucha UUID;
  v_plan_fem UUID;
  v_plan_k1 UUID;
  v_plan_k2 UUID;
  v_plan_bjj_mma UUID;
  v_plan_unlim UUID;
  v_plan_bono UUID;
  v_disc_bjj UUID;
  v_disc_mma UUID;
  v_cls_bjj UUID;
  v_cls_mma UUID;
  v_coach_uid UUID;
  v_admin_uid UUID;

  rec RECORD;
  v_plan_id UUID;
BEGIN
  -- Obtener IDs de planes y disciplinas existentes
  SELECT id INTO v_plan_bjj FROM public.plans WHERE name = 'BJJ & Grappling' LIMIT 1;
  SELECT id INTO v_plan_mma FROM public.plans WHERE name = 'MMA' LIMIT 1;
  SELECT id INTO v_plan_lucha FROM public.plans WHERE name = 'Lucha' LIMIT 1;
  SELECT id INTO v_plan_fem FROM public.plans WHERE name = 'BJJ Femenino' LIMIT 1;
  SELECT id INTO v_plan_k1 FROM public.plans WHERE name = 'Kids 1 (+7 años)' LIMIT 1;
  SELECT id INTO v_plan_k2 FROM public.plans WHERE name = 'Kids 2 (3 a 6 años)' LIMIT 1;
  SELECT id INTO v_plan_bjj_mma FROM public.plans WHERE name = 'BJJ & Grappling + MMA' LIMIT 1;
  SELECT id INTO v_plan_unlim FROM public.plans WHERE name = 'Pack Unlimited' LIMIT 1;
  SELECT id INTO v_plan_bono FROM public.plans WHERE name = 'Bono Clase Suelta' LIMIT 1;

  SELECT id INTO v_disc_bjj FROM public.disciplines WHERE slug = 'bjj-grappling' LIMIT 1;
  SELECT id INTO v_disc_mma FROM public.disciplines WHERE slug = 'mma' LIMIT 1;
  SELECT id INTO v_cls_bjj FROM public.schedule_classes WHERE discipline_id = v_disc_bjj LIMIT 1;
  SELECT id INTO v_cls_mma FROM public.schedule_classes WHERE discipline_id = v_disc_mma LIMIT 1;
  SELECT id INTO v_admin_uid FROM public.profiles WHERE role = 'admin' LIMIT 1;

  -- Limpiar ejecución previa si existiera (primero FKs con ON DELETE RESTRICT)
  IF to_regclass('public.trial_guests') IS NOT NULL THEN
    DELETE FROM public.trial_guests
    WHERE created_by IN (SELECT id FROM public.profiles WHERE email LIKE '%@test247.local')
       OR converted_user_id IN (SELECT id FROM public.profiles WHERE email LIKE '%@test247.local');
  END IF;

  DELETE FROM public.attendances
  WHERE validated_by IN (SELECT id FROM public.profiles WHERE email LIKE '%@test247.local')
     OR user_id IN (SELECT id FROM public.profiles WHERE email LIKE '%@test247.local');

  DELETE FROM public.announcements WHERE title LIKE '%(Prueba)%';
  DELETE FROM public.events WHERE title LIKE '%(Prueba)%';
  DELETE FROM public.faqs WHERE question = '¿Qué necesito para mi primera clase de BJJ / Grappling?';
  DELETE FROM auth.users WHERE email LIKE '%@test247.local';

  -- 1. CREAR 2 PROFESORES (coach)
  FOR rec IN SELECT * FROM (VALUES
    ('profe.carlos@test247.local', 'Carlos Ruiz (Coach)', 'Negro'),
    ('profe.elena@test247.local', 'Elena Martín (Coach)', 'Marrón')
  ) AS t(email, full_name, belt)
  LOOP
    v_uid := gen_random_uuid();
    IF v_coach_uid IS NULL THEN v_coach_uid := v_uid; END IF;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change, email_change_token_new, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      rec.email, crypt('Test247!', gen_salt('bf')), NOW(),
      '', '', '', '', false,
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, jsonb_build_object('sub', v_uid::text, 'email', rec.email), 'email', v_uid::text, NOW(), NOW(), NOW());

    INSERT INTO public.profiles (id, role, status, full_name, email, belt)
    VALUES (v_uid, 'coach', 'active', rec.full_name, rec.email, rec.belt);
  END LOOP;

  -- 2. CREAR 26 ALUMNOS (client) CUBRIENDO TODOS LOS CASOS LÍMITE
  -- pay_mode: 'OK' | 'GRACE' (asistió hace 3d sin pago) | 'NOK' (asistió hace 10d sin pago) | 'NONE'
  FOR rec IN SELECT * FROM (VALUES
    -- BJJ & Grappling (7)
    ('bjj1@test247.local', 'Carlos García López', 'active', 'Azul', '1994-03-12', 'bjj', 'OK'),
    ('bjj2@test247.local', 'Carlos García Sánchez', 'active', 'Blanco', '1998-07-21', 'bjj', 'NOK'),
    ('bjj3@test247.local', 'Javier Moreno', 'active', 'Morado', '1990-11-05', 'bjj', 'OK'),
    ('bjj4@test247.local', 'Sergio Navarro', 'active', 'Blanco', '2001-02-14', 'bjj', 'GRACE'),
    ('bjj5@test247.local', 'Adrián Torres', 'active', 'Azul', '1996-09-30', 'bjj', 'OK'),
    ('bjj6@test247.local', 'Raúl Jiménez (Pausado)', 'paused', 'Azul', '1992-05-19', 'bjj', 'NONE'),
    ('bjj7@test247.local', 'Óscar Díaz (Baja)', 'inactive', 'Blanco', '1995-01-10', 'bjj', 'OK'),

    -- MMA (4)
    ('mma1@test247.local', 'Marcos Vega', 'active', 'Blanco', '1997-04-08', 'mma', 'OK'),
    ('mma2@test247.local', 'Iván Castro', 'active', 'Blanco', '1999-12-01', 'mma', 'NOK'),
    ('mma3@test247.local', 'Rubén Ortega', 'active', 'Azul', '1993-08-17', 'mma', 'GRACE'),
    ('mma4@test247.local', 'Hugo Serrano (Pausado)', 'paused', 'Blanco', '2000-06-22', 'mma', 'NONE'),

    -- Lucha (2)
    ('lucha1@test247.local', 'Daniel Romero', 'active', 'Blanco', '1995-10-11', 'lucha', 'OK'),
    ('lucha2@test247.local', 'Álvaro Molina', 'active', 'Blanco', '1998-03-25', 'lucha', 'GRACE'),

    -- BJJ Femenino (3)
    ('fem1@test247.local', 'Laura Gómez', 'active', 'Azul', '1996-02-19', 'fem', 'OK'),
    ('fem2@test247.local', 'Marta Delgado', 'active', 'Blanco', '1999-09-04', 'fem', 'NOK'),
    ('fem3@test247.local', 'Sofía Herrera', 'active', 'Morado', '1991-11-28', 'fem', 'OK'),

    -- Kids 1 y Kids 2 (incluyendo 2 hermanos vinculados)
    ('kids1@test247.local', 'Mateo Fernández (Kids 1)', 'active', 'Blanco', '2016-05-10', 'k1', 'OK'),
    ('kids2@test247.local', 'Lucas Fernández (Hermano Kids 2)', 'active', 'Blanco', '2021-04-15', 'k2', 'OK'),
    ('kids3@test247.local', 'Lucía Ramírez (Kids 1)', 'active', 'Blanco', '2017-08-22', 'k1', 'GRACE'),
    ('kids4@test247.local', 'Leo Vázquez (Kids 2)', 'active', 'Blanco', '2021-11-03', 'k2', 'OK'),

    -- Combos y Unlimited (salen en múltiples disciplinas al pasar lista)
    ('combo1@test247.local', 'Pablo Gil (BJJ+MMA)', 'active', 'Azul', '1994-07-14', 'bjj_mma', 'OK'),
    ('combo2@test247.local', 'Diego León (BJJ+MMA)', 'active', 'Blanco', '1997-01-29', 'bjj_mma', 'NOK'),
    ('unlim1@test247.local', 'Alejandro Cruz (Unlimited)', 'active', 'Marrón', '1989-12-12', 'unlim', 'OK'),
    ('unlim2@test247.local', 'Jorge Blanco (Unlimited)', 'active', 'Morado', '1993-04-03', 'unlim', 'GRACE'),

    -- Bono y Baja adicional
    ('bono1@test247.local', 'Andrés Márquez (Bono)', 'active', 'Blanco', '1996-10-09', 'bono', 'OK'),
    ('baja2@test247.local', 'Víctor Soto (Baja)', 'inactive', 'Blanco', '1990-06-18', 'mma', 'NONE')
  ) AS t(email, full_name, status, belt, birth_date, plan_key, pay_mode)
  LOOP
    v_uid := gen_random_uuid();
    IF rec.email = 'kids1@test247.local' THEN v_parent_uid := v_uid; END IF;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change, email_change_token_new, is_sso_user,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      rec.email, crypt('Test247!', gen_salt('bf')), NOW(),
      '', '', '', '', false,
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, jsonb_build_object('sub', v_uid::text, 'email', rec.email), 'email', v_uid::text, NOW(), NOW(), NOW());

    INSERT INTO public.profiles (
      id, role, status, full_name, email, belt, birth_date, guardian_user_id,
      first_training_at
    ) VALUES (
      v_uid, 'client', rec.status::member_status, rec.full_name, rec.email, rec.belt, rec.birth_date::date,
      CASE WHEN rec.email = 'kids2@test247.local' THEN v_parent_uid ELSE NULL END,
      CASE
        WHEN rec.pay_mode = 'NOK' THEN NOW() - INTERVAL '10 days'
        WHEN rec.pay_mode = 'GRACE' THEN NOW() - INTERVAL '3 days'
        ELSE NOW() - INTERVAL '15 days'
      END
    );

    -- Ficha resumen del luchador (puede existir ya por trigger al crear profile)
    INSERT INTO public.fighter_stats (user_id, tecnica, fuerza, elasticidad, guardia, pase, derribos, leglocks, finalizacion)
    VALUES (v_uid, 65, 70, 60, 72, 68, 55, 50, 66)
    ON CONFLICT (user_id) DO UPDATE SET
      tecnica = EXCLUDED.tecnica,
      fuerza = EXCLUDED.fuerza,
      elasticidad = EXCLUDED.elasticidad,
      guardia = EXCLUDED.guardia,
      pase = EXCLUDED.pase,
      derribos = EXCLUDED.derribos,
      leglocks = EXCLUDED.leglocks,
      finalizacion = EXCLUDED.finalizacion;

    v_plan_id := CASE rec.plan_key
      WHEN 'bjj' THEN v_plan_bjj
      WHEN 'mma' THEN v_plan_mma
      WHEN 'lucha' THEN v_plan_lucha
      WHEN 'fem' THEN v_plan_fem
      WHEN 'k1' THEN v_plan_k1
      WHEN 'k2' THEN v_plan_k2
      WHEN 'bjj_mma' THEN v_plan_bjj_mma
      WHEN 'unlim' THEN v_plan_unlim
      ELSE v_plan_bono
    END;

    IF v_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (user_id, plan_id, month_year, remaining_credits, status)
      VALUES (
        v_uid,
        v_plan_id,
        v_month,
        CASE WHEN rec.plan_key = 'bono' THEN 1 ELSE NULL END,
        CASE WHEN rec.status = 'inactive' THEN 'cancelled' ELSE 'active' END
      );

      IF rec.pay_mode = 'OK' THEN
        INSERT INTO public.payments (user_id, month_year, amount_eur, status, payment_method, paid_at)
        SELECT v_uid, v_month, price_eur, 'paid_ok', 'Bizum', NOW() - INTERVAL '5 days'
        FROM public.plans WHERE id = v_plan_id;
      END IF;
    END IF;

    -- Asistencias históricas para activar regla de 7 días (NOK >7d vs GRACE <=7d)
    IF rec.pay_mode = 'NOK' AND v_cls_bjj IS NOT NULL THEN
      INSERT INTO public.attendances (user_id, schedule_class_id, discipline_id, attendance_date, validated_by, created_at)
      VALUES (v_uid, v_cls_bjj, v_disc_bjj, v_today - 10, COALESCE(v_coach_uid, v_admin_uid), NOW() - INTERVAL '10 days')
      ON CONFLICT DO NOTHING;
    ELSIF rec.pay_mode = 'GRACE' AND v_cls_bjj IS NOT NULL THEN
      INSERT INTO public.attendances (user_id, schedule_class_id, discipline_id, attendance_date, validated_by, created_at)
      VALUES (v_uid, v_cls_bjj, v_disc_bjj, v_today - 3, COALESCE(v_coach_uid, v_admin_uid), NOW() - INTERVAL '3 days')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- 3. CONTENIDO DE EJEMPLO (Foro, Evento, FAQ)
  IF v_admin_uid IS NOT NULL THEN
    INSERT INTO public.announcements (discipline_id, title, content, author_id)
    VALUES (v_disc_bjj, 'Seminario de Competición (Prueba)', 'Este sábado a las 11:00h haremos repaso de reglas IBJJF y sparring específico.', v_admin_uid);

    INSERT INTO public.events (title, event_type, event_date, location, description)
    VALUES ('Campeonato Madrid Grappling (Prueba)', 'Competición', NOW() + INTERVAL '20 days', 'Pabellón Pinto', 'Inscripciones abiertas hasta el día 15.');

    INSERT INTO public.faqs (question, answer, sort_order)
    VALUES ('¿Qué necesito para mi primera clase de BJJ / Grappling?', 'Ropa deportiva cómoda sin cremalleras ni bolsillos, chanclas para moverte fuera del tatami y agua.', 1);
  END IF;
END $$;

