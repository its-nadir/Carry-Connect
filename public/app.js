// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBlYdXduw0F2PeqSIitcX038Ct8nCWI4rs",
  authDomain: "carry-connect-g-1d438.firebaseapp.com",
  projectId: "carry-connect-g-1d438",
  storageBucket: "carry-connect-g-1d438.appspot.com",
  messagingSenderId: "678996484347",
  appId: "1:678996484347:web:28f6039cc9b61030a6905e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fetch Firestore data
async function loadMessage() {
  const messageBox = document.getElementById("message");
  try {
    const ref = doc(db, "app", "message");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      messageBox.classList.remove("loading");
      messageBox.innerText = snap.data().text;
    } else {
      messageBox.innerText = "No message found";
    }
  } catch (error) {
    messageBox.innerText = "Error: " + error.message;
  }
}

loadMessage();
