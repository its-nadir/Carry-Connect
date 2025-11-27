import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, getDoc, getDocs,
  onSnapshot, orderBy, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// === YOUR FIREBASE CONFIG (real project) ===
const firebaseConfig = {
  apiKey: "AIzaSyBlYdXduw0F2PeqSIitcX038Ct8nCWI4rs",
  authDomain: "carry-connect-g-1d438.firebaseapp.com",
  projectId: "carry-connect-g-1d438",
  storageBucket: "carry-connect-g-1d438.appspot.com",
  messagingSenderId: "678996484347",
  appId: "1:678996484347:web:28f6039cc9b61030a6905e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// === AUTH FUNCTIONS ===
export const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logOut = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// === SAVE USER PROFILE AFTER SIGNUP ===
export const saveUserProfile = async (name, phone) => {
  if (!auth.currentUser) return;
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    name, phone, email: auth.currentUser.email, createdAt: serverTimestamp()
  });
};

// === CARRIER: POST A TRIP ===
export const postTrip = async ({ from, to, date, transportType, packageSize, price, description = "" }) => {
  if (!auth.currentUser) throw new Error("Login required");
  const tripRef = await addDoc(collection(db, "trips"), {
    from, to, date: new Date(date), transportType, packageSize, price: Number(price),
    description, carrierUid: auth.currentUser.uid, carrierEmail: auth.currentUser.email,
    carrierName: auth.currentUser.displayName || auth.currentUser.email,
    status: "available", createdAt: serverTimestamp()
  });
  return tripRef.id;
};

// === SHIPPER: BOOK A TRIP ===
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

// === LISTEN TO AVAILABLE TRIPS (Find Carrier page) ===
export const listenToAvailableTrips = (callback) => {
  const q = query(collection(db, "trips"), where("status", "==", "available"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const trips = snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() }));
    callback(trips);
  });
};

// === LISTEN TO MY TRIPS (as carrier) ===
export const listenToMyTrips = (callback) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, "trips"), where("carrierUid", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const trips = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(trips);
  });
};

// === LISTEN TO MY BOOKINGS (as shipper) ===
export const listenToMyBookings = (callback) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, "trips"), where("bookedByUid", "==", auth.currentUser.uid));
  return onSnapshot(q, (snap) => {
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(bookings);
  });
};

// === CHAT PER TRIP ===
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
  if (!currentTripId) return () => {};
  const q = query(collection(db, "trips", currentTripId, "messages"), orderBy("sentAt", "asc"));
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data(), sentAt: d.data().sentAt?.toDate() }));
    callback(messages);
  });
};

// === DELETE TRIP ===
export const deleteTrip = async (tripId) => {
  await deleteDoc(doc(db, "trips", tripId));
};

console.log("CarryConnect db.js loaded – ready to launch!");
