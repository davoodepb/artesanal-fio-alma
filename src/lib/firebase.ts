import { GoogleAuthProvider } from 'firebase/auth';
import { firebaseAuth } from '@/integrations/firebase/client';

// Legacy compatibility module: keeps old imports working while using the canonical Firebase setup.
export const auth = firebaseAuth;
export const googleProvider = new GoogleAuthProvider();
