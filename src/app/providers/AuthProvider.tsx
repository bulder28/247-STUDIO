import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
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
      const idTokenResult = await firebaseUser.getIdTokenResult(true);
      const userRole = (idTokenResult.claims.role as Role) || 'student';
      setRole(userRole);

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        setUserData({ uid: snap.id, ...(snap.data() as Omit<UserDomainModel, 'uid'>) });
      } else {
        // Auto-creación de perfil inicial para atletas o administradores recién registrados
        const initialProfile: UserDomainModel = {
          uid: firebaseUser.uid,
          authEmail: firebaseUser.email || '',
          contactEmail: firebaseUser.email || '',
          alias: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Atleta 247',
          phone: firebaseUser.phoneNumber || '',
          emergencyContactName: 'Contacto de Emergencia',
          emergencyContactPhone: '',
          birthDate: '1996-05-15',
          isMinor: false,
          beltSystem: 'ADULT',
          belt: userRole === 'admin' ? 'BLACK' : 'WHITE',
          stripes: userRole === 'admin' ? 3 : 1,
          beltDate: new Date().toISOString().slice(0, 10),
          pricingTier: 'STD',
          activeTariffId: 'tariff-mensual-bjj',
          accountStatus: 'ACTIVE',
          paymentStatusCache: 'OK',
          photoUrl: firebaseUser.photoURL || undefined,
          permissions: userRole === 'admin' ? ['admin'] : ['student'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stats: {
            tecnica: userRole === 'admin' ? 95 : 68,
            fuerza: userRole === 'admin' ? 88 : 72,
            elasticidad: userRole === 'admin' ? 82 : 65,
            guardia: userRole === 'admin' ? 94 : 70,
            pase: userRole === 'admin' ? 92 : 66,
            derribos: userRole === 'admin' ? 86 : 60,
            leglocks: userRole === 'admin' ? 90 : 58,
            finalizacion: userRole === 'admin' ? 96 : 64,
          },
        };

        try {
          if (userRole === 'admin') {
            await setDoc(userDocRef, initialProfile, { merge: true });
          } else {
            // Auto-creación de atleta cumpliendo estrictamente con firestore.rules
            const studentDoc = {
              authEmail: firebaseUser.email || '',
              contactEmail: firebaseUser.email || '',
              alias: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Atleta 247',
              phone: firebaseUser.phoneNumber || '',
              emergencyContactName: 'Contacto de Emergencia',
              emergencyContactPhone: '',
              birthDate: '1998-01-01',
              isMinor: false,
              beltSystem: 'ADULT',
              belt: 'WHITE',
              stripes: 0,
              pricingTier: 'STD',
              activeTariffId: 'tariff-mensual-bjj',
              accountStatus: 'PENDING',
              permissions: ['student'],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userDocRef, studentDoc);
          }
        } catch {
          // Si las reglas rechazan la escritura cliente, mantenemos el perfil en memoria
        }
        setUserData(initialProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        setRole(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
    setUserData(null);
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
