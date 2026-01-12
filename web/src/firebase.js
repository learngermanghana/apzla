// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuration is loaded from environment variables set in .env.local
const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const missingKeys = requiredKeys.filter((key) => !import.meta.env[key]);

export const isFirebaseConfigured = missingKeys.length === 0;
export const firebaseConfigError = !isFirebaseConfigured
  ? `Missing Firebase environment variables: ${missingKeys.join(", ")}. Check your .env.local or Vercel project settings.`
  : "";

if (!isFirebaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(firebaseConfigError);
}

const firebaseConfig = isFirebaseConfigured
  ? {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }
  : null;

const HEARTBEAT_DATABASE = "firebase-heartbeat-database";
const HEARTBEAT_STORE = "firebase-heartbeat-store";

const openHeartbeatDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(HEARTBEAT_DATABASE);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const deleteHeartbeatDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(HEARTBEAT_DATABASE);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });

const ensureHeartbeatStore = async () => {
  if (typeof indexedDB === "undefined") return;

  if (typeof indexedDB.databases === "function") {
    const databases = await indexedDB.databases();
    const hasHeartbeatDb = databases.some((db) => db.name === HEARTBEAT_DATABASE);
    if (!hasHeartbeatDb) return;
  }

  try {
    const db = await openHeartbeatDatabase();
    const hasStore = db.objectStoreNames.contains(HEARTBEAT_STORE);
    db.close();

    if (!hasStore) {
      await deleteHeartbeatDatabase();
    }
  } catch (error) {
    // Ignore cleanup errors and allow Firebase to continue initialization.
  }
};

const initializeFirebaseApp = async () => {
  await ensureHeartbeatStore();
  return initializeApp(firebaseConfig);
};

// Initialize Firebase
const app = firebaseConfig ? await initializeFirebaseApp() : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app) : null;
export const storage = app ? getStorage(app) : null;
