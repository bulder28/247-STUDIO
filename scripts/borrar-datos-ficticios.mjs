#!/usr/bin/env node

/**
 * Borra de Firestore los datos ficticios de siembra y los registros de reserva antiguos.
 *
 * Por defecto es una SIMULACIÓN: solo cuenta y lista lo que se borraría.
 * Para borrar de verdad hay que pasar --confirmar.
 *
 * Qué borra:
 *   - users/mock-student-NN y kiosk_members/mock-student-NN (NN = 01..30)
 *   - payments y freezes cuyo uid empieza por "mock-student-"
 *   - bookings cuyo uid empieza por "mock-student-"
 *   - bookings con estado de reserva antiguo: BOOKED, WAITLISTED, CANCELLED, NO_SHOW
 *   - (opcional, --incluir-leads) leads lead-01, lead-02 y lead-03 del seed
 *
 * Credenciales: variable GOOGLE_APPLICATION_CREDENTIALS con la ruta a la clave de servicio.
 * Si FIRESTORE_EMULATOR_HOST está definida, apunta al emulator y no usa credenciales.
 *
 * Uso (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\clave.json"
 *   node scripts/borrar-datos-ficticios.mjs                    # simulación
 *   node scripts/borrar-datos-ficticios.mjs --confirmar        # borra
 *   node scripts/borrar-datos-ficticios.mjs --incluir-leads    # añade los 3 leads del seed
 */

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.FIRESTORE_EMULATOR_HOST ? 'demo-247studio' : 'studio-ff8d1';
const MOCK_PREFIX = 'mock-student-';
const OLD_BOOKING_STATUSES = ['BOOKED', 'WAITLISTED', 'CANCELLED', 'NO_SHOW'];
const SEED_LEAD_IDS = ['lead-01', 'lead-02', 'lead-03'];

const args = new Set(process.argv.slice(2));
const confirm = args.has('--confirmar');
const includeLeads = args.has('--incluir-leads');

const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (!useEmulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('[ERROR] Define GOOGLE_APPLICATION_CREDENTIALS con la ruta a la clave de servicio.');
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp(
    useEmulator ? { projectId: PROJECT_ID } : { projectId: PROJECT_ID, credential: applicationDefault() },
  );
}
const db = getFirestore();

/** Refs of every document that would be deleted, keyed by an absolute path to dedupe. */
const targets = new Map();
const countsByGroup = {};

function add(group, ref) {
  targets.set(ref.path, ref);
  countsByGroup[group] = (countsByGroup[group] ?? 0) + 1;
}

async function collectMockStudentDocs(collectionName) {
  for (let i = 1; i <= 30; i++) {
    const id = `${MOCK_PREFIX}${String(i).padStart(2, '0')}`;
    const ref = db.collection(collectionName).doc(id);
    if ((await ref.get()).exists) add(collectionName, ref);
  }
}

async function collectByUidPrefix(collectionName) {
  const snap = await db
    .collection(collectionName)
    .where('uid', '>=', MOCK_PREFIX)
    .where('uid', '<', `${MOCK_PREFIX}\uf8ff`)
    .get();
  snap.docs.forEach((d) => add(`${collectionName} (uid mock)`, d.ref));
}

async function collectOldBookings() {
  const snap = await db.collection('bookings').where('status', 'in', OLD_BOOKING_STATUSES).get();
  snap.docs.forEach((d) => add('bookings (estado de reserva antiguo)', d.ref));
}

async function collectLeads() {
  for (const id of SEED_LEAD_IDS) {
    const ref = db.collection('leads').doc(id);
    if ((await ref.get()).exists) add('leads (seed)', ref);
  }
}

async function main() {
  console.log(`[INFO] Proyecto: ${PROJECT_ID}${useEmulator ? ' (EMULATOR)' : ''}`);
  console.log(`[INFO] Modo: ${confirm ? 'BORRADO REAL' : 'SIMULACIÓN (no se borra nada)'}\n`);

  await collectMockStudentDocs('users');
  await collectMockStudentDocs('kiosk_members');
  await collectByUidPrefix('payments');
  await collectByUidPrefix('freezes');
  await collectByUidPrefix('bookings');
  await collectOldBookings();
  if (includeLeads) await collectLeads();

  console.log('Documentos a borrar por grupo:');
  for (const [group, n] of Object.entries(countsByGroup)) console.log(`  - ${group}: ${n}`);
  console.log(`Total (sin duplicados): ${targets.size}\n`);

  if (targets.size === 0) {
    console.log('[OK] No hay nada que borrar.');
    return;
  }

  if (!confirm) {
    for (const path of [...targets.keys()].slice(0, 40)) console.log(`  ${path}`);
    if (targets.size > 40) console.log(`  ... y ${targets.size - 40} más`);
    console.log('\n[SIMULACIÓN] No se ha borrado nada. Repite con --confirmar para borrar.');
    return;
  }

  const writer = db.bulkWriter();
  let failed = 0;
  writer.onWriteError((err) => {
    failed++;
    console.error(`[ERROR] ${err.documentRef.path}: ${err.message}`);
    return false;
  });
  for (const ref of targets.values()) writer.delete(ref);
  await writer.close();

  console.log(`[OK] Borrados ${targets.size - failed} de ${targets.size} documentos.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
