/**
 * Helper compartido para inicializar Firebase Admin en Netlify Functions
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminApp() {
  if (getApps().length > 0) {
    return {
      auth: getAuth(),
      db: getFirestore(),
    };
  }

  let credential;

  // 1. Variable de entorno FIREBASE_SERVICE_ACCOUNT (JSON string o base64 en producción Netlify)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      const parsed = raw.startsWith('{')
        ? JSON.parse(raw)
        : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      credential = cert(parsed);
    } catch (e) {
      console.warn('Fallo parseando FIREBASE_SERVICE_ACCOUNT:', e.message);
    }
  }

  // 2. Variable GOOGLE_APPLICATION_CREDENTIALS
  if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      credential = cert(JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')));
    }
  }

  // 3. Archivo local de service account en la raíz
  if (!credential) {
    try {
      const files = readdirSync(process.cwd());
      const keyFile = files.find(
        (f) =>
          (f.includes('adminsdk') || f.includes('serviceAccount') || f.includes('studio-ff8d1')) &&
          f.endsWith('.json')
      );
      if (keyFile) {
        const fullPath = resolve(process.cwd(), keyFile);
        credential = cert(JSON.parse(readFileSync(fullPath, 'utf8')));
      }
    } catch {}
  }

  if (!credential) {
    throw new Error('No se encontraron credenciales de Firebase Admin SDK.');
  }

  initializeApp({ credential });

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

