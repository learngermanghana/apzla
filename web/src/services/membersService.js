import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";

export const fetchMembers = async (db, churchId, { cursor, pageSize }) => {
  const colRef = collection(db, "members");
  const constraints = [where("churchId", "==", churchId), orderBy("createdAt", "desc")];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize));

  const qMembers = query(colRef, ...constraints);
  const snapshot = await getDocs(qMembers);
  const data = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  const hasMore = snapshot.docs.length === pageSize;

  return { data, lastDoc, hasMore };
};

export const createMember = async (db, churchId, payload) => {
  return addDoc(collection(db, "members"), {
    churchId,
    ...payload,
  });
};

export const updateMember = async (db, memberId, payload) => {
  const docRef = doc(db, "members", memberId);
  await updateDoc(docRef, payload);
};

export const deleteMemberById = async (db, memberId) => {
  const docRef = doc(db, "members", memberId);
  await deleteDoc(docRef);
};
