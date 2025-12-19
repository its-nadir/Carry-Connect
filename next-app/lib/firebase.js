// Firebase configuration and initialization
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase config with production fallback
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBLYdXduw0F2PeqSltcX038Ci8nCWIdrs",

  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "carry-connect-g-1d438.firebaseapp.com",

  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "carry-connect-g-1d438",

  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "carry-connect-g-1d438.firebasestorage.app",

  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    "678996484347",

  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:678996484347:web:28f6039cc9b61030a6905e",
};

// Initialize Firebase only once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
