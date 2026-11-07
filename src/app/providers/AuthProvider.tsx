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
      let userRole = (idTokenResult.claims.role as Role);

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const docData = snap.data();
        if (!userRole) {
          if (
            docData?.role === 'admin' ||
            docData?.permissions?.includes('ADMIN') ||
            docData?.permissions?.includes('admin')
          ) {
            userRole = 'admin';
          }
        }
        setUserData({ uid: snap.id, ...(docData as Omit<UserDomainModel, 'uid'>) });
      }
      setRole(userRole || 'student');
      if (!snap.exists()) {
        // Auto-creación de perfil inicial para atletas o administradores recién registrados
        const isAdminUser = userRole === 'admin';
        const initialProfile: UserDomainModel = {
          uid: firebaseUser.uid,
          authEmail: firebaseUser.email || '',
          contactEmail: firebaseUser.email || '',
          alias: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Atleta 247',
          phone: firebaseUser.phoneNumber || '',
          emergencyContactName: 'Contacto de Emergencia',
          emergencyContactPhone: '',
          birthDate: '1998-01-01',
          isMinor: false,
          beltSystem: 'ADULT',
          belt: isAdminUser ? 'BLACK' : 'WHITE',
          stripes: isAdminUser ? 3 : 0,
          beltDate: new Date().toISOString().slice(0, 10),
          pricingTier: 'STD',
          activeTariffId: 'tariff-mensual-bjj',
          accountStatus: isAdminUser ? 'ACTIVE' : 'PENDING',
          paymentStatusCache: isAdminUser ? 'OK' : undefined,
          photoUrl: firebaseUser.photoURL || undefined,
          permissions: isAdminUser ? ['admin'] : ['student'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stats: {
            tecnica: isAdminUser ? 95 : 68,
            fuerza: isAdminUser ? 88 : 72,
            elasticidad: isAdminUser ? 82 : 65,
            guardia: isAdminUser ? 94 : 70,
            pase: isAdminUser ? 92 : 66,
            derribos: isAdminUser ? 86 : 60,
            leglocks: isAdminUser ? 90 : 58,
            finalizacion: isAdminUser ? 96 : 64,
          },
        };

        try {
          if (isAdminUser) {
            await setDoc(userDocRef, initialProfile, { merge: true });
            setUserData(initialProfile);
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
            setUserData(initialProfile);
          }
        } catch (writeErr) {
          console.error('Error al registrar perfil inicial en Firestore:', writeErr);
          // Si las reglas rechazan la escritura, NO inyectar un perfil falso activo en memoria
          setUserData(null);
        }
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
