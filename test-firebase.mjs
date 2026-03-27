import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

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
const auth = getAuth(app);

async function test() {
  console.log("Testing Firebase Auth...");
  try {
    // We expect this to fail with auth/invalid-email or auth/user-not-found, 
    // BUT NOT auth/internal-error if the config is correct.
    await signInWithEmailAndPassword(auth, "test@test.com", "wrongpassword123");
    console.log("Login succeeded (unexpectedly).");
  } catch (error) {
    console.log("Error code:", error.code);
    console.log("Error message:", error.message);
    if (error.code === 'auth/internal-error') {
      console.log("❌ INTERNAL ERROR: The credentials or project setup are invalid/blocked by GCP!");
    } else {
      console.log("✅ API CONNECTION WORKS: Received a valid Firebase Auth error.");
    }
  }
  process.exit(0);
}

test();
