// web/src/components/checkin/CheckinPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./checkin.css";
import StatusBanner from "../StatusBanner";
import { PREFERRED_BASE_URL } from "../../utils/baseUrl";

const LOCAL_PHONE_KEY = "apzla_last_phone";
const MAX_ATTEMPTS = 5;

export default function CheckinPage() {
  const [phone, setPhone] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [token, setToken] = useState("");
  const [summary, setSummary] = useState(null);

  const [feedback, setFeedback] = useState({ ok: false, message: "" });
  const [statusTone, setStatusTone] = useState("info");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [copyStatus, setCopyStatus] = useState("Copy link");

  // ---- NEW: read token from URL (query OR path) ----
  const tokenFromUrl = useMemo(() => {
    try {
      // 1) Query string: /checkin?token=xxxx
      const params = new URLSearchParams(window.location.search);
      const qToken = params.get("token");
      if (qToken && qToken.trim()) return qToken.trim();

      // 2) Path style: /checkin/xxxx (optional support)
      const parts = window.location.pathname.split("/").filter(Boolean);
      // parts[0] = "checkin" or "attendance"
      if (parts.length >= 2 && (parts[0] === "checkin" || parts[0] === "attendance")) {
        return parts[1].trim();
      }

      return "";
    } catch {
      return "";
    }
  }, []);

  // Prefill phone from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_PHONE_KEY);
      if (saved) setPhone(saved);
    } catch {
      // ignore storage issues
    }
  }, []);

  // ---- NEW: auto-fill token once, without overwriting user edits ----
  useEffect(() => {
    if (!tokenFromUrl) return;

    setToken((prev) => {
      const prevTrim = (prev || "").trim();
      if (prevTrim) return prev; // user already has something
      return tokenFromUrl;
    });
  }, [tokenFromUrl]);

  useEffect(() => {
    setCopyStatus("Copy link");
  }, [token, tokenFromUrl]);

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";

    const trimmedToken = (token || tokenFromUrl || "").trim();
    const url = new URL("/checkin", PREFERRED_BASE_URL);

    if (trimmedToken) {
      url.searchParams.set("token", trimmedToken);
    }

    return url.toString();
  }, [token, tokenFromUrl]);

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyStatus("Copied!");
    } catch {
      setCopyStatus("Copy failed");
    } finally {
      setTimeout(() => setCopyStatus("Copy link"), 2000);
    }
  };

  const formatServiceDate = (isoDate) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const formatDateTime = (isoDateTime) => {
    if (!isoDateTime) return "";
    const d = new Date(isoDateTime);
    if (Number.isNaN(d.getTime())) return isoDateTime;

    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedPhone = phone.trim();
    const trimmedServiceCode = serviceCode.trim();
    const trimmedToken = token.trim();

    if (!trimmedPhone || !trimmedToken) {
      setFeedback({
        ok: false,
        message: "Please fill in your phone number and token.",
      });
      setStatusTone("error");
      return;
    }

    if (trimmedServiceCode.length !== 6) {
      setFeedback({
        ok: false,
        message: "Please enter the 6-digit service code announced in church.",
      });
      setStatusTone("error");
      return;
    }

    if (attempts >= MAX_ATTEMPTS) {
      setFeedback({
        ok: false,
        message:
          "Too many attempts. Please see an usher or church admin to help you check in.",
      });
      setStatusTone("error");
      return;
    }

    try {
      setIsSubmitting(true);

      // NOTE: Your resource list shows this is deployed as /functions/api/self-checkin-verify.js
      // So the correct URL is /api/self-checkin-verify (not /api/self-checkin/verify)
      const res = await fetch("/api/self-checkin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: trimmedPhone,
          serviceCode: trimmedServiceCode,
          token: trimmedToken,
        }),
      });

      const data = await res.json().catch(() => ({}));
      setAttempts((prev) => prev + 1);

      const ok = data.ok ?? data.status === "success" ?? res.ok;

      if (!ok) {
        const msg =
          data.message ||
          "We could not verify this check-in. Please check your details and try again.";
        setFeedback({ ok: false, message: msg });
        setStatusTone("error");
        return;
      }

      // Save phone locally for future visits
      try {
        window.localStorage.setItem(LOCAL_PHONE_KEY, trimmedPhone);
      } catch {
        // ignore storage issues
      }

      const payload = data?.data || {};
      const alreadyPresent = payload.alreadyPresent;

      // Handle duplicate / already checked in
      if (alreadyPresent) {
        setFeedback({
          ok: true,
          message:
            data.message ||
            "You have already checked in for this service. Thank you.",
        });
        setStatusTone("info");
      } else {
        setFeedback({
          ok: true,
          message:
            data.message ||
            "You are checked in. Thank you for attending this service.",
        });
        setStatusTone("success");
      }

      const newSummary = payload || null;
      setSummary(newSummary);
    } catch (err) {
      console.error(err);
      setFeedback({
        ok: false,
        message:
          "Something went wrong while checking you in. Please try again or see an usher.",
      });
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <h1 className="checkin-title">Service check-in</h1>
        <p className="checkin-subtitle">
          Verify your link to mark attendance instantly.
        </p>

        <div className="checkin-helper">
          <div className="checkin-helper-title">Where to enter the service code</div>
          <div className="checkin-helper-body">
            The form has three steps in order: phone number,{" "}
            <strong>service code</strong>, then the token box. Use the same phone
            number you shared with the church office.
          </div>
        </div>

        {summary && (
          <div className="checkin-service-meta">
            <span className="checkin-chip">{summary.churchName || "Your church"}</span>
            <span className="checkin-chip">
              {summary.serviceType || "Service"} • {" "}
              {formatServiceDate(summary.serviceDate)}
            </span>
            <span className="checkin-chip">
              Checked in at {formatDateTime(summary.checkinAt)}
            </span>
          </div>
        )}

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
                <div className="checkin-value">{formatServiceDate(summary.serviceDate)}</div>
              </div>
              <div>
                <div className="checkin-label">Service</div>
                <div className="checkin-value">{summary.serviceType}</div>
              </div>
              <div>
                <div className="checkin-label">Service code</div>
                <div className="checkin-value">{summary.serviceCode}</div>
              </div>
              <div>
                <div className="checkin-label">Check-in time</div>
                <div className="checkin-value">{formatDateTime(summary.checkinAt)}</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="checkin-form">
          {/* Phone field */}
          <div className="checkin-field">
            <label className="checkin-label" htmlFor="phone">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              className="checkin-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="024 000 0000"
              required
            />
          </div>

          {/* Service code field */}
          <div className="checkin-field">
            <label className="checkin-label" htmlFor="serviceCode">
              Service code
            </label>
            <input
              id="serviceCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="checkin-input"
              value={serviceCode}
              onChange={(e) => setServiceCode(e.target.value)}
              placeholder="6-digit code from the announcement"
              required
            />
          </div>

          {/* Token field */}
          <div className="checkin-field">
            <label className="checkin-label" htmlFor="token">
              Check-in token
            </label>
            <textarea
              id="token"
              className="checkin-textarea"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="This is usually filled automatically from the link."
              required
              readOnly={!!tokenFromUrl} // optional: lock when token came from link
            />
          </div>

          <div className="checkin-field checkin-invite">
            <label className="checkin-label" htmlFor="inviteLink">
              Invite link
            </label>
            <div className="checkin-invite-row">
              <input
                id="inviteLink"
                type="text"
                className="checkin-input checkin-invite-input"
                value={inviteLink}
                readOnly
              />
              <button
                type="button"
                className="checkin-copy-button"
                onClick={handleCopyInviteLink}
                aria-label="Copy invite link"
                disabled={!inviteLink}
              >
                {copyStatus}
              </button>
            </div>
            <div className="checkin-invite-hint">
              Copy the invitation link for anyone who still needs to check in.
            </div>
          </div>

          <button type="submit" className="checkin-button" disabled={isSubmitting}>
            {isSubmitting ? "Checking in…" : "Confirm attendance"}
          </button>
        </form>

        <div className="checkin-footer-help">
          If you have issues checking in, please see an usher or church admin.
        </div>
      </div>
    </div>
  );
}
