-- Añade columna opcional image_key a schedule_classes para elegir icono/imagen personalizada por clase
ALTER TABLE public.schedule_classes
  ADD COLUMN IF NOT EXISTS image_key text;

