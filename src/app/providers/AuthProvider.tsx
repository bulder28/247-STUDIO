import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/shared/api/firebase';
import { Role, UserDomainModel } from '@/shared/domain/types';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  userData: UserDomainModel | null;
  /** true = el usuario existe en Auth pero aún no tiene ficha en Firestore; null = aún sin comprobar */
  profileMissing: boolean | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  userData: null,
  profileMissing: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

/**
 * Si el gimnasio ya dio de alta al alumno con un id provisional, vincula esa ficha a su cuenta real.
 * Mejor esfuerzo: si la función no está disponible, se sigue como un alumno nuevo.
 */
async function tryClaimPreRegisteredProfile(firebaseUser: User): Promise<boolean> {
  try {
    const token = await firebaseUser.getIdToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('/.netlify/functions/claim-profile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string };
    return data.status === 'claimed';
  } catch {
    return false;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [userData, setUserData] = useState<UserDomainModel | null>(null);
  const [profileMissing, setProfileMissing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (firebaseUser: User) => {
    try {
      // 1. Obtención estricta de Custom Claims frescos mediante getIdTokenResult(true)
      // El rol se determina ÚNICAMENTE a través del token firmado por el servidor de Auth
      const tokenPromise = firebaseUser.getIdTokenResult(true).catch(() => null);
      const tokenTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
      const idTokenResult = await Promise.race([tokenPromise, tokenTimeout]);
      
      // Si el token contiene un custom claim ('admin', 'coach', 'kiosk'), se asigna.
      // Si el usuario está autenticado pero no tiene claim administrativo, su rol es 'student'.
      const claimRole = idTokenResult?.claims?.role as Role | undefined;
      const userRole: Role = claimRole || 'student';
      setRole(userRole);

      // 2. Consulta de documento de usuario en Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const docPromise = getDoc(userDocRef).catch((err) => {
        console.warn('Aviso leyendo documento de usuario en Firestore:', err);
        return null;
      });
      const docTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
      let snap = await Promise.race([docPromise, docTimeout]);

      // Alumno sin ficha: primero intentamos vincular la que pudo crear el gimnasio con su email
      if (snap && !snap.exists() && userRole === 'student') {
        const claimed = await tryClaimPreRegisteredProfile(firebaseUser);
        if (claimed) {
          snap = await getDoc(userDocRef).catch(() => snap);
        }
      }

      if (snap && snap.exists()) {
        const docData = snap.data();
        setUserData({ uid: snap.id, ...(docData as Omit<UserDomainModel, 'uid'>) });
        setProfileMissing(false);
      } else {
        // Solo se marca "sin ficha" si Firestore respondió y el documento no existe.
        // Si la lectura falló o tardó, no se bloquea al usuario (se mantiene el comportamiento anterior).
        setProfileMissing(snap && userRole === 'student' ? true : false);
        // Si el usuario aún no tiene documento en Firestore (ej. acceso con Google recién iniciado),
        // se suministra un perfil inicial en memoria para que la interfaz no quede bloqueada en skeleton.
        // No escribe datos falsos en Firestore: el usuario completará su ficha oficial en recepción o perfil.
        const fallbackProfile: UserDomainModel = {
          uid: firebaseUser.uid,
          authEmail: firebaseUser.email || '',
          contactEmail: firebaseUser.email || '',
          alias: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Atleta 247',
          phone: firebaseUser.phoneNumber || '',
          birthDate: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          isMinor: false,
          beltSystem: 'ADULT',
          belt: 'WHITE',
          stripes: 0,
          beltDate: new Date().toISOString().slice(0, 10),
          pricingTier: 'STD',
          activeTariffId: 'tariff_default',
          accountStatus: 'PENDING',
          permissions: ['student'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stats: {
            tecnica: 65,
            fuerza: 60,
            elasticidad: 60,
            guardia: 65,
            pase: 65,
            derribos: 55,
            leglocks: 50,
            finalizacion: 60,
          },
        };
        setUserData(fallbackProfile);
      }
    } catch (err) {
      console.error('Error al resolver claims o perfil de usuario:', err);
      setRole(null);
      setUserData(null);
    }
  };

  useEffect(() => {
    // Timeout global de seguridad: nunca dejar la pantalla de carga colgada más de 8 segundos en redes móviles
    const globalLoadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          setProfileMissing(null);
          await fetchProfile(firebaseUser);
        } else {
          setRole(null);
          setUserData(null);
          setProfileMissing(null);
        }
      } catch (err) {
        console.error('Error en onAuthStateChanged:', err);
        setRole(null);
        setUserData(null);
      } finally {
        clearTimeout(globalLoadingTimeout);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(globalLoadingTimeout);
      unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Error en signOut:', e);
    } finally {
      setUser(null);
      setRole(null);
      setUserData(null);
      setProfileMissing(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        userData,
        profileMissing,
        loading,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
