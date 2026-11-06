import { UserDomainModel } from '@/shared/domain/types';

export type KokoroRole = 'admin' | 'student' | 'kiosk';

export type KokoroIntentType =
  | 'FIFA_CARD_INFO'
  | 'ATTENDANCE_RISK'
  | 'GRADUATION_STATUS'
  | 'SCHEDULE_INQUIRY'
  | 'PRICING_INQUIRY'
  | 'ETIQUETTE_RULES'
  | 'FINANCIAL_SUMMARY'
  | 'TECHNIQUE_ADVICE'
  | 'IMPROVEMENTS_FEEDBACK'
  | 'GENERAL_KOKORO';

export interface KokoroContext {
  role: KokoroRole;
  currentUser?: UserDomainModel | null;
  totalActiveUsers?: number;
  atRiskCount?: number;
  todayClassesCount?: number;
  monthlyRevenueEstimateCents?: number;
}

export interface KokoroActionPayload {
  type: 'SHOW_CARD' | 'SHOW_RISK_LIST' | 'SHOW_SCHEDULE' | 'NAVIGATE' | 'NONE';
  label?: string;
  url?: string;
}

export interface KokoroResponse {
  intent: KokoroIntentType;
  text: string;
  badge?: string;
  action?: KokoroActionPayload;
}

/**
 * Clasificador semántico determinista de intenciones para KOKORO
 */
export function interpretKokoroIntent(query: string, role: KokoroRole): KokoroIntentType {
  const q = query.toLowerCase().trim();

  // 1. Carta FIFA / OVR / Skills
  if (
    q.includes('carta') ||
    q.includes('fifa') ||
    q.includes('ovr') ||
    q.includes('oro') ||
    q.includes('plata') ||
    q.includes('bronce') ||
    q.includes('radar') ||
    q.includes('stats') ||
    q.includes('habilidades')
  ) {
    return 'FIFA_CARD_INFO';
  }

  // 2. Retención / Alumnos ausentes (prioritario para admin)
  if (
    q.includes('abandono') ||
    q.includes('ausente') ||
    q.includes('no vienen') ||
    q.includes('reactivar') ||
    q.includes('falta') ||
    q.includes('retencion') ||
    q.includes('retención') ||
    q.includes('riesgo')
  ) {
    return role === 'admin' ? 'ATTENDANCE_RISK' : 'GRADUATION_STATUS';
  }

  // 3. Graduaciones / Cinturones / Grados
  if (
    q.includes('cinturon') ||
    q.includes('cinturón') ||
    q.includes('grado') ||
    q.includes('stripe') ||
    q.includes('graduacion') ||
    q.includes('graduación') ||
    q.includes('promocion') ||
    q.includes('promoción') ||
    q.includes('proximo grado')
  ) {
    return 'GRADUATION_STATUS';
  }

  // 4. Caja / Finanzas / Pagos (solo admin)
  if (
    role === 'admin' &&
    (q.includes('caja') ||
      q.includes('dinero') ||
      q.includes('cobro') ||
      q.includes('ingreso') ||
      q.includes('balance') ||
      q.includes('bizum') ||
      q.includes('efectivo'))
  ) {
    return 'FINANCIAL_SUMMARY';
  }

  // 5. Horarios / Clases
  if (
    q.includes('horario') ||
    q.includes('clase') ||
    q.includes('hora') ||
    q.includes('no-gi') ||
    q.includes('nogi') ||
    q.includes('open mat') ||
    q.includes('cuando entreno')
  ) {
    return 'SCHEDULE_INQUIRY';
  }

  // 6. Precios / Tarifas
  if (
    q.includes('tarifa') ||
    q.includes('precio') ||
    q.includes('cuota') ||
    q.includes('socio fundador') ||
    q.includes('familiar')
  ) {
    return 'PRICING_INQUIRY';
  }

  // 7. Normas de tatami / Higiene
  if (
    q.includes('chancla') ||
    q.includes('kimono') ||
    q.includes('gi') ||
    q.includes('higiene') ||
    q.includes('uñas') ||
    q.includes('norma') ||
    q.includes('regla')
  ) {
    return 'ETIQUETTE_RULES';
  }

  // 8. Consejos técnicos de BJJ
  if (
    q.includes('guardia') ||
    q.includes('pasar') ||
    q.includes('triangulo') ||
    q.includes('triángulo') ||
    q.includes('armbar') ||
    q.includes('finalizar') ||
    q.includes('derribo') ||
    q.includes('leglock')
  ) {
    return 'TECHNIQUE_ADVICE';
  }

  // 9. Mejoras, ideas, sugerencias y evolución del club (Kaizen)
  if (
    q.includes('mejora') ||
    q.includes('mejorar') ||
    q.includes('idea') ||
    q.includes('sugerencia') ||
    q.includes('feedback') ||
    q.includes('crecer') ||
    q.includes('futuro') ||
    q.includes('avanzar') ||
    q.includes('incluir') ||
    q.includes('opinion') ||
    q.includes('opinión') ||
    q.includes('proponer')
  ) {
    return 'IMPROVEMENTS_FEEDBACK';
  }

  return 'GENERAL_KOKORO';
}

