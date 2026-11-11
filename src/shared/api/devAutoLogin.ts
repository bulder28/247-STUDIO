import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Dev-only convenience: signs in a local test account against the Firebase emulators.
 * Only ever loaded behind an `import.meta.env.DEV` guard in main.tsx, so it is not part of
 * production bundles. It additionally refuses to run unless the emulators are enabled.
 */
export function startDevAutoLogin(): void {
  if (import.meta.env.DEV !== true) return;
  if (import.meta.env.VITE_USE_EMULATORS !== 'true') return;

  const email = import.meta.env.VITE_DEV_AUTOLOGIN_EMAIL;
  const password = import.meta.env.VITE_DEV_AUTOLOGIN_PASSWORD;
  if (!email || !password) return;

  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    // Auth state has resolved: only act once.
    unsubscribe();
    if (currentUser) return;
    console.info('[dev] Auto-login active (emulator only).');
    signInWithEmailAndPassword(auth, email, password).catch((err) => {
      console.warn('[dev] Auto-login failed:', err);
    });
  });
}
