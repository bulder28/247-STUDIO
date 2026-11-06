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
      const idTokenResult = await firebaseUser.getIdTokenResult(true);
      const userRole = (idTokenResult.claims.role as Role) || 'student';
      setRole(userRole);

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        setUserData({ uid: snap.id, ...(snap.data() as Omit<UserDomainModel, 'uid'>) });
      } else {
        setUserData(null);
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
