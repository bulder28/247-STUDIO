import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'studio-247-rules-test';

describe('Pruebas de Reglas de Seguridad (Firestore Emulator)', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rules = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // 1. Auto-registro y Menores de 16
  describe('Colección: users (Registro y Edición)', () => {
    it('deniega auto-registro a usuario menor de 16 años', async () => {
      const studentAuth = testEnv.authenticatedContext('student-minor', {
        email: 'minor@example.com',
        role: 'student',
      });
      const db = studentAuth.firestore();

      const userDoc = db.collection('users').doc('student-minor');
      await assertFails(
        userDoc.set({
          authEmail: 'minor@example.com',
          contactEmail: 'minor@example.com',
          alias: 'Kiddo',
          phone: '+34600000000',
          birthDate: '2015-05-10', // < 16 años
          isMinor: false,
          beltSystem: 'KIDS',
          belt: 'WHITE',
          stripes: 0,
          pricingTier: 'STD',
          activeTariffId: 'tariff-std',
          accountStatus: 'PENDING',
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    it('permite auto-registro a usuario mayor o igual a 16 años', async () => {
      const studentAuth = testEnv.authenticatedContext('student-adult', {
        email: 'adult@example.com',
        role: 'student',
      });
      const db = studentAuth.firestore();

      const userDoc = db.collection('users').doc('student-adult');
      await assertSucceeds(
        userDoc.set({
          authEmail: 'adult@example.com',
          contactEmail: 'adult@example.com',
          alias: 'Grappler',
          phone: '+34600000000',
          birthDate: '2000-01-01', // > 16 años
          isMinor: false,
          beltSystem: 'ADULT',
          belt: 'WHITE',
          stripes: 0,
          pricingTier: 'STD',
          activeTariffId: 'tariff-std',
          accountStatus: 'PENDING',
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    it('deniega al alumno modificar campos sensibles (belt, stripes, paymentStatusCache, waiver*)', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('student-1').set({
          authEmail: 'student@example.com',
          contactEmail: 'student@example.com',
          alias: 'Original',
          belt: 'WHITE',
          stripes: 0,
          accountStatus: 'ACTIVE',
          updatedAt: new Date(),
        });
      });

      const studentAuth = testEnv.authenticatedContext('student-1', { role: 'student' });
      const docRef = studentAuth.firestore().collection('users').doc('student-1');

      // Intentar subir a cinturón azul
      await assertFails(
        docRef.update({
          belt: 'BLUE',
          updatedAt: new Date(),
        })
      );

      // Intentar inyectar waiverSignedAt
      await assertFails(
        docRef.update({
          waiverSignedAt: new Date().toISOString(),
          updatedAt: new Date(),
        })
      );
    });
  });

  // 2. Pagos
  describe('Colección: payments', () => {
    it('deniega al alumno auto-asignar importes o aprobar su pago', async () => {
      const studentAuth = testEnv.authenticatedContext('student-1', { role: 'student' });
      const payRef = studentAuth.firestore().collection('payments').doc('pay-1');

      await assertFails(
        payRef.set({
          uid: 'student-1',
          period: '2026-11',
          method: 'BIZUM',
          status: 'APPROVED', // Debe ser PENDING_APPROVAL
          amountCents: 6500,  // Prohibido para alumno
          createdAt: new Date(),
        })
      );
    });

    it('deniega aprobación de PASS si admin no especifica sessionsIncluded > 0', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('payments').doc('pay-pass').set({
          uid: 'student-1',
          period: '2026-11',
          method: 'BIZUM',
          billingType: 'PASS',
          status: 'PENDING_APPROVAL',
          createdAt: new Date(),
        });
      });

      const adminAuth = testEnv.authenticatedContext('admin-1', { role: 'admin' });
      const payRef = adminAuth.firestore().collection('payments').doc('pay-pass');

      await assertFails(
        payRef.update({
          status: 'APPROVED',
          amountCents: 10000,
          baseCents: 8264,
          vatCents: 1736,
          validatedBy: 'admin-1',
          validatedAt: new Date(),
          // Falta sessionsIncluded
        })
      );
    });

    it('prohíbe el borrado de pagos a cualquier usuario, incluido admin', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('payments').doc('pay-indelible').set({
          uid: 'student-1',
          amountCents: 5000,
        });
      });

      const adminAuth = testEnv.authenticatedContext('admin-1', { role: 'admin' });
      await assertFails(
        adminAuth.firestore().collection('payments').doc('pay-indelible').delete()
      );
    });
  });

  // 3. Kiosco y Check-in
  describe('Colección: bookings (Kiosco vs Alumno)', () => {
    it('permite al rol kiosk crear un booking con status ATTENDED y checkInSource TABLET', async () => {
      const kioskAuth = testEnv.authenticatedContext('tablet-frontdesk', { role: 'kiosk' });
      const bookingRef = kioskAuth.firestore().collection('bookings').doc('book-kiosk-1');

      await assertSucceeds(
        bookingRef.set({
          uid: 'student-any',
          scheduleId: 'sched-1',
          date: '2026-11-06',
          status: 'ATTENDED',
          sessionType: 'PARTICIPANT',
          attendanceWeight: 1.0,
          checkInSource: 'TABLET',
          createdAt: new Date(),
        })
      );
    });

    it('deniega al rol kiosk crear booking con origen APP o estado distinto a ATTENDED', async () => {
      const kioskAuth = testEnv.authenticatedContext('tablet-frontdesk', { role: 'kiosk' });
      const bookingRef = kioskAuth.firestore().collection('bookings').doc('book-kiosk-bad');

      await assertFails(
        bookingRef.set({
          uid: 'student-any',
          status: 'BOOKED', // Prohibido para kiosco
          checkInSource: 'TABLET',
          createdAt: new Date(),
        })
      );
    });
  });

  // 4. Leads y Honeypot
  describe('Colección: leads (Público)', () => {
    it('permite a un usuario anónimo crear un lead legítimo con honeypot vacío', async () => {
      const anonAuth = testEnv.unauthenticatedContext();
      const leadRef = anonAuth.firestore().collection('leads').doc('lead-1');

      await assertSucceeds(
        leadRef.set({
          name: 'Carlos Gomez',
          email: 'carlos@example.com',
          phone: '+34655443322',
          scheduleId: 'sched-trial-1',
          status: 'NEW',
          honeypot: '',
          createdAt: new Date(),
        })
      );
    });

    it('deniega la creación de un lead si el honeypot contiene texto (bot detectado)', async () => {
      const anonAuth = testEnv.unauthenticatedContext();
      const leadRef = anonAuth.firestore().collection('leads').doc('lead-bot');

      await assertFails(
        leadRef.set({
          name: 'Spam Bot',
          email: 'spam@bot.net',
          phone: '123456789',
          scheduleId: 'sched-1',
          status: 'NEW',
          honeypot: 'http://spam-link.ru',
          createdAt: new Date(),
        })
      );
    });
  });
});
