#!/usr/bin/env node

/**
 * Script de asignación de Custom Claims para 247Studio WebApp
 * Uso:
 *   node scripts/set-admin-claim.mjs <uid> <role: admin|kiosk|student>
 *
 * Requiere GOOGLE_APPLICATION_CREDENTIALS configurado con la Service Account del proyecto.
 */

import admin from 'firebase-admin';

const [uid, role] = process.argv.slice(2);

const VALID_ROLES = ['admin', 'kiosk', 'student'];

if (!uid || !role || !VALID_ROLES.includes(role)) {
  console.error('Uso incorrecto.');
  console.error('Ejemplo: node scripts/set-admin-claim.mjs <UID> <admin|kiosk|student>');
  process.exit(1);
}

try {
  admin.initializeApp();

  await admin.auth().setCustomUserClaims(uid, { role });
  console.log(`[OK] Custom claim 'role = ${role}' asignado con éxito al usuario: ${uid}`);

  const user = await admin.auth().getUser(uid);
  console.log('Claims actuales del usuario:', user.customClaims);
  process.exit(0);
} catch (error) {
  console.error('[ERROR] No se pudo asignar el claim:', error);
  process.exit(1);
}
