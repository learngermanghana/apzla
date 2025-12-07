// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace with your real config from Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyDzaOPMtLohLI1BO9uTrl4xQHZg8Q2yU9c",
  authDomain: "apzla-bcc67.firebaseapp.com",
  projectId: "apzla-bcc67",
  storageBucket: "apzla-bcc67.firebasestorage.app",
  messagingSenderId: "877990005770",
  appId: "1:877990005770:web:1c540148e29b359075e3f3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
