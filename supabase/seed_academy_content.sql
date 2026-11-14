-- ============================================================================
-- 247 STUDIO — Contenido Inicial Oficial (FAQs, Eventos, Foro y Avisos)
-- Ejecutar en Supabase -> SQL Editor -> New query
-- Idempotente: no duplica si ya existen registros con el mismo título/pregunta.
-- ============================================================================

-- 1. PREGUNTAS FRECUENTES OFICIALES (6 FAQs)
INSERT INTO public.faqs (question, answer, sort_order, is_active)
SELECT v.question, v.answer, v.sort_order, true
FROM (VALUES
  (
    '¿Qué material necesito traer el primer día?',
    'Para clases de Grappling No-Gi, MMA o Wrestling basta con camiseta ajustada (rashguard o técnica sin cremalleras) y pantalón corto sin bolsillos. Para clases de BJJ Gi se requiere kimono; si es tu clase de prueba gratuita avísanos y te prestamos uno.',
    1
  ),
  (
    '¿Cuál es la diferencia entre BJJ Gi y Grappling (No-Gi)?',
    'En BJJ Gi se entrena con kimono tradicional permitiendo agarres en solapas y mangas. En Grappling (No-Gi) se entrena sin kimono, con un ritmo más dinámico y agarres directos al cuerpo y extremidades. Tu tarifa de BJJ incluye ambas modalidades.',
    2
  ),
  (
    '¿Cómo funciona el Bono de 8 clases o la Clase Suelta?',
    'El Bono de 8 clases (70 €) te da 8 accesos a cualquier sesión de BJJ, MMA o Lucha sin compromiso mensual. Cada vez que el profesor pasa lista en el tatami se descuenta automáticamente 1 crédito y ves los restantes en tu pantalla de Inicio.',
    3
  ),
  (
    '¿Cuándo se abona la cuota mensual?',
    'Dispones de los primeros 7 días desde tu primer entrenamiento del mes para abonar la cuota en recepción (Efectivo o Bizum). Pasado ese plazo sin regularizar, tu ficha aparecerá marcada en seguimiento como factura pendiente.',
    4
  ),
  (
    '¿Cómo funcionan los grupos Kids 1 y Kids 2?',
    'Kids 2 (3 a 6 años) trabaja psicomotricidad, equilibrio, juego guiado y valores de tatami. Kids 1 (+7 años hasta 14) profundiza en técnica real de Jiu-Jitsu, respeto y defensa personal. Todos los menores de hasta 14 años deben tener datos de padre/madre y autorizaciones firmadas.',
    5
  ),
  (
    '¿Qué ventajas tiene el plan Socio Fundador (SF)?',
    'Los alumnos reconocidos como Socio Fundador (SF) por la dirección disfrutan de un 10% de descuento aplicado directamente sobre el precio final de su tarifa mensual mientras mantengan dicha condición.',
    6
  )
) AS v(question, answer, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs f WHERE f.question = v.question
);

-- 2. PRÓXIMOS EVENTOS OFICIALES (4 eventos)
INSERT INTO public.events (title, event_type, event_date, location, description, is_active)
SELECT v.title, v.event_type, v.event_date, v.location, v.description, true
FROM (VALUES
  (
    'Open Mat Oficial de Viernes',
    'Open Mat',
    date_trunc('day', NOW()) + INTERVAL '7 days' + INTERVAL '20 hours 30 minutes',
    '247 STUDIO Pinto — Tatami Principal',
    'Sesión abierta de sparring Gi & No-Gi para todos los niveles de la academia.',
    1
  ),
  (
    'Seminario Técnico de Grappling & Leglocks',
    'Seminario',
    date_trunc('day', NOW()) + INTERVAL '14 days' + INTERVAL '11 hours',
    '247 STUDIO Pinto',
    'Entradas de ashi garami, control de cadera y defensas de talonera con Mario y David.',
    2
  ),
  (
    'Jornada de Graduación y Entrega de Grados',
    'Graduación',
    date_trunc('day', NOW()) + INTERVAL '28 days' + INTERVAL '19 hours',
    '247 STUDIO Pinto — Tatami Principal',
    'Ceremonia oficial de entrega de grados y cambio de cinturones para adultos y Kids.',
    3
  ),
  (
    'Sesión Especial de Sparring MMA & Wrestling',
    'Competición',
    date_trunc('day', NOW()) + INTERVAL '35 days' + INTERVAL '18 hours 30 minutes',
    '247 STUDIO Pinto — Zona Jaula / Tatami',
    'Asaltos específicos de lucha en pared y transiciones grappling-striking para equipo de competición.',
    4
  )
) AS v(title, event_type, event_date, location, description, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.events e WHERE e.title = v.title
);

