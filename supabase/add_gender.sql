-- Añade el sexo a los perfiles.
-- Valores permitidos: 'hombre', 'mujer' o NULL (sin indicar).
-- Ejecutar una vez en el SQL Editor de Supabase. No borra ni cambia datos existentes.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IN ('hombre', 'mujer'));
