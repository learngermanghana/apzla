import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, db, firebaseConfigError, isFirebaseConfigured } from "./firebase";
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
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";

import AuthPanel from "./components/auth/AuthPanel";
import ChurchSetupPanel from "./components/church/ChurchSetupPanel";
import "./App.css";
import { useAuthProfile } from "./hooks/useAuthProfile";
import SermonsTab from "./components/tabs/SermonsTab";
import MembersTab from "./components/tabs/MembersTab";
import AttendanceTab from "./components/tabs/AttendanceTab";
import FollowupTab from "./components/tabs/FollowupTab";
import DashboardTabs from "./components/tabs/DashboardTabs";
import AccountSettingsModal from "./components/account/AccountSettingsModal";
import ToastContainer from "./components/common/ToastContainer";
import { PREFERRED_BASE_URL, normalizeBaseUrl } from "./utils/baseUrl";

const PAYSTACK_BANK_OPTIONS = [
  { code: "MTN", name: "MTN Mobile Money" },
  { code: "VOD", name: "Vodafone Cash" },
  { code: "TIGO", name: "AirtelTigo Money" },
  { code: "ACCESS", name: "Access Bank Ghana" },
  { code: "CAL", name: "CAL Bank" },
  { code: "ECOBANK", name: "Ecobank Ghana" },
  { code: "FIDELITY", name: "Fidelity Bank Ghana" },
  { code: "FAB", name: "First Atlantic Bank" },
  { code: "FBNGH", name: "FirstBank Ghana" },
  { code: "GCB", name: "GCB Bank" },
  { code: "GTB", name: "GTBank Ghana" },
  { code: "RBBA", name: "Republic Bank Ghana" },
  { code: "SBGH", name: "Stanbic Bank Ghana" },
  { code: "SCB", name: "Standard Chartered Ghana" },
  { code: "UBAGH", name: "UBA Ghana" },
];

