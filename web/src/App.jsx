// src/App.jsx
import { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import AuthPanel from "./components/auth/AuthPanel";
import ChurchSetupPanel from "./components/church/ChurchSetupPanel";
import "./App.css";
import { useAuthProfile } from "./hooks/useAuthProfile";

function App() {
  const { user, userProfile, setUserProfile, profileLoading } = useAuthProfile();

  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Dashboard tabs: "overview" | "members" | "attendance" | "giving" | "sermons" | "followup"
  const [activeTab, setActiveTab] = useState("overview");

  // Overview tab state
  const [messages, setMessages] = useState([]);

  // Church creation form
  const [churchName, setChurchName] = useState("");
  const [churchCountry, setChurchCountry] = useState("Ghana");
  const [churchCity, setChurchCity] = useState("");

  // Members (CRM)
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberForm, setMemberForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
  });

  // Attendance
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [attendanceForm, setAttendanceForm] = useState({
    date: todayStr,
    serviceType: "Sunday Service",
    adults: "",
    children: "",
    visitors: "",
    notes: "",
  });

  // Member attendance (per person check-ins)
  const [memberAttendance, setMemberAttendance] = useState([]);
  const [memberAttendanceLoading, setMemberAttendanceLoading] = useState(false);
  const [memberAttendanceForm, setMemberAttendanceForm] = useState({
    date: todayStr,
    serviceType: "Sunday Service",
    search: "",
  });

  // Giving (collections & tithes)
  const [giving, setGiving] = useState([]);
  const [givingLoading, setGivingLoading] = useState(false);
  const [givingForm, setGivingForm] = useState({
    date: todayStr,
    serviceType: "Sunday Service",
    type: "Offering", // Offering | Tithe | Special
    amount: "",
    notes: "",
  });

  // Sermons
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

  // Follow-up
  const [followupPastorName, setFollowupPastorName] = useState("");

  const showToast = (message, variant = "info") => {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4200);
  };

  // ---------- Reset data when auth user changes ----------
  useEffect(() => {
    setMessages([]);
    setMembers([]);
    setAttendance([]);
    setGiving([]);
    setSermons([]);
  }, [user?.uid]);

  // ---------- Auth handlers ----------
  const validateAuthInputs = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) return "Email is required.";

    // Basic email pattern check to avoid immediate Firebase rejection
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) return "Enter a valid email address.";

    if (!password) return "Password is required.";
    if (password.length < 6)
      return "Password must be at least 6 characters long.";

    return "";
  };

  const handleRegister = async () => {
    const validationMessage = validateAuthInputs();
    if (validationMessage) {
      setAuthError(validationMessage);
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError("");
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error("Register error:", err);
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    const validationMessage = validateAuthInputs();
    if (validationMessage) {
      setAuthError(validationMessage);
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError("");
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error("Login error:", err);
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // ---------- Create church + user profile ----------
  const handleCreateChurch = async () => {
    if (!user) return;

    if (!churchName.trim()) {
      showToast("Please enter a church name.", "error");
      return;
    }

    try {
      setLoading(true);

      const churchRef = await addDoc(collection(db, "churches"), {
        name: churchName.trim(),
        country: churchCountry.trim(),
        city: churchCity.trim(),
        ownerUserId: user.uid,
        createdAt: new Date().toISOString(),
      });

      const churchId = churchRef.id;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        churchId,
        role: "CHURCH_ADMIN",
        churchName: churchName.trim(),
        createdAt: new Date().toISOString(),
      });

      setUserProfile({
        id: user.uid,
        email: user.email,
        churchId,
        role: "CHURCH_ADMIN",
        churchName: churchName.trim(),
      });

      showToast("Church created and linked to your account.", "success");
    } catch (err) {
      console.error("Create church error:", err);
      showToast(err.message || "Unable to create church.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Firestore test (overview, scoped by church) ----------
  const handleAddTestDoc = async () => {
    if (!userProfile?.churchId) {
      showToast("No church linked yet.", "error");
      return;
    }

    try {
      setLoading(true);
      const colRef = collection(db, "testMessages");

      await addDoc(colRef, {
        text: `Hello from Apzla 👋 (church: ${
          userProfile.churchName || userProfile.churchId
        }, user: ${user?.email || "unknown"})`,
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
      showToast("Test message saved to Firestore.", "success");
    } catch (err) {
      console.error("Firestore error:", err);
      showToast("Error talking to Firestore. Check the console.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Members (CRM) ----------
  const loadMembers = async () => {
    if (!userProfile?.churchId) return;
    try {
      setMembersLoading(true);
      const colRef = collection(db, "members");
      const qMembers = query(
        colRef,
        where("churchId", "==", userProfile.churchId)
      );
      const snapshot = await getDocs(qMembers);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers(data);
    } catch (err) {
      console.error("Load members error:", err);
      showToast("Error loading members.", "error");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCreateMember = async () => {
    if (!userProfile?.churchId) return;

    if (!memberForm.firstName.trim()) {
      showToast("First name is required.", "error");
      return;
    }

    try {
      setLoading(true);
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
      showToast("Member saved.", "success");
    } catch (err) {
      console.error("Create member error:", err);
      showToast(err.message || "Unable to save member.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      (activeTab === "members" ||
        activeTab === "overview" ||
        activeTab === "followup" ||
        activeTab === "checkin") &&
      userProfile?.churchId
    ) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  // ---------- Attendance ----------
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
      showToast("Error loading attendance.", "error");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCreateAttendance = async () => {
    if (!userProfile?.churchId) return;

    if (!attendanceForm.date) {
      showToast("Please select a date.", "error");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "attendance"), {
        churchId: userProfile.churchId,
        date: attendanceForm.date,
        serviceType: attendanceForm.serviceType.trim() || "Service",
        adults: attendanceForm.adults ? Number(attendanceForm.adults) : 0,
        children: attendanceForm.children
          ? Number(attendanceForm.children)
          : 0,
        visitors: attendanceForm.visitors
          ? Number(attendanceForm.visitors)
          : 0,
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
      showToast("Attendance saved.", "success");
    } catch (err) {
      console.error("Create attendance error:", err);
      showToast(err.message || "Unable to save attendance.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      (activeTab === "attendance" || activeTab === "overview") &&
      userProfile?.churchId
    ) {
      loadAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  // ---------- Member attendance (per-person check-ins) ----------
  const loadMemberAttendance = async () => {
    if (!userProfile?.churchId) return;
    try {
      setMemberAttendanceLoading(true);
      const normalizedServiceType =
        memberAttendanceForm.serviceType.trim() || "Service";

      const colRef = collection(db, "memberAttendance");
      const qMemberAttendance = query(
        colRef,
        where("churchId", "==", userProfile.churchId),
        where("date", "==", memberAttendanceForm.date),
        where("serviceType", "==", normalizedServiceType)
      );

      const snapshot = await getDocs(qMemberAttendance);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMemberAttendance(data);
    } catch (err) {
      console.error("Load member attendance error:", err);
      showToast("Error loading member attendance.", "error");
    } finally {
      setMemberAttendanceLoading(false);
    }
  };

  const handleCheckInMember = async (memberId) => {
    if (!userProfile?.churchId) return;

    const alreadyPresent = memberAttendance.some((a) => a.memberId === memberId);
    if (alreadyPresent) return;

    try {
      setLoading(true);
      const normalizedServiceType =
        memberAttendanceForm.serviceType.trim() || "Service";

      await addDoc(collection(db, "memberAttendance"), {
        churchId: userProfile.churchId,
        memberId,
        date: memberAttendanceForm.date,
        serviceType: normalizedServiceType,
        checkedInAt: new Date().toISOString(),
        source: "ADMIN",
      });

      await loadMemberAttendance();
      showToast("Member marked present.", "success");
    } catch (err) {
      console.error("Create member attendance error:", err);
      showToast(err.message || "Unable to mark member present.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "checkin" && userProfile?.churchId) {
      loadMemberAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId, memberAttendanceForm.date, memberAttendanceForm.serviceType]);

  // ---------- Giving ----------
  const loadGiving = async () => {
    if (!userProfile?.churchId) return;
    try {
      setGivingLoading(true);
      const colRef = collection(db, "giving");
      const qGiving = query(
        colRef,
        where("churchId", "==", userProfile.churchId)
      );
      const snapshot = await getDocs(qGiving);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGiving(data);
    } catch (err) {
      console.error("Load giving error:", err);
      showToast("Error loading giving records.", "error");
    } finally {
      setGivingLoading(false);
    }
  };

  const handleCreateGiving = async () => {
    if (!userProfile?.churchId) return;

    if (!givingForm.date) {
      showToast("Please select a date.", "error");
      return;
    }
    if (!givingForm.amount) {
      showToast("Please enter an amount.", "error");
      return;
    }

    try {
      setLoading(true);
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
      showToast("Giving record saved.", "success");
    } catch (err) {
      console.error("Create giving error:", err);
      showToast(err.message || "Unable to save giving record.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      (activeTab === "giving" || activeTab === "overview") &&
      userProfile?.churchId
    ) {
      loadGiving();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  // ---------- Sermons ----------
  const loadSermons = async () => {
    if (!userProfile?.churchId) return;
    try {
      setSermonsLoading(true);
      const colRef = collection(db, "sermons");
      const qSermons = query(
        colRef,
        where("churchId", "==", userProfile.churchId)
      );
      const snapshot = await getDocs(qSermons);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSermons(data);
    } catch (err) {
      console.error("Load sermons error:", err);
      showToast("Error loading sermon records.", "error");
    } finally {
      setSermonsLoading(false);
    }
  };

  const handleCreateSermon = async () => {
    if (!userProfile?.churchId) return;

    if (!sermonForm.date || !sermonForm.title.trim()) {
      showToast("Please enter at least the date and sermon title.", "error");
      return;
    }

    try {
      setLoading(true);
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
      showToast("Sermon saved.", "success");
    } catch (err) {
      console.error("Create sermon error:", err);
      showToast(err.message || "Unable to save sermon.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "sermons" && userProfile?.churchId) {
      loadSermons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  const authValidationMessage = validateAuthInputs();

  // ---------- UI: Auth screen ----------
  if (!user) {
    return (
      <AuthPanel
        authMode={authMode}
        setAuthMode={(mode) => {
          setAuthMode(mode);
          setAuthError("");
        }}
        email={email}
        password={password}
        onEmailChange={(e) => {
          setEmail(e.target.value);
          setAuthError("");
        }}
        onPasswordChange={(e) => {
          setPassword(e.target.value);
          setAuthError("");
        }}
        onSubmit={authMode === "login" ? handleLogin : handleRegister}
        loading={authLoading}
        errorMessage={authError}
        disableSubmit={!!authValidationMessage || authLoading}
        validationMessage={authValidationMessage}
      />
    );
  }

  // ---------- UI: loading profile ----------
  if (profileLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "420px",
            width: "100%",
            boxShadow: "0 15px 30px rgba(15,23,42,0.1)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "14px", color: "#4b5563" }}>
            Loading your profile…
          </p>
        </div>
      </div>
    );
  }

  // ---------- UI: user logged in but no church yet ----------
  if (user && !userProfile) {
    return (
      <ChurchSetupPanel
        userEmail={user.email}
        churchName={churchName}
        churchCountry={churchCountry}
        churchCity={churchCity}
        onChangeChurchName={(e) => setChurchName(e.target.value)}
        onChangeChurchCountry={(e) => setChurchCountry(e.target.value)}
        onChangeChurchCity={(e) => setChurchCity(e.target.value)}
        onCreateChurch={handleCreateChurch}
        onLogout={handleLogout}
        loading={loading}
      />
    );
  }

  // ---------- UI: dashboard (user + church) ----------

  // Overview summary metrics
  const totalMembers = members.length;

  let lastAttendanceTotal = 0;
  let lastAttendanceDate = "";
  if (attendance.length > 0) {
    const sortedAttendance = [...attendance].sort((a, b) => {
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date.localeCompare(b.date);
    });
    const last = sortedAttendance[sortedAttendance.length - 1];
    const adults = Number(last.adults || 0);
    const children = Number(last.children || 0);
    const visitors = Number(last.visitors || 0);
    lastAttendanceTotal = adults + children + visitors;
    lastAttendanceDate = last.date || "";
  }

  const normalizedMemberSearch = memberAttendanceForm.search
    .toLowerCase()
    .trim();
  const filteredMembers = members.filter((m) => {
    if (!normalizedMemberSearch) return true;
    const fullName = `${m.firstName || ""} ${m.lastName || ""}`
      .toLowerCase()
      .trim();
    const phone = (m.phone || "").toLowerCase();
    const email = (m.email || "").toLowerCase();

    return (
      fullName.includes(normalizedMemberSearch) ||
      phone.includes(normalizedMemberSearch) ||
      email.includes(normalizedMemberSearch)
    );
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  let givingThisMonth = 0;
  giving.forEach((g) => {
    if (!g.date) return;
    const d = new Date(g.date);
    if (Number.isNaN(d.getTime())) return;
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      givingThisMonth += Number(g.amount || 0);
    }
  });

  const totalAttendanceRecords = attendance.length;
  let totalAttendanceCount = 0;
  let attendanceThisMonthTotal = 0;

  attendance.forEach((record) => {
    const adults = Number(record.adults || 0);
    const children = Number(record.children || 0);
    const visitors = Number(record.visitors || 0);
    const total = adults + children + visitors;

    totalAttendanceCount += total;

    if (record.date) {
      const recordDate = new Date(record.date);

      if (
        !Number.isNaN(recordDate) &&
        recordDate.getFullYear() === currentYear &&
        recordDate.getMonth() === currentMonth
      ) {
        attendanceThisMonthTotal += total;
      }
    }
  });

  const averageAttendance =
    totalAttendanceRecords > 0
      ? Math.round((totalAttendanceCount / totalAttendanceRecords) * 10) / 10
      : 0;

  // Follow-up templates (visitors)
  const visitorTemplate = `Hi, thank you for worshipping with us at ${
    userProfile.churchName || "our church"
  } today. We’re glad you came. God bless you!${
    followupPastorName ? ` – ${followupPastorName}` : ""
  }`;

  const visitorMembers = members.filter(
    (m) => (m.status || "").toUpperCase() === "VISITOR"
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.variant}`}
          >
            <span className="toast-message">{toast.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              aria-label="Dismiss toast"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "980px",
          width: "100%",
          boxShadow: "0 15px 30px rgba(15,23,42,0.1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                marginBottom: "4px",
              }}
            >
              ⛪ Apzla Dashboard
            </h1>
            <p
              style={{
                margin: 0,
                color: "#4b5563",
                fontSize: "13px",
              }}
            >
              Where Ministry Meets Order.
            </p>
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "12px",
              }}
            >
              Church:{" "}
              <strong>{userProfile.churchName || userProfile.churchId}</strong>
            </p>
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "12px",
              }}
            >
              Logged in as <strong>{user.email}</strong> ({userProfile.role})
            </p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "8px 12px",
              borderRadius: "999px",
              border: "none",
              background: "#ef4444",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div
          className="dashboard-tabs"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          <button
            onClick={() => setActiveTab("overview")}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "none",
              background:
                activeTab === "overview" ? "#111827" : "#e5e7eb",
              color: activeTab === "overview" ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("members")}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "none",
              background:
                activeTab === "members" ? "#111827" : "#e5e7eb",
              color: activeTab === "members" ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            Members (CRM)
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "none",
              background:
                activeTab === "attendance" ? "#111827" : "#e5e7eb",
              color: activeTab === "attendance" ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab("checkin")}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "none",
              background:
                activeTab === "checkin" ? "#111827" : "#e5e7eb",
              color: activeTab === "checkin" ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            Check-in (Per Member)
          </button>
          <button
            onClick={() => setActiveTab("giving")}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "none",
              background:
                activeTab === "giving" ? "#111827" : "#e5e7eb",
              color: activeTab === "giving" ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            Giving (Tithes & Offerings)
          </button>
          <button
            onClick={() => setActiveTab("followup")}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "none",
              background:
                activeTab === "followup" ? "#111827" : "#e5e7eb",
              color: activeTab === "followup" ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            Follow-up
          </button>
          <button
            onClick={() => setActiveTab("sermons")}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: "none",
              background:
                activeTab === "sermons" ? "#111827" : "#e5e7eb",
              color: activeTab === "sermons" ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            Sermons
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <>
            <p
              style={{
                marginBottom: "16px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              This is your starting dashboard for{" "}
              <strong>{userProfile.churchName}</strong>. You can test
              that Firestore works and that data is scoped to this
              church only:
            </p>

            {/* Summary cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "12px",
                marginBottom: "20px",
                maxWidth: "720px",
              }}
            >
              {/* Total members */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Total members
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {totalMembers}
                </div>
              </div>

              {/* Last attendance */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Last service attendance
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {lastAttendanceTotal}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginTop: "2px",
                  }}
                >
                  {lastAttendanceDate
                    ? lastAttendanceDate
                    : "No attendance yet"}
                </div>
              </div>

              {/* Giving this month */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Giving this month
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {givingThisMonth.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginTop: "2px",
                  }}
                >
                  {givingThisMonth > 0
                    ? "Current month total"
                    : "No giving records this month"}
                </div>
              </div>
            </div>

            {/* Attendance summary */}
            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  color: "#111827",
                }}
              >
                Attendance summary
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                  maxWidth: "900px",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Services tracked
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {totalAttendanceRecords}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    {totalAttendanceRecords > 0
                      ? "Lifetime services logged"
                      : "No attendance yet"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Average per service
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {averageAttendance}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    {totalAttendanceRecords > 0
                      ? "Across all attendance logs"
                      : "Add attendance to see averages"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    This month attendance
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {attendanceThisMonthTotal}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    {attendanceThisMonthTotal > 0
                      ? "Adults, children, and visitors combined"
                      : "No attendance logged this month"}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddTestDoc}
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#6b7280" : "#111827",
                color: "white",
                cursor: loading ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {loading ? "Working..." : "Add & Fetch Test Data"}
            </button>

            <div style={{ marginTop: "24px" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Messages from Firestore
              </h2>

              {messages.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                  No data yet. Click the button above to create the
                  first record.
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    fontSize: "14px",
                    color: "#111827",
                  }}
                >
                  {messages.map((m) => (
                    <li
                      key={m.id}
                      style={{
                        padding: "8px 0",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div>{m.text}</div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                        }}
                      >
                        {m.createdAt}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {activeTab === "members" && (
          <>
            <p
              style={{
                marginBottom: "16px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Manage your church members, visitors, and follow-ups. This
              is the start of Apzla&apos;s customer management (CRM)
              features.
            </p>

            {/* Member form */}
            <div
              className="member-form-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "8px",
                marginBottom: "12px",
                maxWidth: "520px",
              }}
            >
              <input
                type="text"
                placeholder="First name"
                value={memberForm.firstName}
                onChange={(e) =>
                  setMemberForm((f) => ({
                    ...f,
                    firstName: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Last name"
                value={memberForm.lastName}
                onChange={(e) =>
                  setMemberForm((f) => ({
                    ...f,
                    lastName: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Phone"
                value={memberForm.phone}
                onChange={(e) =>
                  setMemberForm((f) => ({
                    ...f,
                    phone: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="email"
                placeholder="Email"
                value={memberForm.email}
                onChange={(e) =>
                  setMemberForm((f) => ({
                    ...f,
                    email: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <select
                value={memberForm.status}
                onChange={(e) =>
                  setMemberForm((f) => ({
                    ...f,
                    status: e.target.value,
                  }))
                }
                style={{
                  gridColumn: "span 2",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              >
                <option value="VISITOR">Visitor</option>
                <option value="NEW_CONVERT">New Convert</option>
                <option value="REGULAR">Regular</option>
                <option value="WORKER">Worker</option>
                <option value="PASTOR">Pastor</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <button
              onClick={handleCreateMember}
              disabled={loading}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#6b7280" : "#111827",
                color: "white",
                cursor: loading ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "16px",
              }}
            >
              {loading ? "Saving..." : "Save member"}
            </button>

            <div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Members
              </h2>

              {membersLoading ? (
                <p style={{ fontSize: "14px", color: "#6b7280" }}>
                  Loading members…
                </p>
              ) : members.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  No members yet. Add your first member above.
                </p>
              ) : (
                <div className="members-table-wrapper" style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <th style={{ padding: "6px 4px" }}>Name</th>
                        <th style={{ padding: "6px 4px" }}>Phone</th>
                        <th style={{ padding: "6px 4px" }}>Email</th>
                        <th style={{ padding: "6px 4px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr
                          key={m.id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <td style={{ padding: "6px 4px" }}>
                            {m.firstName} {m.lastName}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {m.phone || "-"}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {m.email || "-"}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {m.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "attendance" && (
          <>
            <p
              style={{
                marginBottom: "16px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Record attendance for each service. This helps you track
              growth over time for{" "}
              <strong>{userProfile.churchName}</strong>.
            </p>

            {/* Attendance form */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "8px",
                marginBottom: "12px",
                maxWidth: "620px",
              }}
            >
              <input
                type="date"
                value={attendanceForm.date}
                onChange={(e) =>
                  setAttendanceForm((f) => ({
                    ...f,
                    date: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Service type (e.g. Sunday Service)"
                value={attendanceForm.serviceType}
                onChange={(e) =>
                  setAttendanceForm((f) => ({
                    ...f,
                    serviceType: e.target.value,
                  }))
                }
                style={{
                  gridColumn: "span 2",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />

              <input
                type="number"
                min="0"
                placeholder="Adults"
                value={attendanceForm.adults}
                onChange={(e) =>
                  setAttendanceForm((f) => ({
                    ...f,
                    adults: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="number"
                min="0"
                placeholder="Children"
                value={attendanceForm.children}
                onChange={(e) =>
                  setAttendanceForm((f) => ({
                    ...f,
                    children: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="number"
                min="0"
                placeholder="Visitors"
                value={attendanceForm.visitors}
                onChange={(e) =>
                  setAttendanceForm((f) => ({
                    ...f,
                    visitors: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />

              <textarea
                placeholder="Notes (optional)"
                value={attendanceForm.notes}
                onChange={(e) =>
                  setAttendanceForm((f) => ({
                    ...f,
                    notes: e.target.value,
                  }))
                }
                rows={2}
                style={{
                  gridColumn: "span 3",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  resize: "vertical",
                }}
              />
            </div>

            <button
              onClick={handleCreateAttendance}
              disabled={loading}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#6b7280" : "#111827",
                color: "white",
                cursor: loading ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "16px",
              }}
            >
              {loading ? "Saving..." : "Save attendance"}
            </button>

            <div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Attendance records
              </h2>

              {attendanceLoading ? (
                <p style={{ fontSize: "14px", color: "#6b7280" }}>
                  Loading attendance…
                </p>
              ) : attendance.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  No attendance records yet. Save your first one above.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <th style={{ padding: "6px 4px" }}>Date</th>
                        <th style={{ padding: "6px 4px" }}>Service</th>
                        <th style={{ padding: "6px 4px" }}>Adults</th>
                        <th style={{ padding: "6px 4px" }}>
                          Children
                        </th>
                        <th style={{ padding: "6px 4px" }}>
                          Visitors
                        </th>
                        <th style={{ padding: "6px 4px" }}>Total</th>
                        <th style={{ padding: "6px 4px" }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((a) => {
                        const total =
                          (a.adults || 0) +
                          (a.children || 0) +
                          (a.visitors || 0);
                        return (
                          <tr
                            key={a.id}
                            style={{
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            <td style={{ padding: "6px 4px" }}>
                              {a.date}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {a.serviceType}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {a.adults ?? 0}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {a.children ?? 0}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {a.visitors ?? 0}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {total}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {a.notes || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "checkin" && (
          <>
            <p
              style={{
                marginBottom: "16px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Quick admin/usher check-in. Search a member and mark them
              present for the selected service.
            </p>

            {/* Service info */}
            <div
              className="service-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "8px",
                marginBottom: "12px",
                maxWidth: "620px",
              }}
            >
              <input
                type="date"
                value={memberAttendanceForm.date}
                onChange={(e) =>
                  setMemberAttendanceForm((f) => ({
                    ...f,
                    date: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Service type (e.g. Sunday Service)"
                value={memberAttendanceForm.serviceType}
                onChange={(e) =>
                  setMemberAttendanceForm((f) => ({
                    ...f,
                    serviceType: e.target.value,
                  }))
                }
                style={{
                  gridColumn: "span 2",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Search + mark present */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxWidth: "760px",
              }}
            >
              <input
                type="text"
                placeholder="Search member by name or phone"
                value={memberAttendanceForm.search}
                onChange={(e) =>
                  setMemberAttendanceForm((f) => ({
                    ...f,
                    search: e.target.value,
                  }))
                }
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />

              {memberAttendanceLoading ? (
                <p style={{ fontSize: "14px", color: "#6b7280" }}>
                  Loading check-ins…
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {filteredMembers.map((m) => {
                      const isPresent = memberAttendance.some(
                        (a) => a.memberId === m.id
                      );
                    return (
                      <div
                        key={m.id}
                        className="checkin-card"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                          background: "#f9fafb",
                        }}
                      >
                          <div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "#111827",
                              }}
                            >
                              {m.firstName} {m.lastName}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                              }}
                            >
                              {m.phone || "No phone"}
                            </div>
                          </div>

                          {isPresent ? (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#16a34a",
                                fontWeight: 600,
                              }}
                            >
                              ✅ Present
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCheckInMember(m.id)}
                              disabled={loading}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "10px",
                                border: "none",
                                background: loading ? "#9ca3af" : "#111827",
                                color: "white",
                                cursor: loading ? "default" : "pointer",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              Mark present
                            </button>
                          )}
                        </div>
                      );
                  })}

                  {members.length === 0 && (
                    <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                      No members yet. Add members in the CRM tab to start
                      check-ins.
                    </p>
                  )}

                  {members.length > 0 &&
                    filteredMembers.length === 0 && (
                      <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                        No members match that search.
                      </p>
                    )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "giving" && (
          <>
            <p
              style={{
                marginBottom: "16px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Track collections, tithes, and special offerings for{" "}
              <strong>{userProfile.churchName}</strong>.
            </p>

            {/* Giving form */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "8px",
                marginBottom: "12px",
                maxWidth: "620px",
              }}
            >
              <input
                type="date"
                value={givingForm.date}
                onChange={(e) =>
                  setGivingForm((f) => ({ ...f, date: e.target.value }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Service type (e.g. Sunday Service)"
                value={givingForm.serviceType}
                onChange={(e) =>
                  setGivingForm((f) => ({
                    ...f,
                    serviceType: e.target.value,
                  }))
                }
                style={{
                  gridColumn: "span 2",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />

              <select
                value={givingForm.type}
                onChange={(e) =>
                  setGivingForm((f) => ({ ...f, type: e.target.value }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              >
                <option value="Offering">Offering</option>
                <option value="Tithe">Tithe</option>
                <option value="Special">Special</option>
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={givingForm.amount}
                onChange={(e) =>
                  setGivingForm((f) => ({
                    ...f,
                    amount: e.target.value,
                  }))
                }
                style={{
                  gridColumn: "span 2",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />

              <textarea
                placeholder="Notes (e.g. project giving, special guest, currency)"
                value={givingForm.notes}
                onChange={(e) =>
                  setGivingForm((f) => ({
                    ...f,
                    notes: e.target.value,
                  }))
                }
                rows={2}
                style={{
                  gridColumn: "span 3",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  resize: "vertical",
                }}
              />
            </div>

            <button
              onClick={handleCreateGiving}
              disabled={loading}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#6b7280" : "#111827",
                color: "white",
                cursor: loading ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "16px",
              }}
            >
              {loading ? "Saving..." : "Save giving record"}
            </button>

            <div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Giving records
              </h2>

              {givingLoading ? (
                <p style={{ fontSize: "14px", color: "#6b7280" }}>
                  Loading giving records…
                </p>
              ) : giving.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  No giving records yet. Save your first one above.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <th style={{ padding: "6px 4px" }}>Date</th>
                        <th style={{ padding: "6px 4px" }}>Service</th>
                        <th style={{ padding: "6px 4px" }}>Type</th>
                        <th style={{ padding: "6px 4px" }}>Amount</th>
                        <th style={{ padding: "6px 4px" }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {giving.map((g) => (
                        <tr
                          key={g.id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <td style={{ padding: "6px 4px" }}>
                            {g.date}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {g.serviceType}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {g.type}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {g.amount?.toLocaleString?.() ?? g.amount}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {g.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "followup" && (
          <>
            <p
              style={{
                marginBottom: "16px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Apzla shows you who to follow up and gives you a ready
              message. Copy it and send with your own phone via SMS or
              WhatsApp. No SMS cost is handled inside Apzla yet.
            </p>

            {/* Pastor name for signature */}
            <div
              style={{
                marginBottom: "16px",
                maxWidth: "320px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "4px",
                }}
              >
                Pastor / sender name (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Pastor James"
                value={followupPastorName}
                onChange={(e) => setFollowupPastorName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Visitors list */}
            <div style={{ marginBottom: "20px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  marginBottom: "6px",
                }}
              >
                Visitors in your members list
              </h2>
              <p
                style={{
                  marginBottom: "8px",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                These are members with status <strong>VISITOR</strong>.
                Later, you can add per-service attendance so this shows{" "}
                <em>&ldquo;visitors this Sunday&rdquo;</em>.
              </p>

              {membersLoading ? (
                <p style={{ fontSize: "14px", color: "#6b7280" }}>
                  Loading members…
                </p>
              ) : visitorMembers.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  No visitors found yet. Add members with status
                  &ldquo;Visitor&rdquo; in the Members tab.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <th style={{ padding: "6px 4px" }}>Name</th>
                        <th style={{ padding: "6px 4px" }}>Phone</th>
                        <th style={{ padding: "6px 4px" }}>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitorMembers.map((m) => (
                        <tr
                          key={m.id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <td style={{ padding: "6px 4px" }}>
                            {m.firstName} {m.lastName}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {m.phone || "-"}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {m.email || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Template area */}
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "12px 14px",
                maxWidth: "520px",
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#111827",
                  }}
                >
                  Visitor thank-you message
                </div>
                <button
                  onClick={() => {
                    if (!navigator.clipboard) {
                      showToast(
                        "Clipboard not available. You can select and copy the text manually.",
                        "error"
                      );
                      return;
                    }
                    navigator.clipboard
                      .writeText(visitorTemplate)
                      .then(() =>
                        showToast(
                          "Message copied. Paste it into WhatsApp or your SMS app.",
                          "success"
                        )
                      )
                      .catch(() =>
                        showToast(
                          "Could not copy automatically. Please select and copy the text.",
                          "error"
                        )
                      );
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "999px",
                    border: "none",
                    background: "#111827",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  Copy message
                </button>
              </div>

              <textarea
                readOnly
                value={visitorTemplate}
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "13px",
                  resize: "vertical",
                  background: "white",
                }}
              />
              <p
                style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                Tip: You can also export phone numbers from the Members
                tab and use this text in any bulk SMS or WhatsApp
                broadcast tool.
              </p>
            </div>
          </>
        )}

        {activeTab === "sermons" && (
          <>
            <p
              style={{
                marginBottom: "16px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Log sermons and series so your team can quickly see what
              was preached and when.
            </p>

            {/* Sermon form */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "8px",
                marginBottom: "12px",
                maxWidth: "720px",
              }}
            >
              <input
                type="date"
                value={sermonForm.date}
                onChange={(e) =>
                  setSermonForm((f) => ({ ...f, date: e.target.value }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Sermon title"
                value={sermonForm.title}
                onChange={(e) =>
                  setSermonForm((f) => ({ ...f, title: e.target.value }))
                }
                style={{
                  gridColumn: "span 2",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Preacher"
                value={sermonForm.preacher}
                onChange={(e) =>
                  setSermonForm((f) => ({
                    ...f,
                    preacher: e.target.value,
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Series (optional)"
                value={sermonForm.series}
                onChange={(e) =>
                  setSermonForm((f) => ({
                    ...f,
                    series: e.target.value,
                  }))
                }
                style={{
                  gridColumn: "span 2",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Main scripture (e.g. John 3:16)"
                value={sermonForm.scripture}
                onChange={(e) =>
                  setSermonForm((f) => ({
                    ...f,
                    scripture: e.target.value,
                  }))
                }
                style={{
                  gridColumn: "span 3",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Recording link (YouTube, audio – optional)"
                value={sermonForm.link}
                onChange={(e) =>
                  setSermonForm((f) => ({ ...f, link: e.target.value }))
                }
                style={{
                  gridColumn: "span 3",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
              <textarea
                placeholder="Notes / summary"
                value={sermonForm.notes}
                onChange={(e) =>
                  setSermonForm((f) => ({
                    ...f,
                    notes: e.target.value,
                  }))
                }
                rows={2}
                style={{
                  gridColumn: "span 3",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  resize: "vertical",
                }}
              />
            </div>

            <button
              onClick={handleCreateSermon}
              disabled={loading}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#6b7280" : "#111827",
                color: "white",
                cursor: loading ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "16px",
              }}
            >
              {loading ? "Saving..." : "Save sermon"}
            </button>

            {/* Sermons list */}
            <div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Sermon history
              </h2>

              {sermonsLoading ? (
                <p style={{ fontSize: "14px", color: "#6b7280" }}>
                  Loading sermons…
                </p>
              ) : sermons.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  No sermons logged yet. Save your first one above.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <th style={{ padding: "6px 4px" }}>Date</th>
                        <th style={{ padding: "6px 4px" }}>Title</th>
                        <th style={{ padding: "6px 4px" }}>Preacher</th>
                        <th style={{ padding: "6px 4px" }}>Series</th>
                        <th style={{ padding: "6px 4px" }}>Scripture</th>
                        <th style={{ padding: "6px 4px" }}>Link</th>
                        <th style={{ padding: "6px 4px" }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sermons.map((s) => (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <td style={{ padding: "6px 4px" }}>{s.date}</td>
                          <td style={{ padding: "6px 4px" }}>{s.title}</td>
                          <td style={{ padding: "6px 4px" }}>
                            {s.preacher || "-"}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {s.series || "-"}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {s.scripture || "-"}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {s.link ? (
                              <a
                                href={s.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {s.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
