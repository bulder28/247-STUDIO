import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/shared/api/firebase';
import { Role, UserDomainModel } from '@/shared/domain/types';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  userData: UserDomainModel | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  userData: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [userData, setUserData] = useState<UserDomainModel | null>(null);
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
      const snap = await Promise.race([docPromise, docTimeout]);

      if (snap && snap.exists()) {
        const docData = snap.data();
        setUserData({ uid: snap.id, ...(docData as Omit<UserDomainModel, 'uid'>) });
      } else {
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
          await fetchProfile(firebaseUser);
        } else {
          setRole(null);
          setUserData(null);
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
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        userData,
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
