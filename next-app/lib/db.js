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

export const updateUserProfile = setUserProfile;

// ==========================
// USER DATA
// ==========================

export const getUserTrips = async (userId) => {
  try {
    const q = query(
      collection(db, "trips"),
      where("carrierUid", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date?.toDate ? d.data().date.toDate() : new Date(d.data().date)
    }));
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
    const q = query(collection(db, "reviews"), where("targetUid", "==", userId));
    const snap = await getDocs(q);
    const reviews = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate()
    }));
    return reviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error("Error getting user reviews:", error);
    return [];
  }
};

// ==========================
// TRIPS
// ==========================

export const postTrip = async ({ from, to, date, transportType, packageSize, price, description = "" }) => {
  if (!auth.currentUser) throw new Error("Login required");

  const tripRef = await addDoc(collection(db, "trips"), {
    from,
    to,
    date: new Date(date),
    transportType,
    packageSize,
    price: Number(price),
    description,
    carrierUid: auth.currentUser.uid,
    carrierEmail: auth.currentUser.email,
    carrierName: auth.currentUser.displayName || auth.currentUser.email,
    status: "available",
    createdAt: serverTimestamp()
  });

  return tripRef.id;
};

export const deleteTrip = async (tripId) => {
  if (!auth.currentUser) throw new Error("Login required");
  await deleteDoc(doc(db, "trips", tripId));
};

export const getTrip = async (tripId) => {
  const docSnap = await getDoc(doc(db, "trips", tripId));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
  };
};

export const listenToAvailableTrips = (callback) => {
  const q = query(collection(db, "trips"), where("status", "==", "available"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const listenToMyTrips = (callback) => {
  if (!auth.currentUser) return () => {};
  const q = query(
    collection(db, "trips"),
    where("carrierUid", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ==========================
// BOOKING REQUEST SYSTEM (ADDED)
// ==========================

export const submitBookingRequest = async (tripId, data) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Login required");

  const tripDoc = await getDoc(doc(db, "trips", tripId));
  if (!tripDoc.exists()) throw new Error("Trip not found");

  const trip = tripDoc.data();
  if (trip.status === "booked") throw new Error("Trip already booked");

  await addDoc(collection(db, "booking_requests"), {
    tripId,
    shipperId: user.uid,
    shipperEmail: user.email,
    shipperName: user.displayName || user.email,
    carrierUid: trip.carrierUid,
    status: "pending",
    ...data,
    createdAt: serverTimestamp(),
    respondedAt: null
  });
};

// FIXED: acceptBookingRequest - Now works correctly with transactions
export const acceptBookingRequest = async (requestId) => {
  try {
    const requestRef = doc(db, "booking_requests", requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error("Booking request not found");
    }
    
    const request = requestDoc.data();

    // First, get all other pending requests for this trip BEFORE the transaction
    const othersSnap = await getDocs(
      query(
        collection(db, "booking_requests"),
        where("tripId", "==", request.tripId),
        where("status", "==", "pending")
      )
    );

    const otherRequestIds = othersSnap.docs
      .filter(d => d.id !== requestId)
      .map(d => d.id);

    // Now do the transaction
    await runTransaction(db, async (tx) => {
      const tripRef = doc(db, "trips", request.tripId);
      tx.update(tripRef, {
        status: "booked",
        bookedByUid: request.shipperId,
        bookedByEmail: request.shipperEmail,
        bookedAt: serverTimestamp()
      });

      tx.update(requestRef, {
        status: "accepted",
        respondedAt: serverTimestamp()
      });

      // Reject all other pending requests
      otherRequestIds.forEach(id => {
        tx.update(doc(db, "booking_requests", id), {
          status: "rejected",
          respondedAt: serverTimestamp()
        });
      });
    });

    console.log("Booking request accepted successfully");
  } catch (error) {
    console.error("Error accepting booking request:", error);
    throw error;
  }
};

export const rejectBookingRequest = async (requestId) => {
  await updateDoc(doc(db, "booking_requests", requestId), {
    status: "rejected",
    respondedAt: serverTimestamp()
  });
};

export const listenToMyBookingRequests = (callback) => {
  if (!auth.currentUser) return () => {};
  const q = query(
    collection(db, "booking_requests"),
    where("carrierUid", "==", auth.currentUser.uid),
    where("status", "==", "pending")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const listenToMyBookingRequestStatus = (tripId, callback) => {
  if (!auth.currentUser) return () => {};
  const q = query(
    collection(db, "booking_requests"),
    where("tripId", "==", tripId),
    where("shipperId", "==", auth.currentUser.uid)
  );
  return onSnapshot(q, snap => {
    callback(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
  });
};

// ADDED: Listen to sent booking requests (for My Orders page)
export const listenToMySentRequests = (callback) => {
  if (!auth.currentUser) return () => {};
  const q = query(
    collection(db, "booking_requests"),
    where("shipperId", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ADDED: Listen to booked trips (for My Orders page)
export const listenToMyBookings = (callback) => {
  if (!auth.currentUser) return () => {};
  const q = query(
    collection(db, "trips"),
    where("bookedByUid", "==", auth.currentUser.uid),
    orderBy("bookedAt", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ==========================
// MESSAGING (UNCHANGED)
// ==========================

let currentTripId = null;
export const setCurrentTripId = (id) => currentTripId = id;

export const sendTripMessage = async (text) => {
  if (!currentTripId || !auth.currentUser) return;
  await addDoc(collection(db, "trips", currentTripId, "messages"), {
    text,
    sender: auth.currentUser.displayName || auth.currentUser.email,
    senderUid: auth.currentUser.uid,
    sentAt: serverTimestamp()
  });
};

export const listenToTripChat = (callback) => {
  if (!currentTripId) return () => {};
  const q = query(
    collection(db, "trips", currentTripId, "messages"),
    orderBy("sentAt", "asc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const listenToTripLastMessage = (tripId, callback) => {
  const q = query(
    collection(db, "trips", tripId, "messages"),
    orderBy("sentAt", "desc"),
    limit(1)
  );
  return onSnapshot(q, snap => {
    callback(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
  });
};

export async function getConversations(userId) {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

console.log("CarryConnect db.js loaded");
