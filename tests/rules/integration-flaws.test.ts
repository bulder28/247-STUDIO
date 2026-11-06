import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'studio-247-flaws-test';

describe('Reproducción de Fallos de Integración con firestore.rules', () => {
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

    // Precargar datos con contexto de administración (bypasseando reglas)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      // 1. Alumno activo con notas médicas
      await db.collection('users').doc('student-1').set({
        uid: 'student-1',
        authEmail: 'student1@example.com',
        alias: 'Luchador Uno',
        phone: '+34600000001',
        accountStatus: 'ACTIVE',
        pricingTier: 'STD',
        belt: 'BLUE',
        stripes: 2,
        medicalNotes: 'Asmático leve',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      // 2. Reserva existente de otro alumno
      await db.collection('bookings').doc('booking-other').set({
        id: 'booking-other',
        uid: 'student-2',
        scheduleId: 'sched-1',
        date: '2026-11-10',
        status: 'BOOKED',
        createdAt: '2026-11-01T10:00:00Z',
      });

      // 3. Pago ya aprobado
      await db.collection('payments').doc('pay-approved-1').set({
        id: 'pay-approved-1',
        uid: 'student-1',
        amountCents: 6500,
        status: 'APPROVED',
        period: '2026-11',
        method: 'CASH',
        createdAt: '2026-11-01T10:00:00Z',
      });
    });
  });

  // FALLO 1: KIOSCO NO PUEDE BUSCAR NI LEER ALUMNOS EN USERS
  it('FALLO 1: El rol kiosk es bloqueado al intentar buscar o leer alumnos en users', async () => {
    const kioskAuth = testEnv.authenticatedContext('tablet-recepcion', {
      email: 'kiosk@247studiobjj.com',
      role: 'kiosk',
    });
    const db = kioskAuth.firestore();

    // El kiosco intenta leer el perfil del alumno que va a hacer check-in
    const readOp = db.collection('users').doc('student-1').get();

    // ACTUALMENTE: Falla porque la regla exige isOwner o isAdmin
    await assertFails(readOp);
  });

  // FALLO 2: EL ALUMNO NO PUEDE LEER TODAS LAS RESERVAS DE UN DÍA PARA CALCULAR AFORO
  it('FALLO 2: El alumno es bloqueado al consultar las reservas globales de un día para el aforo', async () => {
    const studentAuth = testEnv.authenticatedContext('student-1', {
      email: 'student1@example.com',
      role: 'student',
    });
    const db = studentAuth.firestore();

    // SchedulePage intenta consultar todas las reservas de la fecha para ver si la clase está llena
    const globalBookingsQuery = db
      .collection('bookings')
      .where('date', '==', '2026-11-10')
      .get();

    // ACTUALMENTE: Falla con PERMISSION_DENIED porque las reservas ajenas no son suyas
    await assertFails(globalBookingsQuery);
  });

  // FALLO 3: EL ALUMNO NO PUEDE FIRMAR EL WAIVER DESDE SU PERFIL
  it('FALLO 3: El alumno es bloqueado al intentar actualizar campos waiver* en su perfil', async () => {
    const studentAuth = testEnv.authenticatedContext('student-1', {
      email: 'student1@example.com',
      role: 'student',
    });
    const db = studentAuth.firestore();

    // ProfilePage intenta guardar la firma digital SVG del waiver
    const waiverSignOp = db.collection('users').doc('student-1').update({
      waiverVersion: 'v1.0',
      waiverSignedAt: '2026-11-06T20:00:00Z',
      waiverSignatureSvg: '<svg viewBox="0 0 100 100"><path d="M10 10 L50 50" /></svg>',
      updatedAt: '2026-11-06T20:00:00Z',
    });

    // ACTUALMENTE: Falla porque hasOnly(...) no incluye waiverVersion ni waiverSignedAt
    await assertFails(waiverSignOp);
  });

  // FALLO 4: NO HAY REGLAS PARA FREEZEREQUESTS (SOLICITUD DE SUSPENSIÓN TEMPORAL)
  it('FALLO 4: La colección freezeRequests carece de reglas y bloquea cualquier solicitud del alumno', async () => {
    const studentAuth = testEnv.authenticatedContext('student-1', {
      email: 'student1@example.com',
      role: 'student',
    });
    const db = studentAuth.firestore();

    // ProgramsPage intenta crear una solicitud de congelación
    const freezeOp = db.collection('freezeRequests').doc('freeze-req-1').set({
      uid: 'student-1',
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      reason: 'Lesión de ligamento cruzado',
      status: 'PENDING_ADMIN',
      createdAt: '2026-11-06T20:00:00Z',
    });

    // ACTUALMENTE: Falla porque no hay match /freezeRequests en firestore.rules
    await assertFails(freezeOp);
  });

  // FALLO 5: EL ADMIN PUEDE ALTERAR UN PAGO YA APROBADO (VIOLACIÓN DE AUDITORÍA)
  it('FALLO 5: Las reglas actuales permiten al admin alterar un pago APPROVED (debe ser inmutable)', async () => {
    const adminAuth = testEnv.authenticatedContext('admin-mario', {
      email: 'mario@247studiobjj.com',
      role: 'admin',
    });
    const db = adminAuth.firestore();

    // El admin intenta cambiar el importe o reabrir un pago que ya estaba cerrado y auditado
    const modifyApprovedPayment = db.collection('payments').doc('pay-approved-1').update({
      amountCents: 4500,
      status: 'PENDING_APPROVAL',
      updatedAt: '2026-11-06T20:00:00Z',
    });

    // ACTUALMENTE: Las reglas tienen "allow create, update: if isAdmin();" sin restricción,
    // por lo que esto SUCEDE (assertSucceeds), violando el contrato de inmutabilidad del spec.
    await assertSucceeds(modifyApprovedPayment);
  });
});

