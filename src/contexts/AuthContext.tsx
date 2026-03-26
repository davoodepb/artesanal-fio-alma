import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authSupabase, isExternalAuthProject } from '@/integrations/supabase/authClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const authRedirectTo = import.meta.env.VITE_SITE_URL || window.location.origin;

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

  const syncProfileFromAuth = async (authUser: User) => {
    if (isExternalAuthProject) {
      return;
    }

    try {
      const fullName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        null;
      const avatarUrl =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        null;

      await supabase
        .from('profiles')
        .upsert(
          {
            user_id: authUser.id,
            full_name: fullName,
            email: authUser.email || null,
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
    const { data: { subscription } } = authSupabase.auth.onAuthStateChange(
      async (event, authSession) => {
        setSession(authSession);
        setUser(authSession?.user ?? null);

        if (authSession?.user) {
          syncProfileFromAuth(authSession.user);
          const oauthVerified = authSession.user.app_metadata?.provider && authSession.user.app_metadata?.provider !== 'email';
          setIsEmailVerified(!!authSession.user.email_confirmed_at || !!oauthVerified);

          setTimeout(async () => {
            if (isExternalAuthProject) {
              setIsAdmin(false);
              return;
            }

            const blocked = await checkIfBlocked(authSession.user.id);
            if (blocked) {
              await authSupabase.auth.signOut();
              return;
            }

            const adminStatus = await checkAdminRole(authSession.user.id);
            setIsAdmin(adminStatus);
          }, 0);

          if (!isExternalAuthProject && event === 'SIGNED_IN' && authSession.user.app_metadata?.provider !== 'email') {
            supabase.functions
              .invoke('send-login-email')
              .catch((err) => console.warn('send-login-email (OAuth):', err));
          }
        } else {
          setIsAdmin(false);
          setIsEmailVerified(false);
        }

        setIsLoading(false);
      }
    );

    authSupabase.auth.getSession().then(async ({ data: { session: authSession } }) => {
      setSession(authSession);
      setUser(authSession?.user ?? null);

      if (authSession?.user) {
        syncProfileFromAuth(authSession.user);
        const oauthVerified = authSession.user.app_metadata?.provider && authSession.user.app_metadata?.provider !== 'email';
        setIsEmailVerified(!!authSession.user.email_confirmed_at || !!oauthVerified);

        if (isExternalAuthProject) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const blocked = await checkIfBlocked(authSession.user.id);
        if (blocked) {
          await authSupabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        const adminStatus = await checkAdminRole(authSession.user.id);
        setIsAdmin(adminStatus);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await authSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user && data.user.app_metadata?.provider === 'email' && !data.user.email_confirmed_at) {
      await authSupabase.auth.signOut();
      return { error: new Error('Email not confirmed') };
    }

    if (!error && !isExternalAuthProject) {
      supabase.functions
        .invoke('send-login-email')
        .catch((err) => console.warn('send-login-email edge fn:', err));
    }

    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await authSupabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirectTo,
        data: {
          full_name: fullName,
        },
      },
    });

    const needsVerification = !error && data?.user && !data.user.email_confirmed_at;
    return { error: error as Error | null, needsVerification: !!needsVerification };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await authSupabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    return { error: error as Error | null };
  };

  const resendOtp = async (email: string) => {
    const { error } = await authSupabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: authRedirectTo,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    sessionStorage.removeItem('admin_authenticated');
    await authSupabase.auth.signOut();

    if (!isExternalAuthProject) {
      await supabase.auth.signOut();
    }

    setIsAdmin(false);
    setIsEmailVerified(false);
  };

  const signInWithGoogle = async () => {
    const { error } = await authSupabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error: error as Error | null };
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
