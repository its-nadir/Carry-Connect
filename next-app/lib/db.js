import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  Timestamp
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { db, auth } from "./firebase";

// Re-export auth and db
export { auth, db };

// Authentication Functions
export const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logOut = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// User Profile Management
export const saveUserProfile = async (name, phone) => {
  if (!auth.currentUser) return;
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    name, phone, email: auth.currentUser.email, createdAt: serverTimestamp()
  });
};

export async function getUserProfile(userId) {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function setUserProfile(userId, profileData) {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error setting user profile:', error);
    return false;
  }
}

// Trip Management (Carriers)

// Post a trip (Carrier)
export const postTrip = async ({ from, to, date, transportType, packageSize, price, description = "" }) => {
  console.log("postTrip called with:", { from, to, date, transportType, packageSize, price, description });
  if (!auth.currentUser) {
    console.error("postTrip: No current user!");
    throw new Error("Login required");
  }
  console.log("postTrip: User authenticated:", auth.currentUser.uid);

  try {
    const tripRef = await addDoc(collection(db, "trips"), {
      from, to, date: new Date(date), transportType, packageSize, price: Number(price),
      description, carrierUid: auth.currentUser.uid, carrierEmail: auth.currentUser.email,
      carrierName: auth.currentUser.displayName || auth.currentUser.email,
      status: "available", createdAt: serverTimestamp()
    });
    console.log("postTrip: Trip created with ID:", tripRef.id);
    return tripRef.id;
  } catch (e) {
    console.error("postTrip: Error adding doc:", e);
    throw e;
  }
};

// Get all available carriers/trips (Find Carrier page)
export const listenToAvailableTrips = (callback) => {
  console.log("listenToAvailableTrips: Setting up listener...");
  const q = query(collection(db, "trips"), where("status", "==", "available"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    console.log("listenToAvailableTrips: Snapshot received, docs:", snap.docs.length);
    const trips = snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate ? d.data().date.toDate() : new Date(d.data().date) }));
    callback(trips);
  }, (error) => {
    console.error("listenToAvailableTrips: Error in snapshot:", error);
  });
};

// Get my trips (Carrier)
export const listenToMyTrips = (callback) => {
  if (!auth.currentUser) {
    console.log("listenToMyTrips: No user logged in");
    return () => { };
  }
  console.log("listenToMyTrips: Setting up listener for user:", auth.currentUser.uid);
  const q = query(collection(db, "trips"), where("carrierUid", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    console.log("listenToMyTrips: Snapshot received, docs:", snap.docs.length);
    const trips = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
      };
    });
    callback(trips);
  }, (error) => {
    console.error("listenToMyTrips: Error in snapshot:", error);
  });
};

// Legacy/Helper functions from firestore.js (adapted to match db.js style where possible)
export async function getCarriers(filters = {}) {
  try {
    let q = collection(db, 'trips'); // Assuming 'carriers' in firestore.js meant 'trips' collection
    // Note: The original firestore.js used 'carriers' collection, but db.js uses 'trips'. 
    // I am standardizing on 'trips' as it seems to be the active one used in the app logic I saw.

    if (filters.from) q = query(q, where('from', '==', filters.from));
    if (filters.to) q = query(q, where('to', '==', filters.to));
    if (filters.date) q = query(q, where('date', '>=', filters.date));

    const querySnapshot = await getDocs(q);
    const carriers = [];
    querySnapshot.forEach((doc) => {
      carriers.push({ id: doc.id, ...doc.data() });
    });
    return carriers;
  } catch (error) {
    console.error('Error getting carriers:', error);
    return [];
  }
}

// Booking Management (Shippers)

// Book a trip
export const bookTrip = async (tripId, { weight, pickupLocation, dropoffLocation, reward }) => {
  if (!auth.currentUser) throw new Error("Login required");
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) throw new Error("Trip not found");

  const trip = tripSnap.data();
  if (trip.status !== "available") throw new Error("Trip no longer available");

  await updateDoc(tripRef, {
    status: "booked",
    bookedByUid: auth.currentUser.uid,
    bookedByEmail: auth.currentUser.email,
    weight: Number(weight),
    pickupLocation,
    dropoffLocation,
    reward: Number(reward),
    bookedAt: serverTimestamp()
  });
};

// Listen to my bookings
export const listenToMyBookings = (callback) => {
  if (!auth.currentUser) return () => { };
  const q = query(collection(db, "trips"), where("bookedByUid", "==", auth.currentUser.uid));
  return onSnapshot(q, (snap) => {
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(bookings);
  });
};

// Messaging System

let currentTripId = null;
export const setCurrentTripId = (id) => currentTripId = id;

export const sendTripMessage = async (text) => {
  if (!currentTripId || !auth.currentUser) return;
  await addDoc(collection(db, "trips", currentTripId, "messages"), {
    text,
    sender: auth.currentUser.email,
    senderUid: auth.currentUser.uid,
    sentAt: serverTimestamp()
  });
};

export const listenToTripChat = (callback) => {
  if (!currentTripId) return () => { };
  const q = query(collection(db, "trips", currentTripId, "messages"), orderBy("sentAt", "asc"));
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data(), sentAt: d.data().sentAt?.toDate() }));
    callback(messages);
  });
};

// Generic conversation helpers (from firestore.js)
export async function getConversations(userId) {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const conversations = [];
    querySnapshot.forEach((doc) => {
      conversations.push({ id: doc.id, ...doc.data() });
    });
    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    return [];
  }
}

console.log("CarryConnect db.js loaded");
