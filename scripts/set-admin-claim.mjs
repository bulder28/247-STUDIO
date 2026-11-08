#!/usr/bin/env node

/**
 * Script de asignación de Custom Claims para 247Studio WebApp
 * Permite asignar roles (admin, coach, student, kiosk) por UID o por Email.
 *
 * Ejemplos de uso:
 *   node scripts/set-admin-claim.mjs
 *   node scripts/set-admin-claim.mjs nagorekaitz2008@gmail.com admin
 *   node scripts/set-admin-claim.mjs iOapIQTJCXamJni0v6FerYbdisk1 coach
 *   node scripts/set-admin-claim.mjs alumno@ejemplo.com student
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const VALID_ROLES = ['admin', 'coach', 'kiosk', 'student'];

// 1. Detección automática del archivo de credenciales de la Service Account
function getServiceAccountCredential() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && existsSync(envPath)) {
    return cert(JSON.parse(readFileSync(envPath, 'utf8')));
  }

  // Buscar archivos de Service Account en el directorio raíz del proyecto
  const files = readdirSync(process.cwd());
  const keyFile = files.find(
    (f) =>
      (f.includes('adminsdk') || f.includes('serviceAccount') || f.includes('studio-ff8d1')) &&
      f.endsWith('.json')
  );

  if (keyFile) {
    const fullPath = resolve(process.cwd(), keyFile);
    console.log(`[INFO] Usando clave de cuenta de servicio: ${keyFile}`);
    return cert(JSON.parse(readFileSync(fullPath, 'utf8')));
  }

  throw new Error(
    'No se encontró ningún archivo de clave de cuenta de servicio (*.json). Descarga la clave privada desde Firebase Console o define $env:GOOGLE_APPLICATION_CREDENTIALS.'
  );
}

// Inicializar Firebase Admin
if (getApps().length === 0) {
  try {
    const credential = getServiceAccountCredential();
    initializeApp({ credential });
  } catch (err) {
    console.error(`\n[ERROR DE CREDENCIALES] ${err.message}\n`);
    process.exit(1);
  }
}

const auth = getAuth();

// Limpiar posibles corchetes o símbolos '<' y '>' si el usuario los copió literalmente
const cleanArg = (arg) => (arg ? arg.replace(/[<>]/g, '').trim() : '');

const rawIdentifier = process.argv[2];
const rawRole = process.argv[3];

const identifier = cleanArg(rawIdentifier);
const role = cleanArg(rawRole)?.toLowerCase();

// Si no se proporcionan argumentos o se pasa --list, listar usuarios actuales
if (!identifier || identifier === '--list') {
  console.log('\n======================================================');
  console.log('       247 STUDIO — GESTIÓN DE ROLES (CUSTOM CLAIMS)   ');
  console.log('======================================================\n');
  console.log('Usuarios registrados en Firebase Authentication:\n');

  try {
    const listResult = await auth.listUsers(50);
    if (listResult.users.length === 0) {
      console.log('  (No hay usuarios registrados actualmente)');
    } else {
      listResult.users.forEach((u, i) => {
        const userRole = u.customClaims?.role || 'student (por defecto)';
        console.log(`  ${i + 1}. Email: ${u.email || '(sin email)'}`);
        console.log(`     UID:   ${u.uid}`);
        console.log(`     Rol:   ${userRole}`);
        console.log('  ----------------------------------------------------');
      });
    }

    console.log('\nInstrucciones para asignar o cambiar un rol:');
    console.log('  node scripts/set-admin-claim.mjs <EMAIL_O_UID> <ROL>\n');
    console.log('Roles disponibles:');
    console.log('  • admin   -> Acceso total (personal, caja, tarifas, configuración)');
    console.log('  • coach   -> Profesor (asistencia, tatami, alumnos; sin caja ni tarifas)');
    console.log('  • student -> Alumno estándar');
    console.log('  • kiosk   -> Terminal tablet de recepción (check-in)\n');
    console.log('Ejemplos válidos (SIN los caracteres < >):');
    console.log('  node scripts/set-admin-claim.mjs nagorekaitz2008@gmail.com admin');
    console.log('  node scripts/set-admin-claim.mjs profesor@247studio.com coach\n');
  } catch (err) {
    console.error('[ERROR] No se pudo obtener la lista de usuarios:', err.message);
  }
  process.exit(0);
}

// Validar que el rol sea uno de los permitidos
if (!role || !VALID_ROLES.includes(role)) {
  console.error(`\n[ERROR] El rol "${rawRole}" no es válido.`);
  console.error(`Roles válidos permitidos: ${VALID_ROLES.join(', ')}`);
  console.error('\nEjemplo correcto (sin los caracteres < >):');
  console.error(`  node scripts/set-admin-claim.mjs ${identifier} coach\n`);
  process.exit(1);
}

try {
  let targetUser;

  // Si contiene '@', buscar por email; si no, buscar por UID
  if (identifier.includes('@')) {
    targetUser = await auth.getUserByEmail(identifier);
  } else {
    targetUser = await auth.getUser(identifier);
  }

  // Asignar el custom claim
  await auth.setCustomUserClaims(targetUser.uid, { role });

  console.log('\n======================================================');
  console.log('  ✓ [ÉXITO] ROL ASIGNADO CORRECTAMENTE');
  console.log('======================================================');
  console.log(`  Email:        ${targetUser.email}`);
  console.log(`  UID:          ${targetUser.uid}`);
  console.log(`  Nuevo Rol:    ${role.toUpperCase()}`);
  console.log('======================================================\n');
  console.log('Aviso: El usuario verá el cambio la próxima vez que inicie');
  console.log('sesión o refresque su token en la app.\n');
  process.exit(0);
} catch (err) {
  if (err.code === 'auth/user-not-found') {
    console.error(`\n[ERROR] No se encontró ningún usuario con el identificador "${identifier}".`);
    console.error('Verifica que el usuario se haya registrado previamente en la app.\n');
  } else {
    console.error('\n[ERROR] No se pudo asignar el claim:', err.message || err);
  }
  process.exit(1);
}
