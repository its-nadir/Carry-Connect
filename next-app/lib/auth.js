// Authentication helper functions
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification as firebaseSendEmailVerification,
  RecaptchaVerifier,
  linkWithPhoneNumber
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

// Ensure persistence is set
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting persistence:", error);
});

/**
 * Sign up with email and password
 */
export async function signUp(email, password, displayName, phoneNumber) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile
    await updateProfile(user, { displayName });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName,
      phone: phoneNumber || "", // Save phone number
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      verified: false,
      completedTrips: 0,
      packagesDelivered: 0,
      totalEarnings: 0,
      rating: 0,
      reviewCount: 0
    });

    return user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user document exists, if not create it
    const userDoc = doc(db, 'users', user.uid);
    await setDoc(userDoc, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      verified: false,
      completedTrips: 0,
      packagesDelivered: 0,
      totalEarnings: 0,
      rating: 0,
      reviewCount: 0
    }, { merge: true });

    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign out
 */
export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Send email verification
 */
export async function sendEmailVerification(user) {
  try {
    await firebaseSendEmailVerification(user);
  } catch (error) {
    console.error('Error sending email verification:', error);
    throw error;
  }
}

/**
 * Setup Recaptcha Verifier
 */
export function setupRecaptcha(elementId) {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      'size': 'invisible',
      'callback': () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }
  return window.recaptchaVerifier;
}

/**
 * Link Phone Number
 */
export async function linkPhoneNumber(user, phoneNumber, appVerifier) {
  try {
    const confirmationResult = await linkWithPhoneNumber(user, phoneNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Error linking phone number:', error);
    throw error;
  }
}
