import { isSupported, getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app, db } from '@/shared/api/firebase';

let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
}

/**
 * Solicita permiso al usuario para recibir notificaciones push en el móvil/navegador
 * y registra su token de dispositivo en su documento de usuario en Firestore.
 */
export async function requestNotificationPermission(userUid?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Este dispositivo no soporta notificaciones Web Push.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Permiso de notificaciones denegado por el usuario.');
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    // Obtener token FCM del dispositivo
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
    });

    if (token && userUid) {
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        notificationsEnabled: true,
      }).catch((err) => {
        console.warn('No se pudo guardar el token en Firestore:', err);
      });
    }

    return token;
  } catch (error) {
    console.error('Error al solicitar permiso de notificaciones push:', error);
    return null;
  }
}

/**
 * Escucha notificaciones mientras la app está abierta en primer plano
 */
export async function onForegroundMessage(callback: (payload: unknown) => void) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

