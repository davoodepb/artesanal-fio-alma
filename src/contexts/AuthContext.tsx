import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

// Compatibility layer: expose a user shape that the rest of the app can consume
// without needing to know about Firebase internals
interface AppUser {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  user_metadata: {
    full_name?: string | null;
    name?: string | null;
    avatar_url?: string | null;
    picture?: string | null;
    provider?: string;
  };
  app_metadata: {
    provider?: string;
  };
}

interface AuthContextType {
  user: AppUser | null;
  session: { user: AppUser } | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  resendOtp: (email: string) => Promise<{ error: Error | null }>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseUser(fbUser: FirebaseUser): AppUser {
  const isGoogle = fbUser.providerData.some(p => p.providerId === 'google.com');
  return {
    id: fbUser.uid,
    email: fbUser.email,
    email_confirmed_at: fbUser.emailVerified ? new Date().toISOString() : null,
    user_metadata: {
      full_name: fbUser.displayName,
      name: fbUser.displayName,
      avatar_url: fbUser.photoURL,
      picture: fbUser.photoURL,
      provider: isGoogle ? 'google' : 'email',
    },
    app_metadata: {
      provider: isGoogle ? 'google' : 'email',
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUserRef, setFirebaseUserRef] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      return data?.role === 'admin';
    } catch (err) {
      console.error('Error checking admin role:', err);
      return false;
    }
  };

  const checkIfBlocked = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('user_id', userId)
        .maybeSingle();
      return !!(data as any)?.is_blocked;
    } catch {
      return false;
    }
  };

  const syncProfileFromAuth = async (appUser: AppUser) => {
    try {
      const fullName = appUser.user_metadata?.full_name || appUser.user_metadata?.name || null;
      const avatarUrl = appUser.user_metadata?.avatar_url || appUser.user_metadata?.picture || null;
      await supabase
        .from('profiles')
        .upsert(
          {
            user_id: appUser.id,
            full_name: fullName,
            email: appUser.email || null,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'user_id' }
        );
    } catch (err) {
      console.warn('Profile sync failed:', err);
    }
  };

  useEffect(() => {
    // Handle redirect result on page load (after Google sign-in redirect)
    getRedirectResult(auth).catch((err) => {
      console.error('getRedirectResult error:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUserRef(fbUser);
      if (fbUser) {
        const appUser = mapFirebaseUser(fbUser);
        setUser(appUser);
        setIsEmailVerified(fbUser.emailVerified || fbUser.providerData.some(p => p.providerId === 'google.com'));
        // Sync profile to Supabase
        syncProfileFromAuth(appUser);
        // Check blocked status
        const blocked = await checkIfBlocked(appUser.id);
        if (blocked) {
          await firebaseSignOut(auth);
          setUser(null);
          setIsAdmin(false);
          setIsEmailVerified(false);
          setIsLoading(false);
          return;
        }
        // Check admin role
        const adminStatus = await checkAdminRole(appUser.id);
        setIsAdmin(adminStatus);
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsEmailVerified(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (!result.user.emailVerified) {
        return { error: new Error('Por favor, verifica o teu email antes de iniciar sessão.') };
      }
      return { error: null };
    } catch (err: any) {
      console.error("SignIn full error:", err);
      let message = err.message || 'Erro ao entrar';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Email ou palavra-passe incorretos.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Muitas tentativas falhadas. Tente mais tarde.';
      } else if (err.code === 'auth/internal-error') {
        message = 'Erro interno do Firebase. Verifica a consola.';
      }
      return { error: new Error(message) };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Send email verification
      await sendEmailVerification(result.user);
      // Sign out immediately — user must verify email first
      await firebaseSignOut(auth);
      return { error: null, needsVerification: true };
    } catch (err: any) {
      console.error("SignUp full error:", err);
      let message = err.message || 'Erro ao criar conta';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Este email já está registado. Tente fazer login.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A palavra-passe é muito fraca. Use pelo menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Email inválido.';
      } else if (err.code === 'auth/internal-error') {
        message = 'Erro interno do Firebase. Verifica a consola.';
      }
      return { error: new Error(message) };
    }
  };

  const signInWithGoogleHandler = async () => {
    try {
      signInWithRedirect(auth, googleProvider);
      return { error: null };
    } catch (err: any) {
      console.error("Google login full error:", err);
      let message = err.message || 'Erro desconhecido ao entrar com Google';
      if (err.code === 'auth/operation-not-allowed') {
        message = 'Google Login não está ativo no Firebase Console.';
      } else if (err.code === 'auth/unauthorized-domain') {
        message = 'Domínio não autorizado no Firebase.';
      }
      return { error: new Error(message) };
    }
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem('admin_authenticated');
    await firebaseSignOut(auth);
    setIsAdmin(false);
    setIsEmailVerified(false);
  };

  // OTP functions — Firebase doesn't use OTP codes, but we keep the interface
  // so that existing code doesn't break. These are no-ops.
  const verifyOtp = async (_email: string, _token: string) => {
    return { error: new Error('Firebase uses email link verification, not OTP codes.') };
  };

  const resendOtp = async (_email: string) => {
    // If there's a current Firebase user (unverified), resend verification
    if (firebaseUserRef && !firebaseUserRef.emailVerified) {
      try {
        await sendEmailVerification(firebaseUserRef);
        return { error: null };
      } catch (err: any) {
        return { error: new Error(err.message) };
      }
    }
    return { error: new Error('Nenhum utilizador encontrado para reenviar verificação.') };
  };

  const resendVerificationEmail = async () => {
    if (firebaseUserRef && !firebaseUserRef.emailVerified) {
      try {
        await sendEmailVerification(firebaseUserRef);
        return { error: null };
      } catch (err: any) {
        return { error: new Error(err.message) };
      }
    }
    return { error: new Error('Nenhum utilizador encontrado.') };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { user } : null,
        isLoading,
        isAdmin,
        isEmailVerified,
        signIn,
        signUp,
        signInWithGoogle: signInWithGoogleHandler,
        signOut: handleSignOut,
        verifyOtp,
        resendOtp,
        resendVerificationEmail,
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
