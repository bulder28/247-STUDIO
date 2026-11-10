/**
 * Verificación SOLO LECTURA del acceso con Google y estado de fichas en 247Studio.
 * No modifica ningún dato en Firestore ni en Firebase Auth.
 *
 * Uso (desde la raíz del repo, con firebase-admin instalado):
 *   node verificar-fichas.mjs ruta/a/serviceAccount.json
 */
import { existsSync, readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const keyPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath || !existsSync(keyPath)) {
  console.error('❌ Indica una ruta válida a la cuenta de servicio:\n   node verificar-fichas.mjs ruta/serviceAccount.json');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
} catch (err) {
  console.error('❌ Error al leer o parsear el archivo JSON de credenciales:', err.message);
  process.exit(1);
}

const auth = getAuth();
const db = getFirestore();

const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');
const emailOf = (u) => normEmail(u.authEmail) || normEmail(u.contactEmail);

console.log('⏳ Descargando colección "users" y usuarios de Firebase Auth...');

const usersSnap = await db.collection('users').get();
const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const usersById = new Map(users.map((u) => [u.id, u]));

// Clasificación de fichas en Firestore
const allProvisional = users.filter((u) => u.id.startsWith('usr_'));
const provisionalUnclaimed = allProvisional.filter((u) => !u.claimedBy);
const provisionalClaimed = allProvisional.filter((u) => Boolean(u.claimedBy));
const standardUsers = users.filter((u) => !u.id.startsWith('usr_'));

// Índice de todos los emails (tanto en fichas definitivas como provisionales no reclamadas)
const activeDocsByEmail = new Map();
for (const u of [...standardUsers, ...provisionalUnclaimed]) {
  const primary = emailOf(u);
  if (primary) {
    activeDocsByEmail.set(primary, [...(activeDocsByEmail.get(primary) || []), u]);
  }
}

// Índice exclusivo de fichas provisionales pendientes por email
const provUnclaimedByEmail = new Map();
for (const u of provisionalUnclaimed) {
  const e = emailOf(u);
  if (e) {
    provUnclaimedByEmail.set(e, [...(provUnclaimedByEmail.get(e) || []), u]);
  }
}

// 1. Análisis de fichas provisionales pendientes
const sinEmail = [];
const ambiguasEntreProvisionales = [];
const colisionConFichaActiva = [];
const vinculablesLimpias = [];

for (const u of provisionalUnclaimed) {
  const e = emailOf(u);
  if (!e) {
    sinEmail.push(u);
    continue;
  }

  const sameEmailProv = provUnclaimedByEmail.get(e) || [];
  const allDocsWithEmail = activeDocsByEmail.get(e) || [];
  const hasStandardDoc = allDocsWithEmail.some((doc) => !doc.id.startsWith('usr_'));

  if (sameEmailProv.length > 1) {
    ambiguasEntreProvisionales.push(u);
  } else if (hasStandardDoc) {
    colisionConFichaActiva.push(u);
  } else {
    vinculablesLimpias.push(u);
  }
}

// Verificar si alguna ficha usr_ marcada con claimedBy apunta a un UID inexistente
const claimedHuerfanas = provisionalClaimed.filter((u) => !usersById.has(u.claimedBy));

console.log('\n================================================================');
console.log(' 📊 RESUMEN DE FICHAS EN FIRESTORE (colección: users)');
console.log('================================================================');
console.log(`Fichas totales en Firestore      : ${users.length}`);
console.log(`  ├─ Fichas con UID definitivo   : ${standardUsers.length}`);
console.log(`  ├─ Provisionales ya reclamadas : ${provisionalClaimed.length}${claimedHuerfanas.length ? ` (⚠️ ${claimedHuerfanas.length} apuntan a un UID que no existe)` : ''}`);
console.log(`  └─ Provisionales pendientes    : ${provisionalUnclaimed.length}`);

console.log(`\n🔍 DESGLOSE DE PROVISIONALES PENDIENTES (${provisionalUnclaimed.length}):`);

