import { describe, expect, it } from 'vitest';
import {
  generateKokoroResponse,
  interpretKokoroIntent,
  KokoroContext,
} from '@/shared/domain/kokoro';
import { UserDomainModel } from '@/shared/domain/types';

describe('Dominio Puro: Cerebro de KOKORO AI', () => {
  describe('Clasificador de Intenciones (interpretKokoroIntent)', () => {
    it('detecta FIFA_CARD_INFO para preguntas sobre cartas, OVR, oro, plata', () => {
      expect(interpretKokoroIntent('¿Cómo subo mi carta a oro?', 'student')).toBe('FIFA_CARD_INFO');
      expect(interpretKokoroIntent('Qué significa mi media ovr', 'student')).toBe('FIFA_CARD_INFO');
      expect(interpretKokoroIntent('Quiero ver mis stats del radar fifa', 'admin')).toBe('FIFA_CARD_INFO');
    });

    it('detecta ATTENDANCE_RISK para el administrador ante alumnos ausentes', () => {
      expect(interpretKokoroIntent('alumnos en riesgo de abandono', 'admin')).toBe('ATTENDANCE_RISK');
      expect(interpretKokoroIntent('qué alumnos no vienen hace semanas', 'admin')).toBe('ATTENDANCE_RISK');
    });

    it('detecta GRADUATION_STATUS ante dudas de cinturones, rayas y promociones', () => {
      expect(interpretKokoroIntent('¿Cuándo me toca el siguiente cinturón?', 'student')).toBe('GRADUATION_STATUS');
      expect(interpretKokoroIntent('cuántos grados me faltan', 'student')).toBe('GRADUATION_STATUS');
    });

    it('detecta FINANCIAL_SUMMARY para el admin ante preguntas de caja y bizum', () => {
      expect(interpretKokoroIntent('¿Cuánto dinero hemos cobrado este mes en caja?', 'admin')).toBe('FINANCIAL_SUMMARY');
      expect(interpretKokoroIntent('balance de ingresos por bizum', 'admin')).toBe('FINANCIAL_SUMMARY');
    });

    it('detecta ETIQUETTE_RULES para dudas de chanclas, kimonos e higiene', () => {
      expect(interpretKokoroIntent('¿Es obligatorio llevar chanclas?', 'student')).toBe('ETIQUETTE_RULES');
      expect(interpretKokoroIntent('normas de higiene con el gi', 'student')).toBe('ETIQUETTE_RULES');
    });

    it('detecta SCHEDULE_INQUIRY para consultas de clases', () => {
      expect(interpretKokoroIntent('¿A qué hora es la clase de no-gi hoy?', 'student')).toBe('SCHEDULE_INQUIRY');
    });

    it('detecta IMPROVEMENTS_FEEDBACK ante preguntas de mejoras, ideas y Kaizen', () => {
      expect(interpretKokoroIntent('crres que podemos incluir alguna mejora?', 'admin')).toBe('IMPROVEMENTS_FEEDBACK');
      expect(interpretKokoroIntent('¿Qué ideas propones para el futuro de la app?', 'admin')).toBe('IMPROVEMENTS_FEEDBACK');
    });

    it('detecta STUDENT_ONBOARDING, STUDENT_FREEZE_PAUSE y STUDENT_OFFBOARDING ante gestión de alumnos', () => {
      expect(interpretKokoroIntent('¿Cómo dar de alta a un nuevo alumno?', 'admin')).toBe('STUDENT_ONBOARDING');
      expect(interpretKokoroIntent('creandi usaruis en la app', 'admin')).toBe('STUDENT_ONBOARDING');
      expect(interpretKokoroIntent('pausar la cuota por lesion en la rodilla', 'admin')).toBe('STUDENT_FREEZE_PAUSE');
      expect(interpretKokoroIntent('congelar cuota a alumno', 'admin')).toBe('STUDENT_FREEZE_PAUSE');
      expect(interpretKokoroIntent('dar de baja definitiva a un socio', 'admin')).toBe('STUDENT_OFFBOARDING');
    });

    it('detecta AUTONOMOUS_OPERATIONS, PHOTO_CARDS_INTEGRATION y LEADS_TRIALS', () => {
      expect(interpretKokoroIntent('hacer la app autonoma para manajear sin ti', 'admin')).toBe('AUTONOMOUS_OPERATIONS');
      expect(interpretKokoroIntent('untegrando las fotos de los usuarios en cartas fifa', 'admin')).toBe('PHOTO_CARDS_INTEGRATION');
      expect(interpretKokoroIntent('cuántos leads y clases de prueba tenemos', 'admin')).toBe('LEADS_TRIALS');
      expect(interpretKokoroIntent('cuánto peso para la categoría medio pesado ibjjf', 'student')).toBe('COMPETITION_WEIGHT');
    });

    it('detecta GITHUB_OPEN_SOURCE_TOOLS y BUSINESS_GROWTH_MARKETING', () => {
      expect(interpretKokoroIntent('¿Qué repos o librerías en github recomiendas?', 'admin')).toBe('GITHUB_OPEN_SOURCE_TOOLS');
      expect(interpretKokoroIntent('estrategias de marketing para captar alumnos nuevos', 'admin')).toBe('BUSINESS_GROWTH_MARKETING');
    });
  });

  describe('Generador de Respuestas Grounded (generateKokoroResponse)', () => {
    const mockStudent: UserDomainModel = {
      uid: 'u_123',
      alias: 'Nico García',
      belt: 'BLUE',
      stripes: 2,
      beltSystem: 'ADULT',
      pricingTier: 'STD',
      accountStatus: 'ACTIVE',
      contactEmail: 'nico@example.com',
      stats: {
        tecnica: 82,
        guardia: 85,
        pase: 80,
        derribos: 75,
        finalizacion: 84,
        fuerza: 80,
        elasticidad: 70,
        leglocks: 65,
      },
    };

    it('responde a un alumno sobre su carta FIFA con su media OVR calculada', () => {
      const ctx: KokoroContext = {
        role: 'student',
        currentUser: mockStudent,
      };

      const res = generateKokoroResponse('FIFA_CARD_INFO', ctx);
      expect(res.badge).toBe('CARTA COLECCIONABLE');
      expect(res.text).toContain('Nico García');
      expect(res.text).toContain('OVR');
      expect(res.action?.type).toBe('SHOW_CARD');
    });

    it('responde a un admin con el conteo de alumnos en riesgo y acción de WhatsApp', () => {
      const ctx: KokoroContext = {
        role: 'admin',
        atRiskCount: 4,
      };

      const res = generateKokoroResponse('ATTENDANCE_RISK', ctx);
      expect(res.badge).toBe('RADAR ANTI-ABANDONO');
      expect(res.text).toContain('4 atleta(s)');
      expect(res.text).toContain('WhatsApp');
      expect(res.action?.type).toBe('SHOW_RISK_LIST');
    });

    it('informa sobre la regla sagrada de chanclas en el tatami', () => {
      const ctx: KokoroContext = { role: 'student' };
      const res = generateKokoroResponse('ETIQUETTE_RULES', ctx);
      expect(res.text).toContain('Chanclas SIEMPRE obligatorias');
      expect(res.text).toContain('Kimono limpio');
    });

    it('propone 4 mejoras clave de alto impacto cuando se le pide feedback', () => {
      const ctx: KokoroContext = { role: 'admin' };
      const res = generateKokoroResponse('IMPROVEMENTS_FEEDBACK', ctx);
      expect(res.badge).toBe('KAIZEN & MEJORAS 247');
      expect(res.text).toContain('Self-Service de Fotos');
      expect(res.text).toContain('Desafíos Semanales');
      expect(res.text).toContain('Gemini');
    });

    it('explica cómo dar de alta alumnos con pliego y control de menores', () => {
      const ctx: KokoroContext = { role: 'admin' };
      const res = generateKokoroResponse('STUDENT_ONBOARDING', ctx);
      expect(res.badge).toBe('ALTA DE ALUMNOS');
      expect(res.text).toContain('menor de 16 años');
      expect(res.action?.url).toBe('/admin/alta-alumno');
    });

    it('explica cómo pausar por lesión y muestra conteo de congelados', () => {
      const ctx: KokoroContext = { role: 'admin', frozenCount: 3 };
      const res = generateKokoroResponse('STUDENT_FREEZE_PAUSE', ctx);
      expect(res.badge).toBe('PAUSA POR LESIÓN');
      expect(res.text).toContain('3 atleta(s) en pausa');
      expect(res.action?.url).toBe('/admin/personal');
    });

    it('confirma autonomía operativa sin dependencia externa', () => {
      const ctx: KokoroContext = { role: 'admin' };
      const res = generateKokoroResponse('AUTONOMOUS_OPERATIONS', ctx);
      expect(res.badge).toBe('APP 100% AUTÓNOMA');
      expect(res.text).toContain('autonomía completa sin depender de ningún programador');
    });
  });
});

