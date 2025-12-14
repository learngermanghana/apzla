import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import StatusBanner from "../StatusBanner";
import { db } from "../../firebase";
import { PREFERRED_BASE_URL, normalizeBaseUrl } from "../../utils/baseUrl";
import "./give.css";

const GIVE_TYPES = ["Tithe", "Offering", "Special"];

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

export default function GivePage() {
  const churchId = useMemo(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const [, , maybeId] = path.split("/");
    return maybeId || "";
  }, []);

  const [church, setChurch] = useState(null);
  const [loadingChurch, setLoadingChurch] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ tone: "info", message: "" });
  const [form, setForm] = useState({
    amount: "",
    type: "Tithe",
    name: "",
    phone: "",
    serviceType: "",
  });

  const givingLink = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : PREFERRED_BASE_URL;
    const normalizedBase = normalizeBaseUrl(origin);
    return churchId ? `${normalizedBase}/give/${churchId}` : "";
  }, [churchId]);

  const payoutStatus = (church?.payoutStatus || "NOT_CONFIGURED").toString().toUpperCase();
  const paystackSubaccountCode = church?.paystackSubaccountCode || null;
  const payoutLastError = church?.payoutLastError || "";
  const payoutLastErrorAt = church?.payoutLastErrorAt || null;
  const payoutLastErrorDisplayTime = useMemo(() => {
    if (!payoutLastErrorAt) return "";
    if (typeof payoutLastErrorAt?.toDate === "function") {
      return payoutLastErrorAt.toDate().toLocaleString();
    }
    const parsed = new Date(payoutLastErrorAt);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
  }, [payoutLastErrorAt]);
  const onlineGivingReady = payoutStatus === "ACTIVE" && !!paystackSubaccountCode;
  const onlineGivingStatusMessage =
    payoutStatus === "PENDING_SUBACCOUNT"
      ? "Online giving setup is in progress. Please check back soon."
      : payoutStatus === "FAILED_SUBACCOUNT"
        ? payoutLastError
          ? `Online giving setup failed: ${payoutLastError}${
              payoutLastErrorDisplayTime ? ` (recorded ${payoutLastErrorDisplayTime})` : ""
            }. Please contact the church admin.`
          : "Online giving setup needs attention. Please contact the church admin."
      : payoutStatus === "NOT_CONFIGURED"
        ? "Online giving is not active yet. Please contact the church admin to apply."
        : "";
  const onlineGivingStatusTone = payoutStatus === "FAILED_SUBACCOUNT" ? "error" : "info";

  useEffect(() => {
    if (!churchId) {
      setFetchError("No church ID was provided in this link.");
      setLoadingChurch(false);
      return;
    }

    const loadChurch = async () => {
      try {
        setLoadingChurch(true);
        const snapshot = await getDoc(doc(db, "churches", churchId));
        if (!snapshot.exists()) {
          setFetchError("We could not find this church. Please confirm the link.");
          return;
        }
        setChurch({ id: snapshot.id, ...snapshot.data() });
      } catch (err) {
        console.error("Load church error:", err);
        setFetchError("Unable to load church details. Please try again later.");
      } finally {
        setLoadingChurch(false);
      }
    };

    loadChurch();
  }, [churchId]);

  const normalizeEmail = () => {
    const digits = form.phone.replace(/\D/g, "");
    if (digits) return `${digits}@give.apzla.com`;
    return "giver@apzla.com";
  };

  const verifyGiving = async (paystackReference) => {
    const origin = typeof window !== "undefined" ? window.location.origin : PREFERRED_BASE_URL;
    const baseUrl = normalizeBaseUrl(origin);
    const endpoint = `${baseUrl}/api/transaction/verify/${encodeURIComponent(paystackReference)}`;

    setStatus({ tone: "info", message: "Verifying your payment..." });

    try {
      const res = await fetch(endpoint);
      const payload = await res.json().catch(() => ({}));

      if (!res.ok || payload?.status !== "success") {
        throw new Error(payload?.message || "We could not verify your payment yet.");
      }

      setStatus({ tone: "success", message: "Thank you! Your payment was verified and recorded." });
      setForm({ amount: "", type: "Tithe", name: "", phone: "", serviceType: "" });
    } catch (err) {
      console.error("Verify giving error:", err);
      setStatus({
        tone: "error",
        message:
          err.message ||
          "Payment completed but we could not verify it automatically. Please inform the church admin.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const startPayment = async (event) => {
    event.preventDefault();
    setStatus({ tone: "info", message: "" });

    if (!churchId) {
      setStatus({ tone: "error", message: "Missing church information." });
      return;
    }

    const numericAmount = Number(form.amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setStatus({ tone: "error", message: "Enter a valid amount to give." });
      return;
    }

    if (!onlineGivingReady) {
      setStatus({
        tone: "error",
        message: "Online giving is not active for this church yet.",
      });
      return;
    }

    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey) {
      setStatus({
        tone: "error",
        message: "Online payments are unavailable. Please contact your church admin.",
      });
      return;
    }

    setSubmitting(true);

    try {
      await loadPaystackScript();

      if (!window.PaystackPop || typeof window.PaystackPop.setup !== "function") {
        throw new Error("Paystack failed to initialize");
      }

      const reference = `GIVING-${churchId}-${Date.now()}`;

      const handlePaystackCallback = async (resp) => {
        const returnedRef = resp?.reference || reference;
        if (!returnedRef) {
          throw new Error("No Paystack reference returned.");
        }
        await verifyGiving(returnedRef);
      };

      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: normalizeEmail(),
        amount: Math.round(numericAmount * 100),
        currency: "GHS",
        ref: reference,
        subaccount: paystackSubaccountCode,
        bearer: "subaccount",
        metadata: {
          churchId,
          churchName: church?.name || churchId,
          giverName: form.name.trim(),
          phone: form.phone.trim(),
          type: form.type,
          serviceType: form.serviceType.trim() || undefined,
          source: "ONLINE",
        },
        callback: (resp) => {
          handlePaystackCallback(resp).catch((callbackErr) => {
            console.error("Paystack callback error:", callbackErr);
            setStatus({
              tone: "error",
              message: callbackErr.message || "Could not verify your payment.",
            });
            setSubmitting(false);
          });
        },
        onClose: function () {
          setSubmitting(false);
        },
      });

      if (!handler || typeof handler.openIframe !== "function") {
        throw new Error("Paystack handler unavailable");
      }

      handler.openIframe();
    } catch (err) {
      console.error("Paystack init error:", err);
      setStatus({
        tone: "error",
        message: err.message || "Unable to start payment. Please try again.",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="give-page">
      <div className="give-card">
        <div className="give-church-meta">
          <div className="give-logo">{(church?.name || "A").charAt(0)}</div>
          <div>
            <p className="give-church-name">{church?.name || "Apzla church"}</p>
            <p className="give-church-city">
              {church?.city || church?.country || "Online giving portal"}
            </p>
          </div>
        </div>

        <h1 className="give-header">Give online</h1>
        <p className="give-subtitle">
          Use this page to send your tithe, offering, or special seed securely via Paystack.
        </p>

        {loadingChurch ? (
          <StatusBanner tone="info" message="Loading church details..." />
        ) : fetchError ? (
          <StatusBanner tone="error" message={fetchError} />
        ) : null}

        {!onlineGivingReady && !loadingChurch && !fetchError && onlineGivingStatusMessage && (
          <StatusBanner tone={onlineGivingStatusTone} message={onlineGivingStatusMessage} />
        )}

        {givingLink && (
          <div className="give-link-box">{givingLink}</div>
        )}

        {status.message && <StatusBanner tone={status.tone} message={status.message} />}

        <form className="give-form" onSubmit={startPayment}>
          <div className="give-field">
            <label className="give-label" htmlFor="give-amount">
              Amount (GHS)
            </label>
            <input
              id="give-amount"
              type="number"
              min="0"
              step="0.01"
              className="give-input"
              required
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          <div className="give-field">
            <label className="give-label" htmlFor="give-type">
              Type
            </label>
            <select
              id="give-type"
              className="give-select"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            >
              {GIVE_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="give-field">
            <label className="give-label" htmlFor="give-name">
              Your name (optional)
            </label>
            <input
              id="give-name"
              type="text"
              className="give-input"
              placeholder="e.g. Ama Mensah"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="give-field">
            <label className="give-label" htmlFor="give-phone">
              Phone number (optional)
            </label>
            <input
              id="give-phone"
              type="tel"
              className="give-input"
              placeholder="e.g. 0244 000 000"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="give-field">
            <label className="give-label" htmlFor="give-service">
              Service (optional)
            </label>
            <input
              id="give-service"
              type="text"
              className="give-input"
              placeholder="e.g. Sunday Service"
              value={form.serviceType}
              onChange={(e) => setForm((prev) => ({ ...prev, serviceType: e.target.value }))}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            {onlineGivingReady ? (
              <>
                <button
                  className="give-button"
                  type="submit"
                  disabled={submitting || !!fetchError}
                >
                  {submitting ? "Opening Paystack..." : "Pay with Paystack"}
                </button>
                <p className="give-note">
                  Paystack will charge your card and send the funds to the church account set by the
                  admin.
                </p>
              </>
            ) : (
              <>
                <button className="give-button" type="button" disabled>
                  Online giving not enabled yet
                </button>
                <p className="give-note">
                  This church is collecting online payments after Apzla finishes the review.
                </p>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
