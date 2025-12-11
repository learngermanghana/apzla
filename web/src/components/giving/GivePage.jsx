import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import StatusBanner from "../StatusBanner";
import { db } from "../../firebase";
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
    const preferredBase = "https://www.apzla.com";
    const origin = typeof window !== "undefined" ? window.location.origin : preferredBase;
    const baseUrl = origin.includes("localhost") ? preferredBase : origin || preferredBase;
    const normalizedBase = baseUrl.replace(/\/$/, "");
    return churchId ? `${normalizedBase}/give/${churchId}` : "";
  }, [churchId]);

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

  const recordGiving = async (paystackReference) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    await addDoc(collection(db, "giving"), {
      churchId,
      amount: Number(form.amount),
      type: form.type,
      serviceType: form.serviceType.trim() || "Online",
      date: today,
      memberId: null,
      memberName: form.name.trim(),
      phone: form.phone.trim(),
      notes: "Online giving",
      source: "ONLINE",
      paystackReference: paystackReference || `GIVING-${churchId}-${Date.now()}`,
      createdAt: now.toISOString(),
    });
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
      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: normalizeEmail(),
        amount: Math.round(numericAmount * 100),
        currency: "GHS",
        ref: reference,
        metadata: {
          churchId,
          churchName: church?.name || churchId,
          giverName: form.name.trim(),
          phone: form.phone.trim(),
          type: form.type,
          serviceType: form.serviceType.trim() || undefined,
          source: "ONLINE",
        },
        callback: function (response) {
          recordGiving(response?.reference || reference)
            .then(() => {
              setStatus({ tone: "success", message: "Thank you! Your giving was recorded." });
              setForm({ amount: "", type: "Tithe", name: "", phone: "", serviceType: "" });
            })
            .catch((err) => {
              console.error("Save giving error:", err);
              setStatus({
                tone: "error",
                message:
                  "Payment completed but we could not record it automatically. Please inform the church admin.",
              });
            })
            .finally(() => {
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
            <button className="give-button" type="submit" disabled={submitting || !!fetchError}>
              {submitting ? "Opening Paystack..." : "Pay with Paystack"}
            </button>
            <p className="give-note">
              Paystack will charge your card and send the funds to the church account set by the admin.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
