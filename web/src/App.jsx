// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  limit,
  orderBy,
  startAfter,
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
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [churchSettings, setChurchSettings] = useState({
    name: "",
    country: "",
    city: "",
  });
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [churchPlan, setChurchPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [paystackLoading, setPaystackLoading] = useState(false);

  // Dashboard tabs: "overview" | "members" | "attendance" | "giving" | "sermons" | "followup"
  const [activeTab, setActiveTab] = useState("overview");

  const MEMBERS_PAGE_SIZE = 25;
  const GIVING_PAGE_SIZE = 25;

  // Overview tab state
  const [memberAttendanceHistory, setMemberAttendanceHistory] = useState([]);
  const [overviewMetricsLoading, setOverviewMetricsLoading] = useState(false);

  // Church creation form
  const [churchName, setChurchName] = useState("");
  const [churchCountry, setChurchCountry] = useState("Ghana");
  const [churchCity, setChurchCity] = useState("");

  // Members (CRM)
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberPageCursor, setMemberPageCursor] = useState(null);
  const [membersHasMore, setMembersHasMore] = useState(true);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingMemberForm, setEditingMemberForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    status: "VISITOR",
  });
  const [memberActionLoading, setMemberActionLoading] = useState(false);
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
  const defaultBaseUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  );
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
  const [checkinTokenForm, setCheckinTokenForm] = useState({
    memberId: "",
    churchId: "",
    serviceDate: todayStr,
    serviceType: "",
    email: "",
    baseUrl: defaultBaseUrl,
  });
  const [checkinTokenLink, setCheckinTokenLink] = useState("");
  const [checkinTokenLoading, setCheckinTokenLoading] = useState(false);
  const [checkinTokenError, setCheckinTokenError] = useState("");
  const [showCheckinIssuer, setShowCheckinIssuer] = useState(false);
  const canShareCheckinLink =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Giving (collections & tithes)
  const [giving, setGiving] = useState([]);
  const [givingLoading, setGivingLoading] = useState(false);
  const [givingPageCursor, setGivingPageCursor] = useState(null);
  const [givingHasMore, setGivingHasMore] = useState(true);
  const [givingMemberFilter, setGivingMemberFilter] = useState("");
  const [givingForm, setGivingForm] = useState({
    date: todayStr,
    serviceType: "Sunday Service",
    type: "Offering", // Offering | Tithe | Special
    amount: "",
    notes: "",
    memberId: "",
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

  const TRIAL_LENGTH_DAYS = 14;
  const EXPIRY_SOON_THRESHOLD_DAYS = 3;

  const addDays = (date, days) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  };

  const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const daysUntil = (date) => {
    if (!date) return null;
    const msInDay = 1000 * 60 * 60 * 24;
    return Math.ceil((date.getTime() - Date.now()) / msInDay);
  };

  const evaluateAccessStatus = (plan) => {
    if (!plan) {
      return {
        state: "pending",
        headline: "",
        detail: "",
        deadline: null,
        daysRemaining: null,
      };
    }

    const nowDate = new Date();
    const subscriptionExpiresAt = parseDate(plan.subscriptionExpiresAt);
    const trialEndsAt =
      parseDate(plan.trialEndsAt) ||
      (plan.createdAt ? addDays(new Date(plan.createdAt), TRIAL_LENGTH_DAYS) : null);
    const expiryDate = subscriptionExpiresAt || trialEndsAt;

    if (!expiryDate) {
      return {
        state: "active",
        headline: "Subscription status",
        detail: "Your plan is active.",
        deadline: null,
        daysRemaining: null,
      };
    }

    if (expiryDate <= nowDate) {
      const modeLabel = subscriptionExpiresAt ? "subscription" : "trial";
      return {
        state: "expired",
        headline: "Access unavailable",
        detail: `Your ${modeLabel} ended on ${expiryDate.toLocaleDateString()}. Please renew to continue.`,
        deadline: expiryDate,
        daysRemaining: 0,
      };
    }

    const remaining = daysUntil(expiryDate);
    const state = remaining !== null && remaining <= EXPIRY_SOON_THRESHOLD_DAYS
      ? "expiring"
      : "active";

    const modeLabel = subscriptionExpiresAt ? "paid plan" : "trial";

    return {
      state,
      headline: subscriptionExpiresAt ? "Subscription active" : "Trial active",
      detail: `${remaining} day${remaining === 1 ? "" : "s"} left on your ${modeLabel} (ends ${expiryDate.toLocaleDateString()}).`,
      deadline: expiryDate,
      daysRemaining: remaining,
    };
  };

  const showToast = (message, variant = "info") => {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4200);
  };

  // ---------- Persist check-in token form ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("checkinTokenForm");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCheckinTokenForm((prev) => ({
          ...prev,
          ...parsed,
          baseUrl: parsed.baseUrl || prev.baseUrl || defaultBaseUrl,
          serviceDate: parsed.serviceDate || prev.serviceDate || todayStr,
        }));
      }
    } catch (err) {
      console.error("Restore check-in token form failed:", err);
    }
  }, [defaultBaseUrl, todayStr]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("checkinTokenForm", JSON.stringify(checkinTokenForm));
  }, [checkinTokenForm]);

  // ---------- Reset data when auth user changes ----------
  useEffect(() => {
    setMembers([]);
    setAttendance([]);
    setGiving([]);
    setGivingMemberFilter("");
    setSermons([]);
    setMemberAttendanceHistory([]);
  }, [user?.uid]);

  useEffect(() => {
    setCheckinTokenForm((prev) => ({
      ...prev,
      churchId: prev.churchId || userProfile?.churchId || "",
      baseUrl: prev.baseUrl || defaultBaseUrl,
    }));
  }, [userProfile?.churchId, defaultBaseUrl]);

  useEffect(() => {
    const fetchChurchPlan = async () => {
      if (!userProfile?.churchId) {
        setChurchPlan(null);
        setSubscriptionInfo(null);
        return;
      }

      setPlanLoading(true);

      try {
        const snapshot = await getDoc(doc(db, "churches", userProfile.churchId));

        if (snapshot.exists()) {
          const data = snapshot.data();
          setChurchPlan({ id: snapshot.id, ...data });
          setSubscriptionInfo({
            status: data.subscriptionStatus || "INACTIVE",
            plan: data.subscriptionPlan || "Monthly (GHS 120)",
            amount: data.subscriptionAmount || 120,
            currency: data.subscriptionCurrency || "GHS",
            paidAt: data.subscriptionPaidAt || null,
            expiresAt: data.subscriptionExpiresAt || data.trialEndsAt || null,
            reference: data.subscriptionReference || null,
            trialStartedAt: data.trialStartedAt || null,
            trialEndsAt: data.trialEndsAt || null,
          });
        } else {
          setChurchPlan(null);
          setSubscriptionInfo(null);
        }
      } catch (error) {
        console.error("Load church plan error:", error);
        showToast("Unable to load subscription status.", "error");
      } finally {
        setPlanLoading(false);
      }
    };

    fetchChurchPlan();
  }, [userProfile?.churchId]);

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

  const loadChurchSettings = async () => {
    if (!userProfile?.churchId) return;

    setAccountLoading(true);

    try {
      const churchRef = doc(db, "churches", userProfile.churchId);
      const snapshot = await getDoc(churchRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setChurchSettings({
          name: data.name || "",
          country: data.country || "",
          city: data.city || "",
        });

        setSubscriptionInfo({
          status: data.subscriptionStatus || "INACTIVE",
          plan: data.subscriptionPlan || "Monthly (GHS 120)",
          amount: data.subscriptionAmount || 120,
          currency: data.subscriptionCurrency || "GHS",
          paidAt: data.subscriptionPaidAt || null,
          expiresAt: data.subscriptionExpiresAt || data.trialEndsAt || null,
          reference: data.subscriptionReference || null,
          trialStartedAt: data.trialStartedAt || null,
          trialEndsAt: data.trialEndsAt || null,
        });

        setChurchPlan({ id: userProfile.churchId, ...data });
      }
    } catch (err) {
      console.error("Load church settings error:", err);
      showToast("Unable to load church settings.", "error");
    } finally {
      setAccountLoading(false);
    }
  };

  const handleOpenAccountSettings = async () => {
    if (!userProfile?.churchId) {
      showToast("Link a church to manage account settings.", "error");
      return;
    }

    setChurchSettings({
      name: userProfile.churchName || "",
      country: "",
      city: "",
    });
    setSubscriptionInfo(null);
    setShowAccountSettings(true);
    await loadChurchSettings();
  };

  const handleSaveChurchSettings = async () => {
    if (!userProfile?.churchId || !user) return;

    if (!churchSettings.name.trim()) {
      showToast("Please enter a church name.", "error");
      return;
    }

    setAccountLoading(true);

    try {
      await updateDoc(doc(db, "churches", userProfile.churchId), {
        name: churchSettings.name.trim(),
        country: churchSettings.country.trim(),
        city: churchSettings.city.trim(),
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "users", user.uid), {
        churchName: churchSettings.name.trim(),
      });

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              churchName: churchSettings.name.trim(),
            }
          : prev,
      );

      showToast("Church details updated.", "success");
    } catch (err) {
      console.error("Save church settings error:", err);
      showToast("Unable to update church details.", "error");
    } finally {
      setAccountLoading(false);
    }
  };

  const loadPaystackScript = () =>
    new Promise((resolve, reject) => {
      if (window.PaystackPop) {
        resolve(window.PaystackPop);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = () => resolve(window.PaystackPop);
      script.onerror = () => reject(new Error("Paystack script failed to load"));
      document.body.appendChild(script);
    });

  const handleRecordSubscription = async (response) => {
    if (!userProfile?.churchId) return;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const subscriptionData = {
      subscriptionStatus: "ACTIVE",
      subscriptionPlan: "Monthly (GHS 120)",
      subscriptionAmount: 120,
      subscriptionCurrency: "GHS",
      subscriptionReference: response?.reference || `APZLA-${Date.now()}`,
      subscriptionPaidAt: new Date().toISOString(),
      subscriptionPaidBy: user?.email || "",
      subscriptionExpiresAt: expiresAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateDoc(doc(db, "churches", userProfile.churchId), subscriptionData);
      setSubscriptionInfo({
        status: subscriptionData.subscriptionStatus,
        plan: subscriptionData.subscriptionPlan,
        amount: subscriptionData.subscriptionAmount,
        currency: subscriptionData.subscriptionCurrency,
        paidAt: subscriptionData.subscriptionPaidAt,
        expiresAt: subscriptionData.subscriptionExpiresAt,
        reference: subscriptionData.subscriptionReference,
      });
      setChurchPlan((prev) => ({
        ...(prev || {}),
        id: userProfile.churchId,
        ...subscriptionData,
      }));
      showToast("Subscription activated for 1 month.", "success");
    } catch (err) {
      console.error("Record subscription error:", err);
      showToast("Could not save subscription status.", "error");
    }
  };

  const handlePaystackSubscription = async () => {
    if (!userProfile?.churchId || !user?.email) {
      showToast("Log in and link a church before paying.", "error");
      return;
    }

    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey) {
      showToast("Add VITE_PAYSTACK_PUBLIC_KEY to proceed with payment.", "error");
      return;
    }

    setPaystackLoading(true);

    try {
      await loadPaystackScript();

      if (!window.PaystackPop || typeof window.PaystackPop.setup !== "function") {
        throw new Error("Paystack failed to initialize");
      }

      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: user.email,
        amount: 120 * 100, // GHS 120 in pesewas
        currency: "GHS",
        ref: `APZLA-${Date.now()}`,
        metadata: {
          churchId: userProfile.churchId,
          churchName: churchSettings.name || userProfile.churchName,
          plan: "Monthly",
        },

        // ✅ Plain function – Paystack will accept this
        callback: function (response) {
          // we don't mark loading false until we try to save
          handleRecordSubscription(response)
            .catch((err) => {
              console.error("Record subscription error (callback):", err);
              showToast(
                "Payment completed but we couldn't save your subscription yet. Please contact support.",
                "error"
              );
            })
            .finally(() => {
              setPaystackLoading(false);
            });
        },

        // ✅ Plain function for onClose
        onClose: function () {
          setPaystackLoading(false);
        },
      });

      if (!handler || typeof handler.openIframe !== "function") {
        throw new Error("Paystack handler unavailable");
      }

      handler.openIframe();
    } catch (err) {
      console.error("Paystack init error:", err);
      showToast("Unable to start payment.", "error");
      setPaystackLoading(false);
    }
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

      const trialStart = new Date();
      const trialEnd = addDays(trialStart, TRIAL_LENGTH_DAYS);

      const churchRef = await addDoc(collection(db, "churches"), {
        name: churchName.trim(),
        country: churchCountry.trim(),
        city: churchCity.trim(),
        ownerUserId: user.uid,
        createdAt: trialStart.toISOString(),
        trialStartedAt: trialStart.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        subscriptionStatus: "TRIAL",
      });

      const churchId = churchRef.id;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        churchId,
        role: "CHURCH_ADMIN",
        churchName: churchName.trim(),
        createdAt: new Date().toISOString(),
      });

      setChurchPlan({
        id: churchId,
        name: churchName.trim(),
        country: churchCountry.trim(),
        city: churchCity.trim(),
        ownerUserId: user.uid,
        createdAt: trialStart.toISOString(),
        trialStartedAt: trialStart.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        subscriptionStatus: "TRIAL",
      });

      setSubscriptionInfo({
        status: "TRIAL",
        plan: "Trial (14 days)",
        amount: 0,
        currency: "GHS",
        paidAt: null,
        expiresAt: trialEnd.toISOString(),
        reference: null,
        trialStartedAt: trialStart.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
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

  // ---------- Members (CRM) ----------
  const loadMembers = async ({ append = false } = {}) => {
    if (!userProfile?.churchId) return;
    try {
      setMembersLoading(true);
      const colRef = collection(db, "members");
      const constraints = [
        where("churchId", "==", userProfile.churchId),
        orderBy("createdAt", "desc"),
      ];

      if (append && memberPageCursor) {
        constraints.push(startAfter(memberPageCursor));
      }

      constraints.push(limit(MEMBERS_PAGE_SIZE));

      const qMembers = query(colRef, ...constraints);
      const snapshot = await getDocs(qMembers);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers((prev) => (append ? [...prev, ...data] : data));

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setMemberPageCursor(lastDoc);
      setMembersHasMore(snapshot.docs.length === MEMBERS_PAGE_SIZE);
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

  const startEditingMember = (member) => {
    setEditingMemberId(member.id);
    setEditingMemberForm({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      phone: member.phone || "",
      email: member.email || "",
      status: (member.status || "VISITOR").toUpperCase(),
    });
  };

  const cancelEditingMember = () => {
    setEditingMemberId(null);
    setEditingMemberForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      status: "VISITOR",
    });
  };

  const handleUpdateMember = async () => {
    if (!editingMemberId || !userProfile?.churchId) return;

    if (!editingMemberForm.firstName.trim()) {
      showToast("First name is required.", "error");
      return;
    }

    try {
      setMemberActionLoading(true);
      const docRef = doc(db, "members", editingMemberId);
      const payload = {
        firstName: editingMemberForm.firstName.trim(),
        lastName: editingMemberForm.lastName.trim(),
        phone: editingMemberForm.phone.trim(),
        email: editingMemberForm.email.trim(),
        status: editingMemberForm.status,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(docRef, payload);

      setMembers((prev) =>
        prev.map((m) => (m.id === editingMemberId ? { ...m, ...payload } : m))
      );
      showToast("Member updated.", "success");
      cancelEditingMember();
    } catch (err) {
      console.error("Update member error:", err);
      showToast(err.message || "Unable to update member.", "error");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!userProfile?.churchId || !memberId) return;

    const confirmed = window.confirm("Delete this member? This cannot be undone.");
    if (!confirmed) return;

    try {
      setMemberActionLoading(true);
      await deleteDoc(doc(db, "members", memberId));
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      if (editingMemberId === memberId) {
        cancelEditingMember();
      }
      showToast("Member deleted.", "success");
    } catch (err) {
      console.error("Delete member error:", err);
      showToast(err.message || "Unable to delete member.", "error");
    } finally {
      setMemberActionLoading(false);
    }
  };

  useEffect(() => {
    setMemberPageCursor(null);
    setMembersHasMore(true);
    if (
      (activeTab === "members" ||
        activeTab === "overview" ||
        activeTab === "followup" ||
        activeTab === "checkin" ||
        activeTab === "giving") &&
      userProfile?.churchId
    ) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  const loadMoreMembers = () => {
    if (!membersHasMore || membersLoading) return;
    return loadMembers({ append: true });
  };

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
  const loadMemberAttendanceHistory = async () => {
    if (!userProfile?.churchId) return;

    try {
      setOverviewMetricsLoading(true);
      const colRef = collection(db, "memberAttendance");
      const qMemberAttendance = query(
        colRef,
        where("churchId", "==", userProfile.churchId)
      );

      const snapshot = await getDocs(qMemberAttendance);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const sortedByDate = data.sort((a, b) => {
        const aDate = a.date || "";
        const bDate = b.date || "";
        return bDate.localeCompare(aDate);
      });

      setMemberAttendanceHistory(sortedByDate);
    } catch (err) {
      console.error("Load member attendance history error:", err);
      showToast("Error loading attendance insights.", "error");
    } finally {
      setOverviewMetricsLoading(false);
    }
  };

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

  const issueCheckinToken = async (event) => {
    event.preventDefault();

    const payload = {
      ...checkinTokenForm,
      memberId: checkinTokenForm.memberId.trim(),
      churchId: checkinTokenForm.churchId.trim(),
      serviceDate: checkinTokenForm.serviceDate,
      serviceType: checkinTokenForm.serviceType.trim(),
      email: checkinTokenForm.email.trim(),
      baseUrl: checkinTokenForm.baseUrl.trim(),
    };

    if (!payload.memberId || !payload.churchId || !payload.serviceDate) {
      setCheckinTokenError("Member ID, church ID, and service date are required.");
      return;
    }

    if (!payload.email) {
      setCheckinTokenError("An email address is required to send the link.");
      return;
    }

    setCheckinTokenError("");
    setCheckinTokenLink("");

    try {
      setCheckinTokenLoading(true);
      const res = await fetch("/api/checkin-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data?.error || data?.message || "Unable to issue link.";
        throw new Error(message);
      }

      const token = data?.token || data?.id;
      const linkBase = payload.baseUrl?.replace(/\/$/, "") || "";
      const generatedLink =
        data?.link ||
        (token ? `${linkBase}/checkin?token=${encodeURIComponent(token)}` : "");

      if (!generatedLink) {
        throw new Error("The server did not return a check-in link.");
      }

      setCheckinTokenLink(generatedLink);
      showToast("Check-in link issued.", "success");
    } catch (err) {
      console.error("Issue check-in token error:", err);
      setCheckinTokenError(err.message || "Unable to issue link.");
    } finally {
      setCheckinTokenLoading(false);
    }
  };

  const copyCheckinLink = async () => {
    if (!checkinTokenLink) return;
    try {
      await navigator.clipboard.writeText(checkinTokenLink);
      showToast("Link copied to clipboard.", "success");
    } catch (err) {
      console.error("Copy check-in link error:", err);
      showToast("Unable to copy link.", "error");
    }
  };

  const shareCheckinLink = async () => {
    if (!checkinTokenLink) return;
    if (!navigator?.share) {
      showToast("Sharing is not supported on this device.", "error");
      return;
    }

    try {
      await navigator.share({ title: "Service check-in", url: checkinTokenLink });
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Share check-in link error:", err);
        showToast("Unable to share link.", "error");
      }
    }
  };

  useEffect(() => {
    if (activeTab === "checkin" && userProfile?.churchId) {
      loadMemberAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId, memberAttendanceForm.date, memberAttendanceForm.serviceType]);

  useEffect(() => {
    if (activeTab === "attendance" && userProfile?.churchId) {
      loadMemberAttendanceHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  useEffect(() => {
    if (activeTab === "overview" && userProfile?.churchId) {
      loadMemberAttendanceHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId]);

  const handleRefreshOverviewData = async () => {
    if (!userProfile?.churchId) {
      showToast("Link a church to view dashboard insights.", "error");
      return;
    }

    try {
      setOverviewMetricsLoading(true);
      await Promise.all([
        loadAttendance(),
        loadMembers(),
        loadMemberAttendanceHistory(),
      ]);
      showToast("Dashboard data refreshed.", "success");
    } catch (err) {
      console.error("Refresh dashboard data error:", err);
      showToast("Unable to refresh dashboard data.", "error");
    } finally {
      setOverviewMetricsLoading(false);
    }
  };

  // ---------- Giving ----------
  const loadGiving = async ({ append = false, memberId = givingMemberFilter } = {}) => {
    if (!userProfile?.churchId) return;
    try {
      setGivingLoading(true);
      const colRef = collection(db, "giving");
      const constraints = [
        where("churchId", "==", userProfile.churchId),
      ];

      if (memberId) {
        constraints.push(where("memberId", "==", memberId));
      }

      constraints.push(orderBy("createdAt", "desc"));

      if (append && givingPageCursor) {
        constraints.push(startAfter(givingPageCursor));
      }

      constraints.push(limit(GIVING_PAGE_SIZE));

      const qGiving = query(colRef, ...constraints);
      const snapshot = await getDocs(qGiving);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGiving((prev) => (append ? [...prev, ...data] : data));

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setGivingPageCursor(lastDoc);
      setGivingHasMore(snapshot.docs.length === GIVING_PAGE_SIZE);
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
      const selectedMember =
        givingForm.memberId && members.find((m) => m.id === givingForm.memberId);
      const memberName = selectedMember
        ? `${selectedMember.firstName || ""} ${selectedMember.lastName || ""}`.trim()
        : "";
      await addDoc(collection(db, "giving"), {
        churchId: userProfile.churchId,
        date: givingForm.date,
        serviceType: givingForm.serviceType.trim() || "Service",
        type: givingForm.type,
        amount: Number(givingForm.amount),
        notes: givingForm.notes.trim(),
        memberId: givingForm.memberId || null,
        memberName,
        createdAt: new Date().toISOString(),
      });

      setGivingForm({
        date: todayStr,
        serviceType: "Sunday Service",
        type: "Offering",
        amount: "",
        notes: "",
        memberId: "",
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
    setGivingPageCursor(null);
    setGivingHasMore(true);
    setGiving([]);
    if (
      (activeTab === "giving" || activeTab === "overview") &&
      userProfile?.churchId
    ) {
      const memberId = activeTab === "overview" ? "" : givingMemberFilter;
      loadGiving({ memberId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userProfile?.churchId, givingMemberFilter]);

  const loadMoreGiving = () => {
    if (!givingHasMore || givingLoading) return;
    return loadGiving({ append: true });
  };

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
  const accessStatus = evaluateAccessStatus(churchPlan);

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

  if (user && userProfile?.churchId && planLoading) {
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
            Checking your subscription status…
          </p>
        </div>
      </div>
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

  const resolveGivingMember = (record) => {
    if (record.memberName) return record.memberName;
    if (record.memberId) {
      const member = members.find((m) => m.id === record.memberId);
      if (member) {
        const name = `${member.firstName || ""} ${member.lastName || ""}`
          .trim()
          .replace(/\s+/g, " ");
        return name || "Member";
      }
      return "Linked member";
    }
    return "—";
  };

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

  const memberLastAttendance = new Map();
  memberAttendanceHistory.forEach((entry) => {
    if (!memberLastAttendance.has(entry.memberId)) {
      memberLastAttendance.set(entry.memberId, entry.date || "");
    }
  });

  const absenteeCutoff = new Date();
  absenteeCutoff.setDate(absenteeCutoff.getDate() - 28);

  const membersMissingFourWeeks = members.filter((m) => {
    const lastDateStr = memberLastAttendance.get(m.id);
    if (!lastDateStr) return true;

    const lastDate = new Date(lastDateStr);
    if (Number.isNaN(lastDate.getTime())) return true;

    return lastDate < absenteeCutoff;
  });

  const monthlyMemberAttendance = new Set();
  memberAttendanceHistory.forEach((entry) => {
    if (!entry.date) return;

    const entryDate = new Date(entry.date);
    if (
      !Number.isNaN(entryDate.getTime()) &&
      entryDate.getFullYear() === currentYear &&
      entryDate.getMonth() === currentMonth
    ) {
      monthlyMemberAttendance.add(entry.memberId);
    }
  });

  const memberLookup = useMemo(() => {
    const map = new Map();
    members.forEach((member) => {
      const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();
      const fallback = member.email || member.phone || member.id;
      map.set(member.id, fullName || fallback);
    });
    return map;
  }, [members]);

  const recentMemberCheckins = useMemo(
    () =>
      memberAttendanceHistory.slice(0, 10).map((entry) => ({
        ...entry,
        memberName: memberLookup.get(entry.memberId) || entry.memberId,
      })),
    [memberAttendanceHistory, memberLookup]
  );

  // Follow-up templates (visitors)
  const visitorTemplate = `Hi, thank you for worshipping with us at ${
    userProfile.churchName || "our church"
  } today. We’re glad you came. God bless you!${
    followupPastorName ? ` – ${followupPastorName}` : ""
  }`;

  const visitorTemplateEncoded = encodeURIComponent(visitorTemplate);
  const visitorEmailSubject = encodeURIComponent("Thank you for worshipping with us");
  const formatPhoneForLink = (phone) => (phone || "").replace(/\D/g, "");

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

      {accessStatus.detail && (
        <div
          className={`subscription-banner${
            accessStatus.state === "expiring" ? " warning" : ""
          }`}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #4338ca, #22c55e)",
              color: "white",
              fontWeight: 800,
            }}
            aria-hidden
          >
            ⏰
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ display: "block" }}>{accessStatus.headline}</strong>
            <p style={{ margin: "4px 0 0" }}>{accessStatus.detail}</p>
          </div>
          <button
            onClick={() => setShowAccountSettings(true)}
            style={{
              border: "none",
              background: "#111827",
              color: "white",
              padding: "8px 12px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Manage billing
          </button>
        </div>
      )}

      {showAccountSettings && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <p className="modal-pill">Account &amp; Billing</p>
                <h2 style={{ margin: "4px 0", fontSize: "20px" }}>
                  Manage church profile and subscription
                </h2>
                <p style={{ margin: 0, color: "#4b5563", fontSize: "13px" }}>
                  Update how your church appears and renew your monthly plan
                  (GHS 120/month billed through Paystack).
                </p>
              </div>
              <button
                onClick={() => setShowAccountSettings(false)}
                style={{
                  border: "none",
                  background: "#e5e7eb",
                  color: "#111827",
                  borderRadius: "12px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>

            <div className="modal-grid">
              <div className="modal-section">
                <div className="modal-section-header">
                  <div>
                    <p className="modal-label">Church profile</p>
                    <h3 className="modal-title">Basics</h3>
                  </div>
                  <span className="modal-chip">Editable</span>
                </div>

                <div className="modal-form-grid">
                  <label className="modal-field">
                    <span>Church name</span>
                    <input
                      type="text"
                      value={churchSettings.name}
                      onChange={(e) =>
                        setChurchSettings((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g. Grace Chapel International"
                    />
                  </label>
                  <label className="modal-field">
                    <span>Country</span>
                    <input
                      type="text"
                      value={churchSettings.country}
                      onChange={(e) =>
                        setChurchSettings((prev) => ({
                          ...prev,
                          country: e.target.value,
                        }))
                      }
                      placeholder="Country"
                    />
                  </label>
                  <label className="modal-field">
                    <span>City</span>
                    <input
                      type="text"
                      value={churchSettings.city}
                      onChange={(e) =>
                        setChurchSettings((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder="City"
                    />
                  </label>
                </div>

                <button
                  onClick={handleSaveChurchSettings}
                  disabled={accountLoading}
                  style={{
                    background: accountLoading ? "#e5e7eb" : "#111827",
                    color: accountLoading ? "#6b7280" : "white",
                    border: "none",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    cursor: accountLoading ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    width: "100%",
                    marginTop: "10px",
                  }}
                >
                  {accountLoading ? "Saving..." : "Save changes"}
                </button>
              </div>

              <div className="modal-section">
                <div className="modal-section-header">
                  <div>
                    <p className="modal-label">Subscription</p>
                    <h3 className="modal-title">Monthly plan</h3>
                  </div>
                  <span className="modal-chip chip-green">GHS 120/mo</span>
                </div>

                <div className="subscription-card">
                  <div>
                    <p className="subscription-status">
                      Status: {subscriptionInfo?.status || "INACTIVE"}
                    </p>
                    <p className="subscription-meta">
                      Plan: {subscriptionInfo?.plan || "Monthly (GHS 120)"}
                    </p>
                    <p className="subscription-meta">
                      {subscriptionInfo?.status === "TRIAL"
                        ? "Trial ends:"
                        : "Next renewal:"}
                      {subscriptionInfo?.expiresAt
                        ? ` ${new Date(
                            subscriptionInfo.expiresAt,
                          ).toLocaleDateString()}`
                        : subscriptionInfo?.trialEndsAt
                          ? ` ${new Date(
                              subscriptionInfo.trialEndsAt,
                            ).toLocaleDateString()}`
                          : " Not set"}
                    </p>
                    {subscriptionInfo?.reference && (
                      <p className="subscription-meta">
                        Reference: {subscriptionInfo.reference}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handlePaystackSubscription}
                    disabled={paystackLoading}
                    style={{
                      background: paystackLoading ? "#e5e7eb" : "#16a34a",
                      color: paystackLoading ? "#6b7280" : "white",
                      border: "none",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      cursor: paystackLoading ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      width: "100%",
                    }}
                    >
                    {paystackLoading
                      ? "Opening Paystack..."
                      : "Pay monthly subscription (GHS 120)"}
                  </button>
                  <p className="subscription-footnote">
                    Powered by Paystack. Billing renews monthly at GHS 120.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {accessStatus.state === "expired" && (
        <div
          className="modal-backdrop"
          style={{
            background: "rgba(15, 23, 42, 0.7)",
            zIndex: showAccountSettings ? 55 : 70,
          }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: "520px", textAlign: "center" }}
          >
            <p className="modal-pill">Billing</p>
            <h2 style={{ margin: "8px 0" }}>Access temporarily blocked</h2>
            <p style={{ color: "#4b5563", fontSize: "14px" }}>
              {accessStatus.detail}
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "16px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setShowAccountSettings(true)}
                style={{
                  background: "#111827",
                  color: "white",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Renew plan
              </button>
              <button
                onClick={handleLogout}
                style={{
                  background: "#e5e7eb",
                  color: "#111827",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

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

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleOpenAccountSettings}
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                border: "none",
                background: "#e5e7eb",
                color: "#111827",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Account &amp; billing
            </button>
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
              onClick={handleRefreshOverviewData}
              disabled={overviewMetricsLoading}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: overviewMetricsLoading ? "#6b7280" : "#111827",
                color: "white",
                cursor: overviewMetricsLoading ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {overviewMetricsLoading
                ? "Refreshing insights..."
                : "Refresh dashboard data"}
            </button>

            <div style={{ marginTop: "24px" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 500,
                  marginBottom: "8px",
                }}
              >
                Engagement insights
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Members absent 4+ weeks
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 600 }}>
                    {membersMissingFourWeeks.length}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Includes members with no recorded attendance
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Members present this month
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 600 }}>
                    {monthlyMemberAttendance.size}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Unique people checked in this month
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Total members tracked
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 600 }}>
                    {members.length}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    From the members & visitors directory
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                    Consistently missing church
                  </h3>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>
                    {membersMissingFourWeeks.length} people need follow-up
                  </span>
                </div>

                {membersMissingFourWeeks.length === 0 ? (
                  <p style={{ color: "#6b7280", margin: 0 }}>
                    Great work! Everyone has recent attendance records.
                  </p>
                ) : (
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {membersMissingFourWeeks.slice(0, 8).map((member) => {
                      const lastDateStr = memberLastAttendance.get(member.id);
                      const lastDate = lastDateStr
                        ? new Date(lastDateStr).toLocaleDateString()
                        : "No attendance yet";

                      return (
                        <li
                          key={member.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "10px",
                            background: "#f9fafb",
                          }}
                        >
                          <div style={{ fontWeight: 600, color: "#111827" }}>
                            {member.firstName} {member.lastName}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            Last attendance: {lastDate}
                          </div>
                          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                            {member.status || "VISITOR"}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
                        <th style={{ padding: "6px 4px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const isEditing = editingMemberId === m.id;
                        return (
                          <tr
                            key={m.id}
                            style={{
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            <td style={{ padding: "6px 4px" }}>
                              {isEditing ? (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "6px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <input
                                    type="text"
                                    value={editingMemberForm.firstName}
                                    onChange={(e) =>
                                      setEditingMemberForm((f) => ({
                                        ...f,
                                        firstName: e.target.value,
                                      }))
                                    }
                                    placeholder="First name"
                                    style={{
                                      padding: "6px 8px",
                                      borderRadius: "6px",
                                      border: "1px solid #d1d5db",
                                      width: "120px",
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={editingMemberForm.lastName}
                                    onChange={(e) =>
                                      setEditingMemberForm((f) => ({
                                        ...f,
                                        lastName: e.target.value,
                                      }))
                                    }
                                    placeholder="Last name"
                                    style={{
                                      padding: "6px 8px",
                                      borderRadius: "6px",
                                      border: "1px solid #d1d5db",
                                      width: "120px",
                                    }}
                                  />
                                </div>
                              ) : (
                                <>{m.firstName} {m.lastName}</>
                              )}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingMemberForm.phone}
                                  onChange={(e) =>
                                    setEditingMemberForm((f) => ({
                                      ...f,
                                      phone: e.target.value,
                                    }))
                                  }
                                  placeholder="Phone"
                                  style={{
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #d1d5db",
                                    width: "140px",
                                  }}
                                />
                              ) : (
                                <>{m.phone || "-"}</>
                              )}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {isEditing ? (
                                <input
                                  type="email"
                                  value={editingMemberForm.email}
                                  onChange={(e) =>
                                    setEditingMemberForm((f) => ({
                                      ...f,
                                      email: e.target.value,
                                    }))
                                  }
                                  placeholder="Email"
                                  style={{
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #d1d5db",
                                    width: "200px",
                                  }}
                                />
                              ) : (
                                <>{m.email || "-"}</>
                              )}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {isEditing ? (
                                <select
                                  value={editingMemberForm.status}
                                  onChange={(e) =>
                                    setEditingMemberForm((f) => ({
                                      ...f,
                                      status: e.target.value,
                                    }))
                                  }
                                  style={{
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #d1d5db",
                                  }}
                                >
                                  <option value="VISITOR">Visitor</option>
                                  <option value="NEW_CONVERT">New Convert</option>
                                  <option value="REGULAR">Regular</option>
                                  <option value="WORKER">Worker</option>
                                  <option value="PASTOR">Pastor</option>
                                  <option value="INACTIVE">Inactive</option>
                                </select>
                              ) : (
                                <>{m.status}</>
                              )}
                            </td>
                            <td style={{ padding: "6px 4px" }}>
                              {isEditing ? (
                                <div
                                  style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                                >
                                  <button
                                    onClick={handleUpdateMember}
                                    disabled={memberActionLoading}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "#111827",
                                      color: "white",
                                      cursor: memberActionLoading ? "default" : "pointer",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {memberActionLoading ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    onClick={cancelEditingMember}
                                    disabled={memberActionLoading}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      border: "1px solid #e5e7eb",
                                      background: "white",
                                      color: "#111827",
                                      cursor: memberActionLoading ? "default" : "pointer",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div
                                  style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                                >
                                  <button
                                    onClick={() => startEditingMember(m)}
                                    disabled={memberActionLoading}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      border: "1px solid #e5e7eb",
                                      background: "white",
                                      color: "#111827",
                                      cursor: memberActionLoading ? "default" : "pointer",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMember(m.id)}
                                    disabled={memberActionLoading}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      border: "1px solid #ef4444",
                                      background: memberActionLoading ? "#fee2e2" : "#fef2f2",
                                      color: "#b91c1c",
                                      cursor: memberActionLoading ? "default" : "pointer",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {membersHasMore && members.length > 0 && (
                <button
                  onClick={loadMoreMembers}
                  disabled={membersLoading}
                  style={{
                    marginTop: "12px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: membersLoading ? "#f3f4f6" : "white",
                    color: "#111827",
                    cursor: membersLoading ? "default" : "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {membersLoading ? "Loading..." : "Load more members"}
                </button>
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

            <div style={{ marginTop: "18px" }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Recent member check-ins
              </h3>
              {recentMemberCheckins.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  No member check-ins yet. Self-check-ins and usher check-ins
                  will appear here.
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
                        <th style={{ padding: "6px 4px" }}>Member</th>
                        <th style={{ padding: "6px 4px" }}>Service</th>
                        <th style={{ padding: "6px 4px" }}>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMemberCheckins.map((entry) => (
                        <tr
                          key={`${entry.memberId}-${entry.date}-${entry.serviceType}`}
                          style={{ borderBottom: "1px solid #f3f4f6" }}
                        >
                          <td style={{ padding: "6px 4px" }}>{entry.date}</td>
                          <td style={{ padding: "6px 4px" }}>
                            {entry.memberName}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {entry.serviceType || "Service"}
                          </td>
                          <td style={{ padding: "6px 4px", textTransform: "capitalize" }}>
                            {entry.source?.toLowerCase() || "-"}
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
                <>
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

                  <div className="checkin-admin-card">
                    <div className="checkin-admin-header">
                      <div>
                        <div className="checkin-admin-title">
                          Issue self check-in link
                        </div>
                        <p className="checkin-admin-subtitle">
                          Create a one-time link for a member to confirm attendance
                          remotely. Details are saved locally for quick re-issuing.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCheckinIssuer((open) => !open)}
                        className="checkin-admin-toggle"
                      >
                        {showCheckinIssuer ? "Hide" : "Open"}
                      </button>
                    </div>

                    {showCheckinIssuer && (
                      <form
                        onSubmit={issueCheckinToken}
                        className="checkin-admin-form"
                        autoComplete="off"
                      >
                        <div className="checkin-admin-grid">
                          <label className="checkin-admin-field">
                            <span>Member ID*</span>
                            <input
                              type="text"
                              value={checkinTokenForm.memberId}
                              onChange={(e) =>
                                setCheckinTokenForm((prev) => ({
                                  ...prev,
                                  memberId: e.target.value,
                                }))
                              }
                              placeholder="e.g. member document ID"
                            />
                          </label>

                          <label className="checkin-admin-field">
                            <span>Church ID*</span>
                            <input
                              type="text"
                              value={checkinTokenForm.churchId}
                              onChange={(e) =>
                                setCheckinTokenForm((prev) => ({
                                  ...prev,
                                  churchId: e.target.value,
                                }))
                              }
                              placeholder="e.g. church document ID"
                            />
                          </label>

                          <label className="checkin-admin-field">
                            <span>Service date*</span>
                            <input
                              type="date"
                              value={checkinTokenForm.serviceDate}
                              onChange={(e) =>
                                setCheckinTokenForm((prev) => ({
                                  ...prev,
                                  serviceDate: e.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className="checkin-admin-field">
                            <span>Service type (optional)</span>
                            <input
                              type="text"
                              value={checkinTokenForm.serviceType}
                              onChange={(e) =>
                                setCheckinTokenForm((prev) => ({
                                  ...prev,
                                  serviceType: e.target.value,
                                }))
                              }
                              placeholder="Sunday Service, Midweek, etc."
                            />
                          </label>

                          <label className="checkin-admin-field">
                            <span>Recipient email*</span>
                            <input
                              type="email"
                              value={checkinTokenForm.email}
                              onChange={(e) =>
                                setCheckinTokenForm((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                              placeholder="member@email.com"
                            />
                          </label>

                          <label className="checkin-admin-field">
                            <span>Base URL*</span>
                            <input
                              type="text"
                              value={checkinTokenForm.baseUrl}
                              onChange={(e) =>
                                setCheckinTokenForm((prev) => ({
                                  ...prev,
                                  baseUrl: e.target.value,
                                }))
                              }
                              placeholder="https://app.example.com"
                            />
                          </label>
                        </div>

                        {checkinTokenError && (
                          <div className="checkin-admin-error">{checkinTokenError}</div>
                        )}

                        <div className="checkin-admin-actions">
                          <div className="checkin-admin-note">
                            Fields are stored locally so you can quickly issue multiple
                            links.
                          </div>
                          <button
                            type="submit"
                            className="checkin-admin-submit"
                            disabled={checkinTokenLoading}
                          >
                            {checkinTokenLoading ? "Issuing…" : "Send check-in link"}
                          </button>
                        </div>

                        {checkinTokenLink && (
                          <div className="checkin-link-box">
                            <div>
                              <div className="checkin-link-label">Issued link</div>
                              <div className="checkin-link-value">{checkinTokenLink}</div>
                            </div>
                            <div className="checkin-link-actions">
                              <button type="button" onClick={copyCheckinLink}>
                                Copy
                              </button>
                              <button
                                type="button"
                                onClick={shareCheckinLink}
                                disabled={!canShareCheckinLink}
                                title={
                                  canShareCheckinLink
                                    ? "Share link"
                                    : "Device does not support the Web Share API"
                                }
                              >
                                Share
                              </button>
                            </div>
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                </>
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
                value={givingForm.memberId}
                onChange={(e) =>
                  setGivingForm((f) => ({ ...f, memberId: e.target.value }))
                }
                style={{
                  gridColumn: "span 3",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              >
                <option value="">Record against a member (optional)</option>
                {members.map((m) => {
                  const fullName = `${m.firstName || ""} ${m.lastName || ""}`
                    .trim()
                    .replace(/\s+/g, " ");
                  return (
                    <option key={m.id} value={m.id}>
                      {fullName || "Unnamed member"}
                    </option>
                  );
                })}
              </select>

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
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}
              >
                <h2
                  style={{
                    fontSize: "16px",
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  Giving records
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    htmlFor="giving-member-filter"
                    style={{ fontSize: "12px", color: "#6b7280" }}
                  >
                    Filter by member
                  </label>
                  <select
                    id="giving-member-filter"
                    value={givingMemberFilter}
                    onChange={(e) => setGivingMemberFilter(e.target.value)}
                    style={{
                      minWidth: "240px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px",
                    }}
                  >
                    <option value="">All giving records</option>
                    {members.map((m) => {
                      const fullName = `${m.firstName || ""} ${m.lastName || ""}`
                        .trim()
                        .replace(/\s+/g, " ");
                      return (
                        <option key={m.id} value={m.id}>
                          {fullName || "Unnamed member"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

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
                        <th style={{ padding: "6px 4px" }}>Member</th>
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
                            {resolveGivingMember(g)}
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
              {givingHasMore && giving.length > 0 && (
                <button
                  onClick={loadMoreGiving}
                  disabled={givingLoading}
                  style={{
                    marginTop: "12px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: givingLoading ? "#f3f4f6" : "white",
                    color: "#111827",
                    cursor: givingLoading ? "default" : "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {givingLoading ? "Loading..." : "Load more giving records"}
                </button>
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
                        <th style={{ padding: "6px 4px" }}>Message options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitorMembers.map((m) => {
                        const phoneForLink = formatPhoneForLink(m.phone);
                        const whatsappLink = phoneForLink
                          ? `https://wa.me/${phoneForLink}?text=${visitorTemplateEncoded}`
                          : `https://wa.me/?text=${visitorTemplateEncoded}`;
                        const telegramLink = `https://t.me/share/url?text=${visitorTemplateEncoded}`;
                        const smsLink = phoneForLink
                          ? `sms:${phoneForLink}?body=${visitorTemplateEncoded}`
                          : `sms:?body=${visitorTemplateEncoded}`;
                        const emailLink = `mailto:${m.email || ""}?subject=${visitorEmailSubject}&body=${visitorTemplateEncoded}`;

                        return (
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
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <a
                                  href={whatsappLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #22c55e",
                                    background: "#ecfdf3",
                                    color: "#15803d",
                                    fontSize: "12px",
                                    textDecoration: "none",
                                  }}
                                >
                                  WhatsApp
                                </a>
                                <a
                                  href={telegramLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #0ea5e9",
                                    background: "#e0f2fe",
                                    color: "#0369a1",
                                    fontSize: "12px",
                                    textDecoration: "none",
                                  }}
                                >
                                  Telegram
                                </a>
                                <a
                                  href={smsLink}
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #6b7280",
                                    background: "#f3f4f6",
                                    color: "#111827",
                                    fontSize: "12px",
                                    textDecoration: "none",
                                  }}
                                >
                                  SMS
                                </a>
                                <a
                                  href={emailLink}
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #6366f1",
                                    background: "#eef2ff",
                                    color: "#4338ca",
                                    fontSize: "12px",
                                    textDecoration: "none",
                                  }}
                                >
                                  Email
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
