-- ============================================================================
-- 247 STUDIO — 3 Logins de Prueba (Admin, Profesor y Alumno)
-- Contraseña para los 3: Test247!
-- Ejecutar en Supabase -> SQL Editor (idempotente: actualiza si ya existen)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_rec RECORD;
  v_uid UUID;
  v_plan_id UUID;
  v_plan_price NUMERIC(8,2);
  v_sub_id UUID;
  v_month TEXT := to_char(CURRENT_DATE, 'YYYY-MM');
BEGIN
  FOR v_rec IN SELECT * FROM (VALUES
    ('admin.prueba@247studio.local',  'Admin Prueba',  'admin',  'Negro',  0),
    ('profe.prueba@247studio.local',  'Profe Prueba',  'coach',  'Marrón', 0),
    ('alumno.prueba@247studio.local', 'Alumno Prueba', 'client', 'Azul',   2)
  ) AS t(email, full_name, role, belt, stripes)
  LOOP
    SELECT id INTO v_uid FROM auth.users WHERE email = v_rec.email LIMIT 1;

    IF v_uid IS NULL THEN
      v_uid := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmation_token, recovery_token,
        email_change, email_change_token_new, is_sso_user,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
        v_rec.email, crypt('Test247!', gen_salt('bf')), NOW(),
        '', '', '', '', false,
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, NOW(), NOW()
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', v_rec.email),
        'email', v_uid::text, NOW(), NOW(), NOW()
      );
    ELSE
      UPDATE auth.users
      SET encrypted_password = crypt('Test247!', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          updated_at = NOW()
      WHERE id = v_uid;
    END IF;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
      UPDATE public.profiles
      SET role = v_rec.role::user_role,
          status = 'active',
          full_name = v_rec.full_name,
          email = v_rec.email,
          belt = v_rec.belt,
          belt_stripes = v_rec.stripes,
          updated_at = NOW()
      WHERE id = v_uid;
    ELSE
      INSERT INTO public.profiles (id, role, status, full_name, email, belt, belt_stripes)
      VALUES (v_uid, v_rec.role::user_role, 'active', v_rec.full_name, v_rec.email, v_rec.belt, v_rec.stripes);
    END IF;

    IF v_rec.role = 'client' THEN
      IF NOT EXISTS (SELECT 1 FROM public.fighter_stats WHERE user_id = v_uid) THEN
        INSERT INTO public.fighter_stats (user_id, tecnica, fuerza, elasticidad, guardia, pase, derribos, leglocks, finalizacion)
        VALUES (v_uid, 72, 68, 65, 74, 70, 62, 58, 71);
      END IF;

      SELECT id, price_eur INTO v_plan_id, v_plan_price
      FROM public.plans
      WHERE is_active = TRUE
      ORDER BY price_eur DESC
      LIMIT 1;

      IF v_plan_id IS NOT NULL THEN
        SELECT id INTO v_sub_id
        FROM public.subscriptions
        WHERE user_id = v_uid AND month_year = v_month
        LIMIT 1;

        IF v_sub_id IS NULL THEN
          v_sub_id := gen_random_uuid();
          INSERT INTO public.subscriptions (id, user_id, plan_id, month_year, status)
          VALUES (v_sub_id, v_uid, v_plan_id, v_month, 'active');
        ELSE
          UPDATE public.subscriptions
          SET plan_id = v_plan_id, status = 'active'
          WHERE id = v_sub_id;
        END IF;

        -- Si el mes ya está cobrado no se toca (finance_step0.sql impide pisar un cobro)
        IF EXISTS (SELECT 1 FROM public.payments WHERE user_id = v_uid AND month_year = v_month AND status = 'paid_ok') THEN
          NULL;
        ELSIF EXISTS (SELECT 1 FROM public.payments WHERE user_id = v_uid AND month_year = v_month) THEN
          UPDATE public.payments
          SET subscription_id = v_sub_id,
              amount_eur = v_plan_price,
              status = 'paid_ok',
              paid_at = COALESCE(paid_at, NOW()),
              payment_method = 'Bizum'
          WHERE user_id = v_uid AND month_year = v_month;
        ELSE
          INSERT INTO public.payments (user_id, subscription_id, month_year, amount_eur, status, paid_at, payment_method)
          VALUES (v_uid, v_sub_id, v_month, v_plan_price, 'paid_ok', NOW(), 'Bizum');
        END IF;
      END IF;
    END IF;
  END LOOP;
END $$;
