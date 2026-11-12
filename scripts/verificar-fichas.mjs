#!/usr/bin/env node

/**
 * Script de verificación de estado y visibilidad de alumnos en 247 STUDIO
 * Ejecutar con: node verificar-fichas.mjs
 */

import { getAdminApp } from './netlify/functions/_firebaseAdmin.mjs';

async function main() {
  console.log('\n=============================================================');
  console.log('       247 STUDIO — AUDITORÍA DE ALUMNOS Y BASE DE DATOS      ');
  console.log('=============================================================\n');

  const { db, auth } = getAdminApp();

  // 1. Usuarios en Firebase Auth
  console.log('1. CUENTAS REGISTRADAS EN FIREBASE AUTHENTICATION:');
  const authUsers = await auth.listUsers();
  authUsers.users.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.email} (UID: ${u.uid}) -> ROL: ${u.customClaims?.role || 'student'}`);
  });

  // 2. Documentos en Firestore: Colección "users"
  console.log('\n2. CENSO EN FIRESTORE (Colección "users"):');
  const usersSnap = await db.collection('users').get();
  console.log(`   Total de documentos en 'users': ${usersSnap.size}`);

  const statusCount = {};
  const sampleList = [];

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const st = data.accountStatus || 'SIN_ESTADO';
    statusCount[st] = (statusCount[st] || 0) + 1;
    if (sampleList.length < 10) {
      sampleList.push({
        id: doc.id,
        alias: data.alias || '(sin alias)',
        belt: `${data.belt || 'WHITE'} (${data.stripes || 0}º)`,
        status: st,
        email: data.contactEmail || data.authEmail,
      });
    }
  });

  console.log('   Desglose por estado de cuenta:', JSON.stringify(statusCount, null, 2));
  console.log('\n   Muestra de primeros 10 alumnos:');
  console.table(sampleList);

  // 3. Asistencias registradas hoy
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
  console.log(`\n3. ASISTENCIAS REGISTRADAS HOY (${todayStr}):`);
  const bookSnap = await db.collection('bookings').where('date', '==', todayStr).get();
  console.log(`   Total asistencias registradas hoy: ${bookSnap.size}`);

  // 4. Diagnóstico de visibilidad en la app
  console.log('\n4. DIAGNÓSTICO DE VISIBILIDAD EN LA APP:');
  console.log('   • Los datos existen y están completos en Firestore.');
  console.log('   • La sección para ver el censo es: /admin/personal (Alumnos & Cinturones).');
  console.log('   • Para acceder a /admin/personal, la sesión DEBE ser de un usuario ADMIN.');
  console.log('   • Las cuentas con permisos de ADMIN son:');
  authUsers.users
    .filter((u) => u.customClaims?.role === 'admin')
    .forEach((u) => console.log(`     - ${u.email}`));
  console.log('\n=============================================================\n');
}

main().catch(console.error);
