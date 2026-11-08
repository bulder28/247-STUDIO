/**
 * Helper compartido para inicializar Firebase Admin en Netlify Functions
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
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

  // 3. Archivo local de service account en __dirname o process.cwd()
  if (!credential) {
    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const searchDirs = [
        currentDir,
        resolve(currentDir, '..'),
        resolve(currentDir, '..', '..'),
        process.cwd(),
      ];

      for (const dir of searchDirs) {
        if (!existsSync(dir)) continue;
        const directKey = resolve(dir, 'studio-ff8d1-firebase-adminsdk-fbsvc-b730cf5be9.json');
        if (existsSync(directKey)) {
          credential = cert(JSON.parse(readFileSync(directKey, 'utf8')));
          break;
        }

        const files = readdirSync(dir);
        const keyFile = files.find(
          (f) =>
            (f.includes('adminsdk') || f.includes('serviceAccount') || f.includes('studio-ff8d1')) &&
            f.endsWith('.json')
        );
        if (keyFile) {
          const fullPath = resolve(dir, keyFile);
          credential = cert(JSON.parse(readFileSync(fullPath, 'utf8')));
          break;
        }
      }
    } catch (fsErr) {
      console.warn('Aviso buscando archivo de credenciales local:', fsErr.message);
    }
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
