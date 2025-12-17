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

export { auth, db };

export const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logOut = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

export const saveUserProfile = async (name, phone) => {
  if (!auth.currentUser) return;
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    name, phone, email: auth.currentUser.email, createdAt: serverTimestamp()
  });
};

export async function getUserProfile(userId) {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setUserProfile(userId, profileData) {
  try {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch {
    return false;
  }
}

export const uploadProfileImage = async (userId, file) => {
  const storageRef = ref(storage, `profile_images/${userId}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

export const updateUserProfile = setUserProfile;

export const getUserTrips = async (userId) => {
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
};

export const getUserOrders = async (userId) => {
  const q = query(collection(db, "trips"), where("bookedByUid", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const postTrip = async ({ from, to, date, transportType, packageSize, price, description = "" }) => {
  if (!auth.currentUser) throw new Error("Login required");

  const tripRef = await addDoc(collection(db, "trips"), {
    from,
    to,
    date: new Date(`${date}T00:00:00`),
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

export const acceptBookingRequest = async (requestId) => {
  const requestRef = doc(db, "booking_requests", requestId);
  const requestDoc = await getDoc(requestRef);
  const request = requestDoc.data();

  const othersSnap = await getDocs(
    query(
      collection(db, "booking_requests"),
      where("tripId", "==", request.tripId),
      where("status", "==", "pending")
    )
  );

  await runTransaction(db, async (tx) => {
    tx.update(doc(db, "trips", request.tripId), {
      status: "booked",
      bookedByUid: request.shipperId,
      bookedByEmail: request.shipperEmail,
      bookedAt: serverTimestamp()
    });

    tx.update(requestRef, {
      status: "accepted",
      respondedAt: serverTimestamp()
    });

    othersSnap.docs
      .filter(d => d.id !== requestId)
      .forEach(d => {
        tx.update(doc(db, "booking_requests", d.id), {
          status: "rejected",
          respondedAt: serverTimestamp()
        });
      });
  });
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

export const listenToMyBookings = (callback) => {
  if (!auth.currentUser) return () => {};

  const tripsQuery = query(
    collection(db, "trips"),
    where("bookedByUid", "==", auth.currentUser.uid),
    orderBy("bookedAt", "desc")
  );

  return onSnapshot(tripsQuery, async (tripsSnap) => {
    const trips = tripsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const merged = await Promise.all(
      trips.map(async (trip) => {
        const reqSnap = await getDocs(
          query(
            collection(db, "booking_requests"),
            where("tripId", "==", trip.id),
            where("shipperId", "==", auth.currentUser.uid),
            limit(1)
          )
        );

        const req = reqSnap.empty ? null : { id: reqSnap.docs[0].id, ...reqSnap.docs[0].data() };

        return {
          ...trip,
          bookingRequestId: req?.id || null,
          weight: req?.weight ?? null,
          reward: req?.reward ?? null,
          pickupLocation: req?.pickupLocation ?? null,
          dropoffLocation: req?.dropoffLocation ?? null
        };
      })
    );

    callback(merged);
  });
};

export const createNotification = async ({ userId, title, message, link }) => {
  await addDoc(collection(db, "notifications"), {
    userId,
    title,
    message,
    link,
    isRead: false,
    createdAt: serverTimestamp()
  });
};

export const listenToNotifications = (callback) => {
  if (!auth.currentUser) return () => {};
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const markNotificationRead = async (id) => {
  await updateDoc(doc(db, "notifications", id), {
    isRead: true
  });
};

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

console.log("CarryConnect db.js loaded");
