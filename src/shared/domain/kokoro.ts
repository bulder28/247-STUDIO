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
  | 'STUDENT_ONBOARDING'
  | 'STUDENT_FREEZE_PAUSE'
  | 'STUDENT_OFFBOARDING'
  | 'PHOTO_CARDS_INTEGRATION'
  | 'AUTONOMOUS_OPERATIONS'
  | 'LEADS_TRIALS'
  | 'COMPETITION_WEIGHT'
  | 'GITHUB_OPEN_SOURCE_TOOLS'
  | 'BUSINESS_GROWTH_MARKETING'
  | 'GENERAL_KOKORO';

export interface KokoroContext {
  role: KokoroRole;
  currentUser?: UserDomainModel | null;
  totalActiveUsers?: number;
  frozenCount?: number;
  atRiskCount?: number;
  todayClassesCount?: number;
  monthlyRevenueEstimateCents?: number;
  leadsCount?: number;
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

  // 1. Fotos y Cartas FIFA (específico: foto, selfie, subir)
  if (
    q.includes('foto') ||
    q.includes('selfie') ||
    q.includes('subir foto') ||
    q.includes('recortar') ||
    q.includes('untegrando') ||
    q.includes('imagen alumno')
  ) {
    return 'PHOTO_CARDS_INTEGRATION';
  }

  // 2. Pausa por lesión / Congelar cuota
  if (
    q.includes('congelar') ||
    q.includes('pausa') ||
    q.includes('lesion') ||
    q.includes('lesión') ||
    q.includes('parar cuota') ||
    q.includes('operacion') ||
    q.includes('operación') ||
    q.includes('baja temporal')
  ) {
    return 'STUDENT_FREEZE_PAUSE';
  }

  // 3. Alta de alumnos / Crear usuarios
  if (
    q.includes('dar de alta') ||
    q.includes('alta de') ||
    /\balta\b/.test(q) ||
    q.includes('nuevo alumno') ||
    q.includes('crear alumno') ||
    q.includes('inscribir') ||
    q.includes('registrar alumno') ||
    q.includes('creandi') ||
    q.includes('usaruis')
  ) {
    return 'STUDENT_ONBOARDING';
  }

  // 4. Baja definitiva / Cancelación
  if (
    q.includes('dar de baja') ||
    q.includes('baja definitiva') ||
    q.includes('cancelar cuota') ||
    q.includes('cancelar suscripcion') ||
    q.includes('irse') ||
    q.includes('bahas')
  ) {
    return 'STUDENT_OFFBOARDING';
  }

  // 5. App autónoma / Administración sin programador
  if (
    q.includes('autonoma') ||
    q.includes('autónoma') ||
    q.includes('autonomo') ||
    q.includes('autónomo') ||
    q.includes('sin programador') ||
    q.includes('manajear') ||
    q.includes('manejar la app') ||
    q.includes('sin depender')
  ) {
    return 'AUTONOMOUS_OPERATIONS';
  }

  // 6. Leads y clases de prueba
  if (
    q.includes('prueba') ||
    q.includes('lead') ||
    q.includes('prospecto') ||
    q.includes('captacion') ||
    q.includes('captación') ||
    q.includes('interesado')
  ) {
    return 'LEADS_TRIALS';
  }

  // 7. Categorías de peso y competición IBJJF
  if (
    q.includes('pesaje') ||
    q.includes('medio pesado') ||
    q.includes('pesadisimo') ||
    (q.includes('peso') && !q.includes('pesos')) ||
    (q.includes('categoria') && !q.includes('oro') && !q.includes('carta'))
  ) {
    return 'COMPETITION_WEIGHT';
  }

  // 8. Carta FIFA / OVR / Skills
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

  // 9. Retención / Alumnos ausentes (prioritario para admin)
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

  // 10. Graduaciones / Cinturones / Grados
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

  // 11. Caja / Finanzas / Pagos (solo admin)
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

