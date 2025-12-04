import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  sendEmailVerification as firebaseSendEmailVerification
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// Sign up a new user
export const signUp = async (email, password, displayName, phoneNumber) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      name: displayName || "",
      phone: phoneNumber || "",
      createdAt: serverTimestamp(),
      role: "user"
    });

    return user;
  } catch (error) {
    throw error;
  }
};

// Sign in existing user
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user exists in Firestore, if not create one
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || "",
        createdAt: serverTimestamp(),
        role: "user"
      });
    }

    return user;
  } catch (error) {
    throw error;
  }
};

// Sign out user
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Listen for auth state changes
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Setup Recaptcha for phone verification
export const setupRecaptcha = (containerId) => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved
      },
      "expired-callback": () => {
        // Response expired
      }
    });
  }
  return window.recaptchaVerifier;
};

// Link phone number to user account
export const linkPhoneNumber = async (user, phoneNumber, appVerifier) => {
  try {
    const confirmationResult = await linkWithPhoneNumber(user, phoneNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    throw error;
  }
};

// Send email verification
export const sendEmailVerification = async (user) => {
  try {
    await firebaseSendEmailVerification(user);
  } catch (error) {
    throw error;
  }
};
