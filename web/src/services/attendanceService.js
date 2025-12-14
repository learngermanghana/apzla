import { addDoc, collection, getDocs, query, where } from "firebase/firestore";

export const fetchAttendance = async (db, churchId) => {
  const colRef = collection(db, "attendance");
  const qAtt = query(colRef, where("churchId", "==", churchId));
  const snapshot = await getDocs(qAtt);
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
};

export const createAttendance = async (db, churchId, payload) => {
  return addDoc(collection(db, "attendance"), {
    churchId,
    ...payload,
  });
};

export const fetchMemberAttendanceHistory = async (db, churchId) => {
  const colRef = collection(db, "memberAttendance");
  const qMemberAttendance = query(colRef, where("churchId", "==", churchId));
  const snapshot = await getDocs(qMemberAttendance);
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
};

export const fetchMemberAttendance = async (
  db,
  churchId,
  { date, serviceType }
) => {
  const colRef = collection(db, "memberAttendance");
  const qMemberAttendance = query(
    colRef,
    where("churchId", "==", churchId),
    where("date", "==", date),
    where("serviceType", "==", serviceType)
  );
  const snapshot = await getDocs(qMemberAttendance);
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
};

export const createMemberAttendance = async (db, churchId, payload) => {
  return addDoc(collection(db, "memberAttendance"), {
    churchId,
    ...payload,
  });
};
