import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import "./checkin.css";

function StatusBanner({ tone = "info", message }) {
  const palette = {
    success: { bg: "#ecfdf3", text: "#166534" },
    error: { bg: "#fef2f2", text: "#991b1b" },
    info: { bg: "#eff6ff", text: "#1d4ed8" },
  }[tone];

  return (
    <div
      className="checkin-banner"
      style={{ background: palette.bg, color: palette.text }}
    >
      {message}
    </div>
  );
}

export default function CheckinPage() {
  const [token, setToken] = useState("");
  const [feedback, setFeedback] = useState({
    status: "idle",
    message: "Paste your token to continue.",
  });
  const [summary, setSummary] = useState(null);

  const statusTone = useMemo(() => {
    if (feedback.status === "success") return "success";
    if (feedback.status === "error") return "error";
    return "info";
  }, [feedback.status]);

  const setErrorFeedback = (message) => {
    setFeedback({ status: "error", message });
    setSummary(null);
  };

  const handleVerify = useCallback(
    async (incomingToken, { auto = false } = {}) => {
      const value = (incomingToken ?? token).trim();
      if (!value) {
        setErrorFeedback("Paste a token to continue.");
        return;
      }

      setFeedback({
        status: "loading",
        message: auto
          ? "Verifying the token from your link…"
          : "Verifying your check-in link…",
      });

      try {
        const res = await fetch("/api/verify-checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: value }),
        });

        const body = await res.json().catch(() => ({ status: "error" }));
        const failureMessage =
          body.message ||
          (body.reason === "expired"
            ? "That check-in link has expired. Ask your church admin for a new one."
            : "Unable to verify this token. Please confirm the full link was pasted.");

        if (!res.ok || body.status !== "success") {
          setErrorFeedback(failureMessage);
          return;
        }

        const payload = body.data;
        const { memberId, churchId, serviceDate, serviceType } = payload;

        await recordAttendance({ memberId, churchId, serviceDate, serviceType });

        const confirmation = {
          memberId,
          memberName: payload.memberName || "Member",
          churchId,
          churchName: payload.churchName || "Church",
          serviceDate,
          serviceType: serviceType || "Service",
          status: "Verified",
          verifiedAt: new Date().toISOString(),
        };

        setSummary(confirmation);
        setFeedback({
          status: "success",
          message: "Check-in verified! We'll record your attendance.",
        });
      } catch (err) {
        setErrorFeedback(
          err.message || "Unexpected verification error. Please try again."
        );
      }
    },
    [token]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token") || "";
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      handleVerify(tokenFromUrl, { auto: true });
    }
  }, [handleVerify]);

  const recordAttendance = async ({
    memberId,
    churchId,
    serviceDate,
    serviceType,
  }) => {
    const normalizedService = serviceType || "Service";
    const colRef = collection(db, "memberAttendance");
    const qExisting = query(
      colRef,
      where("churchId", "==", churchId),
      where("memberId", "==", memberId),
      where("date", "==", serviceDate),
      where("serviceType", "==", normalizedService)
    );

    const existingSnapshot = await getDocs(qExisting);
    if (!existingSnapshot.empty) {
      return;
    }

    await addDoc(colRef, {
      churchId,
      memberId,
      date: serviceDate,
      serviceType: normalizedService,
      checkedInAt: new Date().toISOString(),
      source: "SELF",
    });
  };

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <h1 className="checkin-title">Service check-in</h1>
        <p className="checkin-subtitle">
          Verify your link to mark attendance instantly.
        </p>

        <StatusBanner tone={statusTone} message={feedback.message} />

        {summary && (
          <div className="checkin-summary">
            <div className="checkin-summary-header">Attendance summary</div>
            <div className="checkin-summary-grid">
              <div>
                <div className="checkin-label">Member</div>
                <div className="checkin-value">{summary.memberName}</div>
                <div className="checkin-subvalue">ID: {summary.memberId}</div>
              </div>
              <div>
                <div className="checkin-label">Church</div>
                <div className="checkin-value">{summary.churchName}</div>
                <div className="checkin-subvalue">ID: {summary.churchId}</div>
              </div>
              <div>
                <div className="checkin-label">Service date</div>
                <div className="checkin-value">{summary.serviceDate}</div>
              </div>
              <div>
                <div className="checkin-label">Service</div>
                <div className="checkin-value">{summary.serviceType}</div>
              </div>
              <div>
                <div className="checkin-label">Status</div>
                <div className="checkin-value">{summary.status}</div>
                <div className="checkin-subvalue">Verified at {summary.verifiedAt}</div>
              </div>
            </div>
            <p className="checkin-summary-note">
              We have validated your token. These details are ready to be stored in
              attendance records for this service.
            </p>
          </div>
        )}

        <div className="checkin-form">
          <label htmlFor="token" className="checkin-label">
            Token
          </label>
          <textarea
            id="token"
            value={token}
            rows={3}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the ?token=... value from your link"
          />
          <button
            className="checkin-button"
            onClick={() => handleVerify()}
            disabled={feedback.status === "loading"}
          >
            {feedback.status === "loading" ? "Checking…" : "Verify & check in"}
          </button>
        </div>
      </div>
    </div>
  );
}
