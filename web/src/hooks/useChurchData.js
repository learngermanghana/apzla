import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase";

const overviewTabs = ["overview", "members", "attendance", "giving", "sermons", "followup"];

export function useChurchData(userProfile, activeTab, todayStr) {
  const [messages, setMessages] = useState([]);

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberForm, setMemberForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
  });

  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: todayStr,
    serviceType: "Sunday Service",
    adults: "",
    children: "",
    visitors: "",
    notes: "",
  });

  const [giving, setGiving] = useState([]);
  const [givingLoading, setGivingLoading] = useState(false);
  const [givingForm, setGivingForm] = useState({
    date: todayStr,
    serviceType: "Sunday Service",
    type: "Offering",
    amount: "",
    notes: "",
  });

  const [sermons, setSermons] = useState([]);
  const [sermonsLoading, setSermonsLoading] = useState(false);
  const [sermonForm, setSermonForm] = useState({
    date: todayStr,
    title: "",
    preacher: "",
    series: "",
    scripture: "",
    notes: "",
    link: "",
  });

  const [followupPastorName, setFollowupPastorName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setMessages([]);
    setMembers([]);
    setAttendance([]);
    setGiving([]);
    setSermons([]);
    setMemberForm((prev) => ({ ...prev, status: "VISITOR" }));
    setAttendanceForm((prev) => ({ ...prev, date: todayStr }));
    setGivingForm((prev) => ({ ...prev, date: todayStr }));
    setSermonForm((prev) => ({ ...prev, date: todayStr }));
  }, [userProfile?.churchId, todayStr]);

  const handleAddTestDoc = async () => {
    if (!userProfile?.churchId) {
      alert("No church linked yet.");
      return;
    }

    try {
      setActionLoading(true);
      const colRef = collection(db, "testMessages");

      await addDoc(colRef, {
        text: `Hello from Apzla 👋 (church: ${
          userProfile.churchName || userProfile.churchId
        })`,
        createdAt: new Date().toISOString(),
        churchId: userProfile.churchId,
      });

      const q = query(colRef, where("churchId", "==", userProfile.churchId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(data);
    } catch (err) {
      console.error("Firestore error:", err);
      alert("Error talking to Firestore. Check the console.");
    } finally {
      setActionLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!userProfile?.churchId) return;
    try {
      setMembersLoading(true);
      const colRef = collection(db, "members");
      const qMembers = query(colRef, where("churchId", "==", userProfile.churchId));
      const snapshot = await getDocs(qMembers);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers(data);
    } catch (err) {
      console.error("Load members error:", err);
      alert("Error loading members.");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCreateMember = async () => {
    if (!userProfile?.churchId) return;

    if (!memberForm.firstName.trim()) {
      alert("First name is required.");
      return;
    }

    try {
      setActionLoading(true);
      await addDoc(collection(db, "members"), {
        churchId: userProfile.churchId,
        firstName: memberForm.firstName.trim(),
        lastName: memberForm.lastName.trim(),
        phone: memberForm.phone.trim(),
        email: memberForm.email.trim(),
        status: memberForm.status,
        createdAt: new Date().toISOString(),
      });

      setMemberForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        status: "VISITOR",
      });

      await loadMembers();
    } catch (err) {
      console.error("Create member error:", err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (overviewTabs.includes(activeTab) && userProfile?.churchId) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  const loadAttendance = async () => {
    if (!userProfile?.churchId) return;
    try {
      setAttendanceLoading(true);
      const colRef = collection(db, "attendance");
      const qAtt = query(colRef, where("churchId", "==", userProfile.churchId));
      const snapshot = await getDocs(qAtt);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAttendance(data);
    } catch (err) {
      console.error("Load attendance error:", err);
      alert("Error loading attendance.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCreateAttendance = async () => {
    if (!userProfile?.churchId) return;

    if (!attendanceForm.date) {
      alert("Please select a date.");
      return;
    }

    try {
      setActionLoading(true);
      await addDoc(collection(db, "attendance"), {
        churchId: userProfile.churchId,
        date: attendanceForm.date,
        serviceType: attendanceForm.serviceType.trim() || "Service",
        adults: attendanceForm.adults ? Number(attendanceForm.adults) : 0,
        children: attendanceForm.children ? Number(attendanceForm.children) : 0,
        visitors: attendanceForm.visitors ? Number(attendanceForm.visitors) : 0,
        notes: attendanceForm.notes.trim(),
        createdAt: new Date().toISOString(),
      });

      setAttendanceForm({
        date: todayStr,
        serviceType: "Sunday Service",
        adults: "",
        children: "",
        visitors: "",
        notes: "",
      });

      await loadAttendance();
    } catch (err) {
      console.error("Create attendance error:", err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if ((activeTab === "attendance" || activeTab === "overview") && userProfile?.churchId) {
      loadAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  const loadGiving = async () => {
    if (!userProfile?.churchId) return;
    try {
      setGivingLoading(true);
      const colRef = collection(db, "giving");
      const qGiving = query(colRef, where("churchId", "==", userProfile.churchId));
      const snapshot = await getDocs(qGiving);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGiving(data);
    } catch (err) {
      console.error("Load giving error:", err);
      alert("Error loading giving records.");
    } finally {
      setGivingLoading(false);
    }
  };

  const handleCreateGiving = async () => {
    if (!userProfile?.churchId) return;

    if (!givingForm.date) {
      alert("Please select a date.");
      return;
    }
    if (!givingForm.amount) {
      alert("Please enter an amount.");
      return;
    }

    try {
      setActionLoading(true);
      await addDoc(collection(db, "giving"), {
        churchId: userProfile.churchId,
        date: givingForm.date,
        serviceType: givingForm.serviceType.trim() || "Service",
        type: givingForm.type,
        amount: Number(givingForm.amount),
        notes: givingForm.notes.trim(),
        createdAt: new Date().toISOString(),
      });

      setGivingForm({
        date: todayStr,
        serviceType: "Sunday Service",
        type: "Offering",
        amount: "",
        notes: "",
      });

      await loadGiving();
    } catch (err) {
      console.error("Create giving error:", err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if ((activeTab === "giving" || activeTab === "overview") && userProfile?.churchId) {
      loadGiving();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  const loadSermons = async () => {
    if (!userProfile?.churchId) return;
    try {
      setSermonsLoading(true);
      const colRef = collection(db, "sermons");
      const qSermons = query(colRef, where("churchId", "==", userProfile.churchId));
      const snapshot = await getDocs(qSermons);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSermons(data);
    } catch (err) {
      console.error("Load sermons error:", err);
      alert("Error loading sermon records.");
    } finally {
      setSermonsLoading(false);
    }
  };

  const handleCreateSermon = async () => {
    if (!userProfile?.churchId) return;

    if (!sermonForm.date || !sermonForm.title.trim()) {
      alert("Please enter at least the date and sermon title.");
      return;
    }

    try {
      setActionLoading(true);
      await addDoc(collection(db, "sermons"), {
        churchId: userProfile.churchId,
        date: sermonForm.date,
        title: sermonForm.title.trim(),
        preacher: sermonForm.preacher.trim(),
        series: sermonForm.series.trim(),
        scripture: sermonForm.scripture.trim(),
        notes: sermonForm.notes.trim(),
        link: sermonForm.link.trim(),
        createdAt: new Date().toISOString(),
      });

      setSermonForm({
        date: todayStr,
        title: "",
        preacher: "",
        series: "",
        scripture: "",
        notes: "",
        link: "",
      });

      await loadSermons();
    } catch (err) {
      console.error("Create sermon error:", err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if ((activeTab === "sermons" || activeTab === "overview") && userProfile?.churchId) {
      loadSermons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  const visitorMembers = useMemo(
    () => members.filter((m) => (m.status || "").toUpperCase() === "VISITOR"),
    [members]
  );

  const visitorTemplate = useMemo(
    () =>
      `Hi, thank you for worshipping with us at ${
        userProfile?.churchName || "our church"
      } today. We’re glad you came. God bless you!${
        followupPastorName ? ` – ${followupPastorName}` : ""
      }`,
    [userProfile?.churchName, followupPastorName]
  );

  return {
    actionLoading,
    attendance,
    attendanceForm,
    attendanceLoading,
    followupPastorName,
    giving,
    givingForm,
    givingLoading,
    handleAddTestDoc,
    handleCreateAttendance,
    handleCreateGiving,
    handleCreateMember,
    handleCreateSermon,
    loadAttendance,
    loadGiving,
    loadMembers,
    loadSermons,
    memberForm,
    members,
    membersLoading,
    messages,
    sermonForm,
    sermons,
    sermonsLoading,
    setAttendanceForm,
    setFollowupPastorName,
    setGivingForm,
    setMemberForm,
    setSermonForm,
    visitorMembers,
    visitorTemplate,
  };
}
