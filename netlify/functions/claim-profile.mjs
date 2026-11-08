/**
 * Netlify Function: claim-profile
 * Vincula la cuenta de acceso (p. ej. Google) de un alumno con su ficha pre-registrada por el gimnasio.
 *
 * Caso que resuelve: el administrador dio de alta al alumno con un id provisional ("usr_...") y ahora el
 * alumno entra por primera vez con Google. Su uid real es distinto, así que no encontraría su ficha.
 *
 * Seguridad: solo actúa si el token es válido, el email está verificado por el proveedor (Google lo verifica)
 * y existe EXACTAMENTE una ficha provisional con ese email. Guarda copia de la ficha original en audit_logs.
 */
import { getAdminApp } from './_firebaseAdmin.mjs';

const REF_COLLECTIONS = ['payments', 'bookings', 'freezes'];

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function rekeyReferences(adminDb, oldUid, newUid) {
  for (const col of REF_COLLECTIONS) {
    const snap = await adminDb.collection(col).where('uid', '==', oldUid).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = adminDb.batch();
      snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { uid: newUid }));
      await batch.commit();
    }
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { status: 'error', error: 'Use POST.' });

  let adminAuth, adminDb;
  try {
    ({ auth: adminAuth, db: adminDb } = getAdminApp());
  } catch (err) {
    return json(503, { status: 'error', error: 'Servicio de administración no disponible.' });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return json(401, { status: 'error', error: 'Falta token.' });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return json(401, { status: 'error', error: 'Token inválido o caducado.' });
  }

  const uid = decoded.uid;
  const email = (decoded.email || '').trim().toLowerCase();
  if (!email || decoded.email_verified !== true) {
    return json(200, { status: 'none', reason: 'email-not-verified' });
  }

  try {
    const mine = await adminDb.collection('users').doc(uid).get();
    if (mine.exists) return json(200, { status: 'exists' });

    // Fichas provisionales (creadas por el gimnasio con id "usr_...") que coinciden con este email
    const found = new Map();
    for (const field of ['authEmail', 'contactEmail']) {
      const snap = await adminDb.collection('users').where(field, '==', email).get();
      snap.forEach((d) => {
        const data = d.data();
        if (d.id !== uid && d.id.startsWith('usr_') && !data.claimedBy) found.set(d.id, d);
      });
    }

    if (found.size === 0) return json(200, { status: 'none' });
    if (found.size > 1) return json(200, { status: 'ambiguous' });

    const [oldId, oldDoc] = [...found.entries()][0];
    const oldData = oldDoc.data();
    const nowIso = new Date().toISOString();

    // 1) Nueva ficha con el uid real
    await adminDb.collection('users').doc(uid).set({
      ...oldData,
      uid,
      authEmail: email,
      linkedFromUid: oldId,
      updatedAt: nowIso,
    });

    // 2) Directorio del kiosco
    const oldKiosk = await adminDb.collection('kiosk_members').doc(oldId).get();
    if (oldKiosk.exists) {
      await adminDb.collection('kiosk_members').doc(uid).set({ ...oldKiosk.data(), uid, updatedAt: nowIso });
    }

    // 3) Pagos, reservas y congelaciones pasan al uid real
    await rekeyReferences(adminDb, oldId, uid);

    // 4) Copia de seguridad para poder revertir y retirada de la ficha provisional
    await adminDb.collection('audit_logs').add({
      action: 'CLAIM_PROFILE',
      performedBy: uid,
      fromUid: oldId,
      toUid: uid,
      email,
      previousUserDoc: oldData,
      previousKioskDoc: oldKiosk.exists ? oldKiosk.data() : null,
      timestamp: nowIso,
    });
    if (oldKiosk.exists) await oldKiosk.ref.delete();
    await oldDoc.ref.delete();

    return json(200, { status: 'claimed' });
  } catch (err) {
    console.error('Error en claim-profile:', err);
    return json(500, { status: 'error', error: 'No se pudo vincular la ficha.' });
  }
}
