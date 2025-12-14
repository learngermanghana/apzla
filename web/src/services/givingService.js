import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";

export const fetchGiving = async (
  db,
  churchId,
  { memberId, cursor, pageSize }
) => {
  const colRef = collection(db, "giving");
  const constraints = [where("churchId", "==", churchId)];

  if (memberId) {
    constraints.push(where("memberId", "==", memberId));
  }

  constraints.push(orderBy("createdAt", "desc"));

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize));
  const qGiving = query(colRef, ...constraints);
  const snapshot = await getDocs(qGiving);
  const data = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  const hasMore = snapshot.docs.length === pageSize;

  return { data, lastDoc, hasMore };
};

export const createGivingRecord = async (db, churchId, payload) => {
  return addDoc(collection(db, "giving"), {
    churchId,
    ...payload,
  });
};
