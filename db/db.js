// db.js — Firebase Database & Auth Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, doc, updateDoc, getDoc, getDocs, 
  onSnapshot, orderBy, query, where 
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

// === EXPORTS ===
export {
  db, auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  collection, addDoc, doc, updateDoc, getDoc, getDocs,
  onSnapshot, orderBy, query, where
};

// === DATABASE FUNCTIONS ===
let currentShipmentId = null;

// Set current chat ID
export const setCurrentShipmentId = (id) => currentShipmentId = id;

// Save Profile
export const saveProfile = async (name, phone) => {
  if (!auth.currentUser) throw new Error("Not logged in");
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    name, phone, email: auth.currentUser.email, updatedAt: new Date()
  });
};

// Post Shipment
export const saveShipment = async (from, to, weight) => {
  if (!auth.currentUser) throw new Error("Not logged in");
  return await addDoc(collection(db, "shipments"), {
    from, to, weight: Number(weight),
    owner: auth.currentUser.email,
    status: "Open",
    createdAt: new Date()
  });
};

// Accept Shipment
export const acceptShipment = async (id) => {
  if (!auth.currentUser) throw new Error("Not logged in");
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const name = userSnap.exists() ? userSnap.data().name : auth.currentUser.email;
  const rating = userSnap.exists() ? (userSnap.data().rating || 0) : 0;

  await updateDoc(doc(db, "shipments", id), {
    carrier: auth.currentUser.email,
    carrierName: name,
    carrierRating: rating,
    status: "Accepted",
    acceptedAt: new Date()
  });
};

// Rate Carrier
export const rateCarrier = async (shipmentId, stars) => {
  if (!auth.currentUser) throw new Error("Not logged in");
  await updateDoc(doc(db, "shipments", shipmentId), { rating: stars, ratedAt: new Date() });

  const shipmentSnap = await getDoc(doc(db, "shipments", shipmentId));
  const carrierEmail = shipmentSnap.data().carrier;
  const q = query(collection(db, "shipments"), where("carrier", "==", carrierEmail), where("rating", ">", 0));
  const ratingsSnap = await getDocs(q);
  let total = 0, count = 0;
  ratingsSnap.forEach(r => { total += r.data().rating; count++; });
  const avg = count > 0 ? (total / count).toFixed(1) : 0;

  const userQ = query(collection(db, "users"), where("email", "==", carrierEmail));
  const userSnap = await getDocs(userQ);
  if (!userSnap.empty) {
    await updateDoc(doc(db, "users", userSnap.docs[0].id), {
      rating: Number(avg),
      ratingCount: count
    });
  }
};

// Listen to User's Shipments (real-time)
export const listenToMyShipments = (callback) => {
  if (!auth.currentUser) return;
  const userEmail = auth.currentUser.email;
  const q = query(collection(db, "shipments"), orderBy("createdAt", "desc"));
  return onSnapshot(q, async (snap) => {
    const shipments = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.owner === userEmail || d.carrier === userEmail) {
        shipments.push({ id: doc.id, ...d });
      }
    }
    callback(shipments);
  });
};

// Listen to Chat (real-time)
export const listenToChat = (callback) => {
  if (!currentShipmentId) return;
  const msgRef = collection(db, "shipments", currentShipmentId, "messages");
  const q = query(msgRef, orderBy("sentAt"));
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
};

// Send Message
export const sendMessage = async (text) => {
  if (!text || !currentShipmentId || !auth.currentUser) return;
  await addDoc(collection(db, "shipments", currentShipmentId, "messages"), {
    text, sender: auth.currentUser.email, sentAt: new Date()
  });
};