/**
 * Generador de respuestas fundamentadas (Grounding) para KOKORO
 */
export function generateKokoroResponse(
  intent: KokoroIntentType,
  context: KokoroContext
): KokoroResponse {
  const user = context.currentUser;
  const alias = user?.alias || 'Guerrero';

  switch (intent) {
    case 'FIFA_CARD_INFO': {
      if (context.role === 'admin') {
        return {
          intent,
          badge: 'FIFA FUT ADMIN',
          text: `En 247Studio las cartas reflejan la media OVR de los 8 atributos (Técnica, Fuerza, Elasticidad, Guardia, Pase, Derribos, Leglocks y Finalización). Las cartas ORO RARO son para OVR ≥ 75, ICON BLACK para Cinturones Negros y Socios Fundadores, PLATA para 65-74 y BRONCE para iniciación. Puedes ajustar los atributos de cualquier alumno desde el Álbum de Cartas.`,
          action: {
            type: 'NAVIGATE',
            label: 'Ver Álbum de Cartas FIFA',
            url: '/admin/personal',
          },
        };
      }

      const ovr = user?.stats
        ? Math.round(
            (Object.values(user.stats).reduce((a, b) => a + (b || 50), 0) as number) /
              Object.keys(user.stats).length
          )
        : 70;

      return {
        intent,
        badge: 'CARTA COLECCIONABLE',
        text: `¡Hola ${alias}! Tu carta oficial en 247Studio tiene actualmente una media de ${ovr} OVR. Para subir de categoría a Oro Raro necesitas superar los 75 de media general en el tatami entrenando con consistencia. Los instructores Mario y David evalúan tus progresos en guardia, derribos y finalizaciones periódicamente.`,
        action: {
          type: 'SHOW_CARD',
          label: 'Ver mi Carta FIFA FUT',
          url: '/app/home',
        },
      };
    }

    case 'ATTENDANCE_RISK': {
      const atRisk = context.atRiskCount ?? 0;
      return {
        intent,
        badge: 'RADAR ANTI-ABANDONO',
        text: `Mario y David, actualmente el radar anti-abandono detecta ${atRisk} atleta(s) en zona de riesgo por llevar entre 12 y 21 días sin registrar entrada en el tatami. Recuerda que puedes enviarles un mensaje directo de reactivación por WhatsApp con un solo clic desde la sección de Alumnos.`,
        action: {
          type: 'SHOW_RISK_LIST',
          label: 'Abrir Radar de Retención',
          url: '/admin/personal',
        },
      };
    }

    case 'GRADUATION_STATUS': {
      if (context.role === 'admin') {
        return {
          intent,
          badge: 'GRADUACIONES ADMIN',
          text: `El sistema calcula automáticamente la idoneidad de grado según las horas de tatami y regularidad. Puedes consultar los alumnos listos para su siguiente raya o cinturón y promocionarlos con un clic en la Hoja de Asistencia.`,
          action: {
            type: 'NAVIGATE',
            label: 'Panel de Graduaciones',
            url: '/admin/asistencia',
          },
        };
      }

      const belt = user?.belt || 'WHITE';
      const stripes = user?.stripes ?? 0;
      return {
        intent,
        badge: 'PROGRESIÓN DE TATAMI',
        text: `Ostentas el cinturón ${belt} con ${stripes} grado(s). En 247Studio cada clase suma +25 XP de tatami. Cada raya requiere constancia (aproximadamente 20-30 clases registradas). ¡Sigue viniendo con regularidad y Mario y David te llamarán al centro del tatami!`,
        action: {
          type: 'NAVIGATE',
          label: 'Ver Mi Progreso & Medallas',
          url: '/app/home',
        },
      };
    }

    case 'FINANCIAL_SUMMARY': {
      const revenue = context.monthlyRevenueEstimateCents
        ? (context.monthlyRevenueEstimateCents / 100).toFixed(2)
        : '0.00';
      return {
        intent,
        badge: 'CAJA & FINANZAS',
        text: `Resumen económico: la facturación mensual registrada se estima en ${revenue} €. Recuerda validar los pagos pendientes en Bizum o efectivo desde el módulo de Caja para emitir el recibo conforme a RGPD y liquidar la cuota mensual de cada socio.`,
        action: {
          type: 'NAVIGATE',
          label: 'Ir a Caja y Pagos',
          url: '/admin/caja',
        },
      };
    }

    case 'SCHEDULE_INQUIRY': {
      return {
        intent,
        badge: 'HORARIOS 247',
        text: `Tenemos clases todos los días repartidas entre BJJ Gi (con kimono), No-Gi (grappling sin kimono) y grupos Kids. Recuerda hacer check-in en la tablet de recepción al llegar para que tu asistencia sume automáticamente a tus horas de graduación.`,
        action: {
          type: 'SHOW_SCHEDULE',
          label: 'Ver Horario Completo',
          url: '/app/horario',
        },
      };
    }

    case 'PRICING_INQUIRY': {
      return {
        intent,
        badge: 'TARIFAS 247STUDIO',
        text: `247Studio dispone de tres modalidades principales: Tarifa Estándar (STD, acceso completo a clases), Socio Fundador (SF, precio blindado vitalicio y carta Icon Black) y Tarifa Familiar (FAM, descuento para padres e hijos). Todos los pagos se gestionan transparentemente desde la app.`,
        action: {
          type: 'NAVIGATE',
          label: 'Consultar Tarifas',
          url: context.role === 'admin' ? '/admin/tarifas' : '/app/perfil',
        },
      };
    }

    case 'ETIQUETTE_RULES': {
      return {
        intent,
        badge: 'CÓDIGO DE TATAMI',
        text: `Reglas de oro de 247Studio:\n1. 🩴 Chanclas SIEMPRE obligatorias al salir del tatami (prohibido pisar descalzo los baños o la recepción).\n2. 🥋 Kimono limpio en cada sesión y uñas cortadas por seguridad de los compañeros.\n3. 🤝 Saludo respetuoso a los instructores y al tatami al entrar y salir.\n4. 🛡️ En sparring, la seguridad del compañero es lo primero. Haz tap a tiempo.`,
      };
    }

    case 'TECHNIQUE_ADVICE': {
      return {
        intent,
        badge: 'SENSEI KOKORO',
        text: `En el Brazilian Jiu-Jitsu la técnica supera a la fuerza pura:\n- Si estás debajo en guardia: mantén tus cuatro puntos de contacto y controla la postura de tu rival con ganchos.\n- Si estás pasando: mantén presión en la cadera, base baja y no te precipites.\n- Para sumisiones: la posición precede a la sumisión (Position before submission). ¡Pregúntale a Mario y David los detalles de palanca en la próxima clase!`,
      };
    }

    case 'IMPROVEMENTS_FEEDBACK': {
      return {
        intent,
        badge: 'KAIZEN & MEJORAS 247',
        text: `¡Oss! En el Jiu-Jitsu la mejora continua (Kaizen) es el pilar fundamental. Analizando la academia y el funcionamiento de la app, aquí tienes 4 mejoras de alto impacto que podemos activar:\n\n1. 📸 Self-Service de Fotos de Alumnos: Permitir que cada alumno o instructor suba selfies recortados automáticamente para sus Cartas FIFA FUT.\n2. 🔥 Sistema de Desafíos Semanales: Otorgar XP extra a los chavales que asistan a 3 clases en la misma semana o racha de 12 clases al mes.\n3. 🏆 Podio del Mes en el Kiosco: Mostrar en la tablet de recepción el TOP 3 de compañeros con más horas de tatami acumuladas.\n4. 🤖 Conexión LLM en Tiempo Real: Activar la API de Google Gemini en Kokoro para razonar sobre cualquier duda estratégica, táctica o de negocio sin límites predefinidos.`,
        action: {
          type: 'NAVIGATE',
          label: 'Ver Álbum y Censo',
          url: context.role === 'admin' ? '/admin/personal' : '/app/home',
        },
      };
    }

    case 'GENERAL_KOKORO':
    default: {
      if (context.role === 'admin') {
        return {
          intent: 'GENERAL_KOKORO',
          badge: 'KOKORO COPILOTO',
          text: `Oss Mario y David. Os escucho con atención marcial. Para una respuesta 100% libre e improvisada sobre cualquier tema podéis conectar mi clave de Google Gemini pulsando en la tuerca ⚙️ superior. Mientras tanto, puedo orientaros sobre retención de alumnos, caja, graduaciones, sugerencias de mejora o el censo. ¿Qué necesitáis analizar?`,
        };
      }

      return {
        intent: 'GENERAL_KOKORO',
        badge: 'KOKORO SENSEI',
        text: `¡Oss ${alias}! Te escucho con atención de tatami. Puedes preguntarme sobre cómo subir tu carta FIFA a Oro, tus horas para el próximo cinturón, horarios de clase, normas de kimono o consejos técnicos. ¿En qué te ayudo a mejorar hoy?`,
      };
    }
  }
}

