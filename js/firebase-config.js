// js/firebase-config.js
// Central Firebase initialization, shared by every page via <script type="module">.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqVQMKd6tJ6EPitTnQojG5laiSSwwdAzo",
  authDomain: "ink-and-ember001.firebaseapp.com",
  projectId: "ink-and-ember001",
  storageBucket: "ink-and-ember001.firebasestorage.app",
  messagingSenderId: "863850658327",
  appId: "1:863850658327:web:56318e53782cde215cba52",
  measurementId: "G-P4TJ1JY7JH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Analytics only works over https/localhost and in supported browsers, so guard it.
let analytics = null;
analyticsIsSupported().then((ok) => {
  if (ok) analytics = getAnalytics(app);
});

export { app, db, analytics, collection, addDoc, doc, getDoc, updateDoc, serverTimestamp };
