import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB1rgHBFpj-beArpphEHYJ2y4RpKAaE5Vg",
  authDomain: "fio-alma-studio.firebaseapp.com",
  projectId: "fio-alma-studio",
  storageBucket: "fio-alma-studio.firebasestorage.app",
  messagingSenderId: "1005069558477",
  appId: "1:1005069558477:web:2310cc50b953db693d7f84",
  measurementId: "G-NRZ6VKWM06"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
