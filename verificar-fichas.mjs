/**
 * Verificación SOLO LECTURA del acceso con Google en 247Studio. No modifica nada.
 *
 * Uso (desde la raíz del repo, con firebase-admin instalado):
 *   node verificar-fichas.mjs ruta/a/serviceAccount.json
 *
 * Informa de:
 *  - fichas provisionales "usr_..." (las que no pueden entrar) y si claim-profile las vincularía
 *  - emails repetidos entre fichas (caso "ambiguo": claim-profile no actúa)
 *  - fichas provisionales sin email (nunca podrán vincularse)
 *  - cuentas de acceso con proveedor Google y si tienen ficha
 */
import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const keyPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error('Indica la ruta a la cuenta de servicio: node verificar-fichas.mjs ruta/serviceAccount.json');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const auth = getAuth();
const db = getFirestore();

const usersSnap = await db.collection('users').get();
const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const emailOf = (u) => (u.authEmail || u.contactEmail || '').trim().toLowerCase();

const provisional = users.filter((u) => u.id.startsWith('usr_') && !u.claimedBy);
const byEmail = new Map();
for (const u of users) {
  const e = emailOf(u);
  if (e) byEmail.set(e, [...(byEmail.get(e) || []), u.id]);
}

console.log(`\nFichas totales: ${users.length}`);
console.log(`Fichas provisionales (usr_...): ${provisional.length}`);

const sinEmail = provisional.filter((u) => !emailOf(u));
const ambiguas = provisional.filter((u) => emailOf(u) && byEmail.get(emailOf(u)).filter((id) => id.startsWith('usr_')).length > 1);
const vinculables = provisional.filter((u) => emailOf(u) && !ambiguas.includes(u));

console.log(`  - vinculables al entrar con Google: ${vinculables.length}`);
vinculables.forEach((u) => console.log(`      ${u.id}  ${emailOf(u)}  (${u.alias || 'sin alias'})`));
console.log(`  - AMBIGUAS (mismo email en varias fichas, no se vinculan): ${ambiguas.length}`);
ambiguas.forEach((u) => console.log(`      ${u.id}  ${emailOf(u)}  (${u.alias || 'sin alias'})`));
console.log(`  - SIN EMAIL (nunca podrán entrar): ${sinEmail.length}`);
sinEmail.forEach((u) => console.log(`      ${u.id}  (${u.alias || 'sin alias'})`));

console.log('\nCuentas de acceso con Google:');
let sinFicha = 0;
let total = 0;
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  for (const au of page.users) {
    if (!au.providerData.some((p) => p.providerId === 'google.com')) continue;
    total += 1;
    const tieneFicha = usersSnap.docs.some((d) => d.id === au.uid);
    if (!tieneFicha) {
      sinFicha += 1;
      const email = (au.email || '').toLowerCase();
      const posible = provisional.some((u) => emailOf(u) === email);
      console.log(`  SIN FICHA: ${au.uid}  ${au.email}  -> ${posible ? 'se vinculará con su ficha provisional' : 'tendrá que completar su ficha en /registro'}`);
    }
  }
  pageToken = page.pageToken;
} while (pageToken);
console.log(`  Total con Google: ${total}, sin ficha: ${sinFicha}`);
console.log('\nListo. No se ha modificado ningún dato.');
