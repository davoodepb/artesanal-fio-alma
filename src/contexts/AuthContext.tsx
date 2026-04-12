import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  setPersistence,
  signInWithRedirect,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { firebaseAuth } from '@/integrations/firebase/client';

interface AuthUser {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  raw: FirebaseUser;
}

interface AuthSession {
  access_token: string;
  refresh_token?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  resendOtp: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const ADMIN_UID = import.meta.env.VITE_FIREBASE_ADMIN_UID || '5efzvBMxHXOBkQMU8VcVLXBX8QS2';

  const toAuthUser = (firebaseUser: FirebaseUser): AuthUser => ({
    id: firebaseUser.uid,
    email: firebaseUser.email,
    email_confirmed_at:
      firebaseUser.emailVerified || firebaseUser.uid === ADMIN_UID ? new Date().toISOString() : null,
    raw: firebaseUser,
  });

  const resolveAdminStatus = async (firebaseUser: FirebaseUser) => {
    try {
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      return tokenResult.claims.admin === true || firebaseUser.uid === ADMIN_UID;
    } catch {
      return firebaseUser.uid === ADMIN_UID;
    }
  };

  const resolveSession = async (firebaseUser: FirebaseUser) => {
    const token = await firebaseUser.getIdToken();
    setSession({ access_token: token, refresh_token: firebaseUser.refreshToken });
  };

  useEffect(() => {
    setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
      // Keep default persistence if browser blocks persistent storage.
    });

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setIsEmailVerified(false);
        setIsLoading(false);
        return;
      }

      setUser(toAuthUser(firebaseUser));
      setIsEmailVerified(firebaseUser.emailVerified || firebaseUser.uid === ADMIN_UID);
      await resolveSession(firebaseUser);
      setIsAdmin(await resolveAdminStatus(firebaseUser));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (fullName) {
        await updateProfile(result.user, { displayName: fullName });
      }
      await sendEmailVerification(result.user);
      return { error: null, needsVerification: true };
    } catch (error) {
      return { error: error as Error, needsVerification: false };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    void email;
    void token;
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      return { error: new Error('Sessão expirada. Faça login novamente para verificar o email.') };
    }

    await currentUser.reload();
    if (!currentUser.emailVerified) {
      return { error: new Error('Email ainda não verificado. Abra o link enviado no email e tente novamente.') };
    }

    return { error: null };
  };

  const resendOtp = async (email: string) => {
    void email;
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      return { error: new Error('Faça login novamente para reenviar o email de verificação.') };
    }

    try {
      await sendEmailVerification(currentUser);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    sessionStorage.removeItem('admin_authenticated');
    await firebaseSignOut(firebaseAuth);

    setIsAdmin(false);
    setIsEmailVerified(false);
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(firebaseAuth, provider);
      return { error: null };
    } catch (error: any) {
      const code = String(error?.code || '');
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await signInWithRedirect(firebaseAuth, provider);
          return { error: null };
        } catch (redirectError) {
          return { error: redirectError as Error };
        }
      }
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAdmin,
        isEmailVerified,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        verifyOtp,
        resendOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
