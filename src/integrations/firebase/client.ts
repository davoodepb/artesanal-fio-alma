import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

function normalizeBucket(rawBucket: string | undefined, projectId: string): string {
  const fallback = `${projectId}.firebasestorage.app`;
  const value = (rawBucket || '').trim();
  if (!value) return fallback;
  return value.replace(/^gs:\/\//, '').replace(/\/+$/, '');
}

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vercel-artesanal-fio-e-alma';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBBNRuFL5ZE0MWeJFBJMhnBQGIlAwD1EaY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vercel-artesanal-fio-e-alma.firebaseapp.com',
  projectId,
  storageBucket: normalizeBucket(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, projectId),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '232054244911',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:232054244911:web:f339b5bc4f0964131ae8da',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-RLSMQEETYC',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseApp = app;
export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);
export const firebaseStorage = getStorage(app);
export const firebaseStorageBucket = firebaseConfig.storageBucket;

if (typeof window !== 'undefined') {
  const missing = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_APP_ID',
  ].filter((key) => !String(import.meta.env[key as keyof ImportMetaEnv] || '').trim());

  if (missing.length > 0) {
    console.warn('[Firebase] Variaveis de ambiente em falta:', missing.join(', '));
  }
}
