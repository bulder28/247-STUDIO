import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import { usersWithBeltThisMonth } from '@/lib/belts';
import { getLocalMonthYear } from '@/lib/dateUtils';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** ¿Se debe mostrar el cinturón de este usuario este mes? (solo BJJ y Grappling) */
  beltApplies: boolean;
  loading: boolean;
  isPasswordRecovery: boolean;
  clearRecoveryMode: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [beltApplies, setBeltApplies] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      const loaded = data as Profile;
      // Staff: sin restricción. Alumnos: solo si su tarifa del mes incluye una disciplina con cinturón.
      const applies =
        loaded.role !== 'client' ||
        (await usersWithBeltThisMonth([loaded.id], getLocalMonthYear())).has(loaded.id);
      setBeltApplies(applies);
      setProfile(loaded);
    } else {
      setBeltApplies(false);
      setProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      if (newSession?.user) {
        setLoading(true);
        setSession(newSession);
        await loadProfile(newSession.user.id);
      } else {
        setSession(null);
        setProfile(null);
        setIsPasswordRecovery(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        beltApplies,
        loading,
        isPasswordRecovery,
        clearRecoveryMode: () => setIsPasswordRecovery(false),
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}

