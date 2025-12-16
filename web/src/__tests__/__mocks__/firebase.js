import { vi } from "vitest";

export const firebaseConfigError = "";
export const isFirebaseConfigured = true;

const authStateListeners = new Set();
const firestoreData = new Map();

export const auth = { currentUser: null };
export const functions = {};
export const db = { __mockData: firestoreData };

const getCollectionMap = (name) => {
  if (!firestoreData.has(name)) {
    firestoreData.set(name, new Map());
  }

  return firestoreData.get(name);
};

export const createMockUser = (overrides = {}) => ({
  uid: overrides.uid || "mock-user",
  email: overrides.email || "mock.user@example.com",
  emailVerified: overrides.emailVerified ?? true,
  reload: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

export const setMockAuthUser = (user) => {
  auth.currentUser = user;
  authStateListeners.forEach((callback) => callback(user));
};

export const resetMockFirebase = () => {
  auth.currentUser = null;
  firestoreData.clear();
  authStateListeners.clear();
  signInWithEmailAndPassword.mockClear();
  createUserWithEmailAndPassword.mockClear();
  sendPasswordResetEmail.mockClear();
  sendEmailVerification.mockClear();
  signOut.mockClear();
};

export const onAuthStateChanged = (authInstance, callback) => {
  authStateListeners.add(callback);
  callback(authInstance.currentUser);
  return () => authStateListeners.delete(callback);
};

export const signInWithEmailAndPassword = vi.fn(async (authInstance, email) => {
  const user = createMockUser({ email });
  setMockAuthUser(user);
  return { user };
});

export const createUserWithEmailAndPassword = vi.fn(
  async (authInstance, email, password) => {
    const user = createMockUser({
      uid: "new-user",
      email,
      emailVerified: false,
      reload: vi.fn().mockResolvedValue(undefined),
    });
    setMockAuthUser(user);
    return { user };
  }
);

export const sendPasswordResetEmail = vi.fn(async (authInstance, email) => {
  if (!email || email.includes("fail")) {
    throw new Error("Unable to send password reset email");
  }
});

export const sendEmailVerification = vi.fn(async () => ({}));

export const signOut = vi.fn(async () => {
  setMockAuthUser(null);
});

export const collection = (dbInstance, name) => ({ collection: name, name });
export const doc = (dbInstance, collectionName, id) => ({
  collection: collectionName,
  id,
});

export const setDoc = vi.fn(async (ref, data) => {
  const map = getCollectionMap(ref.collection);
  map.set(ref.id, data);
});

export const addDoc = vi.fn(async (colRef, data) => {
  const map = getCollectionMap(colRef.collection || colRef.name);
  const id = `mock-${map.size + 1}`;
  map.set(id, data);
  return { id };
});

export const updateDoc = vi.fn(async (ref, data) => {
  const map = getCollectionMap(ref.collection);
  const existing = map.get(ref.id) || {};
  map.set(ref.id, { ...existing, ...data });
});

export const deleteDoc = vi.fn(async (ref) => {
  const map = getCollectionMap(ref.collection);
  map.delete(ref.id);
});

export const getDoc = vi.fn(async (ref) => {
  const map = getCollectionMap(ref.collection);
  const data = map.get(ref.id);
  return {
    exists: () => data !== undefined,
    id: ref.id,
    data: () => data,
  };
});

export const where = (field, op, value) => ({ field, op, value });

export const query = (colRef, ...clauses) => ({
  ...colRef,
  clauses,
});

export const getDocs = vi.fn(async (queryRef) => {
  const map = getCollectionMap(queryRef.collection || queryRef.name);
  const docs = Array.from(map.entries())
    .filter(([_, data]) =>
      (queryRef.clauses || []).every((clause) =>
        clause && clause.field
          ? data[clause.field] === clause.value
          : true
      )
    )
    .map(([id, data]) => ({ id, data: () => data }));

  return { docs };
});

export const httpsCallableFromURL = (functionsInstance, url) =>
  vi.fn(async (payload) => ({ data: { url, payload } }));

export const setMockUserProfile = (uid, profile) => {
  const map = getCollectionMap("users");
  map.set(uid, profile);
};
