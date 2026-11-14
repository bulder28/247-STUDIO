-- ============================================================================
-- 247 STUDIO — Socio Fundador (SF): Descuento 10% revocable por Admin
-- Ejecutar en Supabase -> SQL Editor -> New query
-- ============================================================================

-- 1. Añadir flag is_founder en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Actualizar la vista de pagos para aplicar automáticamente el -10% redondeado
--    cuando el alumno tiene is_founder = true (ej. 69 € -> 62 €)
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
    WHEN p.is_founder THEN ROUND(pl.price_eur * 0.90)
    ELSE pl.price_eur
  END AS price_eur,
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
  p.id, p.full_name, p.status, p.is_founder, s.month_year, s.plan_id, pl.name, pl.price_eur,
  pay.status, pay.paid_at, pay.payment_method, pay.amount_eur, pay.notes;

