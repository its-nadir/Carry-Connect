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