  // 12. Horarios / Clases
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

  // 13. Precios / Tarifas
  if (
    q.includes('tarifa') ||
    q.includes('precio') ||
    q.includes('cuota') ||
    q.includes('socio fundador') ||
    q.includes('familiar')
  ) {
    return 'PRICING_INQUIRY';
  }

  // 14. Normas de tatami / Higiene
  if (
    q.includes('chancla') ||
    q.includes('kimono') ||
    /\bgi\b/.test(q) ||
    q.includes('higiene') ||
    q.includes('uñas') ||
    q.includes('norma') ||
    q.includes('regla')
  ) {
    return 'ETIQUETTE_RULES';
  }

  // 15. Consejos técnicos de BJJ
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

  // 16. Mejoras, ideas, sugerencias y evolución del club (Kaizen)
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
    q.includes('proponer') ||
    q.includes('crres')
  ) {
    return 'IMPROVEMENTS_FEEDBACK';
  }

  // 17. Repositorios de GitHub, librerías y open-source
  if (
    q.includes('repo') ||
    q.includes('repos') ||
    q.includes('github') ||
    q.includes('libreria') ||
    q.includes('librería') ||
    q.includes('open source') ||
    q.includes('skills')
  ) {
    return 'GITHUB_OPEN_SOURCE_TOOLS';
  }

  // 18. Marketing, captación y crecimiento de negocio
  if (
    q.includes('captar') ||
    q.includes('vender') ||
    q.includes('marketing') ||
    q.includes('publicidad') ||
    q.includes('campaña') ||
    q.includes('conseguir alumnos') ||
    q.includes('crecer gimnasio') ||
    q.includes('estrategia')
  ) {
    return 'BUSINESS_GROWTH_MARKETING';
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

    case 'STUDENT_ONBOARDING': {
      if (context.role === 'admin') {
        return {
          intent,
          badge: 'ALTA DE ALUMNOS',
          text: `Para dar de alta a un alumno nuevo, accede al formulario de Alta. El sistema valida automáticamente la edad: si es menor de 16 años, requerirá los datos del tutor legal y consentimiento RGPD/LOPDGDD. También podrás registrar la firma del pliego de exención en la tablet o en papel físico.`,
          action: {
            type: 'NAVIGATE',
            label: 'Formulario de Alta de Alumno',
            url: '/admin/alta-alumno',
          },
        };
      }
      return {
        intent,
        badge: 'INSCRIPCIÓN 247',
        text: `Para inscribirte en 247Studio, habla con los profesores Mario y David en recepción para que te den de alta oficialmente y firmen tu exención deportiva.`,
      };
    }

    case 'STUDENT_FREEZE_PAUSE': {
      if (context.role === 'admin') {
        return {
          intent,
          badge: 'PAUSA POR LESIÓN',
          text: `Si un atleta se lesiona o viaja, no lo des de baja: ve a 'Alumnos' y pulsa el botón '❄️ Pausa'. Esto congela su cuota, preserva su historial de tatami y evita falsas alarmas en el radar anti-abandono. Cuando regrese al tatami, pulsa 'Reactivar'. Actualmente hay ${context.frozenCount ?? 0} atleta(s) en pausa.`,
          action: {
            type: 'NAVIGATE',
            label: 'Gestionar Alumnos en Pausa',
            url: '/admin/personal',
          },
        };
      }
      return {
        intent,
        badge: 'PAUSA DEPORTIVA',
        text: `Si tienes una lesión o vas a viajar, avisa a Mario o David para que activen tu pausa deportiva temporal. Así tu cuota y tu progreso de cinturón quedarán protegidos hasta que vuelvas.`,
      };
    }

    case 'STUDENT_OFFBOARDING': {
      if (context.role === 'admin') {
        return {
          intent,
          badge: 'BAJAS DE ALUMNOS',
          text: `Para tramitar una baja definitiva, busca al alumno en 'Alumnos' y pulsa en 'Baja'. Su estado pasará a INACTIVE bloqueando su acceso y reservas en la app, pero guardando todo su expediente de graduaciones y asistencias históricas.`,
          action: {
            type: 'NAVIGATE',
            label: 'Ir al Censo de Alumnos',
            url: '/admin/personal',
          },
        };
      }
      return {
        intent,
        badge: 'BAJAS 247',
        text: `Para gestionar la baja de tu suscripción o comunicar cualquier incidencia, habla directamente con Mario o David en la recepción del dojo.`,
      };
    }

    case 'PHOTO_CARDS_INTEGRATION': {
      if (context.role === 'admin') {
        return {
          intent,
          badge: 'FOTOS Y CARTAS FIFA',
          text: `¡Las Cartas FIFA FUT lucen al 100% con foto real! En 'Alumnos', pulsa sobre cualquier carta para abrir su editor de atributos y utiliza el botón de la cámara para subir un selfie o foto del atleta. El sistema la optimiza automáticamente para el cromo coleccionable.`,
          action: {
            type: 'NAVIGATE',
            label: 'Álbum de Cartas FIFA',
            url: '/admin/personal',
          },
        };
      }
      return {
        intent,
        badge: 'TU FOTO DE CARTA',
        text: `Pídele a Mario o David en tu próxima clase que te tome una foto o suba tu selfie en el dojo para que tu Carta FIFA FUT tenga tu imagen oficial con tu cinturón.`,
      };
    }

    case 'AUTONOMOUS_OPERATIONS': {
      if (context.role === 'admin') {
        return {
          intent,
          badge: 'APP 100% AUTÓNOMA',
          text: `¡Ese es el objetivo exacto de 247Studio! Como instructores y administradores, tenéis autonomía completa sin depender de ningún programador:\n- Crear y dar de baja alumnos y gestionar tutores legales.\n- Pausar cuotas por lesión deportiva.\n- Cuadrar la caja distinguiendo efectivo físico en cajón de recepción vs Bizum.\n- Modificar los horarios de clase y programas semanales.\n- Subir fotos para las cartas FIFA FUT y emitir diplomas oficiales IBJJF.\nY como copiloto, estoy aquí para guiaros en cada paso operativo.`,
          action: {
            type: 'NAVIGATE',
            label: 'Explorar Panel de Administración',
            url: '/admin/personal',
          },
        };
      }
      return {
        intent,
        badge: '247STUDIO DIGITAL',
        text: `247Studio cuenta con la plataforma más avanzada de Brazilian Jiu-Jitsu en España: reservas automáticas, kiosco de asistencia en tatami, cartas FIFA coleccionables y control de graduación en tiempo real.`,
      };
    }

    case 'LEADS_TRIALS': {
      if (context.role === 'admin') {
        return {
          intent,
          badge: 'EMBUDO DE PROSPECTOS',
          text: `En el módulo 'Clases de Prueba' podéis ver todos los interesados captados en la web o recepción. Puedes contactarles por WhatsApp con plantillas predefinidas con 1 clic y, cuando asistan a su primera clase de prueba, convertirlos en alumnos con el botón 'Crear Ficha'.`,
          action: {
            type: 'NAVIGATE',
            label: 'Ver Embudo de Leads',
            url: '/admin/leads',
          },
        };
      }
      return {
        intent,
        badge: 'CLASE DE PRUEBA',
        text: `¿Quieres probar el Brazilian Jiu-Jitsu en 247Studio? ¡Te dejamos kimono limpio para tu primera sesión! Puedes solicitar tu clase de prueba gratuita desde la página principal de la web.`,
      };
    }

    case 'COMPETITION_WEIGHT': {
      return {
        intent,
        badge: 'PESO & CATEGORÍAS IBJJF',
        text: `En torneos oficiales de BJJ (IBJJF/AJP), las divisiones de peso adulto masculino con Gi son:\n- Gallo: -57.5 kg\n- Pluma: -64.0 kg\n- Pena: -70.0 kg\n- Leve: -76.0 kg\n- Medio: -82.3 kg\n- Medio-Pesado: -88.3 kg\n- Pesado: -94.3 kg\n- Súper-Pesado: -100.5 kg\n- Pesadísimo: +100.5 kg\n¡Recuerda que el pesaje oficial se realiza con el kimono puesto justo antes de entrar al tatami de lucha!`,
      };
    }

    case 'GITHUB_OPEN_SOURCE_TOOLS': {
      return {
        intent,
        badge: 'REPOSITORIOS & SKILLS',
        text: `Oss Mario y David. Para robustecer 247Studio como una plataforma de clase mundial sin reinventar la rueda, recomiendo apoyarse en estas librerías y repositorios open-source de alto estándar:\n\n1. 📄 jspdf + html2canvas: Generación en cliente de justificantes oficiales con desglose de IVA y diplomas de graduación.\n2. 📊 Chart.js / Vega-Lite: Gráficas de asistencia semanal, evolución de MRR y mapa de calor de horas de tatami.\n3. ✂️ cropperjs: Recorte circular y centrado facial automático para las cartas FIFA Ultimate Team de los atletas.\n4. 📅 dayjs + timezone: Tratamiento exacto de horarios y periodos de facturación en zona horaria Madrid (CET).\n5. 🛡️ Zod: Validación de contratos de datos para exenciones de responsabilidad médica y menores de edad.`,
        action: {
          type: 'NONE',
        },
      };
    }

    case 'BUSINESS_GROWTH_MARKETING': {
      return {
        intent,
        badge: 'ESTRATEGIA & CRECIMIENTO',
        text: `Estrategia de Captación & Crecimiento para 247Studio (Pinto):\n\n1. 🥋 Funnel de Clase de Prueba con WhatsApp: Cada interesado de Instagram o Google recibe confirmación inmediata y recordatorio 3 horas antes.\n2. 🤝 Programa 'Hermano de Tatami' (Referrals): 10 € de descuento en la siguiente mensualidad al alumno que traiga un amigo que formalice su alta.\n3. 🏫 Clínicas de Iniciación & Defensa Personal Femenina los sábados: Eventos abiertos gratuitos para generar notoriedad de marca local en Pinto y comarca.\n4. ⭐ Reseñas en Google Maps: Solicitar 5 estrellas a los alumnos cuando alcancen su primer grado o cinturón azul.`,
        action: {
          type: 'NAVIGATE',
          label: 'Ver Embudo de Leads',
          url: '/admin/leads',
        },
      };
    }

    case 'GENERAL_KOKORO':
    default: {
      if (context.role === 'admin') {
        const total = context.totalActiveUsers ?? 24;
        const frozen = context.frozenCount ?? 0;
        const revenue = context.monthlyRevenueEstimateCents
          ? (context.monthlyRevenueEstimateCents / 100).toFixed(2)
          : '1450.00';

        return {
          intent: 'GENERAL_KOKORO',
          badge: 'KOKORO COPILOTO',
          text: `Oss Mario y David. Estado del Dojo: ${total} atletas activos registrados (${frozen} en pausa por lesión). Facturación estimada: ${revenue} €. Puedo guiaros en:\n\n- 👥 Censo & Alumnos: altas, bajas, pausas deportivas (freeze) y cartas FIFA.\n- 💵 Caja & Finanzas: cobro TPV mostrador, arqueo y CSV para gestoría.\n- 📅 Horarios: cuadrante semanal de clases Gi, No-Gi y Kids.\n- 🎯 Leads: embudo de clases de prueba y WhatsApp automático.\n- 💡 Kaizen: ideas de marketing y mejoras operativas.\n¿Qué área necesitáis gestionar?`,
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

