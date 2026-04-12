import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBBNRuFL5ZE0MWeJFBJMhnBQGIlAwD1EaY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vercel-artesanal-fio-e-alma.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vercel-artesanal-fio-e-alma',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'vercel-artesanal-fio-e-alma.appspot.com',
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
