import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { firebaseAuth, firestore, firebaseStorage } from '@/integrations/firebase/client';

export { firebaseAuth, firestore, firebaseStorage };

/**
 * Garante utilizador autenticado. Usa sessão atual ou autenticação anónima.
 */
export async function ensureAuthenticatedUser() {
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  // Wait a short time for persisted auth state to rehydrate before creating an anonymous session.
  const hydratedUser = await new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(null);
    }, 1200);

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribe();
      resolve(user || null);
    });
  });

  if (hydratedUser) {
    return hydratedUser;
  }

  const result = await signInAnonymously(firebaseAuth);
  return result.user;
}

/**
 * Listener simples para mudanças de autenticação.
 */
export function listenAuthState(callback) {
  return onAuthStateChanged(firebaseAuth, callback);
}
