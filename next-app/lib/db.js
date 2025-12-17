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

// ===============================
// BOOKING REQUEST SYSTEM (ADDED)
// ===============================

// 1. Shipper submits booking request
export const submitBookingRequest = async (tripId, { weight, pickupLocation, dropoffLocation, reward }) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Login required");

  const tripRef = doc(db, "trips", tripId);
  const tripDoc = await getDoc(tripRef);
  if (!tripDoc.exists()) throw new Error("Trip not found");

  const tripData = tripDoc.data();
  if (tripData.status === "booked") throw new Error("Trip already booked");

  const requestRef = await addDoc(collection(db, "booking_requests"), {
    tripId,
    shipperId: user.uid,
    shipperEmail: user.email,
    shipperName: user.displayName || user.email,
    carrierUid: tripData.carrierUid,
    status: "pending",
    weight: Number(weight),
    pickupLocation,
    dropoffLocation,
    reward: Number(reward),
    createdAt: serverTimestamp(),
    respondedAt: null
  });

  return requestRef.id;
};

// 2. Carrier accepts booking request
export const acceptBookingRequest = async (requestId) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Login required");

  const requestRef = doc(db, "booking_requests", requestId);
  const requestDoc = await getDoc(requestRef);
  if (!requestDoc.exists()) throw new Error("Request not found");

  const requestData = requestDoc.data();
  if (requestData.carrierUid !== user.uid) throw new Error("Not authorized");

  await runTransaction(db, async (transaction) => {
    const tripRef = doc(db, "trips", requestData.tripId);
    const tripDoc = await transaction.get(tripRef);
    if (!tripDoc.exists()) throw new Error("Trip not found");
    if (tripDoc.data().status !== "available") throw new Error("Trip not available");

    transaction.update(tripRef, {
      status: "booked",
      bookedByUid: requestData.shipperId,
      bookedByEmail: requestData.shipperEmail,
      weight: requestData.weight,
      pickupLocation: requestData.pickupLocation,
      dropoffLocation: requestData.dropoffLocation,
      reward: requestData.reward,
      bookedAt: serverTimestamp()
    });

    transaction.update(requestRef, {
      status: "accepted",
      respondedAt: serverTimestamp()
    });

    const otherRequests = await getDocs(
      query(
        collection(db, "booking_requests"),
        where("tripId", "==", requestData.tripId),
        where("status", "==", "pending")
      )
    );

    otherRequests.forEach((docSnap) => {
      if (docSnap.id !== requestId) {
        transaction.update(docSnap.ref, {
          status: "rejected",
          respondedAt: serverTimestamp()
        });
      }
    });
  });
};

// 3. Carrier rejects booking request
export const rejectBookingRequest = async (requestId) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Login required");

  const requestRef = doc(db, "booking_requests", requestId);
  const requestDoc = await getDoc(requestRef);
  if (!requestDoc.exists()) throw new Error("Request not found");

  const requestData = requestDoc.data();
  if (requestData.carrierUid !== user.uid) throw new Error("Not authorized");

  await updateDoc(requestRef, {
    status: "rejected",
    respondedAt: serverTimestamp()
  });
};

// 4. Carrier listens to pending requests
export const listenToMyBookingRequests = (callback) => {
  if (!auth.currentUser) return () => { };

  const q = query(
    collection(db, "booking_requests"),
    where("carrierUid", "==", auth.currentUser.uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate()
    }));
    callback(requests);
  });
};

// 5. Shipper listens to request status
export const listenToMyBookingRequestStatus = (tripId, callback) => {
  if (!auth.currentUser) return () => { };

  const q = query(
    collection(db, "booking_requests"),
    where("tripId", "==", tripId),
    where("shipperId", "==", auth.currentUser.uid)
  );

  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
      return;
    }
    const d = snap.docs[0];
    callback({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate()
    });
  });
};

console.log("CarryConnect db.js loaded");
