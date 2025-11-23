// db.js — Carry Connect: Peer-to-Peer Document Delivery with Handover Points
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, getDoc, getDocs,
  onSnapshot, orderBy, query, where, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, sendPasswordResetEmail, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
// === CONFIG ===
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

let currentShipmentId = null;

// === EXPORTS ===
export {
  db, auth,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, onAuthStateChanged,
  collection, addDoc, doc, updateDoc, getDoc, getDocs,
  onSnapshot, orderBy, query, where, serverTimestamp
};

// === UTILS ===
export const setCurrentShipmentId = (id) => currentShipmentId = id;

// === USER PROFILE ===
export const saveProfile = async (name, phone, role = "both") => {
  if (!auth.currentUser) throw new Error("Not logged in");
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    name, phone, email: auth.currentUser.email,
    role, // 'shipper', 'carrier', or 'both'
    updatedAt: new Date(),
    rating: 0,
    ratingCount: 0,
    totalEarned: 0,
    totalSpent: 0
  });
};

// === POST SHIPMENT (Shipper) — WITH PICKUP & DROPOFF ===
export const postShipment = async ({
  from, to,
  pickupLocation, pickupTime,
  dropoffLocation, dropoffTime,
  weight, description, reward, photos = []
}) => {
  if (!auth.currentUser) throw new Error("Not logged in");
  if (!pickupLocation || !pickupTime || !dropoffLocation || !dropoffTime) {
    throw new Error("Pickup & dropoff required");
  }

  const shipmentRef = await addDoc(collection(db, "shipments"), {
    from, to,
    pickupLocation, pickupTime: new Date(pickupTime),
    dropoffLocation, dropoffTime: new Date(dropoffTime),
    weight: Number(weight), description, reward: Number(reward),
    photos,
    owner: auth.currentUser.email,
    ownerUid: auth.currentUser.uid,
    status: "open",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return shipmentRef.id;
};

// === CARRIER: APPLY TO SHIPMENT ===
export const applyToShipment = async (shipmentId) => {
  if (!auth.currentUser) throw new Error("Not logged in");
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const name = userSnap.exists() ? userSnap.data().name : auth.currentUser.email;

  await updateDoc(doc(db, "shipments", shipmentId), {
    carrier: auth.currentUser.email,
    carrierUid: auth.currentUser.uid,
    carrierName: name,
    status: "applied",
    appliedAt: new Date()
  });
};

// === SHIPPER: ACCEPT CARRIER (Match) ===
export const acceptCarrier = async (shipmentId) => {
  if (!auth.currentUser) throw new Error("Not logged in");
  await updateDoc(doc(db, "shipments", shipmentId), {
    status: "matched",
    matchedAt: new Date()
  });
};

// === PAYMENT: CREATE PAYMENT INTENT ===
export const createPaymentIntent = async (shipmentId) => {
  const shipmentSnap = await getDoc(doc(db, "shipments", shipmentId));
  if (!shipmentSnap.exists()) throw new Error("Shipment not found");
  const { reward, ownerUid } = shipmentSnap.data();

  const response = await fetch('/.netlify/functions/create-payment', {
    method: 'POST',
    body: JSON.stringify({ amount: reward * 100, shipmentId, ownerUid })
  });
  const { clientSecret } = await response.json();
  return clientSecret;
};

// === PAYMENT: CONFIRM & HOLD IN ESCROW ===
export const confirmPayment = async (shipmentId, paymentIntentId) => {
  await updateDoc(doc(db, "shipments", shipmentId), {
    paymentIntentId,
    status: "paid",
    paidAt: new Date()
  });
};

// === TRACKING: UPDATE LOCATION (Carrier) ===
export const updateLocation = async (shipmentId, lat, lng) => {
  if (!auth.currentUser) throw new Error("Not logged in");
  await updateDoc(doc(db, "shipments", shipmentId), {
    location: { lat, lng },
    updatedAt: new Date()
  });
};

// === CARRIER: MARK AS DELIVERED ===
export const markDelivered = async (shipmentId) => {
  await updateDoc(doc(db, "shipments", shipmentId), {
    status: "delivered",
    deliveredAt: new Date()
  });
};

// === SHIPPER: CONFIRM DELIVERY & RELEASE PAYMENT ===
export const confirmDelivery = async (shipmentId, rating) => {
  const batch = writeBatch(db);
  const shipmentRef = doc(db, "shipments", shipmentId);
  const shipmentSnap = await getDoc(shipmentRef);
  const { carrierUid, reward } = shipmentSnap.data();

  batch.update(shipmentRef, {
    status: "completed",
    rating,
    completedAt: new Date()
  });

  const carrierRef = doc(db, "users", carrierUid);
  const carrierSnap = await getDoc(carrierRef);
  const data = carrierSnap.data();
  const newCount = (data.ratingCount || 0) + 1;
  const newRating = ((data.rating || 0) * data.ratingCount + rating) / newCount;

  batch.update(carrierRef, {
    totalEarned: (data.totalEarned || 0) + reward,
    rating: newRating,
    ratingCount: newCount
  });

  await batch.commit();

  await fetch('/.netlify/functions/release-payment', {
    method: 'POST',
    body: JSON.stringify({ shipmentId })
  });
};

// === REAL-TIME LISTENERS (WITH PICKUP/DROPOFF) ===
export const listenToOpenShipments = (callback) => {
  const q = query(
    collection(db, "shipments"),
    where("status", "in", ["open", "applied"]),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const shipments = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        pickupTime: data.pickupTime?.toDate(),
        dropoffTime: data.dropoffTime?.toDate()
      };
    });
    callback(shipments);
  });
};

export const listenToMyShipments = (callback) => {
  if (!auth.currentUser) return;
  const q = query(
    collection(db, "shipments"),
    where("ownerUid", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const shipments = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        pickupTime: data.pickupTime?.toDate(),
        dropoffTime: data.dropoffTime?.toDate()
      };
    });
    callback(shipments);
  });
};

export const listenToMyCarries = (callback) => {
  if (!auth.currentUser) return;
  const q = query(
    collection(db, "shipments"),
    where("carrierUid", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const shipments = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        pickupTime: data.pickupTime?.toDate(),
        dropoffTime: data.dropoffTime?.toDate()
      };
    });
    callback(shipments);
  });
};

export const listenToChat = (callback) => {
  if (!currentShipmentId) return;
  const q = query(
    collection(db, "shipments", currentShipmentId, "messages"),
    orderBy("sentAt")
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
};

export const sendMessage = async (text) => {
  if (!text || !currentShipmentId || !auth.currentUser) return;
  await addDoc(collection(db, "shipments", currentShipmentId, "messages"), {
    text,
    sender: auth.currentUser.email,
    sentAt: new Date()
  });
};