-- 3. AVISOS GENERALES (2 avisos)
INSERT INTO public.notices (target_user_id, notice_type, title, message)
SELECT NULL, 'general', v.title, v.message
FROM (VALUES
  (
    'Documentación obligatoria para entrenar en el tatami',
    'Recuerda entrar en la pestaña Perfil y firmar los 4 documentos obligatorios (Privacidad RGPD, Derechos de Imagen, Exención de Responsabilidad y Normas del Tatami). En menores de 14 años debe firmar el padre, madre o tutor.'
  ),
  (
    'Normas de puntualidad, higiene y zapatillas fuera del tatami',
    'Las chanclas deben quedar siempre alineadas al borde del tatami y nunca se pisa el tatami con calzado de calle. Llega 10 minutos antes para calentar y entrar juntos al saludo.'
  )
) AS v(title, message)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notices n WHERE n.title = v.title
);

-- 4. COMUNICADOS EN EL FORO POR DISCIPLINA (4 comunicados)
DO $$
DECLARE
  v_author_id UUID;
  v_disc_bjj UUID;
  v_disc_mma UUID;
  v_disc_lucha UUID;
  v_disc_k1 UUID;
BEGIN
  SELECT id INTO v_author_id
  FROM public.profiles
  WHERE role IN ('admin', 'coach')
  ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_author_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_disc_bjj   FROM public.disciplines WHERE slug = 'bjj-grappling' LIMIT 1;
  SELECT id INTO v_disc_mma   FROM public.disciplines WHERE slug = 'mma'           LIMIT 1;
  SELECT id INTO v_disc_lucha FROM public.disciplines WHERE slug = 'lucha'         LIMIT 1;
  SELECT id INTO v_disc_k1    FROM public.disciplines WHERE slug = 'kids-1'        LIMIT 1;

  INSERT INTO public.announcements (discipline_id, title, content, author_id)
  SELECT v.disc_id, v.title, v.content, v_author_id
  FROM (VALUES
    (NULL::uuid,   '¡Bienvenidos a la nueva App Oficial de 247 STUDIO!', 'Ya puedes consultar el horario en tiempo real, revisar tus pagos, comunicarte por chat privado con dirección y mantener tu documentación firmada desde tu móvil.'),
    (v_disc_bjj,   'Bloque técnico del mes en BJJ & Grappling: Retención y Pase Torero', 'Durante las próximas 4 semanas nos centraremos en transiciones de media guardia a montada y secuencias rápidas de pase desde de pie. ¡No faltes al Open Mat de los viernes!'),
    (v_disc_mma,   'Recordatorio de protecciones obligatorias en MMA', 'Para los asaltos técnicos y sparring de MMA recuerda traer bucal, guantillas de 7 oz y espinilleras en buen estado para cuidar al compañero.'),
    (v_disc_k1,    'Horario de Kids 1 y Kids 2 — Uñas cortas y botella de agua', 'Padres y madres: revisad por favor antes de clase que los niños lleven las uñas de manos y pies cortas y botella con nombre para hidratarse entre rondas.')
  ) AS v(disc_id, title, content)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.announcements a WHERE a.title = v.title
  );

  -- También dejamos constancia si existe disciplina Lucha con nota de bienvenida si no existiera otro
  IF v_disc_lucha IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.announcements a WHERE a.title = 'Lucha (Wrestling): Enfoque en derribos a dos piernas y hand-fighting'
  ) THEN
    INSERT INTO public.announcements (discipline_id, title, content, author_id)
    VALUES (
      v_disc_lucha,
      'Lucha (Wrestling): Enfoque en derribos a dos piernas y hand-fighting',
      'Martes y jueves a las 20:30 h trabajaremos entradas de double-leg, snap downs y defensa de sprawl aplicable tanto a No-Gi como a MMA.',
      v_author_id
    );
  END IF;
END $$;

