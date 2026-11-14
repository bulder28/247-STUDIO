-- ============================================================================
-- 247 STUDIO — Ficha de Menores (<= 14 años): Datos de Padre y Madre
-- Ejecutar en Supabase -> SQL Editor -> New query
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  ADD COLUMN IF NOT EXISTS father_phone TEXT,
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_phone TEXT;

