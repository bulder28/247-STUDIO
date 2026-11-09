import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'studio-ff8d1.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'studio-ff8d1',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'studio-ff8d1.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '29457860873',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:29457860873:web:5204aa86cf27d1944cebd8',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Auto-detecta si la conexión en streaming de Firestore está bloqueada (antivirus, proxies, extensiones)
// y cambia sola a long-polling, evitando el "client is offline" que dejaba la app esperando.
function createDb() {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}
export const db = createDb();

// Conexión a Emuladores locales si VITE_USE_EMULATORS es true
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}