function AppContent() {
  const {
    user,
    userProfile,
    setUserProfile,
    profileLoading,
    profileError,
    reloadProfile,
    refreshUser,
  } = useAuthProfile();

  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationChurchName, setRegistrationChurchName] = useState("");
  const [registrationChurchAddress, setRegistrationChurchAddress] = useState("");
  const [registrationChurchCity, setRegistrationChurchCity] = useState("");
  const [registrationChurchPhone, setRegistrationChurchPhone] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState("");
  const [passwordResetError, setPasswordResetError] = useState("");
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [churchSettings, setChurchSettings] = useState({
    name: "",
    address: "",
    country: "",
    city: "",
    phone: "",
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
  const [churchAddress, setChurchAddress] = useState("");
  const [churchCountry, setChurchCountry] = useState("Ghana");
  const [churchCity, setChurchCity] = useState("");
  const [churchPhone, setChurchPhone] = useState("");

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
  const [memberSearch, setMemberSearch] = useState("");

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

  const normalizeBaseUrlMemo = useCallback(
    (rawBaseUrl) => normalizeBaseUrl(rawBaseUrl),
    []
  );

  // Attendance
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return PREFERRED_BASE_URL;
    return normalizeBaseUrlMemo(window.location.origin || PREFERRED_BASE_URL);
  }, [normalizeBaseUrlMemo]);
  const [attendanceForm, setAttendanceForm] = useState({
    date: todayStr,
    serviceType: "Sunday Service",
    adults: "",
    children: "",
    visitors: "",
    notes: "",
  });

  const normalizeServiceTypeKey = (value = "") =>
    value.trim().toLowerCase() || "service";

  // Member attendance (per person check-ins)
  const [memberAttendance, setMemberAttendance] = useState([]);
  const [memberAttendanceLoading, setMemberAttendanceLoading] = useState(false);
  const [memberAttendanceForm, setMemberAttendanceForm] = useState({
    date: todayStr,
    serviceType: "Sunday Service",
    search: "",
  });
  const [checkinTokenForm, setCheckinTokenForm] = useState({
    churchId: "",
    serviceDate: todayStr,
    serviceType: "Sunday Service",
    baseUrl: defaultBaseUrl,
  });
  const [checkinTokenLink, setCheckinTokenLink] = useState("");
  const [checkinTokenQr, setCheckinTokenQr] = useState("");
  const [checkinServiceCode, setCheckinServiceCode] = useState("");
  const [checkinTokenLoading, setCheckinTokenLoading] = useState(false);
  const [checkinTokenError, setCheckinTokenError] = useState("");
  const [showCheckinIssuer, setShowCheckinIssuer] = useState(false);
  const [memberCheckinLink, setMemberCheckinLink] = useState({
    memberId: null,
    link: "",
    serviceCode: "",
  });
  const [memberLinkLoadingId, setMemberLinkLoadingId] = useState(null);

  // Member invite sharing
  const [memberInviteLink, setMemberInviteLink] = useState("");
  const [memberInviteQr, setMemberInviteQr] = useState("");
  const [memberInviteLoading, setMemberInviteLoading] = useState(false);
  const [memberInviteError, setMemberInviteError] = useState("");
  const [memberInviteBaseUrl, setMemberInviteBaseUrl] = useState(defaultBaseUrl);

  // Giving (collections & tithes)
  const [giving, setGiving] = useState([]);
  const [givingLoading, setGivingLoading] = useState(false);
  const [givingPageCursor, setGivingPageCursor] = useState(null);
  const [givingHasMore, setGivingHasMore] = useState(true);
  const [givingMemberFilter, setGivingMemberFilter] = useState("");
  const [payoutStatus, setPayoutStatus] = useState("NOT_CONFIGURED");
  const [paystackSubaccountCode, setPaystackSubaccountCode] = useState(null);
  const [onlineGivingAppliedAt, setOnlineGivingAppliedAt] = useState(null);
  const [payoutForm, setPayoutForm] = useState({
    bankType: "",
    accountName: "",
    accountNumber: "",
    network: "",
    confirmDetails: false,
  });
  const [editingPayoutDetails, setEditingPayoutDetails] = useState(false);
  const [onlineGivingActionLoading, setOnlineGivingActionLoading] = useState(false);
  const [givingForm, setGivingForm] = useState({
    date: todayStr,
    serviceType: "Sunday Service",
    type: "Offering", // Offering | Tithe | Special
    amount: "",
    notes: "",
    memberId: "",
  });
  const onlineGivingLink = useMemo(() => {
    if (!userProfile?.churchId) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : PREFERRED_BASE_URL;
    const normalizedBase = normalizeBaseUrlMemo(origin);
    return `${normalizedBase}/give/${userProfile.churchId}`;
  }, [userProfile?.churchId, normalizeBaseUrlMemo]);

  const onlineGivingQrUrl = useMemo(() => {
    if (!onlineGivingLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      onlineGivingLink
    )}`;
  }, [onlineGivingLink]);

  const onlineGivingActive = payoutStatus === "ACTIVE";
  const onlineGivingPending = payoutStatus === "PENDING_SUBACCOUNT";
  const onlineGivingFailed = payoutStatus === "FAILED_SUBACCOUNT";
  const onlineGivingStatusLabel = onlineGivingActive
    ? "Active"
    : onlineGivingPending
      ? "Creating subaccount"
      : onlineGivingFailed
        ? "Needs attention"
        : "Not configured";
  const onlineGivingStatusBadge = onlineGivingActive
    ? { bg: "#ecfdf3", color: "#166534", border: "#bbf7d0" }
    : onlineGivingPending
      ? { bg: "#fef9c3", color: "#854d0e", border: "#fef08a" }
      : onlineGivingFailed
        ? { bg: "#fef2f2", color: "#991b1b", border: "#fecdd3" }
        : { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
  const showPayoutForm =
    editingPayoutDetails ||
    (!onlineGivingActive && !onlineGivingPending && !onlineGivingFailed);

  // Sermons
  const [sermons, setSermons] = useState([]);
  const [sermonsLoading, setSermonsLoading] = useState(false);
  const [sermonSearch, setSermonSearch] = useState("");
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
  const [followupAudience, setFollowupAudience] = useState("VISITOR");
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

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const syncOnlineGivingState = (data) => {
    setPayoutStatus(data?.payoutStatus || data?.onlineGivingStatus || "NOT_CONFIGURED");
    setPaystackSubaccountCode(
      data?.paystackSubaccountCode || data?.onlineGivingSubaccount || null
    );
    setOnlineGivingAppliedAt(data?.onlineGivingAppliedAt || null);
    setPayoutForm((prev) => ({
      ...prev,
      bankType: data?.payoutBankType || prev.bankType,
      accountName: data?.payoutAccountName || prev.accountName,
      accountNumber: data?.payoutAccountNumber || prev.accountNumber,
      network: data?.payoutNetwork || prev.network,
    }));
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
          baseUrl: normalizeBaseUrlMemo(
            parsed.baseUrl || prev.baseUrl || defaultBaseUrl
          ),
          serviceDate: parsed.serviceDate || prev.serviceDate || todayStr,
        }));
        return;
      }

      setCheckinTokenForm((prev) => ({
        ...prev,
      }));
    } catch (err) {
      console.error("Restore check-in token form failed:", err);
    }
  }, [defaultBaseUrl, todayStr, normalizeBaseUrlMemo]);

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
      baseUrl: normalizeBaseUrlMemo(prev.baseUrl || defaultBaseUrl),
    }));
  }, [userProfile?.churchId, defaultBaseUrl, normalizeBaseUrlMemo]);

  useEffect(() => {
    const fetchChurchPlan = async () => {
      if (!userProfile?.churchId) {
        setChurchPlan(null);
        setSubscriptionInfo(null);
        syncOnlineGivingState(null);
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
          syncOnlineGivingState(data);
        } else {
          setChurchPlan(null);
          setSubscriptionInfo(null);
          syncOnlineGivingState(null);
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
    if (!isValidEmail(trimmedEmail)) return "Enter a valid email address.";

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
      setPasswordResetMessage("");
      setPasswordResetError("");
      setVerificationMessage("");
      setVerificationError("");
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (auth.currentUser) {
        try {
          await sendEmailVerification(auth.currentUser);
          setVerificationMessage(
            `Verification email sent to ${auth.currentUser.email}. Please confirm to continue.`
          );
        } catch (verificationError) {
          console.error("Verification email error:", verificationError);
          setVerificationError(
            verificationError.message || "Unable to send verification email."
          );
        }
      }
      setChurchName(registrationChurchName.trim());
      setChurchAddress(registrationChurchAddress.trim());
      setChurchCity(registrationChurchCity.trim());
      setChurchPhone(registrationChurchPhone.trim());
      setEmail("");
      setPassword("");
      setRegistrationChurchName("");
      setRegistrationChurchAddress("");
      setRegistrationChurchCity("");
      setRegistrationChurchPhone("");
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
      setPasswordResetMessage("");
      setPasswordResetError("");
      setVerificationMessage("");
      setVerificationError("");
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

  const handlePasswordReset = async () => {
    const trimmedEmail = email.trim();
    setPasswordResetMessage("");
    setPasswordResetError("");

    if (!trimmedEmail) {
      setPasswordResetError("Enter your email to reset your password.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setPasswordResetError("Enter a valid email address.");
      return;
    }

    try {
      setPasswordResetLoading(true);
      await sendPasswordResetEmail(auth, trimmedEmail);
      setPasswordResetMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      console.error("Password reset error:", err);
      setPasswordResetError(
        err.message || "Unable to send password reset email. Please try again."
      );
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    setVerificationMessage("");
    setVerificationError("");

    if (!auth.currentUser) return;

    try {
      setVerificationLoading(true);
      await sendEmailVerification(auth.currentUser);
      setVerificationMessage(
        `Verification email sent to ${auth.currentUser.email}. Check your inbox to confirm.`
      );
    } catch (err) {
      console.error("Verification email error:", err);
      setVerificationError(
        err.message || "Unable to send verification email. Please try again."
      );
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleRefreshVerificationStatus = async () => {
    setVerificationError("");
    setVerificationMessage("");

    if (!auth.currentUser) return;

    try {
      setVerificationLoading(true);
      const updatedUser = await refreshUser();
      if (updatedUser?.emailVerified) {
        setVerificationMessage("Email verified! Loading your workspace...");
      } else {
        setVerificationMessage(
          "Please click the verification link in your email, then select refresh."
        );
      }
    } catch (err) {
      console.error("Verification refresh error:", err);
      setVerificationError(
        err.message || "Unable to refresh verification status. Try again."
      );
    } finally {
      setVerificationLoading(false);
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
          address: data.address || "",
          country: data.country || "",
          city: data.city || "",
          phone: data.phone || "",
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
        syncOnlineGivingState(data);
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
      address: userProfile.churchAddress || "",
      country: "",
      city: "",
      phone: userProfile.churchPhone || "",
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

    if (!churchSettings.address.trim()) {
      showToast("Please enter a church address.", "error");
      return;
    }

    if (!churchSettings.phone.trim()) {
      showToast("Please enter a church phone number.", "error");
      return;
    }

    setAccountLoading(true);

    try {
      await updateDoc(doc(db, "churches", userProfile.churchId), {
        name: churchSettings.name.trim(),
        address: churchSettings.address.trim(),
        country: churchSettings.country.trim(),
        city: churchSettings.city.trim(),
        phone: churchSettings.phone.trim(),
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "users", user.uid), {
        churchName: churchSettings.name.trim(),
        churchAddress: churchSettings.address.trim(),
        churchCity: churchSettings.city.trim(),
        churchPhone: churchSettings.phone.trim(),
      });

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              churchName: churchSettings.name.trim(),
              churchAddress: churchSettings.address.trim(),
              churchCity: churchSettings.city.trim(),
              churchPhone: churchSettings.phone.trim(),
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

    if (!churchAddress.trim()) {
      showToast("Please enter a church address.", "error");
      return;
    }

    if (!churchCountry.trim()) {
      showToast("Please enter a country.", "error");
      return;
    }

    if (!churchCity.trim()) {
      showToast("Please enter a city.", "error");
      return;
    }

    if (!churchPhone.trim()) {
      showToast("Please enter a church phone number.", "error");
      return;
    }

    try {
      setLoading(true);

      const trialStart = new Date();
      const trialEnd = addDays(trialStart, TRIAL_LENGTH_DAYS);

      const churchRef = await addDoc(collection(db, "churches"), {
        name: churchName.trim(),
        address: churchAddress.trim(),
        country: churchCountry.trim(),
        city: churchCity.trim(),
        phone: churchPhone.trim(),
        ownerUserId: user.uid,
        createdAt: trialStart.toISOString(),
        trialStartedAt: trialStart.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        subscriptionStatus: "TRIAL",
        payoutStatus: "NOT_CONFIGURED",
        paystackSubaccountCode: null,
        payoutBankType: "",
        payoutAccountName: "",
        payoutAccountNumber: "",
        payoutNetwork: "",
        onlineGivingAppliedAt: null,
        onlineGivingEnabled: false,
      });

      const churchId = churchRef.id;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        churchId,
        role: "CHURCH_ADMIN",
        churchName: churchName.trim(),
        churchAddress: churchAddress.trim(),
        churchCity: churchCity.trim(),
        churchPhone: churchPhone.trim(),
        createdAt: new Date().toISOString(),
      });

      setChurchPlan({
        id: churchId,
        name: churchName.trim(),
        address: churchAddress.trim(),
        country: churchCountry.trim(),
        city: churchCity.trim(),
        phone: churchPhone.trim(),
        ownerUserId: user.uid,
        createdAt: trialStart.toISOString(),
        trialStartedAt: trialStart.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        subscriptionStatus: "TRIAL",
        payoutStatus: "NOT_CONFIGURED",
        paystackSubaccountCode: null,
        payoutBankType: "",
        payoutAccountName: "",
        payoutAccountNumber: "",
        payoutNetwork: "",
        onlineGivingAppliedAt: null,
        onlineGivingEnabled: false,
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

      syncOnlineGivingState({ payoutStatus: "NOT_CONFIGURED" });

      setUserProfile({
        id: user.uid,
        email: user.email,
        churchId,
        role: "CHURCH_ADMIN",
        churchName: churchName.trim(),
        churchAddress: churchAddress.trim(),
        churchCity: churchCity.trim(),
        churchPhone: churchPhone.trim(),
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

  const handleOverrideAttendance = async (record) => {
    if (!userProfile?.churchId || !record?.date) return;

    const parseNonNegativeNumber = (value) => {
      const parsed = Number(value);
      if (Number.isNaN(parsed) || parsed < 0) return 0;
      return parsed;
    };

    const adultsInput = window.prompt("Adults", record.adults ?? 0);
    if (adultsInput === null) return;
    const childrenInput = window.prompt("Children", record.children ?? 0);
    if (childrenInput === null) return;
    const visitorsInput = window.prompt("Visitors", record.visitors ?? 0);
    if (visitorsInput === null) return;
    const notesInput = window.prompt("Notes", record.notes || "");

    const payload = {
      churchId: userProfile.churchId,
      date: record.date,
      serviceType: record.serviceType || "Service",
      adults: parseNonNegativeNumber(adultsInput),
      children: parseNonNegativeNumber(childrenInput),
      visitors: parseNonNegativeNumber(visitorsInput),
      notes: (notesInput || "").trim(),
    };

    try {
      setLoading(true);

      if (record.manualIds && record.manualIds.length > 0) {
        const targetId = record.manualIds[0];
        const docRef = doc(db, "attendance", targetId);
        await updateDoc(docRef, payload);
      } else {
        await addDoc(collection(db, "attendance"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }

      await loadAttendance();
      showToast("Attendance updated.", "success");
    } catch (err) {
      console.error("Override attendance error:", err);
      showToast(err.message || "Unable to update attendance.", "error");
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

  const issueCheckinTokenRequest = async (payload) => {
    const normalizedPayload = {
      ...payload,
      churchId: payload.churchId?.trim(),
      serviceDate: payload.serviceDate,
      serviceType: payload.serviceType?.trim(),
      baseUrl: normalizeBaseUrlMemo(payload.baseUrl || defaultBaseUrl),
    };

    if (!normalizedPayload.churchId || !normalizedPayload.serviceDate) {
      throw new Error("Church ID and service date are required.");
    }

    const res = await fetch("/api/checkin-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedPayload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data?.error || data?.message || "Unable to issue link.";
      throw new Error(message);
    }

    const token = data?.token || data?.id;
    const linkBase = normalizedPayload.baseUrl?.replace(/\/$/, "") || "";
    const generatedLink =
      data?.link ||
      (token ? `${linkBase}/checkin?token=${encodeURIComponent(token)}` : "");
    const qrImageUrl =
      data?.qrImageUrl ||
      (generatedLink
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
            generatedLink
          )}`
        : "");

    if (!generatedLink) {
      throw new Error("The server did not return a check-in link.");
    }

    return { link: generatedLink, qrImageUrl, serviceCode: data?.serviceCode || "" };
  };

  const issueCheckinToken = async (event) => {
    event.preventDefault();

    const payload = {
      ...checkinTokenForm,
      churchId: checkinTokenForm.churchId.trim(),
      serviceDate: checkinTokenForm.serviceDate,
      serviceType: checkinTokenForm.serviceType.trim(),
      baseUrl: checkinTokenForm.baseUrl.trim(),
    };

    if (!payload.churchId || !payload.serviceDate) {
      setCheckinTokenError("Church ID and service date are required.");
      return;
    }

    setCheckinTokenError("");
    setCheckinTokenLink("");
    setCheckinTokenQr("");
    setCheckinServiceCode("");

    try {
      setCheckinTokenLoading(true);
      const { link: generatedLink, qrImageUrl, serviceCode } =
        await issueCheckinTokenRequest(payload);
      setCheckinTokenLink(generatedLink);
      setCheckinTokenQr(qrImageUrl);
      setCheckinServiceCode(serviceCode || "");
      showToast("Check-in link issued.", "success");
    } catch (err) {
      console.error("Issue check-in token error:", err);
      setCheckinTokenError(err.message || "Unable to issue link.");
    } finally {
      setCheckinTokenLoading(false);
    }
  };

  const issueMemberCheckinLink = async (member) => {
    if (!userProfile?.churchId) {
      showToast("Link a church to issue check-in links.", "error");
      return;
    }

    const payload = {
      memberId: member.id,
      churchId: userProfile.churchId,
      serviceDate: memberAttendanceForm.date,
      serviceType: memberAttendanceForm.serviceType,
      email: member.email,
      baseUrl: defaultBaseUrl,
    };

    try {
      setMemberLinkLoadingId(member.id);
      const { link: generatedLink, serviceCode } = await issueCheckinTokenRequest(
        payload
      );
      setMemberCheckinLink({ memberId: member.id, link: generatedLink, serviceCode });
      showToast("Check-in link ready to share.", "success");
    } catch (err) {
      console.error("Issue member check-in link error:", err);
      showToast(err.message || "Unable to issue check-in link.", "error");
    } finally {
      setMemberLinkLoadingId(null);
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

  const copyServiceCode = async () => {
    if (!checkinServiceCode) return;
    try {
      await navigator.clipboard.writeText(checkinServiceCode);
      showToast("Service code copied.", "success");
    } catch (err) {
      console.error("Copy service code error:", err);
      showToast("Unable to copy service code.", "error");
    }
  };

  const copyMemberCheckinLink = async (link) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copied to clipboard.", "success");
    } catch (err) {
      console.error("Copy member check-in link error:", err);
      showToast("Unable to copy link.", "error");
    }
  };

  const fetchQrBlobUrl = async (qrUrl) => {
    const response = await fetch(qrUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to fetch QR image.");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  const downloadQrImage = async (qrUrl, filename = "qr.png") => {
    if (!qrUrl) return;
    try {
      const blobUrl = await fetchQrBlobUrl(qrUrl);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast("QR image downloaded.", "success");
    } catch (err) {
      console.error("Download QR image error:", err);
      showToast(err.message || "Unable to download QR image.", "error");
    }
  };

  const printQrImage = async (qrUrl, title = "Print QR") => {
    if (!qrUrl) return;
    try {
      const blobUrl = await fetchQrBlobUrl(qrUrl);
      const printWindow = window.open("", "_blank", "width=420,height=520");

      if (!printWindow) {
        throw new Error("Popup blocked. Allow popups to print the QR code.");
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
          </head>
          <body style="margin:0;display:flex;align-items:center;justify-content:center;background:#fff;">
            <img src="${blobUrl}" style="width:320px;height:320px;object-fit:contain;" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
        printWindow.print();
      };

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000);
    } catch (err) {
      console.error("Print QR image error:", err);
      showToast(err.message || "Unable to print QR image.", "error");
    }
  };

  const downloadCheckinQrImage = async () => {
    await downloadQrImage(checkinTokenQr, "checkin-qr.png");
  };

  const printCheckinQrImage = async () => {
    await printQrImage(checkinTokenQr, "Print Check-in QR");
  };

  const copyOnlineGivingLink = async () => {
    if (!onlineGivingLink) return;
    try {
      await navigator.clipboard.writeText(onlineGivingLink);
      showToast("Online giving link copied.", "success");
    } catch (err) {
      console.error("Copy online giving link error:", err);
      showToast("Unable to copy online giving link.", "error");
    }
  };

  const openOnlineGivingLink = () => {
    if (!onlineGivingLink) return;
    window.open(onlineGivingLink, "_blank", "noopener,noreferrer");
  };

  const downloadOnlineGivingQr = async () => {
    await downloadQrImage(onlineGivingQrUrl, "online-giving-qr.png");
  };

  const printOnlineGivingQr = async () => {
    await printQrImage(onlineGivingQrUrl, "Print Online Giving QR");
  };

  const buildShareLinks = (
    link,
    { serviceType, serviceDate, memberName, serviceCode } = {}
  ) => {
    if (!link) return null;
    const serviceLabel = serviceType || "Service";
    const dateLabel = serviceDate ? ` on ${serviceDate}` : "";
    const recipient = memberName ? `${memberName}, ` : "";
    const codeNote = serviceCode ? ` (code: ${serviceCode})` : "";
    const message = `${recipient}here's your ${serviceLabel} check-in link${dateLabel}${codeNote}: ${link}`;
    const encodedMessage = encodeURIComponent(message);

    return {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodedMessage}`,
      email: `mailto:?subject=${encodeURIComponent("Service check-in")}&body=${encodedMessage}`,
    };
  };

  const manualShareLinks = checkinTokenLink
    ? buildShareLinks(checkinTokenLink, {
        serviceType: checkinTokenForm.serviceType,
        serviceDate: checkinTokenForm.serviceDate,
        serviceCode: checkinServiceCode,
      })
    : null;

  const issueMemberInviteLink = async (event) => {
    event?.preventDefault?.();

    if (!userProfile?.churchId) {
      showToast("Link a church before issuing invite links.", "error");
      return;
    }

    const baseUrl = normalizeBaseUrlMemo(memberInviteBaseUrl || defaultBaseUrl);

    setMemberInviteError("");
    setMemberInviteLink("");
    setMemberInviteQr("");

    try {
      setMemberInviteLoading(true);
      const res = await fetch("/api/member-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchId: userProfile.churchId, baseUrl }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data?.message || "Unable to issue invite link.";
        throw new Error(message);
      }

      setMemberInviteLink(data.link || "");
      setMemberInviteQr(data.qrImageUrl || "");
      showToast("Invite link ready to share.", "success");
    } catch (err) {
      console.error("Issue member invite link error:", err);
      setMemberInviteError(err.message || "Unable to issue invite link.");
    } finally {
      setMemberInviteLoading(false);
    }
  };

  const copyMemberInviteLink = async () => {
    if (!memberInviteLink) return;
    try {
      await navigator.clipboard.writeText(memberInviteLink);
      showToast("Invite link copied.", "success");
    } catch (err) {
      console.error("Copy invite link error:", err);
      showToast("Unable to copy invite link.", "error");
    }
  };

  const openMemberInviteLink = () => {
    if (!memberInviteLink) return;
    window.open(memberInviteLink, "_blank", "noopener,noreferrer");
  };

  const downloadMemberInviteQr = async () => {
    await downloadQrImage(memberInviteQr, "member-invite-qr.png");
  };

  const printMemberInviteQr = async () => {
    await printQrImage(memberInviteQr, "Print Member Invite QR");
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

  // ---------- Online giving application ----------
  const handleSubmitOnlineGivingApplication = async () => {
    if (!userProfile?.churchId) {
      showToast("Link a church before applying for online giving.", "error");
      return;
    }

    const requiredFields = [
      { key: "bankType", label: "Bank / MoMo type" },
      { key: "accountName", label: "Account name" },
      { key: "accountNumber", label: "Account number / phone" },
    ];

    const missing = requiredFields.find((field) => !payoutForm[field.key].trim());
    if (missing) {
      showToast(`${missing.label} is required.`, "error");
      return;
    }

    if (!payoutForm.confirmDetails) {
      showToast("Please confirm the settlement details are correct.", "error");
      return;
    }

    try {
      setOnlineGivingActionLoading(true);
      const nowIso = new Date().toISOString();

      await updateDoc(doc(db, "churches", userProfile.churchId), {
        payoutBankType: payoutForm.bankType.trim(),
        payoutAccountName: payoutForm.accountName.trim(),
        payoutAccountNumber: payoutForm.accountNumber.trim(),
        payoutNetwork: payoutForm.network.trim() || null,
        payoutStatus: "PENDING_SUBACCOUNT",
        paystackSubaccountCode: null,
        onlineGivingAppliedAt: nowIso,
        onlineGivingEnabled: false,
      });

      setPayoutStatus("PENDING_SUBACCOUNT");
      setPaystackSubaccountCode(null);
      setOnlineGivingAppliedAt(nowIso);
      setChurchPlan((prev) =>
        prev
          ? {
              ...prev,
              payoutStatus: "PENDING_SUBACCOUNT",
              paystackSubaccountCode: null,
              payoutBankType: payoutForm.bankType.trim(),
              payoutAccountName: payoutForm.accountName.trim(),
              payoutAccountNumber: payoutForm.accountNumber.trim(),
              payoutNetwork: payoutForm.network.trim() || "",
              onlineGivingAppliedAt: nowIso,
            }
          : prev,
      );

      const callableBase =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin.replace(/\/$/, "")
          : "https://www.apzla.com";

      const idToken = await auth?.currentUser?.getIdToken?.();

      const response = await fetch(`${callableBase}/api/create-church-subaccount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ churchId: userProfile.churchId }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.status !== "success") {
        const message =
          result?.message ||
          response.statusText ||
          "Unable to create the Paystack subaccount right now.";
        throw new Error(message);
      }

      const subaccountCode = result?.data?.subaccountCode || null;

      setPaystackSubaccountCode(subaccountCode);
      setPayoutStatus("ACTIVE");
      setChurchPlan((prev) =>
        prev
          ? {
              ...prev,
              payoutStatus: "ACTIVE",
              paystackSubaccountCode: subaccountCode,
              onlineGivingEnabled: true,
            }
          : prev,
      );

      showToast("Online giving is active. Your Paystack subaccount was created.", "success");
    } catch (err) {
      console.error("Submit online giving application error:", err);
      showToast(err.message || "Unable to create the Paystack subaccount right now.", "error");
      try {
        await updateDoc(doc(db, "churches", userProfile.churchId), {
          payoutStatus: "FAILED_SUBACCOUNT",
        });
      } catch (updateError) {
        console.error("Failed to record payout failure state:", updateError);
      }
      setPayoutStatus((prev) => (prev === "PENDING_SUBACCOUNT" ? "FAILED_SUBACCOUNT" : prev));
    } finally {
      setOnlineGivingActionLoading(false);
    }
  };

  const startEditingPayoutDetails = () => {
    setEditingPayoutDetails(true);
    setPayoutForm((prev) => ({ ...prev, confirmDetails: false }));
  };

  const handleResetOnlineGiving = async () => {
    if (!userProfile?.churchId) {
      showToast("Link a church before deleting payout details.", "error");
      return;
    }

    try {
      setOnlineGivingActionLoading(true);
      await updateDoc(doc(db, "churches", userProfile.churchId), {
        payoutStatus: "NOT_CONFIGURED",
        paystackSubaccountCode: null,
        payoutBankType: "",
        payoutAccountName: "",
        payoutAccountNumber: "",
        payoutNetwork: "",
        onlineGivingAppliedAt: null,
        onlineGivingEnabled: false,
      });

      setPayoutStatus("NOT_CONFIGURED");
      setPaystackSubaccountCode(null);
      setOnlineGivingAppliedAt(null);
      setPayoutForm({
        bankType: "",
        accountName: "",
        accountNumber: "",
        network: "",
        confirmDetails: false,
      });
      setChurchPlan((prev) =>
        prev
          ? {
              ...prev,
              payoutStatus: "NOT_CONFIGURED",
              paystackSubaccountCode: null,
              payoutBankType: "",
              payoutAccountName: "",
              payoutAccountNumber: "",
              payoutNetwork: "",
              onlineGivingAppliedAt: null,
              onlineGivingEnabled: false,
            }
          : prev
      );
      setEditingPayoutDetails(false);
      showToast("Payout details removed. Online giving is disabled.", "success");
    } catch (err) {
      console.error("Reset online giving error:", err);
      showToast(err.message || "Unable to delete payout details right now.", "error");
    } finally {
      setOnlineGivingActionLoading(false);
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

  const attendanceTrend = useMemo(() => {
    const sorted = attendance
      .filter((record) => record.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return sorted.slice(-6).map((record) => {
      const adults = Number(record.adults || 0);
      const children = Number(record.children || 0);
      const visitors = Number(record.visitors || 0);
      const total = adults + children + visitors;

      const parsedDate = new Date(record.date);
      const label = Number.isNaN(parsedDate)
        ? record.date
        : parsedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

      return {
        label,
        total,
        subtitle: record.serviceType || "Service",
      };
    });
  }, [attendance]);

  const givingTrend = useMemo(() => {
    const monthMap = new Map();

    giving.forEach((record) => {
      if (!record.date) return;
      const parsedDate = new Date(record.date);
      if (Number.isNaN(parsedDate)) return;

      const key = `${parsedDate.getFullYear()}-${String(
        parsedDate.getMonth() + 1,
      ).padStart(2, "0")}`;
      const current = monthMap.get(key) || 0;
      monthMap.set(key, current + Number(record.amount || 0));
    });

    const entries = Array.from(monthMap.entries()).map(([key, amount]) => {
      const [year, month] = key.split("-").map((v) => Number(v));
      const date = new Date(year, month - 1, 1);
      return {
        label: date.toLocaleDateString("en-US", { month: "short" }),
        year,
        month,
        amount,
      };
    });

    entries.sort((a, b) =>
      a.year === b.year ? a.month - b.month : a.year - b.year,
    );

    return entries.slice(-6);
  }, [giving]);

  const attendanceChartMax = useMemo(
    () => Math.max(...attendanceTrend.map((p) => p.total || 0), 1),
    [attendanceTrend],
  );

  const givingChartMax = useMemo(
    () => Math.max(...givingTrend.map((p) => p.amount || 0), 1),
    [givingTrend],
  );

  const combinedAttendanceRecords = useMemo(() => {
    const map = new Map();

    attendance.forEach((record) => {
      const keyDate = record.date || "";
      const normalizedService = normalizeServiceTypeKey(
        record.serviceType || "Service",
      );
      const key = `${keyDate}__${normalizedService}`;

      const adults = Number(record.adults || 0);
      const children = Number(record.children || 0);
      const visitors = Number(record.visitors || 0);

      const existing = map.get(key);
      if (existing) {
        existing.adults += adults;
        existing.children += children;
        existing.visitors += visitors;
        if (record.id) existing.manualIds.push(record.id);
        if (!existing.notes && record.notes) existing.notes = record.notes;
        if (!existing.serviceType && record.serviceType) {
          existing.serviceType = record.serviceType;
        }
      } else {
        map.set(key, {
          key,
          date: keyDate,
          serviceType: record.serviceType || "Service",
          normalizedService,
          notes: record.notes || "",
          adults,
          children,
          visitors,
          selfCheckins: 0,
          manualIds: record.id ? [record.id] : [],
          createdAt: record.createdAt || "",
        });
      }
    });

    memberAttendanceHistory.forEach((entry) => {
      const keyDate = entry.date || "";
      const normalizedService = normalizeServiceTypeKey(
        entry.serviceType || "Service",
      );
      const key = `${keyDate}__${normalizedService}`;

      const existing = map.get(key);
      if (existing) {
        existing.selfCheckins += 1;
        if (!existing.serviceType && entry.serviceType) {
          existing.serviceType = entry.serviceType;
        }
        if (!existing.createdAt && entry.checkedInAt) {
          existing.createdAt = entry.checkedInAt;
        }
      } else {
        map.set(key, {
          key,
          date: keyDate,
          serviceType: entry.serviceType || "Service",
          normalizedService,
          notes: "",
          adults: 0,
          children: 0,
          visitors: 0,
          selfCheckins: 1,
          manualIds: [],
          createdAt: entry.checkedInAt || "",
        });
      }
    });

    const records = Array.from(map.values()).map((record) => {
      const total =
        Number(record.adults || 0) +
        Number(record.children || 0) +
        Number(record.visitors || 0) +
        Number(record.selfCheckins || 0);

      let sourceLabel = "Manual entry";
      if (record.selfCheckins > 0 && record.manualIds.length > 0) {
        sourceLabel = "Manual + self check-in";
      } else if (record.selfCheckins > 0) {
        sourceLabel = "Self check-in";
      }

      return {
        ...record,
        total,
        sourceLabel,
      };
    });

    records.sort((a, b) => {
      const aTime = new Date(a.date || "").getTime();
      const bTime = new Date(b.date || "").getTime();

      const aValid = !Number.isNaN(aTime);
      const bValid = !Number.isNaN(bTime);

      if (aValid && bValid && aTime !== bTime) {
        return bTime - aTime;
      }

      if (!aValid && bValid) return 1;
      if (aValid && !bValid) return -1;

      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    return records;
  }, [attendance, memberAttendanceHistory]);

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

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

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
          setPasswordResetMessage("");
          setPasswordResetError("");
        }}
        email={email}
        password={password}
        churchName={registrationChurchName}
        churchAddress={registrationChurchAddress}
        churchCity={registrationChurchCity}
        churchPhone={registrationChurchPhone}
        onEmailChange={(e) => {
          setEmail(e.target.value);
          setAuthError("");
          setPasswordResetMessage("");
          setPasswordResetError("");
        }}
        onPasswordChange={(e) => {
          setPassword(e.target.value);
          setAuthError("");
          setPasswordResetMessage("");
          setPasswordResetError("");
        }}
        onChurchNameChange={(e) => {
          setRegistrationChurchName(e.target.value);
          setAuthError("");
        }}
        onChurchAddressChange={(e) => {
          setRegistrationChurchAddress(e.target.value);
          setAuthError("");
        }}
        onChurchCityChange={(e) => {
          setRegistrationChurchCity(e.target.value);
          setAuthError("");
        }}
        onChurchPhoneChange={(e) => {
          setRegistrationChurchPhone(e.target.value);
          setAuthError("");
        }}
        onSubmit={authMode === "login" ? handleLogin : handleRegister}
        loading={authLoading}
        errorMessage={authError}
        disableSubmit={!!authValidationMessage || authLoading}
        validationMessage={authValidationMessage}
        onForgotPassword={handlePasswordReset}
        passwordResetMessage={passwordResetMessage}
        passwordResetError={passwordResetError}
        passwordResetLoading={passwordResetLoading}
      />
    );
  }

  // ---------- UI: email verification required ----------
  if (user && !user.emailVerified) {
    const verificationNotice =
      verificationMessage ||
      `We sent a verification link to ${user.email}. Confirm your email to keep your account secure.`;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "520px",
            width: "100%",
            boxShadow: "0 15px 30px rgba(15,23,42,0.1)",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>
            Confirm your email
          </h2>
          <p style={{ margin: "0 0 14px", color: "#374151", fontSize: "14px" }}>
            {verificationNotice}
          </p>
          <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: "13px" }}>
            Tip: check your spam folder if you don&apos;t see the verification email.
          </p>
          {verificationError && (
            <p
              role="alert"
              style={{
                margin: "0 0 10px",
                color: "#b91c1c",
                fontSize: "13px",
                background: "#fef2f2",
                border: "1px solid #fecdd3",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              {verificationError}
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              onClick={handleSendVerificationEmail}
              disabled={verificationLoading}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                background: "#4f46e5",
                color: "white",
                cursor: verificationLoading ? "default" : "pointer",
              }}
            >
              {verificationLoading ? "Sending..." : "Resend verification"}
            </button>
            <button
              type="button"
              onClick={handleRefreshVerificationStatus}
              disabled={verificationLoading}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                background: "white",
                cursor: verificationLoading ? "default" : "pointer",
              }}
            >
              {verificationLoading ? "Checking..." : "I verified my email"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- UI: profile load failure ----------
  if (profileError) {
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
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 15px 30px rgba(15,23,42,0.1)",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: "20px" }}>
            Unable to load your profile
          </h2>
          <p style={{ margin: "0 0 16px", color: "#4b5563" }}>{profileError}</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
            <button
              type="button"
              onClick={reloadProfile}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                background: "#4f46e5",
                color: "white",
                cursor: "pointer",
              }}
            >
              Retry loading profile
            </button>
          </div>
        </div>
      </div>
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
        churchAddress={churchAddress}
        churchCountry={churchCountry}
        churchCity={churchCity}
        churchPhone={churchPhone}
        onChangeChurchName={(e) => setChurchName(e.target.value)}
        onChangeChurchAddress={(e) => setChurchAddress(e.target.value)}
        onChangeChurchCountry={(e) => setChurchCountry(e.target.value)}
        onChangeChurchCity={(e) => setChurchCity(e.target.value)}
        onChangeChurchPhone={(e) => setChurchPhone(e.target.value)}
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

  const lastAttendanceRecord = combinedAttendanceRecords[0];
  const lastAttendanceTotal = lastAttendanceRecord?.total || 0;
  const lastAttendanceDate = lastAttendanceRecord?.date || "";

  const normalizeSearchValue = (value = "") => value.toLowerCase().trim();
  const memberMatchesSearch = (member, searchValue) => {
    const normalized = normalizeSearchValue(searchValue);
    if (!normalized) return true;
    const fullName = `${member.firstName || ""} ${member.lastName || ""}`
      .toLowerCase()
      .trim();
    const phone = (member.phone || "").toLowerCase();
    const email = (member.email || "").toLowerCase();

    return (
      fullName.includes(normalized) ||
      phone.includes(normalized) ||
      email.includes(normalized)
    );
  };

  const filteredMembers = members.filter((m) =>
    memberMatchesSearch(m, memberSearch)
  );

  const normalizedCheckinSearch = normalizeSearchValue(
    memberAttendanceForm.search
  );
  const hasCheckinSearch = normalizedCheckinSearch.length > 0;

  const checkinSearchResults = hasCheckinSearch
    ? members.filter((m) =>
        memberMatchesSearch(m, memberAttendanceForm.search)
      )
    : [];

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

  const normalizedSermonSearch = normalizeSearchValue(sermonSearch);
  const filteredSermons = sermons.filter((s) => {
    if (!normalizedSermonSearch) return true;

    const valuesToCheck = [
      s.date,
      s.title,
      s.preacher,
      s.series,
      s.scripture,
      s.notes,
    ];

    return valuesToCheck.some((value) =>
      (value || "").toLowerCase().includes(normalizedSermonSearch)
    );
  });

  // Follow-up templates
  const visitorTemplate = `Hi, thank you for worshipping with us at ${
    userProfile.churchName || "our church"
  } today. We’re glad you came. God bless you!${
    followupPastorName ? ` – ${followupPastorName}` : ""
  }`;

  const memberTemplate = `Hi from ${
    userProfile.churchName || "our church"
  }. We appreciate you as part of our church family and are praying you’re well.${
    followupPastorName ? ` – ${followupPastorName}` : ""
  }`;

  const followupTemplate =
    followupAudience === "VISITOR" ? visitorTemplate : memberTemplate;
  const followupTemplateEncoded = encodeURIComponent(followupTemplate);
  const visitorEmailSubject = encodeURIComponent("Thank you for worshipping with us");
  const memberEmailSubject = encodeURIComponent(
    `Hello from ${userProfile.churchName || "our church"}`
  );
  const followupEmailSubject =
    followupAudience === "VISITOR"
      ? visitorEmailSubject
      : memberEmailSubject;
  const followupWhatsappLink = `https://wa.me/?text=${followupTemplateEncoded}`;
  const followupTelegramLink = `https://t.me/share/url?text=${followupTemplateEncoded}`;
  const followupEmailLink = `mailto:?subject=${followupEmailSubject}&body=${followupTemplateEncoded}`;
  const formatPhoneForLink = (phone) => (phone || "").replace(/\D/g, "");

  const visitorMembers = members.filter(
    (m) => (m.status || "").toUpperCase() === "VISITOR"
  );

  const followupTargets =
    followupAudience === "VISITOR" ? visitorMembers : members;
  const isVisitorAudience = followupAudience === "VISITOR";

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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <AccountSettingsModal
        visible={showAccountSettings}
        churchSettings={churchSettings}
        setChurchSettings={setChurchSettings}
        accountLoading={accountLoading}
        subscriptionInfo={subscriptionInfo}
        paystackLoading={paystackLoading}
        onClose={() => setShowAccountSettings(false)}
        onSaveChurchSettings={handleSaveChurchSettings}
        onStartSubscription={handlePaystackSubscription}
      />

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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: "flex-end",
              minWidth: "260px",
            }}
          >
            {accessStatus.detail && (
              <div
                className={`subscription-chip${
                  accessStatus.state === "expiring" ? " warning" : ""
                }`}
                onClick={() => setShowAccountSettings(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setShowAccountSettings(true);
                  }
                }}
                aria-label="View subscription details"
              >
                <div className="subscription-chip-icon" aria-hidden>
                  ⏰
                </div>
                <div>
                  <strong style={{ display: "block" }}>
                    {accessStatus.headline}
                  </strong>
                  <p style={{ margin: "2px 0 0", fontSize: "12px" }}>
                    {accessStatus.detail}
                  </p>
                </div>
              </div>
            )}

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
        </div>

        {/* Tabs */}
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === "overview" && (
          <>
            <div className="overview-hero">
              <div>
                <p className="eyebrow">Overview</p>
                <h2 className="overview-title">Health snapshot</h2>
                <p className="overview-subtitle">
                  This is your starting dashboard for {" "}
                  <strong>{userProfile.churchName}</strong>. Keep tabs on
                  people, giving, and attendance at a glance.
                </p>
                <div className="overview-pills">
                  <span className="pill">Realtime sync on</span>
                  <span className="pill pill-muted">
                    {totalMembers} people tracked
                  </span>
                </div>
              </div>
              <div className="overview-hero-metric">
                <p>Latest attendance</p>
                <strong>{lastAttendanceTotal || "—"}</strong>
                <span>{lastAttendanceDate || "Awaiting first record"}</span>
              </div>
            </div>

            {/* Summary cards */}
            <div className="stat-grid">
              <div className="stat-card">
                <p className="eyebrow">Total members</p>
                <div className="stat-value">{totalMembers}</div>
                <p className="stat-helper">Directory count</p>
              </div>

              <div className="stat-card stat-card--accent">
                <p className="eyebrow">Last service attendance</p>
                <div className="stat-value">{lastAttendanceTotal}</div>
                <p className="stat-helper">
                  {lastAttendanceDate ? lastAttendanceDate : "No attendance yet"}
                </p>
              </div>

              <div className="stat-card">
                <p className="eyebrow">Giving this month</p>
                <div className="stat-value">
                  {givingThisMonth.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="stat-helper">
                  {givingThisMonth > 0
                    ? "Current month total"
                    : "No giving records this month"}
                </p>
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

            <div className="chart-grid">
              <div className="chart-card">
                <div className="chart-card__header">
                  <div>
                    <p className="eyebrow">Attendance trend</p>
                    <h3 className="chart-title">Last services logged</h3>
                  </div>
                  <span className="pill pill-muted">Live</span>
                </div>

                {attendanceTrend.length > 0 ? (
                  <div className="bar-chart" role="img" aria-label="Attendance trend by recent services">
                    {attendanceTrend.map((point) => (
                      <div className="bar-column" key={`${point.label}-${point.subtitle}`}>
                        <div
                          className="bar-fill"
                          style={{
                            height: `${Math.max(
                              (point.total / attendanceChartMax) * 100,
                              6,
                            )}%`,
                          }}
                          title={`${point.subtitle}: ${point.total}`}
                        />
                        <span className="bar-label">{point.label}</span>
                        <span className="bar-subtitle">{point.subtitle}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="chart-empty">Log attendance to see your trend.</p>
                )}
              </div>

              <div className="chart-card">
                <div className="chart-card__header">
                  <div>
                    <p className="eyebrow">Giving momentum</p>
                    <h3 className="chart-title">Monthly totals</h3>
                  </div>
                  <span className="pill pill-muted">GHS</span>
                </div>

                {givingTrend.length > 0 ? (
                  <div className="bar-chart" role="img" aria-label="Monthly giving totals">
                    {givingTrend.map((point) => (
                      <div className="bar-column" key={`${point.year}-${point.month}`}>
                        <div
                          className="bar-fill bar-fill--teal"
                          style={{
                            height: `${Math.max(
                              (point.amount / givingChartMax) * 100,
                              6,
                            )}%`,
                          }}
                          title={`${point.label} ${point.year}: ${point.amount.toLocaleString()}`}
                        />
                        <span className="bar-label">{point.label}</span>
                        <span className="bar-subtitle">{point.year}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="chart-empty">Add giving to see monthly trends.</p>
                )}
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
          <MembersTab
            memberInviteBaseUrl={memberInviteBaseUrl}
            setMemberInviteBaseUrl={setMemberInviteBaseUrl}
            issueMemberInviteLink={issueMemberInviteLink}
            memberInviteLoading={memberInviteLoading}
            memberInviteError={memberInviteError}
            memberInviteLink={memberInviteLink}
            copyMemberInviteLink={copyMemberInviteLink}
            openMemberInviteLink={openMemberInviteLink}
            memberInviteQr={memberInviteQr}
            downloadMemberInviteQr={downloadMemberInviteQr}
            printMemberInviteQr={printMemberInviteQr}
            memberForm={memberForm}
            setMemberForm={setMemberForm}
            handleCreateMember={handleCreateMember}
            loading={loading}
            membersLoading={membersLoading}
            members={members}
            filteredMembers={filteredMembers}
            membersHasMore={membersHasMore}
            loadMoreMembers={loadMoreMembers}
            memberSearch={memberSearch}
            setMemberSearch={setMemberSearch}
            editingMemberId={editingMemberId}
            editingMemberForm={editingMemberForm}
            setEditingMemberForm={setEditingMemberForm}
            memberActionLoading={memberActionLoading}
            handleUpdateMember={handleUpdateMember}
            cancelEditingMember={cancelEditingMember}
            startEditingMember={startEditingMember}
            handleDeleteMember={handleDeleteMember}
          />
        )}

        {activeTab === "attendance" && (
          <AttendanceTab
            userProfile={userProfile}
            attendanceForm={attendanceForm}
            setAttendanceForm={setAttendanceForm}
            handleCreateAttendance={handleCreateAttendance}
            loading={loading}
            attendanceLoading={attendanceLoading}
            combinedAttendanceRecords={combinedAttendanceRecords}
            handleOverrideAttendance={handleOverrideAttendance}
            recentMemberCheckins={recentMemberCheckins}
          />
        )}

        {activeTab === "checkin" && (
          <CheckinTab
            memberAttendanceForm={memberAttendanceForm}
            setMemberAttendanceForm={setMemberAttendanceForm}
            memberAttendanceLoading={memberAttendanceLoading}
            hasCheckinSearch={hasCheckinSearch}
            checkinSearchResults={checkinSearchResults}
            memberAttendance={memberAttendance}
            handleCheckInMember={handleCheckInMember}
            loading={loading}
            issueMemberCheckinLink={issueMemberCheckinLink}
            memberLinkLoadingId={memberLinkLoadingId}
            members={members}
            memberCheckinLink={memberCheckinLink}
            buildShareLinks={buildShareLinks}
            copyMemberCheckinLink={copyMemberCheckinLink}
            setShowCheckinIssuer={setShowCheckinIssuer}
            showCheckinIssuer={showCheckinIssuer}
            issueCheckinToken={issueCheckinToken}
            checkinTokenForm={checkinTokenForm}
            setCheckinTokenForm={setCheckinTokenForm}
            checkinTokenError={checkinTokenError}
            checkinServiceCode={checkinServiceCode}
            copyServiceCode={copyServiceCode}
            checkinTokenLoading={checkinTokenLoading}
            checkinTokenLink={checkinTokenLink}
            checkinTokenQr={checkinTokenQr}
            downloadCheckinQrImage={downloadCheckinQrImage}
            printCheckinQrImage={printCheckinQrImage}
            manualShareLinks={manualShareLinks}
            copyCheckinLink={copyCheckinLink}
          />
        )}
        {activeTab === "giving" && (
          <GivingTab
            userProfile={userProfile}
            onlineGivingStatusBadge={onlineGivingStatusBadge}
            onlineGivingStatusLabel={onlineGivingStatusLabel}
            onlineGivingActive={onlineGivingActive}
            onlineGivingPending={onlineGivingPending}
            onlineGivingFailed={onlineGivingFailed}
            onlineGivingAppliedAt={onlineGivingAppliedAt}
            paystackSubaccountCode={paystackSubaccountCode}
            handleSubmitOnlineGivingApplication={handleSubmitOnlineGivingApplication}
            onlineGivingActionLoading={onlineGivingActionLoading}
            editingPayoutDetails={editingPayoutDetails}
            setEditingPayoutDetails={setEditingPayoutDetails}
            startEditingPayoutDetails={startEditingPayoutDetails}
            handleResetOnlineGiving={handleResetOnlineGiving}
            showPayoutForm={showPayoutForm}
            PAYSTACK_BANK_OPTIONS={PAYSTACK_BANK_OPTIONS}
            payoutForm={payoutForm}
            setPayoutForm={setPayoutForm}
            onlineGivingLink={onlineGivingLink}
            onlineGivingQrUrl={onlineGivingQrUrl}
            copyOnlineGivingLink={copyOnlineGivingLink}
            openOnlineGivingLink={openOnlineGivingLink}
            downloadOnlineGivingQr={downloadOnlineGivingQr}
            printOnlineGivingQr={printOnlineGivingQr}
            givingForm={givingForm}
            setGivingForm={setGivingForm}
            members={members}
            handleCreateGiving={handleCreateGiving}
            loading={loading}
            givingMemberFilter={givingMemberFilter}
            setGivingMemberFilter={setGivingMemberFilter}
            givingLoading={givingLoading}
            giving={giving}
            resolveGivingMember={resolveGivingMember}
            givingHasMore={givingHasMore}
            loadMoreGiving={loadMoreGiving}
          />
        )}

        {activeTab === "followup" && (
          <FollowupTab
            followupPastorName={followupPastorName}
            setFollowupPastorName={setFollowupPastorName}
            followupAudience={followupAudience}
            setFollowupAudience={setFollowupAudience}
            isVisitorAudience={isVisitorAudience}
            membersLoading={membersLoading}
            followupTargets={followupTargets}
            formatPhoneForLink={formatPhoneForLink}
            followupTemplateEncoded={followupTemplateEncoded}
            followupEmailSubject={followupEmailSubject}
            followupTemplate={followupTemplate}
            followupWhatsappLink={followupWhatsappLink}
            followupTelegramLink={followupTelegramLink}
            followupEmailLink={followupEmailLink}
            showToast={showToast}
          />
        )}

        {activeTab === "sermons" && (
          <SermonsTab
            sermonForm={sermonForm}
            setSermonForm={setSermonForm}
            handleCreateSermon={handleCreateSermon}
            sermonSearch={sermonSearch}
            setSermonSearch={setSermonSearch}
            filteredSermons={filteredSermons}
            sermons={sermons}
            sermonsLoading={sermonsLoading}
          />
        )}

      </div>
    </div>
  );
}

function MissingConfigNotice({ message }) {
  return (
    <div className="app">
      <div className="auth-card">
        <h1>Apzla</h1>
        <p className="error-message">
          {message || "The app configuration is incomplete. Please add the Firebase environment variables to continue."}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!isFirebaseConfigured) {
    return <MissingConfigNotice message={firebaseConfigError} />;
  }

  return <AppContent />;
}
