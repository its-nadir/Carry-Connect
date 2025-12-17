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
  limit,
  serverTimestamp,
  deleteDoc,
  Timestamp,
  runTransaction
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "./firebase";

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

export const uploadProfileImage = async (userId, file) => {
  try {
    const storageRef = ref(storage, `profile_images/${userId}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
};

export const updateUserProfile = setUserProfile; // Alias for compatibility

export const getUserTrips = async (userId) => {
  try {
    const q = query(collection(db, "trips"), where("carrierUid", "==", userId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate ? d.data().date.toDate() : new Date(d.data().date) }));
  } catch (error) {
    console.error("Error getting user trips:", error);
    return [];
  }
};

export const getUserOrders = async (userId) => {
  try {
    const q = query(collection(db, "trips"), where("bookedByUid", "==", userId));
    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort by bookedAt desc in memory
    return orders.sort((a, b) => {
      const dateA = a.bookedAt?.toDate ? a.bookedAt.toDate() : new Date(a.bookedAt || 0);
      const dateB = b.bookedAt?.toDate ? b.bookedAt.toDate() : new Date(b.bookedAt || 0);
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting user orders:", error);
    return [];
  }
};

export const getUserReviews = async (userId) => {
  try {
    // Assuming reviews are stored in a subcollection or separate collection. 
    // For now, let's assume a 'reviews' collection where 'targetUid' is the user being reviewed.
    const q = query(collection(db, "reviews"), where("targetUid", "==", userId));
    const snap = await getDocs(q);
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }));
    // Sort by createdAt desc in memory
    return reviews.sort((a, b) => {
      const dateA = a.createdAt || new Date(0);
      const dateB = b.createdAt || new Date(0);
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error getting user reviews:", error);
    return [];
  }
};

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

// Delete a trip
export const deleteTrip = async (tripId) => {
  if (!auth.currentUser) throw new Error("Login required");

  try {
    await deleteDoc(doc(db, "trips", tripId));
    return true;
  } catch (error) {
    console.error("Error deleting trip:", error);
    throw error;
  }
};

// Get single trip (for Booking page)
export const getTrip = async (tripId) => {
  try {
    const docRef = doc(db, "trips", tripId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting trip:", error);
    return null;
  }
};

// Get all available carriers/trips (Find Carrier page)
export const listenToAvailableTrips = (callback) => {
  console.log("listenToAvailableTrips: Setting up listener...");
  const q = query(collection(db, "trips"), where("status", "==", "available"));
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

// Legacy/Helper functions from firestore.js
export async function getCarriers(filters = {}) {
  try {
    let q = collection(db, 'trips'); // Assuming 'carriers' in firestore.js meant 'trips' collection
    
    

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
  // Ensure auth is ready
  const user = auth.currentUser;

  if (!user) {
    console.error("bookTrip: User is not authenticated.");
    throw new Error("Login required");
  }

  console.log("bookTrip: Proceeding with user:", user.uid);
  const tripRef = doc(db, "trips", tripId); // Restore tripRef definition
  console.log("bookTrip: tripRef path:", tripRef.path);

  try {
    await runTransaction(db, async (transaction) => {
      console.log("bookTrip: Transaction started");

      

      const tripDoc = await transaction.get(tripRef);
      console.log("bookTrip: Trip doc exists?", tripDoc.exists());

      if (!tripDoc.exists()) throw new Error("Trip not found");

      const tripData = tripDoc.data();
      console.log("bookTrip: Trip status:", tripData.status);

      if (tripData.status !== "available") throw new Error("Trip no longer available");

      console.log("bookTrip: Attempting update...");
      transaction.update(tripRef, {
        status: "booked",
        bookedByUid: user.uid,
        bookedByEmail: user.email,
        weight: Number(weight),
        pickupLocation,
        dropoffLocation,
        reward: Number(reward),
        bookedAt: serverTimestamp()
      });
      console.log("bookTrip: Update queued");
    });
    console.log("bookTrip: Transaction committed successfully");
  } catch (e) {
    console.error("bookTrip: Transaction failed:", e);
    console.error("bookTrip: Error code:", e.code);
    console.error("bookTrip: Error message:", e.message);
    throw e;
  }
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
  
  //  USE DISPLAY NAME FOR CONSISTENCY 
  const senderName = auth.currentUser.displayName || auth.currentUser.email; // ADDED 

  await addDoc(collection(db, "trips", currentTripId, "messages"), {
    text,
    sender: senderName, // CHANGED FROM auth.currentUser.email TO senderName
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

export const listenToTripLastMessage = (tripId, callback) => {
  if (!tripId) return () => { };
  const q = query(
    collection(db, "trips", tripId, "messages"),
    orderBy("sentAt", "desc"),
    limit(1)
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
      return;
    }
    const d = snap.docs[0];
    const data = d.data();
    callback({
      id: d.id,
      ...data,
      sentAt: data.sentAt?.toDate ? data.sentAt.toDate() : null
    });
  });
};
// END

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
