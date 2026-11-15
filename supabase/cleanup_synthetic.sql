-- ============================================================================
-- 247 STUDIO — LIMPIEZA TOTAL DE DATOS SINTÉTICOS DE PRUEBA
-- Borra únicamente los usuarios @test247.local y contenido de prueba.
-- Mantiene intactos tus usuarios reales, horarios y tarifas oficiales.
-- ============================================================================

-- Limpiar primero tablas que referencian profiles con ON DELETE RESTRICT
DELETE FROM public.trial_guests;
DELETE FROM public.attendances
WHERE validated_by IN (SELECT id FROM public.profiles WHERE email LIKE '%@test247.local')
   OR user_id IN (SELECT id FROM public.profiles WHERE email LIKE '%@test247.local');
-- Desde finance_step0.sql los pagos usan ON DELETE RESTRICT: borrarlos antes que el usuario
DELETE FROM public.payments
WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE '%@test247.local');
-- ...y su historial (incluidos los eventos 'delete' que acaba de generar el borrado anterior)
DELETE FROM public.payment_events
WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE '%@test247.local');

-- Gastos sintéticos (seed_synthetic_expenses.sql), si la Fase 1 de Finanzas está aplicada
DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    DELETE FROM public.expenses WHERE supplier = 'Sintético' OR concept LIKE 'ZZ %';
    DELETE FROM public.recurring_expenses WHERE supplier = 'Sintético' OR concept LIKE 'ZZ %';
  END IF;
END $$;

DELETE FROM public.announcements WHERE title LIKE '%(Prueba)%';
DELETE FROM public.events WHERE title LIKE '%(Prueba)%';
DELETE FROM public.faqs WHERE question = '¿Qué necesito para mi primera clase de BJJ / Grappling?';
DELETE FROM auth.users WHERE email LIKE '%@test247.local';

