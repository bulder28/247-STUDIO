-- ============================================================================
-- 247 STUDIO — Documentación Obligatoria (Privacidad, Imagen, Exención, Normas)
-- Ejecutar en Supabase -> SQL Editor -> New query
-- ============================================================================

INSERT INTO public.document_templates (slug, title, body_text, version, is_active) VALUES
  (
    'privacidad-rgpd',
    'Política de Privacidad y Protección de Datos (RGPD)',
    'Autorizo a 247 STUDIO al tratamiento de mis datos personales, fotografía identificativa de ficha interna y datos médicos o de contacto de emergencia con la única finalidad de gestionar mi alta, seguridad en el tatami, control de asistencia y cobros. Puedo ejercer mis derechos de acceso, rectificación o supresión escribiendo a la dirección de la academia.',
    1,
    true
  ),
  (
    'derechos-imagen-adulto',
    'Derechos de Imagen y Filmación (Mayores de edad)',
    'Autorizo a 247 STUDIO a captar, filmar y publicar fotografías o vídeos durante entrenamientos, seminarios y eventos deportivos con fines formativos, deportivos o divulgativos de la academia.',
    1,
    true
  ),
  (
    'derechos-imagen-menor',
    'Derechos de Imagen y Filmación (Menores ≤ 14 años)',
    'Como padre, madre o tutor legal, autorizo a 247 STUDIO a captar y publicar fotografías o vídeos del menor durante las clases, entrenamientos y eventos deportivos con fines formativos y divulgativos de la academia.',
    1,
    true
  ),
  (
    'exencion-responsabilidad-adulto',
    'Asunción de Riesgos, Aptitud Física y Exención de Responsabilidad',
    'Declaro encontrarme en condiciones físicas aptas y sin contraindicación médica para la práctica de deportes de contacto (BJJ, Grappling, MMA y Wrestling). Conozco y asumo voluntariamente los riesgos inherentes a la actividad y que la cuota no incluye seguro médico ni licencia federativa, eximiendo a 247 STUDIO y a sus instructores de responsabilidad por lesiones fortuitas derivadas de la práctica normal de la actividad.',
    1,
    true
  ),
  (
    'exencion-responsabilidad-menor',
    'Asunción de Riesgos y Exención de Responsabilidad (Menores ≤ 14 años)',
    'Como padre, madre o tutor legal, declaro que el menor se encuentra en condiciones físicas aptas y sin contraindicación médica para practicar deportes de contacto (BJJ Kids / Grappling). Conozco y asumo los riesgos propios de la actividad deportiva y que la cuota no incluye seguro médico ni licencia federativa, eximiendo a 247 STUDIO y a sus instructores de responsabilidad por lesiones fortuitas derivadas de la práctica normal.',
    1,
    true
  ),
  (
    'normas-tatami',
    'Normas del Tatami y Condiciones de la Escuela',
    'Acepto las normas de higiene, puntualidad, respeto al compañero y condiciones de mensualidad de 247 STUDIO.',
    1,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  title     = EXCLUDED.title,
  body_text = EXCLUDED.body_text,
  is_active = true;