console.log(`\n  ✅ VINCULABLES LIMPIAS (${vinculablesLimpias.length}):`);
vinculablesLimpias.forEach((u) =>
  console.log(`      - ${u.id.padEnd(24)} | ${emailOf(u).padEnd(32)} | (${u.alias || 'sin alias'})`)
);

console.log(`\n  ⚠️ AMBIGUAS ENTRE PROVISIONALES - Mismo email en >1 ficha usr_ (${ambiguasEntreProvisionales.length}):`);
ambiguasEntreProvisionales.forEach((u) =>
  console.log(`      - ${u.id.padEnd(24)} | ${emailOf(u).padEnd(32)} | (${u.alias || 'sin alias'})`)
);

console.log(`\n  🚨 COLISIÓN CON FICHA YA ACTIVA - Ya existe un usuario con UID y ese mismo email (${colisionConFichaActiva.length}):`);
colisionConFichaActiva.forEach((u) => {
  const conflicto = (activeDocsByEmail.get(emailOf(u)) || []).find((d) => !d.id.startsWith('usr_'));
  console.log(`      - ${u.id.padEnd(24)} | ${emailOf(u).padEnd(32)} | (${u.alias || 'sin alias'}) -> Conflicto con UID: ${conflicto?.id}`);
});

console.log(`\n  ❌ SIN EMAIL - Nunca podrán vincularse solas (${sinEmail.length}):`);
sinEmail.forEach((u) =>
  console.log(`      - ${u.id.padEnd(24)} | (${u.alias || 'sin alias'})`)
);

if (claimedHuerfanas.length > 0) {
  console.log(`\n  👻 RECLAMADAS HUÉRFANAS - Tienen claimedBy pero no existe el doc destino (${claimedHuerfanas.length}):`);
  claimedHuerfanas.forEach((u) =>
    console.log(`      - ${u.id.padEnd(24)} | claimedBy: ${u.claimedBy} | (${u.alias || 'sin alias'})`)
  );
}

// 2. Auditoría de Firebase Authentication (Cuentas Google)
console.log('\n================================================================');
console.log(' 🔐 CUENTAS DE ACCESO CON GOOGLE (Firebase Auth)');
console.log('================================================================');

let sinFichaCount = 0;
let conFichaCount = 0;
let totalGoogle = 0;
const authUsersByEmail = new Set();
let pageToken;

do {
  const page = await auth.listUsers(1000, pageToken);
  for (const au of page.users) {
    const email = normEmail(au.email);
    if (email) authUsersByEmail.add(email);

    if (!au.providerData.some((p) => p.providerId === 'google.com')) continue;
    totalGoogle += 1;

    const fichaDirecta = usersById.get(au.uid);
    if (fichaDirecta) {
      conFichaCount += 1;
      continue;
    }

    sinFichaCount += 1;
    const candidatosProv = provUnclaimedByEmail.get(email) || [];

    let diagnostico = '📝 Tendrá que completar su ficha desde cero en /registro';
    if (candidatosProv.length === 1) {
      diagnostico = `✅ Se vinculará automáticamente con ${candidatosProv[0].id} (${candidatosProv[0].alias || 'sin alias'})`;
    } else if (candidatosProv.length > 1) {
      const ids = candidatosProv.map((c) => c.id).join(', ');
      diagnostico = `⚠️ BLOQUEADO POR AMBIGÜEDAD: Hay ${candidatosProv.length} fichas provisionales con su email (${ids})`;
    }

    console.log(`  • UID: ${au.uid} | ${email.padEnd(32)} -> ${diagnostico}`);
  }
  pageToken = page.pageToken;
} while (pageToken);

console.log(`\nResumen Auth Google: ${totalGoogle} totales | ${conFichaCount} con ficha activa | ${sinFichaCount} pendientes de ficha`);

// 3. Información extra: Fichas vinculables cuyo dueño aún no ha iniciado sesión nunca con Google
const pendientesDePrimerLogin = vinculablesLimpias.filter((u) => !authUsersByEmail.has(emailOf(u)));
console.log(`Alumnos con ficha provisional lista que aún NO han entrado nunca con Google: ${pendientesDePrimerLogin.length}`);

console.log('\n✔ Auditoría completada. No se ha modificado ningún dato.');